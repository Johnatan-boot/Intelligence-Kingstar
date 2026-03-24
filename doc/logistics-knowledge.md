# Guia de Inteligência Operacional — Logística KINGSTAR

Este documento serve como a Base de Conhecimento (KB) para o AdvisorBot e automações via n8n.

## 🏢 Estrutura Organizacional e Responsabilidades

### 1. Planejamento (PCP)
- **Responsável**: Gestor de Operações.
- **O que faz**: Analisa faturamento histórico (`reportsApi`), identifica rupturas (`rupturasApi`) e projeta a necessidade de novos Pedidos de Compra (PC).
- **KPI Chave**: Índice de Ruptura (Meta < 2%).

### 2. Compras
- **Responsável**: Comprador / Suprimentos.
- **O que faz**: Negocia com fornecedores cadastrados (`providers`), emite Pedidos de Compra e define a previsão de entrega/agendamento.
- **Automação**: Quando um status muda para `PURCHASED`, o n8n pode disparar aviso ao CD.

### 3. Recebimento (CD - Centro de Distribuição)
- **Responsável**: Conferente / Estoquista.
- **O que faz**: Recebe o caminhão via `license_plate`. Realiza a conferência cega (3 tentativas). Registra divergências no ato.
- **Regra de Negócio**: Se a Rodada 1 != Rodada 2, o sistema exige a Rodada 3 e bloqueia a finalização automática, notificando o setor de Compras.

### 4. Expedição (Shipments)
- **Responsável**: Supervisor de Logística.
- **O que faz**: Monitora `picking` e `shipment_status`. Garante que pedidos faturados saiam no roteiro correto.

---

## 🚛 Fluxo Completo do Ciclo (Logic Flow)
1. **PCP** identifica falta de SKU `KS-1001`.
2. **Compras** emite pedido de 50 unid. Status: `PLANNED`.
3. **Fornecedor** confirma e status vai para `IN_TRANSIT`.
4. **Caminhão** chega ao CD. Recebimento inicia sessão. Status: `IN_CONFERENCE`.
5. **Evento real-time**: `truck_arrived` -> Recebimento abre checklist.
6. **Conferência** bate 100% -> `RELEASED` -> Saldo entra no estoque (`inventoryApi.adjust`).
7. **Divergência** -> `DIVERGENT` -> Alerta via Socket.io ao Comprador para decisão manual (libera parcial ou devolve).

---

## 🤖 Automações Inteligentes (n8n & AI)
- **Alerta de Atraso**: Se `expected_delivery_date` passou e o status ainda é `PURCHASED`, o n8n envia alerta ao fornecedor via WhatsApp.
- **Score de Eficiência**: Calculado com base no tempo entre `ARRIVED` e `RELEASED`. Meta: < 2 horas.
- **Prioridade de Faturamento**: Pedidos com status `CONFIRMED` e `PAID` sobem para o topo da fila de Picking automaticamente.
