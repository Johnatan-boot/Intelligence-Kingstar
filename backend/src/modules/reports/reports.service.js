// src/modules/reports/reports.service.js
// Agrega funções de outros módulos para relatórios mais ricos
import { db } from '../../shared/database/db.js';

export async function getRevenueSummary({ period = 'daily', start, end } = {}) {
  let where = "status IN ('CONFIRMED','DELIVERED')";
  const params = [];

  if (period === 'daily')        where += ' AND DATE(created_at) = CURDATE()';
  else if (period === 'monthly') where += ' AND MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())';
  else if (start && end)         { where += ' AND DATE(created_at) BETWEEN ? AND ?'; params.push(start, end); }

  const [[result]] = await db.execute(
    `SELECT SUM(total) AS revenue, COUNT(*) AS order_count FROM orders WHERE ${where}`,
    params
  );
  return { period, revenue: result.revenue || 0, order_count: result.order_count || 0 };
}

export async function getOrderStatusSummary() {
  const [rows] = await db.execute(
    `SELECT status, COUNT(*) AS count, COALESCE(SUM(total), 0) AS total_value
     FROM orders
     GROUP BY status
     ORDER BY FIELD(status,'PENDING','CONFIRMED','SHIPPED','DELIVERED','CANCELLED')`
  );
  return rows;
}

export async function getCriticalInventory(threshold = 5) {
  const [rows] = await db.execute(
    `SELECT i.product_id, p.name, p.sku,
            SUM(i.quantity) AS total_qty,
            SUM(i.reserved_quantity) AS reserved,
            SUM(i.quantity - i.reserved_quantity) AS available
     FROM inventory i
     JOIN products p ON p.id = i.product_id
     GROUP BY i.product_id
     HAVING available < ?
     ORDER BY available ASC`,
    [threshold]
  );
  return rows;
}

export async function getTopProducts(limit = 10) {
  const [rows] = await db.execute(
    `SELECT p.id, p.name, p.sku,
            SUM(oi.quantity) AS units_sold,
            SUM(oi.quantity * oi.price) AS revenue
     FROM order_items oi
     JOIN products p ON p.id = oi.product_id
     JOIN orders   o ON o.id = oi.order_id
     WHERE o.status IN ('CONFIRMED','DELIVERED')
     GROUP BY p.id
     ORDER BY units_sold DESC
     LIMIT ?`,
    [limit]
  );
  return rows;
}
export async function getDashboard() {
  const [[orders]]   = await db.execute("SELECT COUNT(*) AS total, SUM(total) AS revenue FROM orders WHERE status IN ('CONFIRMED','DELIVERED')");
  const [[pending]]  = await db.execute("SELECT COUNT(*) AS total FROM orders WHERE status = 'PENDING'");
  const [[low]]      = await db.execute("SELECT COUNT(*) AS total FROM (SELECT product_id, SUM(quantity - reserved_quantity) AS avail FROM inventory GROUP BY product_id HAVING avail < 5) t");
  const [[shipping]] = await db.execute("SELECT COUNT(*) AS total FROM shipments WHERE status IN ('PREPARING','SHIPPED','IN_TRANSIT')");
  
  // Cálculo de Eficiência (Média de tempo de conferência ou algo similar)
  // Para demo, vamos basear no faturamento e pedidos pendentes
  const efficiency = orders.total > 0 ? Math.min(95, 70 + (orders.total * 2)) : 0;

  return {
    total_orders:        orders.total || 0,
    total_revenue:       orders.revenue || 0,
    pending_orders:      pending.total || 0,
    low_stock_products:  low.total || 0,
    active_shipments:    shipping.total || 0,
    operational_score:   efficiency,
  };
}
