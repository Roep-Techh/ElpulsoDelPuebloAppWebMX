/* ============================================================
   MODO DEMO - datos en localStorage.
   Se usa automaticamente mientras no exista .env con Supabase.
   Mismo API que la version Supabase (src/lib/api.js)
   ============================================================ */
import { hoyKey, fechaLocal } from './format'
import { analizarTexto, validarNombrePublico, LIBRE } from './filtros'
import { fechaExpiracion, sigueVigente, VIGENCIA_DEFECTO, VIGENCIA_MAX_DIAS } from './tipos'
import { guardarBlob } from './media'

const K = {
  sesion: 'elpulso.sesion',
  usuarios: 'elpulso.usuarios',
  negocios: 'elpulso.negocios',
  posts: 'elpulso.publicaciones',
  reportes: 'elpulso.reportes',
  donaciones: 'elpulso.donaciones',
  feedback: 'elpulso.feedback',
  comunidades: 'elpulso.comunidades',
  seed: 'elpulso.seed'
}

/* En produccion (build) el almacenamiento demo queda APAGADO por completo:
   jamas se leen ni se escriben datos de prueba. Solo sirve en desarrollo. */
const PRODUCCION = import.meta.env.PROD

const leer = (k, fallback) => {
  if (PRODUCCION) return fallback
  try {
    const v = localStorage.getItem(k)
    return v ? JSON.parse(v) : fallback
  } catch {
    return fallback
  }
}
const escribir = (k, v) => {
  if (PRODUCCION) return
  localStorage.setItem(k, JSON.stringify(v))
}
const uid = () => 'id-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)

