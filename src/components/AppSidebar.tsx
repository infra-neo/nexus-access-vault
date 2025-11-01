import { LayoutDashboard, Users, Server, ScrollText, LogOut, Building2 } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "./ui/button";

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { profile, signOut } = useAuth();
  
  const isActive = (path: string) => location.pathname === path;
  const collapsed = state === 'collapsed';

  const navItems = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "Resources", url: "/resources", icon: Server },
    ...(profile?.role === 'org_admin' || profile?.role === 'global_admin' 
      ? [{ title: "Users", url: "/users", icon: Users }] 
      : []),
    ...(profile?.role === 'global_admin' 
      ? [{ title: "Organizations", url: "/organizations", icon: Building2 }] 
      : []),
    { title: "Audit Log", url: "/audit", icon: ScrollText },
  ];

  return (
    <Sidebar className={collapsed ? "w-16" : "w-64"}>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">N</span>
            </div>
            <div>
              <h2 className="font-semibold text-sm">Neogenesys</h2>
              <p className="text-xs text-muted-foreground">Access Manager</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center mx-auto">
            <span className="text-primary-foreground font-bold text-lg">N</span>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <Button
          variant="ghost"
          onClick={signOut}
          className="w-full justify-start"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-3">Sign Out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}