import { supabase } from '@/lib/supabase';

export interface Relance {
  id: string;
  entrepriseId: string;
  venteId: string;
  clientId?: string;
  niveau: 7 | 15 | 30;
  statut: 'planifie' | 'envoye' | 'ignore';
  emailDestinataire?: string;
  sentAt?: string;
  createdAt?: string;
  // joined
  venteReference?: string;
  venteMontant?: number;
  clientNom?: string;
  clientEmail?: string;
  venteCreatedAt?: string;
}

export async function listRelances(entrepriseId: string): Promise<Relance[]> {
  const { data } = await supabase
    .from('relances')
    .select('*, ventes(reference, montant_total, created_at), clients(nom, email)')
    .eq('entreprise_id', entrepriseId)
    .order('created_at', { ascending: false });

  return (data ?? []).map((r: any) => ({
    id: r.id,
    entrepriseId: r.entreprise_id,
    venteId: r.vente_id,
    clientId: r.client_id ?? undefined,
    niveau: r.niveau,
    statut: r.statut,
    emailDestinataire: r.email_destinataire ?? undefined,
    sentAt: r.sent_at ?? undefined,
    createdAt: r.created_at ?? undefined,
    venteReference: r.ventes?.reference,
    venteMontant: r.ventes?.montant_total,
    clientNom: r.clients?.nom,
    clientEmail: r.clients?.email,
    venteCreatedAt: r.ventes?.created_at,
  }));
}

export async function generateRelances(entrepriseId: string): Promise<number> {
  // Find unpaid ventes (statut en_attente or partiel) older than 7 days
  const cutoff7 = new Date();
  cutoff7.setDate(cutoff7.getDate() - 7);

  const { data: ventes } = await supabase
    .from('ventes')
    .select('id, reference, total, client_id, created_at, clients(email)')
    .eq('entreprise_id', entrepriseId)
    .in('statut', ['en_attente', 'valide'])
    .lt('created_at', cutoff7.toISOString());

  if (!ventes || ventes.length === 0) return 0;

  const now = new Date();
  let created = 0;

  for (const v of ventes) {
    const createdAt = new Date(v.created_at);
    const daysDiff = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const levels: (7 | 15 | 30)[] = [];
    if (daysDiff >= 7) levels.push(7);
    if (daysDiff >= 15) levels.push(15);
    if (daysDiff >= 30) levels.push(30);

    for (const niveau of levels) {
      const { error } = await supabase
        .from('relances')
        .upsert({
          entreprise_id: entrepriseId,
          vente_id: v.id,
          client_id: v.client_id ?? null,
          niveau,
          statut: 'planifie',
          email_destinataire: (v as any).clients?.email ?? null,
        }, { onConflict: 'vente_id,niveau', ignoreDuplicates: true });
      if (!error) created++;
    }
  }

  return created;
}

export async function markRelanceEnvoyee(id: string): Promise<void> {
  await supabase
    .from('relances')
    .update({ statut: 'envoye', sent_at: new Date().toISOString() })
    .eq('id', id);
}

export async function ignoreRelance(id: string): Promise<void> {
  await supabase.from('relances').update({ statut: 'ignore' }).eq('id', id);
}

export function buildEmailContent(relance: Relance, entrepriseNom: string): string {
  const niveauLabel = relance.niveau === 7 ? '1ère' : relance.niveau === 15 ? '2ème' : '3ème';
  return `Objet: ${niveauLabel} relance – Facture ${relance.venteReference ?? relance.venteId}

Bonjour ${relance.clientNom ?? 'Client'},

Nous vous contactons au sujet de la facture ${relance.venteReference ?? relance.venteId} d'un montant de ${(relance.venteMontant ?? 0).toLocaleString('fr-FR')} FCFA, dont le règlement n'a pas encore été enregistré.

Merci de bien vouloir procéder au règlement dans les meilleurs délais ou de nous contacter si vous avez des questions.

Cordialement,
${entrepriseNom}`.trim();
}
