import { useLocation, useNavigate } from 'react-router-dom'

const ITEMS = [
  { path: '/', label: 'Inicio', ico: '🏠' },
  { path: '/negocios', label: 'Negocios', ico: '🏪' },
  { path: '/publicar', label: 'Publicar', ico: '＋', especial: true },
  { path: '/avisos', label: 'Avisos', ico: '📢' },
  { path: '/cuenta', label: 'Cuenta', ico: '👤' }
]

export default function BottomNav() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  return (
    <nav className="nav">
      {ITEMS.map((it) => {
        const activo = it.path === '/' ? pathname === '/' : pathname.startsWith(it.path)
        if (it.especial) {
          return (
            <button
              key={it.path}
              className={`nav-item publicar ${activo ? 'activo' : ''}`}
              onClick={() => navigate(it.path)}
            >
              <span className="ico-round">{it.ico}</span>
              <span>{it.label}</span>
            </button>
          )
        }
        return (
          <button
            key={it.path}
            className={`nav-item ${activo ? 'activo' : ''}`}
            onClick={() => navigate(it.path)}
          >
            <span className="ico">{it.ico}</span>
            <span>{it.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
