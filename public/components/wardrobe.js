/* public/components/wardrobe.js */
const WardrobeComponent = (() => {
  let _filter = 'all', _pending = null, _analyzing = false
  const CAT_L = {top:'Üst Giysi',bottom:'Alt Giysi',outerwear:'Dış Giyim',shoes:'Ayakkabı',accessory:'Aksesuar',dress:'Elbise'}
  const CAT_E = {top:'👕',bottom:'👖',outerwear:'🧥',shoes:'👟',accessory:'👜',dress:'👗'}

  function render() {
    const el = document.getElementById('page-wardrobe')
    if (!el) return
    el.innerHTML = `
      <div style="padding:28px;flex:1;overflow-y:auto">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:22px">
          <div>
            <div class="sec-eye">KOLEKSİYONUM</div>
            <div class="sec-title">Dijital Dolap</div>
            <div style="display:flex;gap:6px;margin-top:8px" id="w-stats"></div>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn-soft" onclick="WardrobeComponent.addDemos()">Demo Ekle</button>
            <button class="btn-ink" onclick="WardrobeComponent.openModal()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Kıyafet Ekle
            </button>
          </div>
        </div>
        <div class="upload-hint" onclick="WardrobeComponent.openModal()">
          <div style="font-size:32px;margin-bottom:10px">📸</div>
          <div style="font-size:14px;font-weight:700;margin-bottom:5px">Fotoğraf yükle — AI analiz etsin</div>
          <div style="font-size:12px;color:var(--muted)">Arka plan kaldırılır · Claude Vision sınıflandırır · Cloth sim hazırlanır</div>
          <div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-top:12px">
            <span class="tag tag-dark">KATEGORİ</span><span class="tag tag-warm">RENK</span><span class="tag tag-cream">SEZON</span><span class="tag tag-purple">STİL</span>
          </div>
        </div>
        <div class="filter-bar">
          <button class="filter-btn active" onclick="WardrobeComponent.setFilter('all',this)">Tümü</button>
          <button class="filter-btn" onclick="WardrobeComponent.setFilter('top',this)">👕 Üst</button>
          <button class="filter-btn" onclick="WardrobeComponent.setFilter('bottom',this)">👖 Alt</button>
          <button class="filter-btn" onclick="WardrobeComponent.setFilter('shoes',this)">👟 Ayakkabı</button>
          <button class="filter-btn" onclick="WardrobeComponent.setFilter('outerwear',this)">🧥 Dış Giyim</button>
          <button class="filter-btn" onclick="WardrobeComponent.setFilter('accessory',this)">👜 Aksesuar</button>
        </div>
        <div class="clothing-grid" id="w-grid"></div>
      </div>

      <div id="modal-upload" class="modal-overlay" style="display:none" onclick="if(event.target===this)WardrobeComponent.closeModal()">
        <div class="modal-box">
          <div class="modal-header">
            <div><div class="modal-eyebrow">AI ARK PLAN KALDIRMA + CLAUDE VISION</div><div class="modal-title">Kıyafet Ekle</div></div>
            <button class="modal-close" onclick="WardrobeComponent.closeModal()">✕</button>
          </div>
          <div class="modal-body" id="modal-body">
            <div class="drop-zone" id="drop-zone">
              <input type="file" accept="image/*" id="file-input" onchange="WardrobeComponent.handleFile(event)">
              <div style="font-size:36px;margin-bottom:12px">📸</div>
              <div style="font-size:15px;font-weight:700;margin-bottom:6px">Fotoğraf Seç veya Sürükle</div>
              <div style="font-size:12px;color:var(--muted)">AI arka planı kaldırır ve cloth sim hazırlar</div>
            </div>
          </div>
          <div class="modal-footer" id="modal-footer">
            <button class="btn-ghost-dark" onclick="WardrobeComponent.closeModal()">İptal</button>
          </div>
        </div>
      </div>`

    _renderStats()
    _renderGrid()
    _setupDrop()
  }

  function _renderStats() {
    const s = State.getStats()
    const el = document.getElementById('w-stats')
    if (!el) return
    el.innerHTML = [['Parça',s.total],['Üst',s.byCategory.top],['Alt',s.byCategory.bottom],['Ayakkabı',s.byCategory.shoes]]
      .map(([l,v])=>`<div style="display:flex;align-items:center;gap:5px;background:var(--cream);border-radius:8px;padding:5px 10px"><span style="font-size:13px;font-weight:800">${v}</span><span style="font-size:11px;color:var(--muted);font-family:'DM Mono',monospace">${l}</span></div>`).join('')
    document.getElementById('topbar-badge').textContent = s.total + ' Parça'
  }

  function _renderGrid() {
    const grid = document.getElementById('w-grid')
    if (!grid) return
    const items = _filter === 'all' ? State.getWardrobe() : State.getWardrobe().filter(i=>i.category===_filter)
    if (!items.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">${CAT_E[_filter]||'👗'}</div><div class="empty-title">${_filter==='all'?'Dolabın boş':'Bu kategoride kıyafet yok'}</div><div class="empty-sub">Kıyafet ekle veya demo ekle</div></div>`
      return
    }
    grid.innerHTML = items.map((item,i)=>`
      <div class="clothing-card" style="animation-delay:${i*.04}s" data-id="${item.id}">
        <div class="clothing-img-wrap">
          ${item.processedImage||item.originalImage
            ?`<img src="${item.processedImage||item.originalImage}" alt="" style="object-fit:${item.processedImage?'contain':'cover'};background:${item.processedImage?'var(--cream)':'transparent'}">`
            :`<span style="font-size:56px">${item.emoji||CAT_E[item.category]||'👕'}</span>`}
          <div class="clothing-card-tags">
            <span class="tag tag-dark">${item.styleLabel||item.category}</span>
            <span class="tag tag-warm">${item.seasonLabel||''}</span>
          </div>
          ${item.aiConfidence?`<div class="ai-badge">AI ${Math.round(item.aiConfidence*100)}%</div>`:''}
          <div class="clothing-card-actions">
            <button class="act-btn" onclick="event.stopPropagation();navigate('ar')" title="AR">📷</button>
            <button class="act-btn" onclick="event.stopPropagation();WardrobeComponent.del('${item.id}')" title="Sil" style="background:rgba(248,113,113,.15);color:#f87171">🗑</button>
          </div>
        </div>
        <div style="padding:10px 12px">
          <div style="font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:3px">${item.name}</div>
          <div style="font-size:10px;color:var(--muted);font-family:'DM Mono',monospace">${CAT_L[item.category]||item.category} · ${item.colorToneLabel||''}</div>
          ${item.primaryColors?.length?`<div style="display:flex;gap:4px;margin-top:6px">${item.primaryColors.map(c=>`<div style="width:13px;height:13px;border-radius:3px;background:${c};border:1px solid rgba(10,10,15,.12)"></div>`).join('')}</div>`:''}
        </div>
      </div>`).join('')
  }

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file || _analyzing) return
    _processFile(file)
  }

  async function _processFile(file) {
    if (!file.type.startsWith('image/')) { showToast('⚠️ Sadece görüntü dosyası'); return }
    _analyzing = true
    const b64 = await _toB64(file)

    // Show analyzing state
    const body = document.getElementById('modal-body')
    const footer = document.getElementById('modal-footer')
    body.innerHTML = `
      <div style="text-align:center;padding:16px 0">
        <img src="${b64}" style="width:90px;height:120px;object-fit:cover;border-radius:12px;margin-bottom:16px">
        <div class="analyzing-row" id="step-row"><div class="spinner"></div><span id="step-txt">Arka plan kaldırılıyor...</span></div>
        <div style="display:flex;gap:6px;justify-content:center;margin-top:10px;flex-wrap:wrap">
          <span class="tag tag-green step-t" id="step-upload">✓ Yüklendi</span>
          <span class="tag tag-cream step-t" id="step-bg">⏳ Arka plan</span>
          <span class="tag tag-cream step-t" id="step-ai">⏳ AI Analiz</span>
          <span class="tag tag-cream step-t" id="step-cloth">⏳ Cloth Sim</span>
        </div>
      </div>`
    footer.innerHTML = ''

    try {
      // Step 1: BG Remove
      const origImg = await _loadImg(b64)
      const { resultDataUrl: processedB64 } = await BgRemove.remove(b64)
      _setStep('step-bg','tag-green','✓ Arka plan')
      _setStep('step-ai','tag-amber','🔄 AI Analiz')
      document.getElementById('step-txt').textContent = 'Claude Vision analiz ediyor...'

      // Step 2: Claude Vision
      const analysis = await API.analyze(b64, file.type)
      _setStep('step-ai','tag-green','✓ AI Analiz')
      _setStep('step-cloth','tag-amber','🔄 Cloth Sim')
      document.getElementById('step-txt').textContent = 'Kumaş simülasyonu hazırlanıyor...'

      // Step 3: Cloth sim prep (kısa gecikme, UI için)
      await sleep(600)
      _setStep('step-cloth','tag-green','✓ Cloth Sim')

      _pending = { ...analysis, id:'item_'+Date.now(), originalImage:b64, processedImage:processedB64 }
      _showResult(_pending)

    } catch(err) {
      _analyzing = false
      showToast('⚠️ ' + err.message)
      _resetModal()
    }
  }

  function _setStep(id, cls, txt) {
    const el = document.getElementById(id)
    if (!el) return
    el.className = 'tag '+cls+' step-t'
    el.textContent = txt
  }

  function _showResult(item) {
    _analyzing = false
    const body = document.getElementById('modal-body')
    const footer = document.getElementById('modal-footer')
    body.innerHTML = `
      <div style="display:flex;gap:14px;align-items:flex-start">
        <div style="width:96px;flex-shrink:0">
          <div style="aspect-ratio:3/4;border-radius:12px;overflow:hidden;background:var(--cream);display:flex;align-items:center;justify-content:center">
            ${item.processedImage?`<img src="${item.processedImage}" style="width:100%;height:100%;object-fit:contain" alt="">`:`<span style="font-size:44px">${item.emoji||'👕'}</span>`}
          </div>
          <div style="margin-top:6px;display:flex;align-items:center;gap:4px;background:#E1F5EE;border-radius:6px;padding:4px 8px">
            <span style="color:#0F6E56;font-size:11px">✓</span>
            <span style="font-size:10px;color:#085041;font-family:'DM Mono',monospace">${Math.round(item.confidence*100)}%</span>
          </div>
        </div>
        <div style="flex:1;min-width:0">
          <div class="sec-eye" style="margin-bottom:8px">AI TESPİT</div>
          <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px">
            <span class="tag tag-dark">${item.categoryLabel||item.category}</span>
            ${(item.styleTags||[]).slice(0,2).map(t=>`<span class="tag tag-warm">${t}</span>`).join('')}
            ${(item.season||[]).slice(0,1).map(s=>`<span class="tag tag-cream">${s}</span>`).join('')}
          </div>
          ${item.primaryColors?.length?`<div style="display:flex;gap:6px;margin-bottom:10px">${item.primaryColors.map(c=>`<div style="width:22px;height:22px;border-radius:5px;background:${c};border:1px solid rgba(10,10,15,.12)" title="${c}"></div>`).join('')}</div>`:''}
          <label class="field-label" style="margin-top:0">İSİM</label>
          <input class="field-input light" type="text" id="item-name" value="${item.name||''}" placeholder="Kıyafet adı...">
          <div style="margin-top:10px;background:var(--ink);color:rgba(245,243,238,.8);border-radius:10px;padding:12px;font-size:12px;line-height:1.6;font-style:italic">"${item.aiDescription||''}"</div>
        </div>
      </div>`
    footer.innerHTML = `<button class="btn-ghost-dark" onclick="WardrobeComponent._resetModal()">Yeniden Yükle</button><button class="btn-ink" style="flex:1" onclick="WardrobeComponent.save()">Dolaba Ekle ✦</button>`
  }

  function save() {
    if (!_pending) return
    const name = document.getElementById('item-name')?.value.trim() || _pending.name
    State.addClothing({..._pending,name})
    closeModal()
    _renderStats()
    _renderGrid()
    showToast('✦ '+name+' dolaba eklendi!')
  }

  function addDemos() {
    const demos = [
      {id:'d'+Date.now()+'1',name:'Oversize Siyah Tişört',category:'top',categoryLabel:'Üst Giysi',styleLabel:'Streetwear',seasonLabel:'4 Mevsim',colorTone:'dark',colorToneLabel:'Koyu',primaryColors:['#1a1a1a'],styleTags:['Streetwear','Minimalist'],season:['4 Mevsim'],aiDescription:'Oversized kesimi ile streetwear kombinlerin temel taşı.',aiConfidence:.97,emoji:'👕',processedImage:null,originalImage:null},
      {id:'d'+Date.now()+'2',name:'Lacivert Slim Pantolon',category:'bottom',categoryLabel:'Alt Giysi',styleLabel:'Business',seasonLabel:'4 Mevsim',colorTone:'dark',colorToneLabel:'Koyu',primaryColors:['#1b3a5c'],styleTags:['Business','Casual'],season:['4 Mevsim'],aiDescription:'Slim kesimi ile iş ve casual kombinlerin vazgeçilmezi.',aiConfidence:.95,emoji:'👖',processedImage:null,originalImage:null},
      {id:'d'+Date.now()+'3',name:'Beyaz Chunky Sneaker',category:'shoes',categoryLabel:'Ayakkabı',styleLabel:'Streetwear',seasonLabel:'Yazlık',colorTone:'light',colorToneLabel:'Açık',primaryColors:['#f0f0f0'],styleTags:['Streetwear','Sporty'],season:['Yaz'],aiDescription:'Temiz beyaz profili ile her kombini tamamlayan urban sneaker.',aiConfidence:.96,emoji:'👟',processedImage:null,originalImage:null},
      {id:'d'+Date.now()+'4',name:'Camel Yün Kaban',category:'outerwear',categoryLabel:'Dış Giyim',styleLabel:'Minimalist',seasonLabel:'Kışlık',colorTone:'neutral',colorToneLabel:'Nötr',primaryColors:['#c19a6b'],styleTags:['Minimalist'],season:['Kış'],aiDescription:'Kamel rengi uzun kaban kış stilinin şık tamamlayıcısı.',aiConfidence:.97,emoji:'🧥',processedImage:null,originalImage:null},
    ]
    const ex = State.getWardrobe().map(i=>i.name)
    const news = demos.filter(d=>!ex.includes(d.name))
    if (!news.length) { showToast('Tüm demo kıyafetler zaten eklendi'); return }
    news.forEach(i=>State.addClothing(i))
    _renderStats(); _renderGrid()
    showToast('✦ '+news.length+' demo kıyafet eklendi!')
  }

  function del(id) { State.removeClothing(id); _renderStats(); _renderGrid(); showToast('Kıyafet silindi') }
  function setFilter(f,btn) { _filter=f; document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active')); btn?.classList.add('active'); _renderGrid() }
  function openModal() { const m=document.getElementById('modal-upload'); if(m)m.style.display='flex'; _resetModal() }
  function closeModal() { const m=document.getElementById('modal-upload'); if(m)m.style.display='none'; _analyzing=false; _pending=null }
  function _resetModal() {
    _pending=null; _analyzing=false
    const body=document.getElementById('modal-body')
    const footer=document.getElementById('modal-footer')
    if(!body)return
    body.innerHTML=`<div class="drop-zone" id="drop-zone"><input type="file" accept="image/*" id="file-input" onchange="WardrobeComponent.handleFile(event)"><div style="font-size:36px;margin-bottom:12px">📸</div><div style="font-size:15px;font-weight:700;margin-bottom:6px">Fotoğraf Seç veya Sürükle</div><div style="font-size:12px;color:var(--muted)">AI arka planı kaldırır ve cloth sim hazırlar</div></div>`
    footer.innerHTML=`<button class="btn-ghost-dark" onclick="WardrobeComponent.closeModal()">İptal</button>`
    _setupDrop()
  }

  function _setupDrop() {
    const dz=document.getElementById('drop-zone')
    if(!dz)return
    dz.addEventListener('dragover',e=>{e.preventDefault();dz.classList.add('drag-over')})
    dz.addEventListener('dragleave',()=>dz.classList.remove('drag-over'))
    dz.addEventListener('drop',e=>{e.preventDefault();dz.classList.remove('drag-over');const f=e.dataTransfer.files[0];if(f)_processFile(f)})
  }

  function _toB64(f){return new Promise(r=>{const fr=new FileReader();fr.onload=e=>r(e.target.result);fr.readAsDataURL(f)})}
  function _loadImg(src){return new Promise((r,j)=>{const i=new Image();i.onload=()=>r(i);i.onerror=j;i.src=src})}

  return { render, setFilter, handleFile, openModal, closeModal, save, addDemos, del, _resetModal }
})()
