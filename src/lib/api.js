/* ============================================================
   API unica de datos.
   Si hay .env con Supabase -> usa Supabase.
   Si no                  -> modo demo con localStorage.
   Las paginas siempre llaman a este modulo.
   ============================================================ */
import { CONECTADO, supabase, CONFIG } from './supabase'
import * as demo from './demo'
import { analizarTexto, validarNombrePublico, LIBRE } from './filtros'
import { fechaExpiracion, sigueVigente, VIGENCIA_DEFECTO, VIGENCIA_MAX_DIAS } from './tipos'

export const MODO = CONECTADO ? 'supabase' : import.meta.env.PROD ? 'produccion' : 'demo'
/** true = build de produccion sin base de datos conectada (falta el .env en el hosting) */
export const SIN_CONECTAR = MODO === 'produccion'
export { CONFIG }
export { DEMO_LOGIN, DEMO_PASSWORD } from './demo'
export { invitado } from './demo'

const haySesion = async () => (await supabase.auth.getSession()).data.session

/* ---------- Auth ---------- */
export const auth = {
  async getSession() {
    if (!CONECTADO) return demo.auth.getSession()
    const { data } = await supabase.auth.getSession()
    const u = data?.session?.user
    if (!u) return null
    const { data: perfil } = await supabase.from('profiles').select('nombre, rol, zona').eq('id', u.id).single()
    return {
      id: u.id,
      nombre: perfil?.nombre || u.email.split('@')[0],
      email: u.email,
      rol: perfil?.rol || 'vecino',
      zona: perfil?.zona || ''
    }
  },
  async signIn(cred) {
    if (!CONECTADO) return demo.auth.signIn(cred)
    const { data, error } = await supabase.auth.signInWithPassword(cred)
    if (error) return { error: traducir(error.message) }
    return { data: await this.getSession() }
  },
  async signUp({ nombre, email, password }) {
    if (!CONECTADO) return demo.auth.signUp({ nombre, email, password })
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: nombre }, emailRedirectTo: CONFIG.siteUrl }
    })
    if (error) return { error: traducir(error.message) }
    if (data.user) await supabase.from('profiles').upsert({ id: data.user.id, nombre }).select().single()
    return { data: await this.getSession(), mensaje: 'Revisa tu correo para confirmar la cuenta.' }
  },
  async signInGoogle() {
    if (!CONECTADO) return demo.auth.signInGoogle()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: CONFIG.siteUrl }
    })
    return error ? { error: traducir(error.message) } : { data: true }
  },
  async signOut() {
    if (!CONECTADO) return demo.auth.signOut()
    await supabase.auth.signOut()
  },
  async updateProfile(patch) {
    if (!CONECTADO) return demo.auth.updateProfile(patch)
    const s = await haySesion()
    if (!s) return { error: 'Inicia sesión primero.' }
    const { error } = await supabase.from('profiles').update(patch).eq('id', s.user.id)
    if (error) return { error: traducir(error.message) }
    return { data: await this.getSession() }
  }
}

/* ---------- Limites ---------- */
export const limits = {
  async quota(userId) {
    if (!CONECTADO) return demo.limits.quota(userId)
    const { data, error } = await supabase.rpc('quota_restante', { p_user: userId })
    if (error) return { usadas: 0, tope: 1, restante: 1 }
    const restante = Number(data)
    return { usadas: 0, tope: restante > 1 ? 3 : 1, restante }
  }
}

/* ---------- Mapeo de filas de Supabase a formato de la app ---------- */
function mapPost(r) {
  return {
    ...r,
    author_name: r.profiles?.nombre || 'Vecino',
    business_name: r.businesses?.nombre || null
  }
}

