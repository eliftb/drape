/* public/lib/api.js */
const API = (() => {
  async function analyze(b64, mt='image/jpeg') {
    const res=await fetch('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image:b64,mimeType:mt})})
    const d=await res.json()
    if(!d.success) throw new Error(d.error||'Analiz başarısız')
    return d.data
  }

  async function outfit(items, occ, mood) {
    const res=await fetch('/api/outfit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items,occasion:occ,mood})})
    const d=await res.json()
    if(!d.success) throw new Error(d.error||'Kombin oluşturulamadı')
    return d.data
  }

  // Demo fallback (backend erişilemezse)
  async function _demoAnalyze(b64) {
    const img=await new Promise((r,j)=>{const i=new Image();i.onload=()=>r(i);i.onerror=j;i.src=b64})
    const c=document.createElement('canvas');c.width=60;c.height=60
    const ctx=c.getContext('2d');ctx.drawImage(img,0,0,60,60)
    const d=ctx.getImageData(0,0,60,60).data
    let r=0,g=0,b=0,n=0
    for(let i=0;i<d.length;i+=4){if(d[i+3]<100)continue;const px=(i/4)%60,py=Math.floor((i/4)/60);if(px<5||px>55||py<5||py>55)continue;r+=d[i];g+=d[i+1];b+=d[i+2];n++}
    if(n>0){r=Math.round(r/n);g=Math.round(g/n);b=Math.round(b/n)}
    const hex='#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('')
    const br=(r*299+g*587+b*114)/1000
    const ct=br<85?'dark':br>175?'light':'neutral'
    const ratio=img.naturalHeight/img.naturalWidth
    let cat,catL,emoji,name
    if(ratio>1.8){cat='bottom';catL='Alt Giysi';emoji='👖';name='Pantolon'}
    else if(ratio<0.6){cat='shoes';catL='Ayakkabı';emoji='👟';name='Ayakkabı'}
    else{cat='top';catL='Üst Giysi';emoji=ct==='dark'?'👕':'👔';name=ct==='dark'?'Koyu Üst Giysi':'Açık Üst Giysi'}
    await sleep(1200)
    return{category:cat,categoryLabel:catL,season:['4 Mevsim'],seasonLabel:'4 Mevsim',colorTone:ct,colorToneLabel:{dark:'Koyu',light:'Açık',neutral:'Nötr'}[ct],primaryColors:[hex],styleTags:['Casual'],styleLabel:'Casual',pattern:'solid',material:'Bilinmiyor',name,aiDescription:'Bu parça dolabına eklendi.',confidence:0.65,emoji}
  }

  return {
    async analyze(b64, mt) {
      try{return await analyze(b64,mt)}
      catch(e){console.warn('Backend yok, demo mod');return await _demoAnalyze(b64)}
    },
    async outfit(items,occ,mood){
      try{return await outfit(items,occ,mood)}
      catch(e){
        await sleep(1500)
        const f=cat=>items.find(i=>i.category===cat)
        return{outfitName:'"Urban Minimalist"',topId:f('top')?.id||null,bottomId:f('bottom')?.id||null,outerwearId:f('outerwear')?.id||null,shoesId:f('shoes')?.id||null,accessoryId:null,compatibilityScore:85,colorHarmony:'analogous',aiInsight:'Bu kombinasyon renk uyumu ve stil tutarlılığı açısından mükemmel.',stylingTips:['Beli içe koy','Aksesuar ekle']}
      }
    }
  }
})()

function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
