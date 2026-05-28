import { supabase } from '@/lib/supabase';
import type { ParametresEntreprise } from '@/types';

function mapRow(row: Record<string, unknown>): ParametresEntreprise {
  return {
    id: row.id as string,
    entrepriseId: row.entreprise_id as string,
    slogan: (row.slogan as string) ?? undefined,
    description: (row.description as string) ?? undefined,
    logoUrl: (row.logo_url as string) ?? undefined,
    adresse: (row.adresse as string) ?? undefined,
    ville: (row.ville as string) ?? undefined,
    pays: (row.pays as string) ?? undefined,
    telephone: (row.telephone as string) ?? undefined,
    email: (row.email as string) ?? undefined,
    website: (row.website as string) ?? undefined,
    siret: (row.siret as string) ?? undefined,
    numeroTva: (row.numero_tva as string) ?? undefined,
    capitalSocial: (row.capital_social as number) ?? undefined,
  };
}

export async function getParametres(entrepriseId: string): Promise<ParametresEntreprise | null> {
  const { data, error } = await supabase
    .from('parametres_entreprise')
    .select('*')
    .eq('entreprise_id', entrepriseId)
    .single();
  if (error || !data) return null;
  return mapRow(data as Record<string, unknown>);
}

export async function upsertParametres(
  entrepriseId: string,
  data: Partial<Omit<ParametresEntreprise, 'id' | 'entrepriseId'>>
): Promise<void> {
  const update: Record<string, unknown> = { entreprise_id: entrepriseId };
  if (data.slogan !== undefined) update.slogan = data.slogan;
  if (data.description !== undefined) update.description = data.description;
  if (data.logoUrl !== undefined) update.logo_url = data.logoUrl;
  if (data.adresse !== undefined) update.adresse = data.adresse;
  if (data.ville !== undefined) update.ville = data.ville;
  if (data.pays !== undefined) update.pays = data.pays;
  if (data.telephone !== undefined) update.telephone = data.telephone;
  if (data.email !== undefined) update.email = data.email;
  if (data.website !== undefined) update.website = data.website;
  if (data.siret !== undefined) update.siret = data.siret;
  if (data.numeroTva !== undefined) update.numero_tva = data.numeroTva;
  if (data.capitalSocial !== undefined) update.capital_social = data.capitalSocial;

  await supabase
    .from('parametres_entreprise')
    .upsert(update, { onConflict: 'entreprise_id' });
}
