'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { listVentes } from '@/services/vente';
import { listProduits } from '@/services/produit';
import { listClients } from '@/services/client';
import { listDepenses } from '@/services/depense';
import type { Vente, Produit } from '@/types';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DollarSign, ShoppingCart, Users, ArrowUp, ArrowDown, PackageX } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';

const chartConfig: ChartConfig = {
  revenue: { label: 'Revenus', color: 'hsl(var(--chart-1))' },
  expenses: { label: 'Dépenses', color: 'hsl(var(--chart-2))' },
};

const MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jui', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

export default function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [recentSales, setRecentSales] = useState<Vente[]>([]);
  const [chartData, setChartData] = useState<{ month: string; revenue: number; expenses: number }[]>([]);
  const [kpis, setKpis] = useState({
    revenueTotal: 0,
    nbVentes: 0,
    nbClients: 0,
    fluxNet: 0,
    ruptureStock: 0,
  });

  useEffect(() => { if (user?.entrepriseId) load(); }, [user]);

  async function load() {
    setLoading(true);
    const [ventes, produits, clients, depenses] = await Promise.all([
      listVentes(), listProduits(), listClients(), listDepenses(),
    ]);

    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const ventesThisMonth = ventes.filter(v => {
      if (!v.createdAt) return false;
      const d = new Date(v.createdAt);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    });

    const revenueTotal = ventesThisMonth.reduce((s, v) => s + v.montantPaye, 0);
    const depensesTotal = depenses.filter(d => {
      if (!d.createdAt) return false;
      const dt = new Date(d.createdAt);
      return dt.getMonth() === thisMonth && dt.getFullYear() === thisYear;
    }).reduce((s, d) => s + d.montant, 0);

    const ruptureStock = (produits as Produit[]).filter(p => p.stock <= 0).length;

    // Build chart: last 6 months
    const monthlyData: { month: string; revenue: number; expenses: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(thisYear, thisMonth - i, 1);
      const m = d.getMonth(); const y = d.getFullYear();
      const rev = ventes.filter(v => v.createdAt && new Date(v.createdAt).getMonth() === m && new Date(v.createdAt).getFullYear() === y).reduce((s, v) => s + v.montantPaye, 0);
      const exp = depenses.filter(dep => dep.date && new Date(dep.date).getMonth() === m && new Date(dep.date).getFullYear() === y).reduce((s, dep) => s + dep.montant, 0);
      monthlyData.push({ month: MONTH_LABELS[m], revenue: rev, expenses: exp });
    }

    setKpis({
      revenueTotal,
      nbVentes: ventesThisMonth.length,
      nbClients: clients.length,
      fluxNet: revenueTotal - depensesTotal,
      ruptureStock,
    });
    setRecentSales(ventes.slice(0, 5));
    setChartData(monthlyData);
    setLoading(false);
  }

  const getStatusBadge = (statut: string) => {
    if (statut === 'paye') return 'bg-green-500/20 text-green-700';
    if (statut === 'annule') return '';
    return '';
  };

  const statutLabel: Record<string, string> = {
    paye: 'Payé', valide: 'Validé', en_attente: 'En attente', annule: 'Annulé',
  };

  if (loading) {
    return (
      <div className="text-center py-16 text-muted-foreground">Chargement du tableau de bord...</div>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenu du Mois</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.revenueTotal.toLocaleString('fr-FR')} FCFA</div>
            <p className="text-xs text-muted-foreground">Paiements reçus ce mois</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventes ce Mois</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.nbVentes}</div>
            <p className="text-xs text-muted-foreground">Ventes enregistrées</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.nbClients}</div>
            <p className="text-xs text-muted-foreground">Clients enregistrés</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flux Net du Mois</CardTitle>
            <div className="flex gap-2">
              <ArrowUp className="h-4 w-4 text-green-500" />
              <ArrowDown className="h-4 w-4 text-red-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${kpis.fluxNet < 0 ? 'text-destructive' : ''}`}>{kpis.fluxNet.toLocaleString('fr-FR')} FCFA</div>
            <p className="text-xs text-muted-foreground">Revenus - Dépenses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rupture de stock</CardTitle>
            <PackageX className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.ruptureStock}</div>
            <p className="text-xs text-muted-foreground">Produits en rupture</p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Revenus vs Dépenses</CardTitle>
            <CardDescription>Comparaison mensuelle des 6 derniers mois.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <BarChart data={chartData} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} tickMargin={10} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip content={<ChartTooltipContent />} />
                <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
                <Bar dataKey="expenses" fill="var(--color-expenses)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Ventes Récentes</CardTitle>
            <CardDescription>Les 5 dernières ventes enregistrées.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSales.map(v => (
                  <TableRow key={v.id}>
                    <TableCell>
                      <div className="font-medium">{v.clientNom ?? 'Client général'}</div>
                      <div className="text-xs text-muted-foreground">{v.reference}</div>
                    </TableCell>
                    <TableCell>{v.total.toLocaleString('fr-FR')} FCFA</TableCell>
                    <TableCell>
                      <Badge variant={v.statut === 'paye' ? 'default' : 'secondary'} className={getStatusBadge(v.statut)}>
                        {statutLabel[v.statut] ?? v.statut}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {recentSales.length === 0 && (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-4">Aucune vente.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
