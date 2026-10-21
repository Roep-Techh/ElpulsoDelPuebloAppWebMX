/* ============================================================
   MEDIOS: fotos y videos cortos, comprimidos en el dispositivo
   antes de subir, para no gastar datos ni espacio.

   - Fotos: se redimensionan a max 1280 px y se pasan a JPEG q0.75
   - Videos: se recodifican a max 20 s / 720p a ~900 kbps (webm).
     Si el navegador no puede recodificar, se acepta el original
     solo si dura 20 s o menos y pesa poco.
   ============================================================ */

const MAX_LADO_FOTO = 1280
const CALIDAD_FOTO = 0.75
export const MAX_SEGUNDOS_VIDEO = 20
const MAX_LADO_VIDEO = 720
const BITRATE_VIDEO = 900000
const PESO_MAX_VIDEO_SIN_RECODIFICAR = 8 * 1024 * 1024 // 8 MB

/* ---------------- almacenamiento local de blobs (modo demo) ---------------- */
const CACHE_URLS = new Map()
const MEMORIA = new Map() // respaldo si no hay IndexedDB
let DB = null

function abrirDB() {
  if (DB) return DB
  if (typeof indexedDB === 'undefined') return null
  DB = new Promise((res) => {
    try {
      const req = indexedDB.open('elpulso-media', 1)
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains('media')) req.result.createObjectStore('media')
      }
      req.onsuccess = () => res(req.result)
      req.onerror = () => res(null)
    } catch {
      res(null)
    }
  })
  return DB
}

const uid = () => 'm-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

/** Guarda un blob (demo: navegador). Devuelve el item para el post. */
export async function guardarBlob(blob) {
  const item = { tipo: blob.type.startsWith('video') ? 'video' : 'imagen', id: uid(), peso: blob.size }
  MEMORIA.set(item.id, blob)
  const db = await abrirDB()
  if (db) {
    await new Promise((res) => {
      const tx = db.transaction('media', 'readwrite')
      tx.objectStore('media').put(blob, item.id)
      tx.oncomplete = res
      tx.onerror = res
    })
  }
  return item
}

/** URL usable para mostrar (Supabase ya trae url; demo resuelve desde el navegador). */
export async function urlDe(item) {
  if (!item) return null
  if (item.url) return item.url
  if (CACHE_URLS.has(item.id)) return CACHE_URLS.get(item.id)
  let blob = MEMORIA.get(item.id) || null
  if (!blob) {
    const db = await abrirDB()
    if (db) {
      blob = await new Promise((res) => {
        const tx = db.transaction('media', 'readonly')
        const r = tx.objectStore('media').get(item.id)
        r.onsuccess = () => res(r.result || null)
        r.onerror = () => res(null)
      })
    }
  }
  if (!blob) return null
  let url = null
  try {
    url = URL.createObjectURL(blob)
  } catch {
    return null
  }
  CACHE_URLS.set(item.id, url)
  return url
}

/* ---------------- utilidades ---------------- */
const cargarImagen = (file) =>
  new Promise((resolve, reject) => {
    if (typeof Image === 'undefined') return reject(new Error('sin Image'))
    const url = URL.createObjectURL(file)
    const img = new Image()
    const fin = (err) => URL.revokeObjectURL(url)
    img.onload = () => { fin(); resolve(img) }
    img.onerror = () => { fin(); reject(new Error('no se pudo leer la imagen')) }
    img.src = url
    setTimeout(() => { fin(); reject(new Error('timeout imagen')) }, 8000)
  })

const cargarVideo = (file) =>
  new Promise((resolve, reject) => {
    if (typeof document === 'undefined' || typeof HTMLVideoElement === 'undefined') return reject(new Error('sin video'))
    const v = document.createElement('video')
    v.preload = 'metadata'
    v.muted = true
    v.playsInline = true
    const url = URL.createObjectURL(file)
    v.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(v) }
    v.onerror = () => { URL.revokeObjectURL(url); reject(new Error('video no compatible')) }
    v.src = url
    setTimeout(() => { URL.revokeObjectURL(url); reject(new Error('timeout video')) }, 8000)
  })

