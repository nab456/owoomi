"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useState, useEffect } from 'react'
import {
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarMenuSkeleton,
} from '@/components/ui/sidebar'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Briefcase,
  Landmark,
  FileText,
  Building2,
  Layers,
  Tags,
  PlusCircle,
  FileSignature,
  Truck,
  ArrowUpRight,
  ArrowDownLeft,
  Percent,
  Settings,
  ChevronRight,
  Shield,
  Monitor,
  RotateCcw,
  BarChart2,
  Warehouse,
  BookOpen,
  Smartphone,
  Bell,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { checkAccessRights } from '@/ai/flows/admin'

const navItemsConfig = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord', feature: 'dashboard' },
  { href: '/analytics', icon: BarChart2, label: 'Analyses', feature: 'dashboard' },
  {
    group: 'Produits',
    icon: Package,
    feature: 'stock',
    items: [
      { href: '/products', icon: Package, label: 'Tous les Produits' },
      { href: '/products/stock-levels', icon: Layers, label: 'Niveaux de Stock' },
      { href: '/products/categories', icon: Tags, label: 'Catégories Produits' },
      { href: '/products/warehouses', icon: Warehouse, label: 'Entrepôts' },
    ],
  },
  {
    group: 'Ventes & Factures',
    icon: ShoppingCart,
    feature: 'ventes',
    items: [
      { href: '/pos', icon: Monitor, label: 'Mode POS (Caisse)' },
      { href: '/sales/new', icon: PlusCircle, label: 'Nouvelle Vente' },
      { href: '/sales', icon: ShoppingCart, label: 'Ventes' },
      { href: '/sales/invoices', icon: FileText, label: 'Factures Tickets' },
      { href: '/sales/quotes', icon: FileSignature, label: 'Devis' },
      { href: '/sales/delivery-notes', icon: Truck, label: 'Bons de Livraison' },
      { href: '/sales/returns', icon: RotateCcw, label: 'Retours & Avoirs' },
      { href: '/sales/relances', icon: Bell, label: 'Relances Clients' },
    ]
  },
  {
    group: 'Finances',
    icon: Landmark,
    feature: 'finance',
    items: [
      { href: '/finances', icon: Landmark, label: "Vue d'ensemble" },
      { href: '/accounting', icon: BookOpen, label: 'Comptabilité' },
      { href: '/cash-register', icon: Landmark, label: 'Caisse' },
      { href: '/finances/income', icon: ArrowUpRight, label: 'Entrées' },
      { href: '/finances/expenses', icon: ArrowDownLeft, label: 'Dépenses' },
      { href: '/reports', icon: FileText, label: 'Rapports' },
    ],
  },
  {
    group: 'Équipe Commerciale',
    icon: Users,
    feature: 'equipe',
    items: [
      { href: '/team', icon: Users, label: 'Utilisateurs' },
      { href: '/team/reps', icon: Users, label: 'Commerciaux' },
      { href: '/team/commissions', icon: Percent, label: 'Commissions' },
      { href: '/team/access-control', icon: Shield, label: "Contrôle d'accès" },
    ],
  },
  { href: '/customers', icon: Users, label: 'Clients', feature: 'clients' },
  {
    group: 'Fournisseurs',
    icon: Briefcase,
    feature: 'fournisseurs',
    items: [
      { href: '/suppliers', icon: Briefcase, label: 'Fournisseurs' },
      { href: '/suppliers/purchase-orders', icon: Package, label: 'Bons de Commande' },
    ],
  },
  {
    group: 'Paramètres',
    icon: Settings,
    feature: 'settings',
    items: [
      { href: '/settings', icon: Settings, label: 'Paramètres' },
      { href: '/settings/mobile-money', icon: Smartphone, label: 'Mobile Money' },
    ],
  },
]

interface NavGroupProps {
    group: string;
    icon: React.ElementType;
    items: { href: string; icon: React.ElementType; label: string }[];
    pathname: string;
}

const NavGroup: React.FC<NavGroupProps> = ({ group, icon: GroupIcon, items, pathname }) => {
    const isActiveGroup = items.some(item => pathname === item.href || pathname.startsWith(item.href + '/'));
    const [isOpen, setIsOpen] = useState(isActiveGroup);

    useEffect(() => {
        if (isActiveGroup) {
            setIsOpen(true);
        }
    }, [pathname, isActiveGroup]);

    return (
        <SidebarMenuItem className="px-2 space-y-1">
            <SidebarMenuButton onClick={() => setIsOpen(!isOpen)} isActive={isActiveGroup && !isOpen}>
                <GroupIcon />
                <span>{group}</span>
                <ChevronRight className={cn("ml-auto h-4 w-4 transition-transform", isOpen && "rotate-90")} />
            </SidebarMenuButton>
            {isOpen && (
                <div className="pl-4 ml-2 border-l border-sidebar-border">
                    <SidebarMenu className="py-1">
                        {items.map((subItem) => (
                          <SidebarMenuItem key={subItem.href} className="px-0 py-0.5">
                            <SidebarMenuButton
                              asChild
                              isActive={pathname === subItem.href}
                              tooltip={subItem.label}
                              size="sm"
                              variant="ghost"
                            >
                              <Link href={subItem.href} className="gap-2 justify-start">
                                <subItem.icon className="h-3.5 w-3.5"/>
                                <span>{subItem.label}</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </div>
            )}
        </SidebarMenuItem>
    )
}

export default function AppNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const allFeatures = navItemsConfig.map(i => i.feature).filter(Boolean) as string[];

    if (!user) {
        setLoading(false);
        return;
    };
    
    if (user.role === 'superadmin') {
        const allAllowed = allFeatures.reduce((acc, feature) => ({ ...acc, [feature]: true }), {});
        setPermissions(allAllowed);
        setLoading(false);
        return;
    }

    const checkAllPermissions = async () => {
        setLoading(true);
        const perms: Record<string, boolean> = {};
        for (const feature of allFeatures) {
            if (feature) {
                const { hasAccess } = await checkAccessRights({ utilisateurId: user.id, feature });
                perms[feature] = hasAccess;
            }
        }
        setPermissions(perms);
        setLoading(false);
    }
    
    checkAllPermissions();

  }, [user]);

  const navItems = navItemsConfig.filter(item => loading || permissions[item.feature!]);

  return (
    <>
      <SidebarHeader className="p-4">
        <Link href="/dashboard" className="flex items-center gap-2">
            <Building2 className="w-8 h-8 text-sidebar-foreground" />
            <span className="text-xl font-semibold text-sidebar-foreground">
              Owoo mi
            </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
            {user?.role === 'superadmin' && (
                <SidebarMenuItem className="px-2">
                    <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith('/admin')}
                    tooltip="Admin Dashboard"
                    >
                    <Link href="/admin/dashboard">
                        <Shield />
                        <span>Admin Dashboard</span>
                    </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            )}
            {loading && Array.from({ length: 5 }).map((_, i) => <SidebarMenuSkeleton key={i} showIcon />)}

            {!loading && navItems.map((item, index) => {
            if (item.group) {
              return (
                <NavGroup key={index} group={item.group} icon={item.icon!} items={item.items!} pathname={pathname} />
              )
            }
            return (
              <SidebarMenuItem key={item.href} className="px-2">
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  tooltip={item.label}
                >
                  <Link href={item.href}>
                    <item.icon/>
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarContent>
    </>
  )
}
