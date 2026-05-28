'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  listBonsCommande, createBonCommande, getBonCommande, recevoirBonCommande,
  deleteBonCommande, updateBonCommandeStatut, type BonCommande, type BonCommandeItem,
} from '@/services/bon-commande';
import { listFournisseurs } from '@/services/fournisseur';
import { listProduits } from '@/services/produit';
import type { Fournisseur, Produit } from '@/types';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { PlusCircle, Trash2, PackageCheck, Send, Info } from 'lucide-react';

const statutLabel: Record<string, string> = { brouillon: 'Brouillon', envoye: 'Envoyé', partiel: 'Partiel', recu: 'Reçu', annule: 'Annulé' };
const statutBadge: Record<string, string> = {
  brouillon: 'bg-yellow-100 text-yellow-800', envoye: 'bg-blue-100 text-blue-800',
  partiel: 'bg-orange-100 text-orange-800', recu: 'bg-green-100 text-green-800', annule: 'bg-gray-100 text-gray-800',
};

interface CartItem { produitId?: string; nomProduit: string; prixUnitaire: number; quantiteCommandee: number; total: number; }

export default function PurchaseOrdersPage() {
  const { user } = useAuth();
  const [bons, setBons] = useState<BonCommande[]>([]);
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [receptionOpen, setReceptionOpen] = useState(false);
  const [selectedBC, setSelectedBC] = useState<BonCommande | null>(null);
  const [receptionQtys, setReceptionQtys] = useState<Record<string, number>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [fournisseurId, setFournisseurId] = useState('');
  const [datePrevu, setDatePrevu] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<CartItem[]>([]);
  const [selectedProduitId, setSelectedProduitId] = useState('');
  const [qteInput, setQteInput] = useState('1');

  useEffect(() => { if (user?.entrepriseId) load(); }, [user]);

  async function load() {
    setLoading(true);
    const [b, f, p] = await Promise.all([listBonsCommande(), listFournisseurs(), listProduits()]);
    setBons(b); setFournisseurs(f); setProduits(p);
    setLoading(false);
  }

  const openCreate = () => {
    setFournisseurId(''); setDatePrevu(''); setNotes(''); setItems([]);
    setSelectedProduitId(''); setQteInput('1');
    setCreateOpen(true);
  };

  const handleAddItem = () => {
    const p = produits.find(x => x.id === selectedProduitId);
    if (!p) return;
    const qte = parseFloat(qteInput) || 1;
    setItems(prev => [...prev, { produitId: p.id, nomProduit: p.nom, prixUnitaire: p.prix, quantiteCommandee: qte, total: qte * p.prix }]);
    setSelectedProduitId(''); setQteInput('1');
  };

  const handleCreate = async () => {
    if (items.length === 0 || !user?.entrepriseId) return;
    setSaving(true);
    try {
      const f = fournisseurs.find(x => x.id === fournisseurId);
      await createBonCommande({ fournisseurId: fournisseurId || undefined, fournisseurNom: f?.nom, items, dateLivraisonPrevue: datePrevu || undefined, notes: notes || undefined, entrepriseId: user.entrepriseId });
      setCreateOpen(false);
      load();
    } finally { setSaving(false); }
  };

  const openReception = async (bc: BonCommande) => {
    const full = await getBonCommande(bc.id);
    setSelectedBC(full);
    const qtys: Record<string, number> = {};
    (full.items ?? []).forEach(i => { qtys[i.id!] = i.quantiteCommandee - i.quantiteRecue; });
    setReceptionQtys(qtys);
    setReceptionOpen(true);
  };

  const handleReception = async () => {
    if (!selectedBC) return;
    setSaving(true);
    try {
      const receptions = (selectedBC.items ?? [])
        .filter(i => i.id && receptionQtys[i.id!] > 0)
        .map(i => ({ itemId: i.id!, quantiteRecue: (i.quantiteRecue ?? 0) + receptionQtys[i.id!] }));
      await recevoirBonCommande(selectedBC.id, receptions);
      setReceptionOpen(false);
      load();
    } finally { setSaving(false); }
  };

  const total = items.reduce((s, i) => s + i.total, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Tableau de bord / Fournisseurs / Bons de commande</p>
          <h1 className="text-2xl font-bold flex items-center gap-2 mt-1"><PackageCheck className="h-6 w-6" />Bons de Commande</h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1"><Info className="h-4 w-4" />Gérez vos commandes auprès des fournisseurs</p>
        </div>
        <Button onClick={openCreate} className="bg-green-600 hover:bg-green-700 text-white">
          <PlusCircle className="h-4 w-4 mr-2" />Nouveau Bon de Commande
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Référence</TableHead>
                <TableHead>Fournisseur</TableHead>
                <TableHead>Livraison prévue</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
              ) : bons.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Aucun bon de commande.</TableCell></TableRow>
              ) : bons.map(bc => (
                <TableRow key={bc.id}>
                  <TableCell>{bc.createdAt ? new Date(bc.createdAt).toLocaleDateString('fr-FR') : '-'}</TableCell>
                  <TableCell className="font-medium">{bc.reference}</TableCell>
                  <TableCell>{bc.fournisseurNom ?? '-'}</TableCell>
                  <TableCell>{bc.dateLivraisonPrevue ? new Date(bc.dateLivraisonPrevue).toLocaleDateString('fr-FR') : '-'}</TableCell>
                  <TableCell>{bc.total.toLocaleString('fr-FR')} FCFA</TableCell>
                  <TableCell><Badge variant="outline" className={statutBadge[bc.statut]}>{statutLabel[bc.statut]}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {bc.statut === 'brouillon' && (
                        <Button onClick={() => updateBonCommandeStatut(bc.id, 'envoye').then(load)} size="icon" variant="outline" className="h-8 w-8 border-blue-500 text-blue-600 hover:bg-blue-50" title="Marquer Envoyé">
                          <Send className="h-4 w-4" />
                        </Button>
                      )}
                      {['envoye', 'partiel'].includes(bc.statut) && (
                        <Button onClick={() => openReception(bc)} size="icon" variant="outline" className="h-8 w-8 border-green-500 text-green-600 hover:bg-green-50" title="Réceptionner">
                          <PackageCheck className="h-4 w-4" />
                        </Button>
                      )}
                      <Button onClick={() => setDeleteId(bc.id)} size="icon" variant="outline" className="h-8 w-8 border-red-400 text-red-500 hover:bg-red-50" title="Supprimer">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nouveau Bon de Commande</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fournisseur</Label>
                <Select value={fournisseurId} onValueChange={setFournisseurId}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>{fournisseurs.map(f => <SelectItem key={f.id} value={f.id}>{f.nom}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date de livraison prévue</Label>
                <Input type="date" value={datePrevu} onChange={e => setDatePrevu(e.target.value)} />
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Produit</TableHead>
                  <TableHead className="w-24 text-center">Qté</TableHead>
                  <TableHead className="w-32 text-right">Prix unit.</TableHead>
                  <TableHead className="w-32 text-right">Total</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">Aucun article</TableCell></TableRow>
                  ) : items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{item.nomProduit}</TableCell>
                      <TableCell className="text-center">
                        <Input type="number" min={1} value={item.quantiteCommandee} className="w-16 text-center mx-auto"
                          onChange={e => setItems(prev => prev.map((it, i) => i === idx ? { ...it, quantiteCommandee: parseFloat(e.target.value) || 1, total: (parseFloat(e.target.value) || 1) * it.prixUnitaire } : it))} />
                      </TableCell>
                      <TableCell className="text-right">{item.prixUnitaire.toLocaleString('fr-FR')} FCFA</TableCell>
                      <TableCell className="text-right font-medium">{item.total.toLocaleString('fr-FR')} FCFA</TableCell>
                      <TableCell><Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4" /></Button></TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50">
                    <TableCell colSpan={3} className="text-right font-bold">Total:</TableCell>
                    <TableCell className="text-right font-bold">{total.toLocaleString('fr-FR')} FCFA</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <div className="grid grid-cols-5 gap-2 items-end">
              <div className="col-span-3 space-y-1">
                <Label>Produit</Label>
                <Select value={selectedProduitId} onValueChange={setSelectedProduitId}>
                  <SelectTrigger><SelectValue placeholder="-- Sélectionner --" /></SelectTrigger>
                  <SelectContent>{produits.map(p => <SelectItem key={p.id} value={p.id}>{p.nom} — stock: {p.stock}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Qté</Label><Input type="number" min={1} value={qteInput} onChange={e => setQteInput(e.target.value)} /></div>
              <Button onClick={handleAddItem} disabled={!selectedProduitId} className="bg-green-600 hover:bg-green-700 text-white"><PlusCircle className="h-4 w-4 mr-1" />Ajouter</Button>
            </div>
            <div className="space-y-1"><Label>Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes..." /></div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
            <Button onClick={handleCreate} disabled={saving || items.length === 0} className="bg-green-600 hover:bg-green-700 text-white">{saving ? 'Enregistrement...' : 'Créer le bon'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reception Dialog */}
      <Dialog open={receptionOpen} onOpenChange={setReceptionOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Réceptionner — {selectedBC?.reference}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Saisissez les quantités effectivement reçues. Le stock sera mis à jour automatiquement.</p>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Produit</TableHead>
                <TableHead className="text-center">Commandé</TableHead>
                <TableHead className="text-center">Déjà reçu</TableHead>
                <TableHead className="w-32 text-center">À réceptionner</TableHead>
                <TableHead>Avancement</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {(selectedBC?.items ?? []).map(item => {
                  const reste = item.quantiteCommandee - item.quantiteRecue;
                  const pct = item.quantiteCommandee > 0 ? (item.quantiteRecue / item.quantiteCommandee) * 100 : 0;
                  return (
                    <TableRow key={item.id}>
                      <TableCell>{item.nomProduit}</TableCell>
                      <TableCell className="text-center">{item.quantiteCommandee}</TableCell>
                      <TableCell className="text-center">{item.quantiteRecue}</TableCell>
                      <TableCell>
                        <Input type="number" min={0} max={reste} value={receptionQtys[item.id!] ?? reste} className="w-20 text-center mx-auto"
                          onChange={e => setReceptionQtys(prev => ({ ...prev, [item.id!]: Math.min(parseFloat(e.target.value) || 0, reste) }))} />
                      </TableCell>
                      <TableCell><Progress value={pct} className="h-2 w-24" /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
            <Button onClick={handleReception} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white">{saving ? 'Enregistrement...' : 'Valider la réception'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Supprimer ce bon de commande ?</AlertDialogTitle><AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive" onClick={async () => { await deleteBonCommande(deleteId!); setDeleteId(null); load(); }}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
