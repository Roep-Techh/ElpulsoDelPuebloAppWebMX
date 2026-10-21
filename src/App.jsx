import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import Header from './components/Header'
import BottomNav from './components/BottomNav'
import Home from './pages/Home'
import Negocios from './pages/Negocios'
import Publicar from './pages/Publicar'
import Avisos from './pages/Avisos'
import Cuenta from './pages/Cuenta'
import Login from './pages/Login'
import PostDetalle from './pages/PostDetalle'
import NegocioDetalle from './pages/NegocioDetalle'
import Mapa from './pages/Mapa'
import { registrarServiceWorker } from './lib/push'
import { SIN_CONECTAR } from './lib/api'
import { MARCA } from './lib/marca'

/* Pantalla que se muestra en produccion cuando el build NO tiene la base de datos
   conectada (faltan las variables VITE_SUPABASE_*). En ese caso NUNCA se muestran
   datos de prueba: la app se detiene y explica qué falta. */
function FaltaBase() {
  return (
    <div className="pantalla-config">
      <div className="logo-logo"> Pulso</div>
      <h1>El Pulso del Pueblo</h1>
      <p className="sub">
        La aplicación está publicada, pero <b>falta conectar la base de datos</b>. Agrega estas variables de
        entorno en el hosting y vuelve a compilar:
      </p>
      <pre>{`VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
VITE_SITE_URL=https://tudominio.com`}</pre>
      <p className="sub">
        Guía completa: <b>README.md → De demo a datos reales</b>.
        {MARCA.urlTexto ? ` · ${MARCA.urlTexto}` : ''}
      </p>
      <p className="marca">Creado por {MARCA.creador}</p>
    </div>
  )
}

function Toast() {
  const { toast } = useApp()
  if (!toast) return null
  return <div className={`toast ${toast.tipo || ''}`}>{toast.texto}</div>
  }

function Shell() {
  const { user, cargando } = useApp()
  const { pathname } = useLocation()

  useEffect(() => {
    if (pathname !== '/login') window.scrollTo(0, 0)
  }, [pathname])

  if (cargando) {
    return (
      <div className="cargando" style={{ paddingTop: 130 }}>
        <div className="spin" />
        Cargando El Pulso del Pueblo…
      </div>
    )
  }

  if (pathname === '/login') {
    return (
      <>
        <Login />
        <Toast />
      </>
    )
  }

  // Lectura publica: cualquiera puede ver Inicio, Negocios, Avisos, Mapa y publicaciones.
  // Solo se pide cuenta al momento de interactuar (publicar con cuenta, comentar, reportar, Cuenta).

  return (
    <div className="app">
      <Header />
      <main className="contenido">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/negocios" element={<Negocios />} />
          <Route path="/publicar" element={<Publicar />} />
          <Route path="/avisos" element={<Avisos />} />
          <Route path="/cuenta" element={<Cuenta />} />
          <Route path="/mapa" element={<Mapa />} />
          <Route path="/post/:id" element={<PostDetalle />} />
          <Route path="/negocio/:id" element={<NegocioDetalle />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNav />
      <Toast />
    </div>
  )
}

export default function App() {
  useEffect(() => {
    registrarServiceWorker()
  }, [])

  // Produccion sin base de datos: no se muestra la app ni ningun dato de prueba
  if (SIN_CONECTAR) return <FaltaBase />

  return (
    <AppProvider>
      <BrowserRouter>
        <Shell />
      </BrowserRouter>
    </AppProvider>
  )
}
