import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TIPOS, PRIORIDADES } from '../lib/tipos'
import { haceCuanto, fechaLarga, iniciales, restanteVigencia } from '../lib/format'
import { Media } from './Media'
import { useApp } from '../context/AppContext'
import * as api from '../lib/api'

export function TypeBadge({ tipo }) {
  const t = TIPOS[tipo] || TIPOS.venta
  return (
    <span className="badge-tipo" style={{ background: t.colorBg, color: t.color }}>
      {t.icon} {t.label}
    </span>
  )
}

export function Avatar({ nombre, negocio, grande, emoji }) {
  return (
    <div className={`avatar ${grande ? 'grande' : ''} ${negocio ? 'negocio' : ''}`}>
      {negocio ? emoji || '🏪' : iniciales(nombre || '?')}
    </div>
  )
}

function hash(s = '') {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

export default function PostCard({ post, alAbrir }) {
  const navigate = useNavigate()
  const { user, mostrarToast } = useApp()
  const [menu, setMenu] = useState(false)
  const [likes, setLikes] = useState(() => Number(localStorage.getItem('like:' + post.id) ?? hash(post.id) % 13))
  const [liked, setLiked] = useState(() => localStorage.getItem('liked:' + post.id) === '1')

  const t = TIPOS[post.tipo] || TIPOS.venta
  const pri = PRIORIDADES[post.prioridad]

  const toggleLike = (e) => {
    e.stopPropagation()
    if (!user) return navigate('/login')
    const nuevo = !liked
    const delta = nuevo ? 1 : -1
    setLiked(nuevo)
    setLikes((l) => l + delta)
    localStorage.setItem('liked:' + post.id, nuevo ? '1' : '0')
    localStorage.setItem('like:' + post.id, String(likes + delta))
  }

  const reportar = async (motivo) => {
    setMenu(false)
    if (!user) return navigate('/login')
    const r = await api.posts.report(post.id, motivo)
    mostrarToast(r.error || '¡Gracias! Tu reporte fue enviado a los moderadores.', r.error ? 'error' : 'ok')
  }

  const abrir = () => (alAbrir ? alAbrir() : navigate(`/post/${post.id}`))

  return (
    <article className={`post ${post.destacado ? 'destacado' : ''}`} style={{ position: 'relative' }}>
      <div className="post-body">
        <div className="post-head">
          <Avatar
            nombre={post.author_name}
            negocio={Boolean(post.business_id)}
            emoji={post.emoji}
          />
          <div className="post-autor">
            <b>
              {post.business_name || post.author_name}
              {post.destacado && <span title="Patrocinador destacado">✦</span>}
            </b>
            <div className="meta">
              {haceCuanto(post.creado_en)}
              {post.modo_invitado ? ' · sin cuenta' : ''}
              {post.comunidad ? ` · 📍 ${post.comunidad}` : ''}
              {post.lugar ? ` · ${post.lugar}` : ''}
            </div>
          </div>
          {post.estado === 'pendiente' ? (
            <span className="badge-tipo" style={{ background: '#FDF2E3', color: '#D97706' }} title="Espera de revisión de Roep Tech">
              🕓 En revisión
            </span>
          ) : (
            <TypeBadge tipo={post.tipo} />
          )}
        </div>

        {post.prioridad !== 'comunidad' && pri && (
          <span
            className="badge-tipo"
            style={{ background: pri.bg, color: pri.color, marginBottom: 8, display: 'inline-flex' }}
          >
            {pri.icon} {pri.label}
          </span>
        )}

        <h3 className="post-titulo" onClick={abrir} style={{ cursor: 'pointer' }}>
          {post.titulo}
        </h3>
        {post.cuerpo && <p className="post-texto">{post.cuerpo}</p>}

        <Media lista={post.media} />

        <div className="post-extra">
          {post.modo_invitado && <span className="pill">🌤️ Publicado sin cuenta</span>}
          {post.motivo && <span className="pill dorado">📌 {post.motivo}</span>}
          {post.expira_en && (
            <span className={`pill ${restanteVigencia(post.expira_en) === 'vencido' ? '' : 'dorado'}`}>
              ⏳ {restanteVigencia(post.expira_en)}
            </span>
          )}
          {post.precio && <span className="pill precio">{post.precio}</span>}
          {post.salario && <span className="pill">💵 {post.salario}</span>}
          {post.fecha_evento && <span className="pill">🗓️ {fechaLarga(post.fecha_evento)}</span>}
          {post.contacto && <span className="pill">📱 {post.contacto}</span>}
          {post.business_name && <span className="pill">🏪 {post.business_name}</span>}
        </div>
      </div>

      <div className="post-actions" onClick={(e) => e.stopPropagation()}>
        <button onClick={toggleLike} style={liked ? { color: 'var(--rojo)' } : null}>
          {liked ? '❤️' : '🤍'} {likes}
        </button>
        <button onClick={abrir}>💬 Comentar</button>
        <button onClick={() => setMenu(!menu)}>⚠️ Reportar</button>
      </div>

      {menu && (
        <div className="menu-report" onClick={(e) => e.stopPropagation()}>
          <button className="rojo" onClick={() => reportar('spam')}>Es spam o publicidad</button>
          <button className="rojo" onClick={() => reportar('ofensivo')}>Contenido ofensivo</button>
          <button className="rojo" onClick={() => reportar('engañoso')}>Estafa o información falsa</button>
          <button onClick={() => setMenu(false)}>Cancelar</button>
        </div>
      )}
    </article>
  )
}
