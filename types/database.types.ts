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
      weekly_prompts: {
        Row: {
          created_at: string
          prompt: string
          week_key: string
        }
        Insert: {
          created_at?: string
          prompt: string
          week_key: string
        }
        Update: {
          created_at?: string
          prompt?: string
          week_key?: string
        }
        Relationships: []
      }
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
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          date: string
          id?: string
          metadata?: Json | null
          points: number
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          date?: string
          id?: string
          metadata?: Json | null
          points?: number
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
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          last_read_at?: string | null
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
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
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
      feedback: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          message: string
          user_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          message: string
          user_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          message?: string
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
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          content: string
          created_at: string | null
          hidden: boolean
          id: string
          media: Json
          post_type: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          hidden?: boolean
          id?: string
          media?: Json
          post_type?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          hidden?: boolean
          id?: string
          media?: Json
          post_type?: string | null
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
          banner_url: string | null
          avatar_is_animated: boolean
          avatar_url: string | null
          bio: string | null
          courses: string[] | null
          created_at: string | null
          display_name: string | null
          goals: string | null
          heatmap_visibility: string
          hide_school: boolean
          id: string
          is_admin: boolean
          is_campus_founder: boolean
          is_founder: boolean
          is_private: boolean
          is_pro: boolean
          is_suspended: boolean
          leaderboard_opt_out: boolean
          major: string | null
          pro_until: string | null
          referral_code: string | null
          skills: string[] | null
          stripe_customer_id: string | null
          username: string
          wants_pro: boolean
          year: string | null
        }
        Insert: {
          accent_color?: string | null
          banner_url?: string | null
          avatar_is_animated?: boolean
          avatar_url?: string | null
          bio?: string | null
          courses?: string[] | null
          created_at?: string | null
          display_name?: string | null
          goals?: string | null
          heatmap_visibility?: string
          hide_school?: boolean
          id: string
          is_admin?: boolean
          is_campus_founder?: boolean
          is_founder?: boolean
          is_private?: boolean
          is_pro?: boolean
          is_suspended?: boolean
          leaderboard_opt_out?: boolean
          major?: string | null
          pro_until?: string | null
          referral_code?: string | null
          skills?: string[] | null
          stripe_customer_id?: string | null
          username: string
          wants_pro?: boolean
          year?: string | null
        }
        Update: {
          accent_color?: string | null
          banner_url?: string | null
          avatar_is_animated?: boolean
          avatar_url?: string | null
          bio?: string | null
          courses?: string[] | null
          created_at?: string | null
          display_name?: string | null
          goals?: string | null
          heatmap_visibility?: string
          hide_school?: boolean
          id?: string
          is_admin?: boolean
          is_campus_founder?: boolean
          is_founder?: boolean
          is_private?: boolean
          is_pro?: boolean
          is_suspended?: boolean
          leaderboard_opt_out?: boolean
          major?: string | null
          pro_until?: string | null
          referral_code?: string | null
          skills?: string[] | null
          stripe_customer_id?: string | null
          username?: string
          wants_pro?: boolean
          year?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          referred_id: string
          referrer_id: string
        }
        Insert: {
          created_at?: string
          referred_id: string
          referrer_id: string
        }
        Update: {
          created_at?: string
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
          post_id: string | null
          reason: string | null
          reporter_id: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          detail?: string | null
          id?: string
          post_id?: string | null
          reason?: string | null
          reporter_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string | null
          detail?: string | null
          id?: string
          post_id?: string | null
          reason?: string | null
          reporter_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_follow: { Args: { p_follower: string }; Returns: undefined }
      admin_hide_post: { Args: { p_post_id: string }; Returns: undefined }
      admin_list_reports: {
        Args: never
        Returns: {
          author_id: string
          author_suspended: boolean
          author_username: string
          created_at: string
          detail: string
          post_content: string
          post_hidden: boolean
          post_id: string
          reason: string
          report_id: string
          reporter_username: string
        }[]
      }
      admin_resolve_report: {
        Args: { p_report_id: string }
        Returns: undefined
      }
      admin_suspend_user: { Args: { p_user: string }; Returns: undefined }
      admin_unhide_post: { Args: { p_post_id: string }; Returns: undefined }
      admin_unsuspend_user: { Args: { p_user: string }; Returns: undefined }
      block_user: { Args: { target: string }; Returns: undefined }
      current_is_admin: { Args: never; Returns: boolean }
      current_is_suspended: { Args: never; Returns: boolean }
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
      get_founder_spots_left: { Args: never; Returns: number }
      get_heatmap: {
        Args: { p_profile_id: string }
        Returns: {
          breakdown: Json
          day: string
          points: number
        }[]
      }
      get_leaderboard: {
        Args: { p_school?: string; p_scope: string }
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
          weekly_points: number
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
        }[]
      }
      get_referral_stats: {
        Args: never
        Returns: {
          code: string
          is_campus_founder: boolean
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
      has_same_day_connection: {
        Args: { p_day: string; p_user: string }
        Returns: boolean
      }
      insert_notification: {
        Args: {
          p_actor_id: string
          p_post_id?: string
          p_reaction_type?: string
          p_type: string
          p_user_id: string
        }
        Returns: undefined
      }
      is_conversation_member: {
        Args: { p_conversation_id: string }
        Returns: boolean
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
          type: string
        }[]
      }
      log_contribution: {
        Args: { p_action_type: string; p_metadata?: Json }
        Returns: undefined
      }
      mark_all_notifications_read: { Args: never; Returns: undefined }
      mark_dm_read: { Args: { p_conversation_id: string }; Returns: undefined }
      record_profile_view: { Args: { p_viewed: string }; Returns: undefined }
      reject_follow: { Args: { p_follower: string }; Returns: undefined }
      request_follow: { Args: { p_target: string }; Returns: string }
      revoke_contribution_same_day: {
        Args: { p_action: string; p_created: string; p_user: string }
        Returns: undefined
      }
      set_referral_code: { Args: { p_code: string }; Returns: string }
      use_ai_quota: {
        Args: { p_cap: number; p_kind: string }
        Returns: boolean
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