/** Sube fotos/videos (ya comprimidos por el navegador) al bucket "media". */
async function subirMedia(archivos = []) {
  const items = []
  for (const a of archivos) {
    if (!a || !a.blob) continue
    const esVideo = (a.blob.type || '').startsWith('video/')
    const ext = esVideo ? 'webm' : (a.blob.type || '').includes('png') ? 'png' : 'jpg'
    const path = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const { error } = await supabase.storage.from('media').upload(path, a.blob, {
      contentType: a.blob.type || (esVideo ? 'video/webm' : 'image/jpeg'),
      cacheControl: '31536000'
    })
    if (error) return { error: traducir(error.message) }
    const { data } = supabase.storage.from('media').getPublicUrl(path)
    items.push({ tipo: esVideo ? 'video' : 'imagen', url: data.publicUrl, peso: a.blob.size })
  }
  return { items }
}

/** Motivo + vigencia de un aviso (2 días recomendado, máx. 1 mes). */
function datosAviso(payload) {
  if (payload.tipo !== 'aviso') return { motivo: null, vigencia_dias: null, expira_en: null }
  const motivo = String(payload.motivo || '').trim() || String(payload.motivo_otro || '').trim()
  if (!motivo) return { error: 'Indica el motivo del aviso (motivo obligatorio).' }
  let dias = Number(payload.vigencia_dias) || VIGENCIA_DEFECTO
  dias = Math.max(2, Math.min(VIGENCIA_MAX_DIAS, dias))
  return { motivo, vigencia_dias: dias, expira_en: fechaExpiracion(new Date().toISOString(), dias) }
}

