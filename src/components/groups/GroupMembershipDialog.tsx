import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, UserPlus, UserMinus, Loader2 } from 'lucide-react';

interface Profile {
  id: string;
  full_name: string;
  role: string | null;
}

interface GroupMembershipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupName: string;
  onUpdated: () => void;
}

export function GroupMembershipDialog({
  open,
  onOpenChange,
  groupId,
  groupName,
  onUpdated,
}: GroupMembershipDialogProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (open && groupId) {
      loadData();
    }
  }, [open, groupId]);

  const loadData = async () => {
    if (!profile?.organization_id) return;

    setLoading(true);
    try {
      // Load all users in organization
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('organization_id', profile.organization_id)
        .order('full_name');

      if (usersError) throw usersError;

      // Load current group members
      const { data: members, error: membersError } = await supabase
        .from('user_groups')
        .select('user_id')
        .eq('group_id', groupId);

      if (membersError) throw membersError;

      const memberIdList = members?.map(m => m.user_id) || [];
      
      setAllUsers(users || []);
      setMemberIds(memberIdList);
      setSelectedIds(memberIdList);
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

  const handleToggleUser = (userId: string) => {
    setSelectedIds(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Determine which users to add and remove
      const toAdd = selectedIds.filter(id => !memberIds.includes(id));
      const toRemove = memberIds.filter(id => !selectedIds.includes(id));

      // Remove users
      if (toRemove.length > 0) {
        const { error: removeError } = await supabase
          .from('user_groups')
          .delete()
          .eq('group_id', groupId)
          .in('user_id', toRemove);

        if (removeError) throw removeError;
      }

      // Add users
      if (toAdd.length > 0) {
        const { error: addError } = await supabase
          .from('user_groups')
          .insert(toAdd.map(userId => ({
            group_id: groupId,
            user_id: userId,
          })));

        if (addError) throw addError;
      }

      toast({
        title: 'Éxito',
        description: `Miembros del grupo "${groupName}" actualizados`,
      });

      onUpdated();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadge = (role: string | null) => {
    switch (role) {
      case 'global_admin':
        return <Badge variant="destructive" className="text-xs">Global Admin</Badge>;
      case 'org_admin':
        return <Badge className="text-xs bg-primary">Org Admin</Badge>;
      case 'support':
        return <Badge variant="secondary" className="text-xs">Soporte</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Usuario</Badge>;
    }
  };

  const currentMembers = allUsers.filter(u => selectedIds.includes(u.id));
  const availableUsers = allUsers.filter(u => !selectedIds.includes(u.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Gestionar Miembros - {groupName}
          </DialogTitle>
          <DialogDescription>
            Selecciona los usuarios que pertenecerán a este grupo
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {/* Current Members */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Miembros Actuales ({currentMembers.length})
              </h3>
              <ScrollArea className="h-[300px] border rounded-lg p-2">
                {currentMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Sin miembros
                  </p>
                ) : (
                  <div className="space-y-1">
                    {currentMembers.map(user => (
                      <div
                        key={user.id}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors"
                        onClick={() => handleToggleUser(user.id)}
                      >
                        <Checkbox checked={true} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{user.full_name}</p>
                        </div>
                        {getRoleBadge(user.role)}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Available Users */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <UserMinus className="h-4 w-4 text-muted-foreground" />
                Usuarios Disponibles ({availableUsers.length})
              </h3>
              <ScrollArea className="h-[300px] border rounded-lg p-2">
                {availableUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Todos los usuarios están asignados
                  </p>
                ) : (
                  <div className="space-y-1">
                    {availableUsers.map(user => (
                      <div
                        key={user.id}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors"
                        onClick={() => handleToggleUser(user.id)}
                      >
                        <Checkbox checked={false} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{user.full_name}</p>
                        </div>
                        {getRoleBadge(user.role)}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="glow-neon"
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Guardar Cambios
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
