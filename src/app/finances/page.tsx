'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { listVentes } from '@/services/vente';
import { listDepenses } from '@/services/depense';
import { listEntrees } from '@/services/entree';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { DollarSign, Banknote, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';

const chartConfig: ChartConfig = {
  revenue: { label: 'Revenus', color: 'hsl(var(--chart-1))' },
  expenses: { label: 'Dépenses', color: 'hsl(var(--chart-2))' },
};

const MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jui', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

export default function FinancesPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<{ month: string; revenue: number; expenses: number }[]>([]);
  const [entreesMonth, setEntreesMonth] = useState(0);
  const [sortiesMonth, setSortiesMonth] = useState(0);
  const [entreesTotal, setEntreesTotal] = useState(0);

  useEffect(() => { if (user?.entrepriseId) load(); }, [user]);

  async function load() {
    setLoading(true);
    const [ventes, depenses, entrees] = await Promise.all([listVentes(), listDepenses(), listEntrees()]);

    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const entreesThisMonth = ventes.filter(v => {
      if (!v.createdAt) return false;
      const d = new Date(v.createdAt);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).reduce((s, v) => s + v.montantPaye, 0)
      + entrees.filter(e => {
        if (!e.createdAt) return false;
        const d = new Date(e.createdAt);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
      }).reduce((s, e) => s + e.montant, 0);

    const sortiesThisMonth = depenses.filter(d => {
      if (!d.createdAt) return false;
      const dt = new Date(d.createdAt);
      return dt.getMonth() === thisMonth && dt.getFullYear() === thisYear;
    }).reduce((s, d) => s + d.montant, 0);

    const totalEntrees = ventes.reduce((s, v) => s + v.montantPaye, 0) + entrees.reduce((s, e) => s + e.montant, 0);

    // Build chart: last 12 months
    const monthlyData = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(thisYear, thisMonth - i, 1);
      const m = d.getMonth(); const y = d.getFullYear();
      const rev = ventes.filter(v => v.createdAt && new Date(v.createdAt).getMonth() === m && new Date(v.createdAt).getFullYear() === y).reduce((s, v) => s + v.montantPaye, 0)
        + entrees.filter(e => e.createdAt && new Date(e.createdAt).getMonth() === m && new Date(e.createdAt).getFullYear() === y).reduce((s, e) => s + e.montant, 0);
      const exp = depenses.filter(dep => dep.date && new Date(dep.date).getMonth() === m && new Date(dep.date).getFullYear() === y).reduce((s, dep) => s + dep.montant, 0);
      monthlyData.push({ month: MONTH_LABELS[m], revenue: rev, expenses: exp });
    }

    setEntreesMonth(entreesThisMonth);
    setSortiesMonth(sortiesThisMonth);
    setEntreesTotal(totalEntrees);
    setChartData(monthlyData);
    setLoading(false);
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Vue d'ensemble des Finances</CardTitle>
          <CardDescription>Suivez vos flux de trésorerie, comptes et performances financières.</CardDescription>
        </CardHeader>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entrées de trésorerie</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : `${entreesMonth.toLocaleString('fr-FR')} FCFA`}</div>
            <p className="text-xs text-muted-foreground">Ce mois-ci</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sorties de trésorerie</CardTitle>
            <ArrowDownLeft className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : `${sortiesMonth.toLocaleString('fr-FR')} FCFA`}</div>
            <p className="text-xs text-muted-foreground">Ce mois-ci</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenus</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : `${entreesTotal.toLocaleString('fr-FR')} FCFA`}</div>
            <p className="text-xs text-muted-foreground">Depuis le début</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flux Net du Mois</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(entreesMonth - sortiesMonth) < 0 ? 'text-destructive' : ''}`}>
              {loading ? '...' : `${(entreesMonth - sortiesMonth).toLocaleString('fr-FR')} FCFA`}
            </div>
            <p className="text-xs text-muted-foreground">Entrées - Dépenses</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenus vs Dépenses Mensuels</CardTitle>
          <CardDescription>Aperçu sur 12 mois</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[350px] w-full">
            <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} />
              <Tooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
              <Bar dataKey="revenue" fill="var(--color-revenue)" radius={8} />
              <Bar dataKey="expenses" fill="var(--color-expenses)" radius={8} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </>
  );
}
