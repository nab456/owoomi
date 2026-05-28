-- ============================================================
-- Owoo mi — Tables métier complètes
-- ============================================================

-- ---- Catégories de produits ----
CREATE TABLE IF NOT EXISTS categories (
  id            UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id UUID  NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  nom           TEXT  NOT NULL,
  description   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ---- Produits ----
CREATE TABLE IF NOT EXISTS produits (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id  UUID    NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  nom            TEXT    NOT NULL,
  sku            TEXT,
  categorie_id   UUID    REFERENCES categories(id) ON DELETE SET NULL,
  prix           NUMERIC NOT NULL DEFAULT 0,
  stock          INTEGER NOT NULL DEFAULT 0,
  stock_minimum  INTEGER NOT NULL DEFAULT 5,
  image_url      TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ---- Mouvements de stock ----
CREATE TABLE IF NOT EXISTS mouvements_stock (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id  UUID    NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  produit_id     UUID    NOT NULL REFERENCES produits(id) ON DELETE CASCADE,
  type           TEXT    NOT NULL CHECK (type IN ('entree', 'sortie', 'ajustement')),
  quantite       NUMERIC NOT NULL,
  prix_unitaire  NUMERIC,
  fournisseur_id UUID,
  reference      TEXT,
  notes          TEXT,
  user_id        UUID    REFERENCES utilisateurs(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ---- Clients ----
CREATE TABLE IF NOT EXISTS clients (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id UUID    NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  nom           TEXT    NOT NULL,
  type          TEXT    NOT NULL DEFAULT 'particulier' CHECK (type IN ('particulier', 'revendeur', 'entreprise')),
  telephone     TEXT,
  email         TEXT,
  adresse       TEXT,
  notes         TEXT,
  solde         NUMERIC NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ---- Fournisseurs ----
CREATE TABLE IF NOT EXISTS fournisseurs (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id UUID    NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  nom           TEXT    NOT NULL,
  telephone     TEXT,
  email         TEXT,
  adresse       TEXT,
  notes         TEXT,
  solde         NUMERIC NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ---- Ventes ----
CREATE TABLE IF NOT EXISTS ventes (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id UUID    NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  reference     TEXT    NOT NULL,
  type          TEXT    NOT NULL DEFAULT 'ticket' CHECK (type IN ('ticket', 'facture')),
  client_id     UUID    REFERENCES clients(id) ON DELETE SET NULL,
  vendeur_id    UUID    REFERENCES utilisateurs(id) ON DELETE SET NULL,
  statut        TEXT    NOT NULL DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'valide', 'paye', 'annule')),
  total         NUMERIC NOT NULL DEFAULT 0,
  montant_paye  NUMERIC NOT NULL DEFAULT 0,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vente_items (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  vente_id       UUID    NOT NULL REFERENCES ventes(id) ON DELETE CASCADE,
  entreprise_id  UUID    NOT NULL,
  produit_id     UUID    REFERENCES produits(id) ON DELETE SET NULL,
  nom_produit    TEXT    NOT NULL,
  quantite       NUMERIC NOT NULL,
  prix_unitaire  NUMERIC NOT NULL,
  remise         NUMERIC NOT NULL DEFAULT 0,
  total          NUMERIC NOT NULL
);

CREATE TABLE IF NOT EXISTS paiements (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  vente_id      UUID    NOT NULL REFERENCES ventes(id) ON DELETE CASCADE,
  entreprise_id UUID    NOT NULL,
  montant       NUMERIC NOT NULL,
  mode          TEXT    NOT NULL,
  reference     TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ---- Devis ----
CREATE TABLE IF NOT EXISTS devis (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id  UUID    NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  reference      TEXT    NOT NULL,
  client_id      UUID    REFERENCES clients(id) ON DELETE SET NULL,
  vendeur_id     UUID    REFERENCES utilisateurs(id) ON DELETE SET NULL,
  statut         TEXT    NOT NULL DEFAULT 'brouillon' CHECK (statut IN ('brouillon', 'envoye', 'accepte', 'refuse', 'expire')),
  total          NUMERIC NOT NULL DEFAULT 0,
  date_echeance  TIMESTAMPTZ,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS devis_items (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  devis_id      UUID    NOT NULL REFERENCES devis(id) ON DELETE CASCADE,
  entreprise_id UUID    NOT NULL,
  produit_id    UUID    REFERENCES produits(id) ON DELETE SET NULL,
  nom_produit   TEXT    NOT NULL,
  quantite      NUMERIC NOT NULL,
  prix_unitaire NUMERIC NOT NULL,
  remise        NUMERIC NOT NULL DEFAULT 0,
  total         NUMERIC NOT NULL
);

-- ---- Bons de livraison ----
CREATE TABLE IF NOT EXISTS bons_livraison (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id  UUID NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  reference      TEXT NOT NULL,
  vente_id       UUID REFERENCES ventes(id) ON DELETE SET NULL,
  client_id      UUID REFERENCES clients(id) ON DELETE SET NULL,
  statut         TEXT NOT NULL DEFAULT 'en_preparation' CHECK (statut IN ('en_preparation', 'livre', 'annule')),
  created_by     UUID REFERENCES utilisateurs(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bons_livraison_items (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  bon_id        UUID    NOT NULL REFERENCES bons_livraison(id) ON DELETE CASCADE,
  entreprise_id UUID    NOT NULL,
  produit_id    UUID    REFERENCES produits(id) ON DELETE SET NULL,
  nom_produit   TEXT    NOT NULL,
  quantite      NUMERIC NOT NULL
);

-- ---- Dépenses ----
CREATE TABLE IF NOT EXISTS depenses (
  id             UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id  UUID  NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  reference      TEXT  NOT NULL,
  date           DATE  NOT NULL DEFAULT CURRENT_DATE,
  montant        NUMERIC NOT NULL,
  categorie      TEXT  NOT NULL,
  fournisseur_id UUID  REFERENCES fournisseurs(id) ON DELETE SET NULL,
  mode_paiement  TEXT  NOT NULL,
  notes          TEXT,
  user_id        UUID  REFERENCES utilisateurs(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ---- Entrées financières ----
CREATE TABLE IF NOT EXISTS entrees (
  id            UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id UUID  NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  reference     TEXT  NOT NULL,
  date          DATE  NOT NULL DEFAULT CURRENT_DATE,
  montant       NUMERIC NOT NULL,
  categorie     TEXT  NOT NULL,
  mode_paiement TEXT  NOT NULL,
  notes         TEXT,
  user_id       UUID  REFERENCES utilisateurs(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ---- Transactions de caisse ----
CREATE TABLE IF NOT EXISTS transactions_caisse (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id    UUID    NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  type             TEXT    NOT NULL CHECK (type IN ('entree', 'sortie', 'transfert')),
  montant          NUMERIC NOT NULL,
  mode_source      TEXT    NOT NULL,
  mode_destination TEXT,
  description      TEXT,
  vente_id         UUID    REFERENCES ventes(id) ON DELETE SET NULL,
  user_id          UUID    REFERENCES utilisateurs(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ---- Paiements fournisseurs ----
CREATE TABLE IF NOT EXISTS paiements_fournisseurs (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id  UUID    NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  fournisseur_id UUID    NOT NULL REFERENCES fournisseurs(id) ON DELETE CASCADE,
  montant        NUMERIC NOT NULL,
  mode           TEXT    NOT NULL,
  reference      TEXT,
  notes          TEXT,
  user_id        UUID    REFERENCES utilisateurs(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ---- Permissions utilisateurs ----
CREATE TABLE IF NOT EXISTS permissions_utilisateurs (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  utilisateur_id UUID    NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  entreprise_id  UUID    NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  permission     TEXT    NOT NULL,
  valeur         BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(utilisateur_id, permission)
);

-- ---- Paramètres entreprise ----
CREATE TABLE IF NOT EXISTS parametres_entreprise (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id   UUID    NOT NULL UNIQUE REFERENCES entreprises(id) ON DELETE CASCADE,
  slogan          TEXT,
  description     TEXT,
  logo_url        TEXT,
  adresse         TEXT,
  ville           TEXT,
  pays            TEXT,
  telephone       TEXT,
  email           TEXT,
  website         TEXT,
  siret           TEXT,
  numero_tva      TEXT,
  capital_social  NUMERIC,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Row Level Security — tables métier
-- ============================================================

ALTER TABLE categories              ENABLE ROW LEVEL SECURITY;
ALTER TABLE produits                ENABLE ROW LEVEL SECURITY;
ALTER TABLE mouvements_stock        ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE fournisseurs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventes                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE vente_items             ENABLE ROW LEVEL SECURITY;
ALTER TABLE paiements               ENABLE ROW LEVEL SECURITY;
ALTER TABLE devis                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE devis_items             ENABLE ROW LEVEL SECURITY;
ALTER TABLE bons_livraison          ENABLE ROW LEVEL SECURITY;
ALTER TABLE bons_livraison_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE depenses                ENABLE ROW LEVEL SECURITY;
ALTER TABLE entrees                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions_caisse     ENABLE ROW LEVEL SECURITY;
ALTER TABLE paiements_fournisseurs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions_utilisateurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE parametres_entreprise   ENABLE ROW LEVEL SECURITY;

-- Macro pour toutes les tables avec entreprise_id direct
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'categories', 'produits', 'mouvements_stock', 'clients', 'fournisseurs',
    'ventes', 'devis', 'bons_livraison', 'depenses', 'entrees',
    'transactions_caisse', 'paiements_fournisseurs', 'permissions_utilisateurs',
    'parametres_entreprise'
  ]
  LOOP
    EXECUTE format('
      CREATE POLICY "%s_select" ON %s FOR SELECT
        USING (entreprise_id = get_user_entreprise_id() OR is_superadmin());
      CREATE POLICY "%s_insert" ON %s FOR INSERT
        WITH CHECK (entreprise_id = get_user_entreprise_id() OR is_superadmin());
      CREATE POLICY "%s_update" ON %s FOR UPDATE
        USING (entreprise_id = get_user_entreprise_id() OR is_superadmin());
      CREATE POLICY "%s_delete" ON %s FOR DELETE
        USING (entreprise_id = get_user_entreprise_id() OR is_superadmin());
    ', tbl, tbl, tbl, tbl, tbl, tbl, tbl, tbl);
  END LOOP;
END;
$$;

-- Tables enfants (items, paiements) — filtrées via la table parente
CREATE POLICY "vente_items_select" ON vente_items FOR SELECT
  USING (entreprise_id = get_user_entreprise_id() OR is_superadmin());
CREATE POLICY "vente_items_insert" ON vente_items FOR INSERT
  WITH CHECK (entreprise_id = get_user_entreprise_id() OR is_superadmin());
CREATE POLICY "vente_items_delete" ON vente_items FOR DELETE
  USING (entreprise_id = get_user_entreprise_id() OR is_superadmin());

CREATE POLICY "paiements_select" ON paiements FOR SELECT
  USING (entreprise_id = get_user_entreprise_id() OR is_superadmin());
CREATE POLICY "paiements_insert" ON paiements FOR INSERT
  WITH CHECK (entreprise_id = get_user_entreprise_id() OR is_superadmin());
CREATE POLICY "paiements_delete" ON paiements FOR DELETE
  USING (entreprise_id = get_user_entreprise_id() OR is_superadmin());

CREATE POLICY "devis_items_select" ON devis_items FOR SELECT
  USING (entreprise_id = get_user_entreprise_id() OR is_superadmin());
CREATE POLICY "devis_items_insert" ON devis_items FOR INSERT
  WITH CHECK (entreprise_id = get_user_entreprise_id() OR is_superadmin());
CREATE POLICY "devis_items_delete" ON devis_items FOR DELETE
  USING (entreprise_id = get_user_entreprise_id() OR is_superadmin());

CREATE POLICY "bons_livraison_items_select" ON bons_livraison_items FOR SELECT
  USING (entreprise_id = get_user_entreprise_id() OR is_superadmin());
CREATE POLICY "bons_livraison_items_insert" ON bons_livraison_items FOR INSERT
  WITH CHECK (entreprise_id = get_user_entreprise_id() OR is_superadmin());
CREATE POLICY "bons_livraison_items_delete" ON bons_livraison_items FOR DELETE
  USING (entreprise_id = get_user_entreprise_id() OR is_superadmin());

-- ============================================================
-- Trigger : mise à jour auto du stock après mouvement
-- ============================================================
CREATE OR REPLACE FUNCTION update_stock_on_movement()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.type = 'entree' THEN
    UPDATE produits SET stock = stock + NEW.quantite, updated_at = NOW()
      WHERE id = NEW.produit_id;
  ELSIF NEW.type = 'sortie' THEN
    UPDATE produits SET stock = stock - NEW.quantite, updated_at = NOW()
      WHERE id = NEW.produit_id;
  ELSIF NEW.type = 'ajustement' THEN
    UPDATE produits SET stock = NEW.quantite, updated_at = NOW()
      WHERE id = NEW.produit_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_stock
  AFTER INSERT ON mouvements_stock
  FOR EACH ROW EXECUTE FUNCTION update_stock_on_movement();

-- Trigger : mise à jour updated_at sur parametres_entreprise
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_parametres_updated_at
  BEFORE UPDATE ON parametres_entreprise
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
