/* ═══════════════════════════════════════════════════════════
   DRAPE — AR Engine v5
   MediaPipe Pose + SelfieSegmentation
   
   Nasıl çalışır:
   1. Pose → vücut noktaları (omuz, kalça, diz, ayak)
   2. SelfieSegmentation → vücut maskesi (hangi piksel vücut?)
   3. Kıyafeti vücut noktalarına göre konumlandır
   4. Kıyafeti sadece vücut maskesi üzerine çiz
   → Kıyafet vücudun dışına taşmaz, gerçekten üstte görünür
═══════════════════════════════════════════════════════════ */

const AREngine = (() => {

  const LM = {
    LEFT_SHOULDER:11, RIGHT_SHOULDER:12,
    LEFT_HIP:23,      RIGHT_HIP:24,
    LEFT_KNEE:25,     RIGHT_KNEE:26,
    LEFT_ANKLE:27,    RIGHT_ANKLE:28,
  }

  let _pose=null, _seg=null, _camera=null
  let _canvas=null, _video=null, _ctx=null
  let _running=false, _smoothed=null
  const SMOOTH=0.45

  // Off-screen canvas'lar
  let _segCanvas=null, _segCtx=null     // segmentation mask
  let _clothCanvas=null, _clothCtx=null // kıyafet layer

  let _garments={}, _imgs={}
  let _onPose=null, _onFrame=null
  let _frameCount=0, _lastFPS=0, _fpsTimer=0
  let _animId=null

  // Son pose sonuçları (seg ile senkronize etmek için)
  let _lastPoseLandmarks=null
  let _lastSegMask=null

  async function init(video, canvas) {
    _video  = video
    _canvas = canvas
    _ctx    = canvas.getContext('2d')

    // Off-screen canvas'lar
    _segCanvas   = document.createElement('canvas')
    _segCtx      = _segCanvas.getContext('2d')
    _clothCanvas = document.createElement('canvas')
    _clothCtx    = _clothCanvas.getContext('2d')

    if (typeof Pose === 'undefined') {
      console.warn('[AREngine] MediaPipe Pose yok')
      return false
    }

    // Pose
    _pose = new Pose({
      locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}`
    })
    _pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: true,   // Pose içindeki segmentation
      smoothSegmentation: true,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.55,
    })
    _pose.onResults(_onPoseResults)

    console.log('[AREngine] v5 initialized — Segmentation aktif')
    return true
  }

  async function start() {
    // Önceki stream'i temizle
    if (_video.srcObject) {
      _video.srcObject.getTracks().forEach(t => t.stop())
      _video.srcObject = null
    }
    if (_animId) { cancelAnimationFrame(_animId); _animId = null }
    if (_camera) { try { _camera.stop() } catch(e){} ; _camera = null }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode:'user', width:{ideal:1280}, height:{ideal:720} }
    })

    _video.srcObject = stream
    _video.style.display = 'none'

    await new Promise((resolve, reject) => {
      _video.onloadedmetadata = () => { _video.play().then(resolve).catch(reject) }
      _video.onerror = reject
      setTimeout(reject, 10000)
    })

    const W = _video.videoWidth  || 640
    const H = _video.videoHeight || 480

    _canvas.width      = W; _canvas.height      = H
    _segCanvas.width   = W; _segCanvas.height   = H
    _clothCanvas.width = W; _clothCanvas.height = H

    _running = true
    console.log('[AREngine] Kamera:', W, 'x', H)

    if (typeof Camera !== 'undefined') {
      _camera = new Camera(_video, {
        onFrame: async () => {
          if (_pose && _running) {
            try { await _pose.send({ image: _video }) } catch(e) {}
          }
        },
        width: W, height: H,
      })
      _camera.start()
    } else {
      _loop()
    }
  }

  function _loop() {
    if (!_running) return
    if (_video.readyState >= 2 && _pose) {
      _pose.send({ image: _video }).catch(() => {})
    }
    _animId = requestAnimationFrame(_loop)
  }

  /* ══════════════════════════════════════════════════════
     POSE + SEGMENTATION RESULTS
  ══════════════════════════════════════════════════════ */
  function _onPoseResults(results) {
    if (!_canvas.width || !_running) return
    const W = _canvas.width
    const H = _canvas.height
    const now = performance.now()

    // 1. Ana canvas'ı temizle
    _ctx.clearRect(0, 0, W, H)

    // 2. Aynalı video çiz (arka plan)
    _ctx.save()
    _ctx.scale(-1, 1)
    _ctx.drawImage(results.image, -W, 0, W, H)
    _ctx.restore()

    if (!results.poseLandmarks) {
      _onPose?.({ detected: false })
      return
    }

    // 3. Landmark smoothing
    if (_smoothed) {
      _smoothed = results.poseLandmarks.map((lm, i) => ({
        x: _smoothed[i].x * SMOOTH + lm.x * (1 - SMOOTH),
        y: _smoothed[i].y * SMOOTH + lm.y * (1 - SMOOTH),
        visibility: lm.visibility,
      }))
    } else {
      _smoothed = [...results.poseLandmarks]
    }

    const lm = _smoothed

    // Piksel koordinatları (aynalı)
    const p = idx => ({
      x: (1 - lm[idx].x) * W,
      y: lm[idx].y * H,
      v: lm[idx].visibility || 0,
    })

    const ls = p(LM.LEFT_SHOULDER),  rs = p(LM.RIGHT_SHOULDER)
    const lh = p(LM.LEFT_HIP),       rh = p(LM.RIGHT_HIP)
    const lk = p(LM.LEFT_KNEE),      rk = p(LM.RIGHT_KNEE)
    const la = p(LM.LEFT_ANKLE),     ra = p(LM.RIGHT_ANKLE)

    const shoulderW   = Math.abs(rs.x - ls.x)
    const shoulderCX  = (ls.x + rs.x) / 2
    const shoulderTop = Math.min(ls.y, rs.y)
    const hipCX       = (lh.x + rh.x) / 2
    const hipCY       = (lh.y + rh.y) / 2
    // Ayak görünmüyorsa kalçadan tahmini uzaklık kullan
    const ankleVisible = la.v > 0.3 && ra.v > 0.3
    const ankleCY = ankleVisible 
       ? (la.y + ra.y) / 2 
       : hipCY + (hipCY - shoulderTop) * 1.4
    const angle       = Math.atan2(rs.y - ls.y, rs.x - ls.x)

    // Kıyafet boyutları
    const topW  = shoulderW * 1.7
    const topH  = (hipCY - shoulderTop) * 1.2
    const topCX = shoulderCX
    const topCY = shoulderTop + topH * 0.2

    const outW  = shoulderW * 1.95
    const outH  = (hipCY - shoulderTop) * 1.25
    const outCX = shoulderCX
    const outCY = shoulderTop + outH * 0.2

    const botW  = shoulderW * 1.5
    const botH  = (ankleCY - hipCY) * 1.1
    const botCX = hipCX
    const botCY = hipCY + botH / 2

    // 4. Segmentation mask varsa kullan
    if (results.segmentationMask) {
      _drawWithSegmentation(results, W, H, {
        outerwear: { cx:outCX, cy:outCY, w:outW, h:outH, angle },
        top:       { cx:topCX, cy:topCY, w:topW, h:topH, angle },
        bottom:    { cx:botCX, cy:botCY, w:botW, h:botH, angle:angle*0.2 },
        shoes:     { la, ra, shoulderW },
      })
    } else {
      // Segmentation yoksa direkt çiz
      _drawGarment('outerwear', outCX, outCY, outW, outH, angle)
      _drawGarment('top',       topCX, topCY, topW, topH, angle)
      _drawGarment('bottom',    botCX, botCY, botW, botH, angle * 0.2)
      _drawShoes(la, ra, shoulderW)
    }

    // 5. Skeleton
    _drawSkeleton([
      [ls,rs],[ls,lh],[rs,rh],[lh,rh],
      [lh,lk],[rh,rk],[lk,la],[rk,ra]
    ])
    _drawDots([ls,rs,lh,rh,lk,rk,la,ra])

    // FPS
    _frameCount++
    if (now - _fpsTimer > 1000) {
      _lastFPS = _frameCount; _frameCount = 0; _fpsTimer = now
    }

    _onPose?.({ detected:true, shoulderWidth:shoulderW, fps:_lastFPS })
    _onFrame?.(_canvas)
  }

  /* ── Segmentation ile kıyafet çiz ── */
  function _drawWithSegmentation(results, W, H, positions) {
    // Kıyafet canvas'ını temizle
    _clothCtx.clearRect(0, 0, W, H)

    // Kıyafetleri cloth canvas'a çiz
    const drawToCloth = (type, cx, cy, w, h, angle) => {
      const img = _imgs[type]
      if (!img || !_garments[type]) return
      _clothCtx.save()
      _clothCtx.globalAlpha = 0.95
      _clothCtx.translate(cx, cy)
      _clothCtx.rotate(angle)
      _clothCtx.drawImage(img, -w/2, -h/2, w, h)
      _clothCtx.restore()
    }

    drawToCloth('outerwear', positions.outerwear.cx, positions.outerwear.cy, positions.outerwear.w, positions.outerwear.h, positions.outerwear.angle)
    drawToCloth('top',       positions.top.cx,       positions.top.cy,       positions.top.w,       positions.top.h,       positions.top.angle)
    drawToCloth('bottom',    positions.bottom.cx,    positions.bottom.cy,    positions.bottom.w,    positions.bottom.h,    positions.bottom.angle)

    // Ayakkabıları da cloth canvas'a çiz
    const { la, ra, shoulderW } = positions.shoes
    if (_imgs.shoes && _garments.shoes) {
      const shW = shoulderW * 0.52
      const shH = shW * 0.4
      if (la.v > 0.35) {
        _clothCtx.save(); _clothCtx.globalAlpha = 0.95
        _clothCtx.translate(la.x, la.y)
        _clothCtx.drawImage(_imgs.shoes, -shW*0.5, -shH*0.2, shW, shH)
        _clothCtx.restore()
      }
      if (ra.v > 0.35) {
        _clothCtx.save(); _clothCtx.globalAlpha = 0.95
        _clothCtx.translate(ra.x, ra.y)
        _clothCtx.scale(-1, 1)
        _clothCtx.drawImage(_imgs.shoes, -shW*0.5, -shH*0.2, shW, shH)
        _clothCtx.restore()
      }
    }

    // Segmentation mask'ı seg canvas'a çiz
    _segCtx.clearRect(0, 0, W, H)
    _segCtx.drawImage(results.segmentationMask, 0, 0, W, H)
    const segData = _segCtx.getImageData(0, 0, W, H)

    // Cloth canvas data'sını al
    const clothData = _clothCtx.getImageData(0, 0, W, H)

    // Sadece vücut maskesi üzerindeki kıyafet piksellerini ana canvas'a çiz
    // Mask değeri yüksekse (vücut) → kıyafeti göster
    // Mask değeri düşükse (arka plan) → kıyafeti gizle
    const finalData = _ctx.getImageData(0, 0, W, H)

    for (let i = 0; i < segData.data.length; i += 4) {
      const maskVal = segData.data[i] / 255  // 0..1 (1 = vücut)
      const clothAlpha = clothData.data[i+3] / 255

      if (clothAlpha > 0.05 && maskVal > 0.3) {
        // Vücut üzerinde kıyafet var → kıyafeti göster
        const blend = Math.min(maskVal * 1.2, 1) * clothAlpha
        finalData.data[i]   = clothData.data[i]   * blend + finalData.data[i]   * (1 - blend)
        finalData.data[i+1] = clothData.data[i+1] * blend + finalData.data[i+1] * (1 - blend)
        finalData.data[i+2] = clothData.data[i+2] * blend + finalData.data[i+2] * (1 - blend)
        finalData.data[i+3] = Math.min(255, finalData.data[i+3] + clothData.data[i+3] * blend)
      }
    }

    _ctx.putImageData(finalData, 0, 0)
  }

  /* ── Normal kıyafet çizimi ── */
  function _drawGarment(type, cx, cy, w, h, angle) {
    const img = _imgs[type]
    if (!img || !_garments[type]) return
    _ctx.save()
    _ctx.globalAlpha = 0.93
    _ctx.translate(cx, cy)
    _ctx.rotate(angle)
    _ctx.drawImage(img, -w/2, -h/2, w, h)
    _ctx.restore()
  }

  function _drawShoes(la, ra, shoulderW) {
    if (!_imgs.shoes || !_garments.shoes) return
    const shW = shoulderW * 0.52
    const shH = shW * 0.4
    if (la.v > 0.35) {
      _ctx.save(); _ctx.globalAlpha = 0.93
      _ctx.translate(la.x, la.y)
      _ctx.drawImage(_imgs.shoes, -shW*0.5, -shH*0.2, shW, shH)
      _ctx.restore()
    }
    if (ra.v > 0.35) {
      _ctx.save(); _ctx.globalAlpha = 0.93
      _ctx.translate(ra.x, ra.y)
      _ctx.scale(-1, 1)
      _ctx.drawImage(_imgs.shoes, -shW*0.5, -shH*0.2, shW, shH)
      _ctx.restore()
    }
  }

  /* ── Skeleton ── */
  function _drawSkeleton(pairs) {
    _ctx.strokeStyle = 'rgba(200,169,110,0.2)'
    _ctx.lineWidth = 1.5
    pairs.forEach(([a, b]) => {
      if (a.v < 0.3 || b.v < 0.3) return
      _ctx.beginPath(); _ctx.moveTo(a.x, a.y); _ctx.lineTo(b.x, b.y); _ctx.stroke()
    })
  }

  function _drawDots(pts) {
    pts.forEach(p => {
      if (p.v < 0.3) return
      _ctx.beginPath(); _ctx.arc(p.x, p.y, 9, 0, Math.PI*2)
      _ctx.fillStyle = 'rgba(200,169,110,0.12)'; _ctx.fill()
      _ctx.beginPath(); _ctx.arc(p.x, p.y, 4, 0, Math.PI*2)
      _ctx.fillStyle = 'rgba(200,169,110,0.85)'; _ctx.fill()
    })
  }

  /* ── Garment yükleme ── */
  async function setGarment(type, src) {
    if (!src) { _garments[type]=null; _imgs[type]=null; return }
    _garments[type] = src
    return new Promise(resolve => {
      const img = new Image()
      img.onload  = () => { _imgs[type] = img; resolve() }
      img.onerror = () => { console.warn('Yüklenemedi:', type); resolve() }
      img.src = src
    })
  }

  function clearGarment(type) { _garments[type]=null; _imgs[type]=null }
  function setWind()  {}
  function stopWind() {}
  function capture()  { return _canvas?.toDataURL('image/png') || null }

  function stop() {
    _running = false
    if (_animId) { cancelAnimationFrame(_animId); _animId = null }
    try { _camera?.stop() } catch(e) {}
    _camera = null
    try {
      const stream = _video?.srcObject
      if (stream) stream.getTracks().forEach(t => t.stop())
    } catch(e) {}
    if (_video) { _video.srcObject = null; try { _video.load() } catch(e){} }
    _smoothed = null
    try { _pose?.close() } catch(e) {}
  }

  return {
    init, start, stop, setGarment, clearGarment,
    setWind, stopWind, capture,
    isRunning: () => _running,
    onPose:  cb => { _onPose  = cb },
    onFrame: cb => { _onFrame = cb },
    getFPS:  () => _lastFPS,
  }
})()
