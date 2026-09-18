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
      ai_connection_prompts: {
        Row: {
          candidate_id: string
          created_at: string
          prompt: string
          viewer_id: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          prompt: string
          viewer_id: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          prompt?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_connection_prompts_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_connection_prompts_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage: {
        Row: {
          count: number
          date: string
          kind: string
          user_id: string
        }
        Insert: {
          count?: number
          date?: string
          kind: string
          user_id: string
        }
        Update: {
          count?: number
          date?: string
          kind?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blocks: {
        Row: {
          blocked_id: string | null
          blocker_id: string | null
          created_at: string | null
          id: string
        }
        Insert: {
          blocked_id?: string | null
          blocker_id?: string | null
          created_at?: string | null
          id?: string
        }
        Update: {
          blocked_id?: string | null
          blocker_id?: string | null
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookmarks: {
        Row: {
          created_at: string | null
          id: string
          post_id: string | null
          repost_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id?: string | null
          repost_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string | null
          repost_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarks_repost_id_fkey"
            columns: ["repost_id"]
            isOneToOne: false
            referencedRelation: "reposts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      club_announcements: {
        Row: {
          author_id: string
          body: string
          club_id: string
          created_at: string
          id: string
        }
        Insert: {
          author_id: string
          body: string
          club_id: string
          created_at?: string
          id?: string
        }
        Update: {
          author_id?: string
          body?: string
          club_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_announcements_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_announcements_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_bans: {
        Row: {
          banned_by: string
          club_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          banned_by: string
          club_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          banned_by?: string
          club_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_bans_banned_by_fkey"
            columns: ["banned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_bans_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_bans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      club_channels: {
        Row: {
          club_id: string
          conversation_id: string
          created_at: string
          id: string
          is_general: boolean
          min_role: string
          name: string
        }
        Insert: {
          club_id: string
          conversation_id: string
          created_at?: string
          id?: string
          is_general?: boolean
          min_role?: string
          name: string
        }
        Update: {
          club_id?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_general?: boolean
          min_role?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_channels_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_channels_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: true
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      club_members: {
        Row: {
          club_id: string
          joined_at: string
          role: string
          status: string
          title: string | null
          user_id: string
        }
        Insert: {
          club_id: string
          joined_at?: string
          role?: string
          status?: string
          title?: string | null
          user_id: string
        }
        Update: {
          club_id?: string
          joined_at?: string
          role?: string
          status?: string
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_members_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      club_role_history: {
        Row: {
          club_id: string
          ended_at: string | null
          id: string
          role: string
          started_at: string
          title: string | null
          user_id: string
        }
        Insert: {
          club_id: string
          ended_at?: string | null
          id?: string
          role: string
          started_at?: string
          title?: string | null
          user_id: string
        }
        Update: {
          club_id?: string
          ended_at?: string | null
          id?: string
          role?: string
          started_at?: string
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_role_history_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_role_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string
          id: string
          is_open: boolean
          is_verified: boolean
          name: string
          purpose: string
          slug: string
          tags: string[]
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by: string
          id?: string
          is_open?: boolean
          is_verified?: boolean
          name: string
          purpose: string
          slug: string
          tags?: string[]
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string
          id?: string
          is_open?: boolean
          is_verified?: boolean
          name?: string
          purpose?: string
          slug?: string
          tags?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "clubs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          post_id: string | null
          repost_id: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          post_id?: string | null
          repost_id?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          post_id?: string | null
          repost_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_repost_id_fkey"
            columns: ["repost_id"]
            isOneToOne: false
            referencedRelation: "reposts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contribution_log: {
        Row: {
          action_type: string
          created_at: string | null
          date: string
          id: string
          metadata: Json | null
          points: number
          source_id: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          date: string
          id?: string
          metadata?: Json | null
          points: number
          source_id?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          date?: string
          id?: string
          metadata?: Json | null
          points?: number
          source_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contribution_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_members: {
        Row: {
          conversation_id: string
          created_at: string
          last_read_at: string | null
          left_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          last_read_at?: string | null
          left_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          last_read_at?: string | null
          left_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          kind: string
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dm_pairs: {
        Row: {
          conversation_id: string
          user_a: string
          user_b: string
        }
        Insert: {
          conversation_id: string
          user_a: string
          user_b: string
        }
        Update: {
          conversation_id?: string
          user_a?: string
          user_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "dm_pairs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: true
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dm_pairs_user_a_fkey"
            columns: ["user_a"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dm_pairs_user_b_fkey"
            columns: ["user_b"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      education: {
        Row: {
          class_year: string | null
          created_at: string
          degree: string | null
          end_date: string | null
          field: string | null
          id: string
          is_current: boolean
          school: string
          school_domain: string | null
          start_date: string | null
          user_id: string
        }
        Insert: {
          class_year?: string | null
          created_at?: string
          degree?: string | null
          end_date?: string | null
          field?: string | null
          id?: string
          is_current?: boolean
          school: string
          school_domain?: string | null
          start_date?: string | null
          user_id: string
        }
        Update: {
          class_year?: string | null
          created_at?: string
          degree?: string | null
          end_date?: string | null
          field?: string | null
          id?: string
          is_current?: boolean
          school?: string
          school_domain?: string | null
          start_date?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "education_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      experiences: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          is_current: boolean
          kind: string
          note: string | null
          org: string
          role: string
          start_date: string | null
          term: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_current?: boolean
          kind: string
          note?: string | null
          org: string
          role: string
          start_date?: string | null
          term?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_current?: boolean
          kind?: string
          note?: string | null
          org?: string
          role?: string
          start_date?: string | null
          term?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "experiences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          message: string
          resolved_at: string | null
          user_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          message: string
          resolved_at?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          message?: string
          resolved_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string | null
          follower_id: string | null
          following_id: string | null
          id: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          follower_id?: string | null
          following_id?: string | null
          id?: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          follower_id?: string | null
          following_id?: string | null
          id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      github_connections: {
        Row: {
          connected_at: string
          created_at: string
          epoch: number
          github_login: string
          github_user_id: number
          id: string
          last_error_at: string | null
          last_sync_error: string | null
          last_synced_at: string | null
          owner_id: string
          status: string
          sync_cursor: string | null
          updated_at: string
        }
        Insert: {
          connected_at?: string
          created_at?: string
          epoch?: number
          github_login: string
          github_user_id: number
          id?: string
          last_error_at?: string | null
          last_sync_error?: string | null
          last_synced_at?: string | null
          owner_id: string
          status?: string
          sync_cursor?: string | null
          updated_at?: string
        }
        Update: {
          connected_at?: string
          created_at?: string
          epoch?: number
          github_login?: string
          github_user_id?: number
          id?: string
          last_error_at?: string | null
          last_sync_error?: string | null
          last_synced_at?: string | null
          owner_id?: string
          status?: string
          sync_cursor?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "github_connections_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      github_contribution_days: {
        Row: {
          connection_id: string
          contribution_count: number
          contribution_date: string
          contribution_level: number
          fetched_at: string
          id: string
          owner_id: string
        }
        Insert: {
          connection_id: string
          contribution_count?: number
          contribution_date: string
          contribution_level?: number
          fetched_at?: string
          id?: string
          owner_id: string
        }
        Update: {
          connection_id?: string
          contribution_count?: number
          contribution_date?: string
          contribution_level?: number
          fetched_at?: string
          id?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "github_contribution_days_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "github_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "github_contribution_days_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_companies: {
        Row: {
          description: string | null
          enriched_at: string | null
          logo_url: string | null
          name: string
          slug: string
        }
        Insert: {
          description?: string | null
          enriched_at?: string | null
          logo_url?: string | null
          name: string
          slug: string
        }
        Update: {
          description?: string | null
          enriched_at?: string | null
          logo_url?: string | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      job_fit: {
        Row: {
          created_at: string
          listing_id: string
          reason: string
          user_id: string
        }
        Insert: {
          created_at?: string
          listing_id: string
          reason: string
          user_id: string
        }
        Update: {
          created_at?: string
          listing_id?: string
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_fit_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "job_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_fit_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_listings: {
        Row: {
          active: boolean
          category: string | null
          company_slug: string | null
          degrees: string | null
          description: string | null
          external_id: string
          id: string
          kind: string
          last_seen_at: string
          locations: string | null
          org: string
          posted_at: string | null
          source: string
          sponsorship: string | null
          term: string | null
          title: string
          url: string
        }
        Insert: {
          active?: boolean
          category?: string | null
          company_slug?: string | null
          degrees?: string | null
          description?: string | null
          external_id: string
          id?: string
          kind: string
          last_seen_at?: string
          locations?: string | null
          org: string
          posted_at?: string | null
          source: string
          sponsorship?: string | null
          term?: string | null
          title: string
          url: string
        }
        Update: {
          active?: boolean
          category?: string | null
          company_slug?: string | null
          degrees?: string | null
          description?: string | null
          external_id?: string
          id?: string
          kind?: string
          last_seen_at?: string
          locations?: string | null
          org?: string
          posted_at?: string | null
          source?: string
          sponsorship?: string | null
          term?: string | null
          title?: string
          url?: string
        }
        Relationships: []
      }
      job_pitches: {
        Row: {
          created_at: string
          listing_id: string
          pitch: string
          user_id: string
        }
        Insert: {
          created_at?: string
          listing_id: string
          pitch: string
          user_id: string
        }
        Update: {
          created_at?: string
          listing_id?: string
          pitch?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_pitches_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "job_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_pitches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_saves: {
        Row: {
          created_at: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_saves_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "job_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_saves_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string
          created_at: string
          id: string
          post_id: string | null
          reaction_type: string | null
          read: boolean
          repost_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          id?: string
          post_id?: string | null
          reaction_type?: string | null
          read?: boolean
          repost_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          id?: string
          post_id?: string | null
          reaction_type?: string | null
          read?: boolean
          repost_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_repost_id_fkey"
            columns: ["repost_id"]
            isOneToOne: false
            referencedRelation: "reposts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_daily_metrics: {
        Row: {
          click_count: number
          metric_date: string
          owner_id: string
          project_id: string | null
          view_count: number
        }
        Insert: {
          click_count?: number
          metric_date: string
          owner_id: string
          project_id?: string | null
          view_count?: number
        }
        Update: {
          click_count?: number
          metric_date?: string
          owner_id?: string
          project_id?: string | null
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_daily_metrics_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_daily_metrics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "portfolio_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_projects: {
        Row: {
          created_at: string
          demo_url: string | null
          description: string | null
          id: string
          key_features: string[]
          owner_id: string
          personal_role: string | null
          published_at: string | null
          repo_url: string | null
          sort_order: number
          source_analysis_id: string | null
          source_commit_sha: string | null
          source_repository_id: number | null
          status: string
          summary: string | null
          technologies: string[]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          demo_url?: string | null
          description?: string | null
          id?: string
          key_features?: string[]
          owner_id: string
          personal_role?: string | null
          published_at?: string | null
          repo_url?: string | null
          sort_order?: number
          source_analysis_id?: string | null
          source_commit_sha?: string | null
          source_repository_id?: number | null
          status?: string
          summary?: string | null
          technologies?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          demo_url?: string | null
          description?: string | null
          id?: string
          key_features?: string[]
          owner_id?: string
          personal_role?: string | null
          published_at?: string | null
          repo_url?: string | null
          sort_order?: number
          source_analysis_id?: string | null
          source_commit_sha?: string | null
          source_repository_id?: number | null
          status?: string
          summary?: string | null
          technologies?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_projects_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_projects_source_analysis_fkey"
            columns: ["source_analysis_id"]
            isOneToOne: false
            referencedRelation: "repository_analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_settings: {
        Row: {
          allow_indexing: boolean
          owner_id: string
          publish_activity: boolean
          publish_education: boolean
          publish_experience: boolean
          publish_intro: boolean
          publish_posts: boolean
          publish_projects: boolean
          section_order: string[]
          updated_at: string
          version: number
        }
        Insert: {
          allow_indexing?: boolean
          owner_id: string
          publish_activity?: boolean
          publish_education?: boolean
          publish_experience?: boolean
          publish_intro?: boolean
          publish_posts?: boolean
          publish_projects?: boolean
          section_order?: string[]
          updated_at?: string
          version?: number
        }
        Update: {
          allow_indexing?: boolean
          owner_id?: string
          publish_activity?: boolean
          publish_education?: boolean
          publish_experience?: boolean
          publish_intro?: boolean
          publish_posts?: boolean
          publish_projects?: boolean
          section_order?: string[]
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_settings_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          content: string
          context_label: string | null
          created_at: string | null
          hidden: boolean
          id: string
          media: Json
          post_type: string | null
          team_event_date: string | null
          team_event_mode: string | null
          team_event_name: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          context_label?: string | null
          created_at?: string | null
          hidden?: boolean
          id?: string
          media?: Json
          post_type?: string | null
          team_event_date?: string | null
          team_event_mode?: string | null
          team_event_name?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          context_label?: string | null
          created_at?: string | null
          hidden?: boolean
          id?: string
          media?: Json
          post_type?: string | null
          team_event_date?: string | null
          team_event_mode?: string | null
          team_event_name?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_school: {
        Row: {
          profile_id: string
          school: string | null
        }
        Insert: {
          profile_id: string
          school?: string | null
        }
        Update: {
          profile_id?: string
          school?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_school_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_views: {
        Row: {
          created_at: string
          viewed_id: string
          viewer_id: string
        }
        Insert: {
          created_at?: string
          viewed_id: string
          viewer_id: string
        }
        Update: {
          created_at?: string
          viewed_id?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_views_viewed_id_fkey"
            columns: ["viewed_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          accent_color: string | null
          avatar_is_animated: boolean
          avatar_url: string | null
          banner_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          email_digest_opt_out: boolean
          email_domain: string | null
          goals: string | null
          heatmap_visibility: string
          hide_school: boolean
          id: string
          is_admin: boolean
          is_bot: boolean
          is_campus_founder: boolean
          is_founder: boolean
          is_private: boolean
          is_pro: boolean
          is_suspended: boolean
          last_subscription_event_at: string | null
          leaderboard_opt_out: boolean
          major: string | null
          onboarded_at: string | null
          open_to: string[]
          study_mode: string | null
          pro_source: string | null
          pro_until: string | null
          profile_theme: string | null
          referral_code: string | null
          stripe_customer_id: string | null
          username: string
          verified_student: boolean
          year: string | null
        }
        Insert: {
          accent_color?: string | null
          avatar_is_animated?: boolean
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          email_digest_opt_out?: boolean
          email_domain?: string | null
          goals?: string | null
          heatmap_visibility?: string
          hide_school?: boolean
          id: string
          is_admin?: boolean
          is_bot?: boolean
          is_campus_founder?: boolean
          is_founder?: boolean
          is_private?: boolean
          is_pro?: boolean
          is_suspended?: boolean
          last_subscription_event_at?: string | null
          leaderboard_opt_out?: boolean
          major?: string | null
          onboarded_at?: string | null
          open_to?: string[]
          study_mode?: string | null
          pro_source?: string | null
          pro_until?: string | null
          profile_theme?: string | null
          referral_code?: string | null
          stripe_customer_id?: string | null
          username: string
          verified_student?: boolean
          year?: string | null
        }
        Update: {
          accent_color?: string | null
          avatar_is_animated?: boolean
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          email_digest_opt_out?: boolean
          email_domain?: string | null
          goals?: string | null
          heatmap_visibility?: string
          hide_school?: boolean
          id?: string
          is_admin?: boolean
          is_bot?: boolean
          is_campus_founder?: boolean
          is_founder?: boolean
          is_private?: boolean
          is_pro?: boolean
          is_suspended?: boolean
          last_subscription_event_at?: string | null
          leaderboard_opt_out?: boolean
          major?: string | null
          onboarded_at?: string | null
          open_to?: string[]
          study_mode?: string | null
          pro_source?: string | null
          pro_until?: string | null
          profile_theme?: string | null
          referral_code?: string | null
          stripe_customer_id?: string | null
          username?: string
          verified_student?: boolean
          year?: string | null
        }
        Relationships: []
      }
      reactions: {
        Row: {
          created_at: string | null
          id: string
          post_id: string | null
          repost_id: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id?: string | null
          repost_id?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string | null
          repost_id?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_repost_id_fkey"
            columns: ["repost_id"]
            isOneToOne: false
            referencedRelation: "reposts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string
          qualified_at: string | null
          referred_id: string
          referrer_id: string
        }
        Insert: {
          created_at?: string
          qualified_at?: string | null
          referred_id: string
          referrer_id: string
        }
        Update: {
          created_at?: string
          qualified_at?: string | null
          referred_id?: string
          referrer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string | null
          detail: string | null
          id: string
          message_id: string | null
          post_id: string | null
          reason: string | null
          reported_user_id: string | null
          reporter_id: string | null
          snapshot: string | null
          status: string
          target_type: string
        }
        Insert: {
          created_at?: string | null
          detail?: string | null
          id?: string
          message_id?: string | null
          post_id?: string | null
          reason?: string | null
          reported_user_id?: string | null
          reporter_id?: string | null
          snapshot?: string | null
          status?: string
          target_type: string
        }
        Update: {
          created_at?: string | null
          detail?: string | null
          id?: string
          message_id?: string | null
          post_id?: string | null
          reason?: string | null
          reported_user_id?: string | null
          reporter_id?: string | null
          snapshot?: string | null
          status?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      repository_analyses: {
        Row: {
          attempt_id: string
          commit_sha: string
          completed_at: string | null
          connection_epoch: number
          connection_id: string
          coverage: Json | null
          created_at: string
          draft: Json | null
          estimated_cost_usd: number | null
          evidence: Json | null
          id: string
          lease_expires_at: string | null
          lease_owner: string | null
          model: string | null
          owner_id: string
          parent_analysis_id: string | null
          parent_attempt_id: string | null
          project_id: string | null
          prompt_version: string
          repository_full_name: string | null
          repository_id: number
          request_key: string
          safe_error: string | null
          started_at: string | null
          status: string
          token_input: number | null
          token_output: number | null
          updated_at: string
        }
        Insert: {
          attempt_id?: string
          commit_sha: string
          completed_at?: string | null
          connection_epoch: number
          connection_id: string
          coverage?: Json | null
          created_at?: string
          draft?: Json | null
          estimated_cost_usd?: number | null
          evidence?: Json | null
          id?: string
          lease_expires_at?: string | null
          lease_owner?: string | null
          model?: string | null
          owner_id: string
          parent_analysis_id?: string | null
          parent_attempt_id?: string | null
          project_id?: string | null
          prompt_version: string
          repository_full_name?: string | null
          repository_id: number
          request_key: string
          safe_error?: string | null
          started_at?: string | null
          status?: string
          token_input?: number | null
          token_output?: number | null
          updated_at?: string
        }
        Update: {
          attempt_id?: string
          commit_sha?: string
          completed_at?: string | null
          connection_epoch?: number
          connection_id?: string
          coverage?: Json | null
          created_at?: string
          draft?: Json | null
          estimated_cost_usd?: number | null
          evidence?: Json | null
          id?: string
          lease_expires_at?: string | null
          lease_owner?: string | null
          model?: string | null
          owner_id?: string
          parent_analysis_id?: string | null
          parent_attempt_id?: string | null
          project_id?: string | null
          prompt_version?: string
          repository_full_name?: string | null
          repository_id?: number
          request_key?: string
          safe_error?: string | null
          started_at?: string | null
          status?: string
          token_input?: number | null
          token_output?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "repository_analyses_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "github_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repository_analyses_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repository_analyses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "portfolio_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      repository_analysis_usage: {
        Row: {
          analysis_id: string
          counts_toward_success: boolean
          estimated_cost_usd: number | null
          id: string
          model: string | null
          month: string
          owner_id: string
          prompt_version: string | null
          reserved_at: string
          settled_at: string | null
          settlement: string
          token_input: number | null
          token_output: number | null
        }
        Insert: {
          analysis_id: string
          counts_toward_success?: boolean
          estimated_cost_usd?: number | null
          id?: string
          model?: string | null
          month: string
          owner_id: string
          prompt_version?: string | null
          reserved_at?: string
          settled_at?: string | null
          settlement?: string
          token_input?: number | null
          token_output?: number | null
        }
        Update: {
          analysis_id?: string
          counts_toward_success?: boolean
          estimated_cost_usd?: number | null
          id?: string
          model?: string | null
          month?: string
          owner_id?: string
          prompt_version?: string | null
          reserved_at?: string
          settled_at?: string | null
          settlement?: string
          token_input?: number | null
          token_output?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "repository_analysis_usage_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: true
            referencedRelation: "repository_analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repository_analysis_usage_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reposts: {
        Row: {
          created_at: string | null
          id: string
          post_id: string | null
          quote_text: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id?: string | null
          quote_text?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string | null
          quote_text?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reposts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reposts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      school_email_verifications: {
        Row: {
          attempts: number
          code_hash: string
          created_at: string
          email: string
          expires_at: string
          last_request_at: string
          requests_today: number
          user_id: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          created_at?: string
          email: string
          expires_at: string
          last_request_at?: string
          requests_today?: number
          user_id: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          created_at?: string
          email?: string
          expires_at?: string
          last_request_at?: string
          requests_today?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_email_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      signup_attempts: {
        Row: {
          created_at: string
          ip_hash: string
        }
        Insert: {
          created_at?: string
          ip_hash: string
        }
        Update: {
          created_at?: string
          ip_hash?: string
        }
        Relationships: []
      }
      stripe_events: {
        Row: {
          created_at: string
          id: string
          type: string
        }
        Insert: {
          created_at?: string
          id: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _log_contribution: {
        Args: {
          p_action_type: string
          p_metadata?: Json
          p_points: number
          p_source_id: string
          p_user: string
        }
        Returns: undefined
      }
      accept_follow: { Args: { p_follower: string }; Returns: undefined }
      add_group_member: {
        Args: { p_conversation_id: string; p_member_id: string }
        Returns: undefined
      }
      admin_delete_post: { Args: { p_post_id: string }; Returns: string[] }
      admin_hide_post: { Args: { p_post_id: string }; Returns: undefined }
      admin_list_feedback: {
        Args: never
        Returns: {
          author_username: string
          category: string
          created_at: string
          feedback_id: string
          message: string
        }[]
      }
      admin_list_referrers: {
        Args: never
        Returns: {
          invited: number
          qualified: number
          username: string
        }[]
      }
      admin_list_reports: {
        Args: never
        Returns: {
          author_id: string
          author_suspended: boolean
          author_username: string
          created_at: string
          detail: string
          message_content: string
          message_id: string
          post_content: string
          post_hidden: boolean
          post_id: string
          reason: string
          report_id: string
          reporter_username: string
          snapshot: string
          target_type: string
        }[]
      }
      admin_resolve_feedback: {
        Args: { p_feedback_id: string }
        Returns: undefined
      }
      admin_resolve_report: {
        Args: { p_report_id: string }
        Returns: undefined
      }
      admin_suspend_user: {
        Args: { p_post_id?: string | null; p_user: string }
        Returns: undefined
      }
      admin_unhide_post: { Args: { p_post_id: string }; Returns: undefined }
      admin_unsuspend_user: { Args: { p_user: string }; Returns: undefined }
      block_user: { Args: { target: string }; Returns: undefined }
      can_read_channel: { Args: { p_conversation: string }; Returns: boolean }
      check_invite_code: { Args: { p_code: string }; Returns: boolean }
      club_approve: {
        Args: { p_club: string; p_user: string }
        Returns: undefined
      }
      club_ban: { Args: { p_club: string; p_user: string }; Returns: undefined }
      club_create_channel: {
        Args: { p_club: string; p_min_role: string; p_name: string }
        Returns: string
      }
      club_delete_channel: { Args: { p_channel: string }; Returns: undefined }
      club_join: { Args: { p_club: string }; Returns: string }
      club_kick: {
        Args: { p_club: string; p_user: string }
        Returns: undefined
      }
      club_leave: { Args: { p_club: string }; Returns: undefined }
      club_reject: {
        Args: { p_club: string; p_user: string }
        Returns: undefined
      }
      club_role: { Args: { p_club: string }; Returns: string }
      club_set_role: {
        Args: {
          p_club: string
          p_role: string
          p_title: string
          p_user: string
        }
        Returns: undefined
      }
      club_unban: {
        Args: { p_club: string; p_user: string }
        Returns: undefined
      }
      confirm_school_verification: {
        Args: { p_code: string }
        Returns: boolean
      }
      create_group_conversation: {
        Args: { p_member_ids: string[]; p_title: string }
        Returns: string
      }
      current_is_admin: { Args: never; Returns: boolean }
      current_is_suspended: { Args: never; Returns: boolean }
      expire_lapsed_pro: { Args: never; Returns: number }
      get_blocked_ids: { Args: never; Returns: string[] }
      get_dm_peer: {
        Args: { p_conversation_id: string }
        Returns: {
          peer_avatar_url: string
          peer_display_name: string
          peer_id: string
          peer_is_pro: boolean
          peer_username: string
        }[]
      }
      get_dm_unread_total: { Args: never; Returns: number }
      get_follow_list: {
        Args: { p_kind: string; p_profile_id: string }
        Returns: {
          avatar_url: string
          display_name: string
          followed_at: string
          id: string
          is_campus_founder: boolean
          is_founder: boolean
          is_pro: boolean
          major: string
          username: string
          verified_student: boolean
          viewer_follow_status: string
          year: string
        }[]
      }
      get_founder_spots_left: { Args: never; Returns: number }
      get_group_conversation: {
        Args: { p_conversation_id: string }
        Returns: {
          member_avatar_url: string
          member_display_name: string
          member_id: string
          member_is_pro: boolean
          member_username: string
          title: string
        }[]
      }
      get_heatmap: {
        Args: { p_profile_id: string }
        Returns: {
          breakdown: Json
          day: string
          points: number
        }[]
      }
      get_leaderboard: {
        Args: { p_scope: string }
        Returns: {
          accent_color: string
          avatar_url: string
          display_name: string
          id: string
          is_campus_founder: boolean
          is_founder: boolean
          is_pro: boolean
          rank: number
          school: string
          username: string
          verified_student: boolean
          weekly_points: number
        }[]
      }
      get_match_candidates: {
        Args: { p_user: string }
        Returns: {
          avatar_url: string
          bio: string
          display_name: string
          goals: string
          id: string
          major: string
          school: string
          username: string
          year: string
        }[]
      }
      get_my_billing: {
        Args: never
        Returns: {
          is_pro: boolean
          pro_source: string
          pro_until: string
          stripe_customer_id: string
        }[]
      }
      get_notification_unread_total: { Args: never; Returns: number }
      get_or_create_dm: { Args: { p_recipient: string }; Returns: string }
      get_profile_counts: {
        Args: { p_profile_id: string }
        Returns: {
          followers: number
          following: number
          posts: number
        }[]
      }
      get_profile_views: {
        Args: { p_profile: string }
        Returns: {
          avatar_url: string
          created_at: string
          display_name: string
          id: string
          is_pro: boolean
          username: string
        }[]
      }
      get_public_heatmap: {
        Args: { p_profile_id: string }
        Returns: {
          day: string
          points: number
        }[]
      }
      get_public_post: {
        Args: { p_id: string }
        Returns: {
          author_avatar_url: string
          author_display_name: string
          author_id: string
          author_is_bot: boolean
          author_is_campus_founder: boolean
          author_is_founder: boolean
          author_is_pro: boolean
          author_username: string
          author_verified_student: boolean
          content: string
          context_label: string | null
          created_at: string
          id: string
          repost_count: number
          samehere_count: number
        }[]
      }
      get_public_profile: {
        Args: { p_username: string }
        Returns: {
          accent_color: string
          avatar_url: string
          banner_url: string
          bio: string
          display_name: string
          goals: string
          heatmap_visibility: string
          id: string
          is_bot: boolean
          is_campus_founder: boolean
          is_founder: boolean
          is_private: boolean
          is_pro: boolean
          major: string
          open_to: string[] | null
          school: string
          study_mode: string | null
          username: string
          verified_student: boolean
          year: string
        }[]
      }
      get_public_profile_card: {
        Args: { p_username: string }
        Returns: {
          avatar_url: string
          display_name: string
          id: string
          is_campus_founder: boolean
          is_founder: boolean
          is_pro: boolean
          school: string
          username: string
          verified_student: boolean
        }[]
      }
      get_public_profile_counts: {
        Args: { p_profile_id: string }
        Returns: {
          followers: number
          following: number
          posts: number
        }[]
      }
      get_public_quote: {
        Args: { p_id: string }
        Returns: {
          author_avatar_url: string
          author_display_name: string
          author_id: string
          author_is_campus_founder: boolean
          author_is_founder: boolean
          author_is_pro: boolean
          author_username: string
          author_verified_student: boolean
          created_at: string
          id: string
          post_content: string
          post_created_at: string
          post_id: string
          quote_text: string
          repost_count: number
          reposter_avatar_url: string
          reposter_display_name: string
          reposter_id: string
          reposter_is_campus_founder: boolean
          reposter_is_founder: boolean
          reposter_is_pro: boolean
          reposter_username: string
          reposter_verified_student: boolean
          samehere_count: number
        }[]
      }
      get_referral_stats: {
        Args: never
        Returns: {
          code: string
          is_campus_founder: boolean
          pending_count: number
          referral_count: number
        }[]
      }
      get_streak: {
        Args: { p_profile_id: string }
        Returns: {
          current_streak: number
          longest_streak: number
          today_earned: boolean
        }[]
      }
      get_suggested_profiles: {
        Args: { p_limit?: number; p_school?: string }
        Returns: {
          avatar_url: string
          bio: string
          display_name: string
          goals: string
          id: string
          is_campus_founder: boolean
          is_founder: boolean
          is_pro: boolean
          major: string
          school: string
          username: string
          verified_student: boolean
          year: string
        }[]
      }
      insert_notification: {
        Args: {
          p_actor_id: string
          p_post_id?: string
          p_reaction_type?: string
          p_repost_id?: string
          p_type: string
          p_user_id: string
        }
        Returns: undefined
      }
      is_club_member: { Args: { p_club: string }; Returns: boolean }
      is_conversation_member: {
        Args: { p_conversation_id: string }
        Returns: boolean
      }
      is_pro_now: {
        Args: { p_is_pro: boolean; p_pro_until: string }
        Returns: boolean
      }
      leave_conversation: {
        Args: { p_conversation_id: string }
        Returns: undefined
      }
      list_dm_inbox: {
        Args: never
        Returns: {
          conversation_id: string
          last_message: string
          last_message_at: string
          last_sender_id: string
          peer_avatar_url: string
          peer_display_name: string
          peer_id: string
          peer_is_pro: boolean
          peer_username: string
          unread_count: number
        }[]
      }
      list_group_inbox: {
        Args: never
        Returns: {
          conversation_id: string
          last_message: string
          last_message_at: string
          last_sender_id: string
          members: Json
          title: string
          unread_count: number
        }[]
      }
      list_notifications: {
        Args: { p_limit?: number }
        Returns: {
          actor_avatar_url: string
          actor_display_name: string
          actor_id: string
          actor_is_pro: boolean
          actor_username: string
          created_at: string
          id: string
          post_id: string
          reaction_type: string
          read: boolean
          repost_id: string
          type: string
        }[]
      }
      list_unread_digest_recipients: {
        Args: never
        Returns: {
          dm_unread: number
          email: string
          notif_unread: number
          user_id: string
        }[]
      }
      list_weekly_match_recipients: {
        Args: never
        Returns: {
          bio: string
          email: string
          goals: string
          is_pro: boolean
          major: string
          pro_until: string
          school: string
          user_id: string
          year: string
        }[]
      }
      mark_all_notifications_read: { Args: never; Returns: undefined }
      mark_dm_read: { Args: { p_conversation_id: string }; Returns: undefined }
      media_paths_owned: {
        Args: { p_media: Json; p_user: string }
        Returns: boolean
      }
      qualifying_length: { Args: { p_content: string }; Returns: number }
      record_profile_view: { Args: { p_viewed: string }; Returns: undefined }
      reject_follow: { Args: { p_follower: string }; Returns: undefined }
      remove_group_member: {
        Args: { p_conversation_id: string; p_member_id: string }
        Returns: undefined
      }
      request_follow: { Args: { p_target: string }; Returns: string }
      request_school_verification: {
        Args: { p_code_hash: string; p_email: string }
        Returns: undefined
      }
      revoke_contribution_same_day: {
        Args: { p_action: string; p_source: string; p_user: string }
        Returns: undefined
      }
      rl_check_signup: { Args: { p_ip_hash: string }; Returns: boolean }
      set_referral_code: { Args: { p_code: string }; Returns: string }
      sweep_unconfirmed_signups: { Args: never; Returns: number }
      acquire_repository_analysis_lease: {
        Args: { p_analysis_id: string; p_ttl_seconds?: number; p_worker_id: string }
        Returns: {
          analysis_id: string
          attempt_id: string
          lease_expires_at: string
        }[]
      }
      advance_repository_analysis_stage: {
        Args: {
          p_analysis_id: string
          p_attempt_id: string
          p_connection_epoch: number
          p_status: string
          p_worker_id: string
        }
        Returns: undefined
      }
      cancel_repository_analysis: {
        Args: { p_analysis_id: string }
        Returns: undefined
      }
      commit_repository_analysis: {
        Args: {
          p_analysis_id: string
          p_attempt_id: string
          p_connection_epoch: number
          p_coverage?: Json
          p_draft?: Json
          p_estimated_cost_usd?: number
          p_evidence?: Json
          p_model?: string
          p_prompt_version?: string
          p_safe_error?: string
          p_status: string
          p_token_input?: number
          p_token_output?: number
          p_worker_id: string
        }
        Returns: undefined
      }
      finalize_repository_analysis: {
        Args: {
          p_analysis_id: string
          p_attempt_id: string
          p_connection_epoch: number
          p_coverage?: Json
          p_draft?: Json
          p_estimated_cost_usd?: number
          p_evidence?: Json
          p_model?: string
          p_prompt_version?: string
          p_safe_error?: string
          p_status: string
          p_token_input?: number
          p_token_output?: number
          p_worker_id: string
        }
        Returns: string | null
      }
      delete_github_credentials: {
        Args: { p_connection_id: string }
        Returns: undefined
      }
      disconnect_github_connection: { Args: never; Returns: undefined }
      get_public_github_contributions: {
        Args: { p_username: string }
        Returns: {
          connection_id: string
          contribution_count: number
          contribution_date: string
          contribution_level: number
          fetched_at: string
          owner_id: string
        }[]
      }
      get_public_portfolio: {
        Args: { p_username: string }
        Returns: {
          activity_visible: boolean
          allow_indexing: boolean
          is_private: boolean
          owner_id: string
          publish_activity: boolean
          publish_education: boolean
          publish_experience: boolean
          publish_intro: boolean
          publish_posts: boolean
          publish_projects: boolean
          section_order: string[]
          username: string
        }[]
      }
      get_public_portfolio_education: {
        Args: { p_username: string }
        Returns: {
          class_year: string
          degree: string
          end_date: string
          field: string
          id: string
          is_current: boolean
          school: string
          start_date: string
        }[]
      }
      get_public_portfolio_experience: {
        Args: { p_username: string }
        Returns: {
          end_date: string
          id: string
          is_current: boolean
          kind: string
          note: string
          org: string
          role: string
          start_date: string
          term: string
        }[]
      }
      get_public_portfolio_projects: {
        Args: { p_username: string }
        Returns: {
          demo_url: string
          description: string
          id: string
          key_features: string[]
          owner_id: string
          personal_role: string
          published_at: string
          repo_url: string
          sort_order: number
          summary: string
          technologies: string[]
          title: string
        }[]
      }
      get_repository_analysis_usage_month: {
        Args: never
        Returns: {
          attempt_count: number
          daily_attempt_cap: number
          daily_attempt_count: number
          month: string
          success_cap: number
          success_count: number
        }[]
      }
      heartbeat_repository_analysis_lease: {
        Args: {
          p_analysis_id: string
          p_attempt_id: string
          p_ttl_seconds?: number
          p_worker_id: string
        }
        Returns: string
      }
      increment_portfolio_daily_metric: {
        Args: {
          p_kind: string
          p_owner_id: string
          p_project_id: string | null
          p_viewer_id: string | null
        }
        Returns: boolean
      }
      record_portfolio_daily_metric_once: {
        Args: {
          p_kind: string
          p_owner_id: string
          p_project_id: string | null
          p_session_hash: string
          p_viewer_id: string | null
        }
        Returns: boolean
      }
      mark_github_connection_status: {
        Args: {
          p_connection_id: string
          p_expected_epoch: number
          p_safe_error: string
          p_status: string
        }
        Returns: undefined
      }
      portfolio_activity_readable: { Args: { p_owner: string }; Returns: boolean }
      portfolio_analysis_caps: {
        Args: never
        Returns: {
          free_attempts_per_day: number
          free_success_per_month: number
          lease_seconds: number
          month_timezone: string
          pro_attempts_per_day: number
          pro_success_per_month: number
          queued_seconds: number
        }[]
      }
      portfolio_http_url_ok: { Args: { p: string }; Returns: boolean }
      portfolio_publicly_readable: { Args: { p_owner: string }; Returns: boolean }
      portfolio_publicly_readable_to: {
        Args: { p_owner: string; p_viewer: string }
        Returns: boolean
      }
      portfolio_section_order_ok: { Args: { p: string[] }; Returns: boolean }
      portfolio_text_array_ok: {
        Args: { p: string[]; p_item_max: number; p_max: number }
        Returns: boolean
      }
      reserve_repository_analysis: {
        Args: {
          p_commit_sha: string
          p_project_id: string | null
          p_prompt_version: string
          p_repository_full_name: string | null
          p_repository_id: number
          p_request_key: string
        }
        Returns: {
          analysis_id: string
          attempt_id: string
          request_key: string
          reused: boolean
          status: string
        }[]
      }
      retry_repository_analysis: {
        Args: { p_analysis_id: string }
        Returns: {
          analysis_id: string
          attempt_id: string
          request_key: string
          reused: boolean
          status: string
        }[]
      }
      search_people: {
        Args: {
          p_limit?: number
          p_major?: string
          p_offset?: number
          p_open_to?: string
          p_query?: string
          p_study_mode?: string
          p_year?: string
        }
        Returns: {
          avatar_url: string | null
          display_name: string | null
          id: string
          is_campus_founder: boolean
          is_founder: boolean
          is_pro: boolean
          major: string | null
          open_to: string[] | null
          study_mode: string | null
          username: string
          verified_student: boolean
          year: string | null
        }[]
      }
      search_posts: {
        Args: { p_label?: string; p_limit?: number; p_offset?: number; p_query?: string }
        Returns: {
          content: string
          context_label: string | null
          created_at: string
          id: string
          user_id: string
        }[]
      }
      search_projects: {
        Args: { p_limit?: number; p_offset?: number; p_query: string }
        Returns: {
          id: string
          owner_id: string
          owner_username: string
          published_at: string
          summary: string | null
          technologies: string[]
          title: string
        }[]
      }
      upsert_github_connection: {
        Args: {
          p_github_login: string
          p_github_user_id: number
          p_owner_id: string
        }
        Returns: string
      }
      upsert_github_contribution_day: {
        Args: {
          p_connection_id: string
          p_count: number
          p_date: string
          p_expected_epoch: number
          p_level: number
        }
        Returns: undefined
      }
      replace_github_contribution_snapshot: {
        Args: {
          p_connection_id: string
          p_days: Json
          p_expected_epoch: number
          p_from: string
          p_to: string
        }
        Returns: number
      }
      upsert_github_credentials: {
        Args: {
          p_access_token_encrypted: string
          p_connection_epoch: number
          p_connection_id: string
          p_expires_at: string
          p_key_version: number
          p_owner_id: string
          p_refresh_token_encrypted: string
        }
        Returns: undefined
      }
      get_github_credentials: {
        Args: { p_connection_id: string }
        Returns: {
          access_token_encrypted: string
          connection_epoch: number
          connection_id: string
          expires_at: string
          key_version: number
          owner_id: string
          refresh_token_encrypted: string
        }[]
      }
      use_ai_quota: { Args: { p_kind: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  private: {
    Tables: {
      github_credentials: {
        Row: {
          access_token_encrypted: string
          connection_epoch: number
          connection_id: string
          expires_at: string | null
          key_version: number
          owner_id: string
          refresh_token_encrypted: string | null
          updated_at: string
        }
        Insert: {
          access_token_encrypted: string
          connection_epoch: number
          connection_id: string
          expires_at?: string | null
          key_version?: number
          owner_id: string
          refresh_token_encrypted?: string | null
          updated_at?: string
        }
        Update: {
          access_token_encrypted?: string
          connection_epoch?: number
          connection_id?: string
          expires_at?: string | null
          key_version?: number
          owner_id?: string
          refresh_token_encrypted?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "github_credentials_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: true
            referencedRelation: "github_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "github_credentials_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
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
      [_ in never]: never
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
