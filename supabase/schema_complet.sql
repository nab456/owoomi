-- ============================================================
--  Owoo mi — Schéma complet (toutes tables, triggers, RLS)
--  À exécuter une seule fois sur une base Supabase vierge.
--  Ordre respecté pour les dépendances entre tables.
-- ============================================================

-- ============================================================
-- 0. EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- gen_random_uuid()


-- ============================================================
-- 1. FONCTIONS HELPER (utilisées dans les policies)
-- ============================================================

-- Retourne l'entreprise_id de l'utilisateur connecté
CREATE OR REPLACE FUNCTION get_user_entreprise_id()
RETURNS UUID LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT entreprise_id FROM utilisateurs WHERE id = auth.uid();
$$;

-- Vrai si l'utilisateur connecté est superadmin
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM utilisateurs WHERE id = auth.uid() AND role = 'superadmin'
  );
$$;

-- Mise à jour auto de updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


-- ============================================================
-- 2. TABLES RACINE
-- ============================================================

-- ---- Entreprises (tenants) ----
CREATE TABLE IF NOT EXISTS entreprises (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nom               TEXT        NOT NULL,
  statut            TEXT        NOT NULL DEFAULT 'actif'
                                CHECK (statut IN ('actif', 'suspendu')),
  abonnement        TEXT        NOT NULL DEFAULT 'gratuit',
  date_souscription TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date_expiration   TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  limites           JSONB       NOT NULL DEFAULT '{
    "maxMembres": 2,
    "maxProduits": 50,
    "maxCommerciaux": 1,
    "features": ["dashboard", "ventes", "clients"]
  }'::jsonb
);

-- ---- Catalogue des plans d'abonnement ----
CREATE TABLE IF NOT EXISTS abonnements (
  id          TEXT    PRIMARY KEY,
  nom         TEXT    NOT NULL,
  prix        NUMERIC NOT NULL,
  description TEXT    NOT NULL,
  features    TEXT[]  NOT NULL DEFAULT '{}',
  limites     JSONB   NOT NULL DEFAULT '{}'
);

-- ---- Utilisateurs (miroir de auth.users) ----
CREATE TABLE IF NOT EXISTS utilisateurs (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nom           TEXT NOT NULL,
  email         TEXT NOT NULL,
  entreprise_id UUID REFERENCES entreprises(id) ON DELETE SET NULL,
  role          TEXT NOT NULL DEFAULT 'PDG'
                CHECK (role IN ('PDG', 'comptable', 'commercial', 'gestionnaire', 'superadmin')),
  statut        TEXT NOT NULL DEFAULT 'actif'
                CHECK (statut IN ('actif', 'inactif'))
);


-- ============================================================
-- 3. RÉFÉRENTIEL PRODUITS
-- ============================================================

-- ---- Catégories ----
CREATE TABLE IF NOT EXISTS categories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id UUID NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  nom           TEXT NOT NULL,
  description   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ---- Produits ----
