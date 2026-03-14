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

[Features](#features) · [How It Works](#how-it-works) · [Setup](#setup) · [Architecture](#architecture) · [API](#api)

</div>

---

## What is DRAPE?

Upload a clothing photo → AI removes the background → detects your body in real time → overlays the garment on you → measures whether you like it from your facial expression.

```
📸 Upload photo
     ↓
✂️  remove.bg → Background removed, transparent PNG created
     ↓
🤖  Claude Vision → Category, color, style, season analysis
     ↓
👗  Digital wardrobe → Garment saved
     ↓
📷  MediaPipe Pose → 33 body landmarks tracked in real time
     ↓
🎭  Body Segmentation → Garment rendered only on body pixels
     ↓
😊  face-api.js → Like score calculated from facial expression
```

---

## Features

### 🤖 Smart Analysis with Claude Vision
When a clothing photo is uploaded, Claude Sonnet analyzes the image and automatically detects:
- **Category** — Top, bottom, outerwear, shoes, accessory
- **Color tone** — Dark, light, neutral, colorful + hex codes
- **Style** — Streetwear, Minimalist, Business, Casual, Formal, Vintage
- **Season** — Summer, winter, spring, autumn, all-season
- **Material & pattern** — Cotton, leather, striped, solid, plaid...

### ✂️ AI Background Removal
Professional quality background removal via remove.bg API. The garment is converted to a transparent PNG, ready for AR try-on.

### 📷 Real-Time AR Try-On Room
Using MediaPipe Pose model:
- **33 body landmarks** tracked in real time
- Garment is positioned according to shoulder, hip and ankle points
- **Body Segmentation** ensures the garment only renders on body pixels — no bleeding into the background
- Garment moves with your body

### 😊 Emotion-Based Approval Rating
Using face-api.js TinyFaceDetector:
- Happy, neutral, surprised, disgusted — 4 emotions measured in real time
- Smooth results via exponential moving average
- Verdict: **Love It / Looks Good / Undecided / Didn't Like It**

### ✨ AI Outfit Suggestion
Claude generates outfit combinations from your wardrobe based on occasion and mood:
- Compatibility score calculated
- Color harmony analyzed
- Styling tips provided

---

## Architecture

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

| Layer | Technology | Usage |
|-------|-----------|-------|
| Frontend | Vanilla JS, HTML5, CSS3 | UI, AR canvas rendering |
| Backend | Node.js 20, Express | API proxy, key security |
| AI Analysis | Anthropic Claude Sonnet | Clothing vision analysis |
| Outfit Gen | Anthropic Claude Sonnet | AI outfit generation |
| AR | MediaPipe Pose | 33 landmarks, body segmentation |
| Emotion | face-api.js (vladmandic) | TinyFaceDetector + expressions |
| BG Remove | remove.bg API | Professional background removal |
| State | localStorage | Persistent wardrobe storage |

---

## Project Structure

```
drape/
├── server/
│   └── index.js              # Express backend
│                             # API keys live here — never exposed to client
├── public/
│   ├── index.html            # Single page app entry point
│   ├── lib/
│   │   ├── arEngine.js       # MediaPipe Pose + Segmentation AR engine
│   │   ├── emotionEngine.js  # face-api.js emotion detection
│   │   ├── bgRemove.js       # remove.bg API client
│   │   ├── api.js            # Backend API calls
│   │   └── state.js          # Global state + localStorage
│   ├── components/
│   │   ├── wardrobe.js       # Digital wardrobe + upload flow
│   │   ├── outfit.js         # AI outfit generator
│   │   ├── arPage.js         # AR try-on room UI
│   │   └── profile.js        # User profile
│   └── styles/
│       ├── main.css          # Design system
│       └── animations.css    # Keyframe animations
├── .env.example
├── package.json
└── README.md
```

---

## Setup

### Requirements

- Node.js 18+
- Anthropic API Key → [console.anthropic.com](https://console.anthropic.com)
- remove.bg API Key → [remove.bg/api](https://remove.bg/api) *(free tier: 50 images/month)*

### Installation

```bash
# 1. Clone the repo
git clone https://github.com/eliftb/drape.git
cd drape

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
nano .env
```

Add to `.env`:
```env
ANTHROPIC_API_KEY=sk-ant-...
REMOVEBG_API_KEY=...
PORT=3000
```

```bash
# 4. Start
npm start
```

**→ Open http://localhost:3000**

---

## API

### `POST /api/analyze`
Clothing analysis via Claude Vision.

```json
// Request
{ "image": "data:image/jpeg;base64,...", "mimeType": "image/jpeg" }

// Response
{
  "success": true,
  "data": {
    "category": "top",
    "categoryLabel": "Top",
    "name": "Oversize Black T-Shirt",
    "colorTone": "dark",
    "primaryColors": ["#1a1a1a", "#2c2c2c"],
    "styleTags": ["Streetwear", "Minimalist"],
    "season": ["All Season"],
    "confidence": 0.97,
    "emoji": "👕"
  }
}
```

### `POST /api/removebg`
Background removal via remove.bg API.

```json
// Request
{ "image": "data:image/jpeg;base64,..." }

// Response
{ "success": true, "result": "data:image/png;base64,..." }
```

### `POST /api/outfit`
AI outfit suggestion via Claude.

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
    "aiInsight": "Dark tones create a sophisticated, cohesive look.",
    "stylingTips": ["Tuck in slightly", "Add a single accessory"]
  }
}
```

---

## Security

- API keys are stored server-side only, never exposed to the frontend
- `.env` file is in `.gitignore` — never pushed to GitHub
- User authentication is localStorage-based

---

## License

MIT © 2026 [eliftb](https://github.com/eliftb)

---

<div align="center">

**If you like it, drop a ⭐**

*Built with Claude, MediaPipe, and too much caffeine* ☕

</div>
