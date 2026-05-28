import { supabase } from '@/lib/supabase';
import type { Produit } from '@/types';

function mapRow(row: Record<string, unknown>): Produit {
  return {
    id: row.id as string,
    entrepriseId: row.entreprise_id as string,
    nom: row.nom as string,
    sku: (row.sku as string) ?? undefined,
    categorieId: (row.categorie_id as string) ?? undefined,
    categorieNom: (row as { categories?: { nom: string } }).categories?.nom ?? undefined,
    prix: row.prix as number,
    stock: row.stock as number,
    stockMinimum: (row.stock_minimum as number) ?? 5,
    imageUrl: (row.image_url as string) ?? undefined,
  };
}

export async function listProduits(): Promise<Produit[]> {
  const { data, error } = await supabase
    .from('produits')
    .select('*, categories(nom)')
    .order('nom');
  if (error || !data) return [];
  return data.map(mapRow);
}

export async function getProduit(id: string): Promise<Produit | null> {
  const { data, error } = await supabase
    .from('produits')
    .select('*, categories(nom)')
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return mapRow(data);
}

export async function createProduit(data: {
  nom: string;
  sku?: string;
  categorieId?: string;
  prix: number;
  stock: number;
  stockMinimum?: number;
  imageUrl?: string;
  entrepriseId: string;
}): Promise<Produit> {
  const { data: result, error } = await supabase
    .from('produits')
    .insert({
      nom: data.nom,
      sku: data.sku,
      categorie_id: data.categorieId || null,
      prix: data.prix,
      stock: data.stock,
      stock_minimum: data.stockMinimum ?? 5,
      image_url: data.imageUrl,
      entreprise_id: data.entrepriseId,
    })
    .select('*, categories(nom)')
    .single();
  if (error || !result) throw new Error(error?.message ?? 'Erreur création produit');
  return mapRow(result);
}

export async function updateProduit(id: string, data: Partial<{
  nom: string;
  sku: string;
  categorieId: string;
  prix: number;
  stock: number;
  stockMinimum: number;
  imageUrl: string;
}>): Promise<void> {
  const update: Record<string, unknown> = {};
  if (data.nom !== undefined) update.nom = data.nom;
  if (data.sku !== undefined) update.sku = data.sku;
  if (data.categorieId !== undefined) update.categorie_id = data.categorieId || null;
  if (data.prix !== undefined) update.prix = data.prix;
  if (data.stock !== undefined) update.stock = data.stock;
  if (data.stockMinimum !== undefined) update.stock_minimum = data.stockMinimum;
  if (data.imageUrl !== undefined) update.image_url = data.imageUrl;
  await supabase.from('produits').update(update).eq('id', id);
}

export async function deleteProduit(id: string): Promise<void> {
  await supabase.from('produits').delete().eq('id', id);
}
