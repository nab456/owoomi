'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { listAvoirs, createAvoir, validerAvoir, deleteAvoir, type Avoir, type AvoirItem } from '@/services/avoir';
import { listVentes } from '@/services/vente';
import { listClients } from '@/services/client';
import { listProduits } from '@/services/produit';
import type { Vente, Client, Produit } from '@/types';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { PlusCircle, Trash2, RotateCcw, CheckCircle, Info } from 'lucide-react';

const statutLabel: Record<string, string> = { brouillon: 'Brouillon', valide: 'Validé', rembourse: 'Remboursé' };
const statutBadge: Record<string, string> = {
  brouillon: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  valide: 'bg-green-100 text-green-800 border-green-200',
  rembourse: 'bg-blue-100 text-blue-800 border-blue-200',
};

interface CartItem { produitId?: string; nomProduit: string; prixUnitaire: number; quantite: number; total: number; remettreEnStock: boolean; }

export default function ReturnsPage() {
  const { user } = useAuth();
  const [avoirs, setAvoirs] = useState<Avoir[]>([]);
  const [ventes, setVentes] = useState<Vente[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [venteId, setVenteId] = useState('');
  const [clientId, setClientId] = useState('');
  const [motif, setMotif] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<CartItem[]>([]);
  const [selectedProduitId, setSelectedProduitId] = useState('');
  const [qteInput, setQteInput] = useState('1');

  useEffect(() => { if (user?.entrepriseId) load(); }, [user]);

  async function load() {
    setLoading(true);
    const [a, v, c, p] = await Promise.all([listAvoirs(), listVentes(), listClients(), listProduits()]);
    setAvoirs(a); setVentes(v); setClients(c); setProduits(p);
    setLoading(false);
  }

  const openNew = () => {
    setVenteId(''); setClientId(''); setMotif(''); setNotes(''); setItems([]);
    setSelectedProduitId(''); setQteInput('1');
    setDialogOpen(true);
  };

  const handleAddItem = () => {
    const p = produits.find(x => x.id === selectedProduitId);
    if (!p) return;
    const qte = parseFloat(qteInput) || 1;
    setItems(prev => [...prev, { produitId: p.id, nomProduit: p.nom, prixUnitaire: p.prix, quantite: qte, total: qte * p.prix, remettreEnStock: true }]);
    setSelectedProduitId(''); setQteInput('1');
  };

  const handleVenteSelect = (vid: string) => {
    setVenteId(vid);
    if (!vid) { setItems([]); return; }
    const v = ventes.find(x => x.id === vid);
    if (!v) return;
    setClientId(v.clientId ?? '');
    setItems((v.items ?? []).map(i => ({ produitId: i.produitId, nomProduit: i.nomProduit, prixUnitaire: i.prixUnitaire, quantite: i.quantite, total: i.total, remettreEnStock: true })));
  };

  const handleSave = async () => {
    if (items.length === 0 || !user?.entrepriseId) return;
    setSaving(true);
    try {
      const c = clients.find(x => x.id === clientId);
      await createAvoir({
        venteId: venteId || undefined,
        clientId: clientId || undefined,
        clientNom: c?.nom,
        motif: motif || undefined,
        notes: notes || undefined,
        items,
        entrepriseId: user.entrepriseId,
      });
      setDialogOpen(false);
      load();
    } finally { setSaving(false); }
  };

  const handleValider = async (id: string) => {
    await validerAvoir(id);
    load();
  };

  const total = items.reduce((s, i) => s + i.total, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Tableau de bord / Retours & Avoirs</p>
          <h1 className="text-2xl font-bold flex items-center gap-2 mt-1"><RotateCcw className="h-6 w-6" />Retours & Avoirs</h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1"><Info className="h-4 w-4" />Gestion des retours marchandise et avoirs clients</p>
        </div>
        <Button onClick={openNew} className="bg-green-600 hover:bg-green-700 text-white">
          <PlusCircle className="h-4 w-4 mr-2" />Nouvel Avoir
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Référence</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Motif</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
              ) : avoirs.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Aucun avoir enregistré.</TableCell></TableRow>
              ) : avoirs.map(av => (
                <TableRow key={av.id}>
                  <TableCell>{av.createdAt ? new Date(av.createdAt).toLocaleDateString('fr-FR') : '-'}</TableCell>
                  <TableCell className="font-medium">{av.reference}</TableCell>
                  <TableCell>{av.clientNom ?? '-'}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{av.motif ?? '-'}</TableCell>
                  <TableCell>{av.total.toLocaleString('fr-FR')} FCFA</TableCell>
                  <TableCell><Badge variant="outline" className={statutBadge[av.statut]}>{statutLabel[av.statut]}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {av.statut === 'brouillon' && (
                        <Button onClick={() => handleValider(av.id)} size="icon" variant="outline" className="h-8 w-8 border-green-500 text-green-600 hover:bg-green-50" title="Valider (remet en stock)">
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                      <Button onClick={() => setDeleteId(av.id)} size="icon" variant="outline" className="h-8 w-8 border-red-400 text-red-500 hover:bg-red-50" title="Supprimer">
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

      {/* New Avoir Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nouvel Avoir / Retour</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vente liée (optionnel)</Label>
                <Select value={venteId} onValueChange={handleVenteSelect}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner une vente..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Aucune</SelectItem>
                    {ventes.map(v => <SelectItem key={v.id} value={v.id}>{v.reference} — {v.clientNom ?? 'Client général'}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Client</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger><SelectValue placeholder="Client général" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Client général</SelectItem>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Motif du retour</Label>
              <Input placeholder="Ex: Produit défectueux, erreur de commande..." value={motif} onChange={e => setMotif(e.target.value)} />
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Produit</TableHead>
                  <TableHead className="w-24 text-center">Qté</TableHead>
                  <TableHead className="w-32 text-right">Prix</TableHead>
                  <TableHead className="w-32 text-right">Total</TableHead>
                  <TableHead className="w-28 text-center">Remettre stock</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Aucun article</TableCell></TableRow>
                  ) : items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{item.nomProduit}</TableCell>
                      <TableCell className="text-center">
                        <Input type="number" min={1} value={item.quantite} className="w-16 text-center mx-auto"
                          onChange={e => setItems(prev => prev.map((it, i) => i === idx ? { ...it, quantite: parseFloat(e.target.value) || 1, total: (parseFloat(e.target.value) || 1) * it.prixUnitaire } : it))} />
                      </TableCell>
                      <TableCell className="text-right">{item.prixUnitaire.toLocaleString('fr-FR')} FCFA</TableCell>
                      <TableCell className="text-right font-medium">{item.total.toLocaleString('fr-FR')} FCFA</TableCell>
                      <TableCell className="text-center">
                        <Checkbox checked={item.remettreEnStock} onCheckedChange={v => setItems(prev => prev.map((it, i) => i === idx ? { ...it, remettreEnStock: !!v } : it))} />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50">
                    <TableCell colSpan={3} className="text-right font-bold">Total avoir:</TableCell>
                    <TableCell className="text-right font-bold text-green-600">{total.toLocaleString('fr-FR')} FCFA</TableCell>
                    <TableCell colSpan={2}></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {!venteId && (
              <div className="grid grid-cols-5 gap-2 items-end">
                <div className="col-span-3 space-y-1">
                  <Label>Ajouter un produit</Label>
                  <Select value={selectedProduitId} onValueChange={setSelectedProduitId}>
                    <SelectTrigger><SelectValue placeholder="-- Sélectionner --" /></SelectTrigger>
                    <SelectContent>{produits.map(p => <SelectItem key={p.id} value={p.id}>{p.nom} — {p.prix.toLocaleString('fr-FR')} FCFA</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>Qté</Label><Input type="number" min={1} value={qteInput} onChange={e => setQteInput(e.target.value)} /></div>
                <Button onClick={handleAddItem} disabled={!selectedProduitId} className="bg-green-600 hover:bg-green-700 text-white"><PlusCircle className="h-4 w-4 mr-1" />Ajouter</Button>
              </div>
            )}

            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea placeholder="Informations complémentaires..." value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
            <Button onClick={handleSave} disabled={saving || items.length === 0} className="bg-green-600 hover:bg-green-700 text-white">
              {saving ? 'Enregistrement...' : 'Créer l\'avoir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Supprimer cet avoir ?</AlertDialogTitle><AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive" onClick={async () => { await deleteAvoir(deleteId!); setDeleteId(null); load(); }}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
