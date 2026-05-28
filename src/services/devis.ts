import { supabase } from '@/lib/supabase';
import type { Devis, DevisItem } from '@/types';

function generateReference(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const seq = Math.floor(Math.random() * 9000 + 1000);
  return `DV-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${seq}`;
}

function mapDevis(row: Record<string, unknown>): Devis {
  const r = row as {
    id: string; entreprise_id: string; reference: string;
    client_id?: string; vendeur_id?: string;
    statut: 'brouillon' | 'envoye' | 'accepte' | 'refuse' | 'expire';
    total: number; date_echeance?: string; notes?: string; created_at?: string;
    clients?: { nom: string };
  };
  return {
    id: r.id,
    entrepriseId: r.entreprise_id,
    reference: r.reference,
    clientId: r.client_id ?? undefined,
    clientNom: r.clients?.nom ?? undefined,
    vendeurId: r.vendeur_id ?? undefined,
    statut: r.statut,
    total: r.total,
    dateEcheance: r.date_echeance ?? undefined,
    notes: r.notes ?? undefined,
    createdAt: r.created_at,
  };
}

export async function listDevis(): Promise<Devis[]> {
  const { data, error } = await supabase
    .from('devis')
    .select('*, clients(nom)')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(mapDevis);
}

export async function createDevis(data: {
  clientId?: string;
  vendeurId?: string;
  items: Omit<DevisItem, 'id' | 'devisId'>[];
  dateEcheance?: string;
  notes?: string;
  entrepriseId: string;
}): Promise<Devis> {
  const reference = generateReference();
  const total = data.items.reduce((s, i) => s + i.total, 0);

  const { data: devis, error } = await supabase
    .from('devis')
    .insert({
      reference,
      client_id: data.clientId || null,
      vendeur_id: data.vendeurId || null,
      statut: 'brouillon',
      total,
      date_echeance: data.dateEcheance || null,
      notes: data.notes,
      entreprise_id: data.entrepriseId,
    })
    .select('*, clients(nom)')
    .single();
  if (error || !devis) throw new Error(error?.message ?? 'Erreur création devis');

  if (data.items.length > 0) {
    await supabase.from('devis_items').insert(
      data.items.map((i) => ({
        devis_id: devis.id,
        entreprise_id: data.entrepriseId,
        produit_id: i.produitId || null,
        nom_produit: i.nomProduit,
        quantite: i.quantite,
        prix_unitaire: i.prixUnitaire,
        remise: i.remise ?? 0,
        total: i.total,
      }))
    );
  }

  return mapDevis(devis as Record<string, unknown>);
}

export async function getDevis(id: string): Promise<Devis & { items: DevisItem[] }> {
  const { data } = await supabase
    .from('devis')
    .select('*, clients(nom), devis_items(*)')
    .eq('id', id)
    .single();
  if (!data) throw new Error('Devis introuvable');
  const base = mapDevis(data as Record<string, unknown>);
  const items: DevisItem[] = ((data as any).devis_items ?? []).map((i: any) => ({
    id: i.id,
    devisId: i.devis_id,
    entrepriseId: i.entreprise_id,
    produitId: i.produit_id ?? undefined,
    nomProduit: i.nom_produit,
    quantite: i.quantite,
    prixUnitaire: i.prix_unitaire,
    remise: i.remise ?? 0,
    total: i.total,
  }));
  return { ...base, items };
}

export async function duplicateDevis(id: string, entrepriseId: string): Promise<Devis> {
  const source = await getDevis(id);
  return createDevis({
    clientId: source.clientId,
    vendeurId: source.vendeurId,
    items: source.items.map(i => ({
      produitId: i.produitId,
      nomProduit: i.nomProduit,
      quantite: i.quantite,
      prixUnitaire: i.prixUnitaire,
      remise: i.remise,
      total: i.total,
    })),
    dateEcheance: (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().split('T')[0]; })(),
    notes: source.notes,
    entrepriseId,
  });
}

export async function convertirDevisEnVente(id: string, entrepriseId: string, vendeurId: string): Promise<string> {
  const source = await getDevis(id);
  const { createVente } = await import('@/services/vente');
  const vente = await createVente({
    type: 'facture',
    clientId: source.clientId,
    vendeurId,
    statut: 'en_attente',
    items: source.items.map(i => ({
      produitId: i.produitId,
      nomProduit: i.nomProduit,
      quantite: i.quantite,
      prixUnitaire: i.prixUnitaire,
      remise: i.remise,
      total: i.total,
    })),
    paiements: [],
    notes: source.notes,
    entrepriseId,
  });
  await updateDevisStatut(id, 'accepte');
  return vente.id;
}

export async function updateDevisStatut(id: string, statut: Devis['statut']): Promise<void> {
  await supabase.from('devis').update({ statut }).eq('id', id);
}

export async function deleteDevis(id: string): Promise<void> {
  await supabase.from('devis').delete().eq('id', id);
}
