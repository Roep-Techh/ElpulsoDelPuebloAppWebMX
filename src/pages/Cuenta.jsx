import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Vacio } from '../components/UI'
import PostCard from '../components/PostCard'
import { MARCA, PLANES, DONACION_RAPIDA, META_MENSUAL } from '../lib/marca'
import { puede, ROLES } from '../lib/permisos'
import { activarNotificaciones, desactivarNotificaciones, estadoSuscripcion, soportadas } from '../lib/push'
import * as api from '../lib/api'
import { useApp } from '../context/AppContext'
import { iniciales, haceCuanto } from '../lib/format'

const PREF_KEY = 'elpulso.preferencias'
const prefsDefecto = { urgentes: true, zona: true, negocios: true }

export default function Cuenta() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { user, salir, mostrarToast, quota, refrescarCupo, modo } = useApp()

  const [seccion, setSeccion] = useState(() => params.get('s') || '')
  const [misPosts, setMisPosts] = useState([])
  const [negocio, setNegocio] = useState(null)
  const [prefs, setPrefs] = useState(() => ({ ...prefsDefecto, ...JSON.parse(localStorage.getItem(PREF_KEY) || '{}') }))
  const [push, setPush] = useState('...')
  const [totalDonado, setTotalDonado] = useState(0)

  /* panel de Roep Tech (solo admin) */
  const [reportes, setReportes] = useState([])
  const [todosNegocios, setTodosNegocios] = useState([])
  const [invitadosPend, setInvitadosPend] = useState([])
  const [buzon, setBuzon] = useState([])
  const [misMensajes, setMisMensajes] = useState([])

  const esAdmin = Boolean(user && puede(user.rol, 'ocultar_contenido'))
  const esEntidad = Boolean(user && user.rol === 'moderador')

  const cargar = async () => {
    if (!user) return
    const [m, n, t] = await Promise.all([
      api.posts.list({ authorId: user.id, limit: 30, incluirVencidos: true }), // aquí sí ve sus avisos vencidos
      api.businesses.list({ ownerId: user.id }),
      api.donations.total()
    ])
    setMisPosts(m)
    setNegocio(n[0] || null)
    setTotalDonado(t)
    setMisMensajes(await api.feedback.mios(user.id))
    if (puede(user.rol, 'ocultar_contenido')) {
      const [r, tn, ip, bz] = await Promise.all([
        api.posts.reports(),
        api.businesses.list(),
        api.posts.pendientes(),
        api.feedback.todos()
      ])
      setReportes(r)
      setTodosNegocios(tn)
      setInvitadosPend(ip)
      setBuzon(bz)
    }
  }

  useEffect(() => { cargar() }, [user, esAdmin])

  // enlaces profundos (notificaciones): /cuenta?s=buzon
  useEffect(() => {
    const s = params.get('s')
    if (s) setSeccion(s)
  }, [params])

  useEffect(() => { estadoSuscripcion().then(setPush) }, [])

  const guardarPref = (k, v) => {
    const nueva = { ...prefs, [k]: v }
    setPrefs(nueva)
    localStorage.setItem(PREF_KEY, JSON.stringify(nueva))
  }

  const activarPush = async () => {
    const r = await activarNotificaciones()
    if (r.error) return mostrarToast(r.error, 'error')
    setPush('activo')
    mostrarToast('Notificaciones activadas 🔔', 'ok')
  }

  const desactivarPush = async () => {
    await desactivarNotificaciones()
    setPush('sin-permiso')
    mostrarToast('Notificaciones desactivadas', 'ok')
  }

  const eliminarPost = async (id) => {
    if (!confirm('¿Eliminar esta publicación?')) return
    await api.posts.remove(id)
    mostrarToast('Eliminada', 'ok')
    cargar()
    refrescarCupo()
  }

  const moderar = async (id, accion) => {
    const r = await api.posts.moderate(id, accion)
    if (r.error) return mostrarToast(r.error, 'error')
    mostrarToast(accion === 'ocultar' ? 'Publicación oculta' : 'Publicación restaurada', 'ok')
    cargar()
  }

  const toggleNegocio = async (n, patch) => {
    const r = await api.businesses.setFlag(n.id, patch)
    if (r.error) return mostrarToast(r.error, 'error')
    mostrarToast('Negocio actualizado', 'ok')
    cargar()
  }

  if (!user) {
    return (
      <div className="card card-pad" style={{ textAlign: 'center', padding: 34 }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>👤</div>
        <b style={{ fontSize: 17 }}>Tu cuenta</b>
        <p style={{ color: 'var(--texto-2)', fontSize: 14, lineHeight: 1.6 }}>
          Inicia sesión para publicar, recibir avisos urgentes y cuidar tu negocio.
        </p>
        <button className="btn btn-primario" onClick={() => navigate('/login')}>Entrar o crear cuenta</button>
      </div>
    )
  }

  const pct = Math.min(100, Math.round((totalDonado / META_MENSUAL) * 100))

  return (
    <>
      <div className="cuenta-head">
        <div className="avatar grande">{iniciales(user.nombre)}</div>
        <h2>{user.nombre}</h2>
        <p>{user.email}</p>
        <div style={{ display: 'flex', gap: 7, justifyContent: 'center', marginTop: 10, flexWrap: 'wrap' }}>
          <span className="mini-badge" style={{ background: 'rgba(255,255,255,.18)', color: '#fff' }}>
            {ROLES[user.rol]?.label || ROLES.vecino.label}
          </span>
          {esEntidad && (
            <span className="mini-badge" style={{ background: 'rgba(255,255,255,.18)', color: '#fff' }}>
              📢 Publicas avisos oficiales
            </span>
          )}
          {user.zona && <span className="mini-badge" style={{ background: 'rgba(255,255,255,.18)', color: '#fff' }}>📍 {user.zona}</span>}
          {negocio && <span className="mini-badge spon">🏪 {negocio.nombre}</span>}
        </div>
      </div>

      <div className="contenido" style={{ padding: '14px 0 0' }}>
        <div className="resumen-grid">
          <div className="resumen"><b>{quota ? `${quota.usadas}/${quota.tope}` : '-'}</b><span>PUB. HOY</span></div>
          <div className="resumen"><b>{misPosts.length}</b><span>MIS PUBLICACIONES</span></div>
          <div className="resumen"><b>{negocio ? '✓' : '—'}</b><span>MI NEGOCIO</span></div>
        </div>

        <CupoCuenta />

        {/* --------- OPCIONES --------- */}
        <div className="lista-opciones">
          <button className="opcion" onClick={() => setSeccion(seccion === 'misposts' ? '' : 'misposts')}>
            <span className="ico">✏️</span> Mis publicaciones
            <span className="der">{misPosts.length} {seccion === 'misposts' ? '▾' : '▸'}</span>
          </button>
          <button className="opcion" onClick={() => navigate('/negocios')}>
            <span className="ico">🏪</span> {negocio ? 'Mi negocio' : 'Registrar mi negocio'}
            <span className="der">{negocio ? negocio.nombre : 'Crear ▸'}</span>
          </button>
          <button className="opcion" onClick={() => setSeccion(seccion === 'notif' ? '' : 'notif')}>
            <span className="ico">🔔</span> Notificaciones
            <span className="der">{push === 'activo' ? 'Activas' : 'Configurar ▸'}</span>
          </button>
          <button className="opcion" onClick={() => setSeccion(seccion === 'patro' ? '' : 'patro')}>
            <span className="ico">✦</span> Patrocinios y destacados
            <span className="der">Ver planes ▸</span>
          </button>
          <button className="opcion" onClick={() => setSeccion(seccion === 'donar' ? '' : 'donar')}>
            <span className="ico">💚</span> Donaciones a la app
            <span className="der">Apoyar ▸</span>
          </button>
          <button className="opcion" onClick={() => setSeccion(seccion === 'buzon' ? '' : 'buzon')}>
            <span className="ico">📥</span> Quejas, ideas y recomendaciones
            <span className="der">{misMensajes.length ? `${misMensajes.length} míos ▸` : 'Escribir ▸'}</span>
          </button>
          {esAdmin && (
            <button className="opcion" onClick={() => setSeccion(seccion === 'mod' ? '' : 'mod')}>
              <span className="ico">🛡️</span> Panel de Roep Tech
              <span className="der">
                {[...invitadosPend, ...reportes.filter((x) => x.estado === 'abierto'), ...buzon.filter((b) => b.estado === 'nuevo')].length > 0
                  ? `${invitadosPend.length + reportes.filter((x) => x.estado === 'abierto').length + buzon.filter((b) => b.estado === 'nuevo').length} pendientes`
                  : 'Abrir ▸'}
              </span>
            </button>
          )}
        </div>

        {/* --------- MIS PUBLICACIONES --------- */}
        {seccion === 'misposts' && (
          <div style={{ marginTop: 12 }}>
            {misPosts.length === 0 && <Vacio ico="✏️" titulo="Nada publicado aún" texto="Desde la pestaña Publicar comparte algo útil con tu comunidad." />}
            {misPosts.map((p) => (
              <div key={p.id}>
                <PostCard post={p} />
                <div style={{ display: 'flex', gap: 8, marginTop: -6, marginBottom: 14 }}>
                  <button className="btn btn-fantasma btn-mini" onClick={() => navigate(`/post/${p.id}`)}>Ver</button>
                  <button className="btn btn-peligro btn-mini" onClick={() => eliminarPost(p.id)}>🗑️ Eliminar</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* --------- NOTIFICACIONES --------- */}
        {seccion === 'notif' && (
          <div className="card card-pad" style={{ marginTop: 12 }}>
            <b style={{ fontSize: 15 }}>¿Qué quieres que te avisemos?</b>
            <p style={{ fontSize: 12.5, color: 'var(--texto-3)', margin: '5px 0 14px', lineHeight: 1.55 }}>
              Solo lo importante: así la app no se vuelve una molestia.
            </p>

            <FilaPref ico="🚨" titulo="Avisos urgentes y oficiales" sub="Cortes, clima, seguridad" on={prefs.urgentes} onChange={(v) => guardarPref('urgentes', v)} bloqueado />
            <FilaPref ico="📍" titulo="Avisos de mi zona" sub="Colonias y calles cercanas" on={prefs.zona} onChange={(v) => guardarPref('zona', v)} />
            <FilaPref ico="🏪" titulo="Novedades de negocios que sigo" sub="Ofertas y eventos" on={prefs.negocios} onChange={(v) => guardarPref('negocios', v)} />

            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>
                Notificaciones del navegador (PWA): {push === 'activo' ? '✅ activas' : push === 'bloqueado' ? '⛔ bloqueadas' : '⏸️ apagadas'}
              </div>
              {!soportadas() ? (
                <p style={{ fontSize: 12.5, color: 'var(--texto-3)' }}>Este navegador no soporta notificaciones push.</p>
              ) : push === 'activo' ? (
                <button className="btn btn-secundario" onClick={desactivarPush}>Desactivar notificaciones</button>
              ) : (
                <button className="btn btn-primario" onClick={activarPush}>🔔 Activar notificaciones del navegador</button>
              )}
            </div>
          </div>
        )}

        {/* --------- PATROCINIOS --------- */}
        {seccion === 'patro' && (
          <div style={{ marginTop: 12 }}>
            <div className="titulo-destacado">✦ Haz que tu negocio se note</div>
            {PLANES.map((p) => (
              <div key={p.id} className="card card-pad" style={{ marginBottom: 12, border: '1.5px solid var(--dorado)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <b style={{ fontSize: 16 }}>{p.nombre}</b>
                  <span style={{ fontSize: 17, fontWeight: 900, color: 'var(--dorado-oscuro)' }}>${p.precio}<span style={{ fontSize: 11, fontWeight: 600 }}>/mes</span></span>
                </div>
                <ul style={{ fontSize: 13.5, color: 'var(--texto-2)', lineHeight: 1.7, paddingLeft: 18, margin: '10px 0 14px' }}>
                  {p.beneficios.map((b) => <li key={b}>{b}</li>)}
                </ul>
                <button
                  className="btn btn-dorado"
                  onClick={async () => {
                    const r = await api.donations.create({ nombre: user.nombre, monto: p.precio, tipo: 'patrocinio', mensaje: p.nombre })
                    if (r.error) return mostrarToast(r.error, 'error')
                    mostrarToast(`Solicitud enviada. ${MARCA.creador} te contacta para activar tu destacado ✦`, 'ok')
                  }}
                >
                  Quiero este plan
                </button>
              </div>
            ))}
            <div className="card card-pad" style={{ fontSize: 13, color: 'var(--texto-2)', lineHeight: 1.6 }}>
              Los patrocinadores aparecen con <b>✦ dorado</b> en Inicio y Negocios. Su pago mantiene viva la app y
              evita que haya anuncios de otras marcas. Escríbenos: <b>{MARCA.contacto}</b>
            </div>
          </div>
        )}

        {/* --------- DONACIONES --------- */}
        {seccion === 'donar' && (
          <Donaciones total={totalDonado} onHecho={(t) => { setTotalDonado(t); cargar() }} />
        )}

        {/* --------- BUZON DEL VECINO --------- */}
        {seccion === 'buzon' && <BuzonVecino mensajes={misMensajes} onEnviado={() => cargar()} />}

        {/* --------- PANEL DE ROEP TECH --------- */}
        {seccion === 'mod' && esAdmin && (
          <div className="card card-pad" style={{ marginTop: 12 }}>
            <b style={{ fontSize: 15 }}>🛡️ Panel de Roep Tech</b>
            <p style={{ fontSize: 12.5, color: 'var(--texto-3)', margin: '6px 0 0', lineHeight: 1.6 }}>
              Roles: <b>admin</b> = Roep Tech · <b>moderador</b> = Presidencia, Comisiones e Iglesia (solo publican
              avisos oficiales, no moderan) · <b>vecino</b> = todos los demás.
            </p>

            <div style={{ margin: '16px 0 4px', fontSize: 13, fontWeight: 800 }}>
              🕓 Invitados por revisar ({invitadosPend.length})
            </div>
            {invitadosPend.length === 0 && (
              <p style={{ fontSize: 13, color: 'var(--texto-3)', margin: '4px 0 0' }}>
                Nada pendiente. Las publicaciones sin cuenta que pasan el filtro ya salen solas. 👍
              </p>
            )}
            {invitadosPend.map((p) => (
              <div className="admin-row" key={p.id}>
                <div className="info">
                  <b>{ICONOS_TIPO[p.tipo] || ''} {p.titulo}</b>
                  <span>
                    {p.nombre_invitado || p.author_name} · modo libre
                    {p.motivos ? ` · filtro: ${p.motivos}` : ''}
                  </span>
                </div>
                <button className="btn btn-secundario btn-mini" onClick={() => moderar(p.id, 'aprobar')}>✓ Aprobar</button>
                <button className="btn btn-peligro btn-mini" onClick={() => moderar(p.id, 'ocultar')}>✕ Ocultar</button>
              </div>
            ))}

            <div style={{ margin: '18px 0 4px', fontSize: 13, fontWeight: 800 }}>Reportes ({reportes.length})</div>
            {reportes.length === 0 && <p style={{ fontSize: 13, color: 'var(--texto-3)' }}>Sin reportes. Todo tranquilo. 👍</p>}
            {reportes.map((r) => (
              <div className="admin-row" key={r.id}>
                <div className="info">
                  <b>{r.posts?.titulo || 'Publicación eliminada'}</b>
                  <span>Motivo: {r.motivo} · {r.estado}</span>
                </div>
                <button className="btn btn-peligro btn-mini" onClick={() => moderar(r.post_id, 'ocultar')}>Ocultar</button>
                <button className="btn btn-secundario btn-mini" onClick={() => moderar(r.post_id, 'restaurar')}>Restaurar</button>
              </div>
            ))}

            <div style={{ margin: '18px 0 4px', fontSize: 13, fontWeight: 800 }}>📥 Buzón ({buzon.length})</div>
            <BuzonAdmin lista={buzon} onCambio={() => cargar()} />

            <div style={{ margin: '18px 0 4px', fontSize: 13, fontWeight: 800 }}>Negocios ({todosNegocios.length})</div>
            {todosNegocios.map((n) => (
              <div className="admin-row" key={n.id}>
                <div className="negocio-logo" style={{ width: 38, height: 38, fontSize: 18 }}>{n.emoji}</div>
                <div className="info">
                  <b>{n.nombre}</b>
                  <span>{n.rubro} · {n.es_verificado ? '✓ verificado' : 'sin verificar'}</span>
                </div>
                <button className="btn btn-secundario btn-mini" onClick={() => toggleNegocio(n, { es_verificado: !n.es_verificado })}>
                  {n.es_verificado ? 'Quitar ✓' : '✓ Verificar'}
                </button>
                <button className="btn btn-dorado btn-mini" onClick={() => toggleNegocio(n, { es_patrocinado: !n.es_patrocinado })}>
                  {n.es_patrocinado ? 'Quitar ✦' : '✦ Destacar'}
                </button>
              </div>
            ))}

            <div style={{ margin: '18px 0 4px', fontSize: 13, fontWeight: 800 }}>👥 Cuentas del pueblo</div>
            <PanelCuentas />
          </div>
        )}

        {/* --------- PREFERENCIA DE ROL (demo) --------- */}
        {modo === 'demo' && (
          <div className="card card-pad" style={{ marginTop: 14 }}>
            <b style={{ fontSize: 13.5 }}>⚙️ Modo demo · probar permisos</b>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              {['vecino', 'moderador', 'admin'].map((r) => (
                <button
                  key={r}
                  className={`chip ${user.rol === r ? 'activo' : ''}`}
                  onClick={async () => {
                    const rr = await api.auth.updateProfile({ rol: r })
                    if (rr.data) location.reload()
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="lista-opciones" style={{ marginTop: 14 }}>
          <button className="opcion" onClick={async () => { await salir(); navigate('/login') }}>
            <span className="ico">🚪</span> Cerrar sesión
            <span className="der">▸</span>
          </button>
        </div>

        {/* --------- ROEP TECH --------- */}
        <div className="roep">
          <div className="sep" />
          <div style={{ fontSize: 34, marginBottom: 6 }}>💠</div>
          <b>Creado por {MARCA.creador}</b>
          <div>{MARCA.lema}</div>
          <div style={{ marginTop: 8 }}>
            🔗 <a href={MARCA.url} target="_blank" rel="noreferrer">{MARCA.urlTexto}</a>
          </div>
          <div>
            💬 <a href={MARCA.contactoLink} target="_blank" rel="noreferrer">{MARCA.contacto}</a> · {MARCA.correo}
          </div>
          <div style={{ marginTop: 6, fontSize: 12 }}>{MARCA.redes}</div>
          <div className="sep" />
          <div>
            {MARCA.aceptaPatrocinios && <>✅ Aceptamos <b>patrocinios</b> (apareces destacado en la app)<br /></>}
            {MARCA.aceptaDonaciones && <>✅ Aceptamos <b>donaciones</b> para mantener El Pulso vivo</>}
          </div>
          <button className="btn btn-dorado btn-mini" style={{ marginTop: 12 }} onClick={() => setSeccion('patro')}>
            ✦ Quiero patrocinarme
          </button>
          <div style={{ fontSize: 11, marginTop: 16, color: 'var(--texto-3)' }}>
            El Pulso del Pueblo · © {new Date().getFullYear()} {MARCA.creador}
          </div>
        </div>
      </div>
    </>
  )
}

function FilaPref({ ico, titulo, sub, on, onChange, bloqueado }) {
  return (
    <div className="admin-row">
      <div className="info">
        <b>{ico} {titulo}</b>
        <span>{sub}</span>
      </div>
      <button
        className={`switch ${on ? 'on' : ''}`}
        onClick={() => !bloqueado && onChange(!on)}
        aria-label={titulo}
        style={bloqueado ? { opacity: 0.75, cursor: 'not-allowed' } : null}
      />
    </div>
  )
}

/* ---------- Panel de cuentas (solo Roep Tech) ---------- */
const ETIQUETAS_ROL = {
  admin: '💠 Admin (Roep Tech)',
  moderador: '🏛️ Moderador (entidad)',
  vecino: '👋 Vecino'
}
const AYUDA_ROL = {
  admin: 'Control total: revisa, verifica, patrocina y crea cuentas.',
  moderador: 'Publica avisos oficiales/urgentes (Presidencia, Comisiones, Iglesia). No modera.',
  vecino: 'Publica 1 vez al día, comenta y reacciona.'
}

function PanelCuentas() {
  const { mostrarToast } = useApp()
  const [cuentas, setCuentas] = useState([])
  const [form, setForm] = useState({ nombre: '', email: '', password: '', rol: 'vecino' })
  const [guardando, setGuardando] = useState(false)
  const [passAbierto, setPassAbierto] = useState('')
  const [passValor, setPassValor] = useState('')

  const cargar = async () => setCuentas(await api.cuentas.listar())
  useEffect(() => { cargar() }, [])

  const crear = async (e) => {
    e.preventDefault()
    setGuardando(true)
    const r = await api.cuentas.crear(form)
    setGuardando(false)
    if (r.error) return mostrarToast(r.error, 'error')
    mostrarToast(`✅ Cuenta creada: ${form.email} (${form.rol})`, 'ok')
    setForm({ nombre: '', email: '', password: '', rol: 'vecino' })
    cargar()
  }

  const cambiarRol = async (id, rol) => {
    const r = await api.cuentas.cambiarRol(id, rol)
    if (r.error) return mostrarToast(r.error, 'error')
    mostrarToast(`Rol actualizado a ${ETIQUETAS_ROL[rol]}`, 'ok')
    cargar()
  }

  const cambiarPass = async (id) => {
    if (!passValor.trim()) return mostrarToast('Escribe la contraseña nueva.', 'error')
    const r = await api.cuentas.cambiarPassword(id, passValor.trim())
    if (r.error) return mostrarToast(r.error, 'error')
    mostrarToast('Contraseña actualizada 🔑', 'ok')
    setPassValor('')
    setPassAbierto('')
    cargar()
  }

  const rolActual = cuentas.filter((c) => c.rol !== 'vecino')

  return (
    <div>
      <form onSubmit={crear} style={{ marginTop: 8 }}>
        <div className="grid-2">
          <div className="field">
            <label>Nombre *</label>
            <input className="input" required maxLength={40} value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Ej. Presidencia Municipal" />
          </div>
          <div className="field">
            <label>Rol</label>
            <select className="select" value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })}>
              {Object.entries(ETIQUETAS_ROL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label>Correo *</label>
            <input className="input" type="email" required value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="presidencia@pueblo.mx" />
          </div>
          <div className="field">
            <label>Contraseña *</label>
            <input className="input" required minLength={6} value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Mínimo 6 caracteres" />
          </div>
        </div>
        <div className="ayuda" style={{ marginBottom: 10 }}>{AYUDA_ROL[form.rol]}</div>
        <button className="btn btn-primario" disabled={guardando}>
          {guardando ? 'Creando…' : '➕ Crear cuenta'}
        </button>
      </form>

      <div style={{ margin: '16px 0 4px', fontSize: 12.5, fontWeight: 800 }}>
        Cuentas con rol ({rolActual.length})
      </div>
      {rolActual.length === 0 && (
        <p style={{ fontSize: 12.5, color: 'var(--texto-3)', margin: '4px 0 0' }}>
          Solo hay cuentas de vecinos. Crea la de Presidencia, Comisiones e Iglesia arriba.
        </p>
      )}
      {rolActual.map((c) => (
        <div key={c.id}>
          <div className="admin-row" style={{ flexWrap: 'wrap' }}>
            <div className="info" style={{ minWidth: 160, flex: 1 }}>
              <b>{ETIQUETAS_ROL[c.rol]?.split(' ')[0]} {c.nombre}</b>
              <span>{c.email}</span>
            </div>
            <select className="select" style={{ width: 'auto', padding: '6px 9px', fontSize: 12.5 }}
              value={c.rol} onChange={(e) => cambiarRol(c.id, e.target.value)}>
              {Object.entries(ETIQUETAS_ROL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <button className="btn btn-secundario btn-mini" onClick={() => setPassAbierto(passAbierto === c.id ? '' : c.id)}>
              🔑 Contraseña
            </button>
          </div>
          {passAbierto === c.id && (
            <div style={{ display: 'flex', gap: 8, marginTop: -6, marginBottom: 12 }}>
              <input className="input" style={{ flex: 1, fontSize: 13 }} placeholder={`Nueva contraseña para ${c.nombre}`}
                value={passValor} onChange={(e) => setPassValor(e.target.value)} />
              <button className="btn btn-primario btn-mini" onClick={() => cambiarPass(c.id)}>Guardar</button>
            </div>
          )}
        </div>
      ))}

      <p style={{ fontSize: 11.5, color: 'var(--texto-3)', marginTop: 12, lineHeight: 1.6 }}>
        Crea aquí las cuentas de <b>Presidencia</b>, <b>Comisiones</b>, <b>Iglesia</b> (rol moderador) y las de los
        negocios o vecinos que lo pidan. En <b>modo demo</b> las contraseñas las eliges tú; en <b>Supabase</b> la
        cuenta se crea real y la persona entra con ese correo y contraseña. Si alguien olvida su contraseña,
        cámbiala aquí mismo.
      </p>
    </div>
  )
}

/* ---------- Buzon del vecino (privado: solo el que envia lo ve) ---------- */
const ICONOS_TIPO = { venta: '🛍️', evento: '🎉', ayuda: '❤️', pregunta: '❓', aviso: '📢', empleo: '💼' }
const ICONOS_BUZON = { queja: '😟', idea: '💡', recomendacion: '⭐' }
const ESTADOS = { nuevo: '🕓 Nuevo', 'en proceso': '🔄 En proceso', resuelto: '✅ Resuelto' }

function BuzonVecino({ mensajes, onEnviado }) {
  const { mostrarToast } = useApp()
  const [tipo, setTipo] = useState('idea')
  const [titulo, setTitulo] = useState('')
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)

  const enviar = async (e) => {
    e.preventDefault()
    setEnviando(true)
    const r = await api.feedback.create({ tipo, titulo, texto })
    setEnviando(false)
    if (r.error) return mostrarToast(r.error, 'error')
    mostrarToast('Mensaje enviado a Roep Tech 📥', 'ok')
    setTitulo('')
    setTexto('')
    onEnviado()
  }

  return (
    <div style={{ marginTop: 12 }}>
      <div className="card card-pad">
        <b style={{ fontSize: 15 }}>📥 Buzón del pueblo</b>
        <p style={{ fontSize: 13, color: 'var(--texto-2)', lineHeight: 1.6, margin: '6px 0 14px' }}>
          ¿Algo no te gusta, se te ocurre una mejora o tienes una recomendación? Escríbele a Roep Tech.
          <b> Es privado</b>: solo tú y el equipo que crea la app lo vemos.
        </p>
        <form onSubmit={enviar}>
          <div className="field">
            <label>Tipo de mensaje</label>
            <select className="select" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="idea">💡 Idea</option>
              <option value="queja">😟 Queja</option>
              <option value="recomendacion">⭐ Recomendación</option>
            </select>
          </div>
          <div className="field">
            <label>Título *</label>
            <input className="input" required maxLength={80} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej. Que el mapa muestre horarios" />
          </div>
          <div className="field">
            <label>Cuéntanos *</label>
            <textarea className="textarea" required value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Describe el problema o tu idea…" />
          </div>
          <button className="btn btn-primario" disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar a Roep Tech'}</button>
        </form>
      </div>

      <div className="seccion-titulo"><h2>Tus mensajes ({mensajes.length})</h2></div>
      {mensajes.length === 0 && (
        <div className="vacio" style={{ padding: '26px 16px' }}>
          <span className="ico">📭</span>
          <b>Aún no has enviado nada</b>
          <span>Cuando respondamos verás aquí la respuesta y te avisaremos.</span>
        </div>
      )}
      {mensajes.map((m) => (
        <div key={m.id} className="card card-pad" style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
            <span className="badge-tipo" style={{ background: 'var(--verde-100)', color: 'var(--verde-700)' }}>
              {ICONOS_BUZON[m.tipo] || '📥'} {m.tipo}
            </span>
            <span className="mini-badge" style={{ background: m.estado === 'resuelto' ? '#E7F5EE' : '#FDF2E3', color: m.estado === 'resuelto' ? '#1E7A52' : '#D97706' }}>
              {ESTADOS[m.estado] || m.estado}
            </span>
          </div>
          <b style={{ fontSize: 14.5 }}>{m.titulo}</b>
          <p style={{ fontSize: 13.5, color: 'var(--texto-2)', margin: '5px 0 0', lineHeight: 1.55 }}>{m.texto}</p>
          {m.respuesta && (
            <div style={{ marginTop: 11, background: 'var(--verde-100)', borderRadius: 12, padding: '11px 13px' }}>
              <b style={{ fontSize: 12.5, color: 'var(--verde-700)' }}>💬 Respuesta de {MARCA.creador}:</b>
              <p style={{ fontSize: 13.5, margin: '5px 0 0', lineHeight: 1.55 }}>{m.respuesta}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

/* ---------- Buzon para Roep Tech ---------- */
function BuzonAdmin({ lista, onCambio }) {
  const { mostrarToast } = useApp()
  const [filtro, setFiltro] = useState('')

  const responder = async (m, respuesta, estado) => {
    if (!respuesta.trim()) return mostrarToast('Escribe una respuesta.', 'error')
    const r = await api.feedback.responder(m.id, { respuesta: respuesta.trim(), estado })
    if (r.error) return mostrarToast(r.error, 'error')
    mostrarToast('Respuesta enviada al vecino 💬', 'ok')
    onCambio()
  }

  const visibles = filtro ? lista.filter((m) => m.estado === filtro) : lista

  if (lista.length === 0) {
    return <p style={{ fontSize: 13, color: 'var(--texto-3)' }}>El buzón está vacío. 👍</p>
  }

  return (
    <div>
      <div className="chips">
        <button className={`chip ${filtro === '' ? 'activo' : ''}`} onClick={() => setFiltro('')}>Todos ({lista.length})</button>
        {Object.entries(ESTADOS).map(([k, v]) => (
          <button key={k} className={`chip ${filtro === k ? 'activo' : ''}`} onClick={() => setFiltro(k)}>
            {v} ({lista.filter((m) => m.estado === k).length})
          </button>
        ))}
      </div>
      {visibles.map((m) => (
        <ItemBuzon key={m.id} m={m} onResponder={responder} />
      ))}
    </div>
  )
}

function ItemBuzon({ m, onResponder }) {
  const [respuesta, setRespuesta] = useState(m.respuesta || '')
  return (
    <div className="admin-row" style={{ display: 'block', padding: '13px 0' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
        <span className="badge-tipo" style={{ background: 'var(--verde-100)', color: 'var(--verde-700)' }}>
          {ICONOS_BUZON[m.tipo] || '📥'} {m.tipo}
        </span>
        <span className="mini-badge" style={{ background: m.estado === 'resuelto' ? '#E7F5EE' : '#FDF2E3', color: m.estado === 'resuelto' ? '#1E7A52' : '#D97706' }}>
          {ESTADOS[m.estado] || m.estado}
        </span>
        <span style={{ fontSize: 11.5, color: 'var(--texto-3)' }}>{m.autor} · {haceCuanto(m.creado_en)}</span>
      </div>
      <b style={{ fontSize: 14.5 }}>{m.titulo}</b>
      <p style={{ fontSize: 13.5, color: 'var(--texto-2)', margin: '5px 0 9px', lineHeight: 1.55 }}>{m.texto}</p>
      <textarea
        className="textarea"
        style={{ minHeight: 60 }}
        value={respuesta}
        onChange={(e) => setRespuesta(e.target.value)}
        placeholder="Respuesta que verá solo quien lo envió…"
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
        <button className="btn btn-primario btn-mini" onClick={() => onResponder(m, respuesta, m.estado === 'nuevo' ? 'en proceso' : m.estado)}>
          💬 Responder
        </button>
        <button className="btn btn-secundario btn-mini" onClick={() => onResponder(m, respuesta || m.respuesta, 'en proceso')}>
          🔄 En proceso
        </button>
        <button className="btn btn-dorado btn-mini" onClick={() => onResponder(m, respuesta || m.respuesta, 'resuelto')}>
          ✅ Resuelto
        </button>
      </div>
    </div>
  )
}

function CupoCuenta() {
  const { quota } = useApp()
  if (!quota) return null
  return (
    <div className={`cupo ${quota.restante === 0 ? 'lleno' : ''}`}>
      <div className="puntos">
        {Array.from({ length: quota.tope }).map((_, i) => (
          <span key={i} className={`punto ${i < quota.usadas ? 'on' : ''}`} />
        ))}
      </div>
      <div className="txt">
        Cupo de hoy: {quota.usadas}/{quota.tope} · {quota.restante > 0 ? `te quedan ${quota.restante}` : 'hasta mañana 00:00'}
      </div>
    </div>
  )
}

function Donaciones({ total, onHecho }) {
  const { user, mostrarToast } = useApp()
  const [monto, setMonto] = useState(50)
  const [nombre, setNombre] = useState(user?.nombre || '')
  const [mensaje, setMensaje] = useState('')
  const [enviando, setEnviando] = useState(false)

  const enviar = async (e) => {
    e.preventDefault()
    setEnviando(true)
    const r = await api.donations.create({ nombre, monto, tipo: 'donacion', mensaje })
    setEnviando(false)
    if (r.error) return mostrarToast(r.error, 'error')
    const nuevo = await api.donations.total()
    onHecho(nuevo)
    mostrarToast('¡Gracias por apoyar a tu pueblo! 💚', 'ok')
    setMensaje('')
  }

  const pct = Math.min(100, Math.round((total / META_MENSUAL) * 100))

  return (
    <div className="card card-pad" style={{ marginTop: 12 }}>
      <b style={{ fontSize: 15 }}>💚 Mantén vivo El Pulso</b>
      <p style={{ fontSize: 13, color: 'var(--texto-2)', lineHeight: 1.6, margin: '6px 0 14px' }}>
        Esta app no tiene anuncios de otras marcas. Se sostiene con patrocinios de negocios locales y con donaciones
        de vecinos como tú.
      </p>

      <div style={{ background: 'var(--verde-100)', borderRadius: 13, padding: '13px 14px', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700 }}>
          <span>Recaudado este mes</span>
          <span style={{ color: 'var(--verde-700)' }}>${total.toLocaleString('es-MX')} / ${META_MENSUAL.toLocaleString('es-MX')}</span>
        </div>
        <div style={{ height: 9, background: '#fff', borderRadius: 99, marginTop: 9, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg,var(--verde),#3ea377)', borderRadius: 99, transition: 'width .5s' }} />
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--texto-2)', marginTop: 7 }}>{pct}% de la meta · cada peso ayuda</div>
      </div>

      <div className="chips" style={{ marginBottom: 12 }}>
        {DONACION_RAPIDA.map((d) => (
          <button key={d} className={`chip ${monto === d ? 'activo' : ''}`} onClick={() => setMonto(d)}>${d}</button>
        ))}
      </div>

      <form onSubmit={enviar}>
        <div className="field">
          <label>Otro monto (MXN)</label>
          <input className="input" type="number" min="5" value={monto} onChange={(e) => setMonto(Number(e.target.value))} />
        </div>
        <div className="field">
          <label>Tu nombre (o anónimo)</label>
          <input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Anónimo" />
        </div>
        <div className="field">
          <label>Mensaje (opcional)</label>
          <input className="input" value={mensaje} onChange={(e) => setMensaje(e.target.value)} placeholder="¡Ánimo con el pueblo!" />
        </div>
        <button className="btn btn-primario" disabled={enviando}>
          {enviando ? 'Enviando…' : `Donar $${monto}`}
        </button>
      </form>

      <p style={{ fontSize: 11.5, color: 'var(--texto-3)', marginTop: 12, lineHeight: 1.6 }}>
        💡 En modo demo la donación se registra en tu navegador. Para cobrar de verdad conecta Stripe o MercadoPago en
        <b> src/lib/api.js</b> o escríbenos a {MARCA.contacto}.
      </p>
    </div>
  )
}
