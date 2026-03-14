/* public/pages/app.js */
const App=(() => {
  const TITLES={wardrobe:'Dolabım',outfit:'AI Kombin Oluştur',ar:'AR Sanal Deneme',profile:'Profilim'}

  async function boot() {
    _show('scr-loading')
    _setLoad(15,'MediaPipe yükleniyor...')
    await _wait('Pose',4000).catch(()=>{})
    _setLoad(40,'Yüz tanıma yükleniyor...')
    await _wait('faceapi',4000).catch(()=>{})
    _setLoad(65,'Cloth engine hazırlanıyor...')
    _setLoad(85,'Hazırlanıyor...')
    await sleep(300)
    _setLoad(100,'Hazır!')
    await sleep(350)
    Auth.init()
  }

  function init() {
    const u=State.get('user')
    if(u){const av=document.getElementById('sidebar-avatar');if(av)av.textContent=(u.name||'U')[0].toUpperCase()}
    WardrobeComponent.render()
    OutfitComponent.render()
    ARPageComponent.render()
    ProfileComponent.render()
    navigate('wardrobe')
  }

  function navigate(page) {
    document.querySelectorAll('.nav-item').forEach(el=>el.classList.toggle('active',el.dataset.page===page))
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'))
    document.getElementById('page-'+page)?.classList.add('active')
    document.getElementById('topbar-title').textContent=TITLES[page]||page
    document.getElementById('topbar-badge').textContent=page==='wardrobe'?State.getStats().total+' Parça':page==='ar'?'LIVE':page==='outfit'?'AI Aktif ✦':''
    if(page!=='ar'&&AREngine.isRunning()){AREngine.stop();EmotionEngine.stop()}
    if(page==='wardrobe'){WardrobeComponent.render()}
  }

  function openSettings(){
    const m=document.getElementById('modal-settings');if(!m)return
    document.getElementById('settings-name').value=State.get('user')?.name||''
    m.style.display='flex'
  }
  function closeSettings(){const m=document.getElementById('modal-settings');if(m)m.style.display='none'}
  function saveSettings(){
    const n=document.getElementById('settings-name')?.value.trim()
    if(n){const u=State.get('user');if(u){State.set('user',{...u,name:n});const av=document.getElementById('sidebar-avatar');if(av)av.textContent=n[0].toUpperCase()}}
    closeSettings();showToast('✦ Ayarlar kaydedildi')
  }

  function toast(msg){
    const t=document.getElementById('toast');if(!t)return
    t.innerHTML='<span>✦</span> '+msg
    t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),2800)
  }

  function _setLoad(p,m){
    const f=document.getElementById('load-fill'),e=document.getElementById('load-msg')
    if(f)f.style.width=p+'%';if(e)e.textContent=m
  }
  function _show(id){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));document.getElementById(id)?.classList.add('active')}
  function _wait(n,t=4000){return new Promise((r,j)=>{const s=Date.now();const c=()=>{if(window[n])return r();if(Date.now()-s>t)return j();setTimeout(c,100)};c()})}

  return{boot,init,navigate,openSettings,closeSettings,saveSettings,toast}
})()

function navigate(p){App.navigate(p)}
function openSettings(){App.openSettings()}
function closeSettings(){App.closeSettings()}
function saveSettings(){App.saveSettings()}
function showToast(m){App.toast(m)}
window.addEventListener('DOMContentLoaded',()=>App.boot())
