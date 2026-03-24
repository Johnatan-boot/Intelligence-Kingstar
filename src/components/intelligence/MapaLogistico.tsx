/**
 * MapaLogístico — Rastreamento em tempo real via Leaflet + SSE
 *
 * Carrega Leaflet via CDN (sem dependência npm) para manter o bundle pequeno.
 * Recebe posições dos entregadores via evento SSE 'driver_location'.
 *
 * Ciclo completo:
 *  App do entregador → POST /realtime/driver → SSE → MapaLogístico
 *
 * Em modo demo: simula 3 entregadores se movendo no mapa.
 */
import { useEffect, useRef, useState } from 'react'
import { clsx } from 'clsx'
import { useRealtime } from '@/hooks/useRealtime'

interface Driver {
  driver_id: string
  name:      string
  lat:       number
  lng:       number
  status:    string
  order_id?: number
  timestamp: number
}

/* Posições demo — usadas quando não há entregadores reais */
const DEMO_DRIVERS: Driver[] = [
  { driver_id:'V-01', name:'Carlos Silva',  lat:-23.5642, lng:-46.6521, status:'Em Rota',   order_id:4, timestamp: Date.now() },
  { driver_id:'V-02', name:'Marcos Lima',   lat:-23.6105, lng:-46.7012, status:'Coleta',    order_id:2, timestamp: Date.now() },
  { driver_id:'V-03', name:'Ricardo Souza', lat:-23.5401, lng:-46.6000, status:'Retorno',   timestamp:  Date.now() },
]

const STATUS_COLOR: Record<string, string> = {
  'Em Rota':  '#38bdf8',
  'Coleta':   '#fbbf24',
  'Retorno':  '#22c55e',
  'Parado':   '#94a3b8',
  'Entregue': '#22c55e',
}

declare global { interface Window { L: any } }

export function MapaLogistico() {
  const mapRef      = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const markersRef  = useRef<Map<string, any>>(new Map())
  const [drivers, setDrivers] = useState<Driver[]>(DEMO_DRIVERS)
  const [isDemo,  setIsDemo]  = useState(true)
  const { driverPos } = useRealtime()

  /* Carrega Leaflet do CDN se ainda não carregado */
  useEffect(() => {
    if (window.L) { initMap(); return }

    const css  = document.createElement('link')
    css.rel    = 'stylesheet'
    css.href   = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(css)

    const script = document.createElement('script')
    script.src   = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => { initMap() }
    document.body.appendChild(script)

    return () => { mapInstance.current?.remove(); mapInstance.current = null }
  }, [])

  const initMap = () => {
    if (!mapRef.current || mapInstance.current) return
    const L = window.L

    const map = L.map(mapRef.current, { zoomControl: false })
      .setView([-23.5505, -46.6333], 12)

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© KINGSTAR IO',
    }).addTo(map)

    L.control.zoom({ position: 'bottomright' }).addTo(map)

    /* Marcador do CD */
    L.marker([-23.5505, -46.6333], {
      icon: L.divIcon({
        html: '<div style="background:#22c55e;width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;box-shadow:0 0 12px rgba(34,197,94,0.6)"><span style="color:black;font-size:16px">🏭</span></div>',
        className: '', iconSize: [32,32], iconAnchor: [16,16],
      }),
    }).addTo(map).bindPopup('<b style="color:#000">CD CENTRAL KINGSTAR</b>')

    /* Raio de operação */
    L.circle([-23.5505, -46.6333], {
      color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.04, radius: 5000,
    }).addTo(map)

    mapInstance.current = map
    renderMarkers(DEMO_DRIVERS)
    setTimeout(() => map.invalidateSize(), 300)
  }

  const renderMarkers = (driverList: Driver[]) => {
    const L = window.L
    if (!L || !mapInstance.current) return

    driverList.forEach(d => {
      const cor  = STATUS_COLOR[d.status] || '#94a3b8'
      const icon = L.divIcon({
        html: `<div style="background:${cor};width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 10px ${cor}55;border:2px solid #000"><span style="font-size:13px">🚚</span></div>`,
        className: '', iconSize: [28,28], iconAnchor: [14,14],
      })

      const popup = `
        <div style="font-family:sans-serif;min-width:140px">
          <b style="color:#38bdf8">${d.driver_id}</b><br>
          <span>${d.name}</span><br>
          <span style="color:${cor};font-weight:bold">${d.status}</span>
          ${d.order_id ? `<br><span style="color:#888">Pedido #${d.order_id}</span>` : ''}
        </div>`

      if (markersRef.current.has(d.driver_id)) {
        markersRef.current.get(d.driver_id).setLatLng([d.lat, d.lng])
      } else {
        const m = L.marker([d.lat, d.lng], { icon }).addTo(mapInstance.current)
        m.bindPopup(popup)
        markersRef.current.set(d.driver_id, m)
      }
    })
  }

  useEffect(() => {
    if (!driverPos) return
    setIsDemo(false)
    setDrivers(prev => {
      const filtered = prev.filter(d => d.driver_id !== driverPos.id)
      return [...filtered, {
        driver_id: driverPos.id,
        name: driverPos.name || 'Motorista',
        lat: driverPos.lat,
        lng: driverPos.lng,
        status: 'Em Rota',
        timestamp: Date.now()
      }]
    })
  }, [driverPos])

  useEffect(() => { renderMarkers(drivers) }, [drivers])

  return (
    <div className="ks-card p-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--ks-border)]">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <i className="fas fa-map-marked-alt text-ks-green" />
          Rastreamento Logístico
          {isDemo && (
            <span className="text-[9px] font-mono text-[var(--ks-text-muted)] bg-white/5 px-2 py-0.5 rounded">DEMO</span>
          )}
          {!isDemo && (
            <span className="text-[9px] font-mono text-ks-green bg-ks-green/10 px-2 py-0.5 rounded border border-ks-green/30 ks-blink">LIVE</span>
          )}
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--ks-text-muted)]">{drivers.length} veículo(s)</span>
        </div>
      </div>

      {/* Mapa */}
      <div ref={mapRef} style={{ height: 320, background: '#0f0f0f' }} />

      {/* Lista de entregadores */}
      <div className="border-t border-[var(--ks-border)] px-4 py-3 flex gap-3 overflow-x-auto">
        {drivers.map(d => (
          <div
            key={d.driver_id}
            className="flex items-center gap-2 bg-[var(--ks-bg-hover)] border border-[var(--ks-border)] rounded-lg px-3 py-2 flex-shrink-0 cursor-pointer hover:border-ks-blue transition-colors"
            onClick={() => mapInstance.current?.flyTo([d.lat, d.lng], 14)}
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: STATUS_COLOR[d.status] || '#94a3b8' }}
            />
            <div>
              <p className="text-xs font-semibold text-white">{d.driver_id}</p>
              <p className="text-[10px] text-[var(--ks-text-muted)]">{d.status}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
