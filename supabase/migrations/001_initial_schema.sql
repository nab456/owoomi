-- ============================================================
-- Owoo mi — Schéma initial
-- ============================================================

-- Entreprises
CREATE TABLE IF NOT EXISTS entreprises (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nom              TEXT        NOT NULL,
  statut           TEXT        NOT NULL DEFAULT 'actif',
  abonnement       TEXT        NOT NULL DEFAULT 'gratuit',
  date_souscription TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date_expiration  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  limites          JSONB       NOT NULL DEFAULT '{
    "maxMembres": 2,
    "maxProduits": 50,
    "maxCommerciaux": 1,
    "features": ["dashboard", "ventes", "clients"]
  }'::jsonb,
  CONSTRAINT entreprises_statut_check CHECK (statut IN ('actif', 'suspendu'))
);

-- Abonnements (catalogue des plans)
CREATE TABLE IF NOT EXISTS abonnements (
  id          TEXT    PRIMARY KEY,
  nom         TEXT    NOT NULL,
  prix        NUMERIC NOT NULL,
  description TEXT    NOT NULL,
  features    TEXT[]  NOT NULL DEFAULT '{}',
  limites     JSONB   NOT NULL DEFAULT '{}'
);

-- Utilisateurs (liés à auth.users)
CREATE TABLE IF NOT EXISTS utilisateurs (
  id            UUID  PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nom           TEXT  NOT NULL,
  email         TEXT  NOT NULL,
  entreprise_id UUID  REFERENCES entreprises(id) ON DELETE SET NULL,
  role          TEXT  NOT NULL DEFAULT 'PDG',
  statut        TEXT  NOT NULL DEFAULT 'actif',
  CONSTRAINT utilisateurs_role_check   CHECK (role   IN ('PDG', 'comptable', 'commercial', 'gestionnaire', 'superadmin')),
  CONSTRAINT utilisateurs_statut_check CHECK (statut IN ('actif', 'inactif'))
);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE entreprises  ENABLE ROW LEVEL SECURITY;
ALTER TABLE abonnements  ENABLE ROW LEVEL SECURITY;
ALTER TABLE utilisateurs ENABLE ROW LEVEL SECURITY;

-- Fonction helper : entreprise_id de l'utilisateur connecté
CREATE OR REPLACE FUNCTION get_user_entreprise_id()
RETURNS UUID LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT entreprise_id FROM utilisateurs WHERE id = auth.uid();
$$;

-- Fonction helper : l'utilisateur connecté est-il superadmin ?
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM utilisateurs WHERE id = auth.uid() AND role = 'superadmin'
  );
$$;

-- --- Entreprises ---
CREATE POLICY "Voir sa propre entreprise"
  ON entreprises FOR SELECT
  USING (id = get_user_entreprise_id() OR is_superadmin());

CREATE POLICY "Superadmin gère toutes les entreprises"
  ON entreprises FOR ALL
  USING (is_superadmin());

-- --- Utilisateurs ---
CREATE POLICY "Voir les membres de son entreprise"
  ON utilisateurs FOR SELECT
  USING (
    id = auth.uid()
    OR entreprise_id = get_user_entreprise_id()
    OR is_superadmin()
  );

CREATE POLICY "Modifier son propre profil"
  ON utilisateurs FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Insérer son propre profil à l'inscription"
  ON utilisateurs FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "Superadmin gère tous les utilisateurs"
  ON utilisateurs FOR ALL
  USING (is_superadmin());

-- --- Abonnements (lecture seule pour tous les authentifiés) ---
CREATE POLICY "Authentifiés peuvent voir les abonnements"
  ON abonnements FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- Données initiales — plans d'abonnement
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
