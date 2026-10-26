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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      application_research: {
        Row: {
          cache_key: string
          checked_at: string
          data: Json
          id: string
          user_id: string
        }
        Insert: {
          cache_key: string
          checked_at?: string
          data?: Json
          id?: string
          user_id?: string
        }
        Update: {
          cache_key?: string
          checked_at?: string
          data?: Json
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_interactions: {
        Row: {
          company: string
          context: string
          created_at: string
          id: string
          kind: string
          messages: Json
          model: string
          user_id: string
        }
        Insert: {
          company?: string
          context?: string
          created_at?: string
          id?: string
          kind?: string
          messages?: Json
          model?: string
          user_id?: string
        }
        Update: {
          company?: string
          context?: string
          created_at?: string
          id?: string
          kind?: string
          messages?: Json
          model?: string
          user_id?: string
        }
        Relationships: []
      }
      company_sharing: {
        Row: {
          share: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          share?: boolean
          updated_at?: string
          user_id?: string
        }
        Update: {
          share?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      demo_usage: {
        Row: {
          bucket: string
          day: string
          kind: string
          used: number
        }
        Insert: {
          bucket: string
          day?: string
          kind: string
          used?: number
        }
        Update: {
          bucket?: string
          day?: string
          kind?: string
          used?: number
        }
        Relationships: []
      }
      feature_allowance_usage: {
        Row: {
          created_at: string
          kind: string
          period: string
          resource: string
          user_id: string
        }
        Insert: {
          created_at?: string
          kind: string
          period: string
          resource: string
          user_id: string
        }
        Update: {
          created_at?: string
          kind?: string
          period?: string
          resource?: string
          user_id?: string
        }
        Relationships: []
      }
      resume_versions: {
        Row: {
          created_at: string
          data: Json
          id: string
          label: string
          resume_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data: Json
          id?: string
          label?: string
          resume_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          label?: string
          resume_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resume_versions_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
        ]
      }
      resumes: {
        Row: {
          created_at: string
          data: Json
          extracted_text: string
          id: string
          original_path: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          extracted_text?: string
          id?: string
          original_path?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          data?: Json
          extracted_text?: string
          id?: string
          original_path?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      role_assessments: {
        Row: {
          answers: Json
          company: string
          created_at: string
          feedback: Json
          id: string
          job_url: string
          questions: Json
          resume_id: string | null
          role: string
          score: number | null
          submitted_at: string | null
          user_id: string
        }
        Insert: {
          answers?: Json
          company?: string
          created_at?: string
          feedback?: Json
          id?: string
          job_url?: string
          questions?: Json
          resume_id?: string | null
          role?: string
          score?: number | null
          submitted_at?: string | null
          user_id?: string
        }
        Update: {
          answers?: Json
          company?: string
          created_at?: string
          feedback?: Json
          id?: string
          job_url?: string
          questions?: Json
          resume_id?: string | null
          role?: string
          score?: number | null
          submitted_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      saved_roles: {
        Row: {
          company: string
          created_at: string
          id: string
          status: string
          title: string
          url: string
          user_id: string
        }
        Insert: {
          company: string
          created_at?: string
          id?: string
          status?: string
          title: string
          url: string
          user_id?: string
        }
        Update: {
          company?: string
          created_at?: string
          id?: string
          status?: string
          title?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      search_history: {
        Row: {
          company: string
          created_at: string
          id: string
          kind: string
          query: string
          urls: Json
          user_id: string
        }
        Insert: {
          company?: string
          created_at?: string
          id?: string
          kind?: string
          query: string
          urls?: Json
          user_id?: string
        }
        Update: {
          company?: string
          created_at?: string
          id?: string
          kind?: string
          query?: string
          urls?: Json
          user_id?: string
        }
        Relationships: []
      }
      shared_companies: {
        Row: {
          confirmed_at: string | null
          created_at: string
          display_name: string
          industry: string
          location: string
          logo_url: string
          name_key: string
          one_liner: string
          user_id: string
          website: string | null
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          display_name: string
          industry?: string
          location?: string
          logo_url?: string
          name_key: string
          one_liner?: string
          user_id?: string
          website?: string | null
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          display_name?: string
          industry?: string
          location?: string
          logo_url?: string
          name_key?: string
          one_liner?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      user_api_keys: {
        Row: {
          model: string
          nebius: string
          tavily: string
          updated_at: string
          user_id: string
        }
        Insert: {
          model?: string
          nebius?: string
          tavily?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          model?: string
          nebius?: string
          tavily?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_dataset: { Args: never; Returns: Json }
      admin_stats: { Args: never; Returns: Json }
      admin_storage: { Args: never; Returns: Json }
      community_catalog: {
        Args: never
        Returns: {
          industry: string
          location: string
          logo_url: string
          name: string
          one_liner: string
          people: number
          website: string
        }[]
      }
      community_companies: {
        Args: never
        Returns: {
          name: string
          people: number
        }[]
      }
      consume_feature_allowance: {
        Args: { _kind: string; _resource: string; _user: string }
        Returns: number
      }
      demo_consume: {
        Args: { _bucket: string; _kind: string; _limit: number }
        Returns: number
      }
      demo_used: { Args: { _bucket: string; _kind: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      resume_upload_authorized: { Args: { _path: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "user"],
    },
  },
} as const
