import { useApp } from '../context/AppContext'

/**
 * Filtro de pueblo (comunidad).
 * Muestra un selector con los pueblos activos. Si hay uno solo,
 * simplemente indica de dónde es la app; cuando lleguen más pueblos,
 * aparecerán aquí y cada quien ve lo de su comunidad.
 */
export default function FiltroPueblos() {
  const { comunidades, comunidad, elegirComunidad } = useApp()

  if (!comunidades.length) return null

  return (
    <div className="filtro-pueblo">
      <label className="filtro-pueblo-texto" htmlFor="filtro-pueblo">
        📍 Pueblo:
      </label>
      <select
        id="filtro-pueblo"
        className="filtro-pueblo-select"
        value={comunidad}
        onChange={(e) => elegirComunidad(e.target.value)}
      >
        {comunidades.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nombre}
          </option>
        ))}
      </select>
      {comunidades.length === 1 && (
        <span className="filtro-pueblo-nota">Pronto podrás ver otros pueblos aquí</span>
      )}
    </div>
  )
}
