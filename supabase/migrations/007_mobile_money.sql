-- Mobile Money webhook events & confirmations
CREATE TABLE IF NOT EXISTS mobile_money_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id UUID NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  operateur TEXT NOT NULL, -- 'MTN', 'Moov', 'Wave', 'Orange', 'Airtel'
  reference_externe TEXT,
  telephone TEXT,
  montant NUMERIC(15,2) NOT NULL,
  statut TEXT NOT NULL DEFAULT 'en_attente' CHECK (statut IN ('en_attente','confirme','echec')),
  vente_id UUID REFERENCES ventes(id) ON DELETE SET NULL,
  raw_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  confirmed_at TIMESTAMPTZ
);

-- Mobile Money config per operator per company
CREATE TABLE IF NOT EXISTS mobile_money_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id UUID NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  operateur TEXT NOT NULL,
  numero_marchand TEXT,
  api_key TEXT,
  webhook_secret TEXT,
  actif BOOLEAN DEFAULT FALSE,
  UNIQUE(entreprise_id, operateur)
);

ALTER TABLE mobile_money_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile_money_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mm_transactions_entreprise" ON mobile_money_transactions USING (entreprise_id = (SELECT entreprise_id FROM utilisateurs WHERE id = auth.uid()));
CREATE POLICY "mm_config_entreprise" ON mobile_money_config USING (entreprise_id = (SELECT entreprise_id FROM utilisateurs WHERE id = auth.uid()));
