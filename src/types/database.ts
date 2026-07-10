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
      collected_rewards: {
        Row: {
          collected_at: string
          collector_id: string | null
          created_at: string
          id: string
          redeemed_at: string | null
          reward_id: string | null
        }
        Insert: {
          collected_at?: string
          collector_id?: string | null
          created_at?: string
          id?: string
          redeemed_at?: string | null
          reward_id?: string | null
        }
        Update: {
          collected_at?: string
          collector_id?: string | null
          created_at?: string
          id?: string
          redeemed_at?: string | null
          reward_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collected_rewards_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: true
            referencedRelation: "rewards_store"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_transactions: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          task_id: string | null
          transaction_type: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          task_id?: string | null
          transaction_type?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          task_id?: string | null
          transaction_type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_mission_streaks: {
        Row: {
          contract_id: string
          created_at: string | null
          id: string
          last_completion_date: string
          streak_count: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          contract_id: string
          created_at?: string | null
          id?: string
          last_completion_date: string
          streak_count?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          contract_id?: string
          created_at?: string | null
          id?: string
          last_completion_date?: string
          streak_count?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_mission_streaks_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_mission_streaks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          created_at: string | null
          id: string
          requested_by: string | null
          status: string | null
          user1_id: string | null
          user2_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          requested_by?: string | null
          status?: string | null
          user1_id?: string | null
          user2_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          requested_by?: string | null
          status?: string | null
          user1_id?: string | null
          user2_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "friendships_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_user1_id_fkey"
            columns: ["user1_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_user2_id_fkey"
            columns: ["user2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          created_at: string
          id: string
          inviter_id: string
          revoked: boolean
          token: string
        }
        Insert: {
          created_at?: string
          id?: string
          inviter_id: string
          revoked?: boolean
          token?: string
        }
        Update: {
          created_at?: string
          id?: string
          inviter_id?: string
          revoked?: boolean
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invites_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          email: string
          id: string
          onboarding_completed: boolean
          partner_user_id: string | null
          role: string | null
          theme: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email: string
          id: string
          onboarding_completed?: boolean
          partner_user_id?: string | null
          role?: string | null
          theme?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string
          id?: string
          onboarding_completed?: boolean
          partner_user_id?: string | null
          role?: string | null
          theme?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_partner_fk"
            columns: ["partner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards_store: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          creator_id: string | null
          credit_cost: number
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          creator_id?: string | null
          credit_cost: number
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          creator_id?: string | null
          credit_cost?: number
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rewards_store_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          approved_at: string | null
          assigned_to: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          deadline: string | null
          description: string | null
          frequency_limit: number | null
          frequency_period: string | null
          id: string
          is_archived: boolean | null
          is_daily: boolean | null
          proof_description: string | null
          proof_required: boolean | null
          proof_type: string | null
          proof_url: string | null
          rejection_reason: string | null
          reward_text: string | null
          reward_type: string | null
          status: string | null
          title: string
        }
        Insert: {
          approved_at?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          frequency_limit?: number | null
          frequency_period?: string | null
          id?: string
          is_archived?: boolean | null
          is_daily?: boolean | null
          proof_description?: string | null
          proof_required?: boolean | null
          proof_type?: string | null
          proof_url?: string | null
          rejection_reason?: string | null
          reward_text?: string | null
          reward_type?: string | null
          status?: string | null
          title: string
        }
        Update: {
          approved_at?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          frequency_limit?: number | null
          frequency_period?: string | null
          id?: string
          is_archived?: boolean | null
          is_daily?: boolean | null
          proof_description?: string | null
          proof_required?: boolean | null
          proof_type?: string | null
          proof_url?: string | null
          rejection_reason?: string | null
          reward_text?: string | null
          reward_type?: string | null
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_credits: {
        Row: {
          balance: number | null
          created_at: string | null
          total_earned: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          total_earned?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          total_earned?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_credits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_task: { Args: { p_task_id: string }; Returns: Json }
      archive_task: { Args: { p_task_id: string }; Returns: Json }
      create_reward_store_item: {
        Args: {
          p_assigned_to: string
          p_credit_cost: number
          p_description: string
          p_image_url: string
          p_name: string
        }
        Returns: Json
      }
      delete_reward_store_item: { Args: { p_reward_id: string }; Returns: Json }
      delete_task: { Args: { p_task_id: string }; Returns: Json }
      get_or_create_invite: { Args: never; Returns: Json }
      increment_user_credits: {
        Args: { amount_param: number; user_id_param: string }
        Returns: undefined
      }
      mark_reward_redeemed: {
        Args: { p_collection_id: string; p_redeemed?: boolean }
        Returns: Json
      }
      purchase_reward: {
        Args: { p_collector_id: string; p_reward_id: string }
        Returns: Json
      }
      redeem_invite: { Args: { p_token: string }; Returns: Json }
      reject_task: {
        Args: { p_rejection_reason?: string; p_task_id: string }
        Returns: Json
      }
      set_task_status: {
        Args: { p_status: string; p_task_id: string }
        Returns: Json
      }
      submit_proof: {
        Args: {
          p_proof_description?: string
          p_proof_type?: string
          p_proof_url?: string
          p_task_id: string
        }
        Returns: Json
      }
      update_reward_store_item: {
        Args: {
          p_bounty_id: string
          p_credit_cost: number
          p_description: string
          p_image_url: string
          p_name: string
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
