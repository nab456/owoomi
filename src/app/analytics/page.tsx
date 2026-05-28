'use client';
import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { listVentes } from '@/services/vente';
import { listDepenses } from '@/services/depense';
import { listClients } from '@/services/client';
import type { Vente, Depense, Client } from '@/types';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, Users, ShoppingCart, BarChart2, DollarSign } from 'lucide-react';

const COLORS = ['#16a34a', '#2563eb', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
const MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jui', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [ventes, setVentes] = useState<Vente[]>([]);
  const [depenses, setDepenses] = useState<Depense[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'3m' | '6m' | '12m'>('6m');

  useEffect(() => {
    if (!user?.entrepriseId) return;
    Promise.all([listVentes(), listDepenses(), listClients()]).then(([v, d, c]) => {
      setVentes(v); setDepenses(d); setClients(c); setLoading(false);
    });
  }, [user?.entrepriseId]);

  const months = period === '3m' ? 3 : period === '6m' ? 6 : 12;
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  // Monthly revenue vs expenses
  const monthlyData = useMemo(() => {
    const data = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(thisYear, thisMonth - i, 1);
      const m = d.getMonth(); const y = d.getFullYear();
      const rev = ventes.filter(v => v.createdAt && new Date(v.createdAt).getMonth() === m && new Date(v.createdAt).getFullYear() === y)
        .reduce((s, v) => s + v.montantPaye, 0);
      const exp = depenses.filter(dp => dp.createdAt && new Date(dp.createdAt).getMonth() === m && new Date(dp.createdAt).getFullYear() === y)
        .reduce((s, dp) => s + dp.montant, 0);
      data.push({ month: MONTH_LABELS[m], revenue: rev, expenses: exp, profit: rev - exp });
    }
    return data;
  }, [ventes, depenses, months]);

  // Top products by sales volume
  const topProduits = useMemo(() => {
    const map = new Map<string, { nom: string; qty: number; ca: number }>();
    ventes.forEach(v => {
      (v.items ?? []).forEach(item => {
        const existing = map.get(item.nomProduit) ?? { nom: item.nomProduit, qty: 0, ca: 0 };
        map.set(item.nomProduit, { ...existing, qty: existing.qty + item.quantite, ca: existing.ca + item.total });
      });
    });
    return Array.from(map.values()).sort((a, b) => b.ca - a.ca).slice(0, 8);
  }, [ventes]);

  // Top clients by CA
  const topClients = useMemo(() => {
    const map = new Map<string, { nom: string; ca: number; nbVentes: number }>();
    ventes.forEach(v => {
      const key = v.clientNom ?? 'Client général';
      const existing = map.get(key) ?? { nom: key, ca: 0, nbVentes: 0 };
      map.set(key, { ...existing, ca: existing.ca + v.montantPaye, nbVentes: existing.nbVentes + 1 });
    });
    return Array.from(map.values()).sort((a, b) => b.ca - a.ca).slice(0, 8);
  }, [ventes]);

  // Expenses by category (Pie)
  const depensesParCategorie = useMemo(() => {
    const map = new Map<string, number>();
    depenses.forEach(d => {
      const cat = d.categorie ?? 'Autre';
      map.set(cat, (map.get(cat) ?? 0) + d.montant);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [depenses]);

  // Cash flow forecast (next 3 months based on last 3 months average)
  const avgMonthlyRevenue = useMemo(() => {
    const last3 = monthlyData.slice(-3);
    return last3.length > 0 ? last3.reduce((s, m) => s + m.revenue, 0) / last3.length : 0;
  }, [monthlyData]);

  const forecastData = useMemo(() => {
    const data = [...monthlyData];
    for (let i = 1; i <= 3; i++) {
      const d = new Date(thisYear, thisMonth + i, 1);
      data.push({ month: `${MONTH_LABELS[d.getMonth()]} (prev.)`, revenue: avgMonthlyRevenue, expenses: 0, profit: avgMonthlyRevenue, forecast: true } as any);
    }
    return data;
  }, [monthlyData, avgMonthlyRevenue]);

  // Comparatif N vs N-1
  const currentYearTotal = useMemo(() => ventes.filter(v => v.createdAt && new Date(v.createdAt).getFullYear() === thisYear).reduce((s, v) => s + v.montantPaye, 0), [ventes]);
  const lastYearTotal = useMemo(() => ventes.filter(v => v.createdAt && new Date(v.createdAt).getFullYear() === thisYear - 1).reduce((s, v) => s + v.montantPaye, 0), [ventes]);
  const growth = lastYearTotal > 0 ? ((currentYearTotal - lastYearTotal) / lastYearTotal) * 100 : null;

  const totalRevenue = ventes.reduce((s, v) => s + v.montantPaye, 0);
  const totalExpenses = depenses.reduce((s, d) => s + d.montant, 0);
  const avgBasket = ventes.length > 0 ? totalRevenue / ventes.length : 0;

  if (loading) return <div className="text-center py-16 text-muted-foreground">Chargement des analyses...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart2 className="h-6 w-6" />Analyses & Performances</h1>
          <p className="text-muted-foreground">Vue analytique approfondie de votre activité</p>
        </div>
        <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="3m">3 derniers mois</SelectItem>
            <SelectItem value="6m">6 derniers mois</SelectItem>
            <SelectItem value="12m">12 derniers mois</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI row */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">CA Total</p>
                <p className="text-2xl font-bold">{totalRevenue.toLocaleString('fr-FR')} F</p>
                {growth !== null && (
                  <p className={`text-xs flex items-center gap-1 mt-1 ${growth >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {growth >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {growth >= 0 ? '+' : ''}{growth.toFixed(1)}% vs N-1
                  </p>
                )}
              </div>
              <DollarSign className="h-8 w-8 text-green-600 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Dépenses Total</p>
                <p className="text-2xl font-bold">{totalExpenses.toLocaleString('fr-FR')} F</p>
                <p className="text-xs text-muted-foreground mt-1">Marge: {(totalRevenue - totalExpenses).toLocaleString('fr-FR')} F</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Panier Moyen</p>
                <p className="text-2xl font-bold">{avgBasket.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} F</p>
                <p className="text-xs text-muted-foreground mt-1">{ventes.length} ventes</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-blue-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Clients</p>
                <p className="text-2xl font-bold">{clients.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Prévision mensuelle: {avgMonthlyRevenue.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} F</p>
              </div>
              <Users className="h-8 w-8 text-purple-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue vs Expenses + Forecast */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenus vs Dépenses</CardTitle>
            <CardDescription>Évolution sur {months} mois + prévision 3 mois</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={forecastData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => `${v.toLocaleString('fr-FR')} FCFA`} />
                <Legend />
                <Bar dataKey="revenue" name="Revenus" fill="#16a34a" radius={[4, 4, 0, 0]} opacity={0.9} />
                <Bar dataKey="expenses" name="Dépenses" fill="#ef4444" radius={[4, 4, 0, 0]} opacity={0.9} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profit Net Mensuel</CardTitle>
            <CardDescription>Revenus − Dépenses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => `${v.toLocaleString('fr-FR')} FCFA`} />
                <Line type="monotone" dataKey="profit" name="Profit" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Products + Top Clients */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Top Produits par CA</CardTitle><CardDescription>Classés par chiffre d'affaires</CardDescription></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart layout="vertical" data={topProduits} margin={{ top: 0, right: 20, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="nom" width={100} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => `${v.toLocaleString('fr-FR')} FCFA`} />
                <Bar dataKey="ca" name="CA" fill="#16a34a" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Top Clients par CA</CardTitle><CardDescription>Vos meilleurs clients</CardDescription></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart layout="vertical" data={topClients} margin={{ top: 0, right: 20, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="nom" width={100} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => `${v.toLocaleString('fr-FR')} FCFA`} />
                <Bar dataKey="ca" name="CA" fill="#2563eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Expenses by category Pie */}
      {depensesParCategorie.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Répartition des Dépenses par Catégorie</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={depensesParCategorie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {depensesParCategorie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => `${v.toLocaleString('fr-FR')} FCFA`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
