import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Monitor, 
  Terminal, 
  Globe, 
  Play, 
  ExternalLink,
  Star,
  Clock,
  Filter,
  Loader2,
  Tv,
  MonitorPlay,
  Plus,
  Pencil,
  Trash2,
  MoreVertical
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSessionLauncher } from '@/hooks/useSessionLauncher';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { EditAppDialog } from '@/components/apps/EditAppDialog';

interface Application {
  id: string;
  name: string;
  resource_type: string;
  connection_method: string;
  ip_address: string | null;
  metadata?: Record<string, unknown>;
  status?: 'online' | 'offline' | 'maintenance';
  favorite?: boolean;
  lastAccessed?: string;
}

export default function MyApplications() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { launching, launchGuacamole, launchTSPlus, launchRDP, launchSSH, launchDirect } = useSessionLauncher();
  
  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [appToDelete, setAppToDelete] = useState<Application | null>(null);

  useEffect(() => {
    loadApplications();
  }, [profile]);

  const loadApplications = async () => {
    if (!profile) return;

    try {
      // Get user's accessible resources
      const { data: accessData } = await supabase
        .from('user_resource_access')
        .select(`
          resource_id,
          resources (
            id,
            name,
            resource_type,
            connection_method,
            ip_address,
            metadata
          )
        `)
        .eq('user_id', profile.id)
        .eq('status', 'active');

      if (accessData) {
        const apps = accessData
          .filter((a: any) => a.resources)
          .map((a: any) => ({
            ...a.resources,
            metadata: a.resources.metadata || {},
            status: 'online' as const, // Default to online for real apps
            favorite: false,
            lastAccessed: new Date().toISOString(),
          }));
        setApplications(apps);
      }
    } catch (error) {
      console.error('Error loading applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'rdp':
      case 'windows_vm':
        return Monitor;
      case 'ssh':
      case 'linux_vm':
        return Terminal;
      case 'guacamole_session':
        return MonitorPlay;
      case 'tsplus_html5':
        return Tv;
      case 'web_app':
      case 'direct':
        return Globe;
      default:
        return Globe;
    }
  };

  const getResourceLabel = (type: string) => {
    const labels: Record<string, string> = {
      windows_vm: 'Windows VM',
      linux_vm: 'Linux VM',
      rdp: 'Remote Desktop',
      ssh: 'SSH Terminal',
      guacamole_session: 'Guacamole',
      tsplus_html5: 'HTML5 Desktop',
      tailscale_node: 'Tailscale Node',
      web_app: 'Web Application',
      direct: 'Direct URL',
      custom: 'Custom App',
    };
    return labels[type] || type;
  };

  const handleLaunch = (app: Application) => {
    // Determine the best connection type based on resource configuration
    const connectionMethod = app.connection_method?.toLowerCase();
    const resourceType = app.resource_type?.toLowerCase();

    // Handle direct/web_app types
    if (resourceType === 'web_app' || resourceType === 'direct' || connectionMethod === 'direct') {
      launchDirect(app.id);
    } else if (resourceType === 'tsplus_html5' || connectionMethod === 'tsplus') {
      launchTSPlus(app.id, true); // Open in new tab
    } else if (resourceType === 'guacamole_session') {
      launchGuacamole(app.id);
    } else if (resourceType === 'rdp' || resourceType === 'windows_vm' || connectionMethod === 'rdp') {
      launchRDP(app.id);
    } else if (resourceType === 'ssh' || resourceType === 'linux_vm' || connectionMethod === 'ssh') {
      launchSSH(app.id);
    } else {
      // Default to direct for unknown types
      launchDirect(app.id);
    }
  };

  const handleLaunchSpecific = (app: Application, type: 'guacamole' | 'tsplus') => {
    if (type === 'tsplus') {
      launchTSPlus(app.id, true);
    } else {
      launchGuacamole(app.id);
    }
  };

  const handleEdit = (app: Application) => {
    setSelectedApp(app);
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async (data: {
    id: string;
    name: string;
    url: string;
    connectionMethod: string;
    resourceType: string;
  }) => {
    try {
      const { error } = await supabase
        .from('resources')
        .update({
          name: data.name,
          resource_type: data.resourceType as any,
          connection_method: data.connectionMethod,
          ip_address: data.url,
          metadata: {
            ...(selectedApp?.metadata || {}),
            external_url: data.url,
          },
        })
        .eq('id', data.id);

      if (error) throw error;

      toast({
        title: 'Application Updated',
        description: `${data.name} has been updated`,
      });

      setEditDialogOpen(false);
      loadApplications();
    } catch (error) {
      console.error('Error updating application:', error);
      toast({
        title: 'Error',
        description: 'Failed to update application',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteConfirm = (app: Application) => {
    setAppToDelete(app);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!appToDelete || !profile) return;

    try {
      // Remove from user_resource_access
      const { error } = await supabase
        .from('user_resource_access')
        .delete()
        .eq('user_id', profile.id)
        .eq('resource_id', appToDelete.id);

      if (error) throw error;

      toast({
        title: 'Application Removed',
        description: `${appToDelete.name} has been removed from your applications`,
      });

      setDeleteDialogOpen(false);
      setAppToDelete(null);
      loadApplications();
    } catch (error) {
      console.error('Error removing application:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove application',
        variant: 'destructive',
      });
    }
  };

  const filteredApps = applications.filter(app =>
    app.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const favoriteApps = filteredApps.filter(app => app.favorite);
  const recentApps = [...filteredApps].sort((a, b) => 
    new Date(b.lastAccessed || 0).getTime() - new Date(a.lastAccessed || 0).getTime()
  ).slice(0, 6);

  const renderAppCard = (app: Application, showFavorite = true) => {
    const Icon = getResourceIcon(app.resource_type);
    const isLaunching = launching === app.id;
    const supportsMultipleConnections = ['windows_vm', 'linux_vm', 'rdp'].includes(app.resource_type);

    return (
      <Card 
        key={app.id} 
        className="app-tile group relative overflow-hidden"
      >
        {/* Actions menu */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEdit(app)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => handleDeleteConfirm(app)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {showFavorite && app.favorite && (
          <Star className="absolute top-3 left-3 h-4 w-4 text-warning fill-warning" />
        )}
        <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
          <Icon className="h-7 w-7 text-primary" />
        </div>
        <h3 className="font-medium text-center mb-1">{app.name}</h3>
        <p className="text-xs text-muted-foreground text-center mb-4">
          {getResourceLabel(app.resource_type)}
        </p>
        <div className="flex items-center justify-center gap-2 mb-4">
          <Badge 
            variant="outline" 
            className={
              app.status === 'online' ? 'badge-success' :
              app.status === 'maintenance' ? 'badge-warning' : 'badge-error'
            }
          >
            <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${
              app.status === 'online' ? 'bg-success' :
              app.status === 'maintenance' ? 'bg-warning' : 'bg-destructive'
            }`} />
            {app.status}
          </Badge>
        </div>
        <div className="flex gap-2 w-full">
          <Button 
            size="sm" 
            className="flex-1 gap-1.5"
            disabled={app.status !== 'online' || isLaunching}
            onClick={() => handleLaunch(app)}
          >
            {isLaunching ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Play className="h-3 w-3" />
            )}
            {isLaunching ? 'Launching...' : 'Launch'}
          </Button>
          
          {supportsMultipleConnections ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="px-2">
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleLaunchSpecific(app, 'guacamole')}>
                  <MonitorPlay className="h-4 w-4 mr-2" />
                  Open with Guacamole
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleLaunchSpecific(app, 'tsplus')}>
                  <Tv className="h-4 w-4 mr-2" />
                  Open with TSPlus HTML5
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              className="px-2"
              onClick={() => handleLaunch(app)}
              disabled={app.status !== 'online'}
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">My Applications</h1>
          <p className="text-muted-foreground mt-1">
            Access your published applications and resources
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search applications..." 
              className="pl-9 w-64 bg-secondary/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
          <Button onClick={() => navigate('/app-marketplace')}>
            <Plus className="h-4 w-4 mr-2" />
            Add App
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="all">All Apps</TabsTrigger>
          <TabsTrigger value="favorites">
            <Star className="h-3 w-3 mr-1.5" />
            Favorites
          </TabsTrigger>
          <TabsTrigger value="recent">
            <Clock className="h-3 w-3 mr-1.5" />
            Recent
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          {/* App Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredApps.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredApps.map((app) => renderAppCard(app))}
            </div>
          ) : (
            <Card className="portal-card">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                  <Globe className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">No applications yet</h3>
                <p className="text-muted-foreground text-center max-w-sm mb-4">
                  Add applications from the marketplace to get started
                </p>
                <Button onClick={() => navigate('/app-marketplace')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Browse Marketplace
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="favorites">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {favoriteApps.map((app) => renderAppCard(app, false))}
          </div>
          {favoriteApps.length === 0 && (
            <Card className="portal-card">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Star className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No favorites yet</h3>
                <p className="text-muted-foreground text-center">
                  Mark applications as favorites to see them here
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="recent">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentApps.map((app) => {
              const Icon = getResourceIcon(app.resource_type);
              const isLaunching = launching === app.id;
              return (
                <Card key={app.id} className="portal-card card-hover">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{app.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {app.lastAccessed && `Last used ${new Date(app.lastAccessed).toLocaleDateString()}`}
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => handleLaunch(app)}
                      disabled={app.status !== 'online' || isLaunching}
                    >
                      {isLaunching ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {recentApps.length === 0 && (
            <Card className="portal-card">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No recent activity</h3>
                <p className="text-muted-foreground text-center">
                  Applications you use will appear here
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <EditAppDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        application={selectedApp}
        onSubmit={handleEditSubmit}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Application</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{appToDelete?.name}" from your applications? 
              You can add it again later from the marketplace.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
