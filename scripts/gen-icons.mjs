/* Genera los iconos PNG de la PWA sin dependencias externas.
   Uso: npm run icons  (sale en public/icons/) */
import zlib from 'node:zlib'
import fs from 'node:fs'
import path from 'node:path'

/* ---------- PNG mínimo (RGBA) ---------- */
const CRC_TABLE = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = -1
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crc])
}

function encodePNG(w, h, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  const raw = Buffer.alloc((w * 4 + 1) * h)
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0 // filtro: none
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4)
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
}

/* ---------- Lienzo ---------- */
function canvas(size) {
  const buf = Buffer.alloc(size * size * 4, 0)
  const px = (x, y, r, g, b, a = 255) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return
    const i = (Math.floor(y) * size + Math.floor(x)) * 4
    const na = a / 255
    buf[i] = Math.round(r * na + buf[i] * (1 - na))
    buf[i + 1] = Math.round(g * na + buf[i + 1] * (1 - na))
    buf[i + 2] = Math.round(b * na + buf[i + 2] * (1 - na))
    buf[i + 3] = Math.max(buf[i + 3], a)
  }
  const fill = (r, g, b, a = 255) => {
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) px(x, y, r, g, b, a)
  }
  const fillCircle = (cx, cy, rad, r, g, b, a = 255) => {
    for (let y = Math.floor(cy - rad); y <= cy + rad; y++)
      for (let x = Math.floor(cx - rad); x <= cx + rad; x++) {
        const dx = x - cx
        const dy = y - cy
        if (dx * dx + dy * dy <= rad * rad) px(x, y, r, g, b, a)
      }
  }
  const stroke = (x1, y1, x2, y2, w, r, g, b, a = 255) => {
    const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) * 2 + 1
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      fillCircle(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, w / 2, r, g, b, a)
    }
  }
  return { buf, px, fill, fillCircle, stroke, out: () => encodePNG(size, size, buf) }
}

/* Pulso: latido cardiaco dentro de un circulo */
function drawIcon(size, pad = 0) {
  const c = canvas(size)
  const bg = [30, 74, 56] // #1E4A38
  const white = [255, 255, 255]
  const gold = [224, 184, 74]

  c.fill(bg[0], bg[1], bg[2])

  const cx = size / 2
  const cy = size / 2
  const rad = size / 2 - pad

  if (pad > 0) c.fillCircle(cx, cy, rad, ...gold) // anillo para maskable
  const ir = rad * (pad > 0 ? 0.74 : 0.86)
  c.fillCircle(cx, cy, ir, ...white)

  // linea de pulso
  const w = Math.max(3, size * 0.075)
  const y = cy
  const pts = [
    [-0.55, 0],
    [-0.28, 0],
    [-0.14, -0.02],
    [-0.02, -0.3],
    [0.1, 0.32],
    [0.2, -0.06],
    [0.3, 0],
    [0.55, 0]
  ].map(([x, yy]) => [cx + x * ir * 1.3, y + yy * ir * 1.3])
  for (let i = 0; i < pts.length - 1; i++) {
    c.stroke(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], w, ...bg)
  }
  // punto final dorado
  c.fillCircle(pts[pts.length - 1][0], pts[pts.length - 1][1], w * 0.9, ...gold)
  return c.out()
}

const outDir = path.join(process.cwd(), 'public', 'icons')
fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(path.join(outDir, 'icon-192.png'), drawIcon(192))
fs.writeFileSync(path.join(outDir, 'icon-512.png'), drawIcon(512))
fs.writeFileSync(path.join(outDir, 'icon-maskable-512.png'), drawIcon(512, 64))
console.log('Iconos generados en public/icons/ -> icon-192.png, icon-512.png, icon-maskable-512.png')
