-- Multi-warehouse / depots
CREATE TABLE IF NOT EXISTS depots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id UUID NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  adresse TEXT,
  est_principal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Stock per depot per product
CREATE TABLE IF NOT EXISTS stock_depots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id UUID NOT NULL,
  depot_id UUID NOT NULL REFERENCES depots(id) ON DELETE CASCADE,
  produit_id UUID NOT NULL REFERENCES produits(id) ON DELETE CASCADE,
  quantite NUMERIC(10,3) NOT NULL DEFAULT 0,
  UNIQUE(depot_id, produit_id)
);

-- Inter-depot transfers
CREATE TABLE IF NOT EXISTS transferts_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id UUID NOT NULL,
  depot_source_id UUID NOT NULL REFERENCES depots(id),
  depot_destination_id UUID NOT NULL REFERENCES depots(id),
  produit_id UUID NOT NULL REFERENCES produits(id),
  produit_nom TEXT,
  quantite NUMERIC(10,3) NOT NULL,
  notes TEXT,
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE depots ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_depots ENABLE ROW LEVEL SECURITY;
ALTER TABLE transferts_stock ENABLE ROW LEVEL SECURITY;

CREATE POLICY "depots_entreprise" ON depots USING (entreprise_id = (SELECT entreprise_id FROM utilisateurs WHERE id = auth.uid()));
CREATE POLICY "stock_depots_entreprise" ON stock_depots USING (entreprise_id = (SELECT entreprise_id FROM utilisateurs WHERE id = auth.uid()));
CREATE POLICY "transferts_stock_entreprise" ON transferts_stock USING (entreprise_id = (SELECT entreprise_id FROM utilisateurs WHERE id = auth.uid()));
