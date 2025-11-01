import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function MainLayout() {
  return (
    <ProtectedRoute>
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <main className="flex-1">
            <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
              <SidebarTrigger className="-ml-2" />
              <div className="flex-1"></div>
            </header>
            <div className="p-6">
              <Outlet />
            </div>
          </main>
        </div>
      </SidebarProvider>
    </ProtectedRoute>
  );
}