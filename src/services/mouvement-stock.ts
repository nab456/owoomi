import { supabase } from '@/lib/supabase';
import type { MouvementStock } from '@/types';

function mapRow(row: Record<string, unknown>): MouvementStock {
  const r = row as {
    id: string; entreprise_id: string; produit_id: string;
    type: 'entree' | 'sortie' | 'ajustement'; quantite: number;
    prix_unitaire?: number; fournisseur_id?: string; reference?: string;
    notes?: string; user_id?: string; created_at?: string;
    produits?: { nom: string }; utilisateurs?: { nom: string };
  };
  return {
    id: r.id,
    entrepriseId: r.entreprise_id,
    produitId: r.produit_id,
    produitNom: r.produits?.nom,
    type: r.type,
    quantite: r.quantite,
    prixUnitaire: r.prix_unitaire,
    fournisseurId: r.fournisseur_id,
    reference: r.reference,
    notes: r.notes,
    userId: r.user_id,
    userNom: r.utilisateurs?.nom,
    createdAt: r.created_at,
  };
}

export async function listMouvements(): Promise<MouvementStock[]> {
  const { data, error } = await supabase
    .from('mouvements_stock')
    .select('*, produits(nom), utilisateurs(nom)')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(mapRow);
}

export async function createMouvement(data: {
  produitId: string;
  type: 'entree' | 'sortie' | 'ajustement';
  quantite: number;
  prixUnitaire?: number;
  fournisseurId?: string;
  reference?: string;
  notes?: string;
  userId?: string;
  entrepriseId: string;
}): Promise<void> {
  await supabase.from('mouvements_stock').insert({
    produit_id: data.produitId,
    type: data.type,
    quantite: data.quantite,
    prix_unitaire: data.prixUnitaire,
    fournisseur_id: data.fournisseurId || null,
    reference: data.reference,
    notes: data.notes,
    user_id: data.userId || null,
    entreprise_id: data.entrepriseId,
  });
}
