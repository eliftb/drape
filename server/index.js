require('dotenv').config()
const express   = require('express')
const cors      = require('cors')
const path      = require('path')
const Anthropic = require('@anthropic-ai/sdk')
const FormData  = require('form-data')

const app    = express()
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

app.use(cors())
app.use(express.json({ limit: '20mb' }))
app.use(express.static(path.join(__dirname, '../public')))

/* ══════════════════════════════════════════════════════
   1. Kıyafet Analizi — Claude Vision
══════════════════════════════════════════════════════ */
app.post('/api/analyze', async (req, res) => {
  try {
    const { image, mimeType = 'image/jpeg' } = req.body
    if (!image) return res.status(400).json({ error: 'Görüntü gerekli' })
    const base64 = image.replace(/^data:image\/[a-z+]+;base64,/, '')

    const msg = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } },
          { type: 'text', text: `Bu fotograftaki kiyafeti analiz et. Hangi vucut bolgesini kapliyor?
- Bacaklar = bottom (pantolon, jean, sort, etek, tayt)
- Govde = top (tisort, gomlek, kazak, bluz, hoodie, sweatshirt)
- Hem govde hem bacak = dress (elbise, tulum)
- Ayaklar = shoes (ayakkabi, bot, sandalet, sneaker)
- Dis katman = outerwear (kaban, ceket, mont, blazer)
- Diger = accessory

SADECE JSON don dur:
{"category":"top|bottom|outerwear|shoes|accessory|dress","categoryLabel":"Turkce kategori","season":["4 Mevsim"],"seasonLabel":"4 Mevsim","colorTone":"dark|light|neutral|colorful","colorToneLabel":"Koyu|Acik|Notr|Renkli","primaryColors":["#hex"],"styleTags":["Casual"],"styleLabel":"Casual","pattern":"solid","material":"malzeme","name":"Turkce kiyafet ismi","aiDescription":"Bu parca... cumlesi","confidence":0.95,"emoji":"tek emoji"}` }
        ]
      }]
    })

    const text  = msg.content[0].text
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('JSON bulunamadi: ' + text.substring(0, 150))
    const result = JSON.parse(match[0])
    console.log(`✓ Analiz: "${result.name}" → ${result.category} (${Math.round(result.confidence * 100)}%)`)
    res.json({ success: true, data: result })
  } catch (err) {
    console.error('✗ /api/analyze:', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

/* ══════════════════════════════════════════════════════
   2. Arka Plan Kaldırma — remove.bg
══════════════════════════════════════════════════════ */
app.post('/api/removebg', async (req, res) => {
  try {
    const { image } = req.body
    if (!image) return res.status(400).json({ error: 'Görüntü gerekli' })

    const base64    = image.replace(/^data:image\/[a-z+]+;base64,/, '')
    const imgBuffer = Buffer.from(base64, 'base64')

    const form = new FormData()
    form.append('image_file', imgBuffer, { filename: 'image.jpg', contentType: 'image/jpeg' })
    form.append('size', 'auto')

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method:  'POST',
      headers: { 'X-Api-Key': process.env.REMOVEBG_API_KEY, ...form.getHeaders() },
      body:    form,
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error('remove.bg hatası ' + response.status + ': ' + errText)
    }

    const buffer    = await response.arrayBuffer()
    const resultB64 = 'data:image/png;base64,' + Buffer.from(buffer).toString('base64')
    console.log('✓ remove.bg arka plan kaldırıldı')
    res.json({ success: true, result: resultB64 })
  } catch (err) {
    console.error('✗ /api/removebg:', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

/* ══════════════════════════════════════════════════════
   3. Kombin Üretici — Claude
══════════════════════════════════════════════════════ */
app.post('/api/outfit', async (req, res) => {
  try {
    const { items = [], occasion = 'casual', mood = 'cool' } = req.body
    if (items.length < 2) return res.status(400).json({ error: 'En az 2 kiyafet gerekli' })

    const list = items.map(i =>
      `ID:${i.id} | ${i.name} | kat:${i.category} | stil:${i.styleLabel || ''} | ton:${i.colorTone || ''}`
    ).join('\n')

    const msg = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 800,
      messages: [{
        role: 'user',
        content: `${occasion} etkinligi ve ${mood} ruh hali icin kombin sec. Hava: 18C.

Dolap:
${list}

SADECE JSON:
{"outfitName":"Yaratici Ingilizce isim","topId":"id|null","bottomId":"id|null","outerwearId":"id|null","shoesId":"id|null","accessoryId":"id|null","compatibilityScore":85,"colorHarmony":"analogous","aiInsight":"Turkce 2 cumle","stylingTips":["ipucu 1","ipucu 2"]}`
      }]
    })

    const text  = msg.content[0].text
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('JSON bulunamadi')
    const result = JSON.parse(match[0])
    console.log(`✓ Kombin: ${result.outfitName} (${result.compatibilityScore})`)
    res.json({ success: true, data: result })
  } catch (err) {
    console.error('✗ /api/outfit:', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

/* ══════════════════════════════════════════════════════
   4. Health Check
══════════════════════════════════════════════════════ */
app.get('/api/health', (req, res) => {
  res.json({
    status:        'ok',
    model:         'claude-opus-4-6',
    hasClaudeKey:  !!process.env.ANTHROPIC_API_KEY,
    hasRemoveBgKey: !!process.env.REMOVEBG_API_KEY,
  })
})

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'))
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║   DRAPE v4 — AI Outfit Studio        ║
  ║   http://localhost:${PORT}                ║
  ║   Claude:    ${process.env.ANTHROPIC_API_KEY ? '✓ Aktif' : '✗ EKSİK!'}               ║
  ║   remove.bg: ${process.env.REMOVEBG_API_KEY ? '✓ Aktif' : '✗ EKSİK!'}               ║
  ╚══════════════════════════════════════╝
  `)
})
