-- Enable UUID extension if not already available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Stores table: Core tenant model
CREATE TABLE IF NOT EXISTS stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) UNIQUE NOT NULL,
    business_name VARCHAR(255) NOT NULL,
    api_key_hash VARCHAR(255) NOT NULL,
    device_id VARCHAR(255),
    enabled BOOLEAN NOT NULL DEFAULT true,
    admin_suspended BOOLEAN NOT NULL DEFAULT false,
    legacy_migrated_at TIMESTAMPTZ,
    last_sync_at TIMESTAMPTZ,
    sync_count INT NOT NULL DEFAULT 0,
    subscription_status VARCHAR(50),
    subscription_plan VARCHAR(100),
    subscription_expires_at TIMESTAMPTZ,
    subscription_checked_at TIMESTAMPTZ,
    info JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Products table: strictly isolated by store_id
CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    product_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'General',
    description TEXT,
    website_description TEXT,
    price NUMERIC(15, 2) NOT NULL DEFAULT 0,
    quantity INT NOT NULL DEFAULT 0,
    image_url TEXT,
    is_published BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_products_store_product UNIQUE (store_id, product_id)
);

-- Deleted stores tombstone ledger
CREATE TABLE IF NOT EXISTS deleted_stores (
    id BIGSERIAL PRIMARY KEY,
    slug VARCHAR(100) NOT NULL,
    business_name VARCHAR(255) NOT NULL,
    deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    products_count INT NOT NULL DEFAULT 0
);

-- Activity logs
CREATE TABLE IF NOT EXISTS activity_logs (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor_type VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    slug VARCHAR(100),
    details TEXT,
    ip VARCHAR(45)
);

-- Indexes for performance and isolation
CREATE INDEX IF NOT EXISTS idx_stores_slug ON stores(slug);
CREATE INDEX IF NOT EXISTS idx_stores_device_id ON stores(device_id);
CREATE INDEX IF NOT EXISTS idx_products_store_id ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_store_published_stock ON products(store_id, is_published, quantity);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(store_id, category);
