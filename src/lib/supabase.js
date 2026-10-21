import { createClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

/** true = hay credenciales de Supabase; false = modo demo (localStorage) */
export const CONECTADO = Boolean(URL && KEY && String(URL).startsWith('http'))

export const supabase = CONECTADO ? createClient(URL, KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
}) : null

export const CONFIG = {
  url: URL || '',
  siteUrl: import.meta.env.VITE_SITE_URL || window.location.origin,
  vapidPublicKey: import.meta.env.VITE_VAPID_PUBLIC_KEY || ''
}
