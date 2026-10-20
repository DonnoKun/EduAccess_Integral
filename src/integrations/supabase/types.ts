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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      course_cache: {
        Row: {
          cache_key: string
          content: Json
          created_at: string
          id: string
          language: string
          title: string
          updated_at: string
        }
        Insert: {
          cache_key: string
          content: Json
          created_at?: string
          id?: string
          language?: string
          title: string
          updated_at?: string
        }
        Update: {
          cache_key?: string
          content?: Json
          created_at?: string
          id?: string
          language?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      course_images: {
        Row: {
          alt: string | null
          cache_key: string
          created_at: string
          id: string
          image_url: string
          prompt: string
        }
        Insert: {
          alt?: string | null
          cache_key: string
          created_at?: string
          id?: string
          image_url: string
          prompt: string
        }
        Update: {
          alt?: string | null
          cache_key?: string
          created_at?: string
          id?: string
          image_url?: string
          prompt?: string
        }
        Relationships: []
      }
      group_enrollments: {
        Row: {
          created_at: string
          group_id: string
          id: string
          student_id: string
          teacher_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          student_id: string
          teacher_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          student_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_enrollments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_lessons: {
        Row: {
          content: Json
          created_at: string
          created_by: string
          description: string
          group_id: string
          id: string
          published_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          created_by: string
          description?: string
          group_id: string
          id?: string
          published_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          created_by?: string
          description?: string
          group_id?: string
          id?: string
          published_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_lessons_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          description: string
          id: string
          join_code: string
          level: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          join_code: string
          level?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          join_code?: string
          level?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      lesson_progress: {
        Row: {
          completed: boolean
          created_at: string
          exercises_completed: number
          exercises_total: number
          group_id: string
          id: string
          lesson_id: string
          progress_percentage: number
          student_id: string
          time_spent_seconds: number
          updated_at: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          exercises_completed?: number
          exercises_total?: number
          group_id: string
          id?: string
          lesson_id: string
          progress_percentage?: number
          student_id: string
          time_spent_seconds?: number
          updated_at?: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          exercises_completed?: number
          exercises_total?: number
          group_id?: string
          id?: string
          lesson_id?: string
          progress_percentage?: number
          student_id?: string
          time_spent_seconds?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "group_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          current_theme: string
          has_completed_onboarding: boolean
          id: string
          reading_guide_enabled: boolean
          updated_at: string
          user_id: string
          user_name: string
          visual_preferences: Json
        }
        Insert: {
          created_at?: string
          current_theme?: string
          has_completed_onboarding?: boolean
          id?: string
          reading_guide_enabled?: boolean
          updated_at?: string
          user_id: string
          user_name?: string
          visual_preferences?: Json
        }
        Update: {
          created_at?: string
          current_theme?: string
          has_completed_onboarding?: boolean
          id?: string
          reading_guide_enabled?: boolean
          updated_at?: string
          user_id?: string
          user_name?: string
          visual_preferences?: Json
        }
        Relationships: []
      }
      session_analytics: {
        Row: {
          content_viewed: number
          created_at: string
          id: string
          session_end: string | null
          session_start: string
          tasks_completed: number
          total_time_seconds: number
          user_id: string
        }
        Insert: {
          content_viewed?: number
          created_at?: string
          id?: string
          session_end?: string | null
          session_start?: string
          tasks_completed?: number
          total_time_seconds?: number
          user_id: string
        }
        Update: {
          content_viewed?: number
          created_at?: string
          id?: string
          session_end?: string | null
          session_start?: string
          tasks_completed?: number
          total_time_seconds?: number
          user_id?: string
        }
        Relationships: []
      }
      user_library: {
        Row: {
          content_data: Json
          created_at: string
          exercises_completed: number
          exercises_total: number
          id: string
          progress_percentage: number
          status: string
          time_spent_seconds: number
          updated_at: string
          user_id: string
        }
        Insert: {
          content_data: Json
          created_at?: string
          exercises_completed?: number
          exercises_total?: number
          id?: string
          progress_percentage?: number
          status?: string
          time_spent_seconds?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          content_data?: Json
          created_at?: string
          exercises_completed?: number
          exercises_total?: number
          id?: string
          progress_percentage?: number
          status?: string
          time_spent_seconds?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_searches: {
        Row: {
          created_at: string
          id: string
          query: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          query: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          query?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      enroll_student_by_email: {
        Args: { _email: string; _group_id: string }
        Returns: Json
      }
      find_group_by_code: {
        Args: { _code: string }
        Returns: {
          description: string
          id: string
          level: string
          name: string
          owner_id: string
        }[]
      }
      get_group_roster: {
        Args: { _group_id: string }
        Returns: {
          enrolled_at: string
          student_id: string
          student_name: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_group_member: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      is_group_owner: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "teacher" | "student"
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
      app_role: ["teacher", "student"],
    },
  },
} as const
