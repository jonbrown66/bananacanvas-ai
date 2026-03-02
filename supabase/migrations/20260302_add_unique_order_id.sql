-- Add UNIQUE constraint on creem_orders.order_id for upsert idempotency
ALTER TABLE creem_orders ADD CONSTRAINT creem_orders_order_id_unique UNIQUE (order_id);
