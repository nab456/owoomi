-- Basic accounting: journal entries
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id UUID NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  libelle TEXT NOT NULL,
  compte_debit TEXT NOT NULL,
  compte_credit TEXT NOT NULL,
  montant NUMERIC(15,2) NOT NULL,
  source_type TEXT, -- 'vente', 'depense', 'entree', 'paiement'
  source_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "journal_entries_entreprise" ON journal_entries USING (entreprise_id = (SELECT entreprise_id FROM utilisateurs WHERE id = auth.uid()));

-- Plan comptable simplifié (OHADA)
-- 411 = Clients, 401 = Fournisseurs, 601 = Achats, 701 = Ventes
-- 512 = Banque/Caisse, 614 = Charges diverses, 706 = Entrées diverses
