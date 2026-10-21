/* Configuracion de tipos de publicacion y rubros */

export const TIPOS = {
  aviso: {
    label: 'Aviso',
    icon: '📢',
    color: '#C0392B',
    colorBg: '#FDEDEA',
    desc: 'Comunicados oficiales y avisos de la comunidad',
    cta: 'Publicar aviso'
  },
  venta: {
    label: 'Venta',
    icon: '🛍️',
    color: '#1E7A52',
    colorBg: '#E7F5EE',
    desc: 'Productos, ofertas y cosas que vendes',
    cta: 'Publicar producto'
  },
  evento: {
    label: 'Evento',
    icon: '🎉',
    color: '#7B3FA0',
    colorBg: '#F2E9F8',
    desc: 'Fiestas, bazares, reuniones y actividades',
    cta: 'Publicar evento'
  },
  empleo: {
    label: 'Empleo',
    icon: '💼',
    color: '#1F6FB2',
    colorBg: '#E7F1FA',
    desc: 'Trabajo local: busca gente o encuentra chamba',
    cta: 'Publicar vacante'
  },
  ayuda: {
    label: 'Ayuda',
    icon: '❤️',
    color: '#D81B60',
    colorBg: '#FCE9F1',
    desc: 'Donaciones, apoyo mutuo y cosas que necesitas',
    cta: 'Pedir ayuda'
  },
  pregunta: {
    label: 'Pregunta',
    icon: '❓',
    color: '#D97706',
    colorBg: '#FDF2E3',
    desc: 'Dudas y recomendaciones de la comunidad',
    cta: 'Preguntar'
  }
}

export const PRIORIDADES = {
  urgente: { label: 'Urgente', icon: '🔴', color: '#C0392B', bg: '#FDEDEA' },
  oficial: { label: 'Oficial', icon: '🟢', color: '#1E7A52', bg: '#E7F5EE' },
  servicio: { label: 'Servicio', icon: '🔵', color: '#1F6FB2', bg: '#E7F1FA' },
  comunidad: { label: 'Comunidad', icon: '⚪', color: '#6B7C70', bg: '#EEF1EF' }
}

export const RUBROS = [
  'Comida',
  'Tienda',
  'Salud',
  'Servicios',
  'Automotriz',
  'Belleza',
  'Educación',
  'Construcción',
  'Ganadería',
  'Otros'
]

export const EMPLEO_TIPOS = ['Medio tiempo', 'Tiempo completo', 'Por día', 'Independiente']

/** Lmites diarios */
export const TOPE_NEGOCIO = 3
export const TOPE_VECINO = 1

/* ---------------- Vigencia de los avisos ----------------
   Recomendado 2 días para no saturar; máximo 1 mes.       */
export const VIGENCIAS = [
  { dias: 2, label: '2 días', recomendado: true, ayuda: 'Lo recomendado: desaparece solo y no satura.' },
  { dias: 4, label: '4 días', ayuda: 'Para avisos que siguen vigentes unos días más.' },
  { dias: 7, label: '1 semana', ayuda: 'Ideal para eventos o campañas de la semana.' },
  { dias: 30, label: '1 mes', ayuda: 'Máximo permitido. Úsalo solo si es de verdad necesario.' }
]
export const VIGENCIA_DEFECTO = 2
export const VIGENCIA_MAX_DIAS = 30

/** Motivos obligatorios del aviso */
export const MOTIVOS = [
  'Corte de agua',
  'Falta de luz',
  'Clima o emergencia',
  'Mantenimiento de calle',
  'Salud / vacunación',
  'Evento oficial',
  'Seguridad',
  'Basura / recolección',
  'Agenda de la semana',
  'Otro'
]

/** Fecha en que caduca un aviso */
export function fechaExpiracion(creadoEn, dias) {
  const base = new Date(creadoEn || Date.now())
  return new Date(base.getTime() + Number(dias || VIGENCIA_DEFECTO) * 86400000).toISOString()
}

/** ¿Sigue vigente? (los no-avisos no caducan) */
export function sigueVigente(post) {
  if (!post || !post.expira_en) return true
  return new Date(post.expira_en).getTime() > Date.now()
}
