'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Package, Users, ShoppingCart, Briefcase, FileSignature, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SearchResult {
  id: string;
  label: string;
  sublabel?: string;
  href: string;
  group: string;
  icon: React.ElementType;
}

export function GlobalSearch() {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const search = useCallback(async (q: string) => {
    if (!q.trim() || !user?.entrepriseId) { setResults([]); return; }
    setSearching(true);

    const [{ data: produits }, { data: clients }, { data: ventes }, { data: fournisseurs }, { data: devis }] = await Promise.all([
      supabase.from('produits').select('id, nom, reference').ilike('nom', `%${q}%`).eq('entreprise_id', user.entrepriseId).limit(5),
      supabase.from('clients').select('id, nom, telephone').ilike('nom', `%${q}%`).eq('entreprise_id', user.entrepriseId).limit(5),
      supabase.from('ventes').select('id, reference, client_nom').ilike('reference', `%${q}%`).eq('entreprise_id', user.entrepriseId).limit(5),
      supabase.from('fournisseurs').select('id, nom, telephone').ilike('nom', `%${q}%`).eq('entreprise_id', user.entrepriseId).limit(5),
      supabase.from('devis').select('id, reference, client_nom').ilike('reference', `%${q}%`).eq('entreprise_id', user.entrepriseId).limit(5),
    ]);

    const all: SearchResult[] = [
      ...(produits ?? []).map((p: any) => ({ id: p.id, label: p.nom, sublabel: p.reference, href: `/products`, group: 'Produits', icon: Package })),
      ...(clients ?? []).map((c: any) => ({ id: c.id, label: c.nom, sublabel: c.telephone, href: `/customers`, group: 'Clients', icon: Users })),
      ...(ventes ?? []).map((v: any) => ({ id: v.id, label: v.reference, sublabel: v.client_nom, href: `/sales/${v.id}`, group: 'Ventes', icon: ShoppingCart })),
      ...(fournisseurs ?? []).map((f: any) => ({ id: f.id, label: f.nom, sublabel: f.telephone, href: `/suppliers`, group: 'Fournisseurs', icon: Briefcase })),
      ...(devis ?? []).map((d: any) => ({ id: d.id, label: d.reference, sublabel: d.client_nom, href: `/sales/quotes`, group: 'Devis', icon: FileSignature })),
    ];

    setResults(all);
    setSearching(false);
  }, [user?.entrepriseId]);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  const handleSelect = (href: string) => {
    setOpen(false);
    setQuery('');
    router.push(href);
  };

  const groups = ['Produits', 'Clients', 'Ventes', 'Fournisseurs', 'Devis'];

  return (
    <>
      <Button
        variant="outline"
        className="relative w-full md:w-[200px] lg:w-[320px] justify-start text-sm text-muted-foreground pl-8 gap-2"
        onClick={() => setOpen(true)}
      >
        <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground" />
        Rechercher...
        <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          Ctrl K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Rechercher produit, client, vente..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {searching && <div className="py-4 text-center text-sm text-muted-foreground">Recherche...</div>}
          {!searching && query && results.length === 0 && (
            <CommandEmpty>Aucun résultat pour "{query}"</CommandEmpty>
          )}
          {!searching && !query && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Tapez pour rechercher produits, clients, ventes...
            </div>
          )}
          {groups.map(group => {
            const groupResults = results.filter(r => r.group === group);
            if (groupResults.length === 0) return null;
            return (
              <CommandGroup key={group} heading={group}>
                {groupResults.map(result => (
                  <CommandItem
                    key={`${group}-${result.id}`}
                    onSelect={() => handleSelect(result.href)}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <result.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="truncate font-medium">{result.label}</span>
                      {result.sublabel && <span className="text-xs text-muted-foreground truncate">{result.sublabel}</span>}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            );
          }).filter(Boolean).flatMap((el, i, arr) => i < arr.length - 1 ? [el, <CommandSeparator key={`sep-${i}`} />] : [el])}
        </CommandList>
      </CommandDialog>
    </>
  );
}
