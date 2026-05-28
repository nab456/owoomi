-- Relances clients pour factures impayées
CREATE TABLE IF NOT EXISTS relances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id UUID NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  vente_id UUID NOT NULL REFERENCES ventes(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  niveau INTEGER NOT NULL CHECK (niveau IN (7, 15, 30)),
  statut TEXT NOT NULL DEFAULT 'planifie' CHECK (statut IN ('planifie', 'envoye', 'ignore')),
  email_destinataire TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(vente_id, niveau)
);

ALTER TABLE relances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "relances_entreprise" ON relances
  USING (entreprise_id = (SELECT entreprise_id FROM utilisateurs WHERE id = auth.uid()));
