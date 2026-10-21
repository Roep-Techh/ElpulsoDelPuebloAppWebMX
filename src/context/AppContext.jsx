import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as api from '../lib/api'

const Ctx = createContext(null)
export const useApp = () => useContext(Ctx)

export function AppProvider({ children }) {
  const [user, setUser] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [toast, setToast] = useState(null)
  const [notis, setNotis] = useState([])
  const [panelAbierto, setPanelAbierto] = useState(false)
  const [quota, setQuota] = useState(null)
  const [visto, setVisto] = useState(() => Number(localStorage.getItem('elpulso.visto') || 0))

  /* ---------- sesión ---------- */
  useEffect(() => {
    let vivo = true
    api.auth.getSession().then((s) => {
      if (!vivo) return
      setUser(s)
      setCargando(false)
    })
    const off = (e) => {
      if (e.key === 'elpulso.sesion') {
        api.auth.getSession().then(setUser)
      }
    }
    window.addEventListener('storage', off)
    return () => {
      vivo = false
      window.removeEventListener('storage', off)
    }
  }, [])

  /* ---------- cupo del dia ---------- */
  const refrescarCupo = useCallback(async () => {
    if (!user) return setQuota(null)
    const q = await api.limits.quota(user.id)
    setQuota(q)
    return q
  }, [user])

  useEffect(() => {
    refrescarCupo()
  }, [refrescarCupo])

  /* ---------- notificaciones in-app ---------- */
  const refrescarNotis = useCallback(async () => {
    if (!user) return setNotis([])
    const [avisos, mias] = await Promise.all([
      api.posts.list({ tipo: 'aviso', limit: 20 }),
      api.posts.list({ authorId: user.id, limit: 20 })
    ])
    const items = []
    avisos
      .filter((p) => (p.prioridad === 'urgente' || p.prioridad === 'oficial') && new Date(p.creado_en).getTime() > visto)
      .forEach((p) =>
        items.push({
          id: 'a-' + p.id,
          ico: p.prioridad === 'urgente' ? '🔴' : '🟢',
          texto: `${p.prioridad === 'urgente' ? 'Aviso urgente' : 'Aviso oficial'}: ${p.titulo}`,
          url: `/post/${p.id}`,
          creado_en: p.creado_en
        })
      )
    mias
      .filter((p) => new Date(p.creado_en).getTime() > visto)
      .forEach((p) =>
        items.push({
          id: 'm-' + p.id,
          ico: '✅',
          texto: `Tu publicación está activa: “${p.titulo}”`,
          url: `/post/${p.id}`,
          creado_en: p.creado_en
        })
      )
    const q = await api.limits.quota(user.id)
    if (q.restante === 0)
      items.unshift({
        id: 'cupo',
        ico: '⏳',
        texto: 'Ya usaste tus publicaciones de hoy. Se renueva a las 00:00.',
        url: '/cuenta',
        creado_en: new Date().toISOString()
      })

    // respuestas del buzon (privado: solo le llega a quien lo envio)
    try {
      const fb = await api.feedback.mios(user.id)
      fb.filter((f) => f.respuesta && new Date(f.respondido_en || f.creado_en).getTime() > visto)
        .forEach((f) =>
          items.push({
            id: 'f-' + f.id,
            ico: '📥',
            texto: `Te respondieron en el buzón: “${f.titulo}”`,
            url: '/cuenta?s=buzon',
            creado_en: f.respondido_en || f.creado_en
          })
        )
    } catch {}
    setNotis(items.sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en)).slice(0, 12))
  }, [user, visto])

  useEffect(() => {
    refrescarNotis()
    const t = setInterval(refrescarNotis, 60000)
    return () => clearInterval(t)
  }, [refrescarNotis])

  const marcarLeidas = () => {
    const t = Date.now()
    localStorage.setItem('elpulso.visto', String(t))
    setVisto(t)
    setNotis([])
    setPanelAbierto(false)
  }

  /* ---------- acciones ---------- */
  const mostrarToast = useCallback((texto, tipo = 'ok') => {
    setToast({ texto, tipo })
    setTimeout(() => setToast(null), 3600)
  }, [])

  const entrar = useCallback(async (cred) => {
    const r = await api.auth.signIn(cred)
    if (r.error) return r
    setUser(r.data)
    return r
  }, [])

  const registrar = useCallback(async (datos) => {
    const r = await api.auth.signUp(datos)
    if (r.error) return r
    setUser(r.data)
    return r
  }, [])

  const salir = useCallback(async () => {
    await api.auth.signOut()
    setUser(null)
    setQuota(null)
    setNotis([])
  }, [])

  const actualizarPerfil = useCallback(async (patch) => {
    const r = await api.auth.updateProfile(patch)
    if (r.data) setUser(r.data)
    return r
  }, [])

  const valor = useMemo(
    () => ({
      user,
      cargando,
      toast,
      mostrarToast,
      entrar,
      registrar,
      salir,
      actualizarPerfil,
      quota,
      refrescarCupo,
      notis,
      panelAbierto,
      setPanelAbierto,
      marcarLeidas,
      refrescarNotis,
      modo: api.MODO
    }),
    [user, cargando, toast, mostrarToast, entrar, registrar, salir, actualizarPerfil, quota, refrescarCupo, notis, panelAbierto, marcarLeidas, refrescarNotis]
  )

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}