/* ---------- Publicaciones ---------- */
export const posts = {
  async list(filtros = {}) {
    if (!CONECTADO) return demo.posts.list(filtros)
    const { tipo, prioridad, q, businessId, authorId, limit = 100 } = filtros
    const dev = demo.invitado.id()
    let query = supabase
      .from('posts')
      .select('*, profiles(nombre), businesses(nombre)')
      .or(`estado.eq.activo,and(estado.eq.pendiente,dispositivo_hash.eq.${dev})`)
      .order('creado_en', { ascending: false })
      .limit(limit)
    if (tipo) query = query.eq('tipo', tipo)
    if (prioridad) query = query.eq('prioridad', prioridad)
    if (businessId) query = query.eq('business_id', businessId)
    if (authorId) query = query.eq('author_id', authorId)
    if (q) query = query.or(`titulo.ilike.%${q}%,cuerpo.ilike.%${q}%`)
    const { data, error } = await query
    if (error) return []
    // los avisos caducan solos segun su vigencia
    return (data || []).map(mapPost).filter(filtros.incluirVencidos ? () => true : sigueVigente)
  },
  async get(id) {
    if (!CONECTADO) return demo.posts.get(id)
    const { data } = await supabase
      .from('posts')
      .select('*, profiles(nombre), businesses(nombre)')
      .eq('id', id)
      .maybeSingle()
    if (!data) return null
    // un pendiente solo lo ve su dispositivo
    if (data.estado === 'pendiente' && data.dispositivo_hash !== demo.invitado.id()) return null
    return mapPost(data)
  },
  async create(payload) {
    if (!CONECTADO) return demo.posts.create(payload)
    const chequeo = analizarTexto({
      titulo: payload.titulo,
      cuerpo: payload.cuerpo,
      extra: `${payload.contacto || ''} ${payload.lugar || ''}`
    })
    const s = await haySesion()
    const esInvitado = !s && Boolean(payload.invitado_nombre)

    /* ---------- MODO LIBRE: sin cuenta ---------- */
    if (esInvitado) {
      const errNombre = validarNombrePublico(payload.invitado_nombre)
      if (errNombre) return { error: errNombre }
      if (!LIBRE.includes(payload.tipo))
        return { error: 'Sin cuenta solo puedes publicar Venta, Evento, Ayuda o Pregunta.' }
      if (Array.isArray(payload.archivos) && payload.archivos.length)
        return { error: 'Sin cuenta no puedes subir fotos ni videos. Crea tu cuenta y súbelas.' }

      const { data: cupo, error: errCupo } = await supabase.rpc('invitado_puede_publicar', {
        p_dispositivo: demo.invitado.id()
      })
      if (errCupo || Number(cupo) <= 0) {
        return {
          error: `Ya publicaste sin cuenta hoy (1 al día). Vuelve en 24 h o crea tu cuenta.`,
          code: 'LIMITE_DIARIO'
        }
      }

      const { data, error } = await supabase.rpc('publicar_invitado', {
        p_dispositivo: demo.invitado.id(),
        p_nombre: String(payload.invitado_nombre).trim(),
        p_tipo: payload.tipo,
        p_titulo: String(payload.titulo || '').trim(),
        p_cuerpo: payload.cuerpo || '',
        p_precio: payload.precio || null,
        p_lugar: payload.lugar || null,
        p_contacto: payload.contacto || null,
        p_fecha_evento: payload.fecha_evento || null
      })
      if (error) return { error: traducir(error.message) }
      const pendiente = data?.estado === 'pendiente'
      return {
        data: mapPost(data || {}),
        revision: pendiente ? 'revision' : 'publicado',
        motivos: data?.motivos ? String(data.motivos).split(',') : []
      }
    }

    /* ---------- CON CUENTA ---------- */
    if (!s) return { error: 'Inicia sesión para publicar.' }

    // cupo del dia (la base de datos tambien lo bloquea por trigger)
    const { data: restante } = await supabase.rpc('quota_restante', { p_user: s.user.id })
    if (Number(restante) <= 0) {
      const { data: neg } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', s.user.id)
        .eq('es_verificado', true)
        .limit(1)
      const tope = neg?.length ? 3 : 1
      return { error: `Límite diario alcanzado (${tope}/${tope}). Se reinicia a las 00:00.`, code: 'LIMITE_DIARIO' }
    }

    let businessId = payload.business_id || null
    if (!businessId) {
      const { data: neg } = await supabase
        .from('businesses')
        .select('id, es_patrocinado')
        .eq('owner_id', s.user.id)
        .eq('es_verificado', true)
        .limit(1)
      if (neg?.length) businessId = neg[0].id
    }

    const fila = {
      author_id: s.user.id,
      business_id: businessId,
      tipo: payload.tipo,
      prioridad: payload.prioridad || 'comunidad',
      titulo: String(payload.titulo || '').trim(),
      cuerpo: payload.cuerpo || '',
      precio: payload.precio || null,
      fecha_evento: payload.fecha_evento || null,
      lugar: payload.lugar || null,
      modalidad: payload.modalidad || null,
      salario: payload.salario || null,
      contacto: payload.contacto || null,
      lat: payload.lat ?? null,
      lng: payload.lng ?? null,
      // pasa el filtro -> activo al instante; no -> cola de revision
      estado: chequeo.ok ? 'activo' : 'pendiente',
      revisado: chequeo.ok,
      motivos: chequeo.motivos.join(',')
    }
    if (!fila.titulo) return { error: 'Escribe un título para tu publicación.' }

    // avisos: motivo obligatorio + vigencia seleccionada
    const aviso = datosAviso(payload)
    if (aviso.error) return { error: aviso.error }
    Object.assign(fila, aviso)

    // fotos/videos: se suben ya comprimidos
    if (Array.isArray(payload.archivos) && payload.archivos.length) {
      if (payload.tipo !== 'aviso') return { error: 'Las fotos y videos van en los avisos.' }
      const subida = await subirMedia(payload.archivos)
      if (subida.error) return { error: `No se pudieron subir los archivos: ${subida.error}` }
      fila.media = subida.items
    }

    const { data, error } = await supabase.from('posts').insert(fila).select().single()
    if (error) return { error: traducir(error.message) }
    return {
      data: mapPost(data),
      revision: chequeo.ok ? 'publicado' : 'revision',
      motivos: chequeo.motivos
    }
  },
  async remove(id) {
    if (!CONECTADO) return demo.posts.remove(id)
    const { error } = await supabase.from('posts').delete().eq('id', id)
    return error ? { error: traducir(error.message) } : { ok: true }
  },
  async report(id, motivo = 'spam') {
    if (!CONECTADO) return demo.posts.report(id, motivo)
    const s = await haySesion()
    if (!s) return { error: 'Inicia sesión para reportar.' }
    const { error } = await supabase.from('reports').insert({ post_id: id, reporter_id: s.user.id, motivo })
    if (error) return { error: error.code === '23505' ? 'Ya reportaste esta publicación.' : traducir(error.message) }
    return { ok: true }
  },
  async reports() {
    if (!CONECTADO) return demo.posts.reports()
    const { data } = await supabase.from('reports').select('*, posts(titulo, estado)').order('creado_en', { ascending: false })
    return data || []
  },
  async moderate(id, accion) {
    if (!CONECTADO) return demo.posts.moderate(id, accion)
    const parche = {}
    if (accion === 'ocultar') { parche.estado = 'oculto'; parche.revisado = true }
    if (accion === 'restaurar') { parche.estado = 'activo'; parche.revisado = true }
    if (accion === 'aprobar') { parche.estado = 'activo'; parche.revisado = true; parche.motivos = '' }
    const { error } = await supabase.from('posts').update(parche).eq('id', id)
    return error ? { error: traducir(error.message) } : { ok: true }
  },
  /** Cola de revision del modo libre (solo Roep Tech) */
  async pendientes() {
    if (!CONECTADO) return demo.posts.pendientes()
    const { data } = await supabase
      .from('posts')
      .select('*, profiles(nombre)')
      .or('estado.eq.pendiente,and(modo_invitado.eq.true,revisado.eq.false)')
      .order('creado_en', { ascending: false })
    return (data || []).map(mapPost)
  }
}

