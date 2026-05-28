import { supabase } from '@/lib/supabase';

export interface BonCommandeItem {
  id?: string;
  bonCommandeId?: string;
  entrepriseId?: string;
  produitId?: string;
  nomProduit: string;
  quantiteCommandee: number;
  quantiteRecue: number;
  prixUnitaire: number;
  total: number;
}

export interface BonCommande {
  id: string;
  entrepriseId: string;
  reference: string;
  fournisseurId?: string;
  fournisseurNom?: string;
  statut: 'brouillon' | 'envoye' | 'partiel' | 'recu' | 'annule';
  total: number;
  dateLivraisonPrevue?: string;
  notes?: string;
  items?: BonCommandeItem[];
  createdAt?: string;
}

function generateReference(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `BC-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

function mapBC(row: any): BonCommande {
  return {
    id: row.id,
    entrepriseId: row.entreprise_id,
    reference: row.reference,
    fournisseurId: row.fournisseur_id ?? undefined,
    fournisseurNom: row.fournisseurs?.nom ?? row.fournisseur_nom ?? undefined,
    statut: row.statut,
    total: row.total,
    dateLivraisonPrevue: row.date_livraison_prevue ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    items: (row.bon_commande_items ?? []).map((i: any) => ({
      id: i.id,
      bonCommandeId: i.bon_commande_id,
      entrepriseId: i.entreprise_id,
      produitId: i.produit_id ?? undefined,
      nomProduit: i.nom_produit,
      quantiteCommandee: i.quantite_commandee,
      quantiteRecue: i.quantite_recue,
      prixUnitaire: i.prix_unitaire,
      total: i.total,
    })),
  };
}

export async function listBonsCommande(): Promise<BonCommande[]> {
  const { data } = await supabase
    .from('bons_commande')
    .select('*, fournisseurs(nom)')
    .order('created_at', { ascending: false });
  return (data ?? []).map(mapBC);
}

export async function getBonCommande(id: string): Promise<BonCommande> {
  const { data } = await supabase
    .from('bons_commande')
    .select('*, fournisseurs(nom), bon_commande_items(*)')
    .eq('id', id)
    .single();
  if (!data) throw new Error('Bon de commande introuvable');
  return mapBC(data);
}

export async function createBonCommande(data: {
  fournisseurId?: string;
  fournisseurNom?: string;
  items: Omit<BonCommandeItem, 'id' | 'bonCommandeId' | 'entrepriseId' | 'quantiteRecue'>[];
  dateLivraisonPrevue?: string;
  notes?: string;
  entrepriseId: string;
}): Promise<BonCommande> {
  const reference = generateReference();
  const total = data.items.reduce((s, i) => s + i.total, 0);

  const { data: bc, error } = await supabase
    .from('bons_commande')
    .insert({
      reference,
      entreprise_id: data.entrepriseId,
      fournisseur_id: data.fournisseurId || null,
      fournisseur_nom: data.fournisseurNom || null,
      statut: 'brouillon',
      total,
      date_livraison_prevue: data.dateLivraisonPrevue || null,
      notes: data.notes || null,
    })
    .select('*, fournisseurs(nom)')
    .single();
  if (error || !bc) throw new Error(error?.message ?? 'Erreur création bon de commande');

  if (data.items.length > 0) {
    await supabase.from('bon_commande_items').insert(
      data.items.map(i => ({
        bon_commande_id: bc.id,
        entreprise_id: data.entrepriseId,
        produit_id: i.produitId || null,
        nom_produit: i.nomProduit,
        quantite_commandee: i.quantiteCommandee,
        quantite_recue: 0,
        prix_unitaire: i.prixUnitaire,
        total: i.total,
      }))
    );
  }

  return mapBC(bc);
}

export async function recevoirBonCommande(
  id: string,
  receptions: { itemId: string; quantiteRecue: number }[]
): Promise<void> {
  // Update received quantities per item
  for (const r of receptions) {
    await supabase
      .from('bon_commande_items')
      .update({ quantite_recue: r.quantiteRecue })
      .eq('id', r.itemId);

    // Add stock movement
    const { data: item } = await supabase.from('bon_commande_items').select('produit_id, nom_produit, prix_unitaire, bon_commande_id').eq('id', r.itemId).single();
    if (item?.produit_id && r.quantiteRecue > 0) {
      await supabase.from('mouvements_stock').insert({
        entreprise_id: (await supabase.from('bons_commande').select('entreprise_id').eq('id', id).single()).data?.entreprise_id,
        produit_id: item.produit_id,
        type: 'entree',
        quantite: r.quantiteRecue,
        prix_unitaire: item.prix_unitaire,
        reference: `BC-Reception-${id.substring(0, 8)}`,
        notes: `Réception bon de commande`,
      });
    }
  }

  // Recompute statut
  const { data: items } = await supabase.from('bon_commande_items').select('quantite_commandee, quantite_recue').eq('bon_commande_id', id);
  const allReceived = (items ?? []).every(i => i.quantite_recue >= i.quantite_commandee);
  const anyReceived = (items ?? []).some(i => i.quantite_recue > 0);
  const newStatut = allReceived ? 'recu' : anyReceived ? 'partiel' : 'envoye';
  await supabase.from('bons_commande').update({ statut: newStatut }).eq('id', id);
}

export async function updateBonCommandeStatut(id: string, statut: BonCommande['statut']): Promise<void> {
  await supabase.from('bons_commande').update({ statut }).eq('id', id);
}

export async function deleteBonCommande(id: string): Promise<void> {
  await supabase.from('bons_commande').delete().eq('id', id);
}
