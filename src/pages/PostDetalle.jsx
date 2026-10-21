import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PostCard from '../components/PostCard'
import { Avatar, TypeBadge } from '../components/PostCard'
import { Vacio } from '../components/UI'
import { Media } from '../components/Media'
import { PRIORIDADES } from '../lib/tipos'
import { fechaLarga, haceCuanto, iniciales, restanteVigencia } from '../lib/format'
import * as api from '../lib/api'
import { useApp } from '../context/AppContext'

export default function PostDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, mostrarToast } = useApp()
  const [post, setPost] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [comentarios, setComentarios] = useState([])
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)

  const cargar = async () => {
    const [p, c] = await Promise.all([api.posts.get(id), api.comments.list(id)])
    setPost(p)
    setComentarios(c)
    setCargando(false)
  }
  useEffect(() => { cargar() }, [id])

  const comentar = async (e) => {
    e.preventDefault()
    if (!user) {
      mostrarToast('Inicia sesión para comentar. Ver todo y publicar sin cuenta es gratis.', 'error')
      return navigate('/login')
    }
    setEnviando(true)
    const r = await api.comments.add(id, texto)
    setEnviando(false)
    if (r.error) return mostrarToast(r.error, 'error')
    setTexto('')
    setComentarios([r.data, ...comentarios])
    mostrarToast('Comentario publicado', 'ok')
  }

  const eliminar = async () => {
    if (!confirm('¿Eliminar esta publicación?')) return
    const r = await api.posts.remove(id)
    if (r.error) return mostrarToast(r.error, 'error')
    mostrarToast('Publicación eliminada', 'ok')
    navigate('/')
  }

  const compartir = async () => {
    const url = window.location.href
    try {
      if (navigator.share) await navigator.share({ title: post.titulo, url })
      else {
        await navigator.clipboard.writeText(url)
        mostrarToast('Enlace copiado. Compártelo en tu comunidad.', 'ok')
      }
    } catch {}
  }

  if (cargando) return <div className="cargando"><div className="spin" />Cargando…</div>
  if (!post) return <Vacio ico="🕳️" titulo="Publicación no encontrada" texto="Puede que la hayan eliminado o moderado." />

  const pri = PRIORIDADES[post.prioridad]
  const esMia = user && post.author_id === user.id

  return (
    <>
      <button className="btn btn-fantasma btn-mini" style={{ marginBottom: 12 }} onClick={() => navigate(-1)}>
        ← Volver
      </button>

      <article className={`post ${post.destacado ? 'destacado' : ''}`}>
        <div className="post-body">
          <div className="post-head">
            <Avatar nombre={post.author_name} negocio={Boolean(post.business_id)} />
            <div className="post-autor">
              <b>{post.business_name || post.author_name}</b>
              <div className="meta">
                {haceCuanto(post.creado_en)}
                {post.comunidad ? ` · 📍 ${post.comunidad}` : ''}
              </div>
            </div>
            <TypeBadge tipo={post.tipo} />
          </div>

          {post.estado === 'pendiente' ? (
            <span className="badge-tipo" style={{ background: '#FDF2E3', color: '#D97706', marginBottom: 8, display: 'inline-flex' }}>
              🕓 En revisión de Roep Tech
            </span>
          ) : (
            post.prioridad !== 'comunidad' && pri && (
              <span className="badge-tipo" style={{ background: pri.bg, color: pri.color, marginBottom: 8, display: 'inline-flex' }}>
                {pri.icon} {pri.label}
              </span>
            )
          )}

          <h1 className="post-titulo" style={{ fontSize: 21 }}>{post.titulo}</h1>
          <p className="post-texto" style={{ fontSize: 15 }}>{post.cuerpo}</p>

          <Media lista={post.media} />

          <div className="post-extra">
            {post.motivo && <span className="pill dorado">📌 {post.motivo}</span>}
            {post.expira_en && (
              <span className={`pill ${restanteVigencia(post.expira_en) === 'vencido' ? '' : 'dorado'}`}>
                ⏳ {restanteVigencia(post.expira_en)}
              </span>
            )}
            {post.precio && <span className="pill precio">{post.precio}</span>}
            {post.salario && <span className="pill">💵 {post.salario}</span>}
            {post.modalidad && <span className="pill">🕒 {post.modalidad}</span>}
            {post.fecha_evento && <span className="pill">🗓️ {fechaLarga(post.fecha_evento)}</span>}
            {post.lugar && <span className="pill">📍 {post.lugar}</span>}
            {post.contacto && <span className="pill">📱 {post.contacto}</span>}
          </div>

          <div style={{ marginTop: 13, fontSize: 12, color: 'var(--texto-3)' }}>
            Publicado {new Date(post.creado_en).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })}
          </div>
        </div>

        <div className="post-actions">
          <button onClick={compartir}>↗️ Compartir</button>
          <button onClick={() => document.getElementById('comentario').focus()}>💬 Comentar ({comentarios.length})</button>
          {esMia && <button onClick={eliminar} style={{ color: 'var(--rojo)' }}>🗑️ Eliminar</button>}
        </div>
      </article>

      <div className="seccion-titulo"><h2>Comentarios ({comentarios.length})</h2></div>

      <form className="card card-pad" onSubmit={comentar} style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <div className="avatar" style={{ width: 34, height: 34, fontSize: 13 }}>{user ? iniciales(user.nombre) : '👤'}</div>
          <textarea
            id="comentario"
            className="textarea"
            style={{ minHeight: 66 }}
            placeholder={user ? 'Escribe un comentario respetuoso…' : 'Toca para iniciar sesión y comentar'}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onFocus={() => !user && navigate('/login')}
          />
        </div>
        <button
          className="btn btn-primario btn-mini"
          style={{ marginTop: 10, marginLeft: 'auto', display: 'flex' }}
          disabled={enviando}
          onClick={() => !user && navigate('/login')}
        >
          {enviando ? 'Enviando…' : 'Comentar'}
        </button>
      </form>

      {comentarios.length === 0 && (
        <Vacio ico="💬" titulo="Sé el primero en comentar" texto="Los vecinos suelen responder rápido a preguntas y avisos." />
      )}

      {comentarios.map((c) => (
        <div key={c.id} className="card card-pad" style={{ marginBottom: 9 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <div className="avatar" style={{ width: 32, height: 32, fontSize: 12 }}>{iniciales(c.nombre || '?')}</div>
            <div>
              <b style={{ fontSize: 13.5 }}>{c.nombre}</b>
              <span style={{ fontSize: 11.5, color: 'var(--texto-3)', marginLeft: 7 }}>{haceCuanto(c.creado_en)}</span>
              <p style={{ margin: '4px 0 0', fontSize: 14, lineHeight: 1.5, color: 'var(--texto-2)' }}>{c.texto}</p>
            </div>
          </div>
        </div>
      ))}

      <div className="seccion-titulo"><h2>Más del pueblo</h2></div>
      <Relacionados actual={post} />
    </>
  )
}

function Relacionados({ actual }) {
  const [lista, setLista] = useState([])
  useEffect(() => {
    api.posts.list({ tipo: actual.tipo, limit: 8 }).then((p) => setLista(p.filter((x) => x.id !== actual.id).slice(0, 3)))
  }, [actual])
  if (lista.length === 0) return null
  return <>{lista.map((p) => <PostCard key={p.id} post={p} />)}</>
}
