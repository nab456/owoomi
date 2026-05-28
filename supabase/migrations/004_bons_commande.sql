-- Bons de commande fournisseurs
CREATE TABLE IF NOT EXISTS bons_commande (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id UUID NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  reference TEXT NOT NULL,
  fournisseur_id UUID REFERENCES fournisseurs(id) ON DELETE SET NULL,
  fournisseur_nom TEXT,
  statut TEXT NOT NULL DEFAULT 'brouillon' CHECK (statut IN ('brouillon','envoye','partiel','recu','annule')),
  total NUMERIC(15,2) NOT NULL DEFAULT 0,
  date_livraison_prevue DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bon_commande_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bon_commande_id UUID NOT NULL REFERENCES bons_commande(id) ON DELETE CASCADE,
  entreprise_id UUID NOT NULL,
  produit_id UUID REFERENCES produits(id) ON DELETE SET NULL,
  nom_produit TEXT NOT NULL,
  quantite_commandee NUMERIC(10,3) NOT NULL,
  quantite_recue NUMERIC(10,3) NOT NULL DEFAULT 0,
  prix_unitaire NUMERIC(15,2) NOT NULL,
  total NUMERIC(15,2) NOT NULL
);

ALTER TABLE bons_commande ENABLE ROW LEVEL SECURITY;
ALTER TABLE bon_commande_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bons_commande_entreprise" ON bons_commande USING (entreprise_id = (SELECT entreprise_id FROM utilisateurs WHERE id = auth.uid()));
CREATE POLICY "bon_commande_items_entreprise" ON bon_commande_items USING (entreprise_id = (SELECT entreprise_id FROM utilisateurs WHERE id = auth.uid()));
