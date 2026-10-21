/* ============================================================
   PERMISOS - fuente unica de verdad.
   admin     = Roep Tech (ustedes): control total de la app
   moderador = Entidades locales (Presidencia, Comisiones, Iglesia):
               pueden publicar avisos oficiales/urgentes, NADA mas.
               No moderan: no tienen tiempo, la revision la hace Roep Tech.
   vecino    = todos los demas
   ============================================================ */

export const PERMISOS = {
  avisos_urgentes: ['admin', 'moderador'], // publicar avisos 🔴 urgentes / 🟢 oficiales
  ocultar_contenido: ['admin'],            // revisar reportes y ocultar
  aprobar_invitados: ['admin'],            // cola de publicaciones sin cuenta
  ver_buzon: ['admin'],                    // quejas, ideas y recomendaciones
  responder_buzon: ['admin'],
  verificar_negocio: ['admin'],            // sello ✓
  patrocinios: ['admin'],                  // destacados ✦ y cobros
  gestionar_roles: ['admin'],              // asignar roles
  ver_metricas: ['admin']
}

export const puede = (rol, permiso) => Array.isArray(PERMISOS[permiso]) && PERMISOS[permiso].includes(rol)

export const ROLES = {
  admin: { label: '💠 Roep Tech (admin)', corto: 'admin' },
  moderador: { label: '🏛️ Entidad verificada', corto: 'moderador' },
  vecino: { label: '👋 Vecino', corto: 'vecino' }
}

/** Entidades que se les crea cuenta (Presidencia, Comisiones, Iglesia) */
export const ENTIDADES = ['Presidencia Municipal', 'Comisiones', 'Iglesia']
