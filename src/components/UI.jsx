import { useNavigate } from 'react-router-dom'
import { tiempoHastaMedianoche } from '../lib/format'
import { useApp } from '../context/AppContext'

/** Medidor de cupo diario: ● ● ○ 2/3 */
export function Cupo({ compacto }) {
  const { quota, user } = useApp()
  if (!user || !quota) return null
  const lleno = quota.restante === 0
  return (
    <div className={`cupo ${lleno ? 'lleno' : ''}`}>
      <div className="puntos">
        {Array.from({ length: quota.tope }).map((_, i) => (
          <span key={i} className={`punto ${i < quota.usadas ? 'on' : ''}`} />
        ))}
      </div>
      <div className="txt">
        {lleno
          ? `Cupo completo ${quota.tope}/${quota.tope} · se renueva en ${tiempoHastaMedianoche()}`
          : `${quota.usadas}/${quota.tope} publicaciones hoy · te quedan ${quota.restante} · se reinicia a las 00:00`}
        {!compacto && quota.tope === 3 && (
          <>
            <br />
            <span style={{ fontWeight: 400, fontSize: 11.5 }}>
              Tu negocio verificado puede publicar 3 veces al día para no saturar el feed.
            </span>
          </>
        )}
      </div>
    </div>
  )
}

/** Carrusel de patrocinadores destacados ✦ */
export function SponsorCarousel({ negocios }) {
  if (!negocios || negocios.length === 0) return null
  return (
    <>
      <div className="titulo-destacado">✦ Patrocinadores destacados</div>
      <div className="carrusel">
        {negocios.map((n) => (
          <SponsorCard key={n.id} negocio={n} />
        ))}
      </div>
    </>
  )
}

function SponsorCard({ negocio }) {
  const navigate = useNavigate()
  return (
    <div className="sponsor-card" onClick={() => navigate(`/negocio/${negocio.id}`)}>
      <div className="etq">✦ Patrocinador</div>
      <b>
        {negocio.emoji || '🏪'} {negocio.nombre}
      </b>
      <span>{negocio.rubro} · {negocio.direccion || 'Ubicación en el mapa'}</span>
      <div style={{ marginTop: 9 }}>
        <span className="mini-badge spon">Destacado en la app</span>
      </div>
    </div>
  )
}

/** Vacio generico */
export function Vacio({ ico = '🌙', titulo, texto }) {
  return (
    <div className="vacio">
      <span className="ico">{ico}</span>
      <b>{titulo}</b>
      <span>{texto}</span>
    </div>
  )
}

/** Buscador reutilizable */
export function Buscador({ valor, onChange, placeholder = 'Buscar negocios, lugares o avisos...' }) {
  return (
    <div className="buscador">
      <span className="lupa">🔍</span>
      <input
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Buscar"
      />
      {valor && (
        <button
          onClick={() => onChange('')}
          style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--texto-3)' }}
          aria-label="Limpiar"
        >
          ✕
        </button>
      )}
    </div>
  )
}

export function AvisoDemo() {
  const { modo } = useApp()
  if (modo !== 'demo') return null
  return (
    <div className="modo-demo">
      ⚙️ <b>Modo demostración:</b> los datos viven en tu navegador. Edita <b>.env</b> con tus claves de
      Supabase (y pega <b>supabase/schema.sql</b> en el SQL Editor) para conectar la base de datos real.
    </div>
  )
}
