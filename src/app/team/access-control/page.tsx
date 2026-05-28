'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { getPermissions, savePermissions, LISTE_PERMISSIONS } from '@/services/permission';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { User, Shield, Save } from 'lucide-react';

const permissionLabel: Record<string, string> = {
  gerer_produits: 'Gérer les produits',
  voir_stock: 'Voir les niveaux de stock',
  modifier_stock: 'Modifier les niveaux de stock',
  ajouter_stock: 'Ajouter du stock',
  retirer_stock: 'Retirer du stock',
  gerer_ventes: 'Gérer les ventes',
  gerer_factures: 'Gérer les factures',
  voir_clients: 'Voir la liste des clients',
  creer_clients: 'Créer ou modifier des clients',
  voir_fournisseurs: 'Voir la liste des fournisseurs',
  gerer_paiements_fournisseurs: 'Gérer les paiements fournisseurs',
  voir_finances: 'Gérer les finances',
  gerer_depenses: 'Gérer les dépenses',
  gerer_caisse: "Voir l'état de la caisse",
  gerer_commerciaux: 'Gérer les commerciaux',
  gerer_utilisateurs: 'Gérer les utilisateurs',
  gerer_permissions: 'Gérer les permissions',
  gerer_parametres: 'Gérer les paramètres système',
  voir_rapports: 'Voir les rapports',
  exporter_rapports: 'Exporter les rapports',
  voir_dashboard: 'Voir le tableau de bord',
};

interface DbUser {
  id: string;
  nom: string;
  email: string;
  statut: string;
}

export default function AccessControlPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<DbUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<DbUser | null>(null);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (user?.entrepriseId) loadUsers(); }, [user]);

  async function loadUsers() {
    setLoading(true);
    const { data } = await supabase
      .from('utilisateurs')
      .select('id, nom, email, statut')
      .eq('entreprise_id', user!.entrepriseId!)
      .order('nom');
    const list = data ?? [];
    setUsers(list);
    if (list.length > 0) handleUserSelect(list[0]);
    setLoading(false);
  }

  async function handleUserSelect(u: DbUser) {
    setSelectedUser(u);
    const perms = await getPermissions(u.id);
    setPermissions(perms);
  }

  const handlePermissionChange = (permission: string, value: boolean) => {
    setPermissions(prev => ({ ...prev, [permission]: value }));
  };

  const handleSave = async () => {
    if (!selectedUser || !user?.entrepriseId) return;
    setSaving(true);
    await savePermissions(selectedUser.id, user.entrepriseId, permissions);
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Tableau de bord / Contrôle d'Accès</p>
        <h1 className="text-2xl font-bold">Contrôle d'Accès</h1>
        <p className="text-muted-foreground">Gestion des permissions des utilisateurs</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Liste des Utilisateurs
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex flex-col">
                {loading ? (
                  <div className="px-6 py-8 text-center text-muted-foreground text-sm">Chargement...</div>
                ) : users.length === 0 ? (
                  <div className="px-6 py-8 text-center text-muted-foreground text-sm">Aucun utilisateur.</div>
                ) : users.map(u => (
                  <button key={u.id} onClick={() => handleUserSelect(u)}
                    className={`text-left px-6 py-4 border-b last:border-b-0 hover:bg-muted/50 transition-colors ${selectedUser?.id === u.id ? 'bg-green-50 border-l-4 border-green-500' : ''}`}>
                    <div className="flex justify-between items-center">
                      <div className="font-medium">{u.nom}</div>
                      <Badge variant="outline" className={u.statut === 'actif' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-800 border-gray-200'}>
                        {u.statut}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">{u.email}</div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Permissions pour {selectedUser?.nom ?? '...'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {LISTE_PERMISSIONS.map(permission => (
                  <div key={permission} className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-muted/50">
                    <Label htmlFor={permission} className="text-sm pr-2">{permissionLabel[permission] ?? permission}</Label>
                    <Switch
                      id={permission}
                      checked={permissions[permission] || false}
                      onCheckedChange={(value) => handlePermissionChange(permission, value)}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-8 flex justify-start">
                <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleSave} disabled={saving || !selectedUser}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Enregistrement...' : 'Enregistrer les Permissions'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
