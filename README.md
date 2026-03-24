# KINGSTAR · IO — Projeto C v3.0

Frontend React + TypeScript + Tailwind do sistema KINGSTAR WMS.

## Setup

```bash
npm install
npm run dev   # → http://localhost:5173
```

Backend deve rodar em paralelo na porta 3000.

## Responsividade

| Breakpoint | Dispositivo | Sidebar |
|---|---|---|
| < 480px | Smartphones pequenos | Drawer overlay 85vw |
| 480–767px | Smartphones | Drawer overlay 85vw |
| **768px** | **Tablets portrait** | **Drawer overlay 280px** |
| 1024px+ | Desktop/notebook | Estática 240px (colapsável 72px) |

## Login + Cadastro

`/login` → toggle entre ENTRAR e CADASTRAR
- Entrar: `POST /auth/login`
- Cadastrar: `POST /auth/register`

## Terminologia

| ❌ | ✅ |
|---|---|
| Dashboard | Core |
| /dashboard | /core |
| DashboardPage | CorePage |