/* ---------------- Datos de ejemplo ---------------- */
function sembrar() {
  // La demo SOLO existe en desarrollo. En produccion (build) jamas se siembran
  // perfiles de prueba: si falta la base de datos, la app lo avisa y se detiene.
  if (import.meta.env.PROD) return
  if (localStorage.getItem(K.seed) === '3') return
  const ahora = Date.now()
  const min = (n) => new Date(ahora - n * 60000).toISOString()

  // Pueblo inicial de la app. En produccion esto lo da la tabla comunidades;
  // Roep Tech agrega mas pueblos desde su panel.
  const comunidades = [
    { id: 'c-san-simon', nombre: 'San Simón Atzitzintla', activa: true, creado_en: min(60 * 24 * 365) }
  ]
  const COM = 'c-san-simon'

  const usuarios = [
    { id: 'u-roep', nombre: 'Roep Tech', email: 'roep@pueblo.mx', password: 'demo1234', rol: 'admin', zona: 'Centro', comunidad_id: COM },
    { id: 'u-admin', nombre: 'Presidencia Municipal', email: 'admin@pueblo.mx', password: 'demo1234', rol: 'moderador', zona: 'Centro', comunidad_id: COM },
    { id: 'u-comisiones', nombre: 'Comisiones', email: 'comisiones@pueblo.mx', password: 'demo1234', rol: 'moderador', zona: 'Centro', comunidad_id: COM },
    { id: 'u-iglesia', nombre: 'Iglesia del Sagrado Corazón', email: 'iglesia@pueblo.mx', password: 'demo1234', rol: 'moderador', zona: 'Centro', comunidad_id: COM },
    { id: 'u-negocio', nombre: 'Doña Lupita', email: 'negocio@pueblo.mx', password: 'demo1234', rol: 'vecino', zona: 'Centro', comunidad_id: COM },
    { id: 'u-vecino', nombre: 'Carlos Hernández', email: 'vecino@pueblo.mx', password: 'demo1234', rol: 'vecino', zona: 'San Miguel', comunidad_id: COM }
  ]

  const negocios = [
    {
      id: 'n-1', owner_id: 'u-negocio', nombre: 'Tacos Doña Lupita', rubro: 'Comida',
      descripcion: 'Tacos de canasta, birria y menudo los domingos. Pedido por WhatsApp.',
      telefono: '55 1234 5678', direccion: 'Calle Hidalgo 12, Centro', lat: 19.4326, lng: -99.1332,
      horario: 'Mar a Dom · 7:00 - 16:00', emoji: '🌮', es_verificado: true, es_patrocinado: true,
      patrocinio_hasta: '2030-12-31', seguidores: 42, creado_en: min(60 * 24 * 30)
    },
    {
      id: 'n-2', owner_id: 'u-roep', nombre: 'Roep Tech', rubro: 'Servicios',
      descripcion: 'Soporte técnico, páginas web, sistemas y redes para negocios locales. Creadores de El Pulso del Pueblo.',
      telefono: '55 9876 5432', direccion: 'Av. Principal 45', lat: 19.4361, lng: -99.1351,
      horario: 'Lun a Vie · 9:00 - 18:00', emoji: '💻', es_verificado: true, es_patrocinado: false,
      patrocinio_hasta: null, seguidores: 88, creado_en: min(60 * 24 * 60)
    },
    {
      id: 'n-3', owner_id: 'u-vecino', nombre: 'Ferretería El Tornillo', rubro: 'Construcción',
      descripcion: 'Material de construcción, renta de herramientas y crédito de confianza.',
      telefono: '55 5555 1111', direccion: 'Calle Morelos 8', lat: 19.429, lng: -99.1401,
      horario: 'Lun a Sáb · 8:00 - 19:00', emoji: '🛠️', es_verificado: false, es_patrocinado: true,
      patrocinio_hasta: '2030-12-31', seguidores: 15, creado_en: min(60 * 24 * 20)
    },
    {
      id: 'n-4', owner_id: 'u-vecino', nombre: 'Consultorio Dr. Mendoza', rubro: 'Salud',
      descripcion: 'Consulta general, vacunación y chequeos. Citas por teléfono.',
      telefono: '55 2222 3333', direccion: 'Calle Zaragoza 3', lat: 19.4401, lng: -99.1281,
      horario: 'Lun a Vie · 8:00 - 14:00', emoji: '🩺', es_verificado: true, es_patrocinado: false,
      patrocinio_hasta: null, seguidores: 30, creado_en: min(60 * 24 * 100)
    }
  ]

  const posts = [
    {
      id: 'p-1', author_id: 'u-admin', author_name: 'Presidencia Municipal', business_id: null, business_name: null,
      tipo: 'aviso', prioridad: 'urgente',
      titulo: 'Corte de agua el miércoles por mantenimiento',
      cuerpo: 'El día miércoles de 8:00 AM a 6:00 PM habrá corte de agua en toda la colonia San Miguel y el Centro por mantenimiento a la red. Se recomienda almacenar agua desde el martes.',
      lugar: 'Colonia San Miguel y Centro', contacto: '55 0000 0000',
      motivo: 'Corte de agua', vigencia_dias: 2, expira_en: new Date(ahora + 86400000 * 2).toISOString(),
      estado: 'activo', destacado: false, creado_en: min(45)
    },
    {
      id: 'p-2', author_id: 'u-admin', author_name: 'Presidencia Municipal', business_id: null, business_name: null,
      tipo: 'aviso', prioridad: 'oficial',
      titulo: 'Jornada de vacunación gratuita este sábado',
      cuerpo: 'Vacunación contra influenza y COVID en el jardín principal de 9:00 a 13:00. Traer comprobante de domicilio. Eslogan: "Tu pueblo te cuida".',
      lugar: 'Jardín principal', contacto: 'presidencia@pueblo.mx',
      motivo: 'Salud / vacunación', vigencia_dias: 7, expira_en: new Date(ahora + 86400000 * 7).toISOString(),
      fecha_evento: new Date(ahora + 86400000 * 3).toISOString(),
      estado: 'activo', destacado: false, creado_en: min(180)
    },
    {
      id: 'p-3', author_id: 'u-negocio', author_name: 'Doña Lupita', business_id: 'n-1', business_name: 'Tacos Doña Lupita',
      tipo: 'venta', prioridad: 'comunidad',
      titulo: 'Combo de 12 tacos de canasta + agua · $99',
      cuerpo: 'Paquete para llevar, ideal para fiestas. Incluye salsa verde, roja y limón. Se aparta por WhatsApp el día anterior.',
      precio: '$99', contacto: '55 1234 5678',
      estado: 'activo', destacado: true, creado_en: min(90)
    },
    {
      id: 'p-4', author_id: 'u-roep', author_name: 'Roep Tech', business_id: 'n-2', business_name: 'Roep Tech',
      tipo: 'empleo', prioridad: 'comunidad',
      titulo: 'Se necesita ayudante de sistemas (medio tiempo)',
      cuerpo: 'Buscamos estudiante o técnico para apoyo en instalación de redes y mantenimiento de PCs. Horario flexible, sueldo a convenir.',
      modalidad: 'Medio tiempo', salario: '$180 / día', contacto: 'WhatsApp 55 9876 5432',
      estado: 'activo', destacado: false, creado_en: min(300)
    },
    {
      id: 'p-5', author_id: 'u-vecino', author_name: 'María Fernanda', business_id: null, business_name: null,
      tipo: 'evento', prioridad: 'comunidad',
      titulo: 'Bazar de la comunidad en la plaza principal',
      cuerpo: 'Habrá comida, artesanías, juegos para niños y rifas. Los stands son gratuitos para vecinos, solo avisar con anticipación.',
      lugar: 'Plaza principal', fecha_evento: new Date(ahora + 86400000 * 5).toISOString(),
      estado: 'activo', destacado: false, creado_en: min(420)
    },
    {
      id: 'p-6', author_id: 'u-iglesia', author_name: 'Iglesia del Sagrado Corazón', business_id: null, business_name: null,
      tipo: 'ayuda', prioridad: 'comunidad',
      titulo: 'Colecta de alimentos para 30 familias',
      cuerpo: 'Necesitamos latas, arroz, aceite y pasta. Se reciben donaciones en la parroquia de 10:00 a 18:00. También aceptamos donativo en efectivo.',
      lugar: 'Parroquia del Centro', contacto: '55 7777 8888',
      estado: 'activo', destacado: false, creado_en: min(600)
    },
    {
      id: 'p-7', author_id: 'u-vecino', author_name: 'José Ramírez', business_id: null, business_name: null,
      tipo: 'pregunta', prioridad: 'comunidad',
      titulo: '¿Alguien sabe si hay ruta de camión a la colonia nueva?',
      cuerpo: 'La de antes ya no pasa. ¿Alguien sabe si hay alguna otra opción o si han puesto una nueva?',
      estado: 'activo', destacado: false, creado_en: min(1440)
    },
    {
      id: 'p-8', author_id: 'u-negocio', author_name: 'Doña Lupita', business_id: 'n-1', business_name: 'Tacos Doña Lupita',
      tipo: 'evento', prioridad: 'comunidad',
      titulo: '¡Hoy menudo y posole desde las 7 AM!',
      cuerpo: 'Los domingos tenemos menudo rojo y posole. Llega temprano, se acaba rápido.',
      lugar: 'Calle Hidalgo 12', fecha_evento: new Date(ahora + 3600000 * 4).toISOString(),
      estado: 'activo', destacado: false, creado_en: min(20)
    },
    {
      id: 'p-9', author_id: 'u-admin', author_name: 'Presidencia Municipal', business_id: null, business_name: null,
      tipo: 'aviso', prioridad: 'servicio',
      titulo: 'Recolección de basura se mueve al lunes por feriado',
      cuerpo: 'Por el feriado la recolección de lunes pasa al martes. Favor de sacar los botes después de las 7:00 PM del domingo.',
      motivo: 'Basura / recolección', vigencia_dias: 4, expira_en: new Date(ahora + 86400000 * 4).toISOString(),
      estado: 'activo', destacado: false, creado_en: min(1440 * 2)
    },
    {
      id: 'p-10', author_id: 'u-vecino', author_name: 'Rosa Jiménez', business_id: null, business_name: null,
      tipo: 'venta', prioridad: 'comunidad',
      titulo: 'Vendo refri usado en buen estado · $1,800',
      cuerpo: 'Refrigerador de 300L, funciona perfecto, lo vendo por cambio de equipo. Se puede ver en la colonia Ampliación.',
      precio: '$1,800', contacto: '55 4444 2222',
      estado: 'activo', destacado: false, creado_en: min(1440 * 3)
    }
  ]

  // todo el contenido de la demo pertenece al pueblo inicial
  negocios.forEach((n) => { n.comunidad_id = COM })
  posts.forEach((p) => { p.comunidad_id = COM })

  escribir(K.comunidades, comunidades)
  escribir(K.usuarios, usuarios)
  escribir(K.negocios, negocios)
  escribir(K.posts, posts)
  escribir(K.reportes, [])
  escribir(K.feedback, [
    {
      id: 'f-1', autor_id: 'u-vecino', autor: 'Carlos Hernández', tipo: 'idea',
      titulo: 'Que el mapa muestre los horarios de los negocios',
      texto: 'Aparecería genial ver si el negocio está abierto antes de caminar hasta allá.',
      estado: 'nuevo', respuesta: '', creado_en: min(3000)
    },
    {
      id: 'f-2', autor_id: 'u-negocio', autor: 'Doña Lupita', tipo: 'queja',
      titulo: 'A veces no me carga la app al abrir',
      texto: 'Me pasa en el celular cuando tengo poca señal, tarda como 10 segundos.',
      estado: 'resuelto', respuesta: 'Gracias Lupita, ya optimizamos la carga inicial. Cualquier cosa avisanos.',
      creado_en: min(9000), respondido_en: min(4000)
    }
  ])
  escribir(K.donaciones, [{ id: 'd-1', nombre: 'Anónimo', monto: 200, tipo: 'donacion', mensaje: '¡Ánimo con el pueblo!', estado: 'confirmado', creado_en: min(2000) }])
  localStorage.setItem(K.seed, '3')
}

