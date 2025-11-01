import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Server, Activity, Shield } from 'lucide-react';

export default function Dashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalResources: 0,
    activeAccess: 0,
    pendingRequests: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [profile]);

  const loadStats = async () => {
    if (!profile) return;

    try {
      const isAdmin = profile.role === 'org_admin' || profile.role === 'global_admin';
      
      if (isAdmin) {
        // First get user IDs from the organization
        const { data: orgUsers } = await supabase
          .from('profiles')
          .select('id')
          .eq('organization_id', profile.organization_id);
        
        const userIds = orgUsers?.map(u => u.id) || [];

        const [usersRes, resourcesRes, accessRes] = await Promise.all([
          supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', profile.organization_id),
          supabase
            .from('resources')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', profile.organization_id),
          supabase
            .from('user_resource_access')
            .select('id, status', { count: 'exact' })
            .in('user_id', userIds),
        ]);

        const activeCount = accessRes.data?.filter(a => a.status === 'active').length || 0;
        const pendingCount = accessRes.data?.filter(a => a.status === 'pending').length || 0;

        setStats({
          totalUsers: usersRes.count || 0,
          totalResources: resourcesRes.count || 0,
          activeAccess: activeCount,
          pendingRequests: pendingCount,
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = profile?.role === 'org_admin' || profile?.role === 'global_admin';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">
          Welcome back, {profile?.full_name}
        </h1>
        <p className="text-muted-foreground">
          {profile?.organizations?.name || 'System Administrator'}
        </p>
      </div>

      {isAdmin && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="glass glow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>

          <Card className="glass glow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Resources</CardTitle>
              <Server className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalResources}</div>
            </CardContent>
          </Card>

          <Card className="glass glow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Access</CardTitle>
              <Activity className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeAccess}</div>
            </CardContent>
          </Card>

          <Card className="glass glow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
              <Shield className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingRequests}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="glass">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Use the sidebar to navigate through the application
          </p>
        </CardContent>
      </Card>
    </div>
  );
}