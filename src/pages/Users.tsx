import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Users as UsersIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  full_name: string;
  role: string;
  created_at: string;
}

export default function Users() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, [profile]);

  const loadUsers = async () => {
    if (!profile?.organization_id) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
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

  const getRoleBadge = (role: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      global_admin: 'destructive',
      org_admin: 'default',
      support: 'secondary',
      user: 'secondary',
    };

    return <Badge variant={variants[role] || 'secondary'}>{role.replace('_', ' ')}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-muted-foreground">Manage users in your organization</p>
        </div>
        <Button className="glow-neon">
          <UserPlus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading users...</p>
        </div>
      ) : users.length === 0 ? (
        <Card className="glass">
          <CardContent className="py-12 text-center">
            <UsersIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No users found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {users.map((user) => (
            <Card key={user.id} className="glass glow-card">
              <CardContent className="flex items-center justify-between p-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-primary font-semibold">
                      {user.full_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold">{user.full_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Joined {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {getRoleBadge(user.role)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}