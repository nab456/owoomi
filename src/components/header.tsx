"use client"

import Link from 'next/link'
import {
  Bell,
  UserCircle,
  LogOut,
  Settings,
  PackageX,
  AlertCircle,
  Info,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar'
import { useAuth } from '@/contexts/AuthContext'
import { ThemeSwitcher } from './theme-switcher'
import { GlobalSearch } from './global-search'
import { useNotifications } from '@/hooks/useNotifications'
import { useRouter } from 'next/navigation'

const severityIcon = (s: string) => {
  if (s === 'error') return <PackageX className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />;
  if (s === 'warning') return <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5 shrink-0" />;
  return <Info className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />;
};

export function Header() {
  const { isMobile } = useSidebar();
  const { logout, user } = useAuth();
  const { notifications, count } = useNotifications();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      {isMobile && <SidebarTrigger />}
      <div className="ml-auto flex-1 md:grow-0">
        <GlobalSearch />
      </div>
      <ThemeSwitcher />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full relative">
            {count > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-red-500 hover:bg-red-500">
                {count > 9 ? '9+' : count}
              </Badge>
            )}
            <Bell className="h-5 w-5" />
            <span className="sr-only">Notifications</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-96">
          <DropdownMenuLabel className="flex items-center justify-between">
            Notifications
            {count > 0 && <Badge variant="outline" className="text-xs">{count}</Badge>}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <ScrollArea className="max-h-[400px]">
            {notifications.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">Aucune notification</div>
            ) : notifications.map(n => (
              <DropdownMenuItem key={n.id} className="flex items-start gap-3 p-3 cursor-pointer" onSelect={() => router.push(n.href)}>
                {severityIcon(n.severity)}
                <div className="min-w-0">
                  <p className="font-semibold text-sm leading-tight">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 break-words">{n.message}</p>
                </div>
              </DropdownMenuItem>
            ))}
          </ScrollArea>
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full">
            <UserCircle className="h-8 w-8" />
            <span className="sr-only">Toggle user menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{user ? user.name : 'Mon Compte'}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/settings">
              <Settings className="mr-2 h-4 w-4" />
              <span>Paramètres</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={logout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Déconnexion</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