sembrar()

const clone = (o) => JSON.parse(JSON.stringify(o))
const ordenar = (arr) => [...arr].sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en))

/* ---------------- Comunidades (pueblos) ---------------- */
export const comunidades = {
  /** cualquiera puede ver la lista (es pública) */
  async listar() {
    return clone(leer(K.comunidades, []))
  },
  /** agrega un pueblo: solo Roep Tech */
  async crear(nombre) {
    if (!soyAdmin()) return { error: 'Solo Roep Tech puede agregar pueblos.' }
    nombre = String(nombre || '').trim()
    if (nombre.length < 3) return { error: 'Escribe el nombre del pueblo (mínimo 3 letras).' }
    if (nombre.length > 60) return { error: 'Ese nombre es muy largo.' }
    const arr = leer(K.comunidades, [])
    if (arr.some((c) => c.nombre.toLowerCase() === nombre.toLowerCase()))
      return { error: 'Ese pueblo ya está en la lista.' }
    const c = { id: uid(), nombre, activa: true, creado_en: new Date().toISOString() }
    arr.push(c)
    escribir(K.comunidades, arr)
    return { data: clone(c) }
  },
  /** activa o desactiva un pueblo: solo Roep Tech */
  async alternar(id, activa) {
    if (!soyAdmin()) return { error: 'Solo Roep Tech cambia pueblos.' }
    const arr = leer(K.comunidades, [])
    const i = arr.findIndex((c) => c.id === id)
    if (i < 0) return { error: 'No encontré ese pueblo.' }
    arr[i].activa = Boolean(activa)
    escribir(K.comunidades, arr)
    return { ok: true, data: clone(arr[i]) }
  },
  /** primer pueblo activo: el que se marca por defecto al registrarse */
  async primera() {
    const act = leer(K.comunidades, []).filter((c) => c.activa)
    return act.length ? clone(act[0]) : null
  },
  /** nombre legible de un pueblo por su id */
  async nombre(id) {
    if (!id) return ''
    const c = leer(K.comunidades, []).find((x) => x.id === id)
    return c ? c.nombre : ''
  }
}

