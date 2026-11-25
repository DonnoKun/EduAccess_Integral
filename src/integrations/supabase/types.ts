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
      account_recovery: {
        Row: {
          code_hash: string
          updated_at: string
          user_id: string
        }
        Insert: {
          code_hash: string
          updated_at?: string
          user_id: string
        }
        Update: {
          code_hash?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_cache: {
        Row: {
          function_name: string
          request_hash: string
          response: Json
          updated_at: string
        }
        Insert: {
          function_name: string
          request_hash: string
          response: Json
          updated_at?: string
        }
        Update: {
          function_name?: string
          request_hash?: string
          response?: Json
          updated_at?: string
        }
        Relationships: []
      }
      ai_rate_limits: {
        Row: {
          count: number
          user_id: string
          window_start: string
        }
        Insert: {
          count?: number
          user_id: string
          window_start: string
        }
        Update: {
          count?: number
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      benchmark_batches: {
        Row: {
          concurrency: number
          cooldown_ms: number
          created_at: string
          id: string
          pause_reason: string | null
          repetitions: number
          requests_per_phase: number
          scenario: string
          status: string
          sweep_id: string | null
        }
        Insert: {
          concurrency?: number
          cooldown_ms?: number
          created_at?: string
          id: string
          pause_reason?: string | null
          repetitions?: number
          requests_per_phase?: number
          scenario: string
          status?: string
          sweep_id?: string | null
        }
        Update: {
          concurrency?: number
          cooldown_ms?: number
          created_at?: string
          id?: string
          pause_reason?: string | null
          repetitions?: number
          requests_per_phase?: number
          scenario?: string
          status?: string
          sweep_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "benchmark_batches_sweep_id_fkey"
            columns: ["sweep_id"]
            isOneToOne: false
            referencedRelation: "benchmark_sweeps"
            referencedColumns: ["id"]
          },
        ]
      }
      benchmark_call_checkpoints: {
        Row: {
          batch_run_id: string
          call_index: number
          completed_at: string | null
          config: string
          phase: string
          rep_index: number
          scenario: string
          started_at: string
          status: string
        }
        Insert: {
          batch_run_id: string
          call_index: number
          completed_at?: string | null
          config: string
          phase: string
          rep_index: number
          scenario: string
          started_at?: string
          status?: string
        }
        Update: {
          batch_run_id?: string
          call_index?: number
          completed_at?: string | null
          config?: string
          phase?: string
          rep_index?: number
          scenario?: string
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      benchmark_leases: {
        Row: {
          expires_at: string
          name: string
          owner: string
        }
        Insert: {
          expires_at: string
          name: string
          owner: string
        }
        Update: {
          expires_at?: string
          name?: string
          owner?: string
        }
        Relationships: []
      }
      benchmark_phases: {
        Row: {
          batch_run_id: string
          breaker_observation: Json | null
          breaker_reset_at: string | null
          completed_at: string | null
          config: string
          phase: string
          recovery_time_s: number | null
          rep_index: number
          scenario: string
          started_at: string | null
          status: string
        }
        Insert: {
          batch_run_id: string
          breaker_observation?: Json | null
          breaker_reset_at?: string | null
          completed_at?: string | null
          config: string
          phase: string
          recovery_time_s?: number | null
          rep_index: number
          scenario: string
          started_at?: string | null
          status?: string
        }
        Update: {
          batch_run_id?: string
          breaker_observation?: Json | null
          breaker_reset_at?: string | null
          completed_at?: string | null
          config?: string
          phase?: string
          recovery_time_s?: number | null
          rep_index?: number
          scenario?: string
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "benchmark_phases_batch_run_id_fkey"
            columns: ["batch_run_id"]
            isOneToOne: false
            referencedRelation: "benchmark_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      benchmark_sweeps: {
        Row: {
          children: Json
          concurrency_levels: Json
          created_at: string
          id: string
          reps_per_level: number
          scenario: string
        }
        Insert: {
          children: Json
          concurrency_levels: Json
          created_at?: string
          id: string
          reps_per_level: number
          scenario: string
        }
        Update: {
          children?: Json
          concurrency_levels?: Json
          created_at?: string
          id?: string
          reps_per_level?: number
          scenario?: string
        }
        Relationships: []
      }
      circuit_breaker_state: {
        Row: {
          consecutive_failures: number
          opened_at: string | null
          service: string
          state: string
          updated_at: string
        }
        Insert: {
          consecutive_failures?: number
          opened_at?: string | null
          service: string
          state?: string
          updated_at?: string
        }
        Update: {
          consecutive_failures?: number
          opened_at?: string | null
          service?: string
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
      course_cache: {
        Row: {
          cache_key: string
          content: Json
          created_at: string
          created_by: string | null
          id: string
          is_shared: boolean
          language: string
          title: string
          updated_at: string
        }
        Insert: {
          cache_key: string
          content: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_shared?: boolean
          language?: string
          title: string
          updated_at?: string
        }
        Update: {
          cache_key?: string
          content?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_shared?: boolean
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
      group_invitations: {
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
            foreignKeyName: "group_invitations_group_id_fkey"
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
          revision: number
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
          revision?: number
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
          revision?: number
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
      lesson_drafts: {
        Row: {
          lesson_id: string
          payload: Json
          updated_at: string
        }
        Insert: {
          lesson_id: string
          payload: Json
          updated_at?: string
        }
        Update: {
          lesson_id?: string
          payload?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_drafts_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: true
            referencedRelation: "group_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed: boolean
          created_at: string
          exercise_answers: Json
          exercise_results: Json
          exercises_completed: number
          exercises_total: number
          group_id: string
          id: string
          lesson_id: string
          lesson_snapshot: Json | null
          progress_percentage: number
          student_id: string
          time_spent_seconds: number
          updated_at: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          exercise_answers?: Json
          exercise_results?: Json
          exercises_completed?: number
          exercises_total?: number
          group_id: string
          id?: string
          lesson_id: string
          lesson_snapshot?: Json | null
          progress_percentage?: number
          student_id: string
          time_spent_seconds?: number
          updated_at?: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          exercise_answers?: Json
          exercise_results?: Json
          exercises_completed?: number
          exercises_total?: number
          group_id?: string
          id?: string
          lesson_id?: string
          lesson_snapshot?: Json | null
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
      remediation_jobs: {
        Row: {
          attempts: number
          completed_steps: string[]
          created_at: string
          error: string | null
          id: string
          locked_until: string | null
          payload: Json
          result: Json | null
          status: string
          step: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          completed_steps?: string[]
          created_at?: string
          error?: string | null
          id?: string
          locked_until?: string | null
          payload?: Json
          result?: Json | null
          status?: string
          step?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts?: number
          completed_steps?: string[]
          created_at?: string
          error?: string | null
          id?: string
          locked_until?: string | null
          payload?: Json
          result?: Json | null
          status?: string
          step?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      resilience_metrics: {
        Row: {
          batch_run_id: string | null
          benchmark_run_id: string | null
          call_index: number | null
          concurrency: number | null
          config: string | null
          created_at: string
          degraded: boolean
          function_name: string
          http_status: number | null
          id: string
          latency_ms: number
          path: string
          phase: string | null
          provider_used: string | null
          rep_index: number | null
          request_hash: string | null
          scenario: string | null
          success: boolean
          tokens: number | null
        }
        Insert: {
          batch_run_id?: string | null
          benchmark_run_id?: string | null
          call_index?: number | null
          concurrency?: number | null
          config?: string | null
          created_at?: string
          degraded?: boolean
          function_name: string
          http_status?: number | null
          id?: string
          latency_ms?: number
          path: string
          phase?: string | null
          provider_used?: string | null
          rep_index?: number | null
          request_hash?: string | null
          scenario?: string | null
          success: boolean
          tokens?: number | null
        }
        Update: {
          batch_run_id?: string | null
          benchmark_run_id?: string | null
          call_index?: number | null
          concurrency?: number | null
          config?: string | null
          created_at?: string
          degraded?: boolean
          function_name?: string
          http_status?: number | null
          id?: string
          latency_ms?: number
          path?: string
          phase?: string | null
          provider_used?: string | null
          rep_index?: number | null
          request_hash?: string | null
          scenario?: string | null
          success?: boolean
          tokens?: number | null
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
      accept_group_invitation: {
        Args: { _invitation_id: string }
        Returns: Json
      }
      benchmark_record_failure: {
        Args: { _service: string; _threshold: number }
        Returns: Json
      }
      claim_benchmark_lease: { Args: { _owner: string }; Returns: boolean }
      claim_remediation_jobs: {
        Args: { _limit: number }
        Returns: {
          attempts: number
          completed_steps: string[]
          created_at: string
          error: string | null
          id: string
          locked_until: string | null
          payload: Json
          result: Json | null
          status: string
          step: string | null
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "remediation_jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      consume_ai_rate_limit: {
        Args: { _limit: number; _user_id: string }
        Returns: boolean
      }
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
      get_benchmark_metrics: { Args: { _run_id: string }; Returns: Json }
      get_course_cache: { Args: { _key: string }; Returns: Json }
      get_group_roster: {
        Args: { _group_id: string }
        Returns: {
          enrolled_at: string
          student_id: string
          student_name: string
        }[]
      }
      grade_lesson_answer: {
        Args: { _answer: string; _keywords: string; _solution: string }
        Returns: string
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
      join_group_by_code: { Args: { _code: string }; Returns: Json }
      list_my_invitations: {
        Args: never
        Returns: {
          created_at: string
          group_id: string
          group_level: string
          group_name: string
          id: string
        }[]
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
