import { useEffect, useMemo, useState } from "react"
import { io, type Socket } from "socket.io-client"

type RealtimeOptions = {
  url?: string
  on?: {
    connect?: () => void
    disconnect?: () => void
    message?: (data: unknown) => void
  }
}

export function useRealtime(options?: RealtimeOptions) {
  const socket: Socket = useMemo(() => {
    const realtimeUrl = options?.url ?? "http://localhost:3000"

    return io(realtimeUrl, { autoConnect: true })
  }, [options?.url])

  const [connected, setConnected] = useState<boolean>(socket.connected)

  useEffect(() => {
    const handleConnect = () => {
      setConnected(true)
      options?.on?.connect?.()
    }

    const handleDisconnect = () => {
      setConnected(false)
      options?.on?.disconnect?.()
    }

    const handleMessage = (data: unknown) => {
      options?.on?.message?.(data)
    }

    socket.on("connect", handleConnect)
    socket.on("disconnect", handleDisconnect)
    socket.on("message", handleMessage)

    return () => {
      socket.off("connect", handleConnect)
      socket.off("disconnect", handleDisconnect)
      socket.off("message", handleMessage)
      socket.disconnect()
    }
  }, [socket, options?.on])

  return { connected }
}

export function CorePage() {
  const { connected } = useRealtime()

  return (
    <main style={{ padding: "1rem" }}>
      <h1>Core</h1>
      <p>Status do realtime: {connected ? "conectado" : "desconectado"}</p>
    </main>
  )
}