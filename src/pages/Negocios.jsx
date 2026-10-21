import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import PostCard from '../components/PostCard'
import { Buscador, SponsorCarousel, Vacio } from '../components/UI'
import { RUBROS, EMPLEO_TIPOS, TIPOS } from '../lib/tipos'
import * as api from '../lib/api'
import { useApp } from '../context/AppContext'

const EMOJIS = ['🏪', '🌮', '🛒', '🛠️', '💇', '🩺', '📚', '🔌', '🌾', '👗', '💻', '🍕']

export default function Negocios() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab = params.get('empleos') ? 'empleos' : 'negocios'
  const { user, mostrarToast, comunidad } = useApp()

  const [q, setQ] = useState('')
  const [rubro, setRubro] = useState('')
  const [modalidad, setModalidad] = useState('')
  const [negocios, setNegocios] = useState(null)
  const [empleos, setEmpleos] = useState(null)
  const [formAbierto, setFormAbierto] = useState(false)
  const [form, setForm] = useState({ nombre: '', rubro: 'Comida', emoji: '🏪', telefono: '', direccion: '', horario: '', descripcion: '' })

  const cargar = async () => {
    const [n, e] = await Promise.all([
      api.businesses.list({ comunidadId: comunidad }),
      api.posts.list({ tipo: 'empleo', limit: 50, comunidadId: comunidad })
    ])
    setNegocios(n)
    setEmpleos(e)
  }
  useEffect(() => { cargar() }, [comunidad])

  const sponsors = useMemo(() => (negocios || []).filter((n) => n.es_patrocinado), [negocios])

  const negociosVisibles = useMemo(() => {
    let arr = negocios || []
    if (rubro) arr = arr.filter((n) => n.rubro === rubro)
    if (q.trim()) {
      const t = q.toLowerCase()
      arr = arr.filter((n) => [n.nombre, n.rubro, n.descripcion, n.direccion].filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(t)))
    }
    // patrocinados primero
    return [...arr].sort((a, b) => Number(b.es_patrocinado) - Number(a.es_patrocinado))
  }, [negocios, rubro, q])

  const empleosVisibles = useMemo(() => {
    let arr = empleos || []
    if (modalidad) arr = arr.filter((e) => e.modalidad === modalidad)
    if (q.trim()) {
      const t = q.toLowerCase()
      arr = arr.filter((e) => [e.titulo, e.cuerpo, e.business_name, e.lugar].filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(t)))
    }
    return arr
  }, [empleos, modalidad, q])

  const miNegocio = useMemo(
    () => (negocios || []).find((n) => user && n.owner_id === user.id),
    [negocios, user]
  )

  const crearNegocio = async (e) => {
    e.preventDefault()
    const r = await api.businesses.create(form)
    if (r.error) return mostrarToast(r.error, 'error')
    mostrarToast('¡Negocio creado! Ahora queda en revisión para el sello ✓', 'ok')
    setFormAbierto(false)
    setForm({ ...form, nombre: '' })
    cargar()
  }

  return (
    <>
      <div className="tabs">
        <button className={tab === 'negocios' ? 'activo' : ''} onClick={() => setParams({})}>
          🏪 Negocios
        </button>
        <button className={tab === 'empleos' ? 'activo' : ''} onClick={() => setParams({ empleos: '1' })}>
          💼 Empleos
        </button>
      </div>

      <Buscador
        valor={q}
        onChange={setQ}
        placeholder={tab === 'negocios' ? 'Buscar negocio, rubro o dirección…' : 'Buscar vacante, puesto o negocio…'}
      />

      {tab === 'negocios' && !q && <SponsorCarousel negocios={sponsors} />}

      {tab === 'negocios' && (
        <div className="chips">
          <button className={`chip ${rubro === '' ? 'activo' : ''}`} onClick={() => setRubro('')}>Todos</button>
          {RUBROS.map((r) => (
            <button key={r} className={`chip ${rubro === r ? 'activo' : ''}`} onClick={() => setRubro(r)}>{r}</button>
          ))}
        </div>
      )}

      {tab === 'empleos' && (
        <div className="chips">
          <button className={`chip ${modalidad === '' ? 'activo' : ''}`} onClick={() => setModalidad('')}>Todas</button>
          {EMPLEO_TIPOS.map((r) => (
            <button key={r} className={`chip ${modalidad === r ? 'activo' : ''}`} onClick={() => setModalidad(r)}>{r}</button>
          ))}
        </div>
      )}

      <div className="seccion-titulo">
        <h2>{tab === 'negocios' ? 'Directorio del pueblo' : 'Trabajo local'}</h2>
        <button onClick={() => (user ? setFormAbierto(!formAbierto) : navigate('/login'))}>
          {tab === 'negocios' ? '+ Mi negocio' : '+ Publicar vacante'}
        </button>
      </div>

      {tab === 'negocios' && formAbierto && (
        <form className="card card-pad" style={{ marginBottom: 14 }} onSubmit={crearNegocio}>
          <h3 style={{ margin: '0 0 14px', fontSize: 16 }}>Registra tu negocio</h3>
          <div className="field">
            <label>Nombre del negocio</label>
            <input className="input" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej. Tacos Doña Lupita" />
          </div>
          <div className="grid-2">
            <div className="field">
              <label>Rubro</label>
              <select className="select" value={form.rubro} onChange={(e) => setForm({ ...form, rubro: e.target.value })}>
                {RUBROS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Ícono</label>
              <select className="select" value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })}>
                {EMOJIS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div className="grid-2">
            <div className="field">
              <label>Teléfono / WhatsApp</label>
              <input className="input" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} placeholder="55 0000 0000" />
            </div>
            <div className="field">
              <label>Horario</label>
              <input className="input" value={form.horario} onChange={(e) => setForm({ ...form, horario: e.target.value })} placeholder="Lun a Sáb · 9-18" />
            </div>
          </div>
          <div className="field">
            <label>Dirección</label>
            <input className="input" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} placeholder="Calle y número, colonia" />
          </div>
          <div className="field">
            <label>Descripción</label>
            <textarea className="textarea" style={{ minHeight: 80 }} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="Qué vendes o qué servicio ofreces…" />
          </div>
          <button className="btn btn-primario">Crear mi negocio</button>
          <p style={{ fontSize: 12, color: 'var(--texto-3)', margin: '10px 0 0' }}>
            Con negocio verificado puedes publicar <b>3 veces al día</b> (los vecinos 1). El sello ✓ lo da la moderación.
          </p>
        </form>
      )}

      {tab === 'negocios' && (
        <>
          {miNegocio && (
            <div
              className="bloque"
              style={{ marginTop: 0, marginBottom: 12, background: 'var(--verde-100)', border: '1px solid #cfe3d8' }}
              onClick={() => navigate(`/negocio/${miNegocio.id}`)}
            >
              <span className="ico">{miNegocio.emoji}</span>
              <div>
                <b>Mi negocio · {miNegocio.nombre}</b>
                <p>{miNegocio.es_verificado ? '✓ Verificado · ' : ''}Revisa tus publicaciones y tu ficha.</p>
              </div>
            </div>
          )}

          {negocios === null && <div className="cargando"><div className="spin" />Cargando negocios…</div>}

          {negocios !== null && negociosVisibles.length === 0 && (
            <Vacio ico="🏪" titulo="Sin negocios aquí" texto="Prueba con otro rubro o registra el primero." />
          )}

          {negociosVisibles.map((n) => (
            <div key={n.id} className={`negocio-item ${n.es_patrocinado ? 'sponsor' : ''}`} onClick={() => navigate(`/negocio/${n.id}`)}>
              <div className="negocio-logo">{n.emoji || '🏪'}</div>
              <div className="negocio-info">
                <b>{n.nombre} {n.es_patrocinado && <span title="Patrocinador">✦</span>}</b>
                <div className="sub">{n.rubro} · {n.direccion || 'Sin dirección'} {n.horario ? `· ${n.horario}` : ''}</div>
                <div className="badges">
                  {n.es_verificado && <span className="mini-badge verif">✓ Verificado</span>}
                  {n.es_patrocinado && <span className="mini-badge spon">✦ Patrocinador</span>}
                  {n.comunidad && <span className="mini-badge">📍 {n.comunidad}</span>}
                  <span className="mini-badge">📱 {n.telefono || 'sin teléfono'}</span>
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      {tab === 'empleos' && (
        <>
          {empleos === null && <div className="cargando"><div className="spin" />Cargando vacantes…</div>}
          {empleos !== null && empleosVisibles.length === 0 && (
            <Vacio ico="💼" titulo="No hay vacantes con ese filtro" texto="Cambia el tipo de trabajo o publica tú una vacante." />
          )}
          {empleosVisibles.map((p) => <PostCard key={p.id} post={p} />)}
          <div className="card card-pad" style={{ textAlign: 'center', marginTop: 4 }}>
            <div style={{ fontSize: 26, marginBottom: 6 }}>🤝</div>
            <b style={{ fontSize: 15 }}>¿Necesitas personal o quieres trabajar?</b>
            <p style={{ fontSize: 13, color: 'var(--texto-2)', margin: '6px 0 14px', lineHeight: 1.5 }}>
              Publica una vacante gratis o postula directo con el negocio por WhatsApp.
            </p>
            <button className="btn btn-primario" onClick={() => navigate('/publicar?tipo=empleo')}>
              {TIPOS.empleo.icon} Publicar vacante
            </button>
          </div>
        </>
      )}
    </>
  )
}
