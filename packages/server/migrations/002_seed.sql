-- ============================================================================
-- Kontext v1 — Seed Data (Demo Org)
-- ============================================================================

INSERT INTO orgs (org_id, org_name, plan) VALUES
  ('org_legaci_demo', 'Legaci Labs (Demo)', 'starter');

INSERT INTO org_users (user_id, org_id, email, role, permissions) VALUES
  ('usr_admin_demo', 'org_legaci_demo', 'vinay@getlegaci.com', 'admin', '{read,write,export,admin}');

INSERT INTO wallet_registry (wallet_id, org_id, address, chain, label, monitoring_status) VALUES
  ('wal_demo_treasury', 'org_legaci_demo', '0x742d35cc6634c0532925a3b844bc9e7595f2bd38', 'base', 'Treasury Agent Wallet', 'monitored'),
  ('wal_demo_fx', 'org_legaci_demo', '0x53d284357ec70ce289d6d64134dfac8e511c8a3d', 'base', 'FX Router Wallet', 'monitored'),
  ('wal_demo_supplier', 'org_legaci_demo', '0xab7c74abc0c4d48d1bdad5dcb26153fc8780f83e', 'ethereum', 'Supplier Bot Wallet', 'monitored'),
  ('wal_demo_payroll', 'org_legaci_demo', '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984', 'base', 'Payroll Agent Wallet', 'monitored'),
  ('wal_demo_settlement', 'org_legaci_demo', '0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae', 'polygon', 'Settlement Agent Wallet', 'partial');
