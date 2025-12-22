import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Shield, 
  Users, 
  Layers, 
  Server, 
  Eye, 
  Edit, 
  Trash2,
  UserCheck,
  UserX,
  AppWindow,
  Settings,
  CheckCircle2,
  XCircle,
  Save,
  Loader2,
  ChevronDown,
  Lock,
  Unlock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface Group {
  id: string;
  name: string;
  description: string | null;
}

interface Profile {
  id: string;
  full_name: string;
  role: string;
  organization_id: string | null;
}

interface Resource {
  id: string;
  name: string;
  resource_type: string;
}

interface GroupPermission {
  groupId: string;
  canViewApps: boolean;
  canManageUsers: boolean;
  canManageDevices: boolean;
  canManageResources: boolean;
  canViewAudit: boolean;
}

interface UserStatus {
  userId: string;
  isActive: boolean;
}

interface GroupResourceAccess {
  groupId: string;
  resourceId: string;
  hasAccess: boolean;
}

export default function RolesPermissions() {
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Local state for permissions (simulated - would be stored in DB in production)
  const [groupPermissions, setGroupPermissions] = useState<Record<string, GroupPermission>>({});
  const [userStatuses, setUserStatuses] = useState<Record<string, boolean>>({});
  const [groupResourceAccess, setGroupResourceAccess] = useState<Record<string, Record<string, boolean>>>({});
  
  const [expandedSections, setExpandedSections] = useState({
    groups: true,
    users: true,
    access: true,
  });

  useEffect(() => {
    loadData();
  }, [profile]);

  const loadData = async () => {
    try {
      const [groupsRes, usersRes, resourcesRes] = await Promise.all([
        supabase.from('groups').select('*').order('name'),
        supabase.from('profiles').select('*').order('full_name'),
        supabase.from('resources').select('*').order('name'),
      ]);

      const groupsData = groupsRes.data || [];
      const usersData = usersRes.data || [];
      const resourcesData = resourcesRes.data || [];

      setGroups(groupsData);
      setUsers(usersData);
      setResources(resourcesData);

      // Initialize default permissions
      const defaultGroupPerms: Record<string, GroupPermission> = {};
      groupsData.forEach(g => {
        defaultGroupPerms[g.id] = {
          groupId: g.id,
          canViewApps: true,
          canManageUsers: g.name.toLowerCase().includes('admin'),
          canManageDevices: true,
          canManageResources: g.name.toLowerCase().includes('admin'),
          canViewAudit: g.name.toLowerCase().includes('admin') || g.name.toLowerCase().includes('soporte'),
        };
      });
      setGroupPermissions(defaultGroupPerms);

      // Initialize user statuses (all active by default)
      const defaultStatuses: Record<string, boolean> = {};
      usersData.forEach(u => {
        defaultStatuses[u.id] = true;
      });
      setUserStatuses(defaultStatuses);

      // Initialize group resource access
      const defaultAccess: Record<string, Record<string, boolean>> = {};
      groupsData.forEach(g => {
        defaultAccess[g.id] = {};
        resourcesData.forEach(r => {
          defaultAccess[g.id][r.id] = g.name.toLowerCase().includes('admin');
        });
      });
      setGroupResourceAccess(defaultAccess);

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

  const updateGroupPermission = (groupId: string, key: keyof GroupPermission, value: boolean) => {
    setGroupPermissions(prev => ({
      ...prev,
      [groupId]: {
        ...prev[groupId],
        [key]: value,
      }
    }));
  };

  const toggleUserStatus = (userId: string) => {
    setUserStatuses(prev => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const toggleGroupResourceAccess = (groupId: string, resourceId: string) => {
    setGroupResourceAccess(prev => ({
      ...prev,
      [groupId]: {
        ...prev[groupId],
        [resourceId]: !prev[groupId]?.[resourceId],
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    // In production, this would save to the database
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast({
      title: 'Configuración guardada',
      description: 'Los permisos han sido actualizados correctamente',
    });
    setSaving(false);
  };

  const applyPreset = (preset: 'restrictive' | 'balanced' | 'permissive') => {
    const newPerms: Record<string, GroupPermission> = {};
    
    groups.forEach(g => {
      const isAdmin = g.name.toLowerCase().includes('admin');
      const isSupport = g.name.toLowerCase().includes('soporte');
      
      switch (preset) {
        case 'restrictive':
          newPerms[g.id] = {
            groupId: g.id,
            canViewApps: true,
            canManageUsers: isAdmin,
            canManageDevices: isAdmin || isSupport,
            canManageResources: isAdmin,
            canViewAudit: isAdmin,
          };
          break;
        case 'balanced':
          newPerms[g.id] = {
            groupId: g.id,
            canViewApps: true,
            canManageUsers: isAdmin,
            canManageDevices: true,
            canManageResources: isAdmin || isSupport,
            canViewAudit: isAdmin || isSupport,
          };
          break;
        case 'permissive':
          newPerms[g.id] = {
            groupId: g.id,
            canViewApps: true,
            canManageUsers: isAdmin || isSupport,
            canManageDevices: true,
            canManageResources: true,
            canViewAudit: true,
          };
          break;
      }
    });
    
    setGroupPermissions(newPerms);
    toast({
      title: 'Preset aplicado',
      description: `Configuración ${preset === 'restrictive' ? 'restrictiva' : preset === 'balanced' ? 'balanceada' : 'permisiva'} aplicada`,
    });
  };

  const isAdmin = profile?.role === 'org_admin' || profile?.role === 'global_admin';

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="glass">
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No tienes permisos para acceder a esta sección</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Roles y Permisos
          </h1>
          <p className="text-muted-foreground">Configura los permisos por grupo y estado de usuarios</p>
        </div>
        <div className="flex items-center gap-3">
          <Select onValueChange={(v) => applyPreset(v as any)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Aplicar preset..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="restrictive">
                <div className="flex items-center gap-2">
                  <Lock className="h-3 w-3" />
                  Restrictivo
                </div>
              </SelectItem>
              <SelectItem value="balanced">
                <div className="flex items-center gap-2">
                  <Settings className="h-3 w-3" />
                  Balanceado
                </div>
              </SelectItem>
              <SelectItem value="permissive">
                <div className="flex items-center gap-2">
                  <Unlock className="h-3 w-3" />
                  Permisivo
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleSave} disabled={saving} className="glow-neon">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Guardar Cambios
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Group Permissions */}
        <Collapsible open={expandedSections.groups} onOpenChange={(open) => setExpandedSections(prev => ({ ...prev, groups: open }))}>
          <Card className="glass">
            <CollapsibleTrigger className="w-full">
              <CardHeader className="pb-3 cursor-pointer hover:bg-accent/50 transition-colors rounded-t-lg">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-blue-400" />
                    Permisos por Grupo
                  </CardTitle>
                  <ChevronDown className={`h-4 w-4 transition-transform ${expandedSections.groups ? 'rotate-180' : ''}`} />
                </div>
                <CardDescription>Define qué puede hacer cada grupo</CardDescription>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-6">
                    {groups.map((group) => (
                      <div key={group.id} className="p-4 rounded-lg border border-border bg-card/50">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="h-8 w-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                            <Layers className="h-4 w-4 text-blue-400" />
                          </div>
                          <div>
                            <p className="font-medium">{group.name}</p>
                            <p className="text-xs text-muted-foreground">{group.description || 'Sin descripción'}</p>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="flex items-center gap-2 text-sm">
                              <AppWindow className="h-3 w-3" />
                              Ver aplicaciones
                            </Label>
                            <Switch
                              checked={groupPermissions[group.id]?.canViewApps ?? true}
                              onCheckedChange={(v) => updateGroupPermission(group.id, 'canViewApps', v)}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label className="flex items-center gap-2 text-sm">
                              <Users className="h-3 w-3" />
                              Gestionar usuarios
                            </Label>
                            <Switch
                              checked={groupPermissions[group.id]?.canManageUsers ?? false}
                              onCheckedChange={(v) => updateGroupPermission(group.id, 'canManageUsers', v)}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label className="flex items-center gap-2 text-sm">
                              <Settings className="h-3 w-3" />
                              Gestionar dispositivos
                            </Label>
                            <Switch
                              checked={groupPermissions[group.id]?.canManageDevices ?? false}
                              onCheckedChange={(v) => updateGroupPermission(group.id, 'canManageDevices', v)}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label className="flex items-center gap-2 text-sm">
                              <Server className="h-3 w-3" />
                              Gestionar recursos
                            </Label>
                            <Switch
                              checked={groupPermissions[group.id]?.canManageResources ?? false}
                              onCheckedChange={(v) => updateGroupPermission(group.id, 'canManageResources', v)}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label className="flex items-center gap-2 text-sm">
                              <Eye className="h-3 w-3" />
                              Ver auditoría
                            </Label>
                            <Switch
                              checked={groupPermissions[group.id]?.canViewAudit ?? false}
                              onCheckedChange={(v) => updateGroupPermission(group.id, 'canViewAudit', v)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* User Status */}
        <Collapsible open={expandedSections.users} onOpenChange={(open) => setExpandedSections(prev => ({ ...prev, users: open }))}>
          <Card className="glass">
            <CollapsibleTrigger className="w-full">
              <CardHeader className="pb-3 cursor-pointer hover:bg-accent/50 transition-colors rounded-t-lg">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-emerald-400" />
                    Estado de Usuarios
                  </CardTitle>
                  <ChevronDown className={`h-4 w-4 transition-transform ${expandedSections.users ? 'rotate-180' : ''}`} />
                </div>
                <CardDescription>Activa o desactiva usuarios</CardDescription>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-2">
                    {users.map((user) => (
                      <div 
                        key={user.id} 
                        className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                          userStatuses[user.id] 
                            ? 'border-emerald-500/30 bg-emerald-500/5' 
                            : 'border-red-500/30 bg-red-500/5 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                            userStatuses[user.id] ? 'bg-emerald-500/20' : 'bg-red-500/20'
                          }`}>
                            {userStatuses[user.id] ? (
                              <UserCheck className="h-4 w-4 text-emerald-400" />
                            ) : (
                              <UserX className="h-4 w-4 text-red-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{user.full_name}</p>
                            <Badge variant="outline" className="text-xs">{user.role?.replace('_', ' ')}</Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs ${userStatuses[user.id] ? 'text-emerald-400' : 'text-red-400'}`}>
                            {userStatuses[user.id] ? 'Activo' : 'Inactivo'}
                          </span>
                          <Switch
                            checked={userStatuses[user.id] ?? true}
                            onCheckedChange={() => toggleUserStatus(user.id)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>

      {/* Group Resource Access */}
      <Collapsible open={expandedSections.access} onOpenChange={(open) => setExpandedSections(prev => ({ ...prev, access: open }))}>
        <Card className="glass">
          <CollapsibleTrigger className="w-full">
            <CardHeader className="pb-3 cursor-pointer hover:bg-accent/50 transition-colors rounded-t-lg">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5 text-amber-400" />
                  Acceso a Recursos por Grupo
                </CardTitle>
                <ChevronDown className={`h-4 w-4 transition-transform ${expandedSections.access ? 'rotate-180' : ''}`} />
              </div>
              <CardDescription>Define qué grupo puede acceder a qué recurso o aplicación</CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              {resources.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No hay recursos configurados</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 font-medium text-sm">Recurso</th>
                        {groups.map(group => (
                          <th key={group.id} className="text-center py-3 px-4 font-medium text-sm">
                            <div className="flex flex-col items-center gap-1">
                              <Layers className="h-4 w-4 text-blue-400" />
                              <span className="text-xs">{group.name}</span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {resources.map(resource => (
                        <tr key={resource.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded bg-amber-500/20 flex items-center justify-center">
                                <Server className="h-3 w-3 text-amber-400" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">{resource.name}</p>
                                <Badge variant="outline" className="text-xs">{resource.resource_type}</Badge>
                              </div>
                            </div>
                          </td>
                          {groups.map(group => (
                            <td key={group.id} className="text-center py-3 px-4">
                              <button
                                onClick={() => toggleGroupResourceAccess(group.id, resource.id)}
                                className={`h-8 w-8 rounded-full flex items-center justify-center transition-all mx-auto ${
                                  groupResourceAccess[group.id]?.[resource.id]
                                    ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                }`}
                              >
                                {groupResourceAccess[group.id]?.[resource.id] ? (
                                  <CheckCircle2 className="h-4 w-4" />
                                ) : (
                                  <XCircle className="h-4 w-4" />
                                )}
                              </button>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
