import { supabase } from '@/lib/supabase';

export interface AvoirItem {
  id?: string;
  avoirId?: string;
  entrepriseId?: string;
  produitId?: string;
  nomProduit: string;
  quantite: number;
  prixUnitaire: number;
  total: number;
  remettreEnStock: boolean;
}

export interface Avoir {
  id: string;
  entrepriseId: string;
  reference: string;
  venteId?: string;
  clientId?: string;
  clientNom?: string;
  motif?: string;
  total: number;
  statut: 'brouillon' | 'valide' | 'rembourse';
  notes?: string;
  items?: AvoirItem[];
  createdAt?: string;
}

function generateReference(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `AV-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

function mapAvoir(row: any): Avoir {
  return {
    id: row.id,
    entrepriseId: row.entreprise_id,
    reference: row.reference,
    venteId: row.vente_id ?? undefined,
    clientId: row.client_id ?? undefined,
    clientNom: row.clients?.nom ?? row.client_nom ?? undefined,
    motif: row.motif ?? undefined,
    total: row.total,
    statut: row.statut,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    items: (row.avoir_items ?? []).map((i: any) => ({
      id: i.id,
      avoirId: i.avoir_id,
      entrepriseId: i.entreprise_id,
      produitId: i.produit_id ?? undefined,
      nomProduit: i.nom_produit,
      quantite: i.quantite,
      prixUnitaire: i.prix_unitaire,
      total: i.total,
      remettreEnStock: i.remettre_en_stock,
    })),
  };
}

export async function listAvoirs(): Promise<Avoir[]> {
  const { data } = await supabase
    .from('avoirs')
    .select('*, clients(nom)')
    .order('created_at', { ascending: false });
  return (data ?? []).map(mapAvoir);
}

export async function createAvoir(data: {
  venteId?: string;
  clientId?: string;
  clientNom?: string;
  motif?: string;
  notes?: string;
  items: Omit<AvoirItem, 'id' | 'avoirId' | 'entrepriseId'>[];
  entrepriseId: string;
}): Promise<Avoir> {
  const reference = generateReference();
  const total = data.items.reduce((s, i) => s + i.total, 0);

  const { data: avoir, error } = await supabase
    .from('avoirs')
    .insert({
      reference,
      entreprise_id: data.entrepriseId,
      vente_id: data.venteId || null,
      client_id: data.clientId || null,
      client_nom: data.clientNom || null,
      motif: data.motif || null,
      notes: data.notes || null,
      total,
      statut: 'brouillon',
    })
    .select('*, clients(nom)')
    .single();
  if (error || !avoir) throw new Error(error?.message ?? 'Erreur création avoir');

  if (data.items.length > 0) {
    await supabase.from('avoir_items').insert(
      data.items.map(i => ({
        avoir_id: avoir.id,
        entreprise_id: data.entrepriseId,
        produit_id: i.produitId || null,
        nom_produit: i.nomProduit,
        quantite: i.quantite,
        prix_unitaire: i.prixUnitaire,
        total: i.total,
        remettre_en_stock: i.remettreEnStock,
      }))
    );
  }

  return mapAvoir(avoir);
}

export async function validerAvoir(id: string): Promise<void> {
  await supabase.from('avoirs').update({ statut: 'valide' }).eq('id', id);
}

export async function deleteAvoir(id: string): Promise<void> {
  await supabase.from('avoirs').delete().eq('id', id);
}
