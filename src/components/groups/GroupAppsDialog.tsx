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
import { AppWindow, Loader2, Monitor, Tv } from 'lucide-react';

interface Resource {
  id: string;
  name: string;
  resource_type: string;
  connection_method: string;
  ip_address: string | null;
}

interface GroupAppsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupName: string;
  onUpdated: () => void;
}

export function GroupAppsDialog({
  open,
  onOpenChange,
  groupId,
  groupName,
  onUpdated,
}: GroupAppsDialogProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resources, setResources] = useState<Resource[]>([]);
  const [groupMembers, setGroupMembers] = useState<string[]>([]);
  const [selectedResources, setSelectedResources] = useState<string[]>([]);

  useEffect(() => {
    if (open && groupId) {
      loadData();
    }
  }, [open, groupId]);

  const loadData = async () => {
    if (!profile?.organization_id) return;

    setLoading(true);
    try {
      // Load all resources in organization
      const { data: resourcesData, error: resourcesError } = await supabase
        .from('resources')
        .select('id, name, resource_type, connection_method, ip_address')
        .eq('organization_id', profile.organization_id)
        .order('name');

      if (resourcesError) throw resourcesError;

      // Load group members
      const { data: members, error: membersError } = await supabase
        .from('user_groups')
        .select('user_id')
        .eq('group_id', groupId);

      if (membersError) throw membersError;

      setResources(resourcesData || []);
      setGroupMembers(members?.map(m => m.user_id) || []);
      setSelectedResources([]);
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

  const handleToggleResource = (resourceId: string) => {
    setSelectedResources(prev => 
      prev.includes(resourceId)
        ? prev.filter(id => id !== resourceId)
        : [...prev, resourceId]
    );
  };

  const handleAssign = async () => {
    if (selectedResources.length === 0) {
      toast({
        title: 'Error',
        description: 'Selecciona al menos una aplicación',
        variant: 'destructive',
      });
      return;
    }

    if (groupMembers.length === 0) {
      toast({
        title: 'Error',
        description: 'El grupo no tiene miembros asignados',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      // Create access for all group members to selected resources
      const accessEntries = groupMembers.flatMap(userId =>
        selectedResources.map(resourceId => ({
          user_id: userId,
          resource_id: resourceId,
          status: 'active' as const,
          activated_at: new Date().toISOString(),
        }))
      );

      // Use upsert to avoid duplicates
      const { error } = await supabase
        .from('user_resource_access')
        .upsert(accessEntries, { 
          onConflict: 'user_id,resource_id',
          ignoreDuplicates: true 
        });

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: `${selectedResources.length} aplicación(es) asignada(s) a ${groupMembers.length} miembro(s) del grupo`,
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

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'tsplus_html5':
        return <Tv className="h-4 w-4" />;
      case 'rdp':
      case 'windows_vm':
        return <Monitor className="h-4 w-4" />;
      default:
        return <AppWindow className="h-4 w-4" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const labels: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
      tsplus_html5: { label: 'TSplus HTML5', variant: 'default' },
      rdp: { label: 'RDP', variant: 'secondary' },
      windows_vm: { label: 'Windows VM', variant: 'secondary' },
      ssh: { label: 'SSH', variant: 'outline' },
      web_app: { label: 'Web App', variant: 'outline' },
    };
    const config = labels[type] || { label: type, variant: 'outline' as const };
    return <Badge variant={config.variant} className="text-xs">{config.label}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AppWindow className="h-5 w-5" />
            Asignar Aplicaciones - {groupName}
          </DialogTitle>
          <DialogDescription>
            Selecciona las aplicaciones para asignar a los {groupMembers.length} miembros del grupo
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : resources.length === 0 ? (
          <div className="text-center py-12">
            <AppWindow className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No hay aplicaciones disponibles</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-2">
              {resources.map(resource => (
                <div
                  key={resource.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedResources.includes(resource.id)
                      ? 'border-primary bg-primary/10'
                      : 'hover:bg-secondary/50'
                  }`}
                  onClick={() => handleToggleResource(resource.id)}
                >
                  <Checkbox checked={selectedResources.includes(resource.id)} />
                  <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
                    {getResourceIcon(resource.resource_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{resource.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {resource.ip_address || resource.connection_method}
                    </p>
                  </div>
                  {getTypeBadge(resource.resource_type)}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            {selectedResources.length} aplicación(es) seleccionada(s)
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAssign} 
              disabled={saving || selectedResources.length === 0}
              className="glow-neon"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Asignar Aplicaciones
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
