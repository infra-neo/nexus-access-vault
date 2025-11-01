import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HardDrive, Plus, Trash2 } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Hypervisor {
  id: string;
  name: string;
  hypervisor_type: string;
  api_endpoint: string;
  location: string | null;
  created_at: string;
}

export default function Hypervisors() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [hypervisors, setHypervisors] = useState<Hypervisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    hypervisor_type: '',
    api_endpoint: '',
    location: '',
    username: '',
    password: '',
  });

  useEffect(() => {
    loadHypervisors();
  }, [profile]);

  const loadHypervisors = async () => {
    if (!profile?.organization_id) return;

    try {
      const { data, error } = await supabase
        .from('hypervisors')
        .select('id, name, hypervisor_type, api_endpoint, location, created_at')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHypervisors(data || []);
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
        .from('hypervisors')
        .insert({
          organization_id: profile.organization_id,
          name: formData.name,
          hypervisor_type: formData.hypervisor_type,
          api_endpoint: formData.api_endpoint,
          location: formData.location || null,
          credentials: {
            username: formData.username,
            password: formData.password,
          },
        });

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: 'Hipervisor agregado',
      });

      setOpen(false);
      setFormData({ name: '', hypervisor_type: '', api_endpoint: '', location: '', username: '', password: '' });
      loadHypervisors();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este hipervisor?')) return;

    try {
      const { error } = await supabase
        .from('hypervisors')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: 'Hipervisor eliminado',
      });

      loadHypervisors();
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
          <h1 className="text-3xl font-bold">Hipervisores</h1>
          <p className="text-muted-foreground">Gestiona hipervisores y nubes privadas on-premise</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="glow-neon">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Hipervisor
            </Button>
          </DialogTrigger>
          <DialogContent className="glass">
            <DialogHeader>
              <DialogTitle>Nuevo Hipervisor</DialogTitle>
              <DialogDescription>
                Configura la conexión a un hipervisor on-premise
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
                  placeholder="Proxmox Datacenter 1"
                />
              </div>
              <div>
                <Label htmlFor="hypervisor_type">Tipo de Hipervisor</Label>
                <Select
                  value={formData.hypervisor_type}
                  onValueChange={(value) => setFormData({ ...formData, hypervisor_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vmware">VMware ESXi / vSphere</SelectItem>
                    <SelectItem value="proxmox">Proxmox VE</SelectItem>
                    <SelectItem value="hyperv">Microsoft Hyper-V</SelectItem>
                    <SelectItem value="kvm">KVM / QEMU</SelectItem>
                    <SelectItem value="xen">Citrix XenServer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="api_endpoint">API Endpoint</Label>
                <Input
                  id="api_endpoint"
                  value={formData.api_endpoint}
                  onChange={(e) => setFormData({ ...formData, api_endpoint: e.target.value })}
                  required
                  placeholder="https://proxmox.local:8006"
                />
              </div>
              <div>
                <Label htmlFor="location">Ubicación (Opcional)</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Datacenter Principal, Rack A"
                />
              </div>
              <div>
                <Label htmlFor="username">Usuario</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full glow-neon">
                Agregar Hipervisor
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando hipervisores...</p>
        </div>
      ) : hypervisors.length === 0 ? (
        <Card className="glass">
          <CardContent className="py-12 text-center">
            <HardDrive className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No hay hipervisores configurados</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {hypervisors.map((hypervisor) => (
            <Card key={hypervisor.id} className="glass glow-card">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center">
                      <HardDrive className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{hypervisor.name}</CardTitle>
                      <CardDescription className="capitalize">{hypervisor.hypervisor_type}</CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(hypervisor.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <Badge variant="secondary">Conectado</Badge>
                {hypervisor.location && (
                  <p className="text-xs text-muted-foreground">{hypervisor.location}</p>
                )}
                <p className="text-xs text-muted-foreground">{hypervisor.api_endpoint}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
