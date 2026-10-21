/* Datos de tu marca - EDITA ESTE ARCHIVO con tus datos reales */
export const MARCA = {
  creador: 'Roep Tech',
  url: 'https://roeptech.com',
  urlTexto: 'roeptech.com',
  contacto: 'WhatsApp 55 0000 0000',
  contactoLink: 'https://wa.me/5500000000',
  correo: 'contacto@roeptech.com',
  lema: 'Desarrollamos tecnología para tu negocio',
  aceptaPatrocinios: true,
  aceptaDonaciones: true,
  redes: 'Facebook / Instagram: @roeptech'
}

/* Precios de patrocinio (mensuales, MXN) */
export const PLANES = [
  {
    id: 'destacado',
    nombre: '✦ Destacado Dorado',
    precio: 250,
    beneficios: [
      'Apareces en el carrusel de Inicio y Negocios',
      'Badge dorado en tu perfil y en tus publicaciones',
      'Prioridad en el orden del feed',
      'Enlace directo a WhatsApp desde la app'
    ]
  },
  {
    id: 'verificacion',
    nombre: '✓ Verificación + 3 al día',
    precio: 150,
    beneficios: [
      'Sello de negocio verificado ✓',
      '3 publicaciones diarias (reinician a las 00:00)',
      'Apareces primero en búsquedas de tu rubro'
    ]
  }
]

export const DONACION_RAPIDA = [20, 50, 100, 250]
export const META_MENSUAL = 3000
