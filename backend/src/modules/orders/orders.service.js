import { db } from "../../shared/database/db.js";

// =========================
// ✅ CRIAR PEDIDO
// =========================
const ZAPIER_WEBHOOK_URL = "https://hooks.zapier.com/hooks/catch/123456/abc";

export async function createOrder(data) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();
    const { customer_id, items } = data;

    if (!items || items.length === 0) {
      throw new Error("Pedido sem itens");
    }

    // 🧾 Criar pedido com status PENDING
    const [orderResult] = await connection.execute(
      `INSERT INTO orders (customer_id, status) VALUES (?, 'PENDING')`,
      [customer_id],
    );
    const orderId = orderResult.insertId;

    // 🔄 Processar itens e calcular total
    let total = 0;
    for (const item of items) {
      const { product_id, quantity, price } = item;

      // 🔒 Lock no estoque
      const [inventoryRows] = await connection.execute(
        `SELECT quantity, reserved_quantity FROM inventory WHERE product_id = ? FOR UPDATE`,
        [product_id],
      );

      if (!inventoryRows.length) {
        throw new Error(`Produto ${product_id} não encontrado no estoque`);
      }

      const available =
        inventoryRows[0].quantity - inventoryRows[0].reserved_quantity;
      if (available < quantity) {
        throw new Error(`Estoque insuficiente para produto ${product_id}`);
      }

      // 🧾 Inserir item do pedido
      await connection.execute(
        `INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)`,
        [orderId, product_id, quantity, price],
      );

      // 🔒 Reservar estoque
      await connection.execute(
        `UPDATE inventory SET reserved_quantity = reserved_quantity + ? WHERE product_id = ?`,
        [quantity, product_id],
      );

      // 📦 Criar registro de reserva
      await connection.execute(
        `INSERT INTO stock_reservations (order_id, product_id, quantity, status) VALUES (?, ?, ?, 'RESERVED')`,
        [orderId, product_id, quantity],
      );

      total += quantity * price;
    }

    // 💰 Atualizar total do pedido
    await connection.execute(`UPDATE orders SET total = ? WHERE id = ?`, [
      total,
      orderId,
    ]);
    await connection.commit();

    async function sendOrderWebhook(order) {
      try {
        await fetch(ZAPIER_WEBHOOK_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pedido_id: order.order_id,
            total: order.total,
          }),
        });
      } catch (error) {
        console.error("Erro ao enviar webhook:", error.message);
      }
    }

    await connection.commit();

    // 🔥 DISPARO DO WEBHOOK (NÃO BLOQUEANTE)
    sendOrderWebhook({
      order_id: orderId,
      total,
    });

    return { success: true, order_id: orderId, total };

    return { success: true, order_id: orderId, total };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

// =========================
// ✅ LISTAR PEDIDOS
// =========================
export async function listOrders() {
  const [rows] = await db.execute(`SELECT * FROM orders ORDER BY id DESC`);
  return rows;
}

// =========================
// ❌ CANCELAR PEDIDO
// =========================
export async function cancelOrder(orderId) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();
    const id = Number(orderId);

    const [orders] = await connection.execute(
      `SELECT id, status FROM orders WHERE id = ? FOR UPDATE`,
      [id],
    );
    if (!orders.length) throw new Error("Pedido não encontrado");

    const order = orders[0];
    if (order.status === "CANCELLED") throw new Error("Pedido já cancelado");

    // 🔍 Reservas bloqueadas
    const [reservations] = await connection.execute(
      `SELECT product_id, quantity FROM stock_reservations WHERE order_id = ? AND status = 'RESERVED' FOR UPDATE`,
      [id],
    );

    // 🔓 Liberar estoque
    for (const r of reservations) {
      await connection.execute(
        `UPDATE inventory SET reserved_quantity = GREATEST(reserved_quantity - ?, 0) WHERE product_id = ?`,
        [r.quantity, r.product_id],
      );
    }

    // ❌ Cancelar reservas e pedido
    await connection.execute(
      `UPDATE stock_reservations SET status = 'CANCELLED' WHERE order_id = ?`,
      [id],
    );
    await connection.execute(
      `UPDATE orders SET status = 'CANCELLED' WHERE id = ?`,
      [id],
    );

    await connection.commit();
    return { success: true, message: "Pedido cancelado com sucesso" };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

