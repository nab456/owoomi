import { supabase } from '@/lib/supabase';

export interface Depot {
  id: string;
  entrepriseId: string;
  nom: string;
  adresse?: string;
  estPrincipal: boolean;
  createdAt?: string;
}

export interface StockDepot {
  depotId: string;
  depotNom: string;
  produitId: string;
  produitNom: string;
  quantite: number;
}

export interface TransfertStock {
  id: string;
  entrepriseId: string;
  depotSourceId: string;
  depotSourceNom?: string;
  depotDestinationId: string;
  depotDestinationNom?: string;
  produitId: string;
  produitNom?: string;
  quantite: number;
  notes?: string;
  createdAt?: string;
}

export async function listDepots(): Promise<Depot[]> {
  const { data } = await supabase.from('depots').select('*').order('est_principal', { ascending: false }).order('nom');
  return (data ?? []).map((d: any) => ({
    id: d.id, entrepriseId: d.entreprise_id, nom: d.nom,
    adresse: d.adresse ?? undefined, estPrincipal: d.est_principal, createdAt: d.created_at,
  }));
}

export async function createDepot(data: { nom: string; adresse?: string; estPrincipal?: boolean; entrepriseId: string }): Promise<Depot> {
  const { data: row, error } = await supabase.from('depots').insert({
    nom: data.nom, adresse: data.adresse || null,
    est_principal: data.estPrincipal ?? false,
    entreprise_id: data.entrepriseId,
  }).select().single();
  if (error || !row) throw new Error(error?.message);
  return { id: row.id, entrepriseId: row.entreprise_id, nom: row.nom, adresse: row.adresse ?? undefined, estPrincipal: row.est_principal, createdAt: row.created_at };
}

export async function deleteDepot(id: string): Promise<void> {
  await supabase.from('depots').delete().eq('id', id);
}

export async function getStockParDepot(entrepriseId: string): Promise<StockDepot[]> {
  const { data } = await supabase
    .from('stock_depots')
    .select('*, depots(nom), produits(nom)')
    .eq('entreprise_id', entrepriseId);
  return (data ?? []).map((r: any) => ({
    depotId: r.depot_id, depotNom: r.depots?.nom ?? '', produitId: r.produit_id,
    produitNom: r.produits?.nom ?? '', quantite: r.quantite,
  }));
}

export async function transfererStock(data: {
  depotSourceId: string;
  depotDestinationId: string;
  produitId: string;
  produitNom: string;
  quantite: number;
  notes?: string;
  userId?: string;
  entrepriseId: string;
}): Promise<void> {
  // Decrease source
  await supabase.rpc('adjust_depot_stock', { p_depot_id: data.depotSourceId, p_produit_id: data.produitId, p_delta: -data.quantite, p_entreprise_id: data.entrepriseId });
  // Increase destination
  await supabase.rpc('adjust_depot_stock', { p_depot_id: data.depotDestinationId, p_produit_id: data.produitId, p_delta: data.quantite, p_entreprise_id: data.entrepriseId });
  // Log
  await supabase.from('transferts_stock').insert({
    entreprise_id: data.entrepriseId,
    depot_source_id: data.depotSourceId,
    depot_destination_id: data.depotDestinationId,
    produit_id: data.produitId,
    produit_nom: data.produitNom,
    quantite: data.quantite,
    notes: data.notes || null,
    user_id: data.userId || null,
  });
}

export async function listTransfertsStock(): Promise<TransfertStock[]> {
  const { data } = await supabase
    .from('transferts_stock')
    .select('*, src:depot_source_id(nom), dst:depot_destination_id(nom)')
    .order('created_at', { ascending: false })
    .limit(100);
  return (data ?? []).map((r: any) => ({
    id: r.id, entrepriseId: r.entreprise_id,
    depotSourceId: r.depot_source_id, depotSourceNom: r.src?.nom,
    depotDestinationId: r.depot_destination_id, depotDestinationNom: r.dst?.nom,
    produitId: r.produit_id, produitNom: r.produit_nom,
    quantite: r.quantite, notes: r.notes ?? undefined, createdAt: r.created_at,
  }));
}
