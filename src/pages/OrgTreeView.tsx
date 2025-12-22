import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Building2, 
  Layers, 
  Users, 
  Server, 
  ChevronRight,
  User,
  Shield,
  Eye,
  Edit,
  Trash2,
  AppWindow,
  CheckCircle2,
  XCircle,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Organization {
  id: string;
  name: string;
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  organization_id: string;
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
  organization_id: string;
}

interface UserGroup {
  user_id: string;
  group_id: string;
}

interface UserResourceAccess {
  user_id: string;
  resource_id: string;
  status: string;
}

export default function OrgTreeView() {
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [userGroups, setUserGroups] = useState<UserGroup[]>([]);
  const [userResources, setUserResources] = useState<UserResourceAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [orgsRes, groupsRes, usersRes, resourcesRes, userGroupsRes, userResourcesRes] = await Promise.all([
        supabase.from('organizations').select('*').order('name'),
        supabase.from('groups').select('*').order('name'),
        supabase.from('profiles').select('*').order('full_name'),
        supabase.from('resources').select('*').order('name'),
        supabase.from('user_groups').select('*'),
        supabase.from('user_resource_access').select('*'),
      ]);

      setOrganizations(orgsRes.data || []);
      setGroups(groupsRes.data || []);
      setUsers(usersRes.data || []);
      setResources(resourcesRes.data || []);
      setUserGroups(userGroupsRes.data || []);
      setUserResources(userResourcesRes.data || []);
      
      // Auto-expand first org
      if (orgsRes.data && orgsRes.data.length > 0) {
        setExpandedOrgs(new Set([orgsRes.data[0].id]));
      }
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

  const toggleOrg = (orgId: string) => {
    const newExpanded = new Set(expandedOrgs);
    if (newExpanded.has(orgId)) {
      newExpanded.delete(orgId);
    } else {
      newExpanded.add(orgId);
    }
    setExpandedOrgs(newExpanded);
  };

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const toggleUser = (userId: string) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedUsers(newExpanded);
  };

  const getGroupsForOrg = (orgId: string) => groups.filter(g => g.organization_id === orgId);
  const getUsersForGroup = (groupId: string) => {
    const userIds = userGroups.filter(ug => ug.group_id === groupId).map(ug => ug.user_id);
    return users.filter(u => userIds.includes(u.id));
  };
  const getResourcesForUser = (userId: string) => {
    const resourceIds = userResources.filter(ur => ur.user_id === userId).map(ur => ur.resource_id);
    return resources.filter(r => resourceIds.includes(r.id));
  };
  const getUsersForOrg = (orgId: string) => users.filter(u => u.organization_id === orgId);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'global_admin': return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'org_admin': return 'bg-violet-500/20 text-violet-400 border-violet-500/50';
      case 'support': return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      default: return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'global_admin': return 'Global Admin';
      case 'org_admin': return 'Org Admin';
      case 'support': return 'Soporte';
      default: return 'Usuario';
    }
  };

  const getPermissionsByRole = (role: string) => {
    switch (role) {
      case 'global_admin':
        return [
          { icon: Eye, label: 'Ver todo', active: true },
          { icon: Edit, label: 'Editar todo', active: true },
          { icon: Trash2, label: 'Eliminar', active: true },
          { icon: Users, label: 'Gestionar usuarios', active: true },
          { icon: Building2, label: 'Gestionar orgs', active: true },
        ];
      case 'org_admin':
        return [
          { icon: Eye, label: 'Ver org', active: true },
          { icon: Edit, label: 'Editar org', active: true },
          { icon: Trash2, label: 'Eliminar', active: true },
          { icon: Users, label: 'Gestionar usuarios', active: true },
          { icon: Building2, label: 'Gestionar orgs', active: false },
        ];
      case 'support':
        return [
          { icon: Eye, label: 'Ver org', active: true },
          { icon: Edit, label: 'Editar básico', active: true },
          { icon: Trash2, label: 'Eliminar', active: false },
          { icon: Users, label: 'Gestionar usuarios', active: true },
          { icon: Building2, label: 'Gestionar orgs', active: false },
        ];
      default:
        return [
          { icon: Eye, label: 'Ver propio', active: true },
          { icon: Edit, label: 'Editar propio', active: true },
          { icon: Trash2, label: 'Eliminar', active: false },
          { icon: Users, label: 'Gestionar usuarios', active: false },
          { icon: Building2, label: 'Gestionar orgs', active: false },
        ];
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-4rem)]">
      {/* Left: Organization Tree */}
      <div className="flex-1 flex flex-col">
        <Card className="glass flex-1 flex flex-col overflow-hidden">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Árbol Organizacional
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-2">
                {organizations.map((org) => (
                  <div key={org.id} className="relative">
                    {/* Organization Node */}
                    <div 
                      onClick={() => toggleOrg(org.id)}
                      className="flex items-center gap-3 p-3 rounded-lg bg-violet-500/10 border border-violet-500/30 cursor-pointer hover:bg-violet-500/20 transition-all"
                    >
                      <div className="h-10 w-10 rounded-lg bg-violet-500/30 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-violet-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-violet-300">{org.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {getGroupsForOrg(org.id).length} grupos • {getUsersForOrg(org.id).length} usuarios
                        </p>
                      </div>
                      <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${expandedOrgs.has(org.id) ? 'rotate-90' : ''}`} />
                    </div>

                    {/* Groups */}
                    {expandedOrgs.has(org.id) && (
                      <div className="ml-6 mt-2 space-y-2 relative before:absolute before:left-0 before:top-0 before:bottom-4 before:w-px before:bg-border">
                        {getGroupsForOrg(org.id).map((group) => (
                          <div key={group.id} className="relative pl-6">
                            <div className="absolute left-0 top-5 w-5 h-px bg-border" />
                            {/* Group Node */}
                            <div 
                              onClick={() => toggleGroup(group.id)}
                              className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 cursor-pointer hover:bg-blue-500/20 transition-all"
                            >
                              <div className="h-9 w-9 rounded-lg bg-blue-500/30 flex items-center justify-center">
                                <Layers className="h-4 w-4 text-blue-400" />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-blue-300">{group.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {getUsersForGroup(group.id).length} usuarios
                                </p>
                              </div>
                              <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${expandedGroups.has(group.id) ? 'rotate-90' : ''}`} />
                            </div>

                            {/* Users in Group */}
                            {expandedGroups.has(group.id) && (
                              <div className="ml-6 mt-2 space-y-2 relative before:absolute before:left-0 before:top-0 before:bottom-4 before:w-px before:bg-border/50">
                                {getUsersForGroup(group.id).map((user) => (
                                  <div key={user.id} className="relative pl-6">
                                    <div className="absolute left-0 top-4 w-5 h-px bg-border/50" />
                                    {/* User Node */}
                                    <div 
                                      onClick={() => toggleUser(user.id)}
                                      className="flex items-center gap-3 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 cursor-pointer hover:bg-emerald-500/20 transition-all"
                                    >
                                      <div className="h-8 w-8 rounded-full bg-emerald-500/30 flex items-center justify-center">
                                        <span className="text-xs font-medium text-emerald-400">
                                          {user.full_name.charAt(0).toUpperCase()}
                                        </span>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-emerald-300 truncate">{user.full_name}</p>
                                        <Badge variant="outline" className={`text-xs ${getRoleColor(user.role)}`}>
                                          {getRoleLabel(user.role)}
                                        </Badge>
                                      </div>
                                      <ChevronRight className={`h-3 w-3 text-muted-foreground transition-transform ${expandedUsers.has(user.id) ? 'rotate-90' : ''}`} />
                                    </div>

                                    {/* Resources for User */}
                                    {expandedUsers.has(user.id) && (
                                      <div className="ml-6 mt-2 space-y-1 relative before:absolute before:left-0 before:top-0 before:bottom-2 before:w-px before:bg-border/30">
                                        {getResourcesForUser(user.id).length > 0 ? (
                                          getResourcesForUser(user.id).map((resource) => (
                                            <div key={resource.id} className="relative pl-5">
                                              <div className="absolute left-0 top-3 w-4 h-px bg-border/30" />
                                              <div className="flex items-center gap-2 p-2 rounded bg-amber-500/10 border border-amber-500/20">
                                                <div className="h-6 w-6 rounded bg-amber-500/30 flex items-center justify-center">
                                                  <Server className="h-3 w-3 text-amber-400" />
                                                </div>
                                                <span className="text-xs text-amber-300">{resource.name}</span>
                                                <Badge variant="outline" className="text-xs ml-auto">{resource.resource_type}</Badge>
                                              </div>
                                            </div>
                                          ))
                                        ) : (
                                          <p className="text-xs text-muted-foreground pl-5 py-2">Sin recursos asignados</p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ))}
                                {getUsersForGroup(group.id).length === 0 && (
                                  <p className="text-xs text-muted-foreground pl-6 py-2">Sin usuarios en este grupo</p>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                        {getGroupsForOrg(org.id).length === 0 && (
                          <p className="text-xs text-muted-foreground pl-6 py-2">Sin grupos</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Right: Roles & Permissions Matrix */}
      <div className="w-96 flex flex-col gap-4">
        <Card className="glass">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4 text-primary" />
              Matriz de Permisos por Rol
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {['global_admin', 'org_admin', 'support', 'user'].map((role) => (
              <div key={role} className={`p-3 rounded-lg border ${getRoleColor(role)}`}>
                <div className="flex items-center gap-2 mb-3">
                  <User className="h-4 w-4" />
                  <span className="font-medium">{getRoleLabel(role)}</span>
                </div>
                <div className="space-y-1">
                  {getPermissionsByRole(role).map((perm, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      {perm.active ? (
                        <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <XCircle className="h-3 w-3 text-red-400/50" />
                      )}
                      <perm.icon className="h-3 w-3 opacity-60" />
                      <span className={perm.active ? '' : 'text-muted-foreground line-through'}>{perm.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Legend */}
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Leyenda</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 rounded bg-violet-500/30 border border-violet-500/50" />
              <span className="text-xs">Organización</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 rounded bg-blue-500/30 border border-blue-500/50" />
              <span className="text-xs">Grupo</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 rounded bg-emerald-500/30 border border-emerald-500/50" />
              <span className="text-xs">Usuario</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 rounded bg-amber-500/30 border border-amber-500/50" />
              <span className="text-xs">Recurso/App</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
