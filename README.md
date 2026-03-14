<div align="center">

```
██████╗ ██████╗  █████╗ ██████╗ ███████╗
██╔══██╗██╔══██╗██╔══██╗██╔══██╗██╔════╝
██║  ██║██████╔╝███████║██████╔╝█████╗  
██║  ██║██╔══██╗██╔══██║██╔═══╝ ██╔══╝  
██████╔╝██║  ██║██║  ██║██║     ███████╗
╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚══════╝
```

### AI-Powered Virtual Outfit Studio

**Claude Vision · MediaPipe AR · Body Segmentation · Emotion Detection**

[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![Claude](https://img.shields.io/badge/Claude-Sonnet-D97706?style=flat-square&logo=anthropic&logoColor=white)](https://anthropic.com)
[![MediaPipe](https://img.shields.io/badge/MediaPipe-Pose-4285F4?style=flat-square&logo=google&logoColor=white)](https://mediapipe.dev)
[![License](https://img.shields.io/badge/License-MIT-8B5CF6?style=flat-square)](LICENSE)

[Demo](#demo) · [Özellikler](#özellikler) · [Kurulum](#kurulum) · [Mimari](#mimari) · [API](#api)

</div>

---

## Ne Yapar?

Kıyafet fotoğrafı yükle → AI arka planı kaldırsın → vücudunu algılasın → kıyafeti gerçek zamanlı üzerine oturtsun → yüz ifadenle beğenip beğenmediğini ölçsün.

```
📸 Fotoğraf yükle
     ↓
✂️  remove.bg → Arka plan kaldırılır, şeffaf PNG oluşur
     ↓
🤖  Claude Vision → Kategori, renk, stil, sezon analizi
     ↓
👗  Dijital dolap → Kıyafet kaydedilir
     ↓
📷  MediaPipe Pose → 33 vücut noktası gerçek zamanlı takip
     ↓
🎭  Body Segmentation → Kıyafet sadece vücut piksellerine işlenir
     ↓
😊  face-api.js → Yüz ifadesinden beğeni skoru hesaplanır
```

---

## Özellikler

### 🤖 Claude Vision ile Akıllı Analiz
Kıyafet fotoğrafı yüklendiğinde Claude Sonnet görüntüyü analiz eder ve otomatik olarak tespit eder:
- **Kategori** — Üst giysi, alt giysi, dış giyim, ayakkabı, aksesuar
- **Renk tonu** — Koyu, açık, nötr, renkli + hex kodları
- **Stil** — Streetwear, Minimalist, Business, Casual, Formal, Vintage
- **Sezon** — Yaz, kış, ilkbahar, sonbahar, 4 mevsim
- **Malzeme ve desen** — Pamuk, deri, çizgili, düz, ekose...

### ✂️ AI Arka Plan Kaldırma
remove.bg API ile profesyonel kalitede arka plan kaldırma. Kıyafet şeffaf PNG'ye dönüştürülerek AR deneme için hazır hale gelir.

### 📷 Gerçek Zamanlı AR Deneme Odası
MediaPipe Pose modeli ile:
- **33 vücut noktası** gerçek zamanlı takip edilir
- Kıyafet omuz, kalça ve ayak bileği noktalarına göre konumlandırılır
- **Body Segmentation** ile kıyafet sadece vücut piksellerine işlenir — arka plana taşmaz
- Vücudun hareketiyle birlikte kıyafet de hareket eder

### 😊 Duygu Algılama ile Beğeni Ölçümü
face-api.js TinyFaceDetector ile:
- Mutlu, nötr, şaşkın, beğenmedi — 4 duygu gerçek zamanlı ölçülür
- Exponential moving average ile smooth sonuçlar
- Verdict: **Bayıldın / Güzel Duruyor / Kararsızsın / Beğenmedin**

### ✨ AI Kombin Önerisi
Dolaptaki kıyafetlerden Claude, seçilen etkinlik ve ruh haline göre:
- Uyum skoru hesaplar
- Renk harmonisi analiz eder
- Styling ipuçları önerir

---

## Mimari

```
┌─────────────────────────────────────────────────────┐
│                    DRAPE                            │
│                                                     │
│  ┌──────────────┐         ┌────────────────────┐   │
│  │   Frontend   │ ──────► │  Node.js Backend   │   │
│  │              │         │                    │   │
│  │ • Wardrobe   │         │ • /api/analyze     │   │
│  │ • AR Studio  │         │ • /api/removebg    │   │
│  │ • Outfit Gen │         │ • /api/outfit      │   │
│  │ • Profile    │         │                    │   │
│  └──────────────┘         └────────┬───────────┘   │
│                                    │               │
│              ┌─────────────────────┤               │
│              ▼                     ▼               │
│   ┌──────────────────┐  ┌──────────────────────┐  │
│   │  Anthropic API   │  │    remove.bg API     │  │
│   │  Claude Vision   │  │  Background Removal  │  │
│   └──────────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Tech Stack

| Katman | Teknoloji | Kullanım |
|--------|-----------|----------|
| Frontend | Vanilla JS, HTML5, CSS3 | UI, AR canvas render |
| Backend | Node.js 20, Express | API proxy, key güvenliği |
| AI Analiz | Anthropic Claude Sonnet | Kıyafet vision analizi |
| Kombin | Anthropic Claude Sonnet | Outfit generation |
| AR | MediaPipe Pose | 33 landmark, body segmentation |
| Duygu | face-api.js (vladmandic) | TinyFaceDetector + expressions |
| BG Remove | remove.bg API | Professional background removal |
| State | localStorage | Persistent wardrobe storage |

---

## Proje Yapısı

```
drape/
├── server/
│   └── index.js              # Express backend
│                             # API key'ler burada — kullanıcı görmez
├── public/
│   ├── index.html            # Single page app
│   ├── lib/
│   │   ├── arEngine.js       # MediaPipe Pose + Segmentation AR motoru
│   │   ├── emotionEngine.js  # face-api.js duygu algılama
│   │   ├── bgRemove.js       # remove.bg API client
│   │   ├── api.js            # Backend API calls
│   │   └── state.js          # Global state + localStorage
│   ├── components/
│   │   ├── wardrobe.js       # Dijital dolap + upload flow
│   │   ├── outfit.js         # AI kombin üretici
│   │   ├── arPage.js         # AR deneme odası UI
│   │   └── profile.js        # Kullanıcı profili
│   └── styles/
│       ├── main.css          # Design system
│       └── animations.css    # Keyframe animations
├── .env.example
├── package.json
└── README.md
```

---

## Kurulum

### Gereksinimler

- Node.js 18+
- Anthropic API Key → [console.anthropic.com](https://console.anthropic.com)
- remove.bg API Key → [remove.bg/api](https://remove.bg/api) *(ücretsiz 50 görüntü/ay)*

### Adımlar

```bash
# 1. Repoyu klonla
git clone https://github.com/eliftb/drape.git
cd drape

# 2. Bağımlılıkları yükle
npm install

# 3. Environment variables
cp .env.example .env
nano .env
```

`.env` dosyasına ekle:
```env
ANTHROPIC_API_KEY=sk-ant-...
REMOVEBG_API_KEY=...
PORT=3000
```

```bash
# 4. Başlat
npm start
```

**→ http://localhost:3000**

---

## API

### `POST /api/analyze`
Claude Vision ile kıyafet analizi.

```json
// Request
{ "image": "data:image/jpeg;base64,...", "mimeType": "image/jpeg" }

// Response
{
  "success": true,
  "data": {
    "category": "top",
    "categoryLabel": "Üst Giysi",
    "name": "Oversize Siyah Tişört",
    "colorTone": "dark",
    "primaryColors": ["#1a1a1a", "#2c2c2c"],
    "styleTags": ["Streetwear", "Minimalist"],
    "season": ["4 Mevsim"],
    "confidence": 0.97,
    "emoji": "👕"
  }
}
```

### `POST /api/removebg`
remove.bg API ile arka plan kaldırma.

```json
// Request
{ "image": "data:image/jpeg;base64,..." }

// Response
{ "success": true, "result": "data:image/png;base64,..." }
```

### `POST /api/outfit`
Claude ile AI kombin önerisi.

```json
// Request
{ "items": [...], "occasion": "casual", "mood": "cool" }

// Response
{
  "success": true,
  "data": {
    "outfitName": "Urban Midnight",
    "topId": "item_123",
    "bottomId": "item_456",
    "compatibilityScore": 92,
    "colorHarmony": "monochrome",
    "aiInsight": "Koyu tonların uyumu sofistike bir görünüm yaratıyor.",
    "stylingTips": ["Beli içe koy", "Tek aksesuar ekle"]
  }
}
```

---

## Güvenlik

- API key'ler backend'de saklanır, frontend'e hiç geçmez
- `.env` dosyası `.gitignore`'da, GitHub'a çıkmaz
- Kullanıcı kimlik doğrulaması localStorage tabanlı

---

## Lisans

MIT © 2026 [eliftb](https://github.com/eliftb)

---

<div align="center">

**Eğer beğendiysen ⭐ atmayı unutma!**

*Built with Claude, MediaPipe, and too much caffeine* ☕

</div>
