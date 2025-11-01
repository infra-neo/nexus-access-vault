import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Network, Plus, Trash2, RefreshCw } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface HeadscaleInstance {
  id: string;
  name: string;
  api_endpoint: string;
  created_at: string;
}

interface HeadscaleNode {
  id: string;
  node_id: string;
  name: string;
  user_email: string | null;
  ip_address: string | null;
  status: string;
}

export default function Headscale() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [instances, setInstances] = useState<HeadscaleInstance[]>([]);
  const [nodes, setNodes] = useState<HeadscaleNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [openInstance, setOpenInstance] = useState(false);
  const [openNode, setOpenNode] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    api_endpoint: '',
    api_key: '',
  });
  const [nodeFormData, setNodeFormData] = useState({
    name: '',
    user_email: '',
  });

  useEffect(() => {
    loadInstances();
  }, [profile]);

  useEffect(() => {
    if (selectedInstance) {
      loadNodes(selectedInstance);
    }
  }, [selectedInstance]);

  const loadInstances = async () => {
    if (!profile?.organization_id) return;

    try {
      const { data, error } = await supabase
        .from('headscale_instances')
        .select('id, name, api_endpoint, created_at')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInstances(data || []);
      if (data && data.length > 0 && !selectedInstance) {
        setSelectedInstance(data[0].id);
      }
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

  const loadNodes = async (instanceId: string) => {
    try {
      const { data, error } = await supabase
        .from('headscale_nodes')
        .select('*')
        .eq('headscale_instance_id', instanceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNodes(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleInstanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('headscale_instances')
        .insert({
          organization_id: profile.organization_id,
          name: formData.name,
          api_endpoint: formData.api_endpoint,
          api_key: formData.api_key,
        });

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: 'Instancia Headscale agregada',
      });

      setOpenInstance(false);
      setFormData({ name: '', api_endpoint: '', api_key: '' });
      loadInstances();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleNodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // In a real implementation, this would call the Headscale API
      const { error } = await supabase
        .from('headscale_nodes')
        .insert({
          headscale_instance_id: selectedInstance,
          node_id: `node-${Date.now()}`,
          name: nodeFormData.name,
          user_email: nodeFormData.user_email,
          status: 'offline',
        });

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: 'Nodo creado. Use la pre-auth key para registrar el dispositivo.',
      });

      setOpenNode(false);
      setNodeFormData({ name: '', user_email: '' });
      loadNodes(selectedInstance);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Headscale</h1>
          <p className="text-muted-foreground">Gestiona tu red mesh privada con Headscale</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={openInstance} onOpenChange={setOpenInstance}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Instancia
              </Button>
            </DialogTrigger>
            <DialogContent className="glass">
              <DialogHeader>
                <DialogTitle>Nueva Instancia Headscale</DialogTitle>
                <DialogDescription>
                  Conecta un servidor Headscale
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleInstanceSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="Headscale Principal"
                  />
                </div>
                <div>
                  <Label htmlFor="api_endpoint">API Endpoint</Label>
                  <Input
                    id="api_endpoint"
                    value={formData.api_endpoint}
                    onChange={(e) => setFormData({ ...formData, api_endpoint: e.target.value })}
                    required
                    placeholder="https://headscale.example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="api_key">API Key</Label>
                  <Input
                    id="api_key"
                    type="password"
                    value={formData.api_key}
                    onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full glow-neon">
                  Agregar Instancia
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      ) : instances.length === 0 ? (
        <Card className="glass">
          <CardContent className="py-12 text-center">
            <Network className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No hay instancias Headscale configuradas</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={selectedInstance} onValueChange={setSelectedInstance}>
          <TabsList className="mb-4">
            {instances.map((instance) => (
              <TabsTrigger key={instance.id} value={instance.id}>
                {instance.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {instances.map((instance) => (
            <TabsContent key={instance.id} value={instance.id}>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold">{instance.name}</h3>
                    <p className="text-sm text-muted-foreground">{instance.api_endpoint}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => loadNodes(instance.id)}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Actualizar
                    </Button>
                    <Dialog open={openNode} onOpenChange={setOpenNode}>
                      <DialogTrigger asChild>
                        <Button className="glow-neon" size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Crear Nodo
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="glass">
                        <DialogHeader>
                          <DialogTitle>Crear Nodo</DialogTitle>
                          <DialogDescription>
                            Genera una pre-auth key para registrar un nuevo dispositivo
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleNodeSubmit} className="space-y-4">
                          <div>
                            <Label htmlFor="node_name">Nombre del Nodo</Label>
                            <Input
                              id="node_name"
                              value={nodeFormData.name}
                              onChange={(e) => setNodeFormData({ ...nodeFormData, name: e.target.value })}
                              required
                              placeholder="laptop-juan"
                            />
                          </div>
                          <div>
                            <Label htmlFor="user_email">Usuario (Email)</Label>
                            <Input
                              id="user_email"
                              type="email"
                              value={nodeFormData.user_email}
                              onChange={(e) => setNodeFormData({ ...nodeFormData, user_email: e.target.value })}
                              required
                              placeholder="juan@empresa.com"
                            />
                          </div>
                          <Button type="submit" className="w-full glow-neon">
                            Crear Nodo
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {nodes.map((node) => (
                    <Card key={node.id} className="glass glow-card">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center">
                              <Network className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">{node.name}</CardTitle>
                              <CardDescription>{node.user_email}</CardDescription>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <Badge variant={node.status === 'online' ? 'default' : 'secondary'}>
                          {node.status}
                        </Badge>
                        {node.ip_address && (
                          <p className="text-xs text-muted-foreground">IP: {node.ip_address}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
