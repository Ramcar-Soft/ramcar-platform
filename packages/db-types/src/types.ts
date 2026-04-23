export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      access_events: {
        Row: {
          access_mode: string
          created_at: string
          direction: string
          event_id: string
          evidence_urls: Json | null
          id: string
          notes: string | null
          person_type: string
          registered_by: string
          source: string
          tenant_id: string
          user_id: string | null
          vehicle_id: string | null
          visit_person_id: string | null
        }
        Insert: {
          access_mode?: string
          created_at?: string
          direction: string
          event_id?: string
          evidence_urls?: Json | null
          id?: string
          notes?: string | null
          person_type: string
          registered_by: string
          source?: string
          tenant_id: string
          user_id?: string | null
          vehicle_id?: string | null
          visit_person_id?: string | null
        }
        Update: {
          access_mode?: string
          created_at?: string
          direction?: string
          event_id?: string
          evidence_urls?: Json | null
          id?: string
          notes?: string | null
          person_type?: string
          registered_by?: string
          source?: string
          tenant_id?: string
          user_id?: string | null
          vehicle_id?: string | null
          visit_person_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_events_registered_by_fkey"
            columns: ["registered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_events_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_access_events_visit_person"
            columns: ["visit_person_id"]
            isOneToOne: false
            referencedRelation: "visit_persons"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          observations: string | null
          phone: string | null
          phone_type: string | null
          role: string
          status: string
          tenant_id: string
          updated_at: string
          user_group_ids: string[] | null
          user_id: string
          username: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          observations?: string | null
          phone?: string | null
          phone_type?: string | null
          role: string
          status?: string
          tenant_id: string
          updated_at?: string
          user_group_ids?: string[] | null
          user_id: string
          username?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          observations?: string | null
          phone?: string | null
          phone_type?: string | null
          role?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          user_group_ids?: string[] | null
          user_id?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          address: string
          config: Json
          created_at: string
          id: string
          image_path: string | null
          name: string
          slug: string
          status: string
          time_zone: string
          updated_at: string
        }
        Insert: {
          address?: string
          config?: Json
          created_at?: string
          id?: string
          image_path?: string | null
          name: string
          slug: string
          status?: string
          time_zone?: string
          updated_at?: string
        }
        Update: {
          address?: string
          config?: Json
          created_at?: string
          id?: string
          image_path?: string | null
          name?: string
          slug?: string
          status?: string
          time_zone?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_groups: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_tenants: {
        Row: {
          assigned_by: string
          created_at: string
          id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          assigned_by: string
          created_at?: string
          id?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          assigned_by?: string
          created_at?: string
          id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_tenants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          blacklist_reason: string | null
          blacklist_scope: string | null
          brand: string | null
          color: string | null
          created_at: string
          id: string
          is_blacklisted: boolean
          model: string | null
          notes: string | null
          plate: string | null
          tenant_id: string
          updated_at: string
          user_id: string | null
          vehicle_type: string
          visit_person_id: string | null
          year: number | null
        }
        Insert: {
          blacklist_reason?: string | null
          blacklist_scope?: string | null
          brand?: string | null
          color?: string | null
          created_at?: string
          id?: string
          is_blacklisted?: boolean
          model?: string | null
          notes?: string | null
          plate?: string | null
          tenant_id: string
          updated_at?: string
          user_id?: string | null
          vehicle_type: string
          visit_person_id?: string | null
          year?: number | null
        }
        Update: {
          blacklist_reason?: string | null
          blacklist_scope?: string | null
          brand?: string | null
          color?: string | null
          created_at?: string
          id?: string
          is_blacklisted?: boolean
          model?: string | null
          notes?: string | null
          plate?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string | null
          vehicle_type?: string
          visit_person_id?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_vehicles_visit_person"
            columns: ["visit_person_id"]
            isOneToOne: false
            referencedRelation: "visit_persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      visit_person_images: {
        Row: {
          created_at: string
          id: string
          image_type: string
          storage_path: string
          tenant_id: string
          visit_person_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_type: string
          storage_path: string
          tenant_id: string
          visit_person_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_type?: string
          storage_path?: string
          tenant_id?: string
          visit_person_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_person_images_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_person_images_visit_person_id_fkey"
            columns: ["visit_person_id"]
            isOneToOne: false
            referencedRelation: "visit_persons"
            referencedColumns: ["id"]
          },
        ]
      }
      visit_persons: {
        Row: {
          code: string
          company: string | null
          created_at: string
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          registered_by: string
          resident_id: string | null
          status: string
          tenant_id: string
          type: string
          updated_at: string
        }
        Insert: {
          code: string
          company?: string | null
          created_at?: string
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          registered_by: string
          resident_id?: string | null
          status?: string
          tenant_id: string
          type: string
          updated_at?: string
        }
        Update: {
          code?: string
          company?: string | null
          created_at?: string
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          registered_by?: string
          resident_id?: string | null
          status?: string
          tenant_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_persons_registered_by_fkey"
            columns: ["registered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_persons_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_persons_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      search_access_events: {
        Args: {
          p_date_from: string
          p_date_to_exclusive: string
          p_limit: number
          p_offset: number
          p_person_type: string
          p_resident_id: string
          p_search: string
          p_tenant_ids: string[]
        }
        Returns: {
          access_mode: string
          created_at: string
          direction: string
          guard_full_name: string
          id: string
          notes: string
          person_type: string
          registered_by: string
          res_address: string
          res_full_name: string
          tenant_id: string
          tenant_name: string
          total_count: number
          user_id: string
          vehicle_brand: string
          vehicle_id: string
          vehicle_model: string
          vehicle_plate: string
          visit_person_id: string
          vp_code: string
          vp_company: string
          vp_full_name: string
          vp_phone: string
          vp_resident_full_name: string
          vp_resident_id: string
          vp_status: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

