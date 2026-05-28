import { supabase } from '@/lib/supabase';
import type { BonLivraison } from '@/types';

function generateReference(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const datePart = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const seq = Math.floor(Math.random() * 9000 + 1000);
  return `BL-${datePart}-${seq}`;
}

function mapRow(row: Record<string, unknown>): BonLivraison {
  const r = row as {
    id: string; entreprise_id: string; reference: string;
    vente_id?: string; client_id?: string;
    statut: 'en_preparation' | 'livre' | 'annule';
    created_by?: string; created_at?: string;
    clients?: { nom: string }; utilisateurs?: { nom: string };
    nb_articles?: { count: number }[];
  };
  return {
    id: r.id,
    entrepriseId: r.entreprise_id,
    reference: r.reference,
    venteId: r.vente_id ?? undefined,
    clientId: r.client_id ?? undefined,
    clientNom: r.clients?.nom ?? undefined,
    statut: r.statut,
    nbArticles: r.nb_articles?.[0]?.count ?? 0,
    createdBy: r.created_by ?? undefined,
    createdByNom: r.utilisateurs?.nom ?? undefined,
    createdAt: r.created_at,
  };
}

export async function listBonsLivraison(): Promise<BonLivraison[]> {
  const { data, error } = await supabase
    .from('bons_livraison')
    .select('*, clients(nom), utilisateurs(nom), nb_articles:bons_livraison_items(count)')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(mapRow);
}

export async function updateBonStatut(id: string, statut: BonLivraison['statut']): Promise<void> {
  await supabase.from('bons_livraison').update({ statut }).eq('id', id);
}
