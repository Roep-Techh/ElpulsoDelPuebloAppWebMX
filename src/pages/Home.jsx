import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PostCard from '../components/PostCard'
import { Buscador, SponsorCarousel, Vacio, Cupo, AvisoDemo } from '../components/UI'
import { TIPOS } from '../lib/tipos'
import * as api from '../lib/api'
import { useApp } from '../context/AppContext'
import { haceCuanto } from '../lib/format'

const FILTROS = [
  { key: '', label: 'Todo' },
  { key: 'evento', label: '🎉 Eventos' },
  { key: 'venta', label: '🛍️ Ventas' },
  { key: 'empleo', label: '💼 Empleos' },
  { key: 'ayuda', label: '❤️ Ayuda' },
  { key: 'pregunta', label: '❓ Preguntas' }
]

export default function Home() {
  const navigate = useNavigate()
  const { user } = useApp()
  const [q, setQ] = useState('')
  const [filtro, setFiltro] = useState('')
  const [posts, setPosts] = useState(null)
  const [negocios, setNegocios] = useState([])
  const [avisos, setAvisos] = useState([])

  const cargar = async () => {
    const [p, n, a] = await Promise.all([
      api.posts.list({ limit: 60 }),
      api.businesses.list(),
      api.posts.list({ tipo: 'aviso', limit: 10 })
    ])
    setPosts(p)
    setNegocios(n)
    setAvisos(a)
  }

  useEffect(() => {
    cargar()
  }, [])

  const sponsors = useMemo(() => negocios.filter((n) => n.es_patrocinado), [negocios])
  const urgente = useMemo(() => avisos.find((a) => a.prioridad === 'urgente'), [avisos])

  const visibles = useMemo(() => {
    if (!posts) return []
    let arr = posts
    if (q.trim()) {
      const t = q.toLowerCase()
      arr = arr.filter((p) =>
        [p.titulo, p.cuerpo, p.author_name, p.business_name, p.lugar].filter(Boolean)
          .some((s) => String(s).toLowerCase().includes(t))
      )
    } else if (filtro) {
      arr = arr.filter((p) => p.tipo === filtro)
    }
    return arr
  }, [posts, q, filtro])

  const resultadosNegocios = useMemo(() => {
    if (!q.trim()) return []
    const t = q.toLowerCase()
    return negocios.filter((n) =>
      [n.nombre, n.rubro, n.descripcion, n.direccion].filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(t))
    )
  }, [q, negocios])

  const eventosHoy = useMemo(() => (posts || []).filter((p) => p.tipo === 'evento').length, [posts])

  return (
    <>
      <AvisoDemo />
      <Buscador valor={q} onChange={setQ} />

      {!q && (
        <>
          <div className="resumen-grid">
            <button className="resumen" onClick={() => navigate('/avisos')} style={{ cursor: 'pointer' }}>
              <b>{avisos.length}</b>
              <span>AVISOS</span>
            </button>
            <button className="resumen" onClick={() => navigate('/negocios')} style={{ cursor: 'pointer' }}>
              <b>{negocios.length}</b>
              <span>NEGOCIOS</span>
            </button>
            <button className="resumen" onClick={() => navigate('/mapa')} style={{ cursor: 'pointer' }}>
              <b>{eventosHoy}</b>
              <span>EVENTOS</span>
            </button>
          </div>

          {urgente && (
            <div className="bloque urgente" onClick={() => navigate(`/post/${urgente.id}`)}>
              <span className="ico">🚨</span>
              <div>
                <b>AVISO URGENTE · {haceCuanto(urgente.creado_en)}</b>
                <p>{urgente.titulo}</p>
              </div>
            </div>
          )}

          <SponsorCarousel negocios={sponsors} />

          <div className="grid-2">
            <button className="acceso" onClick={() => navigate('/negocios')}>
              <span className="ico">🏪</span>
              <b>Negocios</b>
              <span>Compra y servicios</span>
            </button>
            <button className="acceso" onClick={() => navigate('/mapa')}>
              <span className="ico">🗺️</span>
              <b>Mapa</b>
              <span>Conoce tu pueblo</span>
            </button>
          </div>

          <div className="bloque" onClick={() => navigate('/avisos')}>
            <span className="ico">📢</span>
            <div>
              <b>Avisos importantes</b>
              <p>Avisos oficiales, servicios y comunicados de la comunidad.</p>
            </div>
          </div>

          <div className="bloque" onClick={() => navigate('/publicar')}>
            <span className="ico">✏️</span>
            <div>
              <b>¿Qué está pasando?</b>
              <p>Promociones, eventos y publicaciones recientes de los vecinos.</p>
            </div>
          </div>
        </>
      )}

      <div className="seccion-titulo">
        <h2>{q ? `Resultados para “${q}”` : 'Del pueblo, en orden cronológico'}</h2>
        {!q && <button onClick={() => navigate('/publicar')}>+ Publicar</button>}
      </div>

      {!q && (
        <div className="chips">
          {FILTROS.map((f) => (
            <button
              key={f.key}
              className={`chip ${filtro === f.key ? 'activo' : ''}`}
              onClick={() => setFiltro(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {q && resultadosNegocios.length > 0 && (
        <>
          <div className="titulo-destacado" style={{ color: 'var(--verde-700)' }}>🏪 Negocios</div>
          {resultadosNegocios.map((n) => (
            <div key={n.id} className="negocio-item" onClick={() => navigate(`/negocio/${n.id}`)}>
              <div className="negocio-logo">{n.emoji || '🏪'}</div>
              <div className="negocio-info">
                <b>{n.nombre}</b>
                <div className="sub">{n.rubro} · {n.direccion}</div>
              </div>
            </div>
          ))}
        </>
      )}

      {posts === null && (
        <div className="cargando">
          <div className="spin" />
          Cargando el pulso del pueblo…
        </div>
      )}

      {posts !== null && visibles.length === 0 && (
        <Vacio
          ico="🔍"
          titulo={q ? 'Sin resultados' : 'Aún no hay publicaciones'}
          texto={q ? 'Prueba con otra palabra: comida, empleo, evento…' : 'Sé el primero en compartir algo bueno de tu comunidad.'}
        />
      )}

      {(visibles || []).map((p) => (
        <PostCard key={p.id} post={p} />
      ))}

      {user && visibles.length > 0 && <Cupo compacto />}
    </>
  )
}