const aCanvas = (w, h) => {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

const canvasABlob = (canvas, tipo, calidad) =>
  new Promise((resolve) => {
    if (canvas.toBlob) canvas.toBlob((b) => resolve(b), tipo, calidad)
    else resolve(null)
  })

/* ---------------- FOTO ---------------- */
export async function comprimirImagen(file) {
  try {
    const img = await cargarImagen(file)
    const escala = Math.min(1, MAX_LADO_FOTO / Math.max(img.width || 1024, img.height || 1024))
    const w = Math.max(1, Math.round((img.width || 1024) * escala))
    const h = Math.max(1, Math.round((img.height || 1024) * escala))
    const canvas = aCanvas(w, h)
    const ctx = canvas.getContext && canvas.getContext('2d')
    if (!ctx) return file // sin canvas (entornos raros): dejamos el original
    ctx.drawImage(img, 0, 0, w, h)
    let blob = await canvasABlob(canvas, 'image/jpeg', CALIDAD_FOTO)
    if (!blob) return file
    // si la compresión no ayudó, dejamos la original
    if (blob.size >= file.size) return file
    return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' })
  } catch {
    return file
  }
}

/* ---------------- VIDEO (max 20 s, 720p) ---------------- */
export async function procesarVideo(file, { onProgress } = {}) {
  let meta = null
  try {
    meta = await cargarVideo(file)
  } catch {
    meta = null
  }

  const duracion = meta && isFinite(meta.duration) ? meta.duration : 0

  // caso feliz: ya es corto y liviano y no tenemos herramientas de recodificar
  const sinHerramientas =
    typeof MediaRecorder === 'undefined' ||
    typeof HTMLCanvasElement === 'undefined' ||
    !HTMLCanvasElement.prototype.captureStream

  if (sinHerramientas) {
    if (duracion && duracion > MAX_SEGUNDOS_VIDEO) {
      throw new Error(`El video dura ${Math.round(duracion)} s. Recuérdalo a ${MAX_SEGUNDOS_VIDEO} s o menos.`)
    }
    if (file.size > PESO_MAX_VIDEO_SIN_RECODIFICAR) {
      throw new Error('El video pesa demasiado. Recuérdalo más corto o en menor calidad.')
    }
    return file
  }

  if (!meta) return file

  const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(
    (m) => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)
  )
  if (!mime) {
    if (duracion > MAX_SEGUNDOS_VIDEO) throw new Error(`El video dura ${Math.round(duracion)} s. Recuérdalo a ${MAX_SEGUNDOS_VIDEO} s.`)
    return file
  }

  try {
    const durTotal = duracion || MAX_SEGUNDOS_VIDEO
    const cortar = Math.min(durTotal, MAX_SEGUNDOS_VIDEO)
    const escala = Math.min(1, MAX_LADO_VIDEO / Math.max(meta.videoWidth || 1280, meta.videoHeight || 720))
    const w = Math.max(2, Math.round((meta.videoWidth || 1280) * escala / 2) * 2)
    const h = Math.max(2, Math.round((meta.videoHeight || 720) * escala / 2) * 2)

    const canvas = aCanvas(w, h)
    const ctx = canvas.getContext && canvas.getContext('2d')
    if (!ctx) return file
    const stream = canvas.captureStream(25)
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: BITRATE_VIDEO })
    const trozos = []
    rec.ondataavailable = (e) => e.data && trozos.push(e.data)

    const terminar = new Promise((resolve) => { rec.onstop = resolve })
    rec.start(250)

    meta.muted = true
    meta.currentTime = 0
    await meta.play().catch(() => {})

    const inicio = Date.now()
    await new Promise((resolve) => {
      const paso = () => {
        const t = (Date.now() - inicio) / 1000
        if (meta.readyState >= 2) {
          try { ctx.drawImage(meta, 0, 0, w, h) } catch {}
        }
        if (onProgress) onProgress(Math.min(99, Math.round((t / cortar) * 100)))
        if (t >= cortar || meta.ended) {
          try { meta.pause() } catch {}
          resolve()
        } else {
          requestAnimationFrame(paso)
        }
      }
      requestAnimationFrame(paso)
    })

    rec.stop()
    await terminar
    const blob = new Blob(trozos, { type: mime.split(';')[0] })
    if (!blob.size) return file
    if (blob.size >= file.size && duracion <= MAX_SEGUNDOS_VIDEO) return file
    if (onProgress) onProgress(100)
    return new File([blob], file.name.replace(/\.\w+$/, '.webm'), { type: mime.split(';')[0] })
  } catch {
    if (duracion > MAX_SEGUNDOS_VIDEO) {
      throw new Error(`No se pudo comprimir y dura ${Math.round(duracion)} s (máx. ${MAX_SEGUNDOS_VIDEO} s).`)
    }
    return file
  }
}

/** Procesa una lista de archivos. Devuelve [{blob, tipo, nombre, original}] */
export async function prepararArchivos(files, { onProgress } = {}) {
  const salida = []
  for (const file of Array.from(files)) {
    const esVideo = (file.type || '').startsWith('video/')
    if (!esVideo && !(file.type || '').startsWith('image/')) {
      throw new Error('Solo se aceptan fotos y videos.')
    }
    if (esVideo) {
      if (onProgress) onProgress('video')
      const blob = await procesarVideo(file, {
        onProgress: (p) => onProgress && onProgress(`video ${p}%`)
      })
      salida.push({ blob, tipo: 'video', nombre: file.name, original: file.size, final: blob.size })
    } else {
      const blob = await comprimirImagen(file)
      salida.push({ blob, tipo: 'imagen', nombre: file.name, original: file.size, final: blob.size })
    }
  }
  return salida
}

export const TAM_FOTO = { maxLado: MAX_LADO_FOTO, calidad: CALIDAD_FOTO }
