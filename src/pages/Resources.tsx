import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Server, Plus, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Resource {
  id: string;
  name: string;
  resource_type: string;
  ip_address: string;
  connection_method: string;
  metadata: any;
}

export default function Resources() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResources();
  }, [profile]);

  const loadResources = async () => {
    if (!profile?.organization_id) return;

    try {
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResources(data || []);
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

  const handleRequestAccess = async (resourceId: string) => {
    try {
      const { error } = await supabase
        .from('user_resource_access')
        .insert({
          user_id: profile.id,
          resource_id: resourceId,
          status: 'pending',
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Access request submitted',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getResourceIcon = (type: string) => {
    return <Server className="h-5 w-5 text-primary" />;
  };

  const isAdmin = profile?.role === 'org_admin' || profile?.role === 'global_admin';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Resources</h1>
          <p className="text-muted-foreground">
            {isAdmin ? 'Manage your organization resources' : 'Available resources for you'}
          </p>
        </div>
        {isAdmin && (
          <Button className="glow-neon">
            <Plus className="h-4 w-4 mr-2" />
            Add Resource
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading resources...</p>
        </div>
      ) : resources.length === 0 ? (
        <Card className="glass">
          <CardContent className="py-12 text-center">
            <Server className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No resources available</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {resources.map((resource) => (
            <Card key={resource.id} className="glass glow-card hover:border-primary transition-all">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {getResourceIcon(resource.resource_type)}
                    <div>
                      <CardTitle className="text-lg">{resource.name}</CardTitle>
                      <CardDescription>{resource.ip_address}</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="secondary">{resource.resource_type}</Badge>
                  <Badge variant="outline">{resource.connection_method}</Badge>
                </div>
                
                {!isAdmin && (
                  <Button 
                    className="w-full glow-neon" 
                    onClick={() => handleRequestAccess(resource.id)}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Request Access
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}