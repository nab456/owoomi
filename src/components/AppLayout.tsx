'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarProvider, Sidebar, SidebarInset, SidebarRail } from '@/components/ui/sidebar';
import AppNav from '@/components/app-nav';
import { Header } from '@/components/header';
import { Skeleton } from './ui/skeleton';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  const isAuthPage = pathname === '/login' || pathname === '/register';

  useEffect(() => {
    if (!loading && !isAuthenticated && !isAuthPage) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, isAuthPage, router]);

  if (loading) {
    return (
        <div className="flex min-h-screen w-full">
            <div className="hidden md:block">
                <Skeleton className="h-full w-[16rem]" />
            </div>
            <div className="flex-1 p-8 space-y-8">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-80 w-full" />
            </div>
        </div>
    );
  }

  if (isAuthPage) {
    return <>{children}</>;
  }
  
  if (!isAuthenticated && !isAuthPage) {
    return null; // or a loading spinner, router is pushing to login
  }

  return (
    <SidebarProvider>
      <Sidebar className="h-full" variant="floating" collapsible="icon">
        <AppNav />
      </Sidebar>
      <SidebarRail />
      <SidebarInset className="max-h-screen overflow-y-auto w-full">
        <Header />
        <main className="p-4 sm:p-6 lg:p-8 space-y-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
