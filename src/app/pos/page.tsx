'use client';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { listProduits } from '@/services/produit';
import { listClients } from '@/services/client';
import { createVente } from '@/services/vente';
import { MODES_PAIEMENT } from '@/services/caisse';
import type { Produit, Client } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Search, ShoppingCart, Trash2, Plus, Minus, X, Star, CreditCard, ArrowLeft,
  Printer, CheckCircle,
} from 'lucide-react';

interface CartItem { produit: Produit; quantite: number; }

const FAVORITES_KEY = 'pos_favorites';

export default function POSPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [produits, setProduits] = useState<Produit[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [clientId, setClientId] = useState('');
  const [paymentMode, setPaymentMode] = useState(MODES_PAIEMENT[0]);
  const [montantRecu, setMontantRecu] = useState('');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [lastTotal, setLastTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.entrepriseId) return;
    const saved = localStorage.getItem(FAVORITES_KEY + '_' + user.entrepriseId);
    if (saved) setFavorites(JSON.parse(saved));
    Promise.all([listProduits(), listClients()]).then(([p, c]) => {
      setProduits(p); setClients(c); setLoading(false);
    });
  }, [user?.entrepriseId]);

  const saveFavorites = useCallback((ids: string[]) => {
    setFavorites(ids);
    if (user?.entrepriseId) localStorage.setItem(FAVORITES_KEY + '_' + user.entrepriseId, JSON.stringify(ids));
  }, [user?.entrepriseId]);

  const toggleFavorite = (id: string) => {
    saveFavorites(favorites.includes(id) ? favorites.filter(f => f !== id) : [...favorites, id]);
  };

  const addToCart = (p: Produit) => {
    setCart(prev => {
      const existing = prev.findIndex(i => i.produit.id === p.id);
      if (existing >= 0) return prev.map((it, i) => i === existing ? { ...it, quantite: it.quantite + 1 } : it);
      return [...prev, { produit: p, quantite: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(it => it.produit.id === id ? { ...it, quantite: Math.max(1, it.quantite + delta) } : it));
  };

  const removeFromCart = (id: string) => setCart(prev => prev.filter(it => it.produit.id !== id));

  const total = cart.reduce((s, it) => s + it.produit.prix * it.quantite, 0);
  const rendu = parseFloat(montantRecu) > total ? parseFloat(montantRecu) - total : 0;

  const handleCheckout = async () => {
    if (cart.length === 0 || !user?.entrepriseId) return;
    setSaving(true);
    try {
      await createVente({
        type: 'ticket',
        clientId: clientId || undefined,
        vendeurId: user.id,
        statut: 'paye',
        items: cart.map(it => ({ produitId: it.produit.id, nomProduit: it.produit.nom, quantite: it.quantite, prixUnitaire: it.produit.prix, remise: 0, total: it.produit.prix * it.quantite })),
        paiements: [{ venteId: '', montant: total, mode: paymentMode }],
        entrepriseId: user.entrepriseId,
      });
      setLastTotal(total);
      setCart([]);
      setClientId('');
      setMontantRecu('');
      setCheckoutOpen(false);
      setSuccessOpen(true);
    } finally { setSaving(false); }
  };

  const printReceipt = () => {
    const win = window.open('', '_blank', 'width=350,height=600');
    if (!win) return;
    const date = new Date().toLocaleString('fr-FR');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Ticket</title>
    <style>body{font-family:monospace;font-size:12px;width:300px;margin:auto;}h2{text-align:center;}hr{border:1px dashed #000;}table{width:100%;}td:last-child{text-align:right;}@media print{body{margin:0;}}</style>
    </head><body>
    <h2>Owoo mi</h2><p style="text-align:center">${date}</p><hr>
    <table>${cart.map(it => `<tr><td>${it.produit.nom} x${it.quantite}</td><td>${(it.produit.prix * it.quantite).toLocaleString('fr-FR')} F</td></tr>`).join('')}</table>
    <hr><table><tr><td><b>TOTAL</b></td><td><b>${lastTotal.toLocaleString('fr-FR')} FCFA</b></td></tr></table>
    <p style="text-align:center;margin-top:16px">Merci de votre visite!</p>
    <script>window.onload=()=>{window.print();}<\/script></body></html>`);
    win.document.close();
  };

  const favoriteProducts = produits.filter(p => favorites.includes(p.id));
  const filteredProducts = search
    ? produits.filter(p => p.nom.toLowerCase().includes(search.toLowerCase()) || (p.sku ?? '').toLowerCase().includes(search.toLowerCase()))
    : produits;

  if (loading) return <div className="flex items-center justify-center h-screen">Chargement...</div>;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden bg-muted/30">
      {/* Products panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 p-3 bg-background border-b">
          <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher produit..." className="pl-8" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Client général" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Client général</SelectItem>
              {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Favorites row */}
        {favoriteProducts.length > 0 && (
          <div className="flex gap-2 p-3 overflow-x-auto border-b bg-background flex-shrink-0">
            <span className="text-xs text-muted-foreground self-center whitespace-nowrap"><Star className="h-3 w-3 inline mr-1" />Favoris:</span>
            {favoriteProducts.map(p => (
              <Button key={p.id} variant="outline" size="sm" onClick={() => addToCart(p)}
                className="whitespace-nowrap border-green-300 text-green-700 hover:bg-green-50 shrink-0">
                {p.nom} — {p.prix.toLocaleString('fr-FR')} F
              </Button>
            ))}
          </div>
        )}

        {/* Products grid */}
        <ScrollArea className="flex-1 p-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filteredProducts.map(p => (
              <div key={p.id} className="bg-background rounded-xl border shadow-sm overflow-hidden cursor-pointer hover:shadow-md hover:border-green-400 transition-all group"
                onClick={() => addToCart(p)}>
                <div className="p-3">
                  <div className="font-medium text-sm leading-tight line-clamp-2">{p.nom}</div>
                  <div className="text-green-600 font-bold text-base mt-1">{p.prix.toLocaleString('fr-FR')} F</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Stock: {p.stock}</div>
                </div>
                <div className="flex items-center justify-between px-3 pb-2">
                  <Badge variant="outline" className={p.stock > 0 ? 'text-green-700 border-green-300 text-[10px]' : 'text-red-600 border-red-300 text-[10px]'}>
                    {p.stock > 0 ? 'En stock' : 'Rupture'}
                  </Badge>
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => { e.stopPropagation(); toggleFavorite(p.id); }}>
                    <Star className={`h-4 w-4 ${favorites.includes(p.id) ? 'text-yellow-500 fill-yellow-400' : 'text-muted-foreground'}`} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Cart panel */}
      <div className="w-80 flex flex-col bg-background border-l shadow-lg">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-bold flex items-center gap-2"><ShoppingCart className="h-5 w-5" />Panier</h2>
          {cart.length > 0 && <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 h-7 text-xs" onClick={() => setCart([])}><X className="h-3 w-3 mr-1" />Vider</Button>}
        </div>

        <ScrollArea className="flex-1">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-sm">
              <ShoppingCart className="h-12 w-12 mb-3 opacity-20" />
              <p>Panier vide</p>
              <p className="text-xs mt-1">Cliquez sur un produit</p>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {cart.map(it => (
                <div key={it.produit.id} className="flex items-center gap-2 p-2 rounded-lg border bg-muted/30">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{it.produit.nom}</div>
                    <div className="text-xs text-muted-foreground">{it.produit.prix.toLocaleString('fr-FR')} F × {it.quantite}</div>
                    <div className="text-sm font-bold text-green-600">{(it.produit.prix * it.quantite).toLocaleString('fr-FR')} F</div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQty(it.produit.id, -1)}><Minus className="h-3 w-3" /></Button>
                    <span className="w-6 text-center text-sm font-medium">{it.quantite}</span>
                    <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQty(it.produit.id, 1)}><Plus className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => removeFromCart(it.produit.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="p-4 border-t space-y-3">
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span className="text-green-600">{total.toLocaleString('fr-FR')} FCFA</span>
          </div>
          <Button className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-base font-semibold"
            onClick={() => setCheckoutOpen(true)} disabled={cart.length === 0}>
            <CreditCard className="h-5 w-5 mr-2" />Encaisser
          </Button>
        </div>
      </div>

      {/* Checkout Dialog */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Encaissement</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted rounded-xl p-4 text-center">
              <p className="text-sm text-muted-foreground">Montant à encaisser</p>
              <p className="text-4xl font-bold text-green-600">{total.toLocaleString('fr-FR')} FCFA</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Mode de paiement</label>
              <Select value={paymentMode} onValueChange={setPaymentMode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MODES_PAIEMENT.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {paymentMode === 'Espèces' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Montant reçu (FCFA)</label>
                <Input type="number" value={montantRecu} onChange={e => setMontantRecu(e.target.value)} placeholder={total.toString()} className="text-lg text-center" />
                {rendu > 0 && (
                  <div className="bg-green-50 rounded p-3 text-center">
                    <p className="text-sm text-muted-foreground">Monnaie à rendre</p>
                    <p className="text-2xl font-bold text-green-600">{rendu.toLocaleString('fr-FR')} FCFA</p>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutOpen(false)}>Annuler</Button>
            <Button onClick={handleCheckout} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white">
              {saving ? 'Enregistrement...' : 'Valider'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="sm:max-w-sm text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
          <h2 className="text-xl font-bold">Vente enregistrée !</h2>
          <p className="text-muted-foreground">{lastTotal.toLocaleString('fr-FR')} FCFA encaissés</p>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button onClick={printReceipt} variant="outline" className="w-full"><Printer className="h-4 w-4 mr-2" />Imprimer le reçu</Button>
            <Button onClick={() => setSuccessOpen(false)} className="w-full bg-green-600 hover:bg-green-700 text-white">Nouvelle vente</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
