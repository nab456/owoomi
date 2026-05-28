'use client';
import React, { useState, useEffect } from 'react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter,
} from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, PlusCircle, Pencil, Trash2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { listCategories, createCategorie, updateCategorie, deleteCategorie } from '@/services/categorie';
import type { Categorie } from '@/types';

export default function ProductCategoriesPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Categorie | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user?.entrepriseId) load();
  }, [user]);

  async function load() {
    setLoading(true);
    setCategories(await listCategories());
    setLoading(false);
  }

  const handleAddClick = () => {
    setEditingCategory(null); setCategoryName(''); setCategoryDescription('');
    setIsDialogOpen(true);
  };

  const handleEditClick = (c: Categorie) => {
    setEditingCategory(c); setCategoryName(c.nom); setCategoryDescription(c.description ?? '');
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await deleteCategorie(id);
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim() || !user?.entrepriseId) return;
    if (editingCategory) {
      await updateCategorie(editingCategory.id, { nom: categoryName, description: categoryDescription });
      setCategories(prev => prev.map(c => c.id === editingCategory.id ? { ...c, nom: categoryName, description: categoryDescription } : c));
    } else {
      const newCat = await createCategorie({ nom: categoryName, description: categoryDescription, entrepriseId: user.entrepriseId! });
      setCategories(prev => [...prev, newCat]);
    }
    setIsDialogOpen(false);
  };

  const filtered = categories.filter(c =>
    c.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.description ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Gestion des Catégories</CardTitle>
              <CardDescription>Organisez vos produits par catégories.</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Rechercher des catégories..."
                  className="pl-8 sm:w-[300px]"
                  value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <Button onClick={handleAddClick}>
                <PlusCircle className="h-4 w-4 mr-2" />Ajouter une catégorie
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-center">Produits</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
              ) : filtered.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.nom}</TableCell>
                  <TableCell>{category.description}</TableCell>
                  <TableCell className="text-center">{category.nbProduits ?? 0}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" className="mr-2" onClick={() => handleEditClick(category)}>
                      <Pencil className="h-4 w-4 mr-1" />Modifier
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="h-4 w-4 mr-1" />Supprimer
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                          <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(category.id)}>Supprimer</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter>
          <div className="text-xs text-muted-foreground">
            Affichage de <strong>{filtered.length}</strong> sur <strong>{categories.length}</strong> catégories
          </div>
        </CardFooter>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>{editingCategory ? 'Modifier la catégorie' : 'Ajouter une catégorie'}</DialogTitle>
              <DialogDescription>
                {editingCategory ? 'Modifiez les détails de la catégorie.' : 'Remplissez les détails de la nouvelle catégorie.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Nom</Label>
                <Input id="name" placeholder="Ex: Électronique" className="col-span-3"
                  value={categoryName} onChange={(e) => setCategoryName(e.target.value)} required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">Description</Label>
                <Textarea id="description" placeholder="Description de la catégorie" className="col-span-3"
                  value={categoryDescription} onChange={(e) => setCategoryDescription(e.target.value)} />
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
