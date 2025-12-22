import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
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
  Search,
  ArrowRight,
  X,
  Link2,
  Unlink
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
import { ClientOnboardingWizard } from '@/components/admin/ClientOnboardingWizard';

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

interface FlowNode {
  id: string;
  type: 'organization' | 'group' | 'user' | 'resource';
  data: Organization | Group | Profile | Resource;
  position: { x: number; y: number };
}

interface FlowConnection {
  id: string;
  from: string;
  to: string;
  type: 'org-group' | 'group-user' | 'user-resource';
}

export default function AdminPanel() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const canvasRef = useRef<HTMLDivElement>(null);
  
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  
  const [selectedOrg, setSelectedOrg] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  
  const [flowNodes, setFlowNodes] = useState<FlowNode[]>([]);
  const [flowConnections, setFlowConnections] = useState<FlowConnection[]>([]);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState('organizations');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [draggedNode, setDraggedNode] = useState<FlowNode | null>(null);
  const [showOnboardingWizard, setShowOnboardingWizard] = useState(false);

  useEffect(() => {
    loadData();
  }, [profile]);

  useEffect(() => {
    if (selectedOrg) {
      loadGroups();
      loadResources();
      loadExistingConnections();
    }
  }, [selectedOrg]);

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
      } else if (orgs && orgs.length > 0) {
        setSelectedOrg(orgs[0].id);
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

  const loadExistingConnections = async () => {
    // Load user-group connections
    const { data: userGroups } = await supabase
      .from('user_groups')
      .select('user_id, group_id');
    
    // Load user-resource connections
    const { data: userResources } = await supabase
      .from('user_resource_access')
      .select('user_id, resource_id')
      .eq('status', 'active');
    
    const connections: FlowConnection[] = [];
    
    userGroups?.forEach(ug => {
      connections.push({
        id: `ug-${ug.user_id}-${ug.group_id}`,
        from: `group-${ug.group_id}`,
        to: `user-${ug.user_id}`,
        type: 'group-user'
      });
    });
    
    userResources?.forEach(ur => {
      connections.push({
        id: `ur-${ur.user_id}-${ur.resource_id}`,
        from: `user-${ur.user_id}`,
        to: `resource-${ur.resource_id}`,
        type: 'user-resource'
      });
    });
    
    setFlowConnections(connections);
  };

  const handleDragStart = (e: React.DragEvent, item: any, type: string) => {
    e.dataTransfer.setData('item', JSON.stringify(item));
    e.dataTransfer.setData('type', type);
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const type = e.dataTransfer.getData('type');
    const item = JSON.parse(e.dataTransfer.getData('item'));
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const nodeId = `${type}-${item.id}`;
    
    // Check if node already exists
    if (flowNodes.find(n => n.id === nodeId)) {
      toast({
        title: 'Ya existe',
        description: 'Este elemento ya está en el canvas',
        variant: 'destructive',
      });
      return;
    }
    
    const newNode: FlowNode = {
      id: nodeId,
      type: type as FlowNode['type'],
      data: item,
      position: { x, y }
    };
    
    setFlowNodes([...flowNodes, newNode]);
  };

  const handleNodeClick = (nodeId: string) => {
    if (connectingFrom) {
      if (connectingFrom !== nodeId) {
        createConnection(connectingFrom, nodeId);
      }
      setConnectingFrom(null);
    }
  };

  const startConnection = (nodeId: string) => {
    setConnectingFrom(nodeId);
    toast({
      title: 'Conectando',
      description: 'Haz clic en otro nodo para crear la conexión',
    });
  };

  const createConnection = async (fromId: string, toId: string) => {
    const fromNode = flowNodes.find(n => n.id === fromId);
    const toNode = flowNodes.find(n => n.id === toId);
    
    if (!fromNode || !toNode) return;
    
    // Validate connection types
    if (fromNode.type === 'group' && toNode.type === 'user') {
      try {
        const groupId = (fromNode.data as Group).id;
        const userId = (toNode.data as Profile).id;
        
        const { error } = await supabase
          .from('user_groups')
          .insert({ group_id: groupId, user_id: userId });
        
        if (error) throw error;
        
        setFlowConnections([...flowConnections, {
          id: `ug-${userId}-${groupId}`,
          from: fromId,
          to: toId,
          type: 'group-user'
        }]);
        
        toast({ title: 'Conexión creada', description: 'Usuario asignado al grupo' });
      } catch (error: any) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
    } else if (fromNode.type === 'user' && toNode.type === 'resource') {
      try {
        const userId = (fromNode.data as Profile).id;
        const resourceId = (toNode.data as Resource).id;
        
        const { error } = await supabase
          .from('user_resource_access')
          .insert({ user_id: userId, resource_id: resourceId, status: 'active' });
        
        if (error) throw error;
        
        setFlowConnections([...flowConnections, {
          id: `ur-${userId}-${resourceId}`,
          from: fromId,
          to: toId,
          type: 'user-resource'
        }]);
        
        toast({ title: 'Conexión creada', description: 'Recurso asignado al usuario' });
      } catch (error: any) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
    } else {
      toast({ 
        title: 'Conexión inválida', 
        description: 'Solo puedes conectar: Grupo→Usuario o Usuario→Recurso',
        variant: 'destructive'
      });
    }
  };

  const removeConnection = async (connectionId: string) => {
    const connection = flowConnections.find(c => c.id === connectionId);
    if (!connection) return;
    
    try {
      if (connection.type === 'group-user') {
        const [, userId, groupId] = connection.id.split('-');
        await supabase
          .from('user_groups')
          .delete()
          .eq('user_id', userId)
          .eq('group_id', groupId);
      } else if (connection.type === 'user-resource') {
        const [, userId, resourceId] = connection.id.split('-');
        await supabase
          .from('user_resource_access')
          .delete()
          .eq('user_id', userId)
          .eq('resource_id', resourceId);
      }
      
      setFlowConnections(flowConnections.filter(c => c.id !== connectionId));
      toast({ title: 'Conexión eliminada' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const removeNode = (nodeId: string) => {
    setFlowNodes(flowNodes.filter(n => n.id !== nodeId));
    setFlowConnections(flowConnections.filter(c => c.from !== nodeId && c.to !== nodeId));
  };

  const handleSendInvitation = (userId: string) => {
    const user = users.find(u => u.id === userId);
    toast({
      title: 'Invitación enviada',
      description: `Se ha enviado una invitación a ${user?.full_name || 'el usuario'}`,
    });
  };

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'organization': return 'bg-violet-500/20 border-violet-500 text-violet-300';
      case 'group': return 'bg-blue-500/20 border-blue-500 text-blue-300';
      case 'user': return 'bg-emerald-500/20 border-emerald-500 text-emerald-300';
      case 'resource': return 'bg-amber-500/20 border-amber-500 text-amber-300';
      default: return 'bg-muted border-border';
    }
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'organization': return <Building2 className="h-4 w-4" />;
      case 'group': return <Layers className="h-4 w-4" />;
      case 'user': return <Users className="h-4 w-4" />;
      case 'resource': return <Server className="h-4 w-4" />;
      default: return null;
    }
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

  // Calculate connection lines
  const renderConnections = () => {
    return flowConnections.map(conn => {
      const fromNode = flowNodes.find(n => n.id === conn.from);
      const toNode = flowNodes.find(n => n.id === conn.to);
      
      if (!fromNode || !toNode) return null;
      
      const x1 = fromNode.position.x + 75;
      const y1 = fromNode.position.y + 30;
      const x2 = toNode.position.x + 75;
      const y2 = toNode.position.y + 30;
      
      const midX = (x1 + x2) / 2;
      
      return (
        <g key={conn.id}>
          <path
            d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
            stroke={conn.type === 'group-user' ? '#3b82f6' : '#f59e0b'}
            strokeWidth="2"
            fill="none"
            className="cursor-pointer hover:stroke-destructive transition-colors"
            onClick={() => removeConnection(conn.id)}
          />
          <circle 
            cx={midX} 
            cy={(y1 + y2) / 2} 
            r="6" 
            fill="hsl(var(--background))"
            stroke={conn.type === 'group-user' ? '#3b82f6' : '#f59e0b'}
            strokeWidth="2"
            className="cursor-pointer hover:fill-destructive hover:stroke-destructive transition-colors"
            onClick={() => removeConnection(conn.id)}
          />
          <Unlink 
            x={midX - 4} 
            y={(y1 + y2) / 2 - 4} 
            className="h-2 w-2 text-muted-foreground pointer-events-none" 
          />
        </g>
      );
    });
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4">
      {/* Left Sidebar - Records List */}
      <div className="w-72 flex flex-col border-r border-border bg-card/50 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Panel de Administración</h2>
            {profile?.role === 'global_admin' && (
              <Dialog open={showOnboardingWizard} onOpenChange={setShowOnboardingWizard}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="default">
                    <Plus className="h-4 w-4 mr-1" />
                    Cliente
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <ClientOnboardingWizard 
                    onComplete={() => {
                      setShowOnboardingWizard(false);
                      loadData();
                    }}
                  />
                </DialogContent>
              </Dialog>
            )}
          </div>
          <Select value={selectedOrg} onValueChange={setSelectedOrg}>
            <SelectTrigger className="mb-3">
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
          <TabsList className="grid grid-cols-3 mx-4 mt-4">
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
            <TabsContent value="groups" className="m-0 space-y-2">
              <p className="text-xs text-muted-foreground mb-2">Arrastra grupos al canvas</p>
              {filteredGroups.map((group) => (
                <div
                  key={group.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, group, 'group')}
                  className="p-3 rounded-lg border cursor-grab transition-all hover:bg-blue-500/10 border-blue-500/30 hover:border-blue-500"
                >
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <div className="h-8 w-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <Layers className="h-4 w-4 text-blue-400" />
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
                  No hay grupos
                </p>
              )}
            </TabsContent>
            
            <TabsContent value="users" className="m-0 space-y-2">
              <p className="text-xs text-muted-foreground mb-2">Arrastra usuarios al canvas</p>
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, user, 'user')}
                  className="p-3 rounded-lg border cursor-grab transition-all hover:bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500"
                >
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <span className="text-xs font-medium text-emerald-400">
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
              <p className="text-xs text-muted-foreground mb-2">Arrastra recursos al canvas</p>
              {resources.map((resource) => (
                <div
                  key={resource.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, resource, 'resource')}
                  className="p-3 rounded-lg border cursor-grab transition-all hover:bg-amber-500/10 border-amber-500/30 hover:border-amber-500"
                >
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <div className="h-8 w-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                      <Server className="h-4 w-4 text-amber-400" />
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

      {/* Main Canvas - Flow Diagram */}
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        <Card className="glass">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                Canvas de Asignaciones
              </CardTitle>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-blue-500/50" />
                  <span>Grupo</span>
                </div>
                <ArrowRight className="h-3 w-3" />
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-emerald-500/50" />
                  <span>Usuario</span>
                </div>
                <ArrowRight className="h-3 w-3" />
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-amber-500/50" />
                  <span>Recurso</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div 
              ref={canvasRef}
              className="relative w-full h-[500px] bg-gradient-to-br from-background to-muted/20 border-t border-border overflow-hidden"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleCanvasDrop}
              style={{
                backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--muted)) 1px, transparent 0)',
                backgroundSize: '24px 24px'
              }}
            >
              {/* SVG for connections */}
              <svg className="absolute inset-0 pointer-events-none" style={{ pointerEvents: 'visiblePainted' }}>
                {renderConnections()}
              </svg>
              
              {/* Nodes */}
              {flowNodes.map((node) => (
                <div
                  key={node.id}
                  className={`absolute p-3 rounded-lg border-2 cursor-move transition-all hover:shadow-lg ${getNodeColor(node.type)} ${
                    connectingFrom === node.id ? 'ring-2 ring-primary' : ''
                  }`}
                  style={{
                    left: node.position.x,
                    top: node.position.y,
                    minWidth: '150px'
                  }}
                  onClick={() => handleNodeClick(node.id)}
                  draggable
                  onDragStart={(e) => {
                    setDraggedNode(node);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragEnd={(e) => {
                    const rect = canvasRef.current?.getBoundingClientRect();
                    if (!rect || !draggedNode) return;
                    
                    setFlowNodes(nodes => nodes.map(n => 
                      n.id === draggedNode.id 
                        ? { ...n, position: { x: e.clientX - rect.left - 75, y: e.clientY - rect.top - 30 } }
                        : n
                    ));
                    setDraggedNode(null);
                  }}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      {getNodeIcon(node.type)}
                      <Badge variant="outline" className="text-xs capitalize">{node.type}</Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          startConnection(node.id);
                        }}
                      >
                        <Link2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeNode(node.id);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm font-medium">
                    {'name' in node.data ? node.data.name : 
                     'full_name' in node.data ? (node.data as Profile).full_name : 'Unknown'}
                  </p>
                  {node.type === 'user' && (
                    <div className="mt-2 flex gap-1">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="text-xs h-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSendInvitation((node.data as Profile).id);
                        }}
                      >
                        <Mail className="h-3 w-3 mr-1" />
                        Invitar
                      </Button>
                    </div>
                  )}
                </div>
              ))}
              
              {/* Empty state */}
              {flowNodes.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">Arrastra elementos aquí</p>
                    <p className="text-sm">Grupos, usuarios y recursos para crear asignaciones</p>
                    <div className="mt-4 flex items-center justify-center gap-2 text-xs">
                      <Badge variant="outline" className="text-blue-400 border-blue-400">Grupo</Badge>
                      <ArrowRight className="h-3 w-3" />
                      <Badge variant="outline" className="text-emerald-400 border-emerald-400">Usuario</Badge>
                      <ArrowRight className="h-3 w-3" />
                      <Badge variant="outline" className="text-amber-400 border-amber-400">Recurso</Badge>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="glass">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Layers className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{groups.length}</p>
                  <p className="text-xs text-muted-foreground">Grupos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <Users className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{filteredUsers.length}</p>
                  <p className="text-xs text-muted-foreground">Usuarios</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <Server className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{resources.length}</p>
                  <p className="text-xs text-muted-foreground">Recursos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
