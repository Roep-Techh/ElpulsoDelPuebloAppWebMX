import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Cupo } from '../components/UI'
import { TIPOS, PRIORIDADES, EMPLEO_TIPOS, MOTIVOS, VIGENCIAS, VIGENCIA_DEFECTO, VIGENCIA_MAX_DIAS } from '../lib/tipos'
import { LIBRE, requiereCuenta, validarNombrePublico } from '../lib/filtros'
import { MediaPicker } from '../components/Media'
import * as api from '../lib/api'
import { useApp } from '../context/AppContext'

const HOY = () => new Date().toISOString().slice(0, 10)

export default function Publicar() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { user, mostrarToast, refrescarCupo, refrescarNotis } = useApp()

  const esLibre = !user // modo libre: sin cuenta
  const [tipo, setTipo] = useState(params.get('tipo') || '')
  const [enviando, setEnviando] = useState(false)
  const [negocios, setNegocios] = useState([])
  const [nombreLibre, setNombreLibre] = useState(() => localStorage.getItem('elpulso.nombrePublico') || '')
  const [libreOk, setLibreOk] = useState(() => api.invitado.puedePublicar())
  const [form, setForm] = useState({
    titulo: '',
    cuerpo: '',
    precio: '',
    lugar: '',
    contacto: '',
    fecha_evento: '',
    salario: '',
    modalidad: 'Tiempo completo',
    prioridad: 'comunidad',
    business_id: '',
    motivo: MOTIVOS[0],
    motivo_otro: '',
    vigencia_dias: VIGENCIA_DEFECTO,
    // modo libre: el invitado dice de dónde es
    comunidad_id: ''
  })
  const [media, setMedia] = useState([]) // fotos/videos del aviso (ya comprimidos)

  useEffect(() => {
    if (user) api.businesses.list({ ownerId: user.id }).then(setNegocios)
    setLibreOk(api.invitado.puedePublicar())
  }, [user])

  // al cambiar de tipo se limpian los archivos adjuntos
  useEffect(() => { setMedia([]) }, [tipo])

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const conf = tipo ? TIPOS[tipo] : null
  const esAviso = tipo === 'aviso'
  const esEmpleo = tipo === 'empleo'
  const esEvento = tipo === 'evento'
  const esAyuda = tipo === 'ayuda'
  const puedeUrgente = user && (user.rol === 'admin' || user.rol === 'moderador')

  const enviar = async (e) => {
    e.preventDefault()
    if (!tipo) return

    if (esLibre) {
      const err = validarNombrePublico(nombreLibre)
      if (err) return mostrarToast(err, 'error')
      if (requiereCuenta(tipo))
        return mostrarToast(`Los ${TIPOS[tipo].label.toLowerCase()}s requieren cuenta. Elige Venta, Evento, Ayuda o Pregunta.`, 'error')
      if (!libreOk)
        return mostrarToast(`Ya publicaste sin cuenta. Vuelve ${api.invitado.tiempoRestante()} o crea tu cuenta.`, 'error')
      localStorage.setItem('elpulso.nombrePublico', nombreLibre.trim())
    }

    // avisos: motivo obligatorio (igual para Presidencia, Comisiones, Iglesia y vecinos)
    if (tipo === 'aviso') {
      const motivoTxt = form.motivo === 'Otro' ? String(form.motivo_otro || '').trim() : form.motivo
      if (!motivoTxt) return mostrarToast('Indica el motivo del aviso.', 'error')
    }

    setEnviando(true)
    const payload = {
      tipo,
      ...form,
      invitado_nombre: esLibre ? nombreLibre.trim() : undefined,
      fecha_evento: form.fecha_evento ? new Date(form.fecha_evento).toISOString() : null,
      prioridad: esAviso ? form.prioridad : 'comunidad',
      business_id: !esLibre ? form.business_id || (negocios[0] ? negocios[0].id : null) : null,
      motivo: tipo === 'aviso' ? (form.motivo === 'Otro' ? String(form.motivo_otro || '').trim() : form.motivo) : null,
      vigencia_dias: tipo === 'aviso' ? Number(form.vigencia_dias) : null,
      archivos: media.map((m) => ({ blob: m.blob, tipo: m.tipo, nombre: m.nombre }))
    }
    const r = await api.posts.create(payload)
    setEnviando(false)

    if (r.error) {
      mostrarToast(r.error, 'error')
      if (r.code === 'LIMITE_DIARIO') {
        await refrescarCupo()
        setLibreOk(api.invitado.puedePublicar())
      }
      return
    }

    if (r.revision === 'revision') {
      mostrarToast(
        `🕓 Tu publicación no pasó el filtro (${(r.motivos || []).join(', ')}). Quedó en revisión y tú la puedes ver aquí.`,
        'error'
      )
    } else if (esLibre) {
      mostrarToast('¡Publicado al instante! Tu nombre público aparece en la publicación. ✅', 'ok')
    } else {
      mostrarToast('¡Publicado! Tu comunidad ya puede verlo.', 'ok')
    }
    await Promise.all([refrescarCupo(), refrescarNotis()])
    navigate('/')
  }

  /* ================= MODO LIBRE: sin cuenta ================= */
  if (esLibre) {
    return (
      <>
        <div className="modo-demo" style={{ fontSize: 13 }}>
          🌤️ <b>Modo libre · sin cuenta.</b> Puedes ver todo y publicar <b>1 vez cada 24 h</b>. Tu nombre público
          será visible. Necesitas cuenta para avisos, empleos, comentar y reaccionar.
        </div>

        <CupoInvitado libreOk={libreOk} />

        {!tipo && (
          <>
            <div className="seccion-titulo" style={{ marginTop: 4 }}>
              <h2>¿Qué quieres publicar?</h2>
            </div>
            <div className="tipo-grid">
              {Object.entries(TIPOS).map(([key, t]) => {
                const bloqueado = requiereCuenta(key)
                return (
                  <button
                    key={key}
                    className="tipo-card"
                    style={bloqueado ? { opacity: 0.55 } : null}
                    onClick={() => {
                      if (bloqueado) return mostrarToast(`Los ${t.label.toLowerCase()}s requieren cuenta.`, 'error')
                      if (!libreOk) return mostrarToast(`Ya publicaste sin cuenta. Vuelve ${api.invitado.tiempoRestante()}.`, 'error')
                      setTipo(key)
                    }}
                  >
                    <span className="ico" style={{ background: t.colorBg }}>{bloqueado ? '🔒' : t.icon}</span>
                    <b>{t.label}</b>
                    <span>{bloqueado ? 'Requiere cuenta' : t.desc}</span>
                  </button>
                )
              })}
            </div>
            <div className="card card-pad" style={{ marginTop: 14 }}>
              <b style={{ fontSize: 14 }}>🌤️ Publicando sin cuenta</b>
              <ul style={{ fontSize: 13, color: 'var(--texto-2)', lineHeight: 1.75, paddingLeft: 18, margin: '8px 0 0' }}>
                <li><b>1 publicación cada 24 horas</b> por dispositivo.</li>
                <li><b>Tu nombre es obligatorio</b> y se muestra público.</li>
                <li>Solo <b>Venta, Evento, Ayuda y Pregunta</b>.</li>
                <li>Filtro automático: si detecta enlaces o palabras prohibidas, tu post queda <b>en revisión</b>.</li>
              </ul>
              <button className="btn btn-secundario" style={{ marginTop: 14 }} onClick={() => navigate('/login')}>
                Crear cuenta y publicar 3 veces al día con negocio
              </button>
            </div>
          </>
        )}

        {tipo && (
          <form onSubmit={enviar}>
            <div className="seccion-titulo" style={{ marginTop: 4 }}>
              <h2>{conf.icon} Nueva publicación · {conf.label}</h2>
              <button type="button" onClick={() => setTipo('')}>Cambiar</button>
            </div>
            <Formulario
              tipo={tipo}
              form={form}
              set={set}
              esLibre
              nombreLibre={nombreLibre}
              setNombreLibre={setNombreLibre}
              user={user}
              negocios={negocios}
              puedeUrgente={puedeUrgente}
              enviando={enviando}
            />
          </form>
        )}
      </>
    )
  }

  /* ================= CON CUENTA ================= */
  return (
    <>
      <Cupo />

      {!tipo && (
        <>
          <div className="seccion-titulo" style={{ marginTop: 4 }}>
            <h2>¿Qué quieres publicar?</h2>
          </div>
          <div className="tipo-grid">
            {Object.entries(TIPOS).map(([key, t]) => (
              <button key={key} className="tipo-card" onClick={() => setTipo(key)}>
                <span className="ico" style={{ background: t.colorBg }}>{t.icon}</span>
                <b>{t.label}</b>
                <span>{t.desc}</span>
              </button>
            ))}
          </div>
          <div className="card card-pad" style={{ marginTop: 14 }}>
            <b style={{ fontSize: 14 }}>📐 Reglas de la comunidad</b>
            <ul style={{ fontSize: 13, color: 'var(--texto-2)', lineHeight: 1.75, paddingLeft: 18, margin: '8px 0 0' }}>
              <li>Vecinos: <b>1 publicación al día</b>.</li>
              <li>Negocio <b>verificado</b>: <b>3 al día</b>, se reinician a las 00:00.</li>
              <li>Entidades verificadas (Presidencia, Comisiones, Iglesia): <b>avisos oficiales y urgentes</b>.</li>
              <li>Cada publicación lleva tipo obligatorio: no se mezclan avisos con ventas.</li>
              <li>Los <b>avisos</b> llevan <b>motivo</b> y <b>vigencia de 2 días a 1 mes</b> (2 días es lo recomendado para no saturar). Al terminar, el aviso desaparece solo.</li>
              <li>En los avisos puedes subir <b>fotos y videos cortos</b>: se comprimen solos en tu celular antes de subirlos.</li>
              <li>Todo pasa por filtro automático y revisión de Roep Tech.</li>
            </ul>
          </div>
        </>
      )}

      {tipo && (
        <form onSubmit={enviar}>
          <div className="seccion-titulo" style={{ marginTop: 4 }}>
            <h2>{conf.icon} Nueva publicación · {conf.label}</h2>
            <button type="button" onClick={() => setTipo('')}>Cambiar</button>
          </div>
          <Formulario
            tipo={tipo}
            form={form}
            set={set}
            esLibre={false}
            user={user}
            negocios={negocios}
            puedeUrgente={puedeUrgente}
            enviando={enviando}
            media={media}
            setMedia={setMedia}
          />
        </form>
      )}
    </>
  )
}

