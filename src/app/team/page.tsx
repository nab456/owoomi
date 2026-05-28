'use client';
import { useState, useEffect } from 'react';
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
import { User, Shield, Save, PlusCircle, Info, X } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

interface TeamUser {
  id: string;
  nom: string;
  email: string;
  role: string;
  statut: string;
  createdAt?: string;
}

const permissionLabel: Record<string, string> = {
  gerer_produits: 'Gérer les produits',
  voir_stock: 'Voir les niveaux de stock',
  modifier_stock: 'Modifier les niveaux de stock',
  ajouter_stock: 'Ajouter du stock',
  retirer_stock: 'Retirer du stock',
  gerer_ventes: 'Gérer les ventes',
  gerer_factures: 'Gérer les factures',
  voir_clients: 'Voir les clients',
  creer_clients: 'Créer ou modifier des clients',
  voir_fournisseurs: 'Voir les fournisseurs',
  gerer_paiements_fournisseurs: 'Gérer les paiements fournisseurs',
  voir_finances: 'Gérer les finances',
  gerer_depenses: 'Gérer les dépenses',
  gerer_caisse: 'Voir l\'état de la caisse',
  gerer_commerciaux: 'Gérer les commerciaux',
  gerer_utilisateurs: 'Gérer les utilisateurs',
  gerer_permissions: 'Gérer les permissions',
  gerer_parametres: 'Gérer les paramètres système',
  voir_rapports: 'Voir les rapports',
  exporter_rapports: 'Exporter les rapports',
  voir_dashboard: 'Voir le dashboard',
};

export default function TeamPage() {
  const { user } = useAuth();
  const [teamUsers, setTeamUsers] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<TeamUser | null>(null);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const [newNom, setNewNom] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('commercial');
  const [newPassword, setNewPassword] = useState('');
  const [newActif, setNewActif] = useState(true);

  useEffect(() => { if (user?.entrepriseId) load(); }, [user]);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('utilisateurs')
      .select('id, nom, email, role, statut, created_at')
      .eq('entreprise_id', user!.entrepriseId!)
      .order('nom');
    const list: TeamUser[] = (data ?? []).map((r: any) => ({
      id: r.id, nom: r.nom, email: r.email, role: r.role, statut: r.statut, createdAt: r.created_at,
    }));
    setTeamUsers(list);
    if (list.length > 0 && !selectedUser) {
      setSelectedUser(list[0]);
      const perms = await getPermissions(list[0].id);
      setPermissions(perms);
    }
    setLoading(false);
  }

  const handleUserSelect = async (u: TeamUser) => {
    setSelectedUser(u);
    const perms = await getPermissions(u.id);
    setPermissions(perms);
  };

  const handlePermissionChange = (permission: string, value: boolean) => {
    setPermissions(prev => ({ ...prev, [permission]: value }));
  };

  const handleSavePermissions = async () => {
    if (!selectedUser || !user?.entrepriseId) return;
    setSaving(true);
    await savePermissions(selectedUser.id, user.entrepriseId, permissions);
    setSaving(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNom || !newEmail || !newPassword || !user?.entrepriseId) return;
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: newEmail,
      password: newPassword,
      options: { data: { nom: newNom, entreprise_id: user.entrepriseId, role: newRole } },
    });
    if (authError || !authData.user) return;
    await supabase.from('utilisateurs').insert({
      id: authData.user.id,
      nom: newNom,
      email: newEmail,
      role: newRole,
      statut: newActif ? 'actif' : 'inactif',
      entreprise_id: user.entrepriseId,
    });
    setNewNom(''); setNewEmail(''); setNewRole('commercial'); setNewPassword(''); setNewActif(true);
    await load();
  };

  const getStatusBadge = (statut: string) =>
    statut === 'actif' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Tableau de bord / Utilisateurs</p>
          <h1 className="text-2xl font-bold">Gestion des Utilisateurs & Permissions</h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1">
            <Info className="h-4 w-4" />Gérez les comptes utilisateurs et leurs permissions
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
              <PlusCircle className="h-4 w-4 mr-2" />Nouvel Utilisateur
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleCreateUser}>
              <DialogHeader>
                <DialogTitle>Nouvel Utilisateur</DialogTitle>
                <DialogDescription>Ajoutez un nouvel utilisateur au système</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="new-nom">Nom complet <span className="text-red-500">*</span></Label>
                  <Input id="new-nom" placeholder="Nom complet" value={newNom} onChange={e => setNewNom(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-email">Email <span className="text-red-500">*</span></Label>
                  <Input id="new-email" type="email" placeholder="Adresse email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-role">Rôle <span className="text-red-500">*</span></Label>
                  <Select value={newRole} onValueChange={setNewRole}>
                    <SelectTrigger id="new-role"><SelectValue placeholder="Sélectionner un rôle" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="commercial">Commercial</SelectItem>
                      <SelectItem value="comptable">Comptable</SelectItem>
                      <SelectItem value="gestionnaire">Gestionnaire</SelectItem>
                      <SelectItem value="PDG">PDG</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">Mot de passe <span className="text-red-500">*</span></Label>
                  <Input id="new-password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                  <p className="text-xs text-muted-foreground">Minimum 8 caractères</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="new-actif" checked={newActif} onCheckedChange={(v) => setNewActif(!!v)} />
                  <Label htmlFor="new-actif" className="font-normal">Compte actif</Label>
                </div>
              </div>
              <DialogFooter className="gap-2 sm:justify-end">
                <DialogClose asChild>
                  <Button type="button" variant="outline"><X className="h-4 w-4 mr-2" />Annuler</Button>
                </DialogClose>
                <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white">
                  <PlusCircle className="h-4 w-4 mr-2" />Créer
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />Liste des Utilisateurs
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex flex-col">
                {loading ? (
                  <div className="p-6 text-center text-muted-foreground">Chargement...</div>
                ) : teamUsers.map(u => (
                  <button key={u.id} onClick={() => handleUserSelect(u)}
                    className={`text-left px-6 py-4 border-b last:border-b-0 hover:bg-muted/50 transition-colors ${selectedUser?.id === u.id ? 'bg-green-50 border-l-4 border-green-500' : ''}`}>
                    <div className="flex justify-between items-center">
                      <div className="font-medium">{u.nom}</div>
                      <Badge variant="outline" className={getStatusBadge(u.statut)}>{u.statut}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">{u.email}</div>
                    <div className="text-xs text-muted-foreground mt-1">{u.role}</div>
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
                Permissions {selectedUser ? `pour ${selectedUser.nom}` : ''}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedUser ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {LISTE_PERMISSIONS.map(p => (
                      <div key={p} className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-muted/50">
                        <Label htmlFor={p} className="text-sm pr-2">{permissionLabel[p] ?? p}</Label>
                        <Switch id={p} checked={permissions[p] || false} onCheckedChange={v => handlePermissionChange(p, v)} />
                      </div>
                    ))}
                  </div>
                  <div className="mt-8 flex justify-start">
                    <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleSavePermissions} disabled={saving}>
                      <Save className="h-4 w-4 mr-2" />{saving ? 'Enregistrement...' : 'Enregistrer les Permissions'}
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground text-center py-8">Sélectionnez un utilisateur pour gérer ses permissions.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
