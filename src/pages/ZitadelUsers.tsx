import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Users, Link2, Unlink, Clock, Shield } from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface ZitadelUser {
  id: string;
  user_id: string;
  zitadel_user_id: string;
  zitadel_groups: string[] | null;
  last_synced_at: string | null;
  created_at: string | null;
  profile: {
    id: string;
    full_name: string;
    role: string | null;
    organization_id: string | null;
  } | null;
  zitadel_config: {
    id: string;
    name: string;
    issuer_url: string;
  } | null;
}

export default function ZitadelUsers() {
  const [users, setUsers] = useState<ZitadelUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_zitadel_identities")
        .select(`
          id,
          user_id,
          zitadel_user_id,
          zitadel_groups,
          last_synced_at,
          created_at,
          profiles:user_id (
            id,
            full_name,
            role,
            organization_id
          ),
          zitadel_configurations:zitadel_config_id (
            id,
            name,
            issuer_url
          )
        `)
        .order("last_synced_at", { ascending: false });

      if (error) throw error;

      const formattedUsers = (data || []).map((item: any) => ({
        id: item.id,
        user_id: item.user_id,
        zitadel_user_id: item.zitadel_user_id,
        zitadel_groups: item.zitadel_groups,
        last_synced_at: item.last_synced_at,
        created_at: item.created_at,
        profile: item.profiles,
        zitadel_config: item.zitadel_configurations,
      }));

      setUsers(formattedUsers);
    } catch (error: any) {
      console.error("Error fetching Zitadel users:", error);
      toast.error("Error al cargar usuarios de Zitadel");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const syncUserGroups = async (userId: string, zitadelConfigId: string) => {
    setSyncing(userId);
    try {
      const { data: config } = await supabase
        .from("zitadel_configurations")
        .select("api_token, issuer_url")
        .eq("id", zitadelConfigId)
        .single();

      if (!config?.api_token) {
        toast.error("API Token no configurado para esta instancia de Zitadel");
        return;
      }

      const identity = users.find(u => u.user_id === userId);
      if (!identity) return;

      // Update last synced timestamp
      await supabase
        .from("user_zitadel_identities")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("user_id", userId);

      toast.success("Sincronización completada");
      fetchUsers();
    } catch (error: any) {
      console.error("Error syncing user:", error);
      toast.error("Error al sincronizar usuario");
    } finally {
      setSyncing(null);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getSyncStatus = (lastSynced: string | null) => {
    if (!lastSynced) return { status: "never", label: "Nunca sincronizado", variant: "secondary" as const };
    
    const syncDate = new Date(lastSynced);
    const now = new Date();
    const hoursDiff = (now.getTime() - syncDate.getTime()) / (1000 * 60 * 60);
    
    if (hoursDiff < 1) return { status: "recent", label: "Reciente", variant: "default" as const };
    if (hoursDiff < 24) return { status: "today", label: "Hoy", variant: "secondary" as const };
    if (hoursDiff < 168) return { status: "week", label: "Esta semana", variant: "outline" as const };
    return { status: "old", label: "Antiguo", variant: "destructive" as const };
  };

  const stats = {
    total: users.length,
    linked: users.filter(u => u.profile).length,
    unlinked: users.filter(u => !u.profile).length,
    withGroups: users.filter(u => u.zitadel_groups && u.zitadel_groups.length > 0).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Usuarios Zitadel</h1>
          <p className="text-muted-foreground">
            Gestiona los usuarios sincronizados desde Zitadel
          </p>
        </div>
        <Button onClick={fetchUsers} variant="outline" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vinculados</CardTitle>
            <Link2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.linked}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sin Vincular</CardTitle>
            <Unlink className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.unlinked}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Con Grupos</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.withGroups}</div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Identidades Sincronizadas</CardTitle>
          <CardDescription>
            Lista de usuarios que han iniciado sesión con Zitadel SSO
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Sin usuarios sincronizados</h3>
              <p className="text-muted-foreground">
                Los usuarios aparecerán aquí cuando inicien sesión con Zitadel SSO
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Instancia Zitadel</TableHead>
                  <TableHead>ID Zitadel</TableHead>
                  <TableHead>Grupos</TableHead>
                  <TableHead>Estado Sync</TableHead>
                  <TableHead>Última Sincronización</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const syncStatus = getSyncStatus(user.last_synced_at);
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {user.profile ? getInitials(user.profile.full_name) : "??"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {user.profile?.full_name || "Usuario no vinculado"}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {user.profile ? (
                                <Badge variant="outline" className="text-xs">
                                  {user.profile.role || "user"}
                                </Badge>
                              ) : (
                                <Badge variant="destructive" className="text-xs">
                                  Sin cuenta local
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{user.zitadel_config?.name || "Desconocido"}</span>
                          <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {user.zitadel_config?.issuer_url}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {user.zitadel_user_id.slice(0, 12)}...
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.zitadel_groups && user.zitadel_groups.length > 0 ? (
                            user.zitadel_groups.slice(0, 3).map((group, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {group}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-sm">Sin grupos</span>
                          )}
                          {user.zitadel_groups && user.zitadel_groups.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{user.zitadel_groups.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={syncStatus.variant}>
                          {syncStatus.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.last_synced_at ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span title={format(new Date(user.last_synced_at), "PPpp", { locale: es })}>
                              {formatDistanceToNow(new Date(user.last_synced_at), { 
                                addSuffix: true, 
                                locale: es 
                              })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => user.zitadel_config && syncUserGroups(user.user_id, user.zitadel_config.id)}
                          disabled={syncing === user.user_id || !user.zitadel_config}
                        >
                          <RefreshCw className={`h-4 w-4 ${syncing === user.user_id ? "animate-spin" : ""}`} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
