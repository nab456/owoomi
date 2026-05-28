-- Avoirs (credit notes / returns)
CREATE TABLE IF NOT EXISTS avoirs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id UUID NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  reference TEXT NOT NULL,
  vente_id UUID REFERENCES ventes(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_nom TEXT,
  motif TEXT,
  total NUMERIC(15,2) NOT NULL DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'brouillon' CHECK (statut IN ('brouillon','valide','rembourse')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS avoir_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  avoir_id UUID NOT NULL REFERENCES avoirs(id) ON DELETE CASCADE,
  entreprise_id UUID NOT NULL,
  produit_id UUID REFERENCES produits(id) ON DELETE SET NULL,
  nom_produit TEXT NOT NULL,
  quantite NUMERIC(10,3) NOT NULL,
  prix_unitaire NUMERIC(15,2) NOT NULL,
  total NUMERIC(15,2) NOT NULL,
  remettre_en_stock BOOLEAN DEFAULT TRUE
);

-- RLS
ALTER TABLE avoirs ENABLE ROW LEVEL SECURITY;
ALTER TABLE avoir_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "avoirs_entreprise" ON avoirs USING (entreprise_id = (SELECT entreprise_id FROM utilisateurs WHERE id = auth.uid()));
CREATE POLICY "avoir_items_entreprise" ON avoir_items USING (entreprise_id = (SELECT entreprise_id FROM utilisateurs WHERE id = auth.uid()));

-- Trigger: restore stock when avoir is validated
CREATE OR REPLACE FUNCTION restore_stock_on_avoir()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.statut = 'valide' AND OLD.statut != 'valide' THEN
    UPDATE produits p
    SET stock = p.stock + ai.quantite
    FROM avoir_items ai
    WHERE ai.avoir_id = NEW.id AND ai.produit_id = p.id AND ai.remettre_en_stock = TRUE;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_restore_stock_on_avoir ON avoirs;
CREATE TRIGGER trg_restore_stock_on_avoir
  AFTER UPDATE ON avoirs FOR EACH ROW EXECUTE FUNCTION restore_stock_on_avoir();
