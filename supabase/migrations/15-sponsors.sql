-- 15. Sponsors Table for AdZone
CREATE TABLE IF NOT EXISTS sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  url TEXT NOT NULL,
  icon TEXT,
  category TEXT NOT NULL, -- e.g., 'Web3 Deals', 'Dev Tools'
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access on sponsors"
  ON sponsors FOR SELECT
  USING (active = true);

-- Insert dummy data
INSERT INTO sponsors (name, description, url, icon, category)
VALUES
  ('Web3 Cloud Infra', 'High-performance RPCs and Node infrastructure with 99.9% uptime.', 'https://example.com/web3-cloud', 'Zap', 'Web3 Deals'),
  ('Smart Contract Auditor', 'Secure your smart contracts with industry-leading audits and bug bounties.', 'https://example.com/audit', 'Shield', 'Dev Tools'),
  ('Crypto API Pro', 'Real-time market data, historical charts, and on-chain analytics API.', 'https://example.com/crypto-api', 'Rocket', 'Dev Tools')
ON CONFLICT DO NOTHING;
