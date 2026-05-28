'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { getParametres, upsertParametres } from '@/services/parametre';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { User, Building, Lock, History, Save, Pencil, Upload } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();

  // Profile state
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState('');

  // Company state
  const [companyNom, setCompanyNom] = useState('');
  const [slogan, setSlogan] = useState('');
  const [description, setDescription] = useState('');
  const [adresse, setAdresse] = useState('');
  const [ville, setVille] = useState('');
  const [pays, setPays] = useState('');
  const [companyTelephone, setCompanyTelephone] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [siret, setSiret] = useState('');
  const [numeroTva, setNumeroTva] = useState('');
  const [capitalSocial, setCapitalSocial] = useState('');
  const [companySaving, setCompanySaving] = useState(false);

  const [accountCreatedAt, setAccountCreatedAt] = useState('');

  useEffect(() => {
    if (user) {
      setNom(user.nom);
      loadUserDetails();
      if (user.entrepriseId) {
        loadCompany();
      }
    }
  }, [user]);

  async function loadUserDetails() {
    if (!user?.id) return;
    const { data } = await supabase.from('utilisateurs').select('telephone, created_at').eq('id', user.id).single();
    if (data) {
      setTelephone((data as any).telephone ?? '');
      setAccountCreatedAt((data as any).created_at ? new Date((data as any).created_at).toLocaleDateString('fr-FR') : '-');
    }
  }

  async function loadCompany() {
    if (!user?.entrepriseId) return;
    const { data: ent } = await supabase.from('entreprises').select('nom').eq('id', user.entrepriseId).single();
    if (ent) setCompanyNom((ent as any).nom ?? '');
    const params = await getParametres(user.entrepriseId);
    if (params) {
      setSlogan(params.slogan ?? '');
      setDescription(params.description ?? '');
      setAdresse(params.adresse ?? '');
      setVille(params.ville ?? '');
      setPays(params.pays ?? '');
      setCompanyTelephone(params.telephone ?? '');
      setCompanyEmail(params.email ?? '');
      setWebsite(params.website ?? '');
      setSiret(params.siret ?? '');
      setNumeroTva(params.numeroTva ?? '');
      setCapitalSocial(params.capitalSocial?.toString() ?? '');
    }
  }

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    setProfileSaving(true);
    await supabase.from('utilisateurs').update({ nom, telephone: telephone || null }).eq('id', user.id);
    setProfileSaving(false);
  };

  const handleSaveCompany = async () => {
    if (!user?.entrepriseId) return;
    setCompanySaving(true);
    await supabase.from('entreprises').update({ nom: companyNom }).eq('id', user.entrepriseId);
    await upsertParametres(user.entrepriseId, {
      slogan: slogan || undefined,
      description: description || undefined,
      adresse: adresse || undefined,
      ville: ville || undefined,
      pays: pays || undefined,
      telephone: companyTelephone || undefined,
      email: companyEmail || undefined,
      website: website || undefined,
      siret: siret || undefined,
      numeroTva: numeroTva || undefined,
      capitalSocial: capitalSocial ? parseFloat(capitalSocial) : undefined,
    });
    setCompanySaving(false);
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      setPasswordMsg('Les mots de passe ne correspondent pas.');
      return;
    }
    setPasswordSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPasswordMsg(error.message);
    } else {
      setPasswordMsg('Mot de passe mis à jour avec succès.');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    }
    setPasswordSaving(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Paramètres du Compte</h1>
        <p className="text-muted-foreground">Gérez vos informations personnelles et vos préférences.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" />Informations du Profil</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="p-nom">Nom complet</Label>
                  <Input id="p-nom" value={nom} onChange={e => setNom(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="p-email">Email</Label>
                  <Input id="p-email" type="email" value={user?.email ?? ''} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="p-phone">Téléphone</Label>
                  <Input id="p-phone" value={telephone} onChange={e => setTelephone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="p-role">Rôle</Label>
                  <Input id="p-role" value={user?.role ?? ''} disabled />
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleSaveProfile} disabled={profileSaving}>
                  <Save className="h-4 w-4 mr-2" />{profileSaving ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Building className="h-5 w-5" />Informations de l'Entreprise</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="c-nom">Nom de l'entreprise</Label>
                  <Input id="c-nom" value={companyNom} onChange={e => setCompanyNom(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c-slogan">Slogan</Label>
                  <Input id="c-slogan" value={slogan} onChange={e => setSlogan(e.target.value)} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="c-description">Description</Label>
                  <Textarea id="c-description" value={description} onChange={e => setDescription(e.target.value)} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="c-logo">Logo</Label>
                  <div className="flex items-center gap-2">
                    <Input id="c-logo" type="file" className="hidden" />
                    <Button asChild variant="outline">
                      <Label htmlFor="c-logo" className="cursor-pointer">
                        <Upload className="h-4 w-4 mr-2" />Choisir un fichier
                      </Label>
                    </Button>
                    <span className="text-sm text-muted-foreground">Aucun fichier choisi</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c-adresse">Adresse</Label>
                  <Input id="c-adresse" value={adresse} onChange={e => setAdresse(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c-ville">Ville</Label>
                  <Input id="c-ville" value={ville} onChange={e => setVille(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c-pays">Pays</Label>
                  <Input id="c-pays" value={pays} onChange={e => setPays(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c-phone">Téléphone</Label>
                  <Input id="c-phone" value={companyTelephone} onChange={e => setCompanyTelephone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c-email">Email</Label>
                  <Input id="c-email" type="email" value={companyEmail} onChange={e => setCompanyEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c-website">Site Web</Label>
                  <Input id="c-website" value={website} onChange={e => setWebsite(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c-siret">SIRET</Label>
                  <Input id="c-siret" value={siret} onChange={e => setSiret(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c-tva">Numéro TVA</Label>
                  <Input id="c-tva" value={numeroTva} onChange={e => setNumeroTva(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c-capital">Capital Social</Label>
                  <Input id="c-capital" type="number" value={capitalSocial} onChange={e => setCapitalSocial(e.target.value)} />
                </div>
              </div>
              <div className="flex justify-end">
                <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleSaveCompany} disabled={companySaving}>
                  <Save className="h-4 w-4 mr-2" />{companySaving ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5" />Sécurité</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pw-new">Nouveau mot de passe</Label>
                <Input id="pw-new" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pw-confirm">Confirmer le mot de passe</Label>
                <Input id="pw-confirm" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
              </div>
              {passwordMsg && <p className="text-sm text-muted-foreground">{passwordMsg}</p>}
              <div className="flex justify-end">
                <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleChangePassword} disabled={passwordSaving}>
                  <Pencil className="h-4 w-4 mr-2" />{passwordSaving ? 'Modification...' : 'Changer le mot de passe'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" />Activité du Compte</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Date de création</span>
                <span className="font-medium">{accountCreatedAt || '-'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Statut du compte</span>
                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">{user?.statut ?? 'actif'}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
