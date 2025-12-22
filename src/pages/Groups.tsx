import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, Trash2, UserPlus, AppWindow, Eye } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { GroupMembershipDialog } from '@/components/groups/GroupMembershipDialog';
import { GroupAppsDialog } from '@/components/groups/GroupAppsDialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface Group {
  id: string;
  name: string;
  description: string | null;
  ldap_dn: string | null;
  created_at: string;
  memberCount?: number;
  appCount?: number;
}

interface UserGroup {
  group_id: string;
  user_id: string;
}

export default function Groups() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    ldap_dn: '',
  });
  
  // Dialog states
  const [membershipDialogOpen, setMembershipDialogOpen] = useState(false);
  const [appsDialogOpen, setAppsDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  useEffect(() => {
    loadGroups();
  }, [profile]);

  const loadGroups = async () => {
    if (!profile?.organization_id) return;

    try {
      // Load groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false });

      if (groupsError) throw groupsError;

      // Load member counts
      const { data: userGroupsData } = await supabase
        .from('user_groups')
        .select('group_id, user_id');

      // Count members per group
      const memberCounts: Record<string, number> = {};
      userGroupsData?.forEach(ug => {
        memberCounts[ug.group_id] = (memberCounts[ug.group_id] || 0) + 1;
      });

      // Enhance groups with counts
      const enhancedGroups = (groupsData || []).map(g => ({
        ...g,
        memberCount: memberCounts[g.id] || 0,
      }));

      setGroups(enhancedGroups);
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
        .from('groups')
        .insert({
          organization_id: profile?.organization_id,
          name: formData.name,
          description: formData.description || null,
          ldap_dn: formData.ldap_dn || null,
        });

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: 'Grupo creado correctamente',
      });

      setOpen(false);
      setFormData({ name: '', description: '', ldap_dn: '' });
      loadGroups();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este grupo?')) return;

    try {
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: 'Grupo eliminado',
      });

      loadGroups();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const openMembershipDialog = (group: Group) => {
    setSelectedGroup(group);
    setMembershipDialogOpen(true);
  };

  const openAppsDialog = (group: Group) => {
    setSelectedGroup(group);
    setAppsDialogOpen(true);
  };

  const isAdmin = profile?.role === 'org_admin' || profile?.role === 'global_admin';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Grupos de Usuarios</h1>
          <p className="text-muted-foreground">Organiza usuarios en grupos para facilitar la asignación de permisos</p>
        </div>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="glow-neon">
                <Plus className="h-4 w-4 mr-2" />
                Crear Grupo
              </Button>
            </DialogTrigger>
            <DialogContent className="glass">
              <DialogHeader>
                <DialogTitle>Nuevo Grupo</DialogTitle>
                <DialogDescription>
                  Crea un grupo para organizar usuarios
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nombre del Grupo</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="ldap_dn">LDAP DN (Opcional)</Label>
                  <Input
                    id="ldap_dn"
                    value={formData.ldap_dn}
                    onChange={(e) => setFormData({ ...formData, ldap_dn: e.target.value })}
                    placeholder="cn=grupo,ou=grupos,dc=ejemplo,dc=com"
                  />
                </div>
                <Button type="submit" className="w-full glow-neon">
                  Crear Grupo
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando grupos...</p>
        </div>
      ) : groups.length === 0 ? (
        <Card className="glass">
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No hay grupos creados</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <Card key={group.id} className="glass glow-card">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{group.name}</CardTitle>
                      <CardDescription>{group.description || 'Sin descripción'}</CardDescription>
                    </div>
                  </div>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(group.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Stats */}
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="secondary">
                    <Users className="h-3 w-3 mr-1" />
                    {group.memberCount || 0} miembros
                  </Badge>
                  {group.ldap_dn && (
                    <Badge variant="outline">LDAP</Badge>
                  )}
                </div>

                {/* Actions */}
                {isAdmin && (
                  <div className="flex gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => openMembershipDialog(group)}
                          >
                            <UserPlus className="h-4 w-4 mr-1" />
                            Miembros
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Gestionar miembros del grupo</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => openAppsDialog(group)}
                          >
                            <AppWindow className="h-4 w-4 mr-1" />
                            Apps
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Asignar aplicaciones al grupo</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Membership Dialog */}
      {selectedGroup && (
        <GroupMembershipDialog
          open={membershipDialogOpen}
          onOpenChange={setMembershipDialogOpen}
          groupId={selectedGroup.id}
          groupName={selectedGroup.name}
          onUpdated={loadGroups}
        />
      )}

      {/* Apps Dialog */}
      {selectedGroup && (
        <GroupAppsDialog
          open={appsDialogOpen}
          onOpenChange={setAppsDialogOpen}
          groupId={selectedGroup.id}
          groupName={selectedGroup.name}
          onUpdated={loadGroups}
        />
      )}
    </div>
  );
}
