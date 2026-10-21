import { useEffect, useRef, useState } from 'react'
import { prepararArchivos, guardarBlob, urlDe, MAX_SEGUNDOS_VIDEO } from '../lib/media'

const MAX_ARCHIVOS = 5
const PESO_MAX_FOTO = 12 * 1024 * 1024

/**
 * Selector de fotos/videos con compresión automática.
 * value: [{blob, tipo, nombre, url, original, final}]
 */
export function MediaPicker({ value = [], onChange, soloLectura }) {
  const input = useRef(null)
  const [cargando, setCargando] = useState('')
  const [error, setError] = useState('')

  const agregar = async (files) => {
    setError('')
    if (!files || !files.length) return
    if (value.length + files.length > MAX_ARCHIVOS) {
      setError(`Máximo ${MAX_ARCHIVOS} archivos por publicación.`)
      return
    }
    const pesados = Array.from(files).filter((f) => (f.type || '').startsWith('image/') && f.size > PESO_MAX_FOTO)
    if (pesados.length) {
      setError('Esa foto pesa demasiado (máx. 12 MB).')
      return
    }
    setCargando('Comprimiendo… 0%')
    try {
      const preparados = await prepararArchivos(files, {
        onProgress: (p) => setCargando(typeof p === 'number' ? `Comprimiendo… ${p}%` : `Procesando ${p}`)
      })
      const nuevos = preparados.map((p) => ({
        blob: p.blob,
        tipo: p.tipo,
        nombre: p.nombre,
        original: p.original,
        final: p.final,
        url: URL.createObjectURL(p.blob)
      }))
      onChange([...value, ...nuevos])
    } catch (e) {
      setError(e.message || 'No se pudo procesar el archivo.')
    } finally {
      setCargando('')
      if (input.current) input.current.value = ''
    }
  }

  const quitar = (i) => {
    const copia = [...value]
    try { URL.revokeObjectURL(copia[i].url) } catch {}
    copia.splice(i, 1)
    onChange(copia)
  }

  const ahorrado = value.reduce((s, v) => s + Math.max(0, (v.original || 0) - (v.final || 0)), 0)

  return (
    <div className="field">
      <label>Fotos y video corto (opcional)</label>

      <input
        ref={input}
        type="file"
        accept="image/*,video/*"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => agregar(e.target.files)}
      />

      {!soloLectura && (
        <button
          type="button"
          className="btn btn-secundario"
          onClick={() => input.current && input.current.click()}
          disabled={Boolean(cargando) || value.length >= MAX_ARCHIVOS}
        >
          {cargando ? cargando : `📷 Añadir foto o video (${value.length}/${MAX_ARCHIVOS})`}
        </button>
      )}

      <div className="ayuda">
        Las fotos se reducen a 1280 px y los videos se recortan/comprimen a {MAX_SEGUNDOS_VIDEO} s y 720p
        automáticamente: gastas menos datos y el aviso carga rápido.
      </div>

      {cargando && (
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--verde-700)', marginTop: 8 }}>
          ⚙️ {cargando} — no cierres esta pantalla.
        </div>
      )}

      {error && (
        <div style={{ background: '#fdecea', color: '#8e2a1e', padding: '9px 12px', borderRadius: 11, fontSize: 12.5, fontWeight: 600, marginTop: 8 }}>
          {error}
        </div>
      )}

      {value.length > 0 && (
        <div className="media-grid">
          {value.map((m, i) => (
            <div className="media-item" key={i}>
              {m.tipo === 'video' ? (
                <video src={m.url} controls preload="metadata" muted playsInline />
              ) : (
                <img src={m.url} alt={m.nombre || 'foto'} />
              )}
              {!soloLectura && (
                <button type="button" className="media-quitar" onClick={() => quitar(i)} aria-label="Quitar">
                  ✕
                </button>
              )}
              <span className="media-tag">{m.tipo === 'video' ? '🎬' : '🖼️'} {kb(m.final)}</span>
            </div>
          ))}
        </div>
      )}

      {ahorrado > 0 && (
        <div style={{ fontSize: 11.5, color: 'var(--verde-700)', fontWeight: 700, marginTop: 8 }}>
          ✓ Se ahorraron {kb(ahorrado)} al comprimir
        </div>
      )}
    </div>
  )
}

/** Visor de medios de una publicación (resuelve Supabase o navegador). */
export function Media({ lista }) {
  const [urls, setUrls] = useState([])
  useEffect(() => {
    let vivo = true
    if (!Array.isArray(lista) || lista.length === 0) {
      setUrls([])
      return
    }
    Promise.all(lista.map((m) => urlDe(m)))
      .then((res) => { if (vivo) setUrls(res.map((url, i) => ({ url, tipo: lista[i].tipo }))) })
      .catch(() => {})
    return () => { vivo = false }
  }, [lista])

  if (!urls.length) return null
  return (
    <div className={`media-visor ${urls.length === 1 ? 'una' : ''}`}>
      {urls.map((m, i) =>
        m.url ? (
          m.tipo === 'video' ? (
            <video key={i} src={m.url} controls preload="metadata" playsInline />
          ) : (
            <img key={i} src={m.url} alt="" loading="lazy" />
          )
        ) : (
          <div key={i} className="media-rota">media no disponible</div>
        )
      )}
    </div>
  )
}

const kb = (b) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)
