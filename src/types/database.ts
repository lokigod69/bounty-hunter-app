// src/types/database.ts
// TypeScript type definitions for Supabase database schema.
// Changed task status type from 'string' to 'TaskStatus' in tasks table for Row, Insert, and Update operations.
// Ensured TaskStatus is defined as a specific union type.
// Added NewTaskData, updated Task and TaskStatus types.
// Made NewTaskData.assigned_to a required string and renamed deadline_at to deadline to align with schema.
// Expanded ProofType to include 'document' and 'link'.
// Modified NewTaskData to include reward_type and use reward_text (string) for reward value/description.
// Changed NewTaskData.description to string | null.
// Phase 6 (Credit System UI): Updated RewardType to 'credit' (singular) and added 'text'.
// Phase 9A: Added 'profiles' to Task type for joined data.

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
          status: TaskStatus; // Corrected type
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
          status?: TaskStatus; // Corrected type
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
          status?: TaskStatus; // Corrected type
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
export type Task = Database['public']['Tables']['tasks']['Row'] & {
  profiles: Pick<Profile, 'id' | 'display_name' | 'email'> | null;
};

export type RewardType = 'credit' | 'text' | 'items' | 'other';
// Ensure TaskStatus is defined correctly
export type TaskStatus = 'pending' | 'in_progress' | 'review' | 'completed' | 'rejected';
export type ProofType = 'image' | 'video' | 'link' | 'document'; // Added 'link' and 'document'
export type FriendshipStatus = 'pending' | 'accepted' | 'declined' | 'blocked';

// Data for creating a new task
export interface NewTaskData {
  title: string;
  description: string | null; // Changed to allow null
  assigned_to: string;
  deadline?: string | null;
  reward_type?: RewardType;
  reward_text?: string;
}