import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Building2, 
  Layers, 
  Server, 
  Plus, 
  GripVertical,
  UserPlus,
  Mail,
  Laptop2,
  ChevronRight,
  Search
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CreateUserDialog } from '@/components/users/CreateUserDialog';

interface Organization {
  id: string;
  name: string;
}

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

interface Device {
  id: string;
  name: string;
  device_type: string;
  user_id: string;
}

export default function AdminPanel() {
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  
  const [selectedOrg, setSelectedOrg] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  
  const [assignedUsers, setAssignedUsers] = useState<string[]>([]);
  const [assignedResources, setAssignedResources] = useState<string[]>([]);
  
  const [activeTab, setActiveTab] = useState('organizations');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [profile]);

  useEffect(() => {
    if (selectedOrg) {
      loadGroups();
      loadResources();
    }
  }, [selectedOrg]);

  useEffect(() => {
    if (selectedGroup) {
      loadGroupUsers();
    }
  }, [selectedGroup]);

  const loadData = async () => {
    try {
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id, name')
        .order('name');
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      setOrganizations(orgs || []);
      setUsers(profiles || []);
      
      if (profile?.organization_id) {
        setSelectedOrg(profile.organization_id);
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

  const loadGroups = async () => {
    const { data } = await supabase
      .from('groups')
      .select('*')
      .eq('organization_id', selectedOrg)
      .order('name');
    setGroups(data || []);
  };

  const loadResources = async () => {
    const { data } = await supabase
      .from('resources')
      .select('*')
      .eq('organization_id', selectedOrg)
      .order('name');
    setResources(data || []);
  };

  const loadGroupUsers = async () => {
    const { data } = await supabase
      .from('user_groups')
      .select('user_id')
      .eq('group_id', selectedGroup);
    setAssignedUsers((data || []).map(u => u.user_id));
  };

  const handleAssignUserToGroup = async (userId: string) => {
    if (!selectedGroup) {
      toast({
        title: 'Error',
        description: 'Primero selecciona un grupo',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('user_groups')
        .insert({ user_id: userId, group_id: selectedGroup });

      if (error) throw error;

      toast({
        title: 'Usuario asignado',
        description: 'El usuario ha sido agregado al grupo',
      });
      
      setAssignedUsers([...assignedUsers, userId]);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleRemoveUserFromGroup = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_groups')
        .delete()
        .eq('user_id', userId)
        .eq('group_id', selectedGroup);

      if (error) throw error;

      toast({
        title: 'Usuario removido',
        description: 'El usuario ha sido removido del grupo',
      });
      
      setAssignedUsers(assignedUsers.filter(id => id !== userId));
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleAssignResourceToUser = async (resourceId: string) => {
    if (!selectedUser) {
      toast({
        title: 'Error',
        description: 'Primero selecciona un usuario',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('user_resource_access')
        .insert({ 
          user_id: selectedUser.id, 
          resource_id: resourceId,
          status: 'active'
        });

      if (error) throw error;

      toast({
        title: 'Recurso asignado',
        description: 'El recurso ha sido asignado al usuario',
      });
      
      setAssignedResources([...assignedResources, resourceId]);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSendInvitation = (userId: string) => {
    toast({
      title: 'Invitación enviada',
      description: 'Se ha enviado una invitación para enrolar dispositivo',
    });
  };

  const filteredUsers = users.filter(u => 
    u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (selectedOrg ? u.organization_id === selectedOrg : true)
  );

  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isAdmin = profile?.role === 'org_admin' || profile?.role === 'global_admin';
  const isSupport = profile?.role === 'support';
  const canAccess = isAdmin || isSupport;

  if (!canAccess) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="glass">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No tienes permisos para acceder a esta sección</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4">
      {/* Left Sidebar - Records List */}
      <div className="w-72 flex flex-col border-r border-border bg-card/50 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold mb-3">Panel de Administración</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid grid-cols-4 mx-4 mt-4">
            <TabsTrigger value="organizations" className="text-xs">
              <Building2 className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="groups" className="text-xs">
              <Layers className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="users" className="text-xs">
              <Users className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="resources" className="text-xs">
              <Server className="h-4 w-4" />
            </TabsTrigger>
          </TabsList>
          
          <ScrollArea className="flex-1 p-4">
            <TabsContent value="organizations" className="m-0 space-y-2">
              {organizations.map((org) => (
                <div
                  key={org.id}
                  onClick={() => setSelectedOrg(org.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all hover:bg-accent/50 ${
                    selectedOrg === org.id ? 'border-primary bg-accent' : 'border-border'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <span className="font-medium text-sm">{org.name}</span>
                  </div>
                </div>
              ))}
            </TabsContent>
            
            <TabsContent value="groups" className="m-0 space-y-2">
              {filteredGroups.map((group) => (
                <div
                  key={group.id}
                  onClick={() => setSelectedGroup(group.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all hover:bg-accent/50 ${
                    selectedGroup === group.id ? 'border-primary bg-accent' : 'border-border'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center">
                      <Layers className="h-4 w-4 text-secondary-foreground" />
                    </div>
                    <div>
                      <span className="font-medium text-sm block">{group.name}</span>
                      <span className="text-xs text-muted-foreground">{group.description}</span>
                    </div>
                  </div>
                </div>
              ))}
              {groups.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Selecciona una organización
                </p>
              )}
            </TabsContent>
            
            <TabsContent value="users" className="m-0 space-y-2">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('userId', user.id);
                    e.dataTransfer.setData('type', 'user');
                  }}
                  onClick={() => setSelectedUser(user)}
                  className={`p-3 rounded-lg border cursor-grab transition-all hover:bg-accent/50 ${
                    selectedUser?.id === user.id ? 'border-primary bg-accent' : 'border-border'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-xs font-medium">
                        {user.full_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm block truncate">{user.full_name}</span>
                      <Badge variant="secondary" className="text-xs">{user.role}</Badge>
                    </div>
                  </div>
                </div>
              ))}
              <CreateUserDialog onCreated={loadData} />
            </TabsContent>
            
            <TabsContent value="resources" className="m-0 space-y-2">
              {resources.map((resource) => (
                <div
                  key={resource.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('resourceId', resource.id);
                    e.dataTransfer.setData('type', 'resource');
                  }}
                  className="p-3 rounded-lg border cursor-grab transition-all hover:bg-accent/50 border-border"
                >
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center">
                      <Server className="h-4 w-4 text-accent-foreground" />
                    </div>
                    <div>
                      <span className="font-medium text-sm block">{resource.name}</span>
                      <Badge variant="outline" className="text-xs">{resource.resource_type}</Badge>
                    </div>
                  </div>
                </div>
              ))}
              {resources.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay recursos
                </p>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </div>

      {/* Main Content - Assignment Panel */}
      <div className="flex-1 flex flex-col gap-4 overflow-auto">
        <Card className="glass">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Asignación de Usuarios y Recursos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-6">
              <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Seleccionar Organización" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <ChevronRight className="h-5 w-5 text-muted-foreground self-center" />
              
              <Select value={selectedGroup} onValueChange={setSelectedGroup} disabled={!selectedOrg}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Seleccionar Grupo" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Drop Zone for Users */}
            {selectedGroup && (
              <div className="grid md:grid-cols-2 gap-4">
                <Card
                  className="border-dashed border-2 min-h-[200px]"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const type = e.dataTransfer.getData('type');
                    if (type === 'user') {
                      const userId = e.dataTransfer.getData('userId');
                      handleAssignUserToGroup(userId);
                    }
                  }}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Usuarios del Grupo
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {assignedUsers.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Arrastra usuarios aquí para asignarlos al grupo
                      </p>
                    ) : (
                      users
                        .filter(u => assignedUsers.includes(u.id))
                        .map((user) => (
                          <div key={user.id} className="flex items-center justify-between p-2 rounded bg-accent/50">
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                                <span className="text-xs">{user.full_name.charAt(0)}</span>
                              </div>
                              <span className="text-sm">{user.full_name}</span>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedUser(user)}
                              >
                                <Server className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSendInvitation(user.id)}
                              >
                                <Mail className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveUserFromGroup(user.id)}
                                className="text-destructive"
                              >
                                ×
                              </Button>
                            </div>
                          </div>
                        ))
                    )}
                  </CardContent>
                </Card>

                {/* Drop Zone for Resources */}
                <Card
                  className="border-dashed border-2 min-h-[200px]"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const type = e.dataTransfer.getData('type');
                    if (type === 'resource') {
                      const resourceId = e.dataTransfer.getData('resourceId');
                      handleAssignResourceToUser(resourceId);
                    }
                  }}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Server className="h-4 w-4" />
                      Recursos Asignados {selectedUser && `a ${selectedUser.full_name}`}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!selectedUser ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Selecciona un usuario para asignar recursos
                      </p>
                    ) : assignedResources.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Arrastra recursos aquí para asignarlos
                      </p>
                    ) : (
                      resources
                        .filter(r => assignedResources.includes(r.id))
                        .map((resource) => (
                          <div key={resource.id} className="flex items-center justify-between p-2 rounded bg-accent/50">
                            <div className="flex items-center gap-2">
                              <Server className="h-4 w-4" />
                              <span className="text-sm">{resource.name}</span>
                            </div>
                            <Badge variant="secondary">{resource.resource_type}</Badge>
                          </div>
                        ))
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Invitation Section */}
            {selectedUser && (
              <Card className="mt-4 border-primary/50">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Laptop2 className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">Enrolar Dispositivo</p>
                        <p className="text-sm text-muted-foreground">
                          Envía una invitación a {selectedUser.full_name} para enrolar su dispositivo
                        </p>
                      </div>
                    </div>
                    <Button 
                      onClick={() => handleSendInvitation(selectedUser.id)}
                      className="glow-neon"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Enviar Invitación
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
