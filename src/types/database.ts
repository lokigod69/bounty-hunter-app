// src/types/database.ts
// TypeScript type definitions for Supabase database schema.
// Added NewTaskData, updated Task and TaskStatus types.
// Made NewTaskData.assigned_to a required string and renamed deadline_at to deadline to align with schema.
// Expanded ProofType to include 'document' and 'link'.
// Modified NewTaskData to include reward_type and use reward_text (string) for reward value/description.
// Changed NewTaskData.description to string | null.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
      };
      friendships: {
        Row: {
          id: string;
          user1_id: string;
          user2_id: string;
          status: string;
          requested_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user1_id: string;
          user2_id: string;
          status?: string;
          requested_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user1_id?: string;
          user2_id?: string;
          status?: string;
          requested_by?: string;
          created_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          created_by: string;
          assigned_to: string;
          title: string;
          description: string | null; // Added description
          deadline: string | null;
          reward_type: string | null;
          reward_text: string | null; // This is the 'reward' amount/text
          status: string;
          proof_url: string | null;
          proof_type: string | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          created_by: string;
          assigned_to: string;
          title: string;
          description?: string | null; // Added description
          deadline?: string | null;
          reward_type?: string | null;
          reward_text?: string | null;
          status?: string;
          proof_url?: string | null;
          proof_type?: string | null;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          created_by?: string;
          assigned_to?: string;
          title?: string;
          description?: string | null; // Added description
          deadline?: string | null;
          reward_type?: string | null;
          reward_text?: string | null;
          status?: string;
          proof_url?: string | null;
          proof_type?: string | null;
          completed_at?: string | null;
          created_at?: string;
        };
      };
    };
  };
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Friendship = Database['public']['Tables']['friendships']['Row'];
export type Task = Database['public']['Tables']['tasks']['Row'];

export type RewardType = 'cash' | 'service' | 'voucher';
export type TaskStatus = 'pending' | 'in_progress' | 'submitted' | 'review' | 'completed' | 'rejected' | 'archived';
export type ProofType = 'image' | 'video' | 'document' | 'link';
export type FriendshipStatus = 'pending' | 'accepted';

// Data for creating a new task
export interface NewTaskData {
  title: string;
  description: string | null; // Changed to allow null
  assigned_to: string;
  deadline?: string | null;
  reward_type?: RewardType;
  reward_text?: string;
}