/* ---------------- Auth ---------------- */
export const auth = {
  async getSession() {
    const s = leer(K.sesion, null)
    if (!s) return null
    return { ...s, comunidad: await comunidades.nombre(s.comunidad_id) }
  },
  async signIn({ email, password }) {
    const usuarios = leer(K.usuarios, [])
    const u = usuarios.find((x) => x.email.toLowerCase() === String(email).toLowerCase())
    if (!u) return { error: 'No existe una cuenta con ese correo.' }
    if (u.password !== password) return { error: 'Contraseña incorrecta.' }
    const sesion = {
      id: u.id, nombre: u.nombre, email: u.email, rol: u.rol, zona: u.zona || '',
      comunidad_id: u.comunidad_id || null, comunidad: await comunidades.nombre(u.comunidad_id)
    }
    escribir(K.sesion, sesion)
    return { data: sesion }
  },
  async signUp({ nombre, email, password, comunidad_id }) {
    const usuarios = leer(K.usuarios, [])
    if (usuarios.some((x) => x.email.toLowerCase() === String(email).toLowerCase()))
      return { error: 'Ese correo ya está registrado.' }
    // hay que decir de dónde es: si no llega pueblo, se toma el primero activo
    const act = leer(K.comunidades, []).filter((c) => c.activa)
    const elegida = act.find((c) => c.id === comunidad_id) || act[0]
    if (!elegida) return { error: 'Aún no hay ningún pueblo activo. Contacta a Roep Tech.' }
    const u = {
      id: uid(), nombre: nombre || 'Vecino', email, password, rol: 'vecino', zona: '',
      comunidad_id: elegida.id
    }
    usuarios.push(u)
    escribir(K.usuarios, usuarios)
    const sesion = {
      id: u.id, nombre: u.nombre, email: u.email, rol: u.rol, zona: '',
      comunidad_id: elegida.id, comunidad: elegida.nombre
    }
    escribir(K.sesion, sesion)
    return { data: sesion }
  },
  async signInGoogle() {
    return { error: 'En modo demo no hay Google. Crea una cuenta local o conecta Supabase (.env) para usar Google.' }
  },
  async signOut() {
    localStorage.removeItem(K.sesion)
  },
  async updateProfile(patch) {
    const sesion = leer(K.sesion, null)
    if (!sesion) return { error: 'Inicia sesión primero.' }
    const nueva = { ...sesion, ...patch }
    // si cambió el pueblo, refrescamos el nombre visible
    if ('comunidad_id' in patch) nueva.comunidad = await comunidades.nombre(patch.comunidad_id)
    escribir(K.sesion, nueva)
    const usuarios = leer(K.usuarios, [])
    const i = usuarios.findIndex((u) => u.id === sesion.id)
    if (i >= 0) {
      usuarios[i] = { ...usuarios[i], ...patch }
      escribir(K.usuarios, usuarios)
    }
    return { data: nueva }
  }
}

/* ---------------- Limites ---------------- */
export const limits = {
  async quota(userId) {
    const posts = leer(K.posts, [])
    const negocios = leer(K.negocios, [])
    const hoy = hoyKey()
    // se cuenta por FECHA LOCAL del pueblo (no por UTC) para que corte a las 00:00
    const usadas = posts.filter(
      (p) => p.author_id === userId && p.estado !== 'oculto' && fechaLocal(p.creado_en) === hoy
    ).length
    // 3 al dia solo si tiene un negocio VERIFICADO; si no, 1 al dia
    const tope = negocios.some((n) => n.owner_id === userId && n.es_verificado) ? 3 : 1
    return { usadas, tope, restante: Math.max(tope - usadas, 0) }
  }
}

/* ---------------- Modo libre (sin cuenta) ---------------- */
const DEV_KEY = 'elpulso.dispositivo'
const ULT_KEY = 'elpulso.invitado.ultima'

function dispositivoId() {
  let id = localStorage.getItem(DEV_KEY)
  if (!id) {
    id = 'dev-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
    localStorage.setItem(DEV_KEY, id)
  }
  return id
}

export const invitado = {
  id: dispositivoId,
  puedePublicar() {
    const ult = Number(localStorage.getItem(ULT_KEY) || 0)
    return Date.now() - ult >= 24 * 3600 * 1000
  },
  restante() {
    return this.puedePublicar() ? 1 : 0
  },
  tiempoRestante() {
    const ult = Number(localStorage.getItem(ULT_KEY) || 0)
    const falta = Math.max(0, ult + 24 * 3600 * 1000 - Date.now())
    const h = Math.floor(falta / 3600000)
    const m = Math.ceil((falta % 3600000) / 60000)
    if (h > 0) return `en ${h} h ${m} min`
    return `en ${m} min`
  },
  registrar() {
    localStorage.setItem(ULT_KEY, String(Date.now()))
  }
}

