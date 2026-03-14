/* public/lib/emotionEngine.js */
const EmotionEngine = (() => {
  const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model'
  let _faceapi = null, _ready = false, _demo = false
  let _interval = null, _cb = null
  let _smooth = { happy:0, neutral:0, surprised:0, disgusted:0, fearful:0, sad:0 }
  const A = 0.28

  async function init() {
    _faceapi = typeof faceapi !== 'undefined' ? faceapi : null
    if (!_faceapi) { _demo = true; return false }
    try {
      await Promise.all([
        _faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        _faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      ])
      _ready = true; return true
    } catch { _demo = true; return false }
  }

  function start(video, ms = 900) {
    stop()
    if (_demo || !_ready) { _startDemo(); return }
    _interval = setInterval(async () => {
      if (!_faceapi || !_ready) return
      try {
        const dets = await _faceapi
          .detectAllFaces(video, new _faceapi.TinyFaceDetectorOptions({ inputSize:224, scoreThreshold:0.4 }))
          .withFaceExpressions()
        if (!dets?.length) return
        const e = dets[0].expressions
        for (const k of Object.keys(_smooth)) {
          _smooth[k] = _smooth[k]*(1-A) + (e[k]||0)*A
        }
        _cb?.(_build())
      } catch {}
    }, ms)
  }

  function _startDemo() {
    let t = 0
    _interval = setInterval(() => {
      t += 0.07
      const raw = { happy:0.45+Math.sin(t)*0.3, neutral:0.2+Math.cos(t*0.7)*0.08, surprised:0.07+Math.abs(Math.sin(t*1.4))*0.14, disgusted:0.04+Math.abs(Math.cos(t*2.1))*0.06, fearful:0.03, sad:0.02 }
      for (const k of Object.keys(_smooth)) _smooth[k] = _smooth[k]*(1-A)+(raw[k]||0)*A
      _cb?.(_build())
    }, 1000)
  }

  function _build() {
    const s = _smooth
    const like = Math.round((s.happy*0.6+s.surprised*0.2+s.neutral*0.15-s.disgusted*0.3-s.sad*0.2-s.fearful*0.1)*100)
    let verdict, emoji, label
    if (s.happy>0.55||like>55)    { verdict='love-it';  emoji='😍'; label='Bayıldın!' }
    else if (s.happy>0.30||like>25){ verdict='like-it';  emoji='😊'; label='Güzel duruyor' }
    else if (s.disgusted>0.25)     { verdict='dislike';  emoji='😬'; label='Beğenmedin' }
    else                           { verdict='unsure';   emoji='🤔'; label='Kararsızsın' }
    return {
      scores:{ happy:Math.round(s.happy*100), neutral:Math.round(s.neutral*100), surprised:Math.round(s.surprised*100), disgusted:Math.round(s.disgusted*100), fearful:Math.round(s.fearful*100) },
      likeScore:Math.max(-100,Math.min(100,like)),
      verdict, emoji, label,
      timestamp:Date.now()
    }
  }

  function stop() { if (_interval) { clearInterval(_interval); _interval=null } }
  function reset() { _smooth={happy:0,neutral:0,surprised:0,disgusted:0,fearful:0,sad:0} }

  return {
    init, start, stop, reset,
    isReady: () => _ready||_demo,
    isDemoMode: () => _demo,
    onEmotion: cb => { _cb=cb },
  }
})()
