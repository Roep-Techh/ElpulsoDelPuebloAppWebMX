import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import * as api from '../lib/api'

/* Punto central del pueblo (cámbialo por tu comunidad) */
const CENTRO = [19.4326, -99.1332]
const ZOOM = 14

export default function Mapa() {
  const navigate = useNavigate()
  const cont = useRef(null)
  const mapa = useRef(null)
  const [negocios, setNegocios] = useState([])
  const [eventos, setEventos] = useState([])

  useEffect(() => {
    api.businesses.list().then(setNegocios)
    api.posts.list({ tipo: 'evento', limit: 40 }).then((p) => setEventos(p.filter((e) => e.lat && e.lng)))
  }, [])

  useEffect(() => {
    if (!cont.current || mapa.current) return
    const map = L.map(cont.current, { scrollWheelZoom: false }).setView(CENTRO, ZOOM)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19
    }).addTo(map)
    mapa.current = map
    setTimeout(() => map.invalidateSize(), 250)
    return () => {
      map.remove()
      mapa.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapa.current
    if (!map) return
    const capa = L.layerGroup().addTo(map)

    negocios.forEach((n) => {
      if (!n.lat || !n.lng) return
      const icono = L.divIcon({
        className: '',
        html: `<div style="background:${n.es_patrocinado ? '#E0B84A' : '#1E4A38'};color:#fff;width:34px;height:34px;border-radius:50% 50% 50% 6px;display:grid;place-items:center;font-size:17px;box-shadow:0 4px 12px rgba(0,0,0,.3);border:2px solid #fff;transform:rotate(0)">${n.emoji || '🏪'}</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 34]
      })
      L.marker([n.lat, n.lng], { icon: icono })
        .bindPopup(`<b>${n.nombre}</b><br/>${n.rubro}<br/><i>${n.direccion || ''}</i>`)
        .on('click', () => {})
        .addTo(capa)
      const link = n.id
      L.marker([n.lat, n.lng], { opacity: 0, title: n.nombre }).on('click', () => navigate(`/negocio/${link}`)).addTo(capa)
    })

    eventos.forEach((e) => {
      const icono = L.divIcon({
        className: '',
        html: `<div style="background:#7B3FA0;color:#fff;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-size:15px;box-shadow:0 4px 12px rgba(0,0,0,.3);border:2px solid #fff">🎉</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      })
      L.marker([e.lat, e.lng], { icon: icono })
        .bindPopup(`<b>${e.titulo}</b><br/>${new Date(e.fecha_evento || e.creado_en).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}`)
        .addTo(capa)
    })

    return () => map.removeLayer(capa)
  }, [negocios, eventos, navigate])

  return (
    <>
      <div className="chips" style={{ marginBottom: 10 }}>
        <span className="chip activo">🏪 Negocios con ubicación</span>
        <span className="chip" style={{ background: '#F2E9F8', borderColor: '#7B3FA0', color: '#7B3FA0' }}>🎉 Eventos</span>
        <button className="chip" onClick={() => navigate('/negocios')}>Ver directorio →</button>
      </div>

      <div className="mapa-cont" ref={cont} />

      <div className="card card-pad" style={{ marginTop: 12 }}>
        <b style={{ fontSize: 14 }}>📍 ¿Tu negocio no aparece en el mapa?</b>
        <p style={{ fontSize: 13, color: 'var(--texto-2)', margin: '6px 0 12px', lineHeight: 1.6 }}>
          Regístralo en Negocios con tu dirección y los vecinos podrán encontrarlo aquí y llegar directo.
        </p>
        <button className="btn btn-secundario btn-mini" onClick={() => navigate('/negocios')}>Registrar mi negocio</button>
      </div>
    </>
  )
}
