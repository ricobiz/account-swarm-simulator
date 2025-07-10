export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          created_at: string
          id: string
          last_action: string | null
          password: string
          platform: string
          proxy_id: string | null
          status: string
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_action?: string | null
          password: string
          platform: string
          proxy_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          last_action?: string | null
          password?: string
          platform?: string
          proxy_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_accounts_proxy"
            columns: ["proxy_id"]
            isOneToOne: false
            referencedRelation: "proxies"
            referencedColumns: ["id"]
          },
        ]
      }
      logs: {
        Row: {
          account_id: string | null
          action: string
          created_at: string
          details: string | null
          id: string
          scenario_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          action: string
          created_at?: string
          details?: string | null
          id?: string
          scenario_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          action?: string
          created_at?: string
          details?: string | null
          id?: string
          scenario_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "logs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logs_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      multilogin_tokens: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          is_active: boolean
          token: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          is_active?: boolean
          token: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          accounts_limit: number | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          scenarios_limit: number | null
          subscription_end: string | null
          subscription_status: Database["public"]["Enums"]["subscription_status"]
          subscription_tier: string | null
          trial_end: string | null
          updated_at: string
        }
        Insert: {
          accounts_limit?: number | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["app_role"]
          scenarios_limit?: number | null
          subscription_end?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          subscription_tier?: string | null
          trial_end?: string | null
          updated_at?: string
        }
        Update: {
          accounts_limit?: number | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          scenarios_limit?: number | null
          subscription_end?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          subscription_tier?: string | null
          trial_end?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      proxies: {
        Row: {
          country: string | null
          created_at: string
          id: string
          ip: string
          password: string | null
          port: number
          speed: string | null
          status: string
          updated_at: string
          usage: number | null
          user_id: string
          username: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          id?: string
          ip: string
          password?: string | null
          port: number
          speed?: string | null
          status?: string
          updated_at?: string
          usage?: number | null
          user_id: string
          username?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          id?: string
          ip?: string
          password?: string | null
          port?: number
          speed?: string | null
          status?: string
          updated_at?: string
          usage?: number | null
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      rpa_tasks: {
        Row: {
          created_at: string
          id: string
          result_data: Json | null
          status: string
          task_data: Json
          task_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          result_data?: Json | null
          status?: string
          task_data: Json
          task_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          result_data?: Json | null
          status?: string
          task_data?: Json
          task_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      scenarios: {
        Row: {
          accounts_count: number | null
          config: Json | null
          created_at: string
          id: string
          name: string
          next_run: string | null
          platform: string
          progress: number | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accounts_count?: number | null
          config?: Json | null
          created_at?: string
          id?: string
          name: string
          next_run?: string | null
          platform: string
          progress?: number | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accounts_count?: number | null
          config?: Json | null
          created_at?: string
          id?: string
          name?: string
          next_run?: string | null
          platform?: string
          progress?: number | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      audit_sensitive_operation: {
        Args: {
          operation_type: string
          table_name: string
          record_id: string
          details?: Json
        }
        Returns: undefined
      }
      get_current_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "premium" | "basic"
      subscription_status: "active" | "inactive" | "trial" | "expired"
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
      app_role: ["admin", "premium", "basic"],
      subscription_status: ["active", "inactive", "trial", "expired"],
    },
  },
} as const
