export type UserRole = "org" | "researcher" | "triager" | "admin";
export type ProgramType = "bug_bounty" | "vdp";
export type ProgramStatus = "draft" | "active" | "paused" | "archived";
export type SubmissionStatus = "new" | "triaging" | "needs_info" | "accepted" | "rejected" | "duplicate" | "wont_fix" | "resolved";
export type SeverityLevel = "critical" | "high" | "medium" | "low" | "info";
export type RewardStatus = "pending" | "approved" | "paid" | "declined";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  username: string | null;
  role: UserRole;
  org_id: string | null;
  bio: string | null;
  website: string | null;
  twitter: string | null;
  github: string | null;
  reputation: number;
  is_onboarded: boolean;
  created_at: string;
  updated_at: string;
}

export interface Program {
  id: string;
  org_id: string;
  name: string;
  slug: string;
  type: ProgramType;
  status: ProgramStatus;
  description: string;
  scope_in: string[];
  scope_out: string[];
  rules: string;
  min_reward: number | null;
  max_reward: number | null;
  avg_response_hours: number;
  total_submissions: number;
  total_paid: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface Submission {
  id: string;
  program_id: string;
  researcher_id: string;
  title: string;
  description: string;
  steps_to_reproduce: string;
  impact: string;
  severity: SeverityLevel;
  status: SubmissionStatus;
  ai_severity: SeverityLevel | null;
  ai_confidence: number | null;
  ai_duplicate_of: string | null;
  ai_analysis: string | null;
  content_hash: string;
  attachments: string[];
  triager_id: string | null;
  triager_note: string | null;
  created_at: string;
  updated_at: string;
}


export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          username: string | null;
          role: UserRole;
          org_id: string | null;
          bio: string | null;
          website: string | null;
          twitter: string | null;
          github: string | null;
          reputation: number;
          is_onboarded: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          username?: string | null;
          role?: UserRole;
          org_id?: string | null;
          bio?: string | null;
          website?: string | null;
          twitter?: string | null;
          github?: string | null;
          reputation?: number;
          is_onboarded?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          username?: string | null;
          role?: UserRole;
          org_id?: string | null;
          bio?: string | null;
          website?: string | null;
          twitter?: string | null;
          github?: string | null;
          reputation?: number;
          is_onboarded?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          logo_url: string | null;
          website: string | null;
          description: string | null;
          industry: string | null;
          owner_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          logo_url?: string | null;
          website?: string | null;
          description?: string | null;
          industry?: string | null;
          owner_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          logo_url?: string | null;
          website?: string | null;
          description?: string | null;
          industry?: string | null;
          owner_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      programs: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          slug: string;
          type: ProgramType;
          status: ProgramStatus;
          description: string;
          scope_in: string[];
          scope_out: string[];
          rules: string;
          min_reward: number | null;
          max_reward: number | null;
          avg_response_hours: number;
          total_submissions: number;
          total_paid: number;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          name: string;
          slug: string;
          type?: ProgramType;
          status?: ProgramStatus;
          description?: string;
          scope_in?: string[];
          scope_out?: string[];
          rules?: string;
          min_reward?: number | null;
          max_reward?: number | null;
          avg_response_hours?: number;
          total_submissions?: number;
          total_paid?: number;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          name?: string;
          slug?: string;
          type?: ProgramType;
          status?: ProgramStatus;
          description?: string;
          scope_in?: string[];
          scope_out?: string[];
          rules?: string;
          min_reward?: number | null;
          max_reward?: number | null;
          avg_response_hours?: number;
          total_submissions?: number;
          total_paid?: number;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      submissions: {
        Row: {
          id: string;
          program_id: string;
          researcher_id: string;
          title: string;
          description: string;
          steps_to_reproduce: string;
          impact: string;
          severity: SeverityLevel;
          status: SubmissionStatus;
          ai_severity: SeverityLevel | null;
          ai_confidence: number | null;
          ai_duplicate_of: string | null;
          ai_analysis: string | null;
          content_hash: string;
          attachments: string[];
          triager_id: string | null;
          triager_note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          program_id: string;
          researcher_id: string;
          title: string;
          description: string;
          steps_to_reproduce?: string;
          impact?: string;
          severity: SeverityLevel;
          status?: SubmissionStatus;
          ai_severity?: SeverityLevel | null;
          ai_confidence?: number | null;
          ai_duplicate_of?: string | null;
          ai_analysis?: string | null;
          content_hash: string;
          attachments?: string[];
          triager_id?: string | null;
          triager_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          program_id?: string;
          researcher_id?: string;
          title?: string;
          description?: string;
          steps_to_reproduce?: string;
          impact?: string;
          severity?: SeverityLevel;
          status?: SubmissionStatus;
          ai_severity?: SeverityLevel | null;
          ai_confidence?: number | null;
          ai_duplicate_of?: string | null;
          ai_analysis?: string | null;
          content_hash?: string;
          attachments?: string[];
          triager_id?: string | null;
          triager_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      rewards: {
        Row: {
          id: string;
          submission_id: string;
          org_id: string;
          researcher_id: string;
          amount: number;
          currency: string;
          status: RewardStatus;
          approved_by: string | null;
          approved_at: string | null;
          paid_at: string | null;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          submission_id: string;
          org_id: string;
          researcher_id: string;
          amount: number;
          currency?: string;
          status?: RewardStatus;
          approved_by?: string | null;
          approved_at?: string | null;
          paid_at?: string | null;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          submission_id?: string;
          org_id?: string;
          researcher_id?: string;
          amount?: number;
          currency?: string;
          status?: RewardStatus;
          approved_by?: string | null;
          approved_at?: string | null;
          paid_at?: string | null;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          action: string;
          entity: string;
          entity_id: string | null;
          before: any;
          after: any;
          ip: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          action: string;
          entity: string;
          entity_id?: string | null;
          before?: any;
          after?: any;
          ip?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_id?: string | null;
          action?: string;
          entity?: string;
          entity_id?: string | null;
          before?: any;
          after?: any;
          ip?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          body: string;
          link: string | null;
          entity: string | null;
          entity_id: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          body: string;
          link?: string | null;
          entity?: string | null;
          entity_id?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          title?: string;
          body?: string;
          link?: string | null;
          entity?: string | null;
          entity_id?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
      };
        notification_preferences: {
        Row: {
          user_id: string;
          app_submission_new: boolean;
          app_submission_update: boolean;
          app_reward_update: boolean;
          email_submission_new: boolean;
          email_submission_update: boolean;
          email_reward_update: boolean;
          email_digest_weekly: boolean;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          app_submission_new?: boolean;
          app_submission_update?: boolean;
          app_reward_update?: boolean;
          email_submission_new?: boolean;
          email_submission_update?: boolean;
          email_reward_update?: boolean;
          email_digest_weekly?: boolean;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          app_submission_new?: boolean;
          app_submission_update?: boolean;
          app_reward_update?: boolean;
          email_submission_new?: boolean;
          email_submission_update?: boolean;
          email_reward_update?: boolean;
          email_digest_weekly?: boolean;
          updated_at?: string;
        };
      };
      code_repos: {
        Row: {
          id: string;
          org_id: string | null;
          profile_id: string | null;
          github_url: string;
          owner_name: string;
          repo_name: string;
          default_branch: string;
          connected_by: string;
          last_scanned_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id?: string | null;
          profile_id?: string | null;
          github_url: string;
          owner_name: string;
          repo_name: string;
          default_branch?: string;
          connected_by: string;
          last_scanned_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string | null;
          profile_id?: string | null;
          github_url?: string;
          owner_name?: string;
          repo_name?: string;
          default_branch?: string;
          connected_by?: string;
          last_scanned_at?: string | null;
          created_at?: string;
        };
      };
      code_scans: {
        Row: {
          id: string;
          repo_id: string;
          status: "pending" | "running" | "complete" | "failed";
          score: number | null;
          summary: string | null;
          findings: any;
          files_scanned: number;
          error: string | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          repo_id: string;
          status?: "pending" | "running" | "complete" | "failed";
          score?: number | null;
          summary?: string | null;
          findings?: any;
          files_scanned?: number;
          error?: string | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          repo_id?: string;
          status?: "pending" | "running" | "complete" | "failed";
          score?: number | null;
          summary?: string | null;
          findings?: any;
          files_scanned?: number;
          error?: string | null;
          created_at?: string;
          completed_at?: string | null;
        };
      };
    };
    Views: {
      researcher_earnings: {
        Row: {
          researcher_id: string;
          paid_count: number;
          total_paid: number;
          total_pending: number;
        };
      };
      leaderboard: {
        Row: {
          id: string;
          username: string | null;
          full_name: string | null;
          avatar_url: string | null;
          reputation: number;
          accepted_count: number;
          total_submissions: number;
          total_earned: number;
        };
      };
    };
    Functions: {
      find_similar_submissions: {
        Args: {
          p_program_id: string;
          p_title: string;
          p_description: string;
          p_threshold?: number;
        };
        Returns: {
          id: string;
          title: string;
          title_sim: number;
          desc_sim: number;
          combined_sim: number;
        }[];
      };
    };
    Enums: {
      user_role: UserRole;
      program_type: ProgramType;
      program_status: ProgramStatus;
      submission_status: SubmissionStatus;
      severity_level: SeverityLevel;
      reward_status: RewardStatus;
      notification_type: string;
    };
  };
}