/* ---------------- Publicaciones ---------------- */
export const posts = {
  async list(filtros = {}) {
    const { tipo, prioridad, q, businessId, authorId, soloActivos = true, incluirVencidos = false, comunidadId, limit = 100 } = filtros
    let arr = leer(K.posts, [])
    if (soloActivos) {
      const dev = dispositivoId()
      arr = arr.filter(
        (p) =>
          p.estado === 'activo' ||
          p.estado === 'reportado' ||
          (p.estado === 'pendiente' && p.dispositivo === dev) // el invitado ve su propio post en revisión
      )
    }
    // los avisos caducan: desaparecen solos cuando pasa su vigencia
    if (!incluirVencidos) arr = arr.filter(sigueVigente)
    if (tipo) arr = arr.filter((p) => p.tipo === tipo)
    if (prioridad) arr = arr.filter((p) => p.prioridad === prioridad)
    if (businessId) arr = arr.filter((p) => p.business_id === businessId)
    if (authorId) arr = arr.filter((p) => p.author_id === authorId)
    if (comunidadId) arr = arr.filter((p) => p.comunidad_id === comunidadId)
    if (q) {
      const t = q.toLowerCase()
      arr = arr.filter((p) =>
        [p.titulo, p.cuerpo, p.author_name, p.business_name, p.lugar]
          .filter(Boolean)
          .some((s) => String(s).toLowerCase().includes(t))
      )
    }
    const nombres = {}
    leer(K.comunidades, []).forEach((c) => { nombres[c.id] = c.nombre })
    return clone(ordenar(arr).slice(0, limit)).map((p) => ({ ...p, comunidad: nombres[p.comunidad_id] || null }))
  },
  async get(id) {
    const p = leer(K.posts, []).find((x) => x.id === id)
    if (!p) return null
    // el invitado solo puede ver su propio pendiente
    if (p.estado === 'pendiente' && p.dispositivo !== dispositivoId()) return null
    const c = leer(K.comunidades, []).find((x) => x.id === p.comunidad_id)
    return clone({ ...p, comunidad: c ? c.nombre : null })
  },
  async create(payload) {
    const sesion = leer(K.sesion, null)
    const esInvitado = !sesion && Boolean(payload.invitado_nombre)
    const tipo = payload.tipo || 'venta'

    // filtros de contenido (cliente; el servidor tambien lo hace en Supabase)
    const chequeo = analizarTexto({
      titulo: payload.titulo,
      cuerpo: payload.cuerpo,
      extra: `${payload.contacto || ''} ${payload.lugar || ''}`
    })

    if (esInvitado) {
      const errNombre = validarNombrePublico(payload.invitado_nombre)
      if (errNombre) return { error: errNombre }
      if (!LIBRE.includes(tipo))
        return { error: 'Sin cuenta solo puedes publicar Venta, Evento, Ayuda o Pregunta.' }
      if (Array.isArray(payload.archivos) && payload.archivos.length)
        return { error: 'Sin cuenta no puedes subir fotos ni videos. Crea tu cuenta y súbelas.' }
      if (!invitado.puedePublicar())
        return { error: `Ya publicaste sin cuenta hoy. Vuelve ${invitado.tiempoRestante()}.`, code: 'LIMITE_DIARIO' }
    } else {
      if (!sesion) return { error: 'Inicia sesión para publicar.' }
      const q = await limits.quota(sesion.id)
      if (q.restante <= 0)
        return { error: `Límite diario alcanzado (${q.tope}/${q.tope}). Se reinicia a las 00:00.`, code: 'LIMITE_DIARIO' }
    }

    const negocios = leer(K.negocios, [])
    const mio = sesion
      ? payload.business_id
        ? negocios.find((n) => n.id === payload.business_id)
        : negocios.find((n) => n.owner_id === sesion.id)
      : null

    /* --- avisos: motivo obligatorio + vigencia (2 d a 1 mes) --- */
    let motivo = null
    let vigenciaDias = null
    let expiraEn = null
    if (tipo === 'aviso') {
      motivo = String(payload.motivo || '').trim() || (payload.motivo_otro ? String(payload.motivo_otro).trim() : '')
      if (!motivo) return { error: 'Indica el motivo del aviso (motivo obligatorio).' }
      vigenciaDias = Number(payload.vigencia_dias) || VIGENCIA_DEFECTO
      if (vigenciaDias < 2) vigenciaDias = 2
      if (vigenciaDias > VIGENCIA_MAX_DIAS) vigenciaDias = VIGENCIA_MAX_DIAS
    }

    /* --- fotos y videos: se guardan ya comprimidos --- */
    let media = []
    if (Array.isArray(payload.archivos) && payload.archivos.length) {
      if (tipo !== 'aviso') return { error: 'Las fotos y videos van en los avisos.' }
      for (const a of payload.archivos) {
        if (!a || !a.blob) continue
        const item = await guardarBlob(a.blob)
        item.nombre = a.nombre || null
        media.push(item)
      }
    }

    const creadoEn = new Date().toISOString()
    if (tipo === 'aviso') expiraEn = fechaExpiracion(creadoEn, vigenciaDias)

    /* --- comunidad (pueblo): hereda la del autor; el invitado elige --- */
    const act = leer(K.comunidades, []).filter((c) => c.activa)
    const elegida = act.find((c) => c.id === (sesion ? sesion.comunidad_id : payload.comunidad_id)) || act[0]

    const nuevo = {
      id: uid(),
      author_id: sesion ? sesion.id : null,
      author_name: sesion ? sesion.nombre : String(payload.invitado_nombre).trim(),
      nombre_invitado: esInvitado ? String(payload.invitado_nombre).trim() : null,
      modo_invitado: esInvitado,
      dispositivo: esInvitado ? dispositivoId() : null,
      business_id: mio ? mio.id : null,
      business_name: mio ? mio.nombre : null,
      comunidad_id: elegida ? elegida.id : null,
      tipo,
      prioridad: (sesion && payload.prioridad) || 'comunidad',
      titulo: String(payload.titulo || '').trim(),
      cuerpo: payload.cuerpo || '',
      precio: payload.precio || '',
      fecha_evento: payload.fecha_evento || null,
      lugar: payload.lugar || '',
      modalidad: payload.modalidad || '',
      salario: payload.salario || '',
      contacto: payload.contacto || '',
      lat: payload.lat ?? null,
      lng: payload.lng ?? null,
      motivo,
      vigencia_dias: vigenciaDias,
      expira_en: expiraEn,
      media,
      estado: chequeo.ok ? 'activo' : 'pendiente', // pasa el filtro -> al instante; no -> cola de revision
      revisado: chequeo.ok,
      motivos: chequeo.ok ? [] : chequeo.motivos,
      destacado: mio ? Boolean(mio.es_patrocinado) : false,
      creado_en: creadoEn
    }
    if (!nuevo.titulo) return { error: 'Escribe un título para tu publicación.' }

    const arr = leer(K.posts, [])
    arr.push(nuevo)
    escribir(K.posts, arr)
    if (esInvitado) invitado.registrar()

    return {
      data: clone(nuevo),
      revision: chequeo.ok ? 'publicado' : 'revision',
      motivos: chequeo.motivos,
      quota: sesion ? await limits.quota(sesion.id) : null
    }
  },
  async remove(id) {
    const arr = leer(K.posts, [])
    escribir(K.posts, arr.filter((p) => p.id !== id))
    return { ok: true }
  },
  async report(id, motivo = 'spam') {
    const sesion = leer(K.sesion, null)
    if (!sesion) return { error: 'Inicia sesión para reportar.' }
    const reportes = leer(K.reportes, [])
    if (reportes.some((r) => r.post_id === id && r.reporter_id === sesion.id))
      return { error: 'Ya reportaste esta publicación.' }
    reportes.push({ id: uid(), post_id: id, reporter_id: sesion.id, motivo, estado: 'abierto', creado_en: new Date().toISOString() })
    escribir(K.reportes, reportes)

    const total = reportes.filter((r) => r.post_id === id).length
    if (total >= 3) {
      const arr = leer(K.posts, [])
      const i = arr.findIndex((p) => p.id === id)
      if (i >= 0 && sesion.rol === 'vecino') {
        arr[i].estado = 'oculto' // auto-oculto por 3 reportes
        escribir(K.posts, arr)
      }
    }
    return { ok: true, total }
  },
  async reports() {
    return clone(leer(K.reportes, []))
  },
  async moderate(id, accion) {
    const arr = leer(K.posts, [])
    const i = arr.findIndex((p) => p.id === id)
    if (i < 0) return { error: 'No encontrada.' }
    if (accion === 'ocultar') { arr[i].estado = 'oculto'; arr[i].revisado = true }
    if (accion === 'restaurar') { arr[i].estado = 'activo'; arr[i].revisado = true }
    if (accion === 'aprobar') { arr[i].estado = 'activo'; arr[i].revisado = true; arr[i].motivos = [] }
    if (accion === 'destacar') arr[i].destacado = !arr[i].destacado
    escribir(K.posts, arr)
    return { ok: true }
  },
  /** Publicaciones que esperan revision (modo libre / marcadas por el filtro) */
  async pendientes() {
    const arr = leer(K.posts, []).filter((p) => p.estado === 'pendiente' || (p.modo_invitado && !p.revisado))
    return clone(ordenar(arr))
  }
}

