/**
 * CorePage — painel operacional (placeholder enxuto).
 * Realtime usa o mesmo cliente Socket.io do restante da app.
 */
import { useEffect, useState } from 'react'
import { socket } from '@/services/socket'

export function CorePage() {
  const [connected, setConnected] = useState(socket.connected)

  useEffect(() => {
    const onConnect = () => setConnected(true)
    const onDisconnect = () => setConnected(false)
    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
    }
  }, [])

  return (
    <main style={{ padding: '1rem' }}>
      <h1>Core</h1>
      <p>Status do realtime: {connected ? 'conectado' : 'desconectado'}</p>
    </main>
  )
}
