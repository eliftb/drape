/* public/lib/state.js */
const State = (() => {
  const defaults = { user:null, wardrobe:[], savedOutfits:[], currentOutfit:null, occasion:'casual', mood:'cool' }

  function load() {
    try { const r=localStorage.getItem('drape_v4'); return r?{...defaults,...JSON.parse(r)}:{...defaults} }
    catch { return {...defaults} }
  }

  let _s = load()

  function save() {
    try { localStorage.setItem('drape_v4', JSON.stringify({user:_s.user,wardrobe:_s.wardrobe,savedOutfits:_s.savedOutfits,occasion:_s.occasion,mood:_s.mood})) }
    catch {}
  }

  return {
    get: k => k?_s[k]:{..._s},
    set: (k,v) => { _s[k]=v; save() },
    login: u => { _s.user=u; save() },
    logout: () => { _s.user=null; save() },
    isLoggedIn: () => !!_s.user,
    addClothing: i => { _s.wardrobe=[i,..._s.wardrobe]; save() },
    removeClothing: id => { _s.wardrobe=_s.wardrobe.filter(i=>i.id!==id); save() },
    getWardrobe: () => [..._s.wardrobe],
    setCurrentOutfit: o => { _s.currentOutfit=o },
    getCurrentOutfit: () => _s.currentOutfit,
    saveOutfit: o => { _s.savedOutfits=[o,..._s.savedOutfits].slice(0,50); save() },
    setOccasion: v => { _s.occasion=v; save() },
    setMood: v => { _s.mood=v; save() },
    getStats: () => {
      const w=_s.wardrobe
      return { total:w.length, outfitCount:_s.savedOutfits.length,
        byCategory:{ top:w.filter(i=>i.category==='top').length, bottom:w.filter(i=>i.category==='bottom').length, shoes:w.filter(i=>i.category==='shoes').length, outerwear:w.filter(i=>i.category==='outerwear').length, accessory:w.filter(i=>i.category==='accessory').length } }
    }
  }
})()
