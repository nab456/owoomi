import { supabase } from '@/lib/supabase';
import type { Client } from '@/types';

function mapRow(row: Record<string, unknown>): Client {
  return {
    id: row.id as string,
    entrepriseId: row.entreprise_id as string,
    nom: row.nom as string,
    type: row.type as 'particulier' | 'revendeur' | 'entreprise',
    telephone: (row.telephone as string) ?? undefined,
    email: (row.email as string) ?? undefined,
    adresse: (row.adresse as string) ?? undefined,
    notes: (row.notes as string) ?? undefined,
    solde: (row.solde as number) ?? 0,
    nbVentes: (row.nb_ventes as number) ?? 0,
  };
}

export async function listClients(): Promise<Client[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('*, nb_ventes:ventes(count)')
    .order('nom');
  if (error || !data) return [];
  return data.map((row) => ({
    ...mapRow(row),
    nbVentes: (row.nb_ventes as { count: number }[])?.[0]?.count ?? 0,
  }));
}

export async function getClient(id: string): Promise<Client | null> {
  const { data, error } = await supabase.from('clients').select('*').eq('id', id).single();
  if (error || !data) return null;
  return mapRow(data);
}

export async function createClient(data: {
  nom: string;
  type: 'particulier' | 'revendeur' | 'entreprise';
  telephone?: string;
  email?: string;
  adresse?: string;
  notes?: string;
  entrepriseId: string;
}): Promise<Client> {
  const { data: result, error } = await supabase
    .from('clients')
    .insert({
      nom: data.nom,
      type: data.type,
      telephone: data.telephone,
      email: data.email,
      adresse: data.adresse,
      notes: data.notes,
      entreprise_id: data.entrepriseId,
    })
    .select()
    .single();
  if (error || !result) throw new Error(error?.message ?? 'Erreur création client');
  return mapRow(result);
}

export async function updateClient(id: string, data: Partial<Omit<Client, 'id' | 'entrepriseId'>>): Promise<void> {
  const update: Record<string, unknown> = {};
  if (data.nom !== undefined) update.nom = data.nom;
  if (data.type !== undefined) update.type = data.type;
  if (data.telephone !== undefined) update.telephone = data.telephone;
  if (data.email !== undefined) update.email = data.email;
  if (data.adresse !== undefined) update.adresse = data.adresse;
  if (data.notes !== undefined) update.notes = data.notes;
  if (data.solde !== undefined) update.solde = data.solde;
  await supabase.from('clients').update(update).eq('id', id);
}

export async function deleteClient(id: string): Promise<void> {
  await supabase.from('clients').delete().eq('id', id);
}
