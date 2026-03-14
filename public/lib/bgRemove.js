/* public/lib/bgRemove.js */
const BgRemove = (() => {
  function removeViaCanvas(imageElement) {
    const W = imageElement.naturalWidth  || imageElement.width
    const H = imageElement.naturalHeight || imageElement.height
    const canvas = document.createElement('canvas')
    canvas.width=W; canvas.height=H
    const ctx=canvas.getContext('2d')
    ctx.drawImage(imageElement,0,0,W,H)
    const imageData=ctx.getImageData(0,0,W,H)
    const data=imageData.data

    const bgColor=_detectBg(data,W,H)
    const tol=60, edge=30

    for(let i=0;i<data.length;i+=4){
      const dist=_dist(data[i],data[i+1],data[i+2],bgColor.r,bgColor.g,bgColor.b)
      if(dist<tol){ data[i+3]=0 }
      else if(dist<tol+edge){ data[i+3]=Math.round(((dist-tol)/edge)*255) }
    }
    ctx.putImageData(imageData,0,0)
    return canvas.toDataURL('image/png')
  }

  function _detectBg(data,W,H){
    const pts=[[0,0],[W-1,0],[0,H-1],[W-1,H-1],[Math.floor(W/2),0],[0,Math.floor(H/2)],[W-1,Math.floor(H/2)],[Math.floor(W/2),H-1]]
    let r=0,g=0,b=0
    for(const[x,y]of pts){const i=(y*W+x)*4;r+=data[i];g+=data[i+1];b+=data[i+2]}
    return{r:Math.round(r/pts.length),g:Math.round(g/pts.length),b:Math.round(b/pts.length)}
  }

  function _dist(r1,g1,b1,r2,g2,b2){
    return Math.sqrt((r1-r2)**2+(g1-g2)**2+(b1-b2)**2)
  }

  return {
    async remove(src) {
      const img = await new Promise((r,j)=>{const i=new Image();i.onload=()=>r(i);i.onerror=j;i.src=src})
      return { resultDataUrl: removeViaCanvas(img), method:'canvas' }
    }
  }
})()