/* ---------------- Negocios ---------------- */
export const businesses = {
  async list({ q, soloPatrocinados, ownerId, comunidadId } = {}) {
    let arr = leer(K.negocios, [])
    if (soloPatrocinados) arr = arr.filter((n) => n.es_patrocinado)
    if (ownerId) arr = arr.filter((n) => n.owner_id === ownerId)
    if (comunidadId) arr = arr.filter((n) => n.comunidad_id === comunidadId)
    if (q) {
      const t = q.toLowerCase()
      arr = arr.filter((n) => [n.nombre, n.rubro, n.descripcion, n.direccion].some((s) => String(s || '').toLowerCase().includes(t)))
    }
    const nombres = {}
    leer(K.comunidades, []).forEach((c) => { nombres[c.id] = c.nombre })
    return clone(arr).map((n) => ({ ...n, comunidad: nombres[n.comunidad_id] || null }))
  },
  async get(id) {
    const n = leer(K.negocios, []).find((x) => x.id === id)
    if (!n) return null
    const c = leer(K.comunidades, []).find((x) => x.id === n.comunidad_id)
    return clone({ ...n, comunidad: c ? c.nombre : null })
  },
  async create(payload) {
    const sesion = leer(K.sesion, null)
    if (!sesion) return { error: 'Inicia sesión para crear tu negocio.' }
    const existentes = leer(K.negocios, [])
    if (existentes.some((n) => n.owner_id === sesion.id && n.nombre === payload.nombre))
      return { error: 'Ya registraste ese negocio.' }
    const act = leer(K.comunidades, []).filter((c) => c.activa)
    const nuevo = {
      id: uid(),
      owner_id: sesion.id,
      // el negocio es del pueblo de su dueño
      comunidad_id: (act.find((c) => c.id === sesion.comunidad_id) || act[0] || {}).id || null,
      nombre: payload.nombre,
      rubro: payload.rubro || 'Otros',
      descripcion: payload.descripcion || '',
      telefono: payload.telefono || '',
      direccion: payload.direccion || '',
      lat: payload.lat ?? null,
      lng: payload.lng ?? null,
      horario: payload.horario || '',
      emoji: payload.emoji || '🏪',
      es_verificado: false,
      es_patrocinado: false,
      patrocinio_hasta: null,
      seguidores: 0,
      creado_en: new Date().toISOString()
    }
    if (!nuevo.nombre) return { error: 'Ponle nombre a tu negocio.' }
    existentes.push(nuevo)
    escribir(K.negocios, existentes)
    return { data: clone(nuevo) }
  },
  async setFlag(id, patch) {
    const arr = leer(K.negocios, [])
    const i = arr.findIndex((n) => n.id === id)
    if (i < 0) return { error: 'No encontrado.' }
    arr[i] = { ...arr[i], ...patch }
    escribir(K.negocios, arr)
    return { data: clone(arr[i]) }
  }
}

