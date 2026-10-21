/* Utilidades de formato en espanol */

export function haceCuanto(iso) {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  const s = Math.floor((Date.now() - d.getTime()) / 1000)
  if (s < 60) return 'ahora'
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`
  if (s < 86400 * 7) return `hace ${Math.floor(s / 86400)} d`
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

export function fechaLarga(iso) {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  if (!d || isNaN(d)) return ''
  return d.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/** Fecha local (YYYY-MM-DD) de un instante, para contar el cupo por dia del pueblo */
export function fechaLocal(fecha) {
  const d = fecha instanceof Date ? fecha : new Date(fecha)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${dd}`
}

export function hoyKey() {
  return fechaLocal(new Date())
}

export function nombreDia() {
  return new Date().toLocaleDateString('es-MX', { weekday: 'long' })
}

export function tiempoHastaMedianoche() {
  const now = new Date()
  const fin = new Date(now)
  fin.setHours(24, 0, 0, 0)
  const min = Math.max(0, Math.round((fin - now) / 60000))
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m} min`
  return `${h} h ${m} min`
}

export function iniciales(nombre = '?') {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

/** "25 oct" / "25 oct 14:30" */
export function fechaCorta(iso) {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  if (!d || isNaN(d)) return ''
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

/** Restante de vigencia: "vence en 2 días" / "venció ayer" */
export function restanteVigencia(iso) {
  const d = new Date(iso).getTime()
  if (isNaN(d)) return ''
  const ms = d - Date.now()
  if (ms <= 0) return 'vencido'
  const dias = Math.ceil(ms / 86400000)
  if (dias <= 1) return 'vence hoy'
  return `vence en ${dias} días`
}
