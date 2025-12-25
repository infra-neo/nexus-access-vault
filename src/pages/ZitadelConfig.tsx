import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { 
  Key, 
  Shield, 
  Users, 
  RefreshCw, 
  Check, 
  X, 
  Plus,
  Settings,
  Link2,
  ExternalLink,
  Loader2,
  TestTube,
  Copy,
  Pencil
} from 'lucide-react';

interface ZitadelConfig {
  id: string;
  organization_id: string;
  name: string;
  issuer_url: string;
  client_id: string;
  client_secret?: string;
  redirect_uri: string;
  scopes: string[];
  api_token?: string;
  sync_groups: boolean;
  is_active: boolean;
  created_at: string;
}

interface GroupMapping {
  id: string;
  zitadel_config_id: string;
  zitadel_group_id: string;
  zitadel_group_name: string;
  local_group_id: string | null;
  auto_sync: boolean;
  groups?: { id: string; name: string } | null;
}

interface LocalGroup {
  id: string;
  name: string;
}

const ZitadelConfig = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [configs, setConfigs] = useState<ZitadelConfig[]>([]);
  const [localGroups, setLocalGroups] = useState<LocalGroup[]>([]);
  const [groupMappings, setGroupMappings] = useState<GroupMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<ZitadelConfig | null>(null);
  const [editingConfig, setEditingConfig] = useState<ZitadelConfig | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    issuer_url: '',
    client_id: '',
    client_secret: '',
    redirect_uri: '',
    api_token: '',
    sync_groups: true,
  });

  useEffect(() => {
    fetchConfigs();
    fetchLocalGroups();
  }, []);

  useEffect(() => {
    if (selectedConfig) {
      fetchGroupMappings(selectedConfig.id);
    }
  }, [selectedConfig]);

  const fetchConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('zitadel_configurations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConfigs(data || []);
      if (data && data.length > 0 && !selectedConfig) {
        setSelectedConfig(data[0]);
      }
    } catch (error) {
      console.error('Error fetching Zitadel configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLocalGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setLocalGroups(data || []);
    } catch (error) {
      console.error('Error fetching local groups:', error);
    }
  };

  const fetchGroupMappings = async (configId: string) => {
    try {
      const { data, error } = await supabase
        .from('zitadel_group_mappings')
        .select('*, groups(id, name)')
        .eq('zitadel_config_id', configId)
        .order('zitadel_group_name');

      if (error) throw error;
      setGroupMappings(data || []);
    } catch (error) {
      console.error('Error fetching group mappings:', error);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/zitadel-api?action=test-connection`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            issuerUrl: formData.issuer_url,
            apiToken: formData.api_token,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Edge Function returned a non-2xx status code');
      }

      const result = await response.json();
      if (result.error) throw new Error(result.error);

      toast({
        title: 'Conexión exitosa',
        description: `OIDC endpoints detectados. ${result.apiConnected ? `${result.groupCount} grupos encontrados.` : 'API token no válido o no proporcionado.'}`,
      });
    } catch (error: any) {
      toast({
        title: 'Error de conexión',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  };

  const createConfig = async () => {
    if (!profile?.organization_id) {
      toast({
        title: 'Error',
        description: 'No se encontró la organización',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('zitadel_configurations')
        .insert({
          organization_id: profile.organization_id,
          name: formData.name,
          issuer_url: formData.issuer_url.replace(/\/$/, ''), // Remove trailing slash
          client_id: formData.client_id,
          client_secret: formData.client_secret || null,
          redirect_uri: formData.redirect_uri || `${window.location.origin}/auth/callback`,
          api_token: formData.api_token || null,
          sync_groups: formData.sync_groups,
        });

      if (error) throw error;

      toast({
        title: 'Configuración creada',
        description: 'La configuración de Zitadel se ha guardado correctamente.',
      });

      setShowAddDialog(false);
      setFormData({
        name: '',
        issuer_url: '',
        client_id: '',
        client_secret: '',
        redirect_uri: '',
        api_token: '',
        sync_groups: true,
      });
      fetchConfigs();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (config: ZitadelConfig) => {
    setEditingConfig(config);
    setFormData({
      name: config.name,
      issuer_url: config.issuer_url,
      client_id: config.client_id,
      client_secret: config.client_secret || '',
      redirect_uri: config.redirect_uri,
      api_token: config.api_token || '',
      sync_groups: config.sync_groups,
    });
    setShowEditDialog(true);
  };

  const updateConfig = async () => {
    if (!editingConfig) return;

    try {
      const { error } = await supabase
        .from('zitadel_configurations')
        .update({
          name: formData.name,
          issuer_url: formData.issuer_url.replace(/\/$/, ''),
          client_id: formData.client_id,
          client_secret: formData.client_secret || null,
          redirect_uri: formData.redirect_uri || `${window.location.origin}/auth/callback`,
          api_token: formData.api_token || null,
          sync_groups: formData.sync_groups,
        })
        .eq('id', editingConfig.id);

      if (error) throw error;

      toast({
        title: 'Configuración actualizada',
        description: 'Los cambios se han guardado correctamente.',
      });

      setShowEditDialog(false);
      setEditingConfig(null);
      setFormData({
        name: '',
        issuer_url: '',
        client_id: '',
        client_secret: '',
        redirect_uri: '',
        api_token: '',
        sync_groups: true,
      });
      fetchConfigs();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const syncGroups = async () => {
    if (!selectedConfig) return;

    setSyncing(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/zitadel-api?action=sync-groups`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ configId: selectedConfig.id }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Sync failed');
      }

      const result = await response.json();
      if (result.error) throw new Error(result.error);

      toast({
        title: 'Sincronización completada',
        description: `${result.newGroupsAdded} nuevos grupos agregados. Total: ${result.zitadelGroups?.length || 0} grupos.`,
      });

      fetchGroupMappings(selectedConfig.id);
    } catch (error: any) {
      toast({
        title: 'Error de sincronización',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  const updateGroupMapping = async (mappingId: string, localGroupId: string | null) => {
    try {
      const { error } = await supabase
        .from('zitadel_group_mappings')
        .update({ local_group_id: localGroupId })
        .eq('id', mappingId);

      if (error) throw error;

      toast({
        title: 'Mapeo actualizado',
        description: 'El grupo ha sido vinculado correctamente.',
      });

      if (selectedConfig) {
        fetchGroupMappings(selectedConfig.id);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const toggleConfigStatus = async (config: ZitadelConfig) => {
    try {
      const { error } = await supabase
        .from('zitadel_configurations')
        .update({ is_active: !config.is_active })
        .eq('id', config.id);

      if (error) throw error;

      toast({
        title: config.is_active ? 'Configuración desactivada' : 'Configuración activada',
      });

      fetchConfigs();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const copyRedirectUri = () => {
    const uri = formData.redirect_uri || `${window.location.origin}/auth/callback`;
    navigator.clipboard.writeText(uri);
    toast({ title: 'URI copiado al portapapeles' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Zitadel OIDC</h1>
          <p className="text-muted-foreground">
            Configura la integración con Zitadel para SSO y sincronización de grupos
          </p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Configuración
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Configurar Zitadel OIDC</DialogTitle>
              <DialogDescription>
                Ingresa los datos de tu instancia de Zitadel self-hosted
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    placeholder="Zitadel Producción"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="issuer_url">Issuer URL</Label>
                  <Input
                    id="issuer_url"
                    placeholder="https://gate.kappa4.com"
                    value={formData.issuer_url}
                    onChange={(e) => setFormData({ ...formData, issuer_url: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client_id">Client ID</Label>
                  <Input
                    id="client_id"
                    placeholder="client_id_from_zitadel"
                    value={formData.client_id}
                    onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client_secret">Client Secret</Label>
                  <Input
                    id="client_secret"
                    type="password"
                    placeholder="••••••••••••"
                    value={formData.client_secret}
                    onChange={(e) => setFormData({ ...formData, client_secret: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="redirect_uri">Redirect URI</Label>
                <div className="flex gap-2">
                  <Input
                    id="redirect_uri"
                    placeholder={`${window.location.origin}/auth/callback`}
                    value={formData.redirect_uri}
                    onChange={(e) => setFormData({ ...formData, redirect_uri: e.target.value })}
                  />
                  <Button variant="outline" size="icon" onClick={copyRedirectUri}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Agrega este URI en Zitadel Console → Applications → Redirect URIs
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="api_token">API Token (Management API)</Label>
                <Input
                  id="api_token"
                  type="password"
                  placeholder="Personal Access Token para sincronizar grupos"
                  value={formData.api_token}
                  onChange={(e) => setFormData({ ...formData, api_token: e.target.value })}
                />
                <p className="text-sm text-muted-foreground">
                  Crear en Zitadel Console → Users → Service Accounts → Personal Access Tokens
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="sync_groups"
                    checked={formData.sync_groups}
                    onCheckedChange={(checked) => setFormData({ ...formData, sync_groups: checked })}
                  />
                  <Label htmlFor="sync_groups">Sincronizar grupos automáticamente</Label>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={testConnection} disabled={testing || !formData.issuer_url}>
                  {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TestTube className="mr-2 h-4 w-4" />}
                  Probar Conexión
                </Button>
                <Button onClick={createConfig} disabled={!formData.name || !formData.issuer_url || !formData.client_id}>
                  Guardar Configuración
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {configs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Key className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No hay configuraciones</h3>
            <p className="text-muted-foreground text-center max-w-md mt-2">
              Configura tu instancia de Zitadel para habilitar SSO y sincronización de grupos.
            </p>
            <Button className="mt-4" onClick={() => setShowAddDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Agregar Configuración
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Config List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuraciones
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {configs.map((config) => (
                <div
                  key={config.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedConfig?.id === config.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedConfig(config)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{config.name}</h4>
                      <p className="text-sm text-muted-foreground truncate">
                        {config.issuer_url}
                      </p>
                    </div>
                    <Badge variant={config.is_active ? 'default' : 'secondary'}>
                      {config.is_active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Config Details */}
          {selectedConfig && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedConfig.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Link2 className="h-4 w-4" />
                      {selectedConfig.issuer_url}
                      <a
                        href={`${selectedConfig.issuer_url}/ui/console/`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(selectedConfig)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                    <Switch
                      checked={selectedConfig.is_active}
                      onCheckedChange={() => toggleConfigStatus(selectedConfig)}
                    />
                    <span className="text-sm text-muted-foreground">
                      {selectedConfig.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="details">
                  <TabsList>
                    <TabsTrigger value="details">Detalles</TabsTrigger>
                    <TabsTrigger value="groups">Mapeo de Grupos</TabsTrigger>
                  </TabsList>

                  <TabsContent value="details" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-muted-foreground">Client ID</Label>
                        <p className="font-mono text-sm">{selectedConfig.client_id}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground">Redirect URI</Label>
                        <p className="font-mono text-sm">{selectedConfig.redirect_uri}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground">Scopes</Label>
                        <div className="flex flex-wrap gap-1">
                          {selectedConfig.scopes?.map((scope) => (
                            <Badge key={scope} variant="outline" className="text-xs">
                              {scope}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground">API Token</Label>
                        <div className="flex items-center gap-2">
                          {selectedConfig.api_token ? (
                            <Badge variant="default" className="bg-green-600">
                              <Check className="h-3 w-3 mr-1" />
                              Configurado
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <X className="h-3 w-3 mr-1" />
                              No configurado
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <h4 className="font-medium mb-2">Endpoints OIDC</h4>
                      <div className="space-y-2 text-sm font-mono bg-muted/50 p-3 rounded-lg">
                        <p>Authorization: {selectedConfig.issuer_url}/oauth/v2/authorize</p>
                        <p>Token: {selectedConfig.issuer_url}/oauth/v2/token</p>
                        <p>UserInfo: {selectedConfig.issuer_url}/oidc/v1/userinfo</p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="groups" className="space-y-4 mt-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Vincula los grupos de Zitadel con los grupos locales de la plataforma
                      </p>
                      <Button onClick={syncGroups} disabled={syncing || !selectedConfig.api_token}>
                        {syncing ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-2 h-4 w-4" />
                        )}
                        Sincronizar desde Zitadel
                      </Button>
                    </div>

                    {!selectedConfig.api_token ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Se requiere un API Token para sincronizar grupos</p>
                        <p className="text-sm">Edita la configuración para agregar uno</p>
                      </div>
                    ) : groupMappings.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No hay grupos sincronizados</p>
                        <p className="text-sm">Haz clic en "Sincronizar desde Zitadel" para importar grupos</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Grupo Zitadel</TableHead>
                            <TableHead>Grupo Local</TableHead>
                            <TableHead className="w-24">Auto-sync</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {groupMappings.map((mapping) => (
                            <TableRow key={mapping.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{mapping.zitadel_group_name}</p>
                                  <p className="text-xs text-muted-foreground font-mono">
                                    {mapping.zitadel_group_id}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={mapping.local_group_id || 'none'}
                                  onValueChange={(value) =>
                                    updateGroupMapping(mapping.id, value === 'none' ? null : value)
                                  }
                                >
                                  <SelectTrigger className="w-48">
                                    <SelectValue placeholder="Sin vincular" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Sin vincular</SelectItem>
                                    {localGroups.map((group) => (
                                      <SelectItem key={group.id} value={group.id}>
                                        {group.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Badge variant={mapping.auto_sync ? 'default' : 'secondary'}>
                                  {mapping.auto_sync ? 'Sí' : 'No'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Configuración Zitadel</DialogTitle>
            <DialogDescription>
              Modifica los datos de tu instancia de Zitadel
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nombre</Label>
                <Input
                  id="edit-name"
                  placeholder="Zitadel Producción"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-issuer_url">Issuer URL</Label>
                <Input
                  id="edit-issuer_url"
                  placeholder="https://gate.kappa4.com"
                  value={formData.issuer_url}
                  onChange={(e) => setFormData({ ...formData, issuer_url: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-client_id">Client ID</Label>
                <Input
                  id="edit-client_id"
                  placeholder="client_id_from_zitadel"
                  value={formData.client_id}
                  onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-client_secret">Client Secret</Label>
                <Input
                  id="edit-client_secret"
                  type="password"
                  placeholder="••••••••••••"
                  value={formData.client_secret}
                  onChange={(e) => setFormData({ ...formData, client_secret: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-redirect_uri">Redirect URI</Label>
              <div className="flex gap-2">
                <Input
                  id="edit-redirect_uri"
                  placeholder={`${window.location.origin}/auth/callback`}
                  value={formData.redirect_uri}
                  onChange={(e) => setFormData({ ...formData, redirect_uri: e.target.value })}
                />
                <Button variant="outline" size="icon" onClick={copyRedirectUri}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-api_token">API Token (Management API)</Label>
              <Input
                id="edit-api_token"
                type="password"
                placeholder="Personal Access Token para sincronizar grupos"
                value={formData.api_token}
                onChange={(e) => setFormData({ ...formData, api_token: e.target.value })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-sync_groups"
                  checked={formData.sync_groups}
                  onCheckedChange={(checked) => setFormData({ ...formData, sync_groups: checked })}
                />
                <Label htmlFor="edit-sync_groups">Sincronizar grupos automáticamente</Label>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={testConnection} disabled={testing || !formData.issuer_url}>
                {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TestTube className="mr-2 h-4 w-4" />}
                Probar Conexión
              </Button>
              <Button onClick={updateConfig} disabled={!formData.name || !formData.issuer_url || !formData.client_id}>
                Guardar Cambios
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ZitadelConfig;
