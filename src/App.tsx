import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppShell }          from '@/components/layout/AppShell'
import { LoginPage }         from '@/pages/LoginPage'
import { CorePage }          from '@/pages/CorePage'
import { EstoquePage }       from '@/pages/EstoquePage'
import { PedidosPage }       from '@/pages/PedidosPage'
import { PickingPage }       from '@/pages/PickingPage'
import { ShipmentsPage }     from '@/pages/ShipmentsPage'
import { InventarioPage }    from '@/pages/InventarioPage'
import { RecebimentoPage }   from '@/pages/RecebimentoPage'
import { ComprasPage }       from '@/pages/ComprasPage'
import { RelatoriosPage }    from '@/pages/RelatoriosPage'
import { ConfiguracoesPage } from '@/pages/ConfiguracoesPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/core" replace />} />
          <Route path="/core"          element={<CorePage />} />
          <Route path="/estoque"       element={<EstoquePage />} />
          <Route path="/pedidos"       element={<PedidosPage />} />
          <Route path="/compras"       element={<ComprasPage />} />
          <Route path="/picking"       element={<PickingPage />} />
          <Route path="/shipments"     element={<ShipmentsPage />} />
          <Route path="/inventario"    element={<InventarioPage />} />
          <Route path="/recebimento"   element={<RecebimentoPage />} />
          <Route path="/relatorios"    element={<RelatoriosPage />} />
          <Route path="/configuracoes" element={<ConfiguracoesPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/core" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
