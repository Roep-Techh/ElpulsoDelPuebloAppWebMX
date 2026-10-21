import { useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { haceCuanto } from '../lib/format'

const TITULOS = {
  '/': ['El Pulso del Pueblo', 'Todo lo que pasa cerca de ti'],
  '/negocios': ['Negocios', 'Compra, servicios y trabajo local'],
  '/publicar': ['Publicar', 'Elige qué quieres compartir'],
  '/avisos': ['Avisos', 'Comunicados oficiales y de la comunidad'],
  '/cuenta': ['Mi cuenta', 'Perfil, notificaciones y apoyo'],
  '/mapa': ['Mapa del pueblo', 'Negocios y eventos cerca de ti']
}

function Logo() {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="20" fill="#1E4A38" />
      <path
        d="M7 20h6l3-8 5 16 4-11 3 3h5"
        fill="none"
        stroke="#fff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="33" cy="20" r="3" fill="#E0B84A" />
    </svg>
  )
}

export default function Header() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, notis, panelAbierto, setPanelAbierto, marcarLeidas } = useApp()
  const [titulo, sub] = TITULOS[pathname] || ['El Pulso del Pueblo', 'Todo lo que pasa cerca de ti']

  return (
    <header className="header">
      <div className="header-inner">
        <div className="header-logo">
          <Logo />
        </div>
        <div>
          <div className="header-titulo">{titulo}</div>
          <div className="header-sub">{sub}</div>
        </div>
        <div className="header-spacer" />

        {user ? (
          <button
            className="header-btn"
            aria-label="Notificaciones"
            onClick={() => setPanelAbierto(!panelAbierto)}
          >
            🔔
            {notis.length > 0 && <span className="header-badge">{notis.length}</span>}
          </button>
        ) : (
          <button
            className="header-btn"
            style={{ width: 'auto', padding: '0 13px', borderRadius: 999, fontSize: 13, fontWeight: 700 }}
            onClick={() => navigate('/login')}
          >
            Entrar
          </button>
        )}

        {user && (
          <button className="header-btn" aria-label="Ir a mi cuenta" onClick={() => navigate('/cuenta')}>
            👤
          </button>
        )}
      </div>

      {panelAbierto && (
        <div
          style={{
            position: 'absolute',
            right: 12,
            top: 'calc(100% + 6px)',
            width: 'min(360px, calc(100vw - 24px))',
            background: '#fff',
            color: 'var(--texto)',
            borderRadius: 16,
            boxShadow: '0 20px 45px rgba(0,0,0,.28)',
            overflow: 'hidden',
            zIndex: 60
          }}
        >
          <div
            style={{
              padding: '13px 15px',
              borderBottom: '1px solid var(--borde)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <b style={{ fontSize: 14.5 }}>Notificaciones</b>
            <button
              onClick={marcarLeidas}
              style={{
                border: 'none',
                background: 'none',
                color: 'var(--verde-700)',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Marcar leídas
            </button>
          </div>

          <div style={{ maxHeight: 340, overflowY: 'auto' }}>
            {notis.length === 0 && (
              <div className="vacio" style={{ padding: '28px 16px' }}>
                <span className="ico">🔕</span>
                <b>Estás al día</b>
                <span>Avisos urgentes y novedades de tus publicaciones aparecerán aquí.</span>
              </div>
            )}
            {notis.map((n) => (
              <button
                key={n.id}
                className="opcion"
                onClick={() => {
                  setPanelAbierto(false)
                  navigate(n.url)
                }}
              >
                <span className="ico">{n.ico}</span>
                <span style={{ fontSize: 13.5, lineHeight: 1.4 }}>{n.texto}</span>
                <span className="der">{haceCuanto(n.creado_en)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  )
}
