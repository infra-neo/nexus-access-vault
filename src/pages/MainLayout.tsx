import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/components/AuthProvider';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';
import { Bell, Search, Shield, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function MainLayout() {
  const { profile } = useAuth();
  const { isConnected, isLoading } = useConnectionStatus();

  return (
    <ProtectedRoute>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <AppSidebar />
          <main className="flex-1 flex flex-col min-w-0">
            {/* Header */}
            <header className="sticky top-0 z-10 h-14 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="flex h-full items-center gap-4 px-4">
                <SidebarTrigger className="-ml-1" />
                
                {/* Breadcrumb / Title area */}
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Neogenesys</span>
                  <span className="text-muted-foreground/50">/</span>
                  <span className="font-medium">Client Portal</span>
                </div>

                {/* Search */}
                <div className="flex-1 max-w-md mx-auto hidden md:block">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search resources, applications..." 
                      className="pl-9 bg-secondary/50 border-border/50 h-9"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-auto">
                  {/* Connection Status */}
                  {isLoading ? (
                    <Badge variant="outline" className="hidden sm:flex items-center gap-1.5 text-xs border-muted-foreground/30 text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Verificando...
                    </Badge>
                  ) : isConnected ? (
                    <Badge variant="outline" className="hidden sm:flex items-center gap-1.5 text-xs border-green-500/30 text-green-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                      Conectado
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="hidden sm:flex items-center gap-1.5 text-xs border-red-500/30 text-red-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                      Desconectado
                    </Badge>
                  )}

                  {/* Notifications */}
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-4 w-4" />
                    <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-[10px] font-medium flex items-center justify-center text-primary-foreground">
                      3
                    </span>
                  </Button>

                  {/* Security Status */}
                  <Button variant="ghost" size="icon">
                    <Shield className="h-4 w-4 text-success" />
                  </Button>
                </div>
              </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 overflow-auto">
              <div className="p-6 animate-fade-in">
                <Outlet />
              </div>
            </div>
          </main>
        </div>
      </SidebarProvider>
    </ProtectedRoute>
  );
}