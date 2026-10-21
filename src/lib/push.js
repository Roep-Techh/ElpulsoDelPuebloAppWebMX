/* Notificaciones web push (PWA) */
import { CONFIG, supabase, CONECTADO } from './supabase'

export function soportadas() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
}

export async function registrarServiceWorker() {
  if (!('serviceWorker' in navigator)) return null
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    return reg
  } catch (e) {
    console.warn('No se pudo registrar el service worker', e)
    return null
  }
}

export async function estadoSuscripcion() {
  if (!soportadas()) return 'no-soportado'
  const reg = await navigator.serviceWorker.getRegistration()
  if (!reg) return 'sin-registrar'
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return 'sin-permiso'
  if (Notification.permission === 'denied') return 'bloqueado'
  return 'activo'
}

/** Pide permiso y suscribe al push. Guarda la suscripcion en Supabase si esta conectado. */
export async function activarNotificaciones() {
  if (!soportadas()) return { error: 'Tu navegador no soporta notificaciones.' }
  if (!CONFIG.vapidPublicKey)
    return { error: 'Falta la clave VAPID (.env → VITE_VAPID_PUBLIC_KEY). Conéctala a Supabase para activar el push.' }

  const perm = await Notification.requestPermission()
  if (perm !== 'granted') return { error: 'Permiso de notificaciones denegado.' }

  const reg = (await navigator.serviceWorker.getRegistration()) || (await registrarServiceWorker())
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(CONFIG.vapidPublicKey)
  })
  const json = sub.toJSON()

  if (CONECTADO && supabase) {
    const { data } = await supabase.auth.getSession()
    await supabase.from('push_subscriptions').upsert({
      endpoint: json.endpoint,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
      user_id: data?.session?.user?.id || null
    })
  } else {
    localStorage.setItem('elpulso.push', JSON.stringify(json))
  }
  return { ok: true }
}

export async function desactivarNotificaciones() {
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  if (sub) await sub.unsubscribe()
  localStorage.removeItem('elpulso.push')
  return { ok: true }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}