// =========================
// ✅ CALCULAR FATURAMENTO DIÁRIO/MENSAL
// period = 'daily' | 'monthly' | {start, end}
// =========================
export async function getRevenue(period = "daily") {
  let query = `SELECT SUM(total) AS revenue FROM orders WHERE status IN ('CONFIRMED','DELIVERED')`;
  const params = [];

  if (period === "daily") {
    query += ` AND DATE(created_at) = CURDATE()`;
  } else if (period === "monthly") {
    query += ` AND MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())`;
  } else if (period.start && period.end) {
    query += ` AND DATE(created_at) BETWEEN ? AND ?`;
    params.push(period.start, period.end);
  }

  const [rows] = await db.execute(query, params);
  return rows[0] || { revenue: 0 };
}

// =========================
// ✅ RELATÓRIO DE ESTOQUE CRÍTICO
// threshold = quantidade mínima disponível
// =========================
export async function getCriticalInventory(threshold = 5) {
  const [rows] = await db.execute(
    `SELECT i.product_id, p.name, i.quantity, i.reserved_quantity,
            (i.quantity - i.reserved_quantity) AS available
     FROM inventory i
     JOIN products p ON p.id = i.product_id
     WHERE (i.quantity - i.reserved_quantity) < ?`,
    [threshold],
  );

  return rows;
}

// =========================
// ✅ RESUMO DE PEDIDOS POR STATUS  (FIX - exportado para reports.routes.js)
// =========================
export async function getOrderSummary() {
  const [rows] = await db.execute(
    `SELECT status,
            COUNT(*)   AS count,
            SUM(total) AS total_value
     FROM orders
     GROUP BY status
     ORDER BY FIELD(status,'PENDING','CONFIRMED','SHIPPED','DELIVERED','CANCELLED')`,
  );
  return rows;
}

// =========================
// ✅ DETALHAR PEDIDO
// =========================
export async function getOrder(orderId) {
  const [orders] = await db.execute(
    `SELECT o.*, c.name AS customer_name, c.email AS customer_email
     FROM orders o
     JOIN customers c ON c.id = o.customer_id
     WHERE o.id = ?`,
    [orderId],
  );
  if (!orders.length) throw new Error("Pedido não encontrado");

  const [items] = await db.execute(
    `SELECT oi.id, oi.product_id, p.name AS product_name, p.sku,
            oi.quantity, oi.price,
            (oi.quantity * oi.price) AS subtotal
     FROM order_items oi
     JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = ?`,
    [orderId],
  );

  return { ...orders[0], items };
}

// =========================
// ✅ CONFIRMAR PEDIDO
// =========================
export async function confirmOrder(orderId) {
  const [rows] = await db.execute("SELECT status FROM orders WHERE id = ?", [
    orderId,
  ]);
  if (!rows.length) throw new Error("Pedido não encontrado");
  if (rows[0].status !== "PENDING")
    throw new Error("Apenas pedidos PENDING podem ser confirmados");

  await db.execute("UPDATE orders SET status = 'CONFIRMED' WHERE id = ?", [
    orderId,
  ]);
  return { success: true, order_id: orderId, status: "CONFIRMED" };
}

/* ESTA VERSÃO ACIMA  TEMOS  Com essa versão você já tem:

Criar pedido com reserva de estoque

Listar pedidos em ordem decrescente

Cancelar pedido com liberação de estoque

Calcular faturamento diário/mensal

Relatório de estoque crítico*/

/* Tudo que você acabou de ver no código do Fastify já está coberto:

Criar pedido → POST /orders

Listar pedidos → GET /orders

Cancelar pedido → PUT /orders/:id/cancel

Relatórios → GET /revenue e GET /inventory/critical

Com os dados que você populou na base, você já consegue testar toda a cadeia: criar pedidos, reservar estoque, cancelar, verificar totais e estoque crítico, sem precisar de nada adicional.

O que falta agora seria só rodar esses endpoints e conferir os retornos, mas toda a lógica já está implementada e pronta para uso.

Se quiser, posso te sugerir a ordem exata de testes, usando os IDs que você já tem, para validar tudo passo a passo. Quer que eu faça isso?

AMANHA PRIMEIRA TAREFA DO DIA SERÁ EXECUTAR TESTES DE TODOS OS ENDPOINTS




*/

