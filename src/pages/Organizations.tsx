import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Organization {
  id: string;
  name: string;
  logo_url: string | null;
  created_at: string;
}

export default function Organizations() {
  const { toast } = useToast();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrgs(data || []);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Organizations</h1>
          <p className="text-muted-foreground">Manage all organizations</p>
        </div>
        <Button className="glow-neon">
          <Plus className="h-4 w-4 mr-2" />
          Add Organization
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading organizations...</p>
        </div>
      ) : orgs.length === 0 ? (
        <Card className="glass">
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No organizations found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {orgs.map((org) => (
            <Card key={org.id} className="glass glow-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{org.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {new Date(org.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">Active</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}