/* ============================================================
   FILTROS DE CONTENIDO - se aplican en el cliente (aviso rapido)
   y en el servidor (publicar_invitado / trigger), que es donde
   de verdad cuenta para el modo libre.
   ============================================================ */

export const PALABRAS_PROHIBIDAS = [
  // insultos
  'puta', 'puto', 'pendejo', 'pendeja', 'cabron', 'cabrón', 'culero', 'culera',
  'mierda', 'idiota', 'estupido', 'estúpido', 'imbecil', 'imbécil', 'malparido',
  // estafas y spam comercial
  'estafa', 'estafador', 'inversión garantizada', 'inversion garantizada',
  'dinero facil', 'dinero fácil', 'ganar dinero rapido', 'ganar dinero rápido',
  'duplica tu dinero', 'préstamo sin garantía', 'prestamo sin garantia',
  'cripto', 'bitcoin', 'forex', 'binarias', 'network marketing', 'multinivel',
  'trabajo desde casa ganancias', 'click aquí y gana',
  // contenido adulto / armas / drogas
  'xxx', 'porn', 'onlyfans', 'escorts', 'masaje erotico', 'masaje erótico',
  'arma', 'pistola', 'navaja', 'cuchillo para', 'droga', 'marihuana', 'cannabis', 'cocaina', 'cocaína',
  // técnicos típicos de spam
  'hacked', 'hackeo', 'tarjeta clonada', 'cuenta robada', 'seguidores gratis',
  'whatsapp masivo', 'datos de tarjetas'
]

const RE_ENLACE = /https?:\/\/|www\.|[a-z0-9-]+\.(com|net|org|xyz|online|click|club)\b/i
const RE_MUCHAS_MAYUSCULAS = /[A-ZÁÉÍÓÚÑ]{25,}/
const RE_TELEFONO_LARGO = /(\+?\d[\d\s.-]{9,}\d)/

/**
 * Devuelve { ok, motivos[] }.
 * Se le pasa el texto del usuario (titulo + cuerpo + extra).
 */
export function analizarTexto({ titulo = '', cuerpo = '', extra = '' } = {}) {
  const motivos = []
  const todo = `${titulo} ${cuerpo}`.toLowerCase()
  const conExtra = `${todo} ${extra}`.toLowerCase()

  for (const p of PALABRAS_PROHIBIDAS) {
    if (todo.includes(p)) {
      motivos.push('palabras no permitidas')
      break
    }
  }

  if (RE_ENLACE.test(conExtra)) motivos.push('enlaces no permitidos')
  if (RE_MUCHAS_MAYUSCULAS.test(`${titulo} ${cuerpo}`)) motivos.push('exceso de mayúsculas')
  if (RE_TELEFONO_LARGO.test(todo)) motivos.push('números de cuenta o teléfono en el texto')

  const largo = (titulo + cuerpo).length
  if (largo > 1200) motivos.push('texto demasiado largo')

  if (!String(titulo).trim()) motivos.push('falta el título')

  return { ok: motivos.length === 0, motivos: [...new Set(motivos)] }
}

/** Nombre publico del modo libre: 2-24 car., sin links, sin teléfonos, sin @ */
export function validarNombrePublico(nombre = '') {
  const n = String(nombre).trim()
  if (n.length < 2) return 'Escribe tu nombre público (mínimo 2 letras).'
  if (n.length > 24) return 'El nombre público es máximo de 24 caracteres.'
  if (RE_ENLACE.test(n)) return 'El nombre no puede llevar enlaces.'
  if (/\d{5,}/.test(n)) return 'El nombre no puede llevar números.'
  if (!/[a-záéíóúüñ]/i.test(n)) return 'El nombre debe contener letras.'
  if (/@|https?/i.test(n)) return 'Ese nombre no está permitido.'
  return null
}

/** Categorias que puede usar alguien sin cuenta */
export const LIBRE = ['venta', 'evento', 'ayuda', 'pregunta']
export const requiereCuenta = (tipo) => !LIBRE.includes(tipo)
