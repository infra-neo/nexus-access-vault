import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Server, 
  Activity, 
  Shield, 
  AppWindow, 
  Laptop2, 
  Clock, 
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Zap
} from 'lucide-react';
import { Link } from 'react-router-dom';

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
      
      if (isAdmin && profile.organization_id) {
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
          userIds.length > 0 
            ? supabase
                .from('user_resource_access')
                .select('id, status', { count: 'exact' })
                .in('user_id', userIds)
            : Promise.resolve({ data: [] }),
        ]);

        const activeCount = accessRes.data?.filter((a: any) => a.status === 'active').length || 0;
        const pendingCount = accessRes.data?.filter((a: any) => a.status === 'pending').length || 0;

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

  // Quick action cards for users
  const quickActions = [
    { 
      title: 'My Applications', 
      description: 'Launch your apps', 
      icon: AppWindow, 
      href: '/my-applications',
      color: 'text-primary'
    },
    { 
      title: 'My Devices', 
      description: 'Manage trusted devices', 
      icon: Laptop2, 
      href: '/my-devices',
      color: 'text-success'
    },
    { 
      title: 'Active Sessions', 
      description: 'View current sessions', 
      icon: Activity, 
      href: '/sessions',
      color: 'text-warning'
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Welcome back, {profile?.full_name?.split(' ')[0]}
          </h1>
          <p className="text-muted-foreground mt-1">
            {profile?.organizations?.name || 'Your secure access portal'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="badge-status badge-success">
            <CheckCircle2 className="h-3 w-3" />
            Zero Trust Verified
          </Badge>
          <Badge variant="outline" className="badge-status badge-info">
            <Clock className="h-3 w-3" />
            Session: 2h 34m
          </Badge>
        </div>
      </div>

      {/* Security Status Banner */}
      <Card className="border-success/20 bg-success/5">
        <CardContent className="flex items-center gap-4 py-4">
          <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
            <Shield className="h-5 w-5 text-success" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground">Security Status: Protected</p>
            <p className="text-sm text-muted-foreground">
              Device enrolled • MFA active • Secure tunnel connected
            </p>
          </div>
          <Button variant="outline" size="sm" className="hidden sm:flex">
            View Details
          </Button>
        </CardContent>
      </Card>

      {/* Admin Stats */}
      {isAdmin && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="stat-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '...' : stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground mt-1">In your organization</p>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Resources</CardTitle>
              <Server className="h-4 w-4 text-info" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '...' : stats.totalResources}</div>
              <p className="text-xs text-muted-foreground mt-1">Available resources</p>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Access</CardTitle>
              <Activity className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '...' : stats.activeAccess}</div>
              <p className="text-xs text-muted-foreground mt-1">Active permissions</p>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
              <AlertTriangle className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '...' : stats.pendingRequests}</div>
              <p className="text-xs text-muted-foreground mt-1">Awaiting approval</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-medium mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {quickActions.map((action) => (
            <Link key={action.title} to={action.href}>
              <Card className="portal-card card-hover group cursor-pointer h-full">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className={`h-12 w-12 rounded-lg bg-secondary flex items-center justify-center ${action.color}`}>
                    <action.icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                      {action.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">{action.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="portal-card">
          <CardHeader>
            <CardTitle className="text-base">Recent Applications</CardTitle>
            <CardDescription>Your recently accessed applications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { name: 'Windows Server 2022', type: 'RDP', status: 'online' },
                { name: 'Development VM', type: 'SSH', status: 'online' },
                { name: 'Analytics Dashboard', type: 'Web', status: 'offline' },
              ].map((app, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                      <Zap className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{app.name}</p>
                      <p className="text-xs text-muted-foreground">{app.type}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={app.status === 'online' ? 'badge-success' : 'badge-error'}>
                    {app.status}
                  </Badge>
                </div>
              ))}
            </div>
            <Button variant="ghost" className="w-full mt-4" asChild>
              <Link to="/my-applications">View All Applications</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="portal-card">
          <CardHeader>
            <CardTitle className="text-base">Device Status</CardTitle>
            <CardDescription>Your enrolled devices</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { name: 'MacBook Pro', type: 'Current device', status: 'active', current: true },
                { name: 'Windows Desktop', type: 'Last seen 2h ago', status: 'active' },
                { name: 'iPhone 15', type: 'Mobile', status: 'active' },
              ].map((device, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded bg-success/10 flex items-center justify-center">
                      <Laptop2 className="h-4 w-4 text-success" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{device.name}</p>
                        {device.current && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Current</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{device.type}</p>
                    </div>
                  </div>
                  <div className="h-2 w-2 rounded-full bg-success" />
                </div>
              ))}
            </div>
            <Button variant="ghost" className="w-full mt-4" asChild>
              <Link to="/my-devices">Manage Devices</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}