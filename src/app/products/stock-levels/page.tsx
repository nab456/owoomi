'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowDownToLine, ArrowUpFromLine, GitCommitHorizontal, Package2,
  Landmark, TriangleAlert, Info, Pencil, ArrowDownCircle, History, X, Save, File as FileIcon,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger, DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { listProduits } from '@/services/produit';
import { listFournisseurs } from '@/services/fournisseur';
import { createMouvement } from '@/services/mouvement-stock';
import type { Produit, Fournisseur } from '@/types';

export default function StockLevelsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Produit[]>([]);
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [loading, setLoading] = useState(true);
  const [registerPayment, setRegisterPayment] = useState(false);
  const [defaultDateTime, setDefaultDateTime] = useState('');

  // Entry form state
  const [entryProduct, setEntryProduct] = useState('');
  const [entryQty, setEntryQty] = useState('0');
  const [entryPrice, setEntryPrice] = useState('0');
  const [entrySupplier, setEntrySupplier] = useState('');
  const [entryNotes, setEntryNotes] = useState('');
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);

  // Exit form state
  const [exitProduct, setExitProduct] = useState('');
  const [exitQty, setExitQty] = useState('0');
  const [exitDialogOpen, setExitDialogOpen] = useState(false);

  useEffect(() => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    setDefaultDateTime(new Date(now.getTime() - offset).toISOString().slice(0, 16));
    if (user?.entrepriseId) load();
  }, [user]);

  async function load() {
    setLoading(true);
    const [prods, fours] = await Promise.all([listProduits(), listFournisseurs()]);
    setProducts(prods);
    setFournisseurs(fours);
    setLoading(false);
  }

  const totalValue = products.reduce((s, p) => s + p.prix * p.stock, 0);
  const ruptures = products.filter(p => p.stock === 0).length;
  const lowStock = products.filter(p => p.stock > 0 && p.stock <= p.stockMinimum).length;

  const stockSummary = [
    { title: 'PRODUITS EN STOCK', value: String(products.length), icon: Package2, color: 'text-blue-500' },
    { title: 'VALEUR TOTALE DU STOCK', value: `${totalValue.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} FCFA`, icon: Landmark, color: 'text-green-500' },
    { title: 'PRODUITS EN RUPTURE', value: String(ruptures), icon: TriangleAlert, color: 'text-red-500', attention: ruptures > 0 ? 'Attention' : undefined },
    { title: 'PRODUITS À RÉAPPROVISIONNER', value: String(lowStock), icon: Info, color: 'text-yellow-500', attention: lowStock > 0 ? 'Surveillance' : undefined },
  ];

  const getStatusBadge = (p: Produit) => {
    if (p.stock === 0) return { label: 'Rupture', cls: 'bg-red-100 text-red-800' };
    if (p.stock <= p.stockMinimum) return { label: 'Stock faible', cls: 'bg-yellow-100 text-yellow-800' };
    return { label: 'Disponible', cls: 'bg-green-100 text-green-800' };
  };

  const handleEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryProduct || !user?.entrepriseId) return;
    await createMouvement({
      produitId: entryProduct,
      type: 'entree',
      quantite: parseFloat(entryQty),
      prixUnitaire: parseFloat(entryPrice),
      fournisseurId: entrySupplier || undefined,
      notes: entryNotes || undefined,
      userId: user.id,
      entrepriseId: user.entrepriseId!,
    });
    setEntryDialogOpen(false);
    load();
  };

  const handleExit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exitProduct || !user?.entrepriseId) return;
    await createMouvement({
      produitId: exitProduct,
      type: 'sortie',
      quantite: parseFloat(exitQty),
      userId: user.id,
      entrepriseId: user.entrepriseId!,
    });
    setExitDialogOpen(false);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Tableau de bord / Stock</p>
          <h1 className="text-2xl font-bold">Gestion de Stock</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <GitCommitHorizontal className="w-4 h-4" />Niveaux de Stock
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={entryDialogOpen} onOpenChange={setEntryDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700 text-white">
                <ArrowDownToLine className="w-4 h-4 mr-2" />Nouvelle Entrée
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl">
              <DialogHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <DialogTitle>Nouvelle Entrée de Stock</DialogTitle>
                    <DialogDescription>Enregistrer une nouvelle entrée dans le stock</DialogDescription>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/products/stock-movements"><History className="w-4 h-4 mr-2" />Voir Historique</Link>
                  </Button>
                </div>
              </DialogHeader>
              <form onSubmit={handleEntry}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 py-4">
                  <div className="space-y-4">
                    <h3 className="flex items-center gap-2 font-semibold text-green-700"><Info className="h-5 w-5" />Informations</h3>
                    <div className="space-y-2">
                      <Label>Produit <span className="text-red-500">*</span></Label>
                      <Select value={entryProduct} onValueChange={setEntryProduct} required>
                        <SelectTrigger><SelectValue placeholder="Sélectionner un produit" /></SelectTrigger>
                        <SelectContent>
                          {products.map(p => <SelectItem key={p.id} value={p.id}>{p.nom}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Quantité <span className="text-red-500">*</span></Label>
                      <Input type="number" value={entryQty} onChange={e => setEntryQty(e.target.value)} min="0" step="0.001" />
                    </div>
                    <div className="space-y-2">
                      <Label>Prix d'achat unitaire <span className="text-red-500">*</span></Label>
                      <Input type="number" value={entryPrice} onChange={e => setEntryPrice(e.target.value)} min="0" />
                    </div>
                    <div className="space-y-2">
                      <Label>Date et Heure</Label>
                      <Input type="datetime-local" defaultValue={defaultDateTime} />
                    </div>
                    <div className="space-y-2">
                      <Label>Fournisseur</Label>
                      <Select value={entrySupplier} onValueChange={setEntrySupplier}>
                        <SelectTrigger><SelectValue placeholder="Sélectionner un fournisseur" /></SelectTrigger>
                        <SelectContent>
                          {fournisseurs.map(f => <SelectItem key={f.id} value={f.id}>{f.nom}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="flex items-center gap-2 font-semibold text-green-700"><FileIcon className="h-5 w-5" />Facultatif</h3>
                    <div className="space-y-2">
                      <Label>Document scanné</Label>
                      <Input type="file" />
                    </div>
                    <div className="space-y-2">
                      <Label>Notes générales</Label>
                      <Textarea value={entryNotes} onChange={e => setEntryNotes(e.target.value)} placeholder="Détails supplémentaires..." />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="register-payment" checked={registerPayment} onCheckedChange={(c) => setRegisterPayment(c as boolean)} />
                      <Label htmlFor="register-payment" className="font-normal text-sm">Enregistrer un paiement au fournisseur</Label>
                    </div>
                    {registerPayment && (
                      <div className="space-y-4 p-4 rounded-md border bg-muted/50">
                        <div className="space-y-2">
                          <Label>Montant du paiement</Label>
                          <Input type="number" defaultValue="0.00" />
                        </div>
                        <div className="space-y-2">
                          <Label>Méthode de paiement</Label>
                          <Select>
                            <SelectTrigger><SelectValue placeholder="Sélectionner une méthode" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash">Espèces</SelectItem>
                              <SelectItem value="cheque">Chèque</SelectItem>
                              <SelectItem value="transfer">Virement bancaire</SelectItem>
                              <SelectItem value="mobile">Mobile Money</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <DialogFooter className="pt-4">
                  <DialogClose asChild>
                    <Button type="button" variant="outline"><X className="w-4 h-4 mr-2" />Annuler</Button>
                  </DialogClose>
                  <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white">
                    <Save className="w-4 h-4 mr-2" />Enregistrer
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={exitDialogOpen} onOpenChange={setExitDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive"><ArrowUpFromLine className="w-4 h-4 mr-2" />Nouvelle Sortie</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl">
              <DialogHeader>
                <DialogTitle>Nouvelle Sortie de Stock</DialogTitle>
                <DialogDescription>Enregistrer une sortie de produits du stock.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleExit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 py-4">
                  <div className="space-y-4">
                    <h3 className="flex items-center gap-2 font-semibold text-destructive"><Info className="h-5 w-5" />Informations de base</h3>
                    <div className="space-y-2">
                      <Label>Produit <span className="text-red-500">*</span></Label>
                      <Select value={exitProduct} onValueChange={setExitProduct} required>
                        <SelectTrigger><SelectValue placeholder="Sélectionner un produit" /></SelectTrigger>
                        <SelectContent>
                          {products.map(p => <SelectItem key={p.id} value={p.id}>{p.nom}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Quantité <span className="text-red-500">*</span></Label>
                      <Input type="number" value={exitQty} onChange={e => setExitQty(e.target.value)} min="0" step="0.001" />
                    </div>
                    <div className="space-y-2">
                      <Label>Date et Heure</Label>
                      <Input type="datetime-local" defaultValue={defaultDateTime} />
                    </div>
                    <div className="space-y-2">
                      <Label>Raison de la sortie <span className="text-red-500">*</span></Label>
                      <Select><SelectTrigger><SelectValue placeholder="Sélectionner une raison" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="vente">Vente</SelectItem>
                          <SelectItem value="perte">Perte / Endommagé</SelectItem>
                          <SelectItem value="ajustement">Ajustement d'inventaire</SelectItem>
                          <SelectItem value="retour">Retour Fournisseur</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="flex items-center gap-2 font-semibold text-destructive"><FileIcon className="h-5 w-5" />Informations complémentaires</h3>
                    <div className="space-y-2">
                      <Label>Document Associé (Facultatif)</Label>
                      <Input type="file" />
                    </div>
                  </div>
                </div>
                <DialogFooter className="pt-4">
                  <DialogClose asChild>
                    <Button type="button" variant="outline"><X className="w-4 h-4 mr-2" />Annuler</Button>
                  </DialogClose>
                  <Button type="submit" variant="destructive"><Save className="w-4 h-4 mr-2" />Enregistrer</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Button className="bg-yellow-500 hover:bg-yellow-600 text-white">
            <GitCommitHorizontal className="w-4 h-4 mr-2" />Ajustement
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stockSummary.map((item) => (
          <Card key={item.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
              <item.icon className={`h-5 w-5 ${item.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{item.value}</div>
              {item.attention && <p className={`text-xs ${item.color === 'text-red-500' ? 'text-red-600' : 'text-yellow-600'}`}>{item.attention}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <Button asChild variant="secondary" className="w-fit">
            <Link href="/products/stock-movements">Voir Mouvements</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produit</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Stock Actuel</TableHead>
                <TableHead>Stock Minimum</TableHead>
                <TableHead>Valeur</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
              ) : products.map((item) => {
                const status = getStatusBadge(item);
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium">{item.nom}</div>
                      {item.sku && <div className="text-sm text-muted-foreground">{item.sku}</div>}
                    </TableCell>
                    <TableCell>{item.categorieNom ?? '-'}</TableCell>
                    <TableCell>{item.stock} pcs</TableCell>
                    <TableCell>{item.stockMinimum} pcs</TableCell>
                    <TableCell>{(item.prix * item.stock).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} FCFA</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={status.cls}>{status.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon"><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon"><ArrowDownCircle className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