CREATE TABLE IF NOT EXISTS produits (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id UUID    NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  nom           TEXT    NOT NULL,
  sku           TEXT,
  categorie_id  UUID    REFERENCES categories(id) ON DELETE SET NULL,
  prix          NUMERIC NOT NULL DEFAULT 0,
  stock         INTEGER NOT NULL DEFAULT 0,
  stock_minimum INTEGER NOT NULL DEFAULT 5,
  image_url     TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ---- Mouvements de stock ----
CREATE TABLE IF NOT EXISTS mouvements_stock (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id  UUID    NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  produit_id     UUID    NOT NULL REFERENCES produits(id) ON DELETE CASCADE,
  type           TEXT    NOT NULL CHECK (type IN ('entree', 'sortie', 'ajustement')),
  quantite       NUMERIC NOT NULL,
  prix_unitaire  NUMERIC,
  fournisseur_id UUID,  -- référence souple (pas de FK pour éviter la dépendance circulaire)
  reference      TEXT,
  notes          TEXT,
  user_id        UUID    REFERENCES utilisateurs(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- 4. CLIENTS & FOURNISSEURS
-- ============================================================

-- ---- Clients ----
CREATE TABLE IF NOT EXISTS clients (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id UUID    NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  nom           TEXT    NOT NULL,
  type          TEXT    NOT NULL DEFAULT 'particulier'
                CHECK (type IN ('particulier', 'revendeur', 'entreprise')),
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


-- ============================================================
-- 5. VENTES & FACTURATION
-- ============================================================

-- ---- Ventes ----
CREATE TABLE IF NOT EXISTS ventes (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id UUID    NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  reference     TEXT    NOT NULL,
  type          TEXT    NOT NULL DEFAULT 'ticket'
                CHECK (type IN ('ticket', 'facture')),
  client_id     UUID    REFERENCES clients(id) ON DELETE SET NULL,
  vendeur_id    UUID    REFERENCES utilisateurs(id) ON DELETE SET NULL,
  statut        TEXT    NOT NULL DEFAULT 'en_attente'
                CHECK (statut IN ('en_attente', 'valide', 'paye', 'annule')),
  total         NUMERIC NOT NULL DEFAULT 0,
  montant_paye  NUMERIC NOT NULL DEFAULT 0,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ---- Lignes de vente ----
CREATE TABLE IF NOT EXISTS vente_items (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  vente_id      UUID    NOT NULL REFERENCES ventes(id) ON DELETE CASCADE,
  entreprise_id UUID    NOT NULL,
  produit_id    UUID    REFERENCES produits(id) ON DELETE SET NULL,
  nom_produit   TEXT    NOT NULL,
  quantite      NUMERIC NOT NULL,
  prix_unitaire NUMERIC NOT NULL,
  remise        NUMERIC NOT NULL DEFAULT 0,
  total         NUMERIC NOT NULL
);

-- ---- Paiements (liés à une vente) ----
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
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id UUID    NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  reference     TEXT    NOT NULL,
  client_id     UUID    REFERENCES clients(id) ON DELETE SET NULL,
  vendeur_id    UUID    REFERENCES utilisateurs(id) ON DELETE SET NULL,
  statut        TEXT    NOT NULL DEFAULT 'brouillon'
                CHECK (statut IN ('brouillon', 'envoye', 'accepte', 'refuse', 'expire')),
  total         NUMERIC NOT NULL DEFAULT 0,
  date_echeance TIMESTAMPTZ,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ---- Lignes de devis ----
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
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id UUID NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  reference     TEXT NOT NULL,
  vente_id      UUID REFERENCES ventes(id) ON DELETE SET NULL,
  client_id     UUID REFERENCES clients(id) ON DELETE SET NULL,
  statut        TEXT NOT NULL DEFAULT 'en_preparation'
                CHECK (statut IN ('en_preparation', 'livre', 'annule')),
  created_by    UUID REFERENCES utilisateurs(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ---- Lignes de bon de livraison ----
CREATE TABLE IF NOT EXISTS bons_livraison_items (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  bon_id        UUID    NOT NULL REFERENCES bons_livraison(id) ON DELETE CASCADE,
  entreprise_id UUID    NOT NULL,
  produit_id    UUID    REFERENCES produits(id) ON DELETE SET NULL,
  nom_produit   TEXT    NOT NULL,
  quantite      NUMERIC NOT NULL
);

-- ---- Avoirs / Retours ----
CREATE TABLE IF NOT EXISTS avoirs (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id UUID    NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  reference     TEXT    NOT NULL,
  vente_id      UUID    REFERENCES ventes(id) ON DELETE SET NULL,
  client_id     UUID    REFERENCES clients(id) ON DELETE SET NULL,
  client_nom    TEXT,
  motif         TEXT,
  total         NUMERIC(15,2) NOT NULL DEFAULT 0,
  statut        TEXT    NOT NULL DEFAULT 'brouillon'
                CHECK (statut IN ('brouillon', 'valide', 'rembourse')),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ---- Lignes d'avoir ----
CREATE TABLE IF NOT EXISTS avoir_items (
  id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  avoir_id          UUID    NOT NULL REFERENCES avoirs(id) ON DELETE CASCADE,
  entreprise_id     UUID    NOT NULL,
  produit_id        UUID    REFERENCES produits(id) ON DELETE SET NULL,
  nom_produit       TEXT    NOT NULL,
  quantite          NUMERIC(10,3) NOT NULL,
  prix_unitaire     NUMERIC(15,2) NOT NULL,
  total             NUMERIC(15,2) NOT NULL,
  remettre_en_stock BOOLEAN DEFAULT TRUE
);

-- ---- Relances clients (pipeline J+7 / J+15 / J+30) ----
CREATE TABLE IF NOT EXISTS relances (
  id                 UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id      UUID    NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  vente_id           UUID    NOT NULL REFERENCES ventes(id) ON DELETE CASCADE,
  client_id          UUID    REFERENCES clients(id) ON DELETE SET NULL,
  niveau             INTEGER NOT NULL CHECK (niveau IN (7, 15, 30)),
  statut             TEXT    NOT NULL DEFAULT 'planifie'
                     CHECK (statut IN ('planifie', 'envoye', 'ignore')),
  email_destinataire TEXT,
  sent_at            TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vente_id, niveau)
);


-- ============================================================
-- 6. FINANCES
-- ============================================================

-- ---- Dépenses ----
CREATE TABLE IF NOT EXISTS depenses (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id  UUID    NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  reference      TEXT    NOT NULL,
  date           DATE    NOT NULL DEFAULT CURRENT_DATE,
  montant        NUMERIC NOT NULL,
  categorie      TEXT    NOT NULL,
  fournisseur_id UUID    REFERENCES fournisseurs(id) ON DELETE SET NULL,
  mode_paiement  TEXT    NOT NULL,
  notes          TEXT,
  user_id        UUID    REFERENCES utilisateurs(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ---- Entrées financières ----
CREATE TABLE IF NOT EXISTS entrees (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id UUID    NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  reference     TEXT    NOT NULL,
  date          DATE    NOT NULL DEFAULT CURRENT_DATE,
  montant       NUMERIC NOT NULL,
  categorie     TEXT    NOT NULL,
  mode_paiement TEXT    NOT NULL,
  notes         TEXT,
  user_id       UUID    REFERENCES utilisateurs(id) ON DELETE SET NULL,
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

-- ---- Journal comptable (OHADA) ----
CREATE TABLE IF NOT EXISTS journal_entries (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id UUID    NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  date          DATE    NOT NULL DEFAULT CURRENT_DATE,
  libelle       TEXT    NOT NULL,
  compte_debit  TEXT    NOT NULL,  -- ex: '411', '701', '512'
  compte_credit TEXT    NOT NULL,
  montant       NUMERIC(15,2) NOT NULL,
  source_type   TEXT,              -- 'vente' | 'depense' | 'entree' | 'paiement'
  source_id     UUID,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- 7. ÉQUIPE & PARAMÈTRES
-- ============================================================

-- ---- Permissions par utilisateur ----
CREATE TABLE IF NOT EXISTS permissions_utilisateurs (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  utilisateur_id UUID    NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  entreprise_id  UUID    NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  permission     TEXT    NOT NULL,
  valeur         BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(utilisateur_id, permission)
);

-- ---- Paramètres de l'entreprise ----
CREATE TABLE IF NOT EXISTS parametres_entreprise (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id  UUID    NOT NULL UNIQUE REFERENCES entreprises(id) ON DELETE CASCADE,
  slogan         TEXT,
  description    TEXT,
  logo_url       TEXT,
  adresse        TEXT,
  ville          TEXT,
  pays           TEXT,
  telephone      TEXT,
  email          TEXT,
  website        TEXT,
  siret          TEXT,
  numero_tva     TEXT,
  capital_social NUMERIC,
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- 8. FOURNISSEURS — BONS DE COMMANDE
-- ============================================================

-- ---- Bons de commande ----
CREATE TABLE IF NOT EXISTS bons_commande (
  id                    UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id         UUID    NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  reference             TEXT    NOT NULL,
  fournisseur_id        UUID    REFERENCES fournisseurs(id) ON DELETE SET NULL,
  fournisseur_nom       TEXT,
  statut                TEXT    NOT NULL DEFAULT 'brouillon'
                        CHECK (statut IN ('brouillon', 'envoye', 'partiel', 'recu', 'annule')),
  total                 NUMERIC(15,2) NOT NULL DEFAULT 0,
  date_livraison_prevue DATE,
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ---- Lignes de bon de commande ----
CREATE TABLE IF NOT EXISTS bon_commande_items (
  id                  UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  bon_commande_id     UUID    NOT NULL REFERENCES bons_commande(id) ON DELETE CASCADE,
  entreprise_id       UUID    NOT NULL,
  produit_id          UUID    REFERENCES produits(id) ON DELETE SET NULL,
  nom_produit         TEXT    NOT NULL,
  quantite_commandee  NUMERIC(10,3) NOT NULL,
  quantite_recue      NUMERIC(10,3) NOT NULL DEFAULT 0,
  prix_unitaire       NUMERIC(15,2) NOT NULL,
  total               NUMERIC(15,2) NOT NULL
);


-- ============================================================
-- 9. GESTION MULTI-DÉPÔTS
-- ============================================================

-- ---- Dépôts / Entrepôts ----
CREATE TABLE IF NOT EXISTS depots (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id UUID    NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  nom           TEXT    NOT NULL,
  adresse       TEXT,
  est_principal BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ---- Stock par dépôt et par produit ----
CREATE TABLE IF NOT EXISTS stock_depots (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id UUID    NOT NULL,
  depot_id      UUID    NOT NULL REFERENCES depots(id) ON DELETE CASCADE,
  produit_id    UUID    NOT NULL REFERENCES produits(id) ON DELETE CASCADE,
  quantite      NUMERIC(10,3) NOT NULL DEFAULT 0,
  UNIQUE(depot_id, produit_id)
);

-- ---- Transferts inter-dépôts ----
CREATE TABLE IF NOT EXISTS transferts_stock (
  id                   UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id        UUID    NOT NULL,
  depot_source_id      UUID    NOT NULL REFERENCES depots(id),
  depot_destination_id UUID    NOT NULL REFERENCES depots(id),
  produit_id           UUID    NOT NULL REFERENCES produits(id),
  produit_nom          TEXT,
  quantite             NUMERIC(10,3) NOT NULL,
  notes                TEXT,
  user_id              UUID    REFERENCES utilisateurs(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- 10. MOBILE MONEY
-- ============================================================

-- ---- Configuration par opérateur ----
CREATE TABLE IF NOT EXISTS mobile_money_config (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id   UUID    NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  operateur       TEXT    NOT NULL,  -- 'MTN Mobile Money', 'Moov Money', 'Wave', ...
  numero_marchand TEXT,
  api_key         TEXT,
  webhook_secret  TEXT,
  actif           BOOLEAN DEFAULT FALSE,
  UNIQUE(entreprise_id, operateur)
);

-- ---- Transactions reçues via webhook ----
CREATE TABLE IF NOT EXISTS mobile_money_transactions (
  id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id     UUID    NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  operateur         TEXT    NOT NULL,
  reference_externe TEXT,
  telephone         TEXT,
  montant           NUMERIC(15,2) NOT NULL,
  statut            TEXT    NOT NULL DEFAULT 'en_attente'
                    CHECK (statut IN ('en_attente', 'confirme', 'echec')),
  vente_id          UUID    REFERENCES ventes(id) ON DELETE SET NULL,
  raw_payload       JSONB,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at      TIMESTAMPTZ
);


-- ============================================================
-- 11. INDEX (performances)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_produits_entreprise      ON produits(entreprise_id);
CREATE INDEX IF NOT EXISTS idx_produits_categorie       ON produits(categorie_id);
CREATE INDEX IF NOT EXISTS idx_clients_entreprise       ON clients(entreprise_id);
CREATE INDEX IF NOT EXISTS idx_fournisseurs_entreprise  ON fournisseurs(entreprise_id);
CREATE INDEX IF NOT EXISTS idx_ventes_entreprise        ON ventes(entreprise_id);
CREATE INDEX IF NOT EXISTS idx_ventes_client            ON ventes(client_id);
CREATE INDEX IF NOT EXISTS idx_ventes_statut            ON ventes(statut);
CREATE INDEX IF NOT EXISTS idx_ventes_created_at        ON ventes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vente_items_vente        ON vente_items(vente_id);
CREATE INDEX IF NOT EXISTS idx_devis_entreprise         ON devis(entreprise_id);
CREATE INDEX IF NOT EXISTS idx_devis_statut             ON devis(statut);
CREATE INDEX IF NOT EXISTS idx_mouvements_produit       ON mouvements_stock(produit_id);
CREATE INDEX IF NOT EXISTS idx_depenses_entreprise      ON depenses(entreprise_id);
CREATE INDEX IF NOT EXISTS idx_entrees_entreprise       ON entrees(entreprise_id);
CREATE INDEX IF NOT EXISTS idx_relances_vente           ON relances(vente_id);
CREATE INDEX IF NOT EXISTS idx_mm_transactions_entreprise ON mobile_money_transactions(entreprise_id);
CREATE INDEX IF NOT EXISTS idx_stock_depots_depot       ON stock_depots(depot_id);
CREATE INDEX IF NOT EXISTS idx_stock_depots_produit     ON stock_depots(produit_id);


-- ============================================================
-- 12. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE entreprises              ENABLE ROW LEVEL SECURITY;
ALTER TABLE abonnements              ENABLE ROW LEVEL SECURITY;
ALTER TABLE utilisateurs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories               ENABLE ROW LEVEL SECURITY;
ALTER TABLE produits                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE mouvements_stock         ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE fournisseurs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventes                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE vente_items              ENABLE ROW LEVEL SECURITY;
ALTER TABLE paiements                ENABLE ROW LEVEL SECURITY;
ALTER TABLE devis                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE devis_items              ENABLE ROW LEVEL SECURITY;
ALTER TABLE bons_livraison           ENABLE ROW LEVEL SECURITY;
ALTER TABLE bons_livraison_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE avoirs                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE avoir_items              ENABLE ROW LEVEL SECURITY;
ALTER TABLE relances                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE depenses                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE entrees                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions_caisse      ENABLE ROW LEVEL SECURITY;
ALTER TABLE paiements_fournisseurs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries          ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions_utilisateurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE parametres_entreprise    ENABLE ROW LEVEL SECURITY;
ALTER TABLE bons_commande            ENABLE ROW LEVEL SECURITY;
ALTER TABLE bon_commande_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE depots                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_depots             ENABLE ROW LEVEL SECURITY;
ALTER TABLE transferts_stock         ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile_money_config      ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile_money_transactions ENABLE ROW LEVEL SECURITY;

-- ---- Entreprises ----
CREATE POLICY "entreprises_select" ON entreprises FOR SELECT
  USING (id = get_user_entreprise_id() OR is_superadmin());

CREATE POLICY "entreprises_insert" ON entreprises FOR INSERT
  TO authenticated WITH CHECK (true);  -- n'importe quel auth peut créer son entreprise

CREATE POLICY "entreprises_update" ON entreprises FOR UPDATE
  USING (id = get_user_entreprise_id() OR is_superadmin());

CREATE POLICY "entreprises_delete" ON entreprises FOR DELETE
  USING (is_superadmin());

-- ---- Abonnements (lecture publique pour authentifiés) ----
CREATE POLICY "abonnements_select" ON abonnements FOR SELECT
  TO authenticated USING (true);

-- ---- Utilisateurs ----
CREATE POLICY "utilisateurs_select" ON utilisateurs FOR SELECT
  USING (id = auth.uid() OR entreprise_id = get_user_entreprise_id() OR is_superadmin());

CREATE POLICY "utilisateurs_insert" ON utilisateurs FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "utilisateurs_update" ON utilisateurs FOR UPDATE
  USING (id = auth.uid() OR is_superadmin());

CREATE POLICY "utilisateurs_superadmin" ON utilisateurs FOR ALL
  USING (is_superadmin());

-- ---- Tables avec entreprise_id direct — macro ----
DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'categories', 'produits', 'mouvements_stock',
    'clients', 'fournisseurs',
    'ventes', 'devis', 'bons_livraison',
    'avoirs', 'relances',
    'depenses', 'entrees', 'transactions_caisse', 'paiements_fournisseurs',
    'journal_entries', 'permissions_utilisateurs', 'parametres_entreprise',
    'bons_commande', 'depots',
    'mobile_money_config', 'mobile_money_transactions'
  ] LOOP
    EXECUTE format(
      'CREATE POLICY "%1$s_sel" ON %1$s FOR SELECT
         USING (entreprise_id = get_user_entreprise_id() OR is_superadmin());
       CREATE POLICY "%1$s_ins" ON %1$s FOR INSERT
         WITH CHECK (entreprise_id = get_user_entreprise_id() OR is_superadmin());
       CREATE POLICY "%1$s_upd" ON %1$s FOR UPDATE
         USING (entreprise_id = get_user_entreprise_id() OR is_superadmin());
       CREATE POLICY "%1$s_del" ON %1$s FOR DELETE
         USING (entreprise_id = get_user_entreprise_id() OR is_superadmin());',
      tbl
    );
  END LOOP;
END;
$$;

-- ---- Tables enfants (filtrées via entreprise_id dénormalisé) ----
DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'vente_items', 'paiements',
    'devis_items', 'bons_livraison_items', 'avoir_items',
    'bon_commande_items', 'stock_depots', 'transferts_stock'
  ] LOOP
    EXECUTE format(
      'CREATE POLICY "%1$s_sel" ON %1$s FOR SELECT
         USING (entreprise_id = get_user_entreprise_id() OR is_superadmin());
       CREATE POLICY "%1$s_ins" ON %1$s FOR INSERT
         WITH CHECK (entreprise_id = get_user_entreprise_id() OR is_superadmin());
       CREATE POLICY "%1$s_upd" ON %1$s FOR UPDATE
         USING (entreprise_id = get_user_entreprise_id() OR is_superadmin());
       CREATE POLICY "%1$s_del" ON %1$s FOR DELETE
         USING (entreprise_id = get_user_entreprise_id() OR is_superadmin());',
      tbl
    );
  END LOOP;
END;
$$;


-- ============================================================
-- 13. TRIGGERS
-- ============================================================

-- ---- Mise à jour du stock global après mouvement ----
CREATE OR REPLACE FUNCTION update_stock_on_movement()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.type = 'entree' THEN
    UPDATE produits SET stock = stock + NEW.quantite, updated_at = NOW()
      WHERE id = NEW.produit_id;
  ELSIF NEW.type = 'sortie' THEN
    UPDATE produits SET stock = GREATEST(0, stock - NEW.quantite), updated_at = NOW()
      WHERE id = NEW.produit_id;
  ELSIF NEW.type = 'ajustement' THEN
    UPDATE produits SET stock = NEW.quantite, updated_at = NOW()
      WHERE id = NEW.produit_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_stock ON mouvements_stock;
CREATE TRIGGER trg_update_stock
  AFTER INSERT ON mouvements_stock
  FOR EACH ROW EXECUTE FUNCTION update_stock_on_movement();

-- ---- Restauration du stock lors de la validation d'un avoir ----
CREATE OR REPLACE FUNCTION restore_stock_on_avoir()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.statut = 'valide' AND OLD.statut != 'valide' THEN
    UPDATE produits p
    SET stock = p.stock + ai.quantite, updated_at = NOW()
    FROM avoir_items ai
    WHERE ai.avoir_id = NEW.id
      AND ai.produit_id = p.id
      AND ai.remettre_en_stock = TRUE;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_restore_stock_on_avoir ON avoirs;
CREATE TRIGGER trg_restore_stock_on_avoir
  AFTER UPDATE ON avoirs
  FOR EACH ROW EXECUTE FUNCTION restore_stock_on_avoir();

-- ---- Auto updated_at sur parametres_entreprise ----
DROP TRIGGER IF EXISTS trg_parametres_updated_at ON parametres_entreprise;
CREATE TRIGGER trg_parametres_updated_at
  BEFORE UPDATE ON parametres_entreprise
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---- Auto updated_at sur produits ----
DROP TRIGGER IF EXISTS trg_produits_updated_at ON produits;
CREATE TRIGGER trg_produits_updated_at
  BEFORE UPDATE ON produits
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- 14. FONCTIONS RPC
-- ============================================================

-- Ajustement atomique du stock dans un dépôt
-- Appelé par src/services/depot.ts → transfererStock()
CREATE OR REPLACE FUNCTION adjust_depot_stock(
  p_depot_id      UUID,
  p_produit_id    UUID,
  p_entreprise_id UUID,
  p_delta         INTEGER
) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO stock_depots (depot_id, produit_id, entreprise_id, quantite)
  VALUES (p_depot_id, p_produit_id, p_entreprise_id, GREATEST(0, p_delta))
  ON CONFLICT (depot_id, produit_id) DO UPDATE
    SET quantite = GREATEST(0, stock_depots.quantite + p_delta);
END;
$$;


-- ============================================================
-- 15. DONNÉES INITIALES
-- ============================================================

INSERT INTO abonnements (id, nom, prix, description, features, limites) VALUES
  (
    'gratuit',
    'Gratuit',
    0,
    'Plan de base pour démarrer',
    ARRAY['dashboard', 'ventes', 'clients'],
    '{"maxMembres": 2, "maxProduits": 50, "maxCommerciaux": 1}'::jsonb
  ),
  (
    'standard',
    'Standard',
    15000,
    'Pour les petites entreprises en croissance',
    ARRAY['dashboard', 'stock', 'ventes', 'finance', 'clients', 'fournisseurs', 'settings'],
    '{"maxMembres": 5, "maxProduits": 500, "maxCommerciaux": 3}'::jsonb
  ),
  (
    'premium',
    'Premium',
    35000,
    'Accès complet à toutes les fonctionnalités',
    ARRAY['dashboard', 'stock', 'ventes', 'finance', 'clients', 'fournisseurs', 'equipe', 'settings', 'rapports'],
    '{"maxMembres": 20, "maxProduits": 5000, "maxCommerciaux": 10}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;
