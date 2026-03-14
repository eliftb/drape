const BgRemove = (() => {
  return {
    async remove(src) {
      try {
        const res = await fetch('/api/removebg', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: src })
        })
        const data = await res.json()
        if (data.success) {
          console.log('✓ remove.bg başarılı')
          return { resultDataUrl: data.result, method: 'removebg' }
        }
        throw new Error(data.error)
      } catch(err) {
        console.warn('remove.bg başarısız:', err.message)
        return { resultDataUrl: src, method: 'fallback' }
      }
    }
  }
})()
