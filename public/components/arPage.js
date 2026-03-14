/* public/components/arPage.js */
const ARPageComponent = (() => {
  let _running=false, _emoStarted=false
  let _slots={top:null,bottom:null,outerwear:null,shoes:null}
  let _windActive=false
  let _capturedUrl=null

  function render() {
    const el=document.getElementById('page-ar')
    if(!el)return
    el.innerHTML=`
      <div class="ar-layout">
        <div class="ar-cam-section">
          <div class="ar-cam-wrap" id="ar-wrap">
            <video id="ar-vid" autoplay muted playsinline style="display:none;position:absolute;opacity:0"></video>
            <canvas id="ar-canvas" style="width:100%;height:100%;display:none"></canvas>
            <div class="fps-badge" id="fps-badge">0 fps</div>

            <div class="ar-perm" id="ar-perm">
              <div style="position:absolute;inset:0;background:radial-gradient(ellipse 50% 40% at 50% 50%,rgba(200,169,110,.07) 0%,transparent 70%);pointer-events:none"></div>
              <div style="font-size:52px;margin-bottom:16px">📷</div>
              <h2 style="font-size:20px;font-weight:800;margin-bottom:10px">Sanal Deneme Odası</h2>
              <p style="font-size:13px;color:rgba(245,243,238,.45);line-height:1.7;max-width:280px;margin-bottom:24px">
                Cloth simulation ile kıyafetler gerçek kumaş gibi davranır.
                Hareket ettikçe dalgalanır, rüzgarda sallanır.
              </p>
              <button class="cam-btn-p" onclick="ARPageComponent.start()">Kamerayı Aç ✦</button>
              <button class="cam-btn-s" onclick="ARPageComponent.demo()" style="margin-top:10px">Demo Modu</button>
            </div>

            <div class="scan-line" id="scan-line" style="display:none"></div>
            <div class="corner-brk" id="corners" style="display:none">
              <div class="brk brk-tl"></div><div class="brk brk-tr"></div>
              <div class="brk brk-bl"></div><div class="brk brk-br"></div>
            </div>
            <div class="ar-hud" id="ar-hud" style="display:none">
              <span class="hud-dot" id="hud-dot"></span>
              <span id="hud-txt">Vücut aranıyor...</span>
            </div>

            <!-- Emotion panel -->
            <div class="emo-panel" id="emo-panel" style="display:none">
              <div class="emo-title">Duygu Analizi</div>
              <div class="emo-row"><span class="emo-lbl">Mutlu</span><div class="emo-track"><div class="emo-fill" id="ef-h" style="background:#4ade80"></div></div><span class="emo-pct" id="ep-h">0%</span></div>
              <div class="emo-row"><span class="emo-lbl">Nötr</span><div class="emo-track"><div class="emo-fill" id="ef-n" style="background:#94a3b8"></div></div><span class="emo-pct" id="ep-n">0%</span></div>
              <div class="emo-row"><span class="emo-lbl">Şaşkın</span><div class="emo-track"><div class="emo-fill" id="ef-s" style="background:#818cf8"></div></div><span class="emo-pct" id="ep-s">0%</span></div>
              <div class="emo-row"><span class="emo-lbl">Beğenmedi</span><div class="emo-track"><div class="emo-fill" id="ef-d" style="background:#f87171"></div></div><span class="emo-pct" id="ep-d">0%</span></div>
              <div class="emo-verdict" id="emo-verdict">
                <span class="verdict-emoji" id="v-emoji">😊</span>
                <div class="verdict-label" id="v-lbl">—</div>
              </div>
            </div>
          </div>

          <!-- Controls -->
          <div id="ar-ctrl-row" style="display:none">
            <div class="ar-ctrl-row">
              <button class="ar-ctrl-btn primary" onclick="ARPageComponent.capture()">📸 Çek</button>
              <button class="ar-ctrl-btn" id="wind-btn" onclick="ARPageComponent.toggleWind()">💨 Rüzgar</button>
              <button class="ar-ctrl-btn" onclick="ARPageComponent.stopAR()">⏹ Kapat</button>
            </div>
          </div>
        </div>

        <!-- Sidebar -->
        <div class="ar-sidebar-panel">
          <div class="ar-panel">
            <div class="ar-panel-title">Aktif Kombin</div>
            <div id="ar-slots">
              ${['top','outerwear','bottom','shoes'].map(t=>`
                <div class="ar-slot-row" id="slot-${t}" onclick="ARPageComponent.removeSlot('${t}')" style="display:flex;align-items:center;gap:9px;padding:8px;border-radius:10px;cursor:pointer;transition:.2s;border:1px solid transparent;margin-bottom:6px" onmouseover="this.style.background='rgba(245,243,238,.05)'" onmouseout="this.style.background='transparent'">
                  <div id="sthumb-${t}" style="width:38px;height:50px;border-radius:7px;background:rgba(245,243,238,.08);display:flex;align-items:center;justify-content:center;font-size:18px;overflow:hidden;flex-shrink:0">${t==='top'?'👕':t==='bottom'?'👖':t==='outerwear'?'🧥':'👟'}</div>
                  <div style="flex:1;min-width:0">
                    <div style="font-size:9px;font-family:'DM Mono',monospace;color:rgba(245,243,238,.35);letter-spacing:.1em;text-transform:uppercase;margin-bottom:2px">${t==='top'?'ÜST':t==='bottom'?'ALT':t==='outerwear'?'DIŞ':'AYAKKABI'}</div>
                    <div id="stname-${t}" style="font-size:11px;font-weight:600;color:rgba(245,243,238,.75);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Seçilmedi</div>
                  </div>
                </div>`).join('')}
            </div>
          </div>

          <div class="ar-panel" style="flex:1;overflow:hidden;display:flex;flex-direction:column">
            <div class="ar-panel-title">Dolabından Seç</div>
            <div id="ar-quickpick" style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:6px"></div>
          </div>

          <div id="ar-cap-section" style="display:none" class="ar-panel">
            <div class="ar-panel-title">Son Fotoğraf</div>
            <img id="ar-cap-img" style="width:100%;border-radius:10px;border:1px solid rgba(245,243,238,.1)" alt="">
            <button class="ar-ctrl-btn" style="width:100%;margin-top:8px" onclick="ARPageComponent.download()">💾 İndir</button>
          </div>
        </div>
      </div>`

    _loadCurrentOutfit()
    _renderQuickPick()
  }

  function _loadCurrentOutfit() {
    const o = State.getCurrentOutfit()
    if (!o) return
    const map = {topId:'top',bottomId:'bottom',outerwearId:'outerwear',shoesId:'shoes'}
    for (const [key,type] of Object.entries(map)) {
      if (o[key]) {
        const item = State.getWardrobe().find(i=>i.id===o[key])
        if (item) _assignSlot(type, item)
      }
    }
  }

  function _renderQuickPick() {
    const c=document.getElementById('ar-quickpick')
    if(!c)return
    const w=State.getWardrobe()
    if(!w.length){c.innerHTML=`<div style="font-size:12px;color:rgba(245,243,238,.35);text-align:center;padding:12px">Dolap boş</div>`;return}
    c.innerHTML=w.map(i=>`
      <div onclick="ARPageComponent.pick('${i.id}')" style="display:flex;align-items:center;gap:9px;padding:8px;border-radius:10px;cursor:pointer;transition:.2s;border:1px solid transparent" onmouseover="this.style.borderColor='rgba(245,243,238,.1)';this.style.background='rgba(245,243,238,.05)'" onmouseout="this.style.borderColor='transparent';this.style.background='transparent'">
        <div style="width:34px;height:44px;border-radius:7px;background:rgba(245,243,238,.08);display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0">
          ${i.processedImage||i.originalImage?`<img src="${i.processedImage||i.originalImage}" style="width:100%;height:100%;object-fit:${i.processedImage?'contain':'cover'}" alt="">`:
          `<span style="font-size:18px">${i.emoji||'👕'}</span>`}
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-size:11px;font-weight:600;color:rgba(245,243,238,.8);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${i.name}</div>
          <div style="font-size:10px;color:rgba(245,243,238,.35);font-family:'DM Mono',monospace;margin-top:2px">${i.categoryLabel||i.category}</div>
        </div>
      </div>`).join('')
  }

  function pick(id) {
    const item = State.getWardrobe().find(i=>i.id===id)
    if (!item) return
    const type = ['top','bottom','outerwear','shoes'].includes(item.category) ? item.category : 'top'
    _assignSlot(type, item)
    showToast('✦ '+item.name+' giyildi')
  }

  async function _assignSlot(type, item) {
    _slots[type] = item
    const thumb = document.getElementById('sthumb-'+type)
    const name  = document.getElementById('stname-'+type)
    const row   = document.getElementById('slot-'+type)
    if (thumb) {
      if (item.processedImage||item.originalImage) {
        thumb.innerHTML=`<img src="${item.processedImage||item.originalImage}" style="width:100%;height:100%;object-fit:${item.processedImage?'contain':'cover'};border-radius:7px" alt="">`
      } else { thumb.textContent = item.emoji||'👕' }
    }
    if (name) name.textContent = item.name
    if (row) row.style.borderColor = 'rgba(200,169,110,.25)'
    // AR engine'e yükle
    const src = item.processedImage||item.originalImage||null
    if (src && _running) await AREngine.setGarment(type, src)
  }

  function removeSlot(type) {
    _slots[type] = null
    const thumb=document.getElementById('sthumb-'+type)
    const name=document.getElementById('stname-'+type)
    const row=document.getElementById('slot-'+type)
    const e={top:'👕',bottom:'👖',outerwear:'🧥',shoes:'👟'}
    if(thumb)thumb.textContent=e[type]||'👕'
    if(name)name.textContent='Seçilmedi'
    if(row)row.style.borderColor='transparent'
    AREngine.clearGarment(type)
  }

  async function start() {
    _showLoading('Kamera başlatılıyor...')
    try {
      await AREngine.init(document.getElementById('ar-vid'), document.getElementById('ar-canvas'))
      AREngine.onPose(info => {
        const hud=document.getElementById('hud-txt'), dot=document.getElementById('hud-dot')
        const fps=document.getElementById('fps-badge')
        if (info.detected) {
          if(hud)hud.textContent='✓ Vücut algılandı · Cloth sim aktif'
          if(dot){dot.style.background='#4ade80';dot.style.animation='livePulse 1.5s infinite'}
          if(fps){fps.style.display='block';fps.textContent=AREngine.getFPS()+' fps'}
        } else {
          if(hud)hud.textContent='👤 Vücudunu çerçeveye al'
          if(dot){dot.style.background='var(--warm)';dot.style.animation='pulse 1s infinite'}
        }
      })
      await AREngine.start()
      _running = true
      // Seçili kıyafetleri yükle
      for(const[type,item]of Object.entries(_slots)){
        if(item){const src=item.processedImage||item.originalImage||null;if(src)await AREngine.setGarment(type,src)}
      }
      _showActive()
      _startEmotion()
      showToast('📷 AR + Cloth Sim aktif!')
    } catch(err) {
      showToast('⚠️ '+err.message)
      demo()
    }
  }

  function demo() {
    document.getElementById('ar-perm').style.display='none'
    _showActive()
    _startEmotion()
    showToast('🎭 Demo modu')
  }

  function _showLoading(msg) {
    const p=document.getElementById('ar-perm')
    if(p)p.innerHTML=`<div style="text-align:center"><div class="spinner" style="margin:0 auto 16px"></div><div style="font-size:14px;font-weight:600">${msg}</div></div>`
  }

  function _showActive() {
    document.getElementById('ar-perm').style.display='none'
    document.getElementById('ar-canvas').style.display='block'
    document.getElementById('scan-line').style.display='block'
    document.getElementById('corners').style.display='block'
    document.getElementById('ar-hud').style.display='flex'
    document.getElementById('emo-panel').style.display='block'
    document.getElementById('ar-ctrl-row').style.display='block'
    document.getElementById('fps-badge').style.display='block'
    _running = true
  }

  async function _startEmotion() {
    if (_emoStarted) return
    _emoStarted = true
    EmotionEngine.onEmotion(a => {
      const set=(id,v)=>{const f=document.getElementById('ef-'+id),p=document.getElementById('ep-'+id);if(f)f.style.width=v+'%';if(p)p.textContent=v+'%'}
      set('h',a.scores.happy); set('n',a.scores.neutral)
      set('s',a.scores.surprised); set('d',Math.round((a.scores.disgusted+a.scores.fearful)/2))
      const vb=document.getElementById('emo-verdict')
      if(vb){vb.style.display='block';document.getElementById('v-emoji').textContent=a.emoji;document.getElementById('v-lbl').textContent=a.label.toUpperCase()}
    })
    await EmotionEngine.init()
    EmotionEngine.start(document.getElementById('ar-vid'))
  }

  function toggleWind() {
    _windActive = !_windActive
    const btn = document.getElementById('wind-btn')
    if (_windActive) {
      AREngine.setWind(2.0)
      if(btn)btn.classList.add('active')
      showToast('💨 Rüzgar açık — kumaş dalgalanıyor!')
    } else {
      AREngine.stopWind()
      if(btn)btn.classList.remove('active')
      showToast('Rüzgar kapatıldı')
    }
  }

  function capture() {
    const url = AREngine.capture()
    if (!url) { showToast('⚠️ Kamerayı aç'); return }
    _capturedUrl = url
    document.getElementById('ar-cap-img').src = url
    document.getElementById('ar-cap-section').style.display='block'
    showToast('📸 Fotoğraf kaydedildi!')
  }

  function download() {
    if (!_capturedUrl) return
    const a=document.createElement('a');a.href=_capturedUrl;a.download='drape-look-'+Date.now()+'.png';a.click()
  }

  function stopAR() {
    AREngine.stop(); EmotionEngine.stop()
    _running=false; _emoStarted=false; _windActive=false
    document.getElementById('ar-canvas').style.display='none'
    document.getElementById('ar-perm').style.display='flex'
    document.getElementById('ar-perm').innerHTML=`
      <div style="font-size:52px;margin-bottom:16px">📷</div>
      <h2 style="font-size:20px;font-weight:800;margin-bottom:10px">Sanal Deneme Odası</h2>
      <p style="font-size:13px;color:rgba(245,243,238,.45);line-height:1.7;max-width:280px;margin-bottom:24px">Cloth simulation ile kıyafetler gerçek kumaş gibi davranır.</p>
      <button class="cam-btn-p" onclick="ARPageComponent.start()">Kamerayı Aç ✦</button>
      <button class="cam-btn-s" onclick="ARPageComponent.demo()" style="margin-top:10px">Demo Modu</button>`
    document.getElementById('scan-line').style.display='none'
    document.getElementById('corners').style.display='none'
    document.getElementById('ar-hud').style.display='none'
    document.getElementById('emo-panel').style.display='none'
    document.getElementById('ar-ctrl-row').style.display='none'
    document.getElementById('fps-badge').style.display='none'
    showToast('Kamera kapatıldı')
  }

  return { render, start, demo, stopAR, capture, download, pick, removeSlot, toggleWind }
})()
