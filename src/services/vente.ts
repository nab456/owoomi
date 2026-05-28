import { supabase } from '@/lib/supabase';
import type { Vente, VenteItem, Paiement } from '@/types';

function generateReference(type: 'ticket' | 'facture'): string {
  const prefix = type === 'ticket' ? 'TK' : 'FV';
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const datePart = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const seq = Math.floor(Math.random() * 9000 + 1000);
  return `${prefix}-${datePart}-${seq}`;
}

function mapVente(row: Record<string, unknown>): Vente {
  const r = row as {
    id: string; entreprise_id: string; reference: string;
    type: 'ticket' | 'facture'; client_id?: string;
    statut: 'en_attente' | 'valide' | 'paye' | 'annule';
    total: number; montant_paye: number; notes?: string; created_at?: string;
    clients?: { nom: string }; utilisateurs?: { nom: string };
    vendeur_id?: string;
  };
  return {
    id: r.id,
    entrepriseId: r.entreprise_id,
    reference: r.reference,
    type: r.type,
    clientId: r.client_id ?? undefined,
    clientNom: r.clients?.nom ?? undefined,
    vendeurId: r.vendeur_id ?? undefined,
    vendeurNom: r.utilisateurs?.nom ?? undefined,
    statut: r.statut,
    total: r.total,
    montantPaye: r.montant_paye,
    notes: r.notes ?? undefined,
    createdAt: r.created_at,
  };
}

export async function listVentes(): Promise<Vente[]> {
  const { data, error } = await supabase
    .from('ventes')
    .select('*, clients(nom), utilisateurs(nom)')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(mapVente);
}

export async function getVente(id: string): Promise<Vente | null> {
  const { data, error } = await supabase
    .from('ventes')
    .select('*, clients(nom), utilisateurs(nom), vente_items(*), paiements(*)')
    .eq('id', id)
    .single();
  if (error || !data) return null;

  const vente = mapVente(data as Record<string, unknown>);
  const r = data as Record<string, unknown>;

  vente.items = ((r.vente_items as Record<string, unknown>[]) ?? []).map((i) => ({
    id: i.id as string,
    venteId: i.vente_id as string,
    produitId: (i.produit_id as string) ?? undefined,
    nomProduit: i.nom_produit as string,
    quantite: i.quantite as number,
    prixUnitaire: i.prix_unitaire as number,
    remise: (i.remise as number) ?? 0,
    total: i.total as number,
  }));

  vente.paiements = ((r.paiements as Record<string, unknown>[]) ?? []).map((p) => ({
    id: p.id as string,
    venteId: p.vente_id as string,
    montant: p.montant as number,
    mode: p.mode as string,
    reference: (p.reference as string) ?? undefined,
    createdAt: p.created_at as string,
  }));

  return vente;
}

export async function createVente(data: {
  type: 'ticket' | 'facture';
  clientId?: string;
  vendeurId?: string;
  statut: 'en_attente' | 'valide' | 'paye';
  items: Omit<VenteItem, 'id' | 'venteId'>[];
  paiements: Omit<Paiement, 'id' | 'venteId'>[];
  notes?: string;
  entrepriseId: string;
}): Promise<Vente> {
  const reference = generateReference(data.type);
  const total = data.items.reduce((s, i) => s + i.total, 0);
  const montantPaye = data.paiements.reduce((s, p) => s + p.montant, 0);

  const { data: vente, error } = await supabase
    .from('ventes')
    .insert({
      reference,
      type: data.type,
      client_id: data.clientId || null,
      vendeur_id: data.vendeurId || null,
      statut: data.statut,
      total,
      montant_paye: montantPaye,
      notes: data.notes,
      entreprise_id: data.entrepriseId,
    })
    .select()
    .single();
  if (error || !vente) throw new Error(error?.message ?? 'Erreur création vente');

  if (data.items.length > 0) {
    await supabase.from('vente_items').insert(
      data.items.map((i) => ({
        vente_id: vente.id,
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

  if (data.paiements.length > 0) {
    await supabase.from('paiements').insert(
      data.paiements.map((p) => ({
        vente_id: vente.id,
        entreprise_id: data.entrepriseId,
        montant: p.montant,
        mode: p.mode,
        reference: p.reference,
      }))
    );
  }

  return mapVente(vente as Record<string, unknown>);
}

export async function updateVenteStatut(id: string, statut: Vente['statut']): Promise<void> {
  await supabase.from('ventes').update({ statut }).eq('id', id);
}

export async function deleteVente(id: string): Promise<void> {
  await supabase.from('ventes').delete().eq('id', id);
}
