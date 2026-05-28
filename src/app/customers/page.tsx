'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { listClients, createClient, updateClient, deleteClient } from '@/services/client';
import { supabase } from '@/lib/supabase';
import type { Client, Vente } from '@/types';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Info, PlusCircle, Phone, Mail, Eye, Pencil, User, Database, X, Save, Trash2, Search, ArrowLeft, FileUp } from 'lucide-react';
import { ImportDialog } from '@/components/import-dialog';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

type ClientType = 'particulier' | 'revendeur' | 'entreprise';
const typeLabel: Record<ClientType, string> = { particulier: 'Particulier', revendeur: 'Revendeur', entreprise: 'Entreprise' };

export default function CustomersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const [clientVentes, setClientVentes] = useState<Vente[]>([]);
  const [importOpen, setImportOpen] = useState(false);

  const [nom, setNom] = useState('');
  const [type, setType] = useState<ClientType>('particulier');
  const [telephone, setTelephone] = useState('');
  const [email, setEmail] = useState('');
  const [adresse, setAdresse] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => { if (user?.entrepriseId) load(); }, [user]);

  async function load() {
    setLoading(true);
    setClients(await listClients());
    setLoading(false);
  }

  const getTypeBadge = (t: string) =>
    (t === 'revendeur' || t === 'entreprise') ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-gray-100 text-gray-800 border-gray-200';

  const getBalanceColor = (b: number) => b > 0 ? 'text-red-600 font-semibold' : b < 0 ? 'text-green-600 font-semibold' : '';

  const resetForm = () => { setNom(''); setType('particulier'); setTelephone(''); setEmail(''); setAdresse(''); setNotes(''); };

  const handleAddClick = () => { setEditingClient(null); resetForm(); setIsDialogOpen(true); };

  const handleEditClick = (c: Client) => {
    setEditingClient(c);
    setNom(c.nom); setType(c.type); setTelephone(c.telephone ?? '');
    setEmail(c.email ?? ''); setAdresse(c.adresse ?? ''); setNotes(c.notes ?? '');
    setIsDialogOpen(true);
  };

  const handleViewClick = async (c: Client) => {
    setViewingClient(c);
    setClientVentes([]);
    setIsViewDialogOpen(true);
    const { data } = await supabase
      .from('ventes')
      .select('id, reference, type, statut, total, montant_paye, created_at, clients(nom), utilisateurs(nom)')
      .eq('client_id', c.id)
      .order('created_at', { ascending: false });
    if (data) {
      setClientVentes(data.map((r: any) => ({
        id: r.id, entrepriseId: '', reference: r.reference, type: r.type,
        clientNom: r.clients?.nom, statut: r.statut, total: r.total,
        montantPaye: r.montant_paye, createdAt: r.created_at,
      })));
    }
  };

  const handleImportClients = async (rows: Record<string, any>[]) => {
    if (!user?.entrepriseId) return { success: 0, errors: [] };
    let success = 0;
    const errors: { row: number; message: string }[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row.nom) { errors.push({ row: i + 2, message: 'Nom manquant' }); continue; }
      try {
        await createClient({ nom: row.nom, type: row.type || 'particulier', telephone: row.telephone || undefined, email: row.email || undefined, entrepriseId: user.entrepriseId! });
        success++;
      } catch (e: any) { errors.push({ row: i + 2, message: e.message ?? 'Erreur' }); }
    }
    load();
    return { success, errors };
  };

  const handleDelete = async (id: string) => {
    await deleteClient(id);
    setClients(prev => prev.filter(c => c.id !== id));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim() || !user?.entrepriseId) return;
    if (editingClient) {
      await updateClient(editingClient.id, { nom, type, telephone: telephone || undefined, email: email || undefined, adresse: adresse || undefined, notes: notes || undefined });
      setClients(prev => prev.map(c => c.id === editingClient.id ? { ...c, nom, type, telephone, email, adresse, notes } : c));
    } else {
      const created = await createClient({ nom, type, telephone: telephone || undefined, email: email || undefined, adresse: adresse || undefined, notes: notes || undefined, entrepriseId: user.entrepriseId });
      setClients(prev => [...prev, created]);
    }
    setIsDialogOpen(false);
  };

  const filtered = clients.filter(c =>
    c.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.email ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.telephone ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Tableau de bord / Clients</p>
          <h1 className="text-2xl font-bold">Gestion des Clients</h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1">
            <Info className="h-4 w-4" />Liste complète des clients enregistrés
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Rechercher un client..." className="pl-8 w-full sm:w-[250px]" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <FileUp className="h-4 w-4 mr-2" />Importer
          </Button>
          <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleAddClick}>
            <PlusCircle className="h-4 w-4 mr-2" />Nouveau Client
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Ventes</TableHead>
                <TableHead>Solde</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucun client.</TableCell></TableRow>
              ) : filtered.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nom}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm"><Phone className="h-3 w-3" /><span>{c.telephone ?? '-'}</span></div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground"><Mail className="h-3 w-3" /><span>{c.email ?? '-'}</span></div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getTypeBadge(c.type)}>{typeLabel[c.type]}</Badge>
                  </TableCell>
                  <TableCell>{c.nbVentes ?? 0}</TableCell>
                  <TableCell className={getBalanceColor(c.solde ?? 0)}>
                    {new Intl.NumberFormat('fr-FR').format(c.solde ?? 0)} FCFA
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="outline" className="h-8 w-8 rounded-md border-blue-500 text-blue-500 hover:bg-blue-50" onClick={() => handleViewClick(c)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="outline" className="h-8 w-8 rounded-md border-gray-300 text-gray-600 hover:bg-gray-50" onClick={() => handleEditClick(c)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="outline" className="h-8 w-8 rounded-md border-red-500 text-red-500 hover:bg-red-50">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                            <AlertDialogDescription>Cette action est irréversible. Le client sera définitivement supprimé.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(c.id)} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Importer des clients"
        templateFileName="modele-clients.xlsx"
        columns={[
          { key: 'nom', label: 'Nom', required: true },
          { key: 'type', label: 'Type' },
          { key: 'telephone', label: 'Téléphone' },
          { key: 'email', label: 'Email' },
        ]}
        onImport={handleImportClients}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-3xl">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>{editingClient ? 'Modifier Client' : 'Nouveau Client'}</DialogTitle>
              <DialogDescription>{editingClient ? 'Modifier les informations du client.' : 'Ajouter un nouveau client.'}</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
              <div className="space-y-4">
                <h3 className="flex items-center gap-2 font-semibold text-green-700"><User className="h-5 w-5" />Client</h3>
                <div className="space-y-2">
                  <Label htmlFor="nom">Nom complet <span className="text-red-500">*</span></Label>
                  <Input id="nom" placeholder="Nom complet du client" value={nom} onChange={e => setNom(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Type de client</Label>
                  <Select value={type} onValueChange={(v: ClientType) => setType(v)}>
                    <SelectTrigger id="type"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="particulier">Particulier</SelectItem>
                      <SelectItem value="revendeur">Revendeur</SelectItem>
                      <SelectItem value="entreprise">Entreprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telephone">Téléphone</Label>
                  <Input id="telephone" placeholder="Numéro de téléphone" value={telephone} onChange={e => setTelephone(e.target.value)} />
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="flex items-center gap-2 font-semibold text-green-700"><Database className="h-5 w-5" />Plus d'Informations</h3>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="Adresse email" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adresse">Adresse</Label>
                  <Textarea id="adresse" placeholder="Adresse du client" value={adresse} onChange={e => setAdresse(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" placeholder="Notes additionnelles" value={notes} onChange={e => setNotes(e.target.value)} />
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:justify-end pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline"><X className="h-4 w-4 mr-2" />Annuler</Button>
              </DialogClose>
              <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white">
                <Save className="h-4 w-4 mr-2" />Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Fiche Client</DialogTitle>
            <DialogDescription>Détails et historique du client {viewingClient?.nom}.</DialogDescription>
          </DialogHeader>
          {viewingClient && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
              <div className="md:col-span-1 space-y-6">
                <Card>
                  <CardHeader><CardTitle className="text-base">Informations Client</CardTitle></CardHeader>
                  <CardContent className="flex flex-col items-center text-center space-y-4">
                    <Avatar className="h-24 w-24">
                      <AvatarFallback className="text-4xl">{viewingClient.nom.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="text-2xl font-bold">{viewingClient.nom}</h2>
                      <Badge variant="outline" className={getTypeBadge(viewingClient.type)}>{typeLabel[viewingClient.type]}</Badge>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">Coordonnées</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /><span>{viewingClient.telephone || 'Non renseigné'}</span></div>
                    <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /><span>{viewingClient.email || 'Non renseigné'}</span></div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">Solde Client</CardTitle></CardHeader>
                  <CardContent>
                    <p className={`text-2xl font-bold ${getBalanceColor(viewingClient.solde ?? 0)}`}>
                      {new Intl.NumberFormat('fr-FR').format(viewingClient.solde ?? 0)} FCFA
                    </p>
                    <p className="text-xs text-muted-foreground">Total dû</p>
                  </CardContent>
                </Card>
              </div>
              <div className="md:col-span-2">
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>Historique des Ventes</CardTitle>
                      <Badge variant="secondary">{clientVentes.length} vente(s)</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Référence</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Montant</TableHead>
                          <TableHead>Statut</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clientVentes.length === 0 ? (
                          <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Aucune vente pour ce client.</TableCell></TableRow>
                        ) : clientVentes.map(v => (
                          <TableRow key={v.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/sales/${v.id}`)}>
                            <TableCell className="font-medium">{v.reference}</TableCell>
                            <TableCell>{v.createdAt ? new Date(v.createdAt).toLocaleDateString('fr-FR') : '-'}</TableCell>
                            <TableCell>{v.total.toLocaleString('fr-FR')} FCFA</TableCell>
                            <TableCell>
                              <Badge variant={v.statut === 'paye' ? 'default' : 'secondary'} className={v.statut === 'paye' ? 'bg-green-500/20 text-green-700' : ''}>
                                {v.statut}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:justify-start pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline"><ArrowLeft className="h-4 w-4 mr-2" />Retour</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
