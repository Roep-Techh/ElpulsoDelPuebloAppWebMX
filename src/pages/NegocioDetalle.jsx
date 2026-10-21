import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PostCard from '../components/PostCard'
import { Vacio } from '../components/UI'
import * as api from '../lib/api'
import { useApp } from '../context/AppContext'

export default function NegocioDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, mostrarToast } = useApp()
  const [neg, setNeg] = useState(null)
  const [publicaciones, setPublicaciones] = useState(null)

  const cargar = async () => {
    const [n, p] = await Promise.all([api.businesses.get(id), api.posts.list({ businessId: id, limit: 30 })])
    setNeg(n)
    setPublicaciones(p)
  }
  useEffect(() => { cargar() }, [id])

  if (!neg) return <div className="cargando"><div className="spin" />Cargando negocio…</div>

  const esMio = user && neg.owner_id === user.id

  const pedirVerificacion = () => {
    mostrarToast('Solicitud enviada. La moderación revisará tu negocio para darte el sello ✓', 'ok')
  }

  const patrocinarse = async () => {
    const r = await api.donations.create({ nombre: neg.nombre, monto: 250, tipo: 'patrocinio', mensaje: `Patrocinio Destacado - ${neg.nombre}` })
    if (r.error) return mostrarToast(r.error, 'error')
    mostrarToast('Solicitud de patrocinio enviada. Te contactamos para confirmar y destacarte ✦', 'ok')
  }

  return (
    <>
      <button className="btn btn-fantasma btn-mini" style={{ marginBottom: 12 }} onClick={() => navigate(-1)}>← Volver</button>

      <div className="card" style={{ marginBottom: 14, border: neg.es_patrocinado ? '2px solid var(--dorado)' : 'none' }}>
        <div style={{ background: neg.es_patrocinado ? 'linear-gradient(135deg,#fffdf6,#fdf3d9)' : 'var(--verde-100)', padding: '20px 16px', textAlign: 'center' }}>
          <div className="avatar negocio grande" style={{ margin: '0 auto 10px', background: '#fff', color: 'var(--verde)' }}>
            {neg.emoji || '🏪'}
          </div>
          <h2 style={{ margin: 0, fontSize: 21 }}>{neg.nombre}</h2>
          <div style={{ fontSize: 13.5, color: 'var(--texto-2)', marginTop: 5 }}>{neg.rubro}</div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 10, flexWrap: 'wrap' }}>
            {neg.es_verificado && <span className="mini-badge verif">✓ Negocio verificado</span>}
            {neg.es_patrocinado && <span className="mini-badge spon">✦ Patrocinador destacado</span>}
            <span className="mini-badge">👥 {neg.seguidores || 0} seguidores</span>
          </div>
        </div>

        <div className="card-pad">
          {neg.descripcion && <p style={{ margin: '0 0 14px', fontSize: 14.5, lineHeight: 1.6, color: 'var(--texto-2)' }}>{neg.descripcion}</p>}

          <div className="post-extra" style={{ marginTop: 0 }}>
            {neg.horario && <span className="pill">🕒 {neg.horario}</span>}
            {neg.direccion && <span className="pill">📍 {neg.direccion}</span>}
            {neg.telefono && <span className="pill">📱 {neg.telefono}</span>}
          </div>

          <div style={{ display: 'grid', gap: 9, marginTop: 15 }}>
            {neg.telefono && (
              <a className="btn btn-primario" href={`https://wa.me/${neg.telefono.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer">
                💬 WhatsApp con {neg.nombre.split(' ')[0]}
              </a>
            )}
            <div className="grid-2" style={{ gap: 9 }}>
              <button className="btn btn-secundario" onClick={() => navigate('/mapa')}>🗺️ Ver en mapa</button>
              <button className="btn btn-dorado" onClick={patrocinarse}>✦ Patrocinarme</button>
            </div>
            {esMio && !neg.es_verificado && (
              <button className="btn btn-secundario" onClick={pedirVerificacion}>✓ Solicitar verificación</button>
            )}
            {esMio && (
              <button className="btn btn-fantasma" onClick={() => navigate('/publicar')}>
                ✏️ Publicar con este negocio ({neg.es_verificado ? '3 al día' : '1 al día hasta verificarlo'})
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="seccion-titulo">
        <h2>Publicaciones de {neg.nombre.split(' ')[0]}</h2>
        <button onClick={() => navigate('/publicar')}>+ Publicar</button>
      </div>

      {publicaciones === null && <div className="cargando"><div className="spin" />Cargando…</div>}
      {publicaciones !== null && publicaciones.length === 0 && (
        <Vacio ico="📭" titulo="Aún no publica nada" texto="Cuando publique ofertas o novedades verás aquí su cupo del día." />
      )}
      {(publicaciones || []).map((p) => <PostCard key={p.id} post={p} />)}
    </>
  )
}
