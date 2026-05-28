import { supabase } from '@/lib/supabase';
import type { Categorie } from '@/types';

function mapRow(row: Record<string, unknown>): Categorie {
  return {
    id: row.id as string,
    entrepriseId: row.entreprise_id as string,
    nom: row.nom as string,
    description: (row.description as string) ?? undefined,
    nbProduits: (row.nb_produits as number) ?? 0,
  };
}

export async function listCategories(): Promise<Categorie[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*, nb_produits:produits(count)')
    .order('nom');
  if (error || !data) return [];
  return data.map((row) => ({
    ...mapRow(row),
    nbProduits: (row.nb_produits as { count: number }[])?.[0]?.count ?? 0,
  }));
}

export async function createCategorie(data: { nom: string; description?: string; entrepriseId: string }): Promise<Categorie> {
  const { data: result, error } = await supabase
    .from('categories')
    .insert({ nom: data.nom, description: data.description, entreprise_id: data.entrepriseId })
    .select()
    .single();
  if (error || !result) throw new Error(error?.message ?? 'Erreur création catégorie');
  return mapRow(result);
}

export async function updateCategorie(id: string, data: { nom?: string; description?: string }): Promise<void> {
  await supabase.from('categories').update(data).eq('id', id);
}

export async function deleteCategorie(id: string): Promise<void> {
  await supabase.from('categories').delete().eq('id', id);
}
