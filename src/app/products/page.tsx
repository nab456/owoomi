'use client';
import React, { useState, useEffect } from 'react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter
} from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileUp, FileDown, PlusCircle, MoreHorizontal, Search, Pencil, Trash2, Tag } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import Image from 'next/image';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { listProduits, createProduit, updateProduit, deleteProduit } from '@/services/produit';
import { listCategories } from '@/services/categorie';
import type { Produit, Categorie } from '@/types';
import { ImportDialog } from '@/components/import-dialog';

export default function ProductsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Produit[]>([]);
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Produit | null>(null);
  const [productName, setProductName] = useState('');
  const [productCategorieId, setProductCategorieId] = useState('');
  const [productPrice, setProductPrice] = useState(0);
  const [productStock, setProductStock] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user?.entrepriseId) load();
  }, [user]);

  async function load() {
    setLoading(true);
    const [prods, cats] = await Promise.all([listProduits(), listCategories()]);
    setProducts(prods);
    setCategories(cats);
    setLoading(false);
  }

  const getStatus = (stock: number, min: number) => {
    if (stock === 0) return 'Rupture de stock';
    if (stock <= min) return 'Stock faible';
    return 'En stock';
  };

  const getStatusBadge = (status: string) => {
    if (status === 'En stock') return 'bg-green-100 text-green-800';
    if (status === 'Stock faible') return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const handleAddClick = () => {
    setEditingProduct(null);
    setProductName(''); setProductCategorieId(''); setProductPrice(0); setProductStock(0);
    setIsDialogOpen(true);
  };

  const handleEditClick = (p: Produit) => {
    setEditingProduct(p);
    setProductName(p.nom);
    setProductCategorieId(p.categorieId ?? '');
    setProductPrice(p.prix);
    setProductStock(p.stock);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await deleteProduit(id);
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim() || !user?.entrepriseId) return;
    if (editingProduct) {
      await updateProduit(editingProduct.id, {
        nom: productName,
        categorieId: productCategorieId || undefined,
        prix: productPrice,
        stock: productStock,
      });
      await load();
    } else {
      const newProd = await createProduit({
        nom: productName,
        categorieId: productCategorieId || undefined,
        prix: productPrice,
        stock: productStock,
        entrepriseId: user.entrepriseId!,
      });
      setProducts(prev => [...prev, newProd]);
    }
    setIsDialogOpen(false);
  };

  const printLabel = (p: Produit) => {
    const win = window.open('', '_blank', 'width=400,height=300');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Étiquette</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
      .label { width: 8cm; border: 2px solid #000; padding: 8px; box-sizing: border-box; text-align: center; page-break-after: always; }
      .nom { font-size: 14px; font-weight: bold; margin: 4px 0; }
      .prix { font-size: 20px; font-weight: bold; color: #16a34a; margin: 6px 0; }
      .sku { font-size: 10px; color: #666; letter-spacing: 2px; }
      .cat { font-size: 10px; color: #999; }
      .barcode { font-family: 'Libre Barcode 128', cursive; font-size: 40px; margin: 6px 0; letter-spacing: 0; }
      @import url('https://fonts.googleapis.com/css2?family=Libre+Barcode+128&display=swap');
      @media print { body { margin: 0; } }
    </style></head><body>
    <div class="label">
      <div class="cat">${p.categorieNom ?? ''}</div>
      <div class="nom">${p.nom}</div>
      <div class="prix">${p.prix.toLocaleString('fr-FR')} FCFA</div>
      ${p.sku ? `<div class="barcode">${p.sku}</div><div class="sku">${p.sku}</div>` : `<div class="sku">${p.id.substring(0, 8).toUpperCase()}</div>`}
    </div>
    <script>window.onload=()=>{window.print();window.close();}<\/script>
    </body></html>`);
    win.document.close();
  };

  const filteredProducts = products.filter(p =>
    p.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.categorieNom ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleImportProduits = async (rows: Record<string, any>[]) => {
    if (!user?.entrepriseId) return { success: 0, errors: [] };
    let success = 0;
    const errors: { row: number; message: string }[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row.nom) { errors.push({ row: i + 2, message: 'Nom manquant' }); continue; }
      try {
        await createProduit({ nom: row.nom, prix: row.prix || 0, stock: row.stock || 0, entrepriseId: user.entrepriseId! });
        success++;
      } catch (e: any) {
        errors.push({ row: i + 2, message: e.message ?? 'Erreur' });
      }
    }
    load();
    return { success, errors };
  };

  const generatePdf = async () => {
    const { default: jsPDF } = await import('jspdf');
    await import('jspdf-autotable');
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Liste des Produits', 14, 22);
    (doc as unknown as { autoTable: (opts: unknown) => void }).autoTable({
      head: [['Nom', 'Catégorie', 'Statut', 'Prix', 'Stock']],
      body: filteredProducts.map(p => [
        p.nom, p.categorieNom ?? '-',
        getStatus(p.stock, p.stockMinimum),
        `${p.prix.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} FCFA`,
        p.stock,
      ]),
      startY: 35, theme: 'striped',
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    });
    doc.save('liste-produits.pdf');
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle>Produits</CardTitle>
              <CardDescription>Gérez vos produits et inventaire.</CardDescription>
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Rechercher des produits..."
                  className="pl-8 sm:w-[200px] lg:w-[300px]"
                  value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}><FileUp className="h-4 w-4 mr-2" />Importer</Button>
              <Button variant="outline" size="sm" onClick={generatePdf}>
                <FileDown className="h-4 w-4 mr-2" />Exporter en PDF
              </Button>
              <Button size="sm" onClick={handleAddClick}>
                <PlusCircle className="h-4 w-4 mr-2" />Ajouter Produit
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="hidden w-[100px] sm:table-cell">Image</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="hidden md:table-cell">Prix</TableHead>
                <TableHead className="hidden md:table-cell">Stock</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
              ) : filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="hidden sm:table-cell">
                    <Image alt="Product image" className="aspect-square rounded-md object-cover"
                      height={64} src={product.imageUrl ?? 'https://placehold.co/64x64.png'}
                      data-ai-hint="product image" width={64} />
                  </TableCell>
                  <TableCell className="font-medium">
                    <div>{product.nom}</div>
                    {product.sku && <div className="text-xs text-muted-foreground">{product.sku}</div>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusBadge(getStatus(product.stock, product.stockMinimum))}>
                      {getStatus(product.stock, product.stockMinimum)}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {product.prix.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} FCFA
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{product.stock}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onSelect={() => handleEditClick(product)}>
                          <Pencil className="mr-2 h-4 w-4" />Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => printLabel(product)}>
                          <Tag className="mr-2 h-4 w-4" />Imprimer étiquette
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600 focus:text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" />Supprimer
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                              <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(product.id)} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter>
          <div className="text-xs text-muted-foreground">
            Affichage de <strong>{filteredProducts.length}</strong> sur <strong>{products.length}</strong> produits
          </div>
        </CardFooter>
      </Card>

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Importer des produits"
        templateFileName="modele-produits.xlsx"
        columns={[
          { key: 'nom', label: 'Nom', required: true },
          { key: 'prix', label: 'Prix', type: 'number' },
          { key: 'stock', label: 'Stock', type: 'number' },
        ]}
        onImport={handleImportProduits}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>{editingProduct ? 'Modifier le produit' : 'Ajouter un nouveau produit'}</DialogTitle>
              <DialogDescription>
                {editingProduct ? 'Modifiez les détails du produit.' : 'Remplissez les détails du produit ci-dessous.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Nom</Label>
                <Input id="name" value={productName} onChange={(e) => setProductName(e.target.value)}
                  placeholder="Nom du produit" className="col-span-3" required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category" className="text-right">Catégorie</Label>
                <Select value={productCategorieId} onValueChange={setProductCategorieId}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Sélectionner une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="price" className="text-right">Prix (FCFA)</Label>
                <Input id="price" type="number" value={productPrice}
                  onChange={(e) => setProductPrice(parseFloat(e.target.value) || 0)}
                  placeholder="10000.00" className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="stock" className="text-right">Stock</Label>
                <Input id="stock" type="number" value={productStock}
                  onChange={(e) => setProductStock(parseInt(e.target.value, 10) || 0)}
                  placeholder="25" className="col-span-3" />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">Annuler</Button></DialogClose>
              <Button type="submit">Enregistrer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
