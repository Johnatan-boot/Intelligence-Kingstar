# Plano Seguro de Migracao MySQL -> MongoDB

## Objetivo
Migrar a camada de persistencia para MongoDB sem interromper operacao do frontend, mantendo compatibilidade de contratos da API.

## Premissas
- Backend atual depende de MySQL, joins e transacoes.
- Frontend ja integrado com endpoints REST e socket.io.
- Migracao sera gradual (estrangulamento), sem big-bang.

## Fase 1 - Fundacao
1. Provisionar MongoDB Atlas (cluster, usuario app, IP allowlist, backups).
2. Adicionar `MONGODB_URI` e `DB_PROVIDER=mysql|mongodb`.
3. Criar camada de repositorio por dominio (`orders`, `logistics`, `inventory`) com interface comum.
4. Implementar testes de contrato para garantir mesmo payload da API.

## Fase 2 - Modelo de Dados
1. Definir colecoes:
   - `providers`
   - `purchaseOrders` (subdocumento `items`)
   - `receivingBatches`
   - `receivingConferences`
   - `orders`, `orderItems` (ou embedded por pedido)
2. Criar indices:
   - `purchaseOrders.status`
   - `purchaseOrders.providerId`
   - `receivingBatches.purchaseOrderId`
   - composto em `receivingConferences (batchId, productId, roundNumber)` unico.
3. Definir padrao de IDs (ObjectId interno + campos `legacyId` para conciliacao).

## Fase 3 - Dual Write Controlado
1. Em modulos criticos (logistics), gravar em MySQL e MongoDB em paralelo.
2. Habilitar feature flag `LOGISTICS_READ_FROM_MONGO=false`.
3. Criar job de reconciliacao diario (comparacao de totais, status e contagens).

## Fase 4 - Read Switch por Modulo
1. Ligar leitura MongoDB por modulo:
   - Primeiro `logistics`
   - Depois `reports`
   - Depois `orders`
2. Monitorar erro, latencia e divergencia por 7 dias em cada modulo.
3. Em caso de incidente, rollback por flag sem redeploy.

## Fase 5 - Cutover e Limpeza
1. Congelar escrita MySQL.
2. Rodar validacao final de consistencia.
3. Ativar `DB_PROVIDER=mongodb`.
4. Manter MySQL somente leitura por 30 dias.
5. Desativar componentes MySQL apos janela de seguranca.

## Seguranca e Governanca
- Criptografia em transito (TLS) obrigatoria.
- Segredos no provider (nunca hardcoded).
- Rotacao de credenciais trimestral.
- Auditoria de acesso de banco.

## Riscos e Mitigacoes
- **Risco:** divergencia entre bancos no dual write.
  - **Mitigacao:** tabela/colecao de outbox + reconciliacao automatica.
- **Risco:** regressao de performance em consultas agregadas.
  - **Mitigacao:** indices + pre-aggregacao por cron.
- **Risco:** quebra de contratos do frontend.
  - **Mitigacao:** testes de contrato e snapshot de payload.

## Checklist de Go-Live
- [ ] Testes E2E de Compras -> Recebimento (3 conferencias + evidencia)
- [ ] Alertas e dashboards de erro/latencia ativos
- [ ] Backup e restore testados
- [ ] Plano de rollback documentado e testado

## Variaveis de ambiente (fase dual-write)
- `DB_PROVIDER=mysql|mongodb` — leitura/escrita conforme modulo.
- `MONGODB_URI` — string Atlas (TLS obrigatorio), sem usuario root no app.
- `LOGISTICS_READ_FROM_MONGO` — flag booleana para ligar leitura por modulo.
- `LOGISTICS_DUAL_WRITE=1` — grava MySQL + Mongo em paralelo durante transicao.

## Hospedagem: API e Cloudflare
- **Cloudflare Pages** hospeda apenas o frontend estatico (Vite). Nao executa Node long-lived nem Socket.io server.
- A **API Fastify + mysql2 + Socket.io** deve rodar em servico com Node continuo (Render, Railway, Fly.io, VPS, etc.).
- **MongoDB Atlas** aceita conexao da internet: allowlist de IP do provedor da API ou `0.0.0.0/0` apenas com usuarioleast-privilege e rede privada quando possivel (VPC peering).

## Passos seguros imediatos (antes do cutover)
1. Extrair interfaces de repositorio por dominio (Orders, Logistics, Inventory).
2. Implementar `MongoLogisticsRepository` espelhando metodos do SQL atual.
3. Testes de contrato: mesmo JSON de entrada/saida nos endpoints `/logistics/*`.
4. Job de reconciliacao: contagem de `purchase_orders` e `receiving_batches` MySQL vs Mongo.
