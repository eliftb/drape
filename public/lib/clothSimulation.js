/* ═══════════════════════════════════════════════════════════
   DRAPE — Cloth Simulation Engine
   public/lib/clothSimulation.js

   Verlet Integration tabanlı kumaş fiziği.
   Her kıyafet bir parçacık ağıdır. Parçacıklar arası
   distance constraint ile kumaş davranışı simüle edilir.

   Özellikler:
   - Verlet integration (Euler'den çok daha stabil)
   - Distance constraints (5 iterasyon/frame)
   - Structural + Shear + Bending springs
   - Wind force
   - Gravity
   - Vücut collision (sphere approximation)
   - GPU-friendly flat array yapısı
═══════════════════════════════════════════════════════════ */

class ClothSimulation {

  constructor(options = {}) {
    this.cols        = options.cols        || 24
    this.rows        = options.rows        || 32
    this.spacing     = options.spacing     || 8       // piksel arası mesafe
    this.gravity     = options.gravity     || 0.4
    this.damping     = options.damping     || 0.99    // hız sönümleme
    this.iterations  = options.iterations  || 5       // constraint iterasyon sayısı
    this.windX       = options.windX       || 0
    this.windY       = options.windY       || 0
    this.windStrength= options.windStrength|| 0

    // Parçacık sayısı
    this.count = this.cols * this.rows

    // Düz diziler (GPU-friendly)
    this.posX    = new Float32Array(this.count)  // mevcut x
    this.posY    = new Float32Array(this.count)  // mevcut y
    this.oldX    = new Float32Array(this.count)  // önceki x (Verlet için)
    this.oldY    = new Float32Array(this.count)  // önceki y
    this.accX    = new Float32Array(this.count)  // ivme x
    this.accY    = new Float32Array(this.count)  // ivme y
    this.pinned  = new Uint8Array(this.count)    // sabitlenmiş mi?
    this.mass    = new Float32Array(this.count).fill(1.0)

    // Constraints: [a, b, restLength, stiffness]
    this.constraints = []

    // Vücut collision spheres
    this.spheres = []

    this._initialized = false
  }

