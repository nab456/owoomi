'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Utilisateur } from '@/types';

type AppUser = {
  id: string;
  nom: string;
  email: string;
  role: Utilisateur['role'] | 'superadmin';
  entrepriseId?: string;
  statut: 'actif' | 'inactif';
};

type RegisterResult =
  | { success: true }
  | { success: false; requiresConfirmation: true }
  | { success: false; error: string };

interface AuthContextType {
  isAuthenticated: boolean;
  user: AppUser | null;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  register: (nom: string, email: string, pass: string) => Promise<RegisterResult>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchUserProfile(uid: string): Promise<AppUser | null> {
  const { data, error } = await supabase
    .from('utilisateurs')
    .select('id, nom, email, entreprise_id, role, statut')
    .eq('id', uid)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    nom: data.nom,
    email: data.email,
    role: data.role,
    entrepriseId: data.entreprise_id ?? undefined,
    statut: data.statut,
  };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await fetchUserProfile(session.user.id);
        setUser(profile);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const profile = await fetchUserProfile(session.user.id);
        setUser(profile);
        if (profile?.role === 'superadmin') {
          router.push('/admin/dashboard');
        } else {
          router.push('/dashboard');
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        router.push('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) return { success: false, error: error.message };
    return { success: true };
  };

  const register = async (nom: string, email: string, pass: string): Promise<RegisterResult> => {
    const { data, error } = await supabase.auth.signUp({ email, password: pass });

    if (error) return { success: false, error: error.message };
    if (!data.user) return { success: false, error: "Impossible de créer le compte." };

    // Si la confirmation d'email est activée, il n'y a pas de session immédiate.
    // On informe l'utilisateur de vérifier sa boîte mail.
    if (!data.session) {
      return { success: false, requiresConfirmation: true };
    }

    const { data: entreprise, error: entrepriseError } = await supabase
      .from('entreprises')
      .insert({
        nom: `Entreprise de ${nom}`,
        statut: 'actif',
        abonnement: 'gratuit',
        date_expiration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('id')
      .single();

    if (entrepriseError || !entreprise) {
      return { success: false, error: `Erreur création entreprise : ${entrepriseError?.message}` };
    }

    const { error: userError } = await supabase
      .from('utilisateurs')
      .insert({
        id: data.user.id,
        nom,
        email,
        entreprise_id: entreprise.id,
        role: 'PDG',
        statut: 'actif',
      });

    if (userError) return { success: false, error: `Erreur création profil : ${userError.message}` };

    return { success: true };
  };

  const logout = () => {
    supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!user, user, login, logout, register, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
