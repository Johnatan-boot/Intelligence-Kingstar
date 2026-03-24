/**
 * AppShell — PROJETO C
 * Gerencia estado da sidebar (open + collapsed) e passa para Sidebar + Navbar.
 * Sincroniza CSS var --ks-sidebar-w com o estado de colapso.
 */
import { useState, useEffect } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Navbar } from './Navbar'
import { LiveTicker } from './LiveTicker'
import { ToastContainer } from '@/components/ui/ToastContainer'
import { AdvisorBot } from '@/components/core/AdvisorBot'
import { useAuthStore } from '@/store/authStore'

export function AppShell() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const [open,      setOpen]      = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  /* Sincroniza largura da sidebar com CSS var para animação suave */
  useEffect(() => {
    document.documentElement.style.setProperty(
      '--ks-sidebar-w', collapsed ? '72px' : '240px'
    )
  }, [collapsed])

  /* Fecha drawer ao redimensionar para desktop */
  useEffect(() => {
    const handler = () => { if (window.innerWidth >= 1024) setOpen(false) }
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  if (!isAuthenticated) return <Navigate to="/login" replace />

  return (
    <div className="ks-wrapper">
      <Sidebar
        open={open}
        collapsed={collapsed}
        onClose={() => setOpen(false)}
        onCollapse={() => setCollapsed(c => !c)}
      />
      <div className="ks-main-content">
        <Navbar onMenuToggle={() => setOpen(o => !o)} />
        <LiveTicker />
        <Outlet />
      </div>
      <ToastContainer />
      <AdvisorBot />
    </div>
  )
}