  /* ── Kıyafeti vücuda göre başlat ── */
  init(anchorX, anchorY, width, height) {
    this.originX = anchorX
    this.originY = anchorY
    this.clothW  = width
    this.clothH  = height

    const dx = width  / (this.cols - 1)
    const dy = height / (this.rows - 1)
    this.spacing = Math.min(dx, dy)

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const i = row * this.cols + col
        const x = anchorX + col * dx
        const y = anchorY + row * dy

        this.posX[i] = x
        this.posY[i] = y
        this.oldX[i] = x
        this.oldY[i] = y
        this.accX[i] = 0
        this.accY[i] = 0
        this.pinned[i] = 0
      }
    }

    // Üst kenarı sabitle (omuzlara tutturulacak)
    for (let col = 0; col < this.cols; col++) {
      this.pinned[col] = 1
    }

    this._buildConstraints(dx, dy)
    this._initialized = true
  }

  /* ── Constraint ağını kur ── */
  _buildConstraints(dx, dy) {
    this.constraints = []
    const diag = Math.sqrt(dx * dx + dy * dy)

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const i = row * this.cols + col

        // Structural — yatay
        if (col < this.cols - 1) {
          this.constraints.push([i, i + 1, dx, 1.0])
        }
        // Structural — dikey
        if (row < this.rows - 1) {
          this.constraints.push([i, i + this.cols, dy, 1.0])
        }
        // Shear — çapraz sağ-aşağı
        if (col < this.cols - 1 && row < this.rows - 1) {
          this.constraints.push([i, i + this.cols + 1, diag, 0.8])
        }
        // Shear — çapraz sol-aşağı
        if (col > 0 && row < this.rows - 1) {
          this.constraints.push([i, i + this.cols - 1, diag, 0.8])
        }
        // Bending — 2 adım yatay
        if (col < this.cols - 2) {
          this.constraints.push([i, i + 2, dx * 2, 0.5])
        }
        // Bending — 2 adım dikey
        if (row < this.rows - 2) {
          this.constraints.push([i, i + this.cols * 2, dy * 2, 0.5])
        }
      }
    }
  }

  /* ── Sabitleme noktalarını güncelle (omuzlar takip etsin) ── */
  updateAnchors(leftShoulderX, leftShoulderY, rightShoulderX, rightShoulderY) {
    if (!this._initialized) return

    const totalWidth = rightShoulderX - leftShoulderX
    const dx = totalWidth / (this.cols - 1)

    for (let col = 0; col < this.cols; col++) {
      const i = col
      const t = col / (this.cols - 1)
      this.posX[i] = leftShoulderX + t * totalWidth
      this.posY[i] = leftShoulderY * (1 - t) + rightShoulderY * t
      this.oldX[i] = this.posX[i]
      this.oldY[i] = this.posY[i]
    }
  }

  /* ── Vücut collision sphere ekle ── */
  addSphere(x, y, radius) {
    this.spheres.push({ x, y, radius })
  }

  clearSpheres() { this.spheres = [] }

  /* ── Vücut noktalarından collision sphere'lar oluştur ── */
  updateBodySpheres(landmarks) {
    this.clearSpheres()
    if (!landmarks) return

    const { ls, rs, lh, rh, lk, rk } = landmarks
    const sw = Math.abs(rs.x - ls.x)

    // Gövde — büyük bir ellipsoid olarak modelle
    const torsoX = (ls.x + rs.x + lh.x + rh.x) / 4
    const torsoY = (ls.y + rs.y + lh.y + rh.y) / 4
    this.addSphere(torsoX, torsoY, sw * 0.5)

    // Omuzlar
    this.addSphere(ls.x, ls.y, sw * 0.15)
    this.addSphere(rs.x, rs.y, sw * 0.15)

    // Kalça
    const hipX = (lh.x + rh.x) / 2
    const hipY = (lh.y + rh.y) / 2
    this.addSphere(hipX, hipY, sw * 0.35)
  }

  /* ══════════════════════════════════════════════════════
     ANA SİMÜLASYON DÖNGÜSÜ
  ══════════════════════════════════════════════════════ */
  step(dt = 0.016) {
    if (!this._initialized) return

    const dt2 = dt * dt

    // 1. Verlet Integration
    for (let i = 0; i < this.count; i++) {
      if (this.pinned[i]) continue

      // Hız = mevcut - önceki
      const vx = (this.posX[i] - this.oldX[i]) * this.damping
      const vy = (this.posY[i] - this.oldY[i]) * this.damping

      // Rüzgar kuvveti
      const wind = Math.sin(Date.now() * 0.001 + i * 0.1) * this.windStrength
      const windFx = this.windX * wind
      const windFy = this.windY * wind

      // Toplam ivme
      const ax = this.accX[i] + windFx
      const ay = this.accY[i] + this.gravity + windFy

      // Yeni pozisyon
      const newX = this.posX[i] + vx + ax * dt2
      const newY = this.posY[i] + vy + ay * dt2

      this.oldX[i] = this.posX[i]
      this.oldY[i] = this.posY[i]
      this.posX[i] = newX
      this.posY[i] = newY

      this.accX[i] = 0
      this.accY[i] = 0
    }

    // 2. Constraint Solver (birden fazla iterasyon = daha az esneme)
    for (let iter = 0; iter < this.iterations; iter++) {
      this._solveConstraints()
      this._solveCollisions()
    }
  }

  /* ── Distance Constraints ── */
  _solveConstraints() {
    for (let c = 0; c < this.constraints.length; c++) {
      const [a, b, rest, stiffness] = this.constraints[c]

      const dx = this.posX[b] - this.posX[a]
      const dy = this.posY[b] - this.posY[a]
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.001
      const diff = (dist - rest) / dist * stiffness * 0.5

      const moveX = dx * diff
      const moveY = dy * diff

      if (!this.pinned[a]) {
        this.posX[a] += moveX
        this.posY[a] += moveY
      }
      if (!this.pinned[b]) {
        this.posX[b] -= moveX
        this.posY[b] -= moveY
      }
    }
  }

  /* ── Sphere Collision ── */
  _solveCollisions() {
    for (const sphere of this.spheres) {
      for (let i = 0; i < this.count; i++) {
        if (this.pinned[i]) continue

        const dx = this.posX[i] - sphere.x
        const dy = this.posY[i] - sphere.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < sphere.radius) {
          const nx = dx / dist
          const ny = dy / dist
          this.posX[i] = sphere.x + nx * sphere.radius
          this.posY[i] = sphere.y + ny * sphere.radius
        }
      }
    }
  }

  /* ── Canvas'a çiz ── */
  render(ctx, texture = null) {
    if (!this._initialized) return

    ctx.save()

    if (texture && texture.complete) {
      // Texture mapping — kıyafet görüntüsünü kumaş üzerine map et
      this._renderTextured(ctx, texture)
    } else {
      // Debug: wireframe
      this._renderWireframe(ctx)
    }

    ctx.restore()
  }

  /* ── Texture mapped render ── */
  _renderTextured(ctx, texture) {
    const cols = this.cols - 1
    const rows = this.rows - 1
    const tw = texture.naturalWidth  || texture.width
    const th = texture.naturalHeight || texture.height

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const i00 = row * this.cols + col
        const i10 = row * this.cols + col + 1
        const i01 = (row + 1) * this.cols + col
        const i11 = (row + 1) * this.cols + col + 1

        // UV koordinatları
        const u0 = col / cols
        const u1 = (col + 1) / cols
        const v0 = row / rows
        const v1 = (row + 1) / rows

        // Quadı iki üçgene böl ve texture map et
        this._drawTexturedTriangle(
          ctx, texture, tw, th,
          this.posX[i00], this.posY[i00], u0, v0,
          this.posX[i10], this.posY[i10], u1, v0,
          this.posX[i01], this.posY[i01], u0, v1
        )
        this._drawTexturedTriangle(
          ctx, texture, tw, th,
          this.posX[i10], this.posY[i10], u1, v0,
          this.posX[i11], this.posY[i11], u1, v1,
          this.posX[i01], this.posY[i01], u0, v1
        )
      }
    }
  }

  /* ── Affine texture mapped triangle ── */
  _drawTexturedTriangle(ctx, img, iw, ih, x0, y0, u0, v0, x1, y1, u1, v1, x2, y2, u2, v2) {
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.closePath()
    ctx.clip()

    // Affine dönüşüm matrisi hesapla
    const det = (u1 - u0) * (v2 - v0) - (u2 - u0) * (v1 - v0)
    if (Math.abs(det) < 1e-6) { ctx.restore(); return }

    const a = ((x1 - x0) * (v2 - v0) - (x2 - x0) * (v1 - v0)) / det
    const b = ((x2 - x0) * (u1 - u0) - (x1 - x0) * (u2 - u0)) / det
    const c = ((y1 - y0) * (v2 - v0) - (y2 - y0) * (v1 - v0)) / det
    const d = ((y2 - y0) * (u1 - u0) - (y1 - y0) * (u2 - u0)) / det
    const e = x0 - a * u0 * iw - b * v0 * ih
    const f = y0 - c * u0 * iw - d * v0 * ih

    ctx.transform(a * iw, c * iw, b * ih, d * ih, e, f)
    ctx.globalAlpha = 0.92
    ctx.drawImage(img, 0, 0)
    ctx.restore()
  }

  /* ── Wireframe debug render ── */
  _renderWireframe(ctx) {
    ctx.strokeStyle = 'rgba(200,169,110,0.4)'
    ctx.lineWidth = 0.5

    for (const [a, b] of this.constraints) {
      ctx.beginPath()
      ctx.moveTo(this.posX[a], this.posY[a])
      ctx.lineTo(this.posX[b], this.posY[b])
      ctx.stroke()
    }
  }

  /* ── Rüzgar ayarla ── */
  setWind(x, y, strength) {
    this.windX = x
    this.windY = y
    this.windStrength = strength
  }

  /* ── Reset ── */
  reset() {
    if (!this._initialized) return
    this.init(this.originX, this.originY, this.clothW, this.clothH)
  }
}
