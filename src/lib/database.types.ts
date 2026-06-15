// ============================================================
// Supabase Database Types
// Generated from supabase/schema.sql
// ============================================================

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Visibility = 'public' | 'private'
export type UserType = 'user' | 'admin'
export type SubscriptionTier = 'free' | 'bronze' | 'silver' | 'gold'
export type AccessLevel = 'viewer' | 'editor'
export type ActivityAction =
  | 'invited'
  | 'revoked'
  | 'note_deleted'
  | 'folder_deleted'
  | 'visibility_changed'
  | 'ownership_transferred'
  | 'user_banned'
  | 'user_unbanned'
  | 'tier_changed'
  | 'user_promoted'
  | 'user_deleted'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          username: string
          avatar_url: string | null
          user_type: UserType
          subscription_tier: SubscriptionTier
          is_banned: boolean
          created_at: string
        }
        Insert: {
          id: string
          full_name?: string
          username: string
          avatar_url?: string | null
          user_type?: UserType
          subscription_tier?: SubscriptionTier
          is_banned?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          username?: string
          avatar_url?: string | null
          user_type?: UserType
          subscription_tier?: SubscriptionTier
          is_banned?: boolean
          created_at?: string
        }
        Relationships: []
      }
      folders: {
        Row: {
          id: string
          owner_id: string
          parent_id: string | null
          title: string
          description: string | null
          slug: string
          visibility: Visibility
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          parent_id?: string | null
          title: string
          description?: string | null
          slug: string
          visibility?: Visibility
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          parent_id?: string | null
          title?: string
          description?: string | null
          slug?: string
          visibility?: Visibility
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'folders_owner_id_fkey'
            columns: ['owner_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'folders_parent_id_fkey'
            columns: ['parent_id']
            referencedRelation: 'folders'
            referencedColumns: ['id']
          },
        ]
      }
      notes: {
        Row: {
          id: string
          folder_id: string
          owner_id: string
          title: string
          description: string | null
          slug: string
          visibility: Visibility
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          folder_id: string
          owner_id: string
          title: string
          description?: string | null
          slug: string
          visibility?: Visibility
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          folder_id?: string
          owner_id?: string
          title?: string
          description?: string | null
          slug?: string
          visibility?: Visibility
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notes_folder_id_fkey'
            columns: ['folder_id']
            referencedRelation: 'folders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notes_owner_id_fkey'
            columns: ['owner_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      note_blocks: {
        Row: {
          id: string
          note_id: string
          type: string
          content: string
          order_index: number
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          note_id: string
          type: string
          content?: string
          order_index: number
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          note_id?: string
          type?: string
          content?: string
          order_index?: number
          metadata?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'note_blocks_note_id_fkey'
            columns: ['note_id']
            referencedRelation: 'notes'
            referencedColumns: ['id']
          },
        ]
      }
      collaborators: {
        Row: {
          id: string
          inviter_id: string
          invitee_email: string
          folder_id: string | null
          note_id: string | null
          access_level: AccessLevel
          created_at: string
        }
        Insert: {
          id?: string
          inviter_id: string
          invitee_email: string
          folder_id?: string | null
          note_id?: string | null
          access_level?: AccessLevel
          created_at?: string
        }
        Update: {
          id?: string
          inviter_id?: string
          invitee_email?: string
          folder_id?: string | null
          note_id?: string | null
          access_level?: AccessLevel
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'collaborators_inviter_id_fkey'
            columns: ['inviter_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'collaborators_folder_id_fkey'
            columns: ['folder_id']
            referencedRelation: 'folders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'collaborators_note_id_fkey'
            columns: ['note_id']
            referencedRelation: 'notes'
            referencedColumns: ['id']
          },
        ]
      }
      activity_log: {
        Row: {
          id: string
          inviter_id: string
          invitee_email: string
          action: ActivityAction
          folder_id: string | null
          note_id: string | null
          access_level: string | null
          item_title: string
          item_slug: string
          item_type: string
          details: string | null
          created_at: string
        }
        Insert: {
          id?: string
          inviter_id: string
          invitee_email?: string
          action: ActivityAction
          folder_id?: string | null
          note_id?: string | null
          access_level?: string | null
          item_title?: string
          item_slug?: string
          item_type: string
          details?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          inviter_id?: string
          invitee_email?: string
          action?: ActivityAction
          folder_id?: string | null
          note_id?: string | null
          access_level?: string | null
          item_title?: string
          item_slug?: string
          item_type?: string
          details?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'activity_log_inviter_id_fkey'
            columns: ['inviter_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'activity_log_folder_id_fkey'
            columns: ['folder_id']
            referencedRelation: 'folders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'activity_log_note_id_fkey'
            columns: ['note_id']
            referencedRelation: 'notes'
            referencedColumns: ['id']
          },
        ]
      }
      notification_preferences: {
        Row: {
          user_id: string
          send_invite_emails: boolean
          updated_at: string
        }
        Insert: {
          user_id: string
          send_invite_emails?: boolean
          updated_at?: string
        }
        Update: {
          user_id?: string
          send_invite_emails?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notification_preferences_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      public_profiles: {
        Row: {
          id: string | null
          full_name: string | null
          username: string | null
          avatar_url: string | null
        }
      }
    }
    Functions: {
      has_access_to_folder: {
        Args: { folder_uuid: string; user_uuid: string }
        Returns: boolean
      }
      has_access_to_note: {
        Args: { note_uuid: string; user_uuid: string }
        Returns: boolean
      }
      can_edit_note: {
        Args: { note_uuid: string; user_uuid: string }
        Returns: boolean
      }
      replace_note_blocks: {
        Args: { p_note_id: string; p_blocks: Json }
        Returns: void
      }
      is_slug_available: {
        Args: { p_slug: string; p_owner_id: string; p_exclude_note_id?: string }
        Returns: boolean
      }
      admin_get_users: {
        Args: { p_limit: number; p_offset: number; p_search?: string | null; p_user_type?: string | null }
        Returns: Record<string, unknown>[]
      }
      admin_count_users: {
        Args: { p_search?: string | null; p_user_type?: string | null }
        Returns: number
      }
      admin_delete_user: {
        Args: { target_user_id: string }
        Returns: void
      }
      admin_change_password: {
        Args: { target_user_id: string; new_password: string }
        Returns: void
      }
    }
  }
}
