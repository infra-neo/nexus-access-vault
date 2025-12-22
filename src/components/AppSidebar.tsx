import { 
  LayoutDashboard, 
  AppWindow, 
  Laptop2, 
  Activity, 
  Download, 
  ScrollText, 
  LogOut, 
  Settings,
  Users,
  Building2,
  Server,
  Shield,
  Cloud,
  Network,
  Workflow,
  ChevronDown,
  Layers,
  Store
} from "lucide-react";
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
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { useState } from "react";

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const [adminOpen, setAdminOpen] = useState(true);
  
  const isActive = (path: string) => location.pathname === path;
  const collapsed = state === 'collapsed';

  const isAdmin = profile?.role === 'org_admin' || profile?.role === 'global_admin';
  const isGlobalAdmin = profile?.role === 'global_admin';

  // Determine what the user can see based on their role
  const isSupport = profile?.role === 'support';
  const isUser = profile?.role === 'user';

  // Client Portal Navigation - varies by role
  const getClientItems = () => {
    // Base items for regular users
    const baseItems = [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "My Applications", url: "/my-applications", icon: AppWindow },
      { title: "My Devices", url: "/my-devices", icon: Laptop2 },
      { title: "Sessions", url: "/sessions", icon: Activity },
    ];

    // Support can also access marketplace
    if (isSupport || isAdmin) {
      baseItems.splice(2, 0, { title: "App Marketplace", url: "/app-marketplace", icon: Store });
      baseItems.push({ title: "Downloads", url: "/downloads", icon: Download });
      baseItems.push({ title: "Audit Log", url: "/audit", icon: ScrollText });
    }

    return baseItems;
  };

  const clientItems = getClientItems();

  // Admin Navigation - Support and Admins
  const adminItems = isSupport ? [
    { title: "Admin Panel", url: "/admin-panel", icon: Users },
    { title: "Users", url: "/users", icon: Users },
    { title: "Groups", url: "/groups", icon: Layers },
    { title: "Resources", url: "/resources", icon: Server },
  ] : [
    { title: "Admin Panel", url: "/admin-panel", icon: Users },
    { title: "Users", url: "/users", icon: Users },
    { title: "Groups", url: "/groups", icon: Layers },
    { title: "Resources", url: "/resources", icon: Server },
    { title: "Cloud Providers", url: "/cloud-providers", icon: Cloud },
    { title: "Hypervisors", url: "/hypervisors", icon: Network },
    { title: "Headscale", url: "/headscale", icon: Workflow },
  ];

  const globalAdminItems = [
    { title: "Organizations", url: "/organizations", icon: Building2 },
    { title: "Policies", url: "/policies", icon: Shield },
  ];

  const initials = profile?.full_name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  return (
    <Sidebar className={`${collapsed ? "w-16" : "w-64"} border-r border-sidebar-border bg-sidebar`}>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg gradient-primary flex items-center justify-center shadow-glow-sm flex-shrink-0">
            <span className="text-primary-foreground font-bold text-lg">N</span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h2 className="font-semibold text-sm text-foreground">Neogenesys</h2>
              <p className="text-xs text-muted-foreground truncate">Zero Trust Portal</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        {/* User Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground px-3 mb-2">
            {collapsed ? '' : 'Portal'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {clientItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive(item.url)}
                    className="nav-item"
                  >
                    <NavLink to={item.url} className="flex items-center gap-3">
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      {!collapsed && <span className="truncate">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Section - shown to support and admins */}
        {(isAdmin || isSupport) && (
          <SidebarGroup className="mt-4">
            <Collapsible open={adminOpen} onOpenChange={setAdminOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
                {!collapsed && (
                  <>
                    <span>Administration</span>
                    <ChevronDown className={`h-3 w-3 transition-transform ${adminOpen ? 'rotate-180' : ''}`} />
                  </>
                )}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {adminItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton 
                          asChild 
                          isActive={isActive(item.url)}
                          className="nav-item"
                        >
                          <NavLink to={item.url} className="flex items-center gap-3">
                            <item.icon className="h-4 w-4 flex-shrink-0" />
                            {!collapsed && <span className="truncate">{item.title}</span>}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                    {isGlobalAdmin && globalAdminItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton 
                          asChild 
                          isActive={isActive(item.url)}
                          className="nav-item"
                        >
                          <NavLink to={item.url} className="flex items-center gap-3">
                            <item.icon className="h-4 w-4 flex-shrink-0" />
                            {!collapsed && <span className="truncate">{item.title}</span>}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        {!collapsed ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 px-2">
              <Avatar className="h-8 w-8 border border-border">
                <AvatarFallback className="bg-secondary text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{profile?.full_name}</p>
                <p className="text-xs text-muted-foreground truncate capitalize">
                  {profile?.role?.replace('_', ' ')}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 justify-start text-muted-foreground hover:text-foreground"
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={signOut}
                className="text-muted-foreground hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            className="w-full text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}