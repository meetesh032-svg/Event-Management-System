import { pool } from "./index";

async function migrate() {
  console.log("Starting real payment gateway database migration...");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Payment Orders table
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        order_id VARCHAR(64) NOT NULL UNIQUE,
        event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        gateway VARCHAR(50) NOT NULL,
        gateway_order_id VARCHAR(255),
        quantity INTEGER NOT NULL DEFAULT 1,
        seats TEXT,
        subtotal_cents INTEGER NOT NULL,
        platform_fee_cents INTEGER NOT NULL DEFAULT 500,
        convenience_fee_cents INTEGER NOT NULL DEFAULT 2500,
        taxes_cents INTEGER NOT NULL DEFAULT 0,
        discount_cents INTEGER NOT NULL DEFAULT 0,
        wallet_amount_cents INTEGER NOT NULL DEFAULT 0,
        total_amount_cents INTEGER NOT NULL,
        currency VARCHAR(10) NOT NULL DEFAULT 'INR',
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        coupon_code VARCHAR(50),
        customer_details TEXT,
        client_secret TEXT,
        checkout_url TEXT,
        gateway_payload TEXT,
        expires_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    // 2. Payments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        order_id VARCHAR(64) REFERENCES orders(order_id) ON DELETE SET NULL,
        booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        gateway VARCHAR(50) NOT NULL,
        gateway_payment_id VARCHAR(255) NOT NULL,
        gateway_order_id VARCHAR(255),
        gateway_signature TEXT,
        amount_cents INTEGER NOT NULL,
        currency VARCHAR(10) NOT NULL DEFAULT 'INR',
        status VARCHAR(50) NOT NULL DEFAULT 'initiated',
        payment_method VARCHAR(50),
        payment_method_details TEXT,
        error_message TEXT,
        raw_payload TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    // 3. Transactions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        transaction_reference VARCHAR(64) NOT NULL UNIQUE,
        order_id VARCHAR(64),
        payment_id INTEGER REFERENCES payments(id) ON DELETE SET NULL,
        booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        gateway VARCHAR(50) NOT NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'charge',
        amount_cents INTEGER NOT NULL,
        currency VARCHAR(10) NOT NULL DEFAULT 'INR',
        status VARCHAR(50) NOT NULL DEFAULT 'succeeded',
        gateway_response TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    // 4. Invoices table
    await client.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        invoice_number VARCHAR(64) NOT NULL UNIQUE,
        booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        subtotal_cents INTEGER NOT NULL,
        platform_fee_cents INTEGER NOT NULL DEFAULT 500,
        convenience_fee_cents INTEGER NOT NULL DEFAULT 2500,
        taxes_cents INTEGER NOT NULL DEFAULT 0,
        discount_cents INTEGER NOT NULL DEFAULT 0,
        total_cents INTEGER NOT NULL,
        currency VARCHAR(10) NOT NULL DEFAULT 'INR',
        status VARCHAR(20) NOT NULL DEFAULT 'paid',
        invoice_pdf_url VARCHAR(500),
        issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    // 5. Receipts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS receipts (
        id SERIAL PRIMARY KEY,
        receipt_number VARCHAR(64) NOT NULL UNIQUE,
        booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
        order_id VARCHAR(64),
        transaction_id VARCHAR(255) NOT NULL,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount_cents INTEGER NOT NULL,
        currency VARCHAR(10) NOT NULL DEFAULT 'INR',
        payment_method VARCHAR(50) NOT NULL,
        gateway VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'completed',
        issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    // 6. Refunds table (in case not created)
    await client.query(`
      CREATE TABLE IF NOT EXISTS refunds (
        id SERIAL PRIMARY KEY,
        booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        gateway VARCHAR(50) NOT NULL,
        transaction_id VARCHAR(255) NOT NULL,
        refund_id VARCHAR(255) NOT NULL,
        amount_cents INTEGER NOT NULL,
        currency VARCHAR(10) NOT NULL DEFAULT 'INR',
        reason TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'succeeded',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    // 7. Webhook Logs table (in case not created)
    await client.query(`
      CREATE TABLE IF NOT EXISTS webhook_logs (
        id SERIAL PRIMARY KEY,
        gateway VARCHAR(50) NOT NULL,
        event_type VARCHAR(100) NOT NULL,
        payload TEXT,
        signature VARCHAR(500),
        status VARCHAR(50) NOT NULL DEFAULT 'received',
        error_message TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    await client.query("COMMIT");
    console.log("Real payment database tables migrated successfully!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
