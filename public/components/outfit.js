/* public/components/outfit.js */
const OutfitComponent = (() => {
  function render() {
    const el=document.getElementById('page-outfit')
    if(!el)return
    el.innerHTML=`
      <div style="display:flex;flex:1;height:100%;overflow:hidden">
        <div style="width:285px;flex-shrink:0;border-right:1px solid var(--border);padding:24px;overflow-y:auto;display:flex;flex-direction:column;gap:18px">
          <div><div class="sec-eye">AI STİLİST</div><div style="font-size:18px;font-weight:800;letter-spacing:-.02em">Kombin Oluştur</div></div>
          <div>
            <span class="field-label" style="margin-top:0">ETKİNLİK</span>
            <div class="occ-grid">
              <button class="occ-btn active" data-occ="casual" onclick="OutfitComponent.selOcc(this,'casual')"><span style="font-size:17px">☕</span>Casual</button>
              <button class="occ-btn" data-occ="work" onclick="OutfitComponent.selOcc(this,'work')"><span style="font-size:17px">💼</span>İş</button>
              <button class="occ-btn" data-occ="night-out" onclick="OutfitComponent.selOcc(this,'night-out')"><span style="font-size:17px">🌃</span>Gece</button>
              <button class="occ-btn" data-occ="sport" onclick="OutfitComponent.selOcc(this,'sport')"><span style="font-size:17px">🏃</span>Spor</button>
            </div>
          </div>
          <div>
            <span class="field-label" style="margin-top:0">RUH HALİ</span>
            <div class="mood-row">
              <button class="mood-btn active" onclick="OutfitComponent.selMood(this,'cool')">😎 Cool</button>
              <button class="mood-btn" onclick="OutfitComponent.selMood(this,'soft')">🌸 Soft</button>
              <button class="mood-btn" onclick="OutfitComponent.selMood(this,'bold')">🔥 Bold</button>
            </div>
          </div>
          <div>
            <span class="field-label" style="margin-top:0">HAVA DURUMU</span>
            <div style="background:var(--cream);border-radius:12px;padding:12px 14px;display:flex;align-items:center;gap:12px">
              <span style="font-size:22px">⛅</span>
              <div><div style="font-size:17px;font-weight:800;letter-spacing:-.02em">18°C</div><div style="font-size:11px;color:var(--muted)">Parçalı bulutlu · İstanbul</div></div>
            </div>
          </div>
          <button class="btn-ink" id="gen-btn" onclick="OutfitComponent.generate()" style="margin-top:auto"><span>✦</span> Kombin Oluştur</button>
        </div>
        <div style="flex:1;padding:24px;display:flex;flex-direction:column;gap:14px;overflow-y:auto">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <div>
              <div class="sec-eye">AI ÖNERİSİ</div>
              <div id="out-name" style="font-family:'Cormorant Garamond',serif;font-size:28px;font-style:italic;font-weight:300">Kombin oluşturmak için sol paneli kullan</div>
            </div>
            <div id="score-b" style="display:none;background:var(--cream);border-radius:14px;padding:10px 16px;text-align:center">
              <div id="score-n" style="font-size:22px;font-weight:800;letter-spacing:-.03em">—</div>
              <div style="font-size:10px;color:var(--muted)">uyum</div>
            </div>
          </div>
          <div style="display:flex;gap:14px;flex:1">
            <div class="mannequin-canvas" style="flex:1">
              <div class="mannequin-fig">🧍</div>
              <div id="mq-top" class="mq-top"></div>
              <div id="mq-bot" class="mq-bot"></div>
              <div id="mq-shoes" class="mq-shoes"></div>
            </div>
            <div id="out-pieces" style="width:180px;display:flex;flex-direction:column;gap:8px">
              <div style="padding:16px;text-align:center;color:var(--muted);font-size:12px">Kombin parçaları burada görünür</div>
            </div>
          </div>
          <div id="out-insight" style="display:none;background:var(--ink);color:var(--paper);border-radius:16px;padding:18px 22px;display:flex;align-items:center;gap:16px">
            <span style="font-size:26px">🤖</span>
            <div style="flex:1"><div style="font-size:13px;font-weight:700;margin-bottom:4px">AI Stylist</div><div id="out-insight-txt" style="font-size:12px;color:rgba(245,243,238,.65);line-height:1.6"></div></div>
            <button class="btn-warm" onclick="navigate('ar')">AR Dene →</button>
          </div>
        </div>
      </div>`
  }

  function selOcc(btn,v){document.querySelectorAll('.occ-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');State.setOccasion(v)}
  function selMood(btn,v){document.querySelectorAll('.mood-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');State.setMood(v)}

  async function generate() {
    const w=State.getWardrobe()
    if(w.length<2){showToast('⚠️ En az 2 kıyafet ekle');return}
    const btn=document.getElementById('gen-btn')
    btn.disabled=true;btn.innerHTML='<div class="spinner" style="width:16px;height:16px;margin:0 auto"></div>'
    try{
      const raw=await API.outfit(w,State.get('occasion'),State.get('mood'))
      const find=id=>id&&id!=='null'?w.find(i=>i.id===id):null
      const o={id:'outfit_'+Date.now(),name:raw.outfitName||'"Kombin"',
        top:find(raw.topId),bottom:find(raw.bottomId),outerwear:find(raw.outerwearId),
        shoes:find(raw.shoesId),accessory:find(raw.accessoryId),
        score:raw.compatibilityScore||80,insight:raw.aiInsight||'',createdAt:new Date()}
      State.setCurrentOutfit(o)
      _renderOutfit(o)
      showToast('✨ Kombin hazır!')
    }catch(err){showToast('⚠️ '+err.message)}
    btn.disabled=false;btn.innerHTML='<span>✦</span> Kombin Oluştur'
  }

  function _renderOutfit(o) {
    document.getElementById('out-name').textContent=o.name
    const sb=document.getElementById('score-b');sb.style.display='block'
    document.getElementById('score-n').textContent=o.score
    const top=o.top||o.outerwear
    const _setMQ=(id,item)=>{
      const el=document.getElementById(id);if(!el)return
      if(item){
        if(item.processedImage||item.originalImage){
          el.innerHTML=`<img src="${item.processedImage||item.originalImage}" style="width:100%;height:100%;object-fit:contain" alt="">`
        }else{el.textContent=item.emoji||'👕'}
      }else{el.textContent=''}
    }
    _setMQ('mq-top',top);_setMQ('mq-bot',o.bottom);_setMQ('mq-shoes',o.shoes)
    const pieces=[['Üst',top],['Alt',o.bottom],['Ayakkabı',o.shoes]].filter(p=>p[1])
    document.getElementById('out-pieces').innerHTML=pieces.map(([l,i])=>`
      <div style="background:var(--cream);border-radius:13px;padding:10px;display:flex;align-items:center;gap:10px;border:1.5px solid transparent;transition:.2s;cursor:pointer" onmouseover="this.style.borderColor='var(--warm)'" onmouseout="this.style.borderColor='transparent'">
        <div style="width:40px;height:52px;border-radius:8px;overflow:hidden;background:var(--paper);flex-shrink:0;display:flex;align-items:center;justify-content:center">
          ${i.processedImage||i.originalImage?`<img src="${i.processedImage||i.originalImage}" style="width:100%;height:100%;object-fit:${i.processedImage?'contain':'cover'}" alt="">`:
          `<span style="font-size:22px">${i.emoji||'👕'}</span>`}
        </div>
        <div style="flex:1;min-width:0"><div style="font-size:11px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${i.name}</div><div style="font-size:10px;color:var(--muted);font-family:'DM Mono',monospace;margin-top:2px">${l}</div></div>
      </div>`).join('')
    if(o.insight){const ins=document.getElementById('out-insight');ins.style.display='flex';document.getElementById('out-insight-txt').textContent=o.insight}
  }

  return{render,selOcc,selMood,generate}
})()