/* ---------- Buzon privado (quejas, ideas y recomendaciones) ---------- */
export const feedback = {
  async create(payload) {
    if (!CONECTADO) return demo.feedback.create(payload)
    const s = await haySesion()
    if (!s) return { error: 'Inicia sesión para enviar tu mensaje.' }
    const { data, error } = await supabase
      .from('feedback')
      .insert({ ...payload, autor_id: s.user.id, autor: s.nombre })
      .select()
      .single()
    return error ? { error: traducir(error.message) } : { data }
  },
  async mios(autorId) {
    if (!CONECTADO) return demo.feedback.mios(autorId)
    const { data } = await supabase
      .from('feedback')
      .select('*')
      .eq('autor_id', autorId)
      .order('creado_en', { ascending: false })
    return data || []
  },
  async todos() {
    if (!CONECTADO) return demo.feedback.todos()
    const { data } = await supabase.from('feedback').select('*').order('creado_en', { ascending: false })
    return data || []
  },
  async responder(id, patch) {
    if (!CONECTADO) return demo.feedback.responder(id, patch)
    const { data, error } = await supabase
      .from('feedback')
      .update({ ...patch, respondido_en: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    return error ? { error: traducir(error.message) } : { data }
  }
}

/* ---------- Cuentas (solo Roep Tech crea y gestiona) ---------- */
export const cuentas = {
  async listar() {
    if (!CONECTADO) return demo.cuentas.listar()
    const s = await haySesion()
    if (!s) return []
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nombre, rol, zona, creado_en, auth_users:auth.users(email, created_at)')
      .order('creado_en', { ascending: false })
      .limit(300)
    if (error) return []
    return (data || []).map((p) => ({
      id: p.id,
      nombre: p.nombre,
      rol: p.rol,
      zona: p.zona || '',
      email: p.auth_users?.email || '(sin correo)',
      creado_en: p.creado_en
    }))
  },
  async crear({ email, nombre, password, rol }) {
    if (!CONECTADO) return demo.cuentas.crear({ email, nombre, password, rol })
    const { data, error } = await supabase.rpc('admin_crear_usuario', {
      p_email: email,
      p_nombre: nombre,
      p_password: password,
      p_rol: rol || 'vecino'
    })
    return error ? { error: traducir(error.message) } : { data: { id: data, email, nombre, rol: rol || 'vecino' } }
  },
  async cambiarRol(id, rol) {
    if (!CONECTADO) return demo.cuentas.cambiarRol(id, rol)
    const { error } = await supabase.rpc('admin_cambiar_rol', { p_user: id, p_rol: rol })
    return error ? { error: traducir(error.message) } : { data: { id, rol } }
  },
  async cambiarPassword(id, password) {
    if (!CONECTADO) return demo.cuentas.cambiarPassword(id, password)
    const { error } = await supabase.rpc('admin_cambiar_password', { p_user: id, p_password: password })
    return error ? { error: traducir(error.message) } : { ok: true }
  }
}

/* ---------- Negocios ---------- */
export const businesses = {
  async list({ q, soloPatrocinados, ownerId } = {}) {
    if (!CONECTADO) return demo.businesses.list({ q, soloPatrocinados, ownerId })
    let query = supabase.from('businesses').select('*').order('es_patrocinado', { ascending: false })
    if (ownerId) query = query.eq('owner_id', ownerId)
    if (soloPatrocinados) query = query.eq('es_patrocinado', true)
    const { data } = await query
    let arr = data || []
    if (q) {
      const t = q.toLowerCase()
      arr = arr.filter((n) => [n.nombre, n.rubro, n.descripcion, n.direccion].some((s) => String(s || '').toLowerCase().includes(t)))
    }
    return arr
  },
  async get(id) {
    if (!CONECTADO) return demo.businesses.get(id)
    const { data } = await supabase.from('businesses').select('*').eq('id', id).single()
    return data || null
  },
  async create(payload) {
    if (!CONECTADO) return demo.businesses.create(payload)
    const s = await haySesion()
    if (!s) return { error: 'Inicia sesión para crear tu negocio.' }
    const { data, error } = await supabase
      .from('businesses')
      .insert({ ...payload, owner_id: s.user.id })
      .select()
      .single()
    return error ? { error: traducir(error.message) } : { data }
  },
  async setFlag(id, patch) {
    if (!CONECTADO) return demo.businesses.setFlag(id, patch)
    const { data, error } = await supabase.from('businesses').update(patch).eq('id', id).select().single()
    return error ? { error: traducir(error.message) } : { data }
  }
}

/* ---------- Donaciones y patrocinios ---------- */
export const donations = {
  async create(payload) {
    if (!CONECTADO) return demo.donations.create(payload)
    const { data, error } = await supabase.from('donations').insert(payload).select().single()
    return error ? { error: traducir(error.message) } : { data }
  },
  async total() {
    if (!CONECTADO) return demo.donations.total()
    const { data } = await supabase.from('donations').select('monto')
    return (data || []).reduce((s, d) => s + Number(d.monto), 0)
  },
  async list() {
    if (!CONECTADO) return demo.donations.list()
    const { data } = await supabase.from('donations').select('*').order('creado_en', { ascending: false })
    return data || []
  }
}

/* ---------- Comentarios ---------- */
export const comments = {
  async list(postId) {
    if (!CONECTADO) return demo.comments.list(postId)
    const { data } = await supabase
      .from('comments')
      .select('*, profiles(nombre)')
      .eq('post_id', postId)
      .order('creado_en', { ascending: false })
    return (data || []).map((c) => ({ ...c, nombre: c.profiles?.nombre || 'Vecino' }))
  },
  async add(postId, texto) {
    if (!CONECTADO) return demo.comments.add(postId, texto)
    const s = await haySesion()
    if (!s) return { error: 'Inicia sesión para comentar.' }
    if (!String(texto || '').trim()) return { error: 'Escribe un comentario.' }
    const { data, error } = await supabase
      .from('comments')
      .insert({ post_id: postId, author_id: s.user.id, texto: texto.trim() })
      .select()
      .single()
    if (error) return { error: traducir(error.message) }
    return { data: { ...data, nombre: s.nombre } }
  }
}

function traducir(msg = '') {
  const m = msg.toLowerCase()
  if (m.includes('invalid login')) return 'Correo o contraseña incorrectos.'
  if (m.includes('already registered')) return 'Ese correo ya está registrado.'
  if (m.includes('password')) return 'La contraseña debe tener al menos 6 caracteres.'
  if (m.includes('limit')) return 'Límite diario alcanzado. Se reinicia a las 00:00.'
  return msg
}
