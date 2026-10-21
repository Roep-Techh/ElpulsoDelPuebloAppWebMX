import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { DEMO_LOGIN, DEMO_PASSWORD, MODO, auth } from '../lib/api'

export default function Login() {
  const navigate = useNavigate()
  const { entrar, registrar, mostrarToast } = useApp()
  const [modo, setModo] = useState('entrar') // entrar | crear
  const [form, setForm] = useState({ nombre: '', email: '', password: '' })
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const enviar = async (e) => {
    e.preventDefault()
    setError('')
    setCargando(true)
    const r = modo === 'entrar' ? await entrar({ email: form.email, password: form.password })
      : await registrar(form)
    setCargando(false)
    if (r.error) return setError(r.error)
    if (r.mensaje) mostrarToast(r.mensaje, 'ok')
    navigate('/')
  }

  const demo = async (email) => {
    if (MODO !== 'demo') return
    setError('')
    setCargando(true)
    const r = await entrar({ email, password: DEMO_PASSWORD })
    setCargando(false)
    if (r.error) return setError(r.error)
    navigate('/')
  }

  const google = async () => {
    const r = await auth.signInGoogle()
    if (r.error) mostrarToast(r.error, 'error')
  }

  return (
    <div className="login-wrap">
      <div className="login-logo">
        <div className="circ">
          <svg viewBox="0 0 40 40" width="46" height="46" aria-hidden="true">
            <circle cx="20" cy="20" r="20" fill="#1E4A38" />
            <path d="M7 20h6l3-8 5 16 4-11 3 3h5" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="33" cy="20" r="3" fill="#E0B84A" />
          </svg>
        </div>
        <h1>El Pulso del Pueblo</h1>
        <p>Todo lo que pasa cerca de ti · Avisos, negocios, empleos y ayuda</p>
      </div>

      <div className="login-card">
        <div className="tabs">
          <button className={modo === 'entrar' ? 'activo' : ''} onClick={() => setModo('entrar')}>
            Iniciar sesión
          </button>
          <button className={modo === 'crear' ? 'activo' : ''} onClick={() => setModo('crear')}>
            Crear cuenta
          </button>
        </div>

        <form onSubmit={enviar}>
          {modo === 'crear' && (
            <div className="field">
              <label>Tu nombre o el de tu negocio</label>
              <input className="input" value={form.nombre} onChange={set('nombre')} placeholder="Ej. María Hernández" required />
            </div>
          )}

          <div className="field">
            <label>Correo electrónico</label>
            <input className="input" type="email" value={form.email} onChange={set('email')} placeholder="tucorreo@ejemplo.com" required />
          </div>

          <div className="field">
            <label>Contraseña</label>
            <input className="input" type="password" value={form.password} onChange={set('password')} placeholder="Mínimo 6 caracteres" minLength={6} required />
          </div>

          {error && (
            <div style={{ background: '#fdecea', color: '#8e2a1e', padding: '10px 12px', borderRadius: 11, fontSize: 13, marginBottom: 12, fontWeight: 600 }}>
              {error}
            </div>
          )}

          <button className="btn btn-primario" disabled={cargando}>
            {cargando ? 'Un momento…' : modo === 'entrar' ? 'Entrar' : 'Crear mi cuenta'}
          </button>
        </form>

        <button className="btn btn-secundario" style={{ marginTop: 10 }} onClick={google}>
          <svg width="17" height="17" viewBox="0 0 24 24"><path fill="#4285F4" d="M23 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.2a5.3 5.3 0 0 1-2.3 3.5v2.9h3.7c2.2-2 3.4-5 3.4-8.6z"/><path fill="#34A853" d="M12 24c3.1 0 5.7-1 7.6-2.8l-3.7-2.9c-1 .7-2.3 1.1-3.9 1.1-3 0-5.5-2-6.4-4.7H1.8v3C3.7 21.4 7.6 24 12 24z"/><path fill="#FBBC05" d="M5.6 14.7a7.2 7.2 0 0 1 0-4.6v-3H1.8a12 12 0 0 0 0 10.6l3.8-3z"/><path fill="#EA4335" d="M12 4.8c1.7 0 3.2.6 4.4 1.7l3.3-3.3C17.7 1.2 15.1 0 12 0 7.6 0 3.7 2.6 1.8 6.1l3.8 3C6.5 6.7 9 4.8 12 4.8z"/></svg>
          Continuar con Google
        </button>

        <p style={{ fontSize: 12, color: 'var(--texto-3)', textAlign: 'center', margin: '16px 0 0', lineHeight: 1.6 }}>
          Ver es libre y sin cuenta. <b>El ingreso</b> es para publicar con tu límite diario, comentar, reaccionar y
          recibir avisos urgentes. <br />
          Así mantenemos la comunidad libre de spam.
        </p>

        {MODO === 'demo' && (
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px dashed var(--borde)' }}>
            <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 0.6, color: 'var(--dorado-oscuro)', textAlign: 'center', marginBottom: 9 }}>
              ⚙️ ENTRAR RÁPIDO (MODO DEMO)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {DEMO_LOGIN.map((d) => (
                <button
                  key={d.email}
                  className="btn btn-fantasma btn-mini"
                  style={{ background: 'var(--fondo)', fontSize: 11.5, padding: '9px 6px' }}
                  onClick={() => demo(d.email)}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          className="btn btn-fantasma"
          style={{ marginTop: 14, fontSize: 13.5 }}
          onClick={() => navigate('/')}
        >
          👀 Solo quiero ver el pulso del pueblo →
        </button>
      </div>

      <p style={{ textAlign: 'center', color: 'rgba(255,255,255,.75)', fontSize: 12.5, marginTop: 20 }}>
        Creado por <b>Roep Tech</b>
      </p>
    </div>
  )
}
