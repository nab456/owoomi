import { supabase } from '@/lib/supabase';
import type { Fournisseur, PaiementFournisseur } from '@/types';

function mapRow(row: Record<string, unknown>): Fournisseur {
  return {
    id: row.id as string,
    entrepriseId: row.entreprise_id as string,
    nom: row.nom as string,
    telephone: (row.telephone as string) ?? undefined,
    email: (row.email as string) ?? undefined,
    adresse: (row.adresse as string) ?? undefined,
    notes: (row.notes as string) ?? undefined,
    solde: (row.solde as number) ?? 0,
    nbPaiements: (row.nb_paiements as number) ?? 0,
  };
}

export async function listFournisseurs(): Promise<Fournisseur[]> {
  const { data, error } = await supabase
    .from('fournisseurs')
    .select('*, nb_paiements:paiements_fournisseurs(count)')
    .order('nom');
  if (error || !data) return [];
  return data.map((row) => ({
    ...mapRow(row),
    nbPaiements: (row.nb_paiements as { count: number }[])?.[0]?.count ?? 0,
  }));
}

export async function createFournisseur(data: {
  nom: string;
  telephone?: string;
  email?: string;
  adresse?: string;
  notes?: string;
  entrepriseId: string;
}): Promise<Fournisseur> {
  const { data: result, error } = await supabase
    .from('fournisseurs')
    .insert({
      nom: data.nom,
      telephone: data.telephone,
      email: data.email,
      adresse: data.adresse,
      notes: data.notes,
      entreprise_id: data.entrepriseId,
    })
    .select()
    .single();
  if (error || !result) throw new Error(error?.message ?? 'Erreur création fournisseur');
  return mapRow(result);
}

export async function updateFournisseur(id: string, data: Partial<Omit<Fournisseur, 'id' | 'entrepriseId'>>): Promise<void> {
  const update: Record<string, unknown> = {};
  if (data.nom !== undefined) update.nom = data.nom;
  if (data.telephone !== undefined) update.telephone = data.telephone;
  if (data.email !== undefined) update.email = data.email;
  if (data.adresse !== undefined) update.adresse = data.adresse;
  if (data.notes !== undefined) update.notes = data.notes;
  if (data.solde !== undefined) update.solde = data.solde;
  await supabase.from('fournisseurs').update(update).eq('id', id);
}

export async function deleteFournisseur(id: string): Promise<void> {
  await supabase.from('fournisseurs').delete().eq('id', id);
}

export async function listPaiementsFournisseur(fournisseurId: string): Promise<PaiementFournisseur[]> {
  const { data, error } = await supabase
    .from('paiements_fournisseurs')
    .select('*')
    .eq('fournisseur_id', fournisseurId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map((r) => ({
    id: r.id,
    entrepriseId: r.entreprise_id,
    fournisseurId: r.fournisseur_id,
    montant: r.montant,
    mode: r.mode,
    reference: r.reference ?? undefined,
    notes: r.notes ?? undefined,
    userId: r.user_id ?? undefined,
    createdAt: r.created_at,
  }));
}

export async function createPaiementFournisseur(data: {
  fournisseurId: string;
  montant: number;
  mode: string;
  reference?: string;
  notes?: string;
  userId?: string;
  entrepriseId: string;
}): Promise<void> {
  await supabase.from('paiements_fournisseurs').insert({
    fournisseur_id: data.fournisseurId,
    montant: data.montant,
    mode: data.mode,
    reference: data.reference,
    notes: data.notes,
    user_id: data.userId || null,
    entreprise_id: data.entrepriseId,
  });
  // Mettre à jour le solde fournisseur
  await supabase.rpc('decrement_fournisseur_solde', {
    p_fournisseur_id: data.fournisseurId,
    p_montant: data.montant,
  }).maybeSingle();
}
