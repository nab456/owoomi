import { supabase } from '@/lib/supabase';
import type { Entree } from '@/types';

function generateReference(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `ENT-${dateStr}`;
}

function mapRow(row: Record<string, unknown>): Entree {
  return {
    id: row.id as string,
    entrepriseId: row.entreprise_id as string,
    reference: row.reference as string,
    date: row.date as string,
    montant: row.montant as number,
    categorie: row.categorie as string,
    modePaiement: row.mode_paiement as string,
    notes: (row.notes as string) ?? undefined,
    userId: (row.user_id as string) ?? undefined,
    createdAt: row.created_at as string,
  };
}

export async function listEntrees(): Promise<Entree[]> {
  const { data, error } = await supabase
    .from('entrees')
    .select('*')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(mapRow);
}

export async function createEntree(data: {
  date: string;
  montant: number;
  categorie: string;
  modePaiement: string;
  notes?: string;
  userId?: string;
  entrepriseId: string;
}): Promise<Entree> {
  const reference = generateReference();
  const { data: result, error } = await supabase
    .from('entrees')
    .insert({
      reference,
      date: data.date,
      montant: data.montant,
      categorie: data.categorie,
      mode_paiement: data.modePaiement,
      notes: data.notes,
      user_id: data.userId || null,
      entreprise_id: data.entrepriseId,
    })
    .select()
    .single();
  if (error || !result) throw new Error(error?.message ?? 'Erreur création entrée');
  return mapRow(result as Record<string, unknown>);
}