/* ---------------- Donaciones / patrocinios ---------------- */
export const donations = {
  async create({ nombre, monto, tipo = 'donacion', mensaje = '' }) {
    if (!monto || Number(monto) <= 0) return { error: 'Escribe un monto.' }
    const arr = leer(K.donaciones, [])
    const nuevo = {
      id: uid(),
      nombre: nombre || 'Anónimo',
      monto: Number(monto),
      tipo,
      mensaje,
      estado: 'pendiente',
      creado_en: new Date().toISOString()
    }
    arr.push(nuevo)
    escribir(K.donaciones, arr)
    return { data: clone(nuevo) }
  },
  async total() {
    const arr = leer(K.donaciones, []).filter((d) => d.estado === 'confirmado' || d.estado === 'pendiente')
    return arr.reduce((s, d) => s + Number(d.monto), 0)
  },
  async list() {
    return clone(leer(K.donaciones, []))
  }
}

/* ---------------- Comentarios ---------------- */
const K_COM = 'elpulso.comentarios'
export const comments = {
  async list(postId) {
    const all = leer(K_COM, {})
    return clone((all[postId] || []).sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en)))
  },
  async add(postId, texto) {
    const sesion = leer(K.sesion, null)
    if (!sesion) return { error: 'Inicia sesión para comentar.' }
    if (!String(texto || '').trim()) return { error: 'Escribe un comentario.' }
    const all = leer(K_COM, {})
    const nuevo = { id: uid(), post_id: postId, nombre: sesion.nombre, texto: texto.trim(), creado_en: new Date().toISOString() }
    all[postId] = [nuevo, ...(all[postId] || [])]
    escribir(K_COM, all)
    return { data: clone(nuevo) }
  }
}

/* ---------------- Buzon privado: quejas, ideas, recomendaciones ---------------- */
/* ---------------- Cuentas (solo Roep Tech) ---------------- */
const ROLES_VALIDOS = ['vecino', 'moderador', 'admin']

function soyAdmin() {
  const s = leer(K.sesion, null)
  return Boolean(s && s.rol === 'admin')
}

