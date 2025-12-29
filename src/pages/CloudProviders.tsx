import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Cloud, Plus, Trash2, Server, HardDrive } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { setupGCPIntegration, listGCPInstances } from '@/lib/api/gcp';
import { setupLXDIntegration, listLXDInstances } from '@/lib/api/lxd';

interface CloudProvider {
  id: string;
  provider_name: string;
  provider_type: string;
  enabled: boolean;
  config: any;
  created_at: string;
}

export default function CloudProviders() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [providers, setProviders] = useState<CloudProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    provider_type: '',
    api_endpoint: '',
    access_key: '',
    secret_key: '',
  });

  useEffect(() => {
    loadProviders();
  }, [profile]);

  const loadProviders = async () => {
    if (!profile?.organization_id) return;

    try {
      const { data, error } = await supabase
        .from('cloud_providers')
        .select('id, name, provider_type, api_endpoint, created_at')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProviders(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('cloud_providers')
        .insert({
          organization_id: profile.organization_id,
          name: formData.name,
          provider_type: formData.provider_type,
          api_endpoint: formData.api_endpoint || null,
          credentials: {
            access_key: formData.access_key,
            secret_key: formData.secret_key,
          },
        });

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: 'Proveedor cloud agregado',
      });

      setOpen(false);
      setFormData({ name: '', provider_type: '', api_endpoint: '', access_key: '', secret_key: '' });
      loadProviders();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este proveedor?')) return;

    try {
      const { error } = await supabase
        .from('cloud_providers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: 'Proveedor eliminado',
      });

      loadProviders();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getProviderIcon = (type: string) => {
    return <Cloud className="h-6 w-6 text-primary" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Proveedores Cloud</h1>
          <p className="text-muted-foreground">Gestiona las conexiones a nubes públicas</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="glow-neon">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Proveedor
            </Button>
          </DialogTrigger>
          <DialogContent className="glass">
            <DialogHeader>
              <DialogTitle>Nuevo Proveedor Cloud</DialogTitle>
              <DialogDescription>
                Configura la conexión a un proveedor de nube pública
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Mi AWS Prod"
                />
              </div>
              <div>
                <Label htmlFor="provider_type">Tipo de Proveedor</Label>
                <Select
                  value={formData.provider_type}
                  onValueChange={(value) => setFormData({ ...formData, provider_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aws">Amazon AWS</SelectItem>
                    <SelectItem value="azure">Microsoft Azure</SelectItem>
                    <SelectItem value="gcp">Google Cloud</SelectItem>
                    <SelectItem value="digitalocean">DigitalOcean</SelectItem>
                    <SelectItem value="linode">Linode</SelectItem>
                    <SelectItem value="vultr">Vultr</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="api_endpoint">API Endpoint (Opcional)</Label>
                <Input
                  id="api_endpoint"
                  value={formData.api_endpoint}
                  onChange={(e) => setFormData({ ...formData, api_endpoint: e.target.value })}
                  placeholder="https://api.example.com"
                />
              </div>
              <div>
                <Label htmlFor="access_key">Access Key / API Key</Label>
                <Input
                  id="access_key"
                  type="password"
                  value={formData.access_key}
                  onChange={(e) => setFormData({ ...formData, access_key: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="secret_key">Secret Key</Label>
                <Input
                  id="secret_key"
                  type="password"
                  value={formData.secret_key}
                  onChange={(e) => setFormData({ ...formData, secret_key: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full glow-neon">
                Agregar Proveedor
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando proveedores...</p>
        </div>
      ) : providers.length === 0 ? (
        <Card className="glass">
          <CardContent className="py-12 text-center">
            <Cloud className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No hay proveedores cloud configurados</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {providers.map((provider) => (
            <Card key={provider.id} className="glass glow-card">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center">
                      {getProviderIcon(provider.provider_type)}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{provider.name}</CardTitle>
                      <CardDescription className="capitalize">{provider.provider_type}</CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(provider.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Badge variant="secondary">Configurado</Badge>
                {provider.api_endpoint && (
                  <p className="text-xs text-muted-foreground mt-2">{provider.api_endpoint}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
