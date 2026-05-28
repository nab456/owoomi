'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  listDepots, createDepot, deleteDepot, getStockParDepot,
  transfererStock, listTransfertsStock, type Depot, type StockDepot, type TransfertStock,
} from '@/services/depot';
import { listProduits } from '@/services/produit';
import type { Produit } from '@/types';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { PlusCircle, Trash2, ArrowRightLeft, Warehouse, Info, Star } from 'lucide-react';

export default function WarehousesPage() {
  const { user } = useAuth();
  const [depots, setDepots] = useState<Depot[]>([]);
  const [stock, setStock] = useState<StockDepot[]>([]);
  const [transferts, setTransferts] = useState<TransfertStock[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [loading, setLoading] = useState(true);

  const [depotDialogOpen, setDepotDialogOpen] = useState(false);
  const [transfertDialogOpen, setTransfertDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [nomDepot, setNomDepot] = useState('');
  const [adresseDepot, setAdresseDepot] = useState('');
  const [srcDepot, setSrcDepot] = useState('');
  const [dstDepot, setDstDepot] = useState('');
  const [transfertProduit, setTransfertProduit] = useState('');
  const [transfertQte, setTransfertQte] = useState('1');
  const [transfertNotes, setTransfertNotes] = useState('');

  useEffect(() => { if (user?.entrepriseId) load(); }, [user]);

  async function load() {
    setLoading(true);
    const [d, s, t, p] = await Promise.all([
      listDepots(), getStockParDepot(user!.entrepriseId!), listTransfertsStock(), listProduits()
    ]);
    setDepots(d); setStock(s); setTransferts(t); setProduits(p);
    setLoading(false);
  }

  const handleCreateDepot = async () => {
    if (!nomDepot.trim() || !user?.entrepriseId) return;
    setSaving(true);
    await createDepot({ nom: nomDepot, adresse: adresseDepot || undefined, entrepriseId: user.entrepriseId });
    setDepotDialogOpen(false);
    setNomDepot(''); setAdresseDepot('');
    load();
    setSaving(false);
  };

  const handleTransfert = async () => {
    if (!srcDepot || !dstDepot || !transfertProduit || !user?.entrepriseId) return;
    if (srcDepot === dstDepot) return;
    setSaving(true);
    const p = produits.find(x => x.id === transfertProduit);
    await transfererStock({
      depotSourceId: srcDepot, depotDestinationId: dstDepot,
      produitId: transfertProduit, produitNom: p?.nom ?? '',
      quantite: parseFloat(transfertQte) || 1,
      notes: transfertNotes || undefined,
      userId: user.id, entrepriseId: user.entrepriseId,
    });
    setTransfertDialogOpen(false);
    setSrcDepot(''); setDstDepot(''); setTransfertProduit(''); setTransfertQte('1'); setTransfertNotes('');
    load();
    setSaving(false);
  };

  // Group stock by depot
  const stockParDepot = depots.map(d => ({
    depot: d,
    items: stock.filter(s => s.depotId === d.id),
    total: stock.filter(s => s.depotId === d.id).reduce((sum, s) => sum + s.quantite, 0),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Tableau de bord / Produits / Entrepôts</p>
          <h1 className="text-2xl font-bold flex items-center gap-2 mt-1"><Warehouse className="h-6 w-6" />Gestion des Entrepôts</h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1"><Info className="h-4 w-4" />Gérez votre stock par emplacement et effectuez des transferts</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setTransfertDialogOpen(true)} disabled={depots.length < 2}>
            <ArrowRightLeft className="h-4 w-4 mr-2" />Transférer
          </Button>
          <Button onClick={() => setDepotDialogOpen(true)} className="bg-green-600 hover:bg-green-700 text-white">
            <PlusCircle className="h-4 w-4 mr-2" />Nouvel Entrepôt
          </Button>
        </div>
      </div>

      <Tabs defaultValue="stock">
        <TabsList>
          <TabsTrigger value="stock">Stock par entrepôt</TabsTrigger>
          <TabsTrigger value="depots">Entrepôts ({depots.length})</TabsTrigger>
          <TabsTrigger value="transferts">Historique transferts</TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="space-y-4 mt-4">
          {loading ? <div className="text-center py-8 text-muted-foreground">Chargement...</div>
          : stockParDepot.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Aucun entrepôt configuré.</CardContent></Card>
          ) : stockParDepot.map(({ depot, items, total }) => (
            <Card key={depot.id}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  {depot.estPrincipal && <Star className="h-4 w-4 text-yellow-500 fill-yellow-400" />}
                  {depot.nom}
                  <Badge variant="outline" className="ml-auto">{total} unités</Badge>
                </CardTitle>
                {depot.adresse && <CardDescription>{depot.adresse}</CardDescription>}
              </CardHeader>
              <CardContent>
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun stock enregistré dans cet entrepôt.</p>
                ) : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Produit</TableHead><TableHead className="text-right">Quantité</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {items.map(s => (
                        <TableRow key={`${s.depotId}-${s.produitId}`}>
                          <TableCell>{s.produitNom}</TableCell>
                          <TableCell className="text-right font-medium">{s.quantite}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="depots" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Adresse</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {loading ? <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
                  : depots.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Aucun entrepôt.</TableCell></TableRow>
                  : depots.map(d => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.nom}</TableCell>
                      <TableCell className="text-muted-foreground">{d.adresse ?? '-'}</TableCell>
                      <TableCell><Badge variant="outline" className={d.estPrincipal ? 'bg-yellow-50 text-yellow-800' : ''}>{d.estPrincipal ? 'Principal' : 'Secondaire'}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button onClick={() => setDeleteId(d.id)} size="icon" variant="outline" className="h-8 w-8 border-red-400 text-red-500 hover:bg-red-50" disabled={d.estPrincipal}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transferts" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Produit</TableHead><TableHead>De</TableHead><TableHead>Vers</TableHead><TableHead className="text-center">Qté</TableHead><TableHead>Notes</TableHead></TableRow></TableHeader>
                <TableBody>
                  {transferts.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucun transfert.</TableCell></TableRow>
                  : transferts.map(t => (
                    <TableRow key={t.id}>
                      <TableCell>{t.createdAt ? new Date(t.createdAt).toLocaleDateString('fr-FR') : '-'}</TableCell>
                      <TableCell className="font-medium">{t.produitNom}</TableCell>
                      <TableCell>{t.depotSourceNom}</TableCell>
                      <TableCell>{t.depotDestinationNom}</TableCell>
                      <TableCell className="text-center font-bold text-blue-600">{t.quantite}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{t.notes ?? '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create depot dialog */}
      <Dialog open={depotDialogOpen} onOpenChange={setDepotDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvel Entrepôt</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nom *</Label><Input value={nomDepot} onChange={e => setNomDepot(e.target.value)} placeholder="Ex: Entrepôt principal, Boutique nord..." /></div>
            <div className="space-y-2"><Label>Adresse</Label><Textarea value={adresseDepot} onChange={e => setAdresseDepot(e.target.value)} placeholder="Adresse..." /></div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
            <Button onClick={handleCreateDepot} disabled={saving || !nomDepot.trim()} className="bg-green-600 hover:bg-green-700 text-white">{saving ? 'Création...' : 'Créer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer dialog */}
      <Dialog open={transfertDialogOpen} onOpenChange={setTransfertDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Transfert de stock</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>De (source)</Label>
                <Select value={srcDepot} onValueChange={setSrcDepot}>
                  <SelectTrigger><SelectValue placeholder="Source..." /></SelectTrigger>
                  <SelectContent>{depots.map(d => <SelectItem key={d.id} value={d.id}>{d.nom}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Vers (destination)</Label>
                <Select value={dstDepot} onValueChange={setDstDepot}>
                  <SelectTrigger><SelectValue placeholder="Destination..." /></SelectTrigger>
                  <SelectContent>{depots.filter(d => d.id !== srcDepot).map(d => <SelectItem key={d.id} value={d.id}>{d.nom}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Produit</Label>
              <Select value={transfertProduit} onValueChange={setTransfertProduit}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un produit..." /></SelectTrigger>
                <SelectContent>{produits.map(p => <SelectItem key={p.id} value={p.id}>{p.nom}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Quantité</Label><Input type="number" min={1} value={transfertQte} onChange={e => setTransfertQte(e.target.value)} /></div>
            <div className="space-y-2"><Label>Notes</Label><Input value={transfertNotes} onChange={e => setTransfertNotes(e.target.value)} placeholder="Motif du transfert..." /></div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
            <Button onClick={handleTransfert} disabled={saving || !srcDepot || !dstDepot || !transfertProduit} className="bg-green-600 hover:bg-green-700 text-white">{saving ? 'Transfert...' : 'Valider le transfert'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Supprimer cet entrepôt ?</AlertDialogTitle><AlertDialogDescription>Tout le stock enregistré dans cet entrepôt sera supprimé.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive" onClick={async () => { await deleteDepot(deleteId!); setDeleteId(null); load(); }}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
