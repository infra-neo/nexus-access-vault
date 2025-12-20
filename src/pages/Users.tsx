import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users as UsersIcon, Trash2, Edit2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CreateUserDialog } from '@/components/users/CreateUserDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  const [editingRole, setEditingRole] = useState<string | null>(null);

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

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole as 'global_admin' | 'org_admin' | 'support' | 'user' })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: 'Rol actualizado',
        description: 'El rol del usuario ha sido actualizado',
      });

      setEditingRole(null);
      loadUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (userId: string, userName: string) => {
    if (userId === profile?.id) {
      toast({
        title: 'Error',
        description: 'No puedes eliminarte a ti mismo',
        variant: 'destructive',
      });
      return;
    }

    if (!confirm(`¿Eliminar a ${userName}? Esta acción no se puede deshacer.`)) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ organization_id: null })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: 'Usuario removido',
        description: `${userName} ha sido removido de la organización`,
      });

      loadUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getRoleBadge = (role: string) => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'destructive'; label: string }> = {
      global_admin: { variant: 'destructive', label: 'Global Admin' },
      org_admin: { variant: 'default', label: 'Org Admin' },
      support: { variant: 'secondary', label: 'Soporte' },
      user: { variant: 'secondary', label: 'Usuario' },
    };

    const roleConfig = config[role] || { variant: 'secondary', label: role };
    return <Badge variant={roleConfig.variant}>{roleConfig.label}</Badge>;
  };

  const isAdmin = profile?.role === 'org_admin' || profile?.role === 'global_admin';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Usuarios</h1>
          <p className="text-muted-foreground">Gestiona los usuarios de tu organización</p>
        </div>
        {isAdmin && <CreateUserDialog onCreated={loadUsers} />}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando usuarios...</p>
        </div>
      ) : users.length === 0 ? (
        <Card className="glass">
          <CardContent className="py-12 text-center">
            <UsersIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No hay usuarios en esta organización</p>
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
                      Desde {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {editingRole === user.id ? (
                    <Select
                      defaultValue={user.role}
                      onValueChange={(value) => handleRoleChange(user.id, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Usuario</SelectItem>
                        <SelectItem value="support">Soporte</SelectItem>
                        <SelectItem value="org_admin">Org Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <>
                      {getRoleBadge(user.role)}
                      {isAdmin && user.id !== profile?.id && (
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingRole(user.id)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(user.id, user.full_name)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}