/* public/components/profile.js */
const ProfileComponent = (() => {
  function render() {
    const el=document.getElementById('page-profile')
    if(!el)return
    const u=State.get('user')||{name:'Kullanıcı',email:'demo@drape.ai'}
    const s=State.getStats()
    el.innerHTML=`
      <div style="padding:28px;max-width:680px">
        <div class="sec-eye">PROFİLİM</div>
        <div class="sec-title" style="margin-bottom:24px">Stil Profilim</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:24px">
          ${[['Toplam Parça',s.total,'👗'],['Kombin',s.outfitCount,'✨'],['Beğeni Ort.','84%','😊']].map(([l,v,ic])=>`
            <div style="background:var(--cream);border-radius:16px;padding:20px;position:relative;overflow:hidden">
              <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.12em;color:var(--muted);text-transform:uppercase;margin-bottom:8px">${l}</div>
              <div style="font-size:32px;font-weight:800;letter-spacing:-.04em">${v}</div>
              <div style="position:absolute;bottom:-10px;right:-5px;font-size:56px;opacity:.1">${ic}</div>
            </div>`).join('')}
        </div>
        <div style="background:var(--ink);color:var(--paper);border-radius:20px;padding:24px;margin-bottom:20px">
          <div style="font-family:'Cormorant Garamond',serif;font-size:22px;font-style:italic;margin-bottom:16px">Stil DNA'n</div>
          <div style="display:flex;flex-wrap:wrap;gap:8px">
            <span style="background:var(--warm);color:var(--ink);padding:8px 18px;border-radius:100px;font-size:13px;font-weight:700;font-family:'DM Mono',monospace">MINIMALİST</span>
            <span style="background:rgba(245,243,238,.1);color:var(--paper);padding:8px 18px;border-radius:100px;font-size:13px;font-weight:600;font-family:'DM Mono',monospace">STREETWEAR</span>
            <span style="background:rgba(245,243,238,.06);color:rgba(245,243,238,.5);padding:6px 14px;border-radius:100px;font-size:11px;font-family:'DM Mono',monospace">dark tones</span>
            <span style="background:rgba(245,243,238,.06);color:rgba(245,243,238,.5);padding:6px 14px;border-radius:100px;font-size:11px;font-family:'DM Mono',monospace">oversized</span>
          </div>
        </div>
        <button class="btn-soft" onclick="Auth.logout()">Çıkış Yap</button>
      </div>`
  }
  return{render}
})()
