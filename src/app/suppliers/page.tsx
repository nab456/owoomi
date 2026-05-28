'use client';
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  listFournisseurs, createFournisseur, updateFournisseur, deleteFournisseur,
  listPaiementsFournisseur, createPaiementFournisseur,
} from '@/services/fournisseur';
import { MODES_PAIEMENT } from '@/services/caisse';
import type { Fournisseur, PaiementFournisseur } from '@/types';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Info, Search, PlusCircle, Phone, Mail, Eye, Pencil, X, Save, Trash2, MapPin, ArrowLeft } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function SuppliersPage() {
  const { user } = useAuth();
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isPayDialogOpen, setIsPayDialogOpen] = useState(false);
  const [editingFournisseur, setEditingFournisseur] = useState<Fournisseur | null>(null);
  const [viewingFournisseur, setViewingFournisseur] = useState<Fournisseur | null>(null);
  const [paiements, setPaiements] = useState<PaiementFournisseur[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [email, setEmail] = useState('');
  const [adresse, setAdresse] = useState('');
  const [notes, setNotes] = useState('');

  const [payMontant, setPayMontant] = useState('');
  const [payMode, setPayMode] = useState('');
  const [payNotes, setPayNotes] = useState('');

  useEffect(() => { if (user?.entrepriseId) load(); }, [user]);

  async function load() {
    setLoading(true);
    setFournisseurs(await listFournisseurs());
    setLoading(false);
  }

  const getBalanceColor = (b: number) => b < 0 ? 'text-red-600 font-semibold' : b > 0 ? 'text-green-600 font-semibold' : '';

  const resetForm = () => { setNom(''); setTelephone(''); setEmail(''); setAdresse(''); setNotes(''); };

  const handleAddClick = () => { setEditingFournisseur(null); resetForm(); setIsDialogOpen(true); };

  const handleEditClick = (f: Fournisseur) => {
    setEditingFournisseur(f);
    setNom(f.nom); setTelephone(f.telephone ?? '');
    setEmail(f.email ?? ''); setAdresse(f.adresse ?? ''); setNotes(f.notes ?? '');
    setIsDialogOpen(true);
  };

  const handleViewClick = async (f: Fournisseur) => {
    setViewingFournisseur(f);
    setPaiements([]);
    setIsViewDialogOpen(true);
    setPaiements(await listPaiementsFournisseur(f.id));
  };

  const handleDelete = async (id: string) => {
    await deleteFournisseur(id);
    setFournisseurs(prev => prev.filter(f => f.id !== id));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim() || !user?.entrepriseId) return;
    if (editingFournisseur) {
      await updateFournisseur(editingFournisseur.id, { nom, telephone: telephone || undefined, email: email || undefined, adresse: adresse || undefined, notes: notes || undefined });
      setFournisseurs(prev => prev.map(f => f.id === editingFournisseur.id ? { ...f, nom, telephone, email, adresse, notes } : f));
    } else {
      const created = await createFournisseur({ nom, telephone: telephone || undefined, email: email || undefined, adresse: adresse || undefined, notes: notes || undefined, entrepriseId: user.entrepriseId });
      setFournisseurs(prev => [...prev, created]);
    }
    setIsDialogOpen(false);
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payMontant || !payMode || !viewingFournisseur || !user?.entrepriseId) return;
    await createPaiementFournisseur({
      fournisseurId: viewingFournisseur.id,
      montant: parseFloat(payMontant),
      mode: payMode,
      notes: payNotes || undefined,
      userId: user.id,
      entrepriseId: user.entrepriseId,
    });
    setIsPayDialogOpen(false);
    setPayMontant(''); setPayMode(''); setPayNotes('');
    const updated = await listPaiementsFournisseur(viewingFournisseur.id);
    setPaiements(updated);
    await load();
  };

  const filtered = fournisseurs.filter(f =>
    f.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.email ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.telephone ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Tableau de bord / Fournisseurs</p>
              <CardTitle className="text-2xl font-bold mt-1">Gestion des Fournisseurs</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-2">
                <Info className="h-4 w-4" />Liste complète des fournisseurs
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Rechercher un fournisseur" className="pl-8 w-full sm:w-[250px]" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleAddClick}>
                <PlusCircle className="h-4 w-4 mr-2" />Nouveau Fournisseur
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Solde</TableHead>
                <TableHead>Paiements</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucun fournisseur.</TableCell></TableRow>
              ) : filtered.map(f => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.nom}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm"><Phone className="h-3 w-3" /><span>{f.telephone ?? '-'}</span></div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground"><Mail className="h-3 w-3" /><span>{f.email ?? '-'}</span></div>
                  </TableCell>
                  <TableCell className={getBalanceColor(f.solde ?? 0)}>
                    {new Intl.NumberFormat('fr-FR').format(f.solde ?? 0)} FCFA
                  </TableCell>
                  <TableCell>{f.nbPaiements ?? 0}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="outline" className="h-8 w-8 rounded-full border-blue-500 text-blue-500 hover:bg-blue-50" onClick={() => handleViewClick(f)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="outline" className="h-8 w-8 rounded-full border-gray-300 text-gray-600 hover:bg-gray-50" onClick={() => handleEditClick(f)}>
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
                            <AlertDialogDescription>Cette action est irréversible. Le fournisseur sera définitivement supprimé.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(f.id)} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
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

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>{editingFournisseur ? 'Modifier Fournisseur' : 'Nouveau Fournisseur'}</DialogTitle>
              <DialogDescription>{editingFournisseur ? 'Modifier les informations du fournisseur' : 'Ajouter un nouveau fournisseur'}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="s-nom">Nom <span className="text-red-500">*</span></Label>
                <Input id="s-nom" placeholder="Nom du fournisseur" value={nom} onChange={e => setNom(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-phone">Téléphone</Label>
                <Input id="s-phone" placeholder="Numéro de téléphone" value={telephone} onChange={e => setTelephone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-email">Email</Label>
                <Input id="s-email" type="email" placeholder="Adresse email" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-adresse">Adresse</Label>
                <Textarea id="s-adresse" placeholder="Adresse du fournisseur" value={adresse} onChange={e => setAdresse(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-notes">Notes</Label>
                <Textarea id="s-notes" placeholder="Notes additionnelles" value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:justify-end pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline"><X className="h-4 w-4 mr-2" />Annuler</Button>
              </DialogClose>
              <Button type="submit"><Save className="h-4 w-4 mr-2" />Enregistrer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Tableau de bord / Fournisseurs / Détails</p>
                <DialogTitle>Fiche Fournisseur</DialogTitle>
                <DialogDescription>{viewingFournisseur?.nom}</DialogDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                  <ArrowLeft className="h-4 w-4 mr-2" />Retour
                </Button>
                <Button variant="outline" onClick={() => { if (viewingFournisseur) { handleEditClick(viewingFournisseur); setIsViewDialogOpen(false); } }}>
                  <Pencil className="h-4 w-4 mr-2" />Modifier
                </Button>
                <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => setIsPayDialogOpen(true)}>
                  Enregistrer Paiement
                </Button>
              </div>
            </div>
          </DialogHeader>
          {viewingFournisseur && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
              <div className="md:col-span-1 space-y-4">
                <Card>
                  <CardHeader><CardTitle className="text-base">Informations</CardTitle></CardHeader>
                  <CardContent className="flex flex-col items-center text-center space-y-4">
                    <Avatar className="h-24 w-24">
                      <AvatarFallback className="text-4xl">{viewingFournisseur.nom.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <h2 className="text-2xl font-bold">{viewingFournisseur.nom}</h2>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">Coordonnées</CardTitle></CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /><span>{viewingFournisseur.telephone || 'Non renseigné'}</span></div>
                    <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /><span>{viewingFournisseur.email || 'Non renseigné'}</span></div>
                    <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /><span>{viewingFournisseur.adresse || 'Non renseignée'}</span></div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">Solde</CardTitle></CardHeader>
                  <CardContent>
                    <p className={`text-2xl font-bold ${getBalanceColor(viewingFournisseur.solde ?? 0)}`}>
                      {new Intl.NumberFormat('fr-FR').format(viewingFournisseur.solde ?? 0)} FCFA
                    </p>
                    <p className="text-xs text-muted-foreground">Total dû</p>
                  </CardContent>
                </Card>
              </div>
              <div className="md:col-span-2">
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>Historique des Paiements</CardTitle>
                      <Badge variant="secondary">{paiements.length} paiement(s)</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Montant</TableHead>
                          <TableHead>Mode</TableHead>
                          <TableHead>Référence</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paiements.length === 0 ? (
                          <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Aucun paiement.</TableCell></TableRow>
                        ) : paiements.map(p => (
                          <TableRow key={p.id}>
                            <TableCell>{p.createdAt ? new Date(p.createdAt).toLocaleString('fr-FR') : '-'}</TableCell>
                            <TableCell className="font-medium text-red-600">{new Intl.NumberFormat('fr-FR').format(p.montant)} FCFA</TableCell>
                            <TableCell>{p.mode}</TableCell>
                            <TableCell>{p.reference ?? '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={isPayDialogOpen} onOpenChange={setIsPayDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handlePay}>
            <DialogHeader>
              <DialogTitle>Enregistrer un Paiement</DialogTitle>
              <DialogDescription>{viewingFournisseur?.nom}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="pay-montant">Montant (FCFA) <span className="text-red-500">*</span></Label>
                <Input id="pay-montant" type="number" placeholder="0" value={payMontant} onChange={e => setPayMontant(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pay-mode">Mode de paiement <span className="text-red-500">*</span></Label>
                <Select value={payMode} onValueChange={setPayMode}>
                  <SelectTrigger id="pay-mode"><SelectValue placeholder="-- Sélectionner --" /></SelectTrigger>
                  <SelectContent>
                    {MODES_PAIEMENT.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pay-notes">Notes</Label>
                <Textarea id="pay-notes" placeholder="Notes..." value={payNotes} onChange={e => setPayNotes(e.target.value)} />
              </div>
            </div>
            <DialogFooter className="gap-2 pt-4">
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
    </>
  );
}
