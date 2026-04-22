-- chameleon_licenses schema
-- Dual licensing: Lifetime + Subscription

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_key_hash VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('lifetime', 'subscription')),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  device_id VARCHAR(255),
  activation_count INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_license_key_hash ON licenses(license_key_hash);
CREATE INDEX IF NOT EXISTS idx_email ON licenses(email);
CREATE INDEX IF NOT EXISTS idx_device_id ON licenses(device_id);
CREATE INDEX IF NOT EXISTS idx_expires_at ON licenses(expires_at);
CREATE INDEX IF NOT EXISTS idx_status ON licenses(status);

-- Payment records for audit trail
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  paypal_transaction_id VARCHAR(255) UNIQUE,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  payment_type VARCHAR(50) NOT NULL, -- 'one-time', 'subscription_initial', 'subscription_renewal'
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'completed', 'failed', 'refunded'
  webhook_event_type VARCHAR(100),
  webhook_payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_license_id ON payments(license_id);
CREATE INDEX IF NOT EXISTS idx_paypal_tx ON payments(paypal_transaction_id);

-- Subscription details for recurring billing
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  paypal_subscription_id VARCHAR(255) UNIQUE,
  billing_cycle_days INTEGER DEFAULT 30,
  next_billing_date TIMESTAMP WITH TIME ZONE,
  renewal_count INTEGER DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'suspended', 'cancelled'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_license_id ON subscriptions(license_id);
CREATE INDEX IF NOT EXISTS idx_paypal_sub_id ON subscriptions(paypal_subscription_id);

-- Activation audit log
CREATE TABLE IF NOT EXISTS activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  device_id VARCHAR(255) NOT NULL,
  activation_type VARCHAR(20) NOT NULL, -- 'initial', 'reactivation', 'device_change'
  ip_address VARCHAR(45),
  user_agent TEXT,
  activated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activations_license_id ON activations(license_id);
CREATE INDEX IF NOT EXISTS idx_activations_device_id ON activations(device_id);
