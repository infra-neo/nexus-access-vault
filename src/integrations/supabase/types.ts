export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          created_at: string | null
          details: Json | null
          event: string
          id: string
          organization_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          event: string
          id?: string
          organization_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          event?: string
          id?: string
          organization_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      authentik_configurations: {
        Row: {
          api_endpoint: string
          api_token: string | null
          created_at: string | null
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          api_endpoint: string
          api_token?: string | null
          created_at?: string | null
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          api_endpoint?: string
          api_token?: string | null
          created_at?: string | null
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "authentik_configurations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cloud_providers: {
        Row: {
          api_endpoint: string | null
          created_at: string | null
          credentials: Json | null
          id: string
          name: string
          organization_id: string
          provider_type: string
        }
        Insert: {
          api_endpoint?: string | null
          created_at?: string | null
          credentials?: Json | null
          id?: string
          name: string
          organization_id: string
          provider_type: string
        }
        Update: {
          api_endpoint?: string | null
          created_at?: string | null
          credentials?: Json | null
          id?: string
          name?: string
          organization_id?: string
          provider_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "cloud_providers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      device_events: {
        Row: {
          created_at: string
          details: Json | null
          device_id: string
          event_type: string
          id: string
          ip_address: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          device_id: string
          event_type: string
          id?: string
          ip_address?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          device_id?: string
          event_type?: string
          id?: string
          ip_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "device_events_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          created_at: string
          device_type: string
          enrolled_at: string | null
          enrollment_expires_at: string | null
          enrollment_token: string | null
          fingerprint: string | null
          id: string
          last_seen: string | null
          location: string | null
          metadata: Json | null
          name: string
          organization_id: string | null
          os: string | null
          status: string
          tailscale_auth_key: string | null
          tailscale_device_id: string | null
          tailscale_hostname: string | null
          tailscale_ip: string | null
          trust_level: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_type?: string
          enrolled_at?: string | null
          enrollment_expires_at?: string | null
          enrollment_token?: string | null
          fingerprint?: string | null
          id?: string
          last_seen?: string | null
          location?: string | null
          metadata?: Json | null
          name: string
          organization_id?: string | null
          os?: string | null
          status?: string
          tailscale_auth_key?: string | null
          tailscale_device_id?: string | null
          tailscale_hostname?: string | null
          tailscale_ip?: string | null
          trust_level?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_type?: string
          enrolled_at?: string | null
          enrollment_expires_at?: string | null
          enrollment_token?: string | null
          fingerprint?: string | null
          id?: string
          last_seen?: string | null
          location?: string | null
          metadata?: Json | null
          name?: string
          organization_id?: string | null
          os?: string | null
          status?: string
          tailscale_auth_key?: string | null
          tailscale_device_id?: string | null
          tailscale_hostname?: string | null
          tailscale_ip?: string | null
          trust_level?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "devices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          ldap_dn: string | null
          name: string
          organization_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          ldap_dn?: string | null
          name: string
          organization_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          ldap_dn?: string | null
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      headscale_instances: {
        Row: {
          api_endpoint: string
          api_key: string | null
          created_at: string | null
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          api_endpoint: string
          api_key?: string | null
          created_at?: string | null
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          api_endpoint?: string
          api_key?: string | null
          created_at?: string | null
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "headscale_instances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      headscale_nodes: {
        Row: {
          created_at: string | null
          headscale_instance_id: string
          id: string
          ip_address: string | null
          last_seen: string | null
          name: string
          node_id: string
          status: string | null
          user_email: string | null
        }
        Insert: {
          created_at?: string | null
          headscale_instance_id: string
          id?: string
          ip_address?: string | null
          last_seen?: string | null
          name: string
          node_id: string
          status?: string | null
          user_email?: string | null
        }
        Update: {
          created_at?: string | null
          headscale_instance_id?: string
          id?: string
          ip_address?: string | null
          last_seen?: string | null
          name?: string
          node_id?: string
          status?: string | null
          user_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "headscale_nodes_headscale_instance_id_fkey"
            columns: ["headscale_instance_id"]
            isOneToOne: false
            referencedRelation: "headscale_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      hypervisors: {
        Row: {
          api_endpoint: string
          created_at: string | null
          credentials: Json | null
          hypervisor_type: string
          id: string
          metadata: Json | null
          name: string
          organization_id: string
        }
        Insert: {
          api_endpoint: string
          created_at?: string | null
          credentials?: Json | null
          hypervisor_type: string
          id?: string
          metadata?: Json | null
          name: string
          organization_id: string
        }
        Update: {
          api_endpoint?: string
          created_at?: string | null
          credentials?: Json | null
          hypervisor_type?: string
          id?: string
          metadata?: Json | null
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hypervisors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ldap_configurations: {
        Row: {
          base_dn: string
          bind_dn: string | null
          created_at: string | null
          credentials: Json | null
          id: string
          name: string
          organization_id: string
          server_url: string
        }
        Insert: {
          base_dn: string
          bind_dn?: string | null
          created_at?: string | null
          credentials?: Json | null
          id?: string
          name: string
          organization_id: string
          server_url: string
        }
        Update: {
          base_dn?: string
          bind_dn?: string | null
          created_at?: string | null
          credentials?: Json | null
          id?: string
          name?: string
          organization_id?: string
          server_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "ldap_configurations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_tailscale_config: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          organization_id: string
          tags: string[] | null
          tailscale_auth_key: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          organization_id: string
          tags?: string[] | null
          tailscale_auth_key: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string
          tags?: string[] | null
          tailscale_auth_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_tailscale_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string
          logo_url: string | null
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      policies: {
        Row: {
          applies_to: number | null
          conditions: Json | null
          created_at: string
          description: string | null
          id: string
          name: string
          organization_id: string
          policy_type: string
          status: string
          updated_at: string
        }
        Insert: {
          applies_to?: number | null
          conditions?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organization_id: string
          policy_type?: string
          status?: string
          updated_at?: string
        }
        Update: {
          applies_to?: number | null
          conditions?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          policy_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "policies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          full_name: string
          id: string
          organization_id: string | null
          role: Database["public"]["Enums"]["user_role"] | null
        }
        Insert: {
          created_at?: string | null
          full_name: string
          id: string
          organization_id?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
        }
        Update: {
          created_at?: string | null
          full_name?: string
          id?: string
          organization_id?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_permissions: {
        Row: {
          created_at: string | null
          id: string
          permission_level: string
          resource_id: string
          subject_id: string
          subject_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          permission_level: string
          resource_id: string
          subject_id: string
          subject_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          permission_level?: string
          resource_id?: string
          subject_id?: string
          subject_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_permissions_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          connection_method: string
          created_at: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          name: string
          organization_id: string
          resource_type: Database["public"]["Enums"]["resource_type"]
        }
        Insert: {
          connection_method: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          name: string
          organization_id: string
          resource_type: Database["public"]["Enums"]["resource_type"]
        }
        Update: {
          connection_method?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          name?: string
          organization_id?: string
          resource_type?: Database["public"]["Enums"]["resource_type"]
        }
        Relationships: [
          {
            foreignKeyName: "resources_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission_id: string
          role: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission_id: string
          role: string
        }
        Update: {
          created_at?: string
          id?: string
          permission_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_groups: {
        Row: {
          created_at: string
          group_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_groups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_groups_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_resource_access: {
        Row: {
          activated_at: string | null
          created_at: string | null
          id: string
          resource_id: string
          revoked_at: string | null
          status: Database["public"]["Enums"]["access_status"] | null
          user_id: string
        }
        Insert: {
          activated_at?: string | null
          created_at?: string | null
          id?: string
          resource_id: string
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["access_status"] | null
          user_id: string
        }
        Update: {
          activated_at?: string | null
          created_at?: string | null
          id?: string
          resource_id?: string
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["access_status"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_resource_access_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_resource_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_org_id: { Args: { _user_id: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
    }
    Enums: {
      access_status: "pending" | "active" | "revoked"
      resource_type:
        | "windows_vm"
        | "linux_vm"
        | "rdp"
        | "ssh"
        | "guacamole_session"
        | "tsplus_html5"
        | "tailscale_node"
        | "custom"
        | "web_app"
        | "direct"
      user_role: "global_admin" | "org_admin" | "support" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      access_status: ["pending", "active", "revoked"],
      resource_type: [
        "windows_vm",
        "linux_vm",
        "rdp",
        "ssh",
        "guacamole_session",
        "tsplus_html5",
        "tailscale_node",
        "custom",
        "web_app",
        "direct",
      ],
      user_role: ["global_admin", "org_admin", "support", "user"],
    },
  },
} as const
