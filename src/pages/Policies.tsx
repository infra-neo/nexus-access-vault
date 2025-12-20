import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Shield, 
  Search,
  Settings,
  ToggleLeft,
  ToggleRight,
  Users,
  Server,
  Laptop2,
  Globe,
  Lock,
  AlertTriangle,
  Trash2
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { CreatePolicyDialog } from '@/components/policies/CreatePolicyDialog';

interface Policy {
  id: string;
  name: string;
  description: string | null;
  policy_type: string;
  status: string;
  conditions: string[];
  applies_to: number;
  created_at: string;
}

export default function Policies() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadPolicies();
  }, [profile]);

  const loadPolicies = async () => {
    if (!profile?.organization_id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('policies')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const mapped = (data || []).map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        policy_type: p.policy_type,
        status: p.status,
        applies_to: p.applies_to ?? 0,
        created_at: p.created_at,
        conditions: Array.isArray(p.conditions) 
          ? (p.conditions as unknown[]).map(c => String(c))
          : [],
      }));
      
      setPolicies(mapped);
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

  const handleStatusToggle = async (policy: Policy) => {
    if (policy.status === 'draft') return;

    const newStatus = policy.status === 'active' ? 'inactive' : 'active';

    try {
      const { error } = await supabase
        .from('policies')
        .update({ status: newStatus })
        .eq('id', policy.id);

      if (error) throw error;

      toast({
        title: 'Estado actualizado',
        description: `La política ahora está ${newStatus === 'active' ? 'activa' : 'inactiva'}`,
      });

      loadPolicies();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (policy: Policy) => {
    if (!confirm(`¿Eliminar la política "${policy.name}"?`)) return;

    try {
      const { error } = await supabase
        .from('policies')
        .delete()
        .eq('id', policy.id);

      if (error) throw error;

      toast({
        title: 'Política eliminada',
        description: `${policy.name} ha sido eliminada`,
      });

      loadPolicies();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'access': return Server;
      case 'device': return Laptop2;
      case 'network': return Globe;
      case 'authentication': return Lock;
      default: return Shield;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'access': return 'text-primary';
      case 'device': return 'text-success';
      case 'network': return 'text-info';
      case 'authentication': return 'text-warning';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="outline" className="badge-success">Activo</Badge>;
      case 'inactive':
        return <Badge variant="outline" className="badge-warning">Inactivo</Badge>;
      case 'draft':
        return <Badge variant="outline">Borrador</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredPolicies = policies.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  const stats = {
    total: policies.length,
    active: policies.filter(p => p.status === 'active').length,
    inactive: policies.filter(p => p.status === 'inactive').length,
    draft: policies.filter(p => p.status === 'draft').length,
  };

  const isAdmin = profile?.role === 'org_admin' || profile?.role === 'global_admin';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Políticas Zero Trust</h1>
          <p className="text-muted-foreground mt-1">
            Configura reglas de acceso y seguridad
          </p>
        </div>
        {isAdmin && <CreatePolicyDialog onCreated={loadPolicies} />}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="stat-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
            <Shield className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Activas</CardTitle>
            <ToggleRight className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.active}</div>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Inactivas</CardTitle>
            <ToggleLeft className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inactive}</div>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Borradores</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.draft}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar políticas..." 
            className="pl-9 bg-secondary/50"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Policy List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando políticas...</p>
        </div>
      ) : filteredPolicies.length === 0 ? (
        <Card className="glass">
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {policies.length === 0 
                ? 'No hay políticas creadas' 
                : 'No se encontraron políticas con ese criterio'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredPolicies.map((policy) => {
            const Icon = getTypeIcon(policy.policy_type);
            return (
              <Card key={policy.id} className="portal-card card-hover">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={`h-12 w-12 rounded-lg bg-secondary flex items-center justify-center ${getTypeColor(policy.policy_type)}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{policy.name}</h3>
                        {getStatusBadge(policy.status)}
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {policy.description || 'Sin descripción'}
                      </p>
                      
                      <div className="flex flex-wrap gap-2">
                        {policy.conditions.map((condition, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {condition}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {policy.status !== 'draft' && (
                        <div className="text-right">
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Users className="h-3.5 w-3.5" />
                            <span>{policy.applies_to} afectados</span>
                          </div>
                        </div>
                      )}
                      <Switch 
                        checked={policy.status === 'active'} 
                        disabled={policy.status === 'draft'}
                        onCheckedChange={() => handleStatusToggle(policy)}
                      />
                      {isAdmin && (
                        <>
                          <Button variant="ghost" size="icon">
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDelete(policy)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}