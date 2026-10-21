import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Vacio } from '../components/UI'
import { PRIORIDADES } from '../lib/tipos'
import * as api from '../lib/api'
import { useApp } from '../context/AppContext'

const CHIPS = [
  { key: '', label: 'Todas' },
  { key: 'urgente', label: '🔴 Urgentes' },
  { key: 'oficial', label: '🟢 Oficiales' },
  { key: 'servicio', label: '🔵 Servicios' },
  { key: 'comunidad', label: '⚪ Comunidad' }
]

export default function Avisos() {
  const navigate = useNavigate()
  const { user } = useApp()
  const [filtro, setFiltro] = useState('')
  const [avisos, setAvisos] = useState(null)

  useEffect(() => {
    api.posts.list({ tipo: 'aviso', limit: 60 }).then(setAvisos)
  }, [])

  const visibles = useMemo(() => {
    const arr = avisos || []
    return filtro ? arr.filter((a) => a.prioridad === filtro) : arr
  }, [avisos, filtro])

  const conteo = (k) => (avisos || []).filter((a) => a.prioridad === k).length
  const puedePublicar = !user || user.rol === 'admin' || user.rol === 'moderador'

  return (
    <>
      <div className="card card-pad" style={{ marginBottom: 14 }}>
        <b style={{ fontSize: 14.5, display: 'block', marginBottom: 6 }}>📢 Solo avisos, sin ruido</b>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--texto-2)', lineHeight: 1.6 }}>
          Aquí viven los comunicados importantes de la comunidad. Las ventas, eventos y demás viven en Inicio.
          {puedePublicar
            ? ' Tú puedes publicar aquí (tu entidad está verificada).'
            : ' Los avisos urgentes y oficiales los publican las cuentas verificadas: Presidencia, Comisiones, Iglesia y Roep Tech. Aquí no modera nadie: los reportes los revisa Roep Tech.'}
        </p>
        <button className="btn btn-secundario btn-mini" style={{ marginTop: 12 }} onClick={() => navigate('/publicar?tipo=aviso')}>
          ✏️ Publicar aviso
        </button>
      </div>

      <div className="chips">
        {CHIPS.map((c) => (
          <button key={c.key} className={`chip ${filtro === c.key ? 'activo' : ''}`} onClick={() => setFiltro(c.key)}>
            {c.label}
            {c.key && <span className="cnt"> {conteo(c.key)}</span>}
          </button>
        ))}
      </div>

      {avisos === null && <div className="cargando"><div className="spin" />Cargando avisos…</div>}

      {avisos !== null && visibles.length === 0 && (
        <Vacio ico="🔕" titulo="No hay avisos en esta categoría" texto="Cuando haya algo importante de tu pueblo, aparecerá aquí y llegarás por notificación." />
      )}

      {visibles.map((a) => {
        const pri = PRIORIDADES[a.prioridad] || PRIORIDADES.comunidad
        return (
          <div
            key={a.id}
            className="aviso-item"
            style={{ borderLeftColor: pri.color }}
            onClick={() => navigate(`/post/${a.id}`)}
          >
            <div className="aviso-head">
              <span className="badge-tipo" style={{ background: pri.bg, color: pri.color }}>
                {pri.icon} {pri.label}
              </span>
              <TypeMini tipo={a.tipo} />
            </div>
            <h3>{a.titulo}</h3>
            <p>{a.cuerpo}</p>
            <div className="pie">
              <span>✍️ {a.author_name}</span>
              {a.lugar && <span>📍 {a.lugar}</span>}
              <span>🕐 {new Date(a.creado_en).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        )
      })}
    </>
  )
}

function TypeMini({ tipo }) {
  if (tipo === 'aviso') return null
  return <span style={{ fontSize: 11.5, color: 'var(--texto-3)', fontWeight: 700 }}>+ contenido del pueblo</span>
}
