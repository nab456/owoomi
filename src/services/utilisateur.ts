import { supabase } from '@/lib/supabase';
import type { Utilisateur } from '@/types';
import { UtilisateurSchema } from '@/types';

function mapRow(row: Record<string, unknown>): Utilisateur | null {
  const parsed = UtilisateurSchema.safeParse({
    id: row.id,
    nom: row.nom,
    email: row.email,
    entrepriseId: row.entreprise_id,
    role: row.role,
    statut: row.statut,
  });
  if (!parsed.success) {
    console.error('Failed to parse utilisateur:', parsed.error);
    return null;
  }
  return parsed.data;
}

export async function getUtilisateur(id: string): Promise<Utilisateur | null> {
  const { data, error } = await supabase
    .from('utilisateurs')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return mapRow(data);
}

export async function listUtilisateurs(): Promise<Utilisateur[]> {
  const { data, error } = await supabase.from('utilisateurs').select('*');
  if (error || !data) return [];
  return data.map(mapRow).filter((u): u is Utilisateur => u !== null);
}

export async function getUtilisateursByEntrepriseId(entrepriseId: string): Promise<Utilisateur[]> {
  const { data, error } = await supabase
    .from('utilisateurs')
    .select('*')
    .eq('entreprise_id', entrepriseId);

  if (error || !data) return [];
  return data.map(mapRow).filter((u): u is Utilisateur => u !== null);
}

export async function createUtilisateur(data: Utilisateur): Promise<void> {
  await supabase.from('utilisateurs').insert({
    id: data.id,
    nom: data.nom,
    email: data.email,
    entreprise_id: data.entrepriseId,
    role: data.role,
    statut: data.statut,
  });
}

export async function updateUtilisateur(id: string, data: Partial<Utilisateur>): Promise<void> {
  const update: Record<string, unknown> = {};
  if (data.nom !== undefined) update.nom = data.nom;
  if (data.email !== undefined) update.email = data.email;
  if (data.entrepriseId !== undefined) update.entreprise_id = data.entrepriseId;
  if (data.role !== undefined) update.role = data.role;
  if (data.statut !== undefined) update.statut = data.statut;

  await supabase.from('utilisateurs').update(update).eq('id', id);
}
