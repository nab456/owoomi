'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Building, Users, Clock, Loader2 } from 'lucide-react';
import { getStats, listAllEntreprises } from '@/ai/flows/admin';
import type { Entreprise } from '@/types';

type Stats = {
    totalEntreprises: number;
    totalUtilisateurs: number;
    expirationsProches: number;
};

type ClientSafeEntreprise = Omit<Entreprise, 'dateSouscription' | 'dateExpiration'> & {
    dateSouscription: string;
    dateExpiration: string;
}

export default function AdminDashboardPage() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [entreprises, setEntreprises] = useState<ClientSafeEntreprise[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const [statsData, entreprisesData] = await Promise.all([
                    getStats(),
                    listAllEntreprises(),
                ]);
                setStats(statsData);
                setEntreprises(entreprisesData);
            } catch (error) {
                console.error("Failed to fetch admin data:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    const getStatusBadge = (status: string) => {
        switch (status) {
          case 'actif':
            return 'bg-green-100 text-green-800 border-green-200';
          case 'suspendu':
            return 'bg-red-100 text-red-800 border-red-200';
          default:
            return 'bg-gray-100 text-gray-800';
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold">Tableau de bord Super Admin</h1>
            
            <div className="grid gap-6 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Entreprises</CardTitle>
                        <Building className="h-5 w-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalEntreprises ?? '...'}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Utilisateurs</CardTitle>
                        <Users className="h-5 w-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalUtilisateurs ?? '...'}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Expirations Proches</CardTitle>
                        <Clock className="h-5 w-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.expirationsProches ?? '...'}</div>
                        <p className="text-xs text-muted-foreground">Dans les 7 prochains jours</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Liste des Entreprises</CardTitle>
                    <CardDescription>Gérer les entreprises inscrites sur la plateforme.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nom de l'entreprise</TableHead>
                                <TableHead>Statut</TableHead>
                                <TableHead>Abonnement</TableHead>
                                <TableHead>Date d'expiration</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {entreprises.map((entreprise) => (
                                <TableRow key={entreprise.id}>
                                    <TableCell className="font-medium">{entreprise.nom}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={getStatusBadge(entreprise.statut)}>
                                            {entreprise.statut}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{entreprise.abonnement}</TableCell>
                                    <TableCell>{entreprise.dateExpiration}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}