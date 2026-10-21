/* Prueba de humo: renderiza la app en jsdom y valida las reglas del negocio.
   Uso: npm run smoke  (no afecta a la app) */
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost:5173/',
  pretendToBeVisual: true
})

for (const k of ['window', 'document', 'navigator', 'localStorage', 'location', 'history', 'HTMLElement', 'Element', 'Node', 'CustomEvent', 'Event', 'MutationObserver', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame', 'atob', 'btoa', 'File', 'Blob']) {
  if (dom.window[k] === undefined) continue
  try {
    Object.defineProperty(globalThis, k, { value: dom.window[k], configurable: true, writable: true })
  } catch {
    try { globalThis[k] = dom.window[k] } catch {}
  }
}
globalThis.self = dom.window
globalThis.IS_REACT_ACT_ENVIRONMENT = false
dom.window.scrollTo = () => {}
globalThis.scrollTo = () => {}

const errores = []
const errorPrevio = console.error
console.error = (...a) => {
  errores.push(a.map(String).join(' '))
  errorPrevio(...a)
}
dom.window.addEventListener('error', (e) => errores.push('window.error: ' + e.message))
process.on('unhandledRejection', (e) => errores.push('unhandledRejection: ' + e))

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const { createServer } = await import('vite')
const vite = await createServer({
  configFile: 'vite.config.js',
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  logLevel: 'error'
})

let fallos = 0
const ok = (cond, msg) => {
  console.log(`${cond ? '  OK  ' : 'FALLO '} ${msg}`)
  if (!cond) fallos++
}
const sesion = (u) => globalThis.localStorage.setItem('elpulso.sesion', JSON.stringify(u))
const sinSesion = () => globalThis.localStorage.removeItem('elpulso.sesion')

/* ============================================================
   1. PERMISOS: Roep Tech manda, presidencia solo publica avisos
   ============================================================ */
const { puede } = await vite.ssrLoadModule('/src/lib/permisos.js')
console.log('\n--- Roles y permisos ---')
ok(puede('admin', 'ocultar_contenido') && puede('admin', 'verificar_negocio') && puede('admin', 'patrocinios'),
  'Roep Tech (admin) tiene control total')
ok(puede('moderador', 'avisos_urgentes'), 'Presidencia/Comisiones/Iglesia (moderador) publican avisos oficiales')
ok(!puede('moderador', 'ocultar_contenido'), 'el moderador NO modera (presidencia no tiene tiempo)')
ok(!puede('moderador', 'verificar_negocio') && !puede('moderador', 'patrocinios') && !puede('moderador', 'ver_buzon'),
  'el moderador NO verifica negocios, NO toca patrocinios ni el buzón')
ok(!puede('vecino', 'avisos_urgentes') && !puede('vecino', 'gestionar_roles'), 'el vecino no tiene permisos elevados')

/* ============================================================
   2. FILTROS DE CONTENIDO
   ============================================================ */
const { analizarTexto, validarNombrePublico, LIBRE, requiereCuenta } = await vite.ssrLoadModule('/src/lib/filtros.js')
console.log('\n--- Filtros del modo libre ---')
ok(analizarTexto({ titulo: 'Vendo mesa', cuerpo: 'Madera maciza, buen estado' }).ok, 'texto normal pasa el filtro')
ok(!analizarTexto({ titulo: 'Gana dinero rápido', cuerpo: 'Entra a www.estafa-ricos.com' }).ok, 'detecta enlaces y estafas')
ok(!analizarTexto({ titulo: 'Venta', cuerpo: 'puta oferta de bitcoin' }).ok, 'detecta palabras prohibidas')
ok(!analizarTexto({ titulo: 'VENTAVENTAVENTAVENTAVENTAVENTA', cuerpo: 'x' }).ok, 'detecta mayúsculas excesivas')
ok(validarNombrePublico('María') === null, 'nombre público válido')
ok(Boolean(validarNombrePublico('a')) || Boolean(validarNombrePublico('https://spam.com')),
  'rechaza nombres inválidos')
ok(LIBRE.join(',') === 'venta,evento,ayuda,pregunta' && requiereCuenta('aviso') && requiereCuenta('empleo'),
  'el modo libre solo publica Venta/Evento/Ayuda/Pregunta')

/* ============================================================
   3. DATOS SEMILLADOS Y CUPO DIARIO
   ============================================================ */
const tipos = await vite.ssrLoadModule('/src/lib/tipos.js')
const demo = await vite.ssrLoadModule('/src/lib/demo.js')

console.log('\n--- Cuentas de las entidades ---')
const usuarios = JSON.parse(globalThis.localStorage.getItem('elpulso.usuarios'))
const rolDe = (email) => usuarios.find((u) => u.email === email)?.rol
ok(rolDe('roep@pueblo.mx') === 'admin', 'Roep Tech queda como admin')
ok(rolDe('admin@pueblo.mx') === 'moderador', 'Presidencia queda como moderador (no admin)')
ok(rolDe('comisiones@pueblo.mx') === 'moderador', 'Comisiones queda como moderador')
ok(rolDe('iglesia@pueblo.mx') === 'moderador', 'Iglesia queda como moderador')
ok(rolDe('vecino@pueblo.mx') === 'vecino', 'el vecino queda como vecino')

console.log('\n--- Cupo diario ---')
sesion({ id: 'u-negocio', nombre: 'Doña Lupita', email: 'negocio@pueblo.mx', rol: 'vecino', zona: 'Centro' })
const q0 = await demo.limits.quota('u-negocio')
ok(q0.tope === 3, `negocio verificado tiene tope 3/dia (tope=${q0.tope})`)
const permitidas = q0.restante
let creados = 0
let errorLimite = null
for (let i = 0; i < 5; i++) {
  const r = await demo.posts.create({ tipo: 'venta', titulo: `Prueba negocio ${i}`, cuerpo: 'x' })
  if (r.error) errorLimite = r
  else creados++
}
ok(creados === permitidas, `solo publica lo que le resta hoy (${creados} de ${permitidas})`)
ok(errorLimite && errorLimite.code === 'LIMITE_DIARIO', `bloquea la siguiente con error de limite (${errorLimite?.error})`)

sesion({ id: 'u-test-vecino', nombre: 'Vecino Nuevo', email: 'nuevo@pueblo.mx', rol: 'vecino', zona: '' })
const q1 = await demo.limits.quota('u-test-vecino')
ok(q1.tope === 1 && q1.restante === 1, `vecino tiene tope 1/dia (tope=${q1.tope})`)
const v1 = await demo.posts.create({ tipo: 'pregunta', titulo: 'Prueba vecino 1', cuerpo: 'x' })
const v2 = await demo.posts.create({ tipo: 'pregunta', titulo: 'Prueba vecino 2', cuerpo: 'x' })
ok(Boolean(v1.data) && Boolean(v2.error), `vecino publica 1 y la 2da queda bloqueada (${v2.error})`)

/* ============================================================
   4. MODO LIBRE: publicar sin cuenta
   ============================================================ */
console.log('\n--- Modo libre (sin cuenta) ---')
sinSesion()
globalThis.localStorage.removeItem('elpulso.invitado.ultima')

const avisoLibre = await demo.posts.create({ tipo: 'aviso', invitado_nombre: 'Pedro', titulo: 'Aviso', cuerpo: 'x' })
ok(Boolean(avisoLibre.error) && /cuenta/.test(avisoLibre.error), `sin cuenta no publica avisos (${avisoLibre.error})`)

const nombreMalo = await demo.posts.create({ tipo: 'venta', invitado_nombre: 'x', titulo: 'Hola', cuerpo: 'x' })
ok(Boolean(nombreMalo.error), `nombre publico obligatorio (${nombreMalo.error})`)

const libre1 = await demo.posts.create({
  tipo: 'venta', invitado_nombre: 'Pedro Pérez', titulo: 'Vendo bicicleta', cuerpo: 'Como nueva, precio de estafa loco'
})
ok(Boolean(libre1.data), 'el invitado publica sin cuenta')
ok(libre1.revision === 'revision' && libre1.data.estado === 'pendiente',
  `texto con filtro va a revision (${libre1.motivos?.join(', ')})`)
ok(libre1.data.modo_invitado === true && libre1.data.author_name === 'Pedro Pérez',
  'queda registrado como modo libre con su nombre publico')

const libre2 = await demo.posts.create({ tipo: 'venta', invitado_nombre: 'Pedro Pérez', titulo: 'Otra', cuerpo: 'x' })
ok(Boolean(libre2.error) && libre2.code === 'LIMITE_DIARIO', `1 cada 24 h por dispositivo (${libre2.error})`)

const libreConFoto = await demo.posts.create({
  tipo: 'evento', invitado_nombre: 'Pedro Pérez', titulo: 'Foto', cuerpo: 'x',
  archivos: [{ blob: new Blob(['x'], { type: 'image/jpeg' }), tipo: 'imagen', nombre: 'a.jpg' }]
})
ok(Boolean(libreConFoto.error) && /fotos|videos/i.test(libreConFoto.error), `sin cuenta no sube archivos (${libreConFoto.error})`)

const pendientes = await demo.posts.pendientes()
ok(pendientes.length >= 1, `hay cola de revision para Roep Tech (${pendientes.length})`)
const ok1 = await demo.posts.moderate(libre1.data.id, 'aprobar')
ok(ok1.ok && (await demo.posts.get(libre1.data.id)).estado === 'activo', 'Roep Tech aprueba y sale publicada')

globalThis.localStorage.removeItem('elpulso.invitado.ultima')
const libre3 = await demo.posts.create({ tipo: 'evento', invitado_nombre: 'Ana Torres', titulo: 'Bazar en la plaza', cuerpo: 'Este domingo habrá comida y rifas.' })
ok(libre3.revision === 'publicado' && libre3.data.estado === 'activo', 'texto limpio se publica al instante')

/* ============================================================
   5. AVISOS: motivo obligatorio, vigencia y caducidad
   ============================================================ */
console.log('\n--- Avisos: motivo, vigencia, medios ---')
ok(tipos.VIGENCIAS.map((v) => v.dias).join(',') === '2,4,7,30', 'vigencias ofrecidas: 2, 4, 7 y 30 dias')
ok(tipos.VIGENCIAS[0].recomendado === true && tipos.VIGENCIA_DEFECTO === 2, 'por defecto y recomendado: 2 dias')
ok(tipos.VIGENCIA_MAX_DIAS === 30, 'maximo 1 mes (30 dias)')
ok(tipos.MOTIVOS.includes('Corte de agua') && tipos.MOTIVOS.includes('Otro'), 'motivos predefinidos + Otro')
ok(tipos.sigueVigente({}) === true && tipos.sigueVigente({ expira_en: null }), 'lo que no es aviso no caduca')
ok(tipos.sigueVigente({ expira_en: new Date(Date.now() + 86400000).toISOString() }) === true, 'aviso dentro de plazo sigue vivo')
ok(tipos.sigueVigente({ expira_en: new Date(Date.now() - 3600000).toISOString() }) === false, 'pasada la vigencia el aviso caduca')
ok(Math.round((new Date(tipos.fechaExpiracion(new Date().toISOString(), 2)) - Date.now()) / 86400000) === 2,
  'fechaExpiracion calcula +2 dias')

const media = await vite.ssrLoadModule('/src/lib/media.js')
ok(media.MAX_SEGUNDOS_VIDEO === 20, 'los videos se limitan a 20 segundos')
ok(media.TAM_FOTO.maxLado === 1280, 'las fotos se reducen a 1280 px')
const fakeImg = new File(['noesimagen'], 'foto.jpg', { type: 'image/jpeg' })
const salidaComp = await media.comprimirImagen(fakeImg)
ok(salidaComp instanceof File, 'comprimirImagen no revienta: si no puede comprimir devuelve el original')
const blobGuardado = await media.guardarBlob(new Blob(['foto'], { type: 'image/jpeg' }))
ok(blobGuardado && blobGuardado.tipo === 'imagen' && typeof blobGuardado.id === 'string', 'los medios quedan guardados con su id')
let urlOk = true
try { await media.urlDe(blobGuardado) } catch { urlOk = false }
ok(urlOk, 'urlDe no revienta al resolver un medio (devuelve url o null segun el entorno)')

// cuentas de entidad frescas: como no tienen posts hoy, su cupo es 1 cada una
sesion({ id: 'u-aviso-1', nombre: 'Presidencia Municipal', email: 'admin@pueblo.mx', rol: 'moderador', zona: 'Centro' })
const avisoSinMotivo = await demo.posts.create({ tipo: 'aviso', prioridad: 'oficial', titulo: 'Sin motivo', cuerpo: 'x' })
ok(Boolean(avisoSinMotivo.error) && /motivo/i.test(avisoSinMotivo.error), `el aviso exige motivo (${avisoSinMotivo.error})`)

const aviso = await demo.posts.create({
  tipo: 'aviso', prioridad: 'oficial', motivo: 'Corte de agua', vigencia_dias: 7,
  titulo: 'Corte mañana', cuerpo: 'De 9 a 12 en el Centro.'
})
ok(Boolean(aviso.data), 'el aviso con motivo se publica')
ok(aviso.data.motivo === 'Corte de agua', 'queda guardado el motivo del aviso')
ok(aviso.data.vigencia_dias === 7, 'respeta la vigencia elegida (7 dias)')
const diasRestantes = (new Date(aviso.data.expira_en) - Date.now()) / 86400000
ok(diasRestantes > 6.9 && diasRestantes < 7.1, `queda registrado cuando caduca (${diasRestantes.toFixed(2)} dias)`)

sesion({ id: 'u-aviso-2', nombre: 'Comisiones', email: 'comisiones@pueblo.mx', rol: 'moderador', zona: 'Centro' })
const avisoLargo = await demo.posts.create({
  tipo: 'aviso', motivo: 'Evento oficial', vigencia_dias: 90, titulo: 'Muy largo', cuerpo: 'x'
})
ok(avisoLargo.data && avisoLargo.data.vigencia_dias === 30, `la vigencia se recorta al maximo de 1 mes (${avisoLargo.data?.vigencia_dias})`)
sesion({ id: 'u-aviso-3', nombre: 'Iglesia', email: 'iglesia@pueblo.mx', rol: 'moderador', zona: 'Centro' })
const avisoDefecto = await demo.posts.create({
  tipo: 'aviso', motivo: 'Seguridad', titulo: 'Sin elegir vigencia', cuerpo: 'x'
})
ok(avisoDefecto.data && avisoDefecto.data.vigencia_dias === 2, 'si no elige, vive 2 dias por defecto')
ok(Array.isArray(avisoDefecto.data.media), 'los avisos guardan su lista de medios')

// caducidad en el feed
const arr = JSON.parse(globalThis.localStorage.getItem('elpulso.publicaciones'))
arr.find((p) => p.id === aviso.data.id).expira_en = new Date(Date.now() - 3600000).toISOString()
globalThis.localStorage.setItem('elpulso.publicaciones', JSON.stringify(arr))
const feed = await demo.posts.list({})
ok(!feed.some((p) => p.id === aviso.data.id), 'el aviso caducado desaparece del feed solo')
ok(feed.some((p) => p.tipo === 'aviso'), 'los demas avisos vigentes siguen en el feed')
const feedPropio = await demo.posts.list({ authorId: 'u-aviso-1', incluirVencidos: true })
ok(feedPropio.some((p) => p.id === aviso.data.id), 'su autor si lo ve en su cuenta (para eliminarlo o verlo vencido)')
ok(!feed.some((p) => p.expira_en && new Date(p.expira_en) < new Date()), 'nada vencido se cuela en el feed')

/* ============================================================
   6. CUENTAS: solo Roep Tech crea y gestiona
   ============================================================ */
console.log('\n--- Cuentas desde el panel ---')
sinSesion()
const sinCuenta = await demo.cuentas.crear({ email: 'nuevo@x.mx', nombre: 'Nuevo', password: '123456', rol: 'vecino' })
ok(Boolean(sinCuenta.error), `sin sesión no se crea ninguna cuenta (${sinCuenta.error})`)
sesion({ id: 'u-vecino', nombre: 'Carlos', email: 'vecino@pueblo.mx', rol: 'vecino', zona: '' })
const comoVecino = await demo.cuentas.crear({ email: 'nuevo@x.mx', nombre: 'Nuevo', password: '123456', rol: 'vecino' })
ok(Boolean(comoVecino.error), `un vecino no crea cuentas (${comoVecino.error})`)
ok((await demo.cuentas.listar()).length === 0, 'un vecino no ve la lista de cuentas')

sesion({ id: 'u-roep', nombre: 'Roep Tech', email: 'roep@pueblo.mx', rol: 'admin', zona: '' })
const creada = await demo.cuentas.crear({ email: 'presidencia@pueblo.mx', nombre: 'Presidencia', password: 'pueblo2024', rol: 'moderador' })
ok(Boolean(creada.data) && creada.data.rol === 'moderador', 'Roep Tech crea la cuenta de Presidencia como moderador')
const listaCuentas = await demo.cuentas.listar()
ok(listaCuentas.length >= 7 && !('password' in (listaCuentas[0] || {})), 'Roep Tech ve todas las cuentas sin contraseñas')
const dup = await demo.cuentas.crear({ email: 'presidencia@pueblo.mx', nombre: 'Otra', password: 'x', rol: 'vecino' })
ok(Boolean(dup.error), `no se duplica el correo (${dup.error})`)
const correoMalo = await demo.cuentas.crear({ email: 'esto-no-es-correo', nombre: 'X', password: 'x', rol: 'vecino' })
ok(Boolean(correoMalo.error), `rechaza correos inválidos (${correoMalo.error})`)
const rolMalo = await demo.cuentas.cambiarRol(creada.data.id, 'superdios')
ok(Boolean(rolMalo.error), `rechaza roles inventados (${rolMalo.error})`)
const okRol = await demo.cuentas.cambiarRol(creada.data.id, 'vecino')
ok(okRol.ok, 'Roep Tech puede cambiar un rol a vecino')
const nuevaPass = await demo.cuentas.cambiarPassword(creada.data.id, 'otraclave')
ok(Boolean(nuevaPass.ok), 'Roep Tech puede restablecer una contraseña')
const entra = await demo.auth.signIn({ email: 'presidencia@pueblo.mx', password: 'otraclave' })
ok(Boolean(entra.data), 'la persona ya entra con la contraseña nueva')

/* ============================================================
   7. BUZON PRIVADO
   ============================================================ */
console.log('\n--- Buzón de quejas, ideas y recomendaciones ---')
sesion({ id: 'u-vecino', nombre: 'Carlos Hernández', email: 'vecino@pueblo.mx', rol: 'vecino', zona: 'San Miguel' })
const enviado = await demo.feedback.create({ tipo: 'idea', titulo: 'Que el mapa muestre horarios', texto: 'Estaría genial.' })
ok(Boolean(enviado.data), 'el vecino envía su idea')
const mios = await demo.feedback.mios('u-vecino')
ok(mios.some((m) => m.id === enviado.data.id), 'el autor ve sus propios mensajes')
const todos = await demo.feedback.todos()
ok(todos.length >= 3, `el buzón de Roep Tech ve todo (${todos.length} mensajes)`)
await demo.feedback.responder(enviado.data.id, { respuesta: 'Buena idea, la evaluamos.', estado: 'en proceso' })
const mios2 = await demo.feedback.mios('u-vecino')
const respondido = mios2.find((m) => m.id === enviado.data.id)
ok(respondido?.respuesta && respondido.estado === 'en proceso', 'el autor ve la respuesta y el estado')

/* ============================================================
   7. RENDER DE LA APP (con sesion)
   ============================================================ */
console.log('\n--- Render de la app ---')
sesion({ id: 'u-negocio', nombre: 'Doña Lupita', email: 'negocio@pueblo.mx', rol: 'vecino', zona: 'Centro' })
const { default: App } = await vite.ssrLoadModule('/src/App.jsx')
const React = (await import('react')).default
const { createRoot } = await import('react-dom/client')

const cont = document.getElementById('root')
const root = createRoot(cont)
root.render(React.createElement(App))
await sleep(1200)

const texto = cont.textContent || ''
ok(texto.length > 200, `la app renderiza contenido (${texto.length} caracteres)`)
ok(texto.includes('El Pulso del Pueblo'), 'muestra el nombre El Pulso del Pueblo')
ok(/Inicio/.test(texto) && /Negocios/.test(texto) && /Publicar/.test(texto) && /Avisos/.test(texto) && /Cuenta/.test(texto),
  'muestra las 5 secciones de la navegacion')
ok(/urgente|Urgente/i.test(texto), 'muestra el aviso urgente destacado')
ok(/Patrocinador/i.test(texto), 'muestra el carrusel de patrocinadores')
ok(/Roep Tech/.test(texto), 'muestra el credito de Roep Tech')
ok(/📌/.test(texto), 'el aviso muestra su motivo')

const erroresReact = errores.filter((e) => e.includes('at ') || e.includes('Error'))
ok(erroresReact.length === 0, `sin errores de React (${erroresReact.length})`)
if (erroresReact.length) erroresReact.slice(0, 3).forEach((e) => console.log('    ->', e.slice(0, 400)))

const rutas = [
  ['/negocios', /Directorio del pueblo|Trabajo local/, 'Negocios'],
  ['/negocios?empleos=1', /Trabajo local/, 'Negocios (pestana Empleos)'],
  ['/publicar', /Qué quieres publicar|publicar/, 'Publicar'],
  ['/avisos', /Solo avisos/, 'Avisos'],
  ['/cuenta', /Creado por Roep Tech/, 'Cuenta'],
  ['/cuenta?s=buzon', /Buzón del pueblo/, 'Cuenta > Buzón'],
  ['/mapa', /mapa|Mapa/, 'Mapa']
]
for (const [ruta, esperado, nombre] of rutas) {
  errores.length = 0
  window.history.pushState({}, '', ruta)
  window.dispatchEvent(new window.PopStateEvent('popstate'))
  await sleep(700)
  const t = cont.textContent || ''
  const sinErrores = !errores.some((e) => e.includes('Error:') || e.includes('at Object') || e.includes('at React'))
  ok(esperado.test(t) && sinErrores, `renderiza ${nombre} (${t.length} car.)${sinErrores ? '' : ' CON ERRORES: ' + errores[0]?.slice(0, 200)}`)
}

/* ============================================================
   8. SIN CUENTA: lectura publica
   ============================================================ */
console.log('\n--- Sin cuenta (lectura publica) ---')
root.unmount()
sinSesion()
window.history.pushState({}, '', '/')
const root2 = createRoot(cont)
root2.render(React.createElement(App))
await sleep(1000)
const tPublic = cont.textContent || ''
ok(/El Pulso del Pueblo/.test(tPublic) && /Avisos importantes/.test(tPublic),
  'sin cuenta se ve el Inicio completo (lectura publica)')
ok(/Entrar/.test(tPublic), 'el header muestra el boton Entrar')
ok(!/Iniciar sesión/.test(tPublic), 'NO redirige al login para solo ver')

window.history.pushState({}, '', '/publicar')
window.dispatchEvent(new window.PopStateEvent('popstate'))
await sleep(700)
const tLibre = cont.textContent || ''
ok(/Modo libre/i.test(tLibre), 'Publicar sin cuenta muestra el modo libre con sus reglas')
ok(/Requiere cuenta/.test(tLibre) || /🔒/.test(tLibre), 'avisos y empleos aparecen bloqueados para el invitado')

window.history.pushState({}, '', '/login')
window.dispatchEvent(new window.PopStateEvent('popstate'))
await sleep(700)
const tLogin = cont.textContent || ''
ok(/Iniciar sesión/.test(tLogin), 'en /login muestra la pantalla de acceso')
ok(/Roep Tech/.test(tLogin), 'el login muestra el credito de Roep Tech')

await vite.close()
console.log(`\n${fallos === 0 ? 'TODO OK' : fallos + ' FALLO(S)'}`)
process.exit(fallos === 0 ? 0 : 1)
