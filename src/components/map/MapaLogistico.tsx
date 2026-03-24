/**
 * MapaLogistico — Mapa de rastreamento em tempo real
 * Leaflet via CDN + SSE para posições dos entregadores
 */
import { useEffect, useRef, useState } from 'react'
import { clsx } from 'clsx'
import { useRealtime } from '@/hooks/useRealtime'

interface Driver {
  id: string; name: string; lat: number; lng: number
  status: 'em_rota'|'entregando'|'retorno'|'parado'
  order_id?: number
}

const DEMO_DRIVERS: Driver[] = [
  { id:'V-01', name:'Carlos Silva',  lat:-23.5642, lng:-46.6521, status:'em_rota',    order_id:1 },
  { id:'V-02', name:'Marcos Lima',   lat:-23.6105, lng:-46.7012, status:'entregando', order_id:3 },
  { id:'V-03', name:'Ricardo Souza', lat:-23.5401, lng:-46.6000, status:'retorno' },
]

const STATUS_LABELS: Record<string,string> = { em_rota:'Em Rota', entregando:'Entregando', retorno:'Retorno', parado:'Parado' }
const STATUS_COLORS: Record<string,string> = { em_rota:'#38bdf8', entregando:'#22c55e', retorno:'#fbbf24', parado:'#ef4444' }
const CD_POS = { lat:-23.5505, lng:-46.6333 }

export function MapaLogistico() {
  const mapDiv    = useRef<HTMLDivElement>(null)
  const mapInst   = useRef<any>(null)
  const markers   = useRef<Record<string,any>>({})
  const [drivers, setDrivers]   = useState<Driver[]>(DEMO_DRIVERS)
  const [ready,   setReady]     = useState(false)
  const [selected,setSelected]  = useState<Driver|null>(null)
  const { driverPos, connected } = useRealtime()

  useEffect(() => {
    if (!driverPos) return
    setDrivers(prev => {
      const ex = prev.find(d => d.id === driverPos.id)
      if (ex) return prev.map(d => d.id === driverPos.id ? { ...d, lat: driverPos.lat, lng: driverPos.lng } : d)
      return [...prev, { id: driverPos.id, name: driverPos.name, lat: driverPos.lat, lng: driverPos.lng, status:'em_rota' }]
    })
  }, [driverPos])

  useEffect(() => {
    if (ready || !mapDiv.current) return
    if (!document.getElementById('lf-css')) {
      const l = document.createElement('link')
      l.id = 'lf-css'; l.rel = 'stylesheet'
      l.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(l)
    }
    const load = () => new Promise<void>(res => {
      if ((window as any).L) { res(); return }
      const s = document.createElement('script')
      s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      s.onload = () => res()
      document.head.appendChild(s)
    })
    load().then(() => {
      if (!mapDiv.current || mapInst.current) return
      const L = (window as any).L
      const map = L.map(mapDiv.current, { zoomControl:false }).setView([CD_POS.lat, CD_POS.lng], 12)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map)
      const mkIcon = (c: string) => L.divIcon({
        html:`<div style="background:${c};width:30px;height:30px;border-radius:50%;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:12px;box-shadow:0 2px 8px rgba(0,0,0,.5)">🚚</div>`,
        className:'', iconSize:[30,30], iconAnchor:[15,15],
      })
      L.marker([CD_POS.lat,CD_POS.lng], { icon: L.divIcon({ html:'<div style="background:#fbbf24;width:32px;height:32px;border-radius:50%;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:14px">🏭</div>', className:'', iconSize:[32,32], iconAnchor:[16,16] }) })
        .addTo(map).bindPopup('<b>CD Central KINGSTAR</b>')
      L.circle([CD_POS.lat,CD_POS.lng],{ color:'#22c55e', fillColor:'#22c55e', fillOpacity:0.04, radius:5000 }).addTo(map)
      mapInst.current = { map, L, mkIcon }
      setReady(true)
      setTimeout(() => map.invalidateSize(), 400)
    })
  }, [ready])

  useEffect(() => {
    if (!mapInst.current) return
    const { map, L, mkIcon } = mapInst.current
    drivers.forEach(d => {
      const dist = map.distance([d.lat,d.lng],[CD_POS.lat,CD_POS.lng])
      const popup = `<div style="font-family:sans-serif;font-size:12px"><b style="color:#38bdf8">${d.id} — ${d.name}</b><br/>Status: <b>${STATUS_LABELS[d.status]}</b><br/>Dist CD: <b>${(dist/1000).toFixed(1)} km</b>${d.order_id ? `<br/>Pedido: <b>#${d.order_id}</b>` : ''}${dist>5000 ? '<br/><b style="color:#ef4444">⚠ Fora do raio</b>' : ''}</div>`
      if (markers.current[d.id]) {
        markers.current[d.id].setLatLng([d.lat,d.lng]).setIcon(mkIcon(STATUS_COLORS[d.status])).setPopupContent(popup)
      } else {
        markers.current[d.id] = L.marker([d.lat,d.lng],{ icon: mkIcon(STATUS_COLORS[d.status]) }).addTo(map).bindPopup(popup).on('click',() => setSelected(d))
      }
    })
  }, [drivers, ready])

  return (
    <div className="ks-card p-0 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--ks-border)]">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <i className="fas fa-map-marked-alt text-ks-green" /> Rastreamento em Tempo Real
          <span className={clsx('w-1.5 h-1.5 rounded-full ml-1', connected ? 'bg-ks-green ks-blink' : 'bg-[var(--ks-text-muted)]')} />
          <span className={clsx('text-[9px] font-mono', connected ? 'text-ks-green' : 'text-[var(--ks-text-muted)]')}>{connected ? 'LIVE' : 'DEMO'}</span>
        </h3>
        <span className="text-xs text-[var(--ks-text-muted)]">{drivers.length} veículo(s)</span>
      </div>
      <div className="flex flex-col lg:flex-row">
        <div ref={mapDiv} style={{ height:300, minWidth:0 }} className="flex-1 bg-[#1a1a1a] relative">
          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <i className="fas fa-circle-notch ks-spin text-ks-blue text-xl block mb-2" />
                <p className="text-xs text-[var(--ks-text-muted)]">Carregando mapa...</p>
              </div>
            </div>
          )}
        </div>
        <div className="w-full lg:w-52 border-t lg:border-t-0 lg:border-l border-[var(--ks-border)]" style={{ maxHeight:300, overflowY:'auto' }}>
          {drivers.map(d => (
            <div key={d.id} onClick={() => setSelected(d)}
              className={clsx('flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-[var(--ks-border)] transition-colors',
                selected?.id===d.id ? 'bg-ks-blue/10' : 'hover:bg-[var(--ks-bg-hover)]')}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] flex-shrink-0"
                style={{ background:STATUS_COLORS[d.status]+'20', color:STATUS_COLORS[d.status], border:`1px solid ${STATUS_COLORS[d.status]}40` }}>
                <i className="fas fa-truck" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate">{d.name}</p>
                <p className="text-[10px] font-mono" style={{ color:STATUS_COLORS[d.status] }}>{STATUS_LABELS[d.status]}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      {selected && (
        <div className="flex items-center justify-between px-5 py-2 bg-[var(--ks-bg-hover)] border-t border-[var(--ks-border)] text-xs">
          <span className="font-semibold">{selected.name} — {selected.id}</span>
          {selected.order_id && <span className="text-ks-blue">Pedido #{selected.order_id}</span>}
          <button onClick={() => setSelected(null)} className="text-[var(--ks-text-muted)] hover:text-white"><i className="fas fa-times" /></button>
        </div>
      )}
    </div>
  )
}
