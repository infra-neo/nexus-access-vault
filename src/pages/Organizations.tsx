import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Trash2, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CreateOrganizationDialog } from '@/components/organizations/CreateOrganizationDialog';
import { AssignUserDialog } from '@/components/organizations/AssignUserDialog';

interface Organization {
  id: string;
  name: string;
  logo_url: string | null;
  created_at: string;
}

interface OrgWithCount extends Organization {
  user_count: number;
}

export default function Organizations() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [orgs, setOrgs] = useState<OrgWithCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      // Get organizations
      const { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (orgsError) throw orgsError;

      // Get user counts per organization
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('organization_id');

      if (profilesError) throw profilesError;

      // Count users per org
      const counts: Record<string, number> = {};
      profiles?.forEach(p => {
        if (p.organization_id) {
          counts[p.organization_id] = (counts[p.organization_id] || 0) + 1;
        }
      });

      const orgsWithCounts = (orgsData || []).map(org => ({
        ...org,
        user_count: counts[org.id] || 0,
      }));

      setOrgs(orgsWithCounts);
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

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar la organización "${name}"? Esta acción no se puede deshacer.`)) return;

    try {
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Organización eliminada',
        description: `${name} ha sido eliminada`,
      });

      loadOrganizations();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const isGlobalAdmin = profile?.role === 'global_admin';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Organizaciones</h1>
          <p className="text-muted-foreground">Gestiona todas las organizaciones del sistema</p>
        </div>
        {isGlobalAdmin && <CreateOrganizationDialog onCreated={loadOrganizations} />}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando organizaciones...</p>
        </div>
      ) : orgs.length === 0 ? (
        <Card className="glass">
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No hay organizaciones</p>
            {isGlobalAdmin && (
              <p className="text-sm text-muted-foreground mt-2">
                Crea la primera organización para comenzar
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {orgs.map((org) => (
            <Card key={org.id} className="glass glow-card">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center">
                      {org.logo_url ? (
                        <img src={org.logo_url} alt={org.name} className="h-8 w-8 rounded object-cover" />
                      ) : (
                        <Building2 className="h-6 w-6 text-primary" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{org.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {new Date(org.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {isGlobalAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(org.id, org.name)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{org.user_count} usuarios</span>
                  </div>
                  <Badge variant="secondary">Activa</Badge>
                </div>
                {isGlobalAdmin && (
                  <AssignUserDialog
                    organizationId={org.id}
                    organizationName={org.name}
                    onAssigned={loadOrganizations}
                  />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}