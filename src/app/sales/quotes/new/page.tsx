'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { listClients } from '@/services/client';
import { listProduits } from '@/services/produit';
import { createDevis } from '@/services/devis';
import type { Client, Produit } from '@/types';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter,
} from '@/components/ui/table';
import { ArrowLeft, User, ShoppingCart, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface CartItem {
  produitId?: string;
  nomProduit: string;
  prixUnitaire: number;
  quantite: number;
  remise: number;
  total: number;
}

export default function NewQuotePage() {
  const { user } = useAuth();
  const router = useRouter();

  const [clients, setClients] = useState<Client[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [clientId, setClientId] = useState('');
  const [dateEcheance, setDateEcheance] = useState('');
  const [printAfter, setPrintAfter] = useState(true);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<CartItem[]>([]);

  const [selectedProduitId, setSelectedProduitId] = useState('');
  const [qteInput, setQteInput] = useState('1');

  useEffect(() => { if (user?.entrepriseId) load(); }, [user]);

  async function load() {
    setLoading(true);
    const [c, p] = await Promise.all([listClients(), listProduits()]);
    setClients(c);
    setProduits(p);
    setLoading(false);
    // Default due date: 30 days from now
    const d = new Date(); d.setDate(d.getDate() + 30);
    setDateEcheance(d.toISOString().split('T')[0]);
  }

  const total = items.reduce((s, i) => s + i.total, 0);

  const handleAddItem = () => {
    const produit = produits.find(p => p.id === selectedProduitId);
    if (!produit) return;
    const qte = parseFloat(qteInput) || 1;
    const existing = items.findIndex(i => i.produitId === produit.id);
    if (existing >= 0) {
      setItems(prev => prev.map((item, idx) => idx === existing
        ? { ...item, quantite: item.quantite + qte, total: (item.quantite + qte) * item.prixUnitaire }
        : item
      ));
    } else {
      setItems(prev => [...prev, {
        produitId: produit.id,
        nomProduit: produit.nom,
        prixUnitaire: produit.prix,
        quantite: qte,
        remise: 0,
        total: qte * produit.prix,
      }]);
    }
    setSelectedProduitId('');
    setQteInput('1');
  };

  const handleRemoveItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const handleQtyChange = (idx: number, qte: number) => {
    setItems(prev => prev.map((item, i) => i === idx
      ? { ...item, quantite: qte, total: qte * item.prixUnitaire }
      : item
    ));
  };

  const handleSubmit = async () => {
    if (items.length === 0 || !user?.entrepriseId) return;
    setSaving(true);
    try {
      await createDevis({
        clientId: clientId || undefined,
        vendeurId: user.id,
        items: items.map(i => ({
          produitId: i.produitId,
          nomProduit: i.nomProduit,
          quantite: i.quantite,
          prixUnitaire: i.prixUnitaire,
          remise: i.remise,
          total: i.total,
        })),
        dateEcheance: dateEcheance || undefined,
        notes: notes || undefined,
        entrepriseId: user.entrepriseId,
      });
      router.push('/sales/quotes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-16 text-muted-foreground">Chargement...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Nouveau Devis</h1>
          <p className="text-muted-foreground">Créez un devis pour un client</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/sales/quotes"><ArrowLeft className="mr-2 h-4 w-4" />Retour aux devis</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-1 flex flex-col gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5" />Informations Client
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="client">Client</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger id="client"><SelectValue placeholder="Client général" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Client général</SelectItem>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="due-date">Date d'échéance</Label>
                <Input id="due-date" type="date" value={dateEcheance} onChange={e => setDateEcheance(e.target.value)} />
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox id="print-quote" checked={printAfter} onCheckedChange={v => setPrintAfter(!!v)} />
                <Label htmlFor="print-quote" className="font-normal text-sm">Imprimer après création</Label>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 flex flex-col gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShoppingCart className="h-5 w-5" />Articles proposés
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produit</TableHead>
                      <TableHead className="w-[100px] text-center">Quantité</TableHead>
                      <TableHead className="w-[130px] text-right">Prix Unit.</TableHead>
                      <TableHead className="w-[130px] text-right">Total</TableHead>
                      <TableHead className="w-[40px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          -- Sélectionner un produit --
                        </TableCell>
                      </TableRow>
                    ) : items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.nomProduit}</TableCell>
                        <TableCell className="text-center">
                          <Input type="number" value={item.quantite} min={1} className="w-16 text-center mx-auto"
                            onChange={e => handleQtyChange(idx, parseFloat(e.target.value) || 1)} />
                        </TableCell>
                        <TableCell className="text-right">{item.prixUnitaire.toLocaleString('fr-FR')} FCFA</TableCell>
                        <TableCell className="text-right">{item.total.toLocaleString('fr-FR')} FCFA</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50" onClick={() => handleRemoveItem(idx)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={3} className="text-right font-bold text-base">Total</TableCell>
                      <TableCell className="text-right font-bold text-base">{total.toLocaleString('fr-FR')} FCFA</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>

              <div className="mt-4 grid gap-4 grid-cols-1 md:grid-cols-5 items-end">
                <div className="md:col-span-3 space-y-2">
                  <Label>Produit</Label>
                  <Select value={selectedProduitId} onValueChange={setSelectedProduitId}>
                    <SelectTrigger><SelectValue placeholder="-- Sélectionner un produit --" /></SelectTrigger>
                    <SelectContent>
                      {produits.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nom} — {p.prix.toLocaleString('fr-FR')} FCFA
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-1 space-y-2">
                  <Label>Qté</Label>
                  <Input type="number" min={1} value={qteInput} onChange={e => setQteInput(e.target.value)} />
                </div>
                <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleAddItem} disabled={!selectedProduitId}>
                  <Plus className="mr-2 h-4 w-4" />Ajouter
                </Button>
              </div>

              <div className="mt-6 space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" placeholder="Ajouter des notes ici..." value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" asChild><Link href="/sales/quotes">Annuler</Link></Button>
        <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleSubmit} disabled={saving || items.length === 0}>
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </div>
    </div>
  );
}