export const cuentas = {
  async listar() {
    if (!soyAdmin()) return []
    // jamas sale la contraseña, ni siquiera enmascarada
    const nombres = {}
    leer(K.comunidades, []).forEach((c) => { nombres[c.id] = c.nombre })
    return clone(leer(K.usuarios, [])).map((u) => ({
      id: u.id,
      nombre: u.nombre,
      email: u.email,
      rol: u.rol,
      zona: u.zona || '',
      comunidad_id: u.comunidad_id || null,
      comunidad: nombres[u.comunidad_id] || ''
    }))
  },
  async crear({ email, nombre, password, rol = 'vecino', comunidad_id }) {
    if (!soyAdmin()) return { error: 'Solo Roep Tech puede crear cuentas.' }
    email = String(email || '').trim().toLowerCase()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: 'Ese correo no es válido.' }
    if (!String(password || '').trim()) return { error: 'Escribe una contraseña para la cuenta.' }
    if (!ROLES_VALIDOS.includes(rol)) return { error: 'Rol no válido.' }
    const usuarios = leer(K.usuarios, [])
    if (usuarios.some((u) => u.email.toLowerCase() === email))
      return { error: 'Ese correo ya tiene cuenta. Si olvidó la contraseña, cámbiala desde aquí.' }
    // el pueblo de la cuenta (si no se indica, el primero activo)
    const act = leer(K.comunidades, []).filter((c) => c.activa)
    const elegida = act.find((c) => c.id === comunidad_id) || act[0]
    if (!elegida) return { error: 'Aún no hay ningún pueblo activo. Agrégalo desde el panel.' }
    const u = {
      id: uid(),
      nombre: String(nombre || '').trim() || 'Vecino',
      email,
      password: String(password),
      rol,
      zona: '',
      comunidad_id: elegida.id
    }
    usuarios.push(u)
    escribir(K.usuarios, usuarios)
    return { data: { id: u.id, nombre: u.nombre, email: u.email, rol, comunidad: elegida.nombre } }
  },
  /** mueve una cuenta a otro pueblo: solo Roep Tech */
  async cambiarComunidad(id, comunidad_id) {
    if (!soyAdmin()) return { error: 'Solo Roep Tech cambia el pueblo de una cuenta.' }
    const act = leer(K.comunidades, []).filter((c) => c.activa)
    const elegida = act.find((c) => c.id === comunidad_id)
    if (!elegida) return { error: 'No encontré ese pueblo.' }
    const usuarios = leer(K.usuarios, [])
    const u = usuarios.find((x) => x.id === id)
    if (!u) return { error: 'No encontré esa cuenta.' }
    u.comunidad_id = elegida.id
    escribir(K.usuarios, usuarios)
    const s = leer(K.sesion, null)
    if (s && s.id === id) escribir(K.sesion, { ...s, comunidad_id: elegida.id, comunidad: elegida.nombre })
    return { ok: true, data: { id, comunidad_id: elegida.id, comunidad: elegida.nombre } }
  },
  async cambiarRol(id, rol) {
    if (!soyAdmin()) return { error: 'Solo Roep Tech cambia roles.' }
    if (!ROLES_VALIDOS.includes(rol)) return { error: 'Rol no válido.' }
    const usuarios = leer(K.usuarios, [])
    const u = usuarios.find((x) => x.id === id)
    if (!u) return { error: 'No encontré esa cuenta.' }
    u.rol = rol
    escribir(K.usuarios, usuarios)
    const s = leer(K.sesion, null)
    if (s && s.id === id) escribir(K.sesion, { ...s, rol })
    return { ok: true, data: { id, rol } }
  },
  async cambiarPassword(id, password) {
    if (!soyAdmin()) return { error: 'Solo Roep Tech cambia contraseñas.' }
    if (!String(password || '').trim()) return { error: 'Escribe la nueva contraseña.' }
    const usuarios = leer(K.usuarios, [])
    const u = usuarios.find((x) => x.id === id)
    if (!u) return { error: 'No encontré esa cuenta.' }
    u.password = String(password)
    escribir(K.usuarios, usuarios)
    return { ok: true }
  }
}

export const feedback = {
  async create({ tipo = 'idea', titulo, texto }) {
    const sesion = leer(K.sesion, null)
    if (!sesion) return { error: 'Inicia sesión para enviar tu mensaje.' }
    if (!String(titulo || '').trim()) return { error: 'Ponle un título a tu mensaje.' }
    if (!String(texto || '').trim()) return { error: 'Cuéntanos un poco más.' }
    const arr = leer(K.feedback, [])
    const nuevo = {
      id: uid(),
      autor_id: sesion.id,
      autor: sesion.nombre,
      tipo,
      titulo: titulo.trim(),
      texto: texto.trim(),
      estado: 'nuevo',
      respuesta: '',
      creado_en: new Date().toISOString(),
      respondido_en: null
    }
    arr.push(nuevo)
    escribir(K.feedback, arr)
    return { data: clone(nuevo) }
  },
  /** lo que ve el vecino que lo envió */
  async mios(autorId) {
    return clone(
      leer(K.feedback, [])
        .filter((f) => f.autor_id === autorId)
        .sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en))
    )
  },
  /** lo que ven los admins (buzon completo) */
  async todos() {
    return clone(
      leer(K.feedback, []).sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en))
    )
  },
  async responder(id, { respuesta, estado }) {
    const arr = leer(K.feedback, [])
    const i = arr.findIndex((f) => f.id === id)
    if (i < 0) return { error: 'No encontrado.' }
    arr[i] = {
      ...arr[i],
      respuesta: respuesta !== undefined ? respuesta : arr[i].respuesta,
      estado: estado || arr[i].estado,
      respondido_en: new Date().toISOString()
    }
    escribir(K.feedback, arr)
    return { data: clone(arr[i]) }
  }
}

/* Cuentas de prueba del modo demo: jamas se empaquetan en produccion */
export const DEMO_LOGIN = import.meta.env.PROD
  ? []
  : [
      { label: '💠 Roep Tech · admin', email: 'roep@pueblo.mx' },
      { label: '🏛️ Presidencia · moderador', email: 'admin@pueblo.mx' },
      { label: '⛪ Iglesia · moderador', email: 'iglesia@pueblo.mx' },
      { label: '💡 Comisiones · moderador', email: 'comisiones@pueblo.mx' },
      { label: '🌮 Doña Lupita · 3/día', email: 'negocio@pueblo.mx' },
      { label: '👋 Carlos · vecino 1/día', email: 'vecino@pueblo.mx' }
    ]

/* Contraseña de las cuentas de prueba; vacía (y sin usarse) en produccion */
export const DEMO_PASSWORD = import.meta.env.PROD ? '' : 'demo1234'
