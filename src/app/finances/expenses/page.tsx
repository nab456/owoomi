'use client';
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { listDepenses, createDepense, deleteDepense } from '@/services/depense';
import { listFournisseurs } from '@/services/fournisseur';
import { MODES_PAIEMENT } from '@/services/caisse';
import type { Depense, Fournisseur } from '@/types';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Info, Search, Plus, ClipboardList, Banknote, CalendarDays, Trash2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function ExpensesPage() {
  const { user } = useAuth();
  const [depenses, setDepenses] = useState<Depense[]>([]);
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [montant, setMontant] = useState('');
  const [categorie, setCategorie] = useState('');
  const [fournisseurId, setFournisseurId] = useState('');
  const [modePaiement, setModePaiement] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => { if (user?.entrepriseId) load(); }, [user]);

  async function load() {
    setLoading(true);
    const [deps, fours] = await Promise.all([listDepenses(), listFournisseurs()]);
    setDepenses(deps);
    setFournisseurs(fours);
    setLoading(false);
  }

  const totalMontant = depenses.reduce((s, d) => s + d.montant, 0);
  const today = new Date().toDateString();
  const depensesAujourdhui = depenses.filter(d => new Date(d.createdAt ?? '').toDateString() === today);

  const handleOpenDialog = () => {
    setMontant(''); setCategorie(''); setFournisseurId(''); setModePaiement(''); setNotes('');
    setIsDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!montant || !categorie || !modePaiement || !user?.entrepriseId) return;
    const created = await createDepense({
      date: new Date().toISOString().split('T')[0],
      montant: parseFloat(montant),
      categorie,
      fournisseurId: fournisseurId || undefined,
      modePaiement,
      notes: notes || undefined,
      userId: user.id,
      entrepriseId: user.entrepriseId,
    });
    setDepenses(prev => [created, ...prev]);
    setIsDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    await deleteDepense(id);
    setDepenses(prev => prev.filter(d => d.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Gestion des Dépenses</h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1">
            <Info className="h-4 w-4" />Suivi des dépenses de l'entreprise
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Rechercher dépenses..." className="pl-8 w-full sm:w-[300px]" />
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleOpenDialog}>
                <Plus className="h-4 w-4 mr-2" />Nouvelle Dépense
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <form onSubmit={handleSave}>
                <DialogHeader>
                  <DialogTitle>Nouvelle Dépense</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="d-montant">Montant (FCFA) <span className="text-red-500">*</span></Label>
                    <Input id="d-montant" type="number" placeholder="0.00" value={montant} onChange={e => setMontant(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="d-categorie">Catégorie <span className="text-red-500">*</span></Label>
                    <Input id="d-categorie" placeholder="Ex: Fournitures de bureau" value={categorie} onChange={e => setCategorie(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="d-fournisseur">Fournisseur (Facultatif)</Label>
                    <Select value={fournisseurId} onValueChange={setFournisseurId}>
                      <SelectTrigger id="d-fournisseur"><SelectValue placeholder="-- Sélectionner --" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Aucun</SelectItem>
                        {fournisseurs.map(f => <SelectItem key={f.id} value={f.id}>{f.nom}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="d-mode">Mode de Paiement <span className="text-red-500">*</span></Label>
                    <Select value={modePaiement} onValueChange={setModePaiement}>
                      <SelectTrigger id="d-mode"><SelectValue placeholder="-- Sélectionner --" /></SelectTrigger>
                      <SelectContent>
                        {MODES_PAIEMENT.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="d-notes">Notes (Facultatif)</Label>
                    <Textarea id="d-notes" placeholder="Notes additionnelles..." value={notes} onChange={e => setNotes(e.target.value)} />
                  </div>
                </div>
                <DialogFooter className="pt-4 gap-2">
                  <DialogClose asChild>
                    <Button type="button" variant="outline">Annuler</Button>
                  </DialogClose>
                  <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white">Enregistrer</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">DÉPENSES TOTALES</CardTitle>
            <ClipboardList className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{depenses.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MONTANT TOTAL</CardTitle>
            <Banknote className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalMontant.toLocaleString('fr-FR')} FCFA</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">DÉPENSES AUJOURD'HUI</CardTitle>
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{depensesAujourdhui.length}</div>
            <p className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full inline-block mt-1 font-semibold">
              {depensesAujourdhui.reduce((s, d) => s + d.montant, 0).toLocaleString('fr-FR')} FCFA
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Référence</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Fournisseur</TableHead>
                <TableHead>Mode Paiement</TableHead>
                <TableHead>Enregistré par</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
              ) : depenses.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Aucune dépense.</TableCell></TableRow>
              ) : depenses.map(d => (
                <TableRow key={d.id}>
                  <TableCell>{d.date ? new Date(d.date).toLocaleDateString('fr-FR') : '-'}</TableCell>
                  <TableCell className="font-medium">{d.reference}</TableCell>
                  <TableCell>{d.montant.toLocaleString('fr-FR')} FCFA</TableCell>
                  <TableCell>{d.categorie}</TableCell>
                  <TableCell>{d.fournisseurNom ?? 'Aucun'}</TableCell>
                  <TableCell>{d.modePaiement}</TableCell>
                  <TableCell>{d.userNom ?? '-'}</TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-red-600 hover:bg-red-100">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer cette dépense ?</AlertDialogTitle>
                          <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(d.id)} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