/* ========================================================================================
VERSÃO FUNCIONAL 1 PONTO ANTERIOR POSSO USAR COMO UM PONTO DE PARTIDA CASO NAO TENHA OPÇÃO 
É SO PARA NAO TER QUE RECONSTRUIR O CODIGO DO ZERO 
17/03/2026     17:32
import { db } from "../../shared/database/db.js";

// ✅ CRIAR PEDIDO (com transação e total calculado)
export async function createOrder(data) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { customer_id, items } = data;

    if (!items || items.length === 0) {
      throw new Error("Pedido sem itens");
    }

    // 🧾 1. Criar pedido com status compatível com ENUM
    const [orderResult] = await connection.execute(
      `INSERT INTO orders (customer_id, status)
       VALUES (?, 'PENDING')`,
      [customer_id]
    );

    const orderId = orderResult.insertId;

    // 🔄 2. Processar itens do pedido
    let total = 0;

    for (const item of items) {
      const { product_id, quantity, price } = item;

      // 🔒 lock no estoque
      const [inventoryRows] = await connection.execute(
        `SELECT quantity, reserved_quantity
         FROM inventory
         WHERE product_id = ?
         FOR UPDATE`,
        [product_id]
      );

      if (inventoryRows.length === 0) {
        throw new Error(`Produto ${product_id} não encontrado no estoque`);
      }

      const inventory = inventoryRows[0];
      const available = inventory.quantity - inventory.reserved_quantity;

      if (available < quantity) {
        throw new Error(`Estoque insuficiente para produto ${product_id}`);
      }

      // 🧾 Inserir item do pedido
      await connection.execute(
        `INSERT INTO order_items (order_id, product_id, quantity, price)
         VALUES (?, ?, ?, ?)`,
        [orderId, product_id, quantity, price]
      );

      // 🔒 Reservar estoque
      await connection.execute(
        `UPDATE inventory
         SET reserved_quantity = reserved_quantity + ?
         WHERE product_id = ?`,
        [quantity, product_id]
      );

      // 📦 Registrar reserva
      await connection.execute(
        `INSERT INTO stock_reservations (order_id, product_id, quantity, status)
         VALUES (?, ?, ?, 'RESERVED')`,
        [orderId, product_id, quantity]
      );

      total += quantity * price;
    }

    // 💰 Atualizar total do pedido
    await connection.execute(
      `UPDATE orders SET total = ? WHERE id = ?`,
      [total, orderId]
    );

    await connection.commit();

    return {
      success: true,
      order_id: orderId,
      total
    };

  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

// ✅ LISTAR PEDIDOS
export async function listOrders() {
  const [rows] = await db.execute(
    `SELECT * FROM orders ORDER BY id DESC`
  );

  return rows;
}

// ❗ CANCELAR PEDIDO (com transação segura)
export async function cancelOrder(orderId) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const id = Number(orderId);

    // 🔒 1. Validar pedido e travar
    const [orders] = await connection.execute(
      `SELECT id, status 
       FROM orders 
       WHERE id = ? 
       FOR UPDATE`,
      [id]
    );

    if (orders.length === 0) {
      throw new Error("Pedido não encontrado");
    }

    const order = orders[0];

    if (order.status === "CANCELLED") {
      throw new Error("Pedido já está cancelado");
    }

    // 🔍 2. Buscar reservas com lock
    const [reservations] = await connection.execute(
      `SELECT product_id, quantity 
       FROM stock_reservations 
       WHERE order_id = ? AND status = 'RESERVED'
       FOR UPDATE`,
      [id]
    );

    // 🔓 3. Liberar estoque
    for (const item of reservations) {
      await connection.execute(
        `UPDATE inventory
         SET reserved_quantity = GREATEST(reserved_quantity - ?, 0)
         WHERE product_id = ?`,
        [item.quantity, item.product_id]
      );
    }

    // ❌ 4. Cancelar reservas
    await connection.execute(
      `UPDATE stock_reservations
       SET status = 'CANCELLED'
       WHERE order_id = ?`,
      [id]
    );

    // ❌ 5. Cancelar pedido
    await connection.execute(
      `UPDATE orders
       SET status = 'CANCELLED'
       WHERE id = ?`,
      [id]
    );

    await connection.commit();

    return {
      success: true,
      message: "Pedido cancelado com sucesso"
    };

  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}*/