/* ---------- Medidor del modo libre ---------- */
function CupoInvitado({ libreOk }) {
  return (
    <div className={`cupo ${libreOk ? '' : 'lleno'}`}>
      <div className="puntos">
        <span className={`punto ${libreOk ? '' : 'on'}`} />
      </div>
      <div className="txt">
        {libreOk
          ? '1/1 publicación sin cuenta disponible · se usa cada 24 h'
          : `Ya usaste tu publicación sin cuenta · vuelve ${api.invitado.tiempoRestante()}`}
      </div>
    </div>
  )
}

/* ---------- Formulario compartido ---------- */
function Formulario({ tipo, form, set, esLibre, nombreLibre, setNombreLibre, user, negocios, puedeUrgente, enviando, media = [], setMedia }) {
  const { comunidades } = useApp()
  const conf = TIPOS[tipo]
  const esAviso = tipo === 'aviso'
  const esEvento = tipo === 'evento'
  const esEmpleo = tipo === 'empleo'
  const esAyuda = tipo === 'ayuda'

  return (
    <div className="card card-pad">
      {esLibre && (
        <div className="field">
          <label>Tu nombre público *</label>
          <input
            className="input"
            required
            maxLength={24}
            value={nombreLibre}
            onChange={(e) => setNombreLibre(e.target.value)}
            placeholder="Ej. María del Carmen"
          />
          <div className="ayuda">Obligatorio: así te verán en tu publicación. No es una cuenta.</div>
        </div>
      )}

      {esLibre && comunidades.length > 0 && (
        <div className="field">
          <label>¿De dónde eres? *</label>
          <select
            className="select"
            required
            value={form.comunidad_id || comunidades[0].id}
            onChange={set('comunidad_id')}
          >
            {comunidades.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
          <div className="ayuda">Así tu publicación aparece en la comunidad que corresponde.</div>
        </div>
      )}

      <div className="field">
        <label>Título</label>
        <input
          className="input"
          required
          maxLength={90}
          value={form.titulo}
          onChange={set('titulo')}
          placeholder={placeholders(tipo).titulo}
        />
      </div>

      <div className="field">
        <label>Descripción</label>
        <textarea className="textarea" value={form.cuerpo} onChange={set('cuerpo')} placeholder={placeholders(tipo).cuerpo} />
      </div>

      {tipo === 'venta' && (
        <div className="grid-2">
          <div className="field">
            <label>Precio</label>
            <input className="input" value={form.precio} onChange={set('precio')} placeholder="$50 o A convenir" />
          </div>
          <div className="field">
            <label>Contacto</label>
            <input className="input" value={form.contacto} onChange={set('contacto')} placeholder="WhatsApp / teléfono" />
          </div>
        </div>
      )}

      {esEvento && (
        <div className="grid-2">
          <div className="field">
            <label>Fecha y hora</label>
            <input className="input" type="datetime-local" value={form.fecha_evento} onChange={set('fecha_evento')} min={HOY()} />
          </div>
          <div className="field">
            <label>Lugar</label>
            <input className="input" value={form.lugar} onChange={set('lugar')} placeholder="Plaza principal" />
          </div>
        </div>
      )}

      {esEmpleo && !esLibre && (
        <>
          <div className="grid-2">
            <div className="field">
              <label>Tipo de trabajo</label>
              <select className="select" value={form.modalidad} onChange={set('modalidad')}>
                {EMPLEO_TIPOS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Salario / pago</label>
              <input className="input" value={form.salario} onChange={set('salario')} placeholder="$500 diario" />
            </div>
          </div>
          <div className="field">
            <label>Contacto para postular</label>
            <input className="input" value={form.contacto} onChange={set('contacto')} placeholder="WhatsApp o correo" />
          </div>
        </>
      )}

      {esAyuda && (
        <div className="field">
          <label>Cómo pueden ayudarte / donar</label>
          <input className="input" value={form.contacto} onChange={set('contacto')} placeholder="Cuenta, punto de acopio o teléfono" />
        </div>
      )}

      {esAviso && !esLibre && (
        <>
          <div className="field">
            <label>Prioridad del aviso</label>
            <select className="select" value={form.prioridad} onChange={set('prioridad')}>
              {Object.entries(PRIORIDADES).map(([k, p]) => (
                <option key={k} value={k} disabled={(k === 'urgente' || k === 'oficial') && !puedeUrgente}>
                  {p.icon} {p.label}
                  {(k === 'urgente' || k === 'oficial') && !puedeUrgente ? ' — solo entidades verificadas' : ''}
                </option>
              ))}
            </select>
            {!puedeUrgente && (
              <div className="ayuda">
                Los avisos urgentes y oficiales los publican Presidencia, Comisiones, Iglesia o Roep Tech.
              </div>
            )}
            <div className="field" style={{ marginTop: 12 }}>
              <label>Lugar afectado</label>
              <input className="input" value={form.lugar} onChange={set('lugar')} placeholder="Colonia, calle o punto de referencia" />
            </div>
          </div>

          {/* motivo obligatorio */}
          <div className="field">
            <label>Motivo del aviso *</label>
            <select className="select" value={form.motivo} onChange={set('motivo')}>
              {MOTIVOS.map((m) => <option key={m}>{m}</option>)}
            </select>
            {form.motivo === 'Otro' && (
              <input
                className="input"
                style={{ marginTop: 9 }}
                required
                maxLength={60}
                value={form.motivo_otro}
                onChange={set('motivo_otro')}
                placeholder="Escribe el motivo…"
              />
            )}
            <div className="ayuda">Obligatorio para todos: Presidencia, Comisiones, Iglesia, Roep Tech y vecinos.</div>
          </div>

          {/* vigencia recomendada */}
          <div className="field">
            <label>¿Cuánto tiempo vive tu aviso?</label>
            <div className="vigencia-grid">
              {VIGENCIAS.map((v) => (
                <button
                  key={v.dias}
                  type="button"
                  className={`vigencia-chip ${Number(form.vigencia_dias) === v.dias ? 'activo' : ''}`}
                  onClick={() => setForm({ ...form, vigencia_dias: v.dias })}
                >
                  <b>{v.label}</b>
                  {v.recomendado && <span>⭐ Recomendado</span>}
                </button>
              ))}
            </div>
            <div className="ayuda">
              {VIGENCIAS.find((v) => v.dias === Number(form.vigencia_dias))?.ayuda}{' '}
              <b>Máximo {VIGENCIA_MAX_DIAS} días.</b> Cuando termine, el aviso desaparece solo para no saturar.
            </div>
          </div>

          {/* fotos y videos, comprimidos antes de subir */}
          <MediaPicker value={media} onChange={setMedia} />
        </>
      )}

      {(tipo === 'ayuda' || tipo === 'pregunta') && (
        <div className="field">
          <label>Lugar (opcional)</label>
          <input className="input" value={form.lugar} onChange={set('lugar')} placeholder="Colonia o referencia" />
        </div>
      )}

      {!esLibre && negocios.length > 0 && (
        <div className="field">
          <label>Publicar como</label>
          <select className="select" value={form.business_id} onChange={set('business_id')}>
            <option value="">👤 {user.nombre} (cuenta personal · 1 al día)</option>
            {negocios.map((n) => (
              <option key={n.id} value={n.id}>
                {n.emoji} {n.nombre} ({n.es_verificado ? 'verificado · 3 al día' : 'sin verificar · 1 al día'})
              </option>
            ))}
          </select>
          <div className="ayuda">Al elegir tu negocio se aplica su cupo de 3 publicaciones diarias.</div>
        </div>
      )}
    </div>
  )
}

function placeholders(tipo) {
  return {
    aviso: { titulo: 'Ej. Corte de agua el miércoles…', cuerpo: 'Detalla horarios, colonias afectadas y a quién contactar.' },
    venta: { titulo: 'Ej. Mesa de madera · $1,200', cuerpo: 'Estado, tamaño, motivo de venta y si entregas a domicilio.' },
    evento: { titulo: 'Ej. Bazar de la comunidad', cuerpo: 'Qué habrá, a qué hora, quién organiza y si es gratis.' },
    empleo: { titulo: 'Ej. Se necesita mesero (tiempo completo)', cuerpo: 'Actividades, requisitos, horario y beneficios.' },
    ayuda: { titulo: 'Ej. Colecta de alimentos para 5 familias', cuerpo: 'Qué necesitas, dónde dejarlo y hasta cuándo.' },
    pregunta: { titulo: 'Ej. ¿Alguien sabe si hay ruta de camión?', cuerpo: 'Da contexto para que los vecinos te respondan rápido.' }
  }[tipo] || { titulo: '', cuerpo: '' }
}

export { Formulario }
