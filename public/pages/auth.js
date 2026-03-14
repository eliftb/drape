/* public/pages/auth.js */
const Auth=(() => {
  function init(){State.isLoggedIn()?_showApp():_showAuth()}
  function _showAuth(){document.getElementById('scr-loading').classList.remove('active');document.getElementById('scr-auth').classList.add('active')}
  function _showApp(){document.getElementById('scr-loading').classList.remove('active');document.getElementById('scr-auth').classList.remove('active');document.getElementById('scr-app').classList.add('active');App.init()}
  return{
    init,
    tab(t){document.querySelectorAll('.auth-tab').forEach((b,i)=>b.classList.toggle('active',i===(t==='login'?0:1)));document.getElementById('form-login').style.display=t==='login'?'block':'none';document.getElementById('form-register').style.display=t==='register'?'block':'none'},
    login(){
      const e=document.getElementById('li-email')?.value.trim(),p=document.getElementById('li-pass')?.value
      if(!e||!p){showToast('⚠️ E-posta ve şifre gir');return}
      State.login({name:e.split('@')[0],email:e,id:'u_'+Date.now()})
      document.getElementById('scr-auth').classList.remove('active');_showApp();showToast('Hoş geldin 👋')
    },
    register(){
      const n=document.getElementById('rg-name')?.value.trim(),e=document.getElementById('rg-email')?.value.trim(),p=document.getElementById('rg-pass')?.value
      if(!n||!e||!p){showToast('⚠️ Tüm alanları doldur');return}
      if(p.length<6){showToast('⚠️ Şifre en az 6 karakter');return}
      State.login({name:n,email:e,id:'u_'+Date.now()})
      document.getElementById('scr-auth').classList.remove('active');_showApp();showToast('Hesabın oluşturuldu 🎉')
    },
    demo(){
      State.login({name:'Demo',email:'demo@drape.ai',id:'demo',isDemo:true})
      document.getElementById('scr-auth').classList.remove('active');_showApp();setTimeout(()=>showToast('Demo moda hoş geldin ✦'),500)
    },
    logout(){
      State.logout()
      document.getElementById('scr-app').classList.remove('active');document.getElementById('scr-auth').classList.add('active');showToast('Çıkış yapıldı')
    }
  }
})()
function authTab(t){Auth.tab(t)}
function doLogin(){Auth.login()}
function doRegister(){Auth.register()}
function doDemo(){Auth.demo()}
