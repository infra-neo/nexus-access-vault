import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, 
  Plus, 
  Globe, 
  Shield, 
  Terminal, 
  Monitor,
  Database,
  Cloud,
  Lock,
  Key,
  Server,
  Layers,
  Box,
  Settings,
  ExternalLink
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AddAppDialog, AppTemplate } from '@/components/apps/AddAppDialog';

// Predefined app templates for the marketplace
const APP_TEMPLATES: AppTemplate[] = [
  {
    id: 'zitadel',
    name: 'Zitadel',
    description: 'Identity & Access Management',
    icon: 'Key',
    category: 'identity',
    defaultUrl: 'https://gate.kappa4.com/ui/console/',
    connectionMethods: ['direct', 'pomerium'],
  },
  {
    id: 'pomerium',
    name: 'Pomerium Gateway',
    description: 'Zero Trust Access Proxy',
    icon: 'Shield',
    category: 'security',
    defaultUrl: 'https://gate.kappa4.com/',
    connectionMethods: ['direct'],
  },
  {
    id: 'tailscale-node',
    name: 'Tailscale Node',
    description: 'Private Network Access',
    icon: 'Globe',
    category: 'network',
    defaultUrl: 'https://win-i2ert0csril.hen-hadar.ts.net',
    connectionMethods: ['direct', 'pomerium'],
  },
  {
    id: 'portainer',
    name: 'Portainer',
    description: 'Container Management',
    icon: 'Box',
    category: 'containers',
    defaultUrl: '',
    connectionMethods: ['direct', 'pomerium'],
  },
  {
    id: 'proxmox',
    name: 'Proxmox VE',
    description: 'Virtualization Platform',
    icon: 'Server',
    category: 'virtualization',
    defaultUrl: '',
    connectionMethods: ['direct', 'pomerium'],
  },
  {
    id: 'grafana',
    name: 'Grafana',
    description: 'Observability Platform',
    icon: 'Layers',
    category: 'monitoring',
    defaultUrl: '',
    connectionMethods: ['direct', 'pomerium'],
  },
  {
    id: 'pgadmin',
    name: 'pgAdmin',
    description: 'PostgreSQL Admin',
    icon: 'Database',
    category: 'database',
    defaultUrl: '',
    connectionMethods: ['direct', 'pomerium'],
  },
  {
    id: 'windows-rdp',
    name: 'Windows Desktop',
    description: 'Remote Desktop (RDP)',
    icon: 'Monitor',
    category: 'remote',
    defaultUrl: '',
    connectionMethods: ['guacamole', 'tsplus'],
    resourceType: 'windows_vm',
  },
  {
    id: 'linux-ssh',
    name: 'Linux Server',
    description: 'SSH Terminal Access',
    icon: 'Terminal',
    category: 'remote',
    defaultUrl: '',
    connectionMethods: ['guacamole', 'ssh'],
    resourceType: 'linux_vm',
  },
  {
    id: 'custom',
    name: 'Custom Application',
    description: 'Add any web application',
    icon: 'Globe',
    category: 'custom',
    defaultUrl: '',
    connectionMethods: ['direct', 'pomerium', 'guacamole', 'tsplus'],
  },
];

const CATEGORIES = [
  { id: 'all', label: 'All Apps' },
  { id: 'identity', label: 'Identity' },
  { id: 'security', label: 'Security' },
  { id: 'network', label: 'Network' },
  { id: 'remote', label: 'Remote Access' },
  { id: 'containers', label: 'Containers' },
  { id: 'monitoring', label: 'Monitoring' },
  { id: 'database', label: 'Database' },
  { id: 'custom', label: 'Custom' },
];

const iconMap: Record<string, React.FC<{ className?: string }>> = {
  Key,
  Shield,
  Globe,
  Box,
  Server,
  Layers,
  Database,
  Monitor,
  Terminal,
  Cloud,
  Lock,
  Settings,
};

export default function AppMarketplace() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<AppTemplate | null>(null);

  const filteredTemplates = APP_TEMPLATES.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSelectTemplate = (template: AppTemplate) => {
    setSelectedTemplate(template);
    setDialogOpen(true);
  };

  const handleAppCreated = async (data: {
    name: string;
    url: string;
    connectionMethod: string;
    resourceType: string;
  }) => {
    if (!profile?.organization_id) {
      toast({
        title: 'Error',
        description: 'You must belong to an organization to add applications',
        variant: 'destructive',
      });
      return;
    }

    try {
      const metadata = {
        external_url: data.url,
        template_id: selectedTemplate?.id,
        icon: selectedTemplate?.icon || 'Globe',
      };

      const { error } = await supabase.from('resources').insert({
        name: data.name,
        resource_type: data.resourceType as any,
        connection_method: data.connectionMethod,
        organization_id: profile.organization_id,
        metadata,
        ip_address: data.url,
      });

      if (error) throw error;

      toast({
        title: 'Application Added',
        description: `${data.name} has been added to your resources`,
      });

      setDialogOpen(false);
      navigate('/my-applications');
    } catch (error) {
      console.error('Error adding application:', error);
      toast({
        title: 'Error',
        description: 'Failed to add application',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">App Marketplace</h1>
          <p className="text-muted-foreground mt-1">
            Add applications to your workspace with Zero Trust access
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search apps..." 
              className="pl-9 w-64 bg-secondary/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button onClick={() => handleSelectTemplate(APP_TEMPLATES.find(t => t.id === 'custom')!)}>
            <Plus className="h-4 w-4 mr-2" />
            Custom App
          </Button>
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="bg-secondary/50 flex-wrap h-auto gap-1 p-1">
          {CATEGORIES.map(cat => (
            <TabsTrigger 
              key={cat.id} 
              value={cat.id}
              className="text-xs px-3 py-1.5"
            >
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* App Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredTemplates.map(template => {
          const Icon = iconMap[template.icon] || Globe;
          return (
            <Card 
              key={template.id}
              className="app-tile group cursor-pointer"
              onClick={() => handleSelectTemplate(template)}
            >
              <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Icon className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-medium text-center mb-1">{template.name}</h3>
              <p className="text-xs text-muted-foreground text-center mb-4">
                {template.description}
              </p>
              <div className="flex flex-wrap gap-1 justify-center">
                {template.connectionMethods.map(method => (
                  <Badge 
                    key={method} 
                    variant="outline" 
                    className="text-[10px] px-2 py-0.5"
                  >
                    {method === 'direct' ? 'Direct' :
                     method === 'pomerium' ? 'Pomerium' :
                     method === 'guacamole' ? 'Guacamole' :
                     method === 'tsplus' ? 'TSPlus' :
                     method === 'ssh' ? 'SSH' : method}
                  </Badge>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      {filteredTemplates.length === 0 && (
        <Card className="portal-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No apps found</h3>
            <p className="text-muted-foreground text-center max-w-sm">
              Try adjusting your search or add a custom application
            </p>
          </CardContent>
        </Card>
      )}

      {/* Add App Dialog */}
      <AddAppDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        template={selectedTemplate}
        onSubmit={handleAppCreated}
      />
    </div>
  );
}