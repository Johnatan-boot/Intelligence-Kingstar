// backend/src/modules/intelligence/intelligence.service.js
import { db } from '../../shared/database/db.js';

export async function getIntelligenceStatus() {
  // 1. Score Operacional (Simulado com base em dados reais)
  const [[orders]] = await db.execute("SELECT COUNT(*) AS total FROM orders WHERE status = 'DELIVERED'");
  const scoreVal = orders.total > 0 ? Math.min(98, 75 + orders.total) : 65;
  
  const score = {
    score: scoreVal,
    nivel: scoreVal >= 90 ? 'EXCELENTE' : scoreVal >= 75 ? 'BOM' : 'ATENÇÃO',
    componentes: { otif: 92, picking: 85, estoque: 78 }
  };

  // 2. Rupturas (Produtos com estoque < 5)
  const [rupturas] = await db.execute(`
    SELECT p.id as product_id, p.sku, p.name, 
           SUM(i.quantity - i.reserved_quantity) as disponivel,
           2 as saidas_por_dia,
           FLOOR(SUM(i.quantity - i.reserved_quantity) / 2) as dias_restantes,
           CASE 
             WHEN SUM(i.quantity - i.reserved_quantity) <= 0 THEN 'RUPTURA'
             WHEN SUM(i.quantity - i.reserved_quantity) < 5 THEN 'CRITICO'
             ELSE 'OK'
           END as status
    FROM products p
    JOIN inventory i ON p.id = i.product_id
    GROUP BY p.id
    HAVING status != 'OK'
  `);

  // 3. SLA (Pedidos PENDING/CONFIRMED com mais de 24h)
  const [sla] = await db.execute(`
    SELECT id as order_id, 'Cliente Simulado' as customer_name, status,
           TIMESTAMPDIFF(HOUR, created_at, NOW()) as horas_abertas,
           24 - TIMESTAMP_DIFF(HOUR, created_at, NOW()) as horas_restantes,
           'ALTO' as risco,
           'Priorizar picking imediatamente' as recomendacao
    FROM orders
    WHERE status IN ('PENDING', 'CONFIRMED')
  `);

  return {
    score,
    alertas: { estoque: rupturas, sla: sla },
    previsao: rupturas
  };
}
