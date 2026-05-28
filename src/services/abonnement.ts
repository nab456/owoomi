import { supabase } from '@/lib/supabase';
import type { Abonnement } from '@/types';
import { AbonnementSchema } from '@/types';

function mapRow(row: Record<string, unknown>): Abonnement | null {
  const parsed = AbonnementSchema.safeParse({
    id: row.id,
    nom: row.nom,
    prix: row.prix,
    description: row.description,
    features: row.features,
    limites: row.limites,
  });
  if (!parsed.success) {
    console.error('Failed to parse abonnement:', parsed.error);
    return null;
  }
  return parsed.data;
}

export async function getAbonnement(id: string): Promise<Abonnement | null> {
  const { data, error } = await supabase
    .from('abonnements')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return mapRow(data);
}

export async function listAbonnements(): Promise<Abonnement[]> {
  const { data, error } = await supabase.from('abonnements').select('*');
  if (error || !data) return [];
  return data.map(mapRow).filter((a): a is Abonnement => a !== null);
}
