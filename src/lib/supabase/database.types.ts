/**
 * Generated Supabase Database Types
 *
 * This file is auto-generated from the Supabase schema.
 * Do not edit manually - regenerate using:
 *   supabase gen types typescript --project-id <id> > src/lib/supabase/database.types.ts
 *
 * Or via MCP: mcp_supabase_generate_typescript_types
 */

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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agent_instruction_set_files: {
        Row: {
          content: string
          content_hash: string | null
          created_at: string
          file_name: string
          id: string
          set_id: string
          updated_at: string
        }
        Insert: {
          content?: string
          content_hash?: string | null
          created_at?: string
          file_name: string
          id?: string
          set_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          content_hash?: string | null
          created_at?: string
          file_name?: string
          id?: string
          set_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_instruction_set_files_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "agent_instruction_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_instruction_sets: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          project_id: string
          scope: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          project_id: string
          scope: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          project_id?: string
          scope?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_instruction_sets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      cli_setup_tokens: {
        Row: {
          client: string
          created_at: string
          expires_at: string
          id: string
          project_id: string
          token_hash: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          client: string
          created_at?: string
          expires_at: string
          id?: string
          project_id: string
          token_hash: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          client?: string
          created_at?: string
          expires_at?: string
          id?: string
          project_id?: string
          token_hash?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cli_setup_tokens_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      project_agent_controls: {
        Row: {
          allow_task_completion: boolean
          created_at: string
          project_id: string
          tool_toggles: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allow_task_completion?: boolean
          created_at?: string
          project_id: string
          tool_toggles?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allow_task_completion?: boolean
          created_at?: string
          project_id?: string
          tool_toggles?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_agent_controls_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_mcp_activity: {
        Row: {
          client: string
          created_at: string
          last_request_path: string | null
          last_seen_at: string
          project_id: string
          user_id: string
        }
        Insert: {
          client?: string
          created_at?: string
          last_request_path?: string | null
          last_seen_at?: string
          project_id: string
          user_id: string
        }
        Update: {
          client?: string
          created_at?: string
          last_request_path?: string | null
          last_seen_at?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_mcp_activity_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          id: string
          project_id: string | null
          role: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          project_id?: string | null
          role?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          project_id?: string | null
          role?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_guest: boolean
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_guest?: boolean
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_guest?: boolean
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string
          id: string
          name: string
          project_id: string | null
        }
        Insert: {
          color: string
          id?: string
          name: string
          project_id?: string | null
        }
        Update: {
          color?: string
          id?: string
          name?: string
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tags_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      task_plans: {
        Row: {
          content: string
          created_at: string | null
          created_by: string
          id: string
          task_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by: string
          id?: string
          task_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string
          id?: string
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_plans_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_state_messages: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          message: string
          signal: string
          task_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          message: string
          signal: string
          task_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string
          signal?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_state_messages_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_tags: {
        Row: {
          tag_id: string
          task_id: string
        }
        Insert: {
          tag_id: string
          task_id: string
        }
        Update: {
          tag_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_tags_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          agent_lock_reason: string | null
          agent_lock_until: string | null
          assignee_id: string | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          is_deleted: boolean
          position: number
          predecessor_id: string | null
          priority: string | null
          project_id: string | null
          status: string | null
          title: string
          updated_at: string | null
          workflow_signal: string | null
          workflow_signal_message: string | null
          workflow_signal_updated_at: string | null
          workflow_signal_updated_by: string | null
        }
        Insert: {
          agent_lock_reason?: string | null
          agent_lock_until?: string | null
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_deleted?: boolean
          position?: number
          predecessor_id?: string | null
          priority?: string | null
          project_id?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          workflow_signal?: string | null
          workflow_signal_message?: string | null
          workflow_signal_updated_at?: string | null
          workflow_signal_updated_by?: string | null
        }
        Update: {
          agent_lock_reason?: string | null
          agent_lock_until?: string | null
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_deleted?: boolean
          position?: number
          predecessor_id?: string | null
          priority?: string | null
          project_id?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          workflow_signal?: string | null
          workflow_signal_message?: string | null
          workflow_signal_updated_at?: string | null
          workflow_signal_updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_predecessor_id_fkey"
            columns: ["predecessor_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bootstrap_guest_project: { Args: Record<string, never>; Returns: string }
      merge_anonymous_into: {
        Args: { p_anon_user_id: string; p_target_user_id: string }
        Returns: Json
      }
      reorder_project_tasks: {
        Args: { p_project_id: string; p_tasks: Json }
        Returns: number
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
  public: {
    Enums: {},
  },
} as const

// ============================================================================
// Convenience Row Type Aliases
// ============================================================================

export type TaskRow = Tables<'tasks'>
export type ProjectRow = Tables<'projects'>
export type ProfileRow = Tables<'profiles'>
export type TagRow = Tables<'tags'>
export type TaskTagRow = Tables<'task_tags'>
export type TaskPlanRow = Tables<'task_plans'>
export type TaskStateMessageRow = Tables<'task_state_messages'>
export type ApiKeyRow = Tables<'api_keys'>
export type CliSetupTokenRow = Tables<'cli_setup_tokens'>
export type ProjectMemberRow = Tables<'project_members'>
export type ProjectAgentControlsRow = Tables<'project_agent_controls'>
export type ProjectMcpActivityRow = Tables<'project_mcp_activity'>
export type AgentInstructionSetRow = Tables<'agent_instruction_sets'>
export type AgentInstructionSetFileRow = Tables<'agent_instruction_set_files'>
