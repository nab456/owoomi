import { supabase } from '@/lib/supabase';
import type { PermissionUtilisateur } from '@/types';

export const LISTE_PERMISSIONS = [
  'gerer_produits', 'voir_stock', 'modifier_stock', 'ajouter_stock', 'retirer_stock',
  'gerer_ventes', 'gerer_factures', 'voir_clients', 'creer_clients',
  'voir_fournisseurs', 'gerer_paiements_fournisseurs',
  'voir_finances', 'gerer_depenses', 'gerer_caisse',
  'gerer_commerciaux', 'gerer_utilisateurs', 'gerer_permissions', 'gerer_parametres',
  'voir_rapports', 'exporter_rapports', 'voir_dashboard',
] as const;

export type Permission = typeof LISTE_PERMISSIONS[number];

export async function getPermissions(utilisateurId: string): Promise<Record<string, boolean>> {
  const { data } = await supabase
    .from('permissions_utilisateurs')
    .select('permission, valeur')
    .eq('utilisateur_id', utilisateurId);

  const result: Record<string, boolean> = {};
  for (const p of LISTE_PERMISSIONS) result[p] = false;
  for (const row of data ?? []) result[row.permission] = row.valeur;
  return result;
}

export async function savePermissions(
  utilisateurId: string,
  entrepriseId: string,
  permissions: Record<string, boolean>
): Promise<void> {
  const rows = Object.entries(permissions).map(([permission, valeur]) => ({
    utilisateur_id: utilisateurId,
    entreprise_id: entrepriseId,
    permission,
    valeur,
  }));

  await supabase
    .from('permissions_utilisateurs')
    .upsert(rows, { onConflict: 'utilisateur_id,permission' });
}
