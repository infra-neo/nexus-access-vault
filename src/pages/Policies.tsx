import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Shield, 
  Plus, 
  Search,
  Settings,
  ToggleLeft,
  ToggleRight,
  Clock,
  Users,
  Server,
  Laptop2,
  Globe,
  Lock,
  AlertTriangle
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface Policy {
  id: string;
  name: string;
  description: string;
  type: 'access' | 'device' | 'network' | 'authentication';
  status: 'active' | 'inactive' | 'draft';
  conditions: string[];
  appliesTo: number;
}

export default function Policies() {
  const [searchQuery, setSearchQuery] = useState('');

  const policies: Policy[] = [
    {
      id: '1',
      name: 'MFA Required for All Access',
      description: 'Requires multi-factor authentication for all resource access',
      type: 'authentication',
      status: 'active',
      conditions: ['All users', 'All resources', 'Always enforce'],
      appliesTo: 150,
    },
    {
      id: '2',
      name: 'Device Trust Level - High',
      description: 'Only allow access from devices with high trust level',
      type: 'device',
      status: 'active',
      conditions: ['Enrolled devices only', 'Trust level: High', 'MDM compliant'],
      appliesTo: 45,
    },
    {
      id: '3',
      name: 'Production Access - Business Hours',
      description: 'Restrict production server access to business hours',
      type: 'access',
      status: 'active',
      conditions: ['Production resources', 'Mon-Fri 9AM-6PM', 'Admin approval required'],
      appliesTo: 12,
    },
    {
      id: '4',
      name: 'VPN Required for External',
      description: 'Require VPN connection for external network access',
      type: 'network',
      status: 'inactive',
      conditions: ['External IP detected', 'Tunnel must be active'],
      appliesTo: 0,
    },
    {
      id: '5',
      name: 'Sensitive Data Access',
      description: 'Additional verification for sensitive data resources',
      type: 'access',
      status: 'draft',
      conditions: ['Tagged: sensitive', 'Step-up auth required', 'Audit logging enabled'],
      appliesTo: 0,
    },
  ];

  const getTypeIcon = (type: Policy['type']) => {
    switch (type) {
      case 'access':
        return Server;
      case 'device':
        return Laptop2;
      case 'network':
        return Globe;
      case 'authentication':
        return Lock;
    }
  };

  const getTypeColor = (type: Policy['type']) => {
    switch (type) {
      case 'access':
        return 'text-primary';
      case 'device':
        return 'text-success';
      case 'network':
        return 'text-info';
      case 'authentication':
        return 'text-warning';
    }
  };

  const getStatusBadge = (status: Policy['status']) => {
    switch (status) {
      case 'active':
        return <Badge variant="outline" className="badge-success">Active</Badge>;
      case 'inactive':
        return <Badge variant="outline" className="badge-warning">Inactive</Badge>;
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
    }
  };

  const filteredPolicies = policies.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: policies.length,
    active: policies.filter(p => p.status === 'active').length,
    inactive: policies.filter(p => p.status === 'inactive').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Zero Trust Policies</h1>
          <p className="text-muted-foreground mt-1">
            Configure access control and security policies
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create Policy
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="stat-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Policies</CardTitle>
            <Shield className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
            <ToggleRight className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.active}</div>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Inactive</CardTitle>
            <ToggleLeft className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inactive}</div>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Enforcements</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">Last 24h</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search policies..." 
            className="pl-9 bg-secondary/50"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Policy List */}
      <div className="grid gap-4">
        {filteredPolicies.map((policy) => {
          const Icon = getTypeIcon(policy.type);
          return (
            <Card key={policy.id} className="portal-card card-hover">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className={`h-12 w-12 rounded-lg bg-secondary flex items-center justify-center ${getTypeColor(policy.type)}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{policy.name}</h3>
                      {getStatusBadge(policy.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{policy.description}</p>
                    
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
                          <span>{policy.appliesTo} affected</span>
                        </div>
                      </div>
                    )}
                    <Switch 
                      checked={policy.status === 'active'} 
                      disabled={policy.status === 'draft'}
                    />
                    <Button variant="ghost" size="icon">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}