const AREngine = (() => {

  const LM = {
    LEFT_SHOULDER:11, RIGHT_SHOULDER:12,
    LEFT_HIP:23, RIGHT_HIP:24,
    LEFT_KNEE:25, RIGHT_KNEE:26,
    LEFT_ANKLE:27, RIGHT_ANKLE:28,
  }

  let _pose=null, _camera=null
  let _canvas=null, _video=null, _ctx=null
  let _running=false, _smoothed=null
  const SMOOTH=0.45
  let _garments={}, _imgs={}
  let _onPose=null, _onFrame=null
  let _frameCount=0, _lastFPS=0, _fpsTimer=0
  let _animId=null

  async function init(video, canvas) {
    _video  = video
    _canvas = canvas
    _ctx    = canvas.getContext('2d')

    if (typeof Pose === 'undefined') {
      console.warn('[AREngine] MediaPipe Pose yok')
      return false
    }

    _pose = new Pose({
      locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}`
    })
    _pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.55,
    })
    _pose.onResults(_onResults)
    console.log('[AREngine] init OK')
    return true
  }

  async function start() {
    // Önce eski stream varsa temizle
    if (_video.srcObject) {
      _video.srcObject.getTracks().forEach(t => t.stop())
      _video.srcObject = null
    }
    if (_animId) { cancelAnimationFrame(_animId); _animId = null }
    if (_camera) { try { _camera.stop() } catch(e){} ; _camera = null }

    // Kamerayı aç
    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
      })
    } catch(err) {
      throw new Error('Kamera açılamadı: ' + err.message)
    }

    _video.srcObject = stream
    _video.style.display = 'none'

    // Video hazır olana kadar bekle
    await new Promise((resolve, reject) => {
      _video.onloadedmetadata = () => {
        _video.play()
          .then(resolve)
          .catch(reject)
      }
      _video.onerror = reject
      setTimeout(reject, 10000) // 10s timeout
    })

    // Canvas boyutunu ayarla
    _canvas.width  = _video.videoWidth  || 640
    _canvas.height = _video.videoHeight || 480
    _running = true

    console.log('[AREngine] Kamera açıldı:', _canvas.width, 'x', _canvas.height)

    // MediaPipe Camera kullan (daha stabil)
    if (typeof Camera !== 'undefined') {
      _camera = new Camera(_video, {
        onFrame: async () => {
          if (_pose && _running) {
            try { await _pose.send({ image: _video }) } catch(e) {}
          }
        },
        width:  _canvas.width,
        height: _canvas.height,
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

  function _onResults(results) {
    if (!_canvas.width || !_running) return
    const W   = _canvas.width
    const H   = _canvas.height
    const now = performance.now()

    // Video çiz (aynalı)
    _ctx.clearRect(0, 0, W, H)
    _ctx.save()
    _ctx.scale(-1, 1)
    _ctx.drawImage(results.image, -W, 0, W, H)
    _ctx.restore()

    if (!results.poseLandmarks) {
      _onPose?.({ detected: false })
      return
    }

    // Landmark smoothing
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
    const ankleCY     = (la.y + ra.y) / 2
    const angle       = Math.atan2(rs.y - ls.y, rs.x - ls.x)

    // Üst giysi: omuz üstünden kalça ortasına
    const topW  = shoulderW * 1.7
    const topH  = (hipCY - shoulderTop) * 1.2
    const topCX = shoulderCX
    const topCY = shoulderTop + topH / 2

    // Dış giyim: biraz daha büyük
    const outW  = shoulderW * 1.95
    const outH  = (hipCY - shoulderTop) * 1.25
    const outCX = shoulderCX
    const outCY = shoulderTop + outH / 2

    // Alt giysi: kalça üstünden ayak bileğine
    const botW  = shoulderW * 1.5
    const botH  = (ankleCY - hipCY) * 1.1
    const botCX = hipCX
    const botCY = hipCY + botH / 2

    // Kıyafetleri çiz
    _drawGarment('outerwear', outCX, outCY, outW, outH, angle)
    _drawGarment('top',       topCX, topCY, topW, topH, angle)
    _drawGarment('bottom',    botCX, botCY, botW, botH, angle * 0.2)

    // Ayakkabılar
    if (_imgs.shoes && _garments.shoes) {
      const shW = shoulderW * 0.52
      const shH = shW * 0.4
      if (la.v > 0.35) {
        _ctx.save(); _ctx.globalAlpha = 0.93
        _ctx.translate(la.x, la.y)
        _ctx.drawImage(_imgs.shoes, -shW * 0.5, -shH * 0.2, shW, shH)
        _ctx.restore()
      }
      if (ra.v > 0.35) {
        _ctx.save(); _ctx.globalAlpha = 0.93
        _ctx.translate(ra.x, ra.y)
        _ctx.scale(-1, 1)
        _ctx.drawImage(_imgs.shoes, -shW * 0.5, -shH * 0.2, shW, shH)
        _ctx.restore()
      }
    }

    // Skeleton
    const pairs = [[ls,rs],[ls,lh],[rs,rh],[lh,rh],[lh,lk],[rh,rk],[lk,la],[rk,ra]]
    _ctx.strokeStyle = 'rgba(200,169,110,0.2)'
    _ctx.lineWidth = 1.5
    pairs.forEach(([a, b]) => {
      if (a.v < 0.3 || b.v < 0.3) return
      _ctx.beginPath(); _ctx.moveTo(a.x, a.y); _ctx.lineTo(b.x, b.y); _ctx.stroke()
    })

    // Noktalar
    ;[ls, rs, lh, rh, lk, rk, la, ra].forEach(p => {
      if (p.v < 0.3) return
      _ctx.beginPath(); _ctx.arc(p.x, p.y, 9, 0, Math.PI * 2)
      _ctx.fillStyle = 'rgba(200,169,110,0.12)'; _ctx.fill()
      _ctx.beginPath(); _ctx.arc(p.x, p.y, 4, 0, Math.PI * 2)
      _ctx.fillStyle = 'rgba(200,169,110,0.85)'; _ctx.fill()
    })

    // FPS
    _frameCount++
    if (now - _fpsTimer > 1000) {
      _lastFPS = _frameCount; _frameCount = 0; _fpsTimer = now
    }

    _onPose?.({ detected: true, shoulderWidth: shoulderW, fps: _lastFPS })
    _onFrame?.(_canvas)
  }

  function _drawGarment(type, cx, cy, w, h, angle) {
    const img = _imgs[type]
    if (!img || !_garments[type]) return
    _ctx.save()
    _ctx.globalAlpha = 0.93
    _ctx.translate(cx, cy)
    _ctx.rotate(angle)
    _ctx.drawImage(img, -w / 2, -h / 2, w, h)
    _ctx.restore()
  }

  async function setGarment(type, src) {
    if (!src) { _garments[type] = null; _imgs[type] = null; return }
    _garments[type] = src
    return new Promise(resolve => {
      const img = new Image()
      img.onload  = () => { _imgs[type] = img; resolve() }
      img.onerror = () => { console.warn('Garment yüklenemedi:', type); resolve() }
      img.src = src
    })
  }

  function clearGarment(type) { _garments[type] = null; _imgs[type] = null }
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
      if (stream) { stream.getTracks().forEach(t => t.stop()) }
    } catch(e) {}
    if (_video) { _video.srcObject = null; _video.load() }
    _smoothed = null
    _pose?.close()
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
