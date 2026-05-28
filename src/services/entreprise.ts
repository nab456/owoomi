import { supabase } from '@/lib/supabase';
import type { Entreprise } from '@/types';
import { EntrepriseSchema } from '@/types';

function mapRow(row: Record<string, unknown>): Entreprise | null {
  const parsed = EntrepriseSchema.safeParse({
    id: row.id,
    nom: row.nom,
    statut: row.statut,
    abonnement: row.abonnement,
    dateSouscription: new Date(row.date_souscription as string),
    dateExpiration: new Date(row.date_expiration as string),
    limites: row.limites,
  });
  if (!parsed.success) {
    console.error('Failed to parse entreprise:', parsed.error);
    return null;
  }
  return parsed.data;
}

export async function getEntreprise(id: string): Promise<Entreprise | null> {
  const { data, error } = await supabase
    .from('entreprises')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return mapRow(data);
}

export async function listEntreprises(): Promise<Entreprise[]> {
  const { data, error } = await supabase.from('entreprises').select('*');
  if (error || !data) return [];
  return data.map(mapRow).filter((e): e is Entreprise => e !== null);
}

export async function createEntreprise(data: Omit<Entreprise, 'id' | 'dateSouscription'>): Promise<string> {
  const { data: result, error } = await supabase
    .from('entreprises')
    .insert({
      nom: data.nom,
      statut: data.statut,
      abonnement: data.abonnement,
      date_expiration: data.dateExpiration.toISOString(),
      limites: data.limites,
    })
    .select('id')
    .single();

  if (error || !result) throw new Error('Failed to create entreprise');
  return result.id;
}

export async function updateEntreprise(id: string, data: Partial<Entreprise>): Promise<void> {
  const update: Record<string, unknown> = {};
  if (data.nom !== undefined) update.nom = data.nom;
  if (data.statut !== undefined) update.statut = data.statut;
  if (data.abonnement !== undefined) update.abonnement = data.abonnement;
  if (data.dateExpiration !== undefined) update.date_expiration = data.dateExpiration.toISOString();
  if (data.limites !== undefined) update.limites = data.limites;

  await supabase.from('entreprises').update(update).eq('id', id);
}
