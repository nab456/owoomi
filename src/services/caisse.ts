import { supabase } from '@/lib/supabase';
import type { TransactionCaisse } from '@/types';

export const MODES_PAIEMENT = [
  'Espèces', 'MTN Mobile Money', 'Moov Money', 'Airtel Money',
  'Orange Money', 'Wave', 'Virement Bancaire',
] as const;

function mapRow(row: Record<string, unknown>): TransactionCaisse {
  return {
    id: row.id as string,
    entrepriseId: row.entreprise_id as string,
    type: row.type as 'entree' | 'sortie' | 'transfert',
    montant: row.montant as number,
    modeSource: row.mode_source as string,
    modeDestination: (row.mode_destination as string) ?? undefined,
    description: (row.description as string) ?? undefined,
    venteId: (row.vente_id as string) ?? undefined,
    userId: (row.user_id as string) ?? undefined,
    createdAt: row.created_at as string,
  };
}

export async function listTransactions(): Promise<TransactionCaisse[]> {
  const { data, error } = await supabase
    .from('transactions_caisse')
    .select('*')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(mapRow);
}

export async function getSoldesParMode(entrepriseId: string): Promise<Record<string, number>> {
  const { data } = await supabase
    .from('transactions_caisse')
    .select('type, montant, mode_source, mode_destination')
    .eq('entreprise_id', entrepriseId);

  const soldes: Record<string, number> = {};
  for (const mode of MODES_PAIEMENT) soldes[mode] = 0;

  for (const tx of data ?? []) {
    if (tx.type === 'entree') {
      soldes[tx.mode_source] = (soldes[tx.mode_source] ?? 0) + tx.montant;
    } else if (tx.type === 'sortie') {
      soldes[tx.mode_source] = (soldes[tx.mode_source] ?? 0) - tx.montant;
    } else if (tx.type === 'transfert' && tx.mode_destination) {
      soldes[tx.mode_source] = (soldes[tx.mode_source] ?? 0) - tx.montant;
      soldes[tx.mode_destination] = (soldes[tx.mode_destination] ?? 0) + tx.montant;
    }
  }
  return soldes;
}

export async function createTransfert(data: {
  modeSource: string;
  modeDestination: string;
  montant: number;
  description?: string;
  userId?: string;
  entrepriseId: string;
}): Promise<void> {
  await supabase.from('transactions_caisse').insert({
    type: 'transfert',
    montant: data.montant,
    mode_source: data.modeSource,
    mode_destination: data.modeDestination,
    description: data.description,
    user_id: data.userId || null,
    entreprise_id: data.entrepriseId,
  });
}

export async function createTransaction(data: {
  type: 'entree' | 'sortie';
  montant: number;
  modeSource: string;
  description?: string;
  venteId?: string;
  userId?: string;
  entrepriseId: string;
}): Promise<void> {
  await supabase.from('transactions_caisse').insert({
    type: data.type,
    montant: data.montant,
    mode_source: data.modeSource,
    description: data.description,
    vente_id: data.venteId || null,
    user_id: data.userId || null,
    entreprise_id: data.entrepriseId,
  });
}
