import { supabase } from '@/lib/supabase';
import type { Depense } from '@/types';

function generateReference(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const suffix = Math.random().toString(36).substring(2, 6);
  return `DEP-${dateStr}-${suffix}`;
}

function mapRow(row: Record<string, unknown>): Depense {
  const r = row as {
    id: string; entreprise_id: string; reference: string;
    date: string; montant: number; categorie: string;
    fournisseur_id?: string; mode_paiement: string;
    notes?: string; user_id?: string; created_at?: string;
    fournisseurs?: { nom: string }; utilisateurs?: { nom: string };
  };
  return {
    id: r.id,
    entrepriseId: r.entreprise_id,
    reference: r.reference,
    date: r.date,
    montant: r.montant,
    categorie: r.categorie,
    fournisseurId: r.fournisseur_id ?? undefined,
    fournisseurNom: r.fournisseurs?.nom ?? undefined,
    modePaiement: r.mode_paiement,
    notes: r.notes ?? undefined,
    userId: r.user_id ?? undefined,
    userNom: r.utilisateurs?.nom ?? undefined,
    createdAt: r.created_at,
  };
}

export async function listDepenses(): Promise<Depense[]> {
  const { data, error } = await supabase
    .from('depenses')
    .select('*, fournisseurs(nom), utilisateurs(nom)')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(mapRow);
}

export async function createDepense(data: {
  date: string;
  montant: number;
  categorie: string;
  fournisseurId?: string;
  modePaiement: string;
  notes?: string;
  userId?: string;
  entrepriseId: string;
}): Promise<Depense> {
  const reference = generateReference();
  const { data: result, error } = await supabase
    .from('depenses')
    .insert({
      reference,
      date: data.date,
      montant: data.montant,
      categorie: data.categorie,
      fournisseur_id: data.fournisseurId || null,
      mode_paiement: data.modePaiement,
      notes: data.notes,
      user_id: data.userId || null,
      entreprise_id: data.entrepriseId,
    })
    .select('*, fournisseurs(nom), utilisateurs(nom)')
    .single();
  if (error || !result) throw new Error(error?.message ?? 'Erreur création dépense');
  return mapRow(result as Record<string, unknown>);
}

export async function deleteDepense(id: string): Promise<void> {
  await supabase.from('depenses').delete().eq('id', id);
}
