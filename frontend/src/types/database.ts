export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          discord_id: string | null;
          discord_username: string | null;
          display_name: string | null;
          is_gm: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          discord_id?: string | null;
          discord_username?: string | null;
          display_name?: string | null;
          is_gm?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          discord_id?: string | null;
          discord_username?: string | null;
          display_name?: string | null;
          is_gm?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      pilots: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          callsign: string | null;
          license_level: number;
          ll_clock_progress: number;
          background: string | null;
          notes: string | null;
          manna: number;
          downtime: number;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          callsign?: string | null;
          license_level?: number;
          ll_clock_progress?: number;
          background?: string | null;
          notes?: string | null;
          manna?: number;
          downtime?: number;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          callsign?: string | null;
          license_level?: number;
          ll_clock_progress?: number;
          background?: string | null;
          notes?: string | null;
          manna?: number;
          downtime?: number;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      corporations: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      exotic_gear: {
        Row: {
          id: string;
          pilot_id: string;
          name: string;
          description: string | null;
          acquired_date: string;
          notes: string | null;
          acquired_log_id: string | null;
          lost_log_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          pilot_id: string;
          name: string;
          description?: string | null;
          acquired_date?: string;
          notes?: string | null;
          acquired_log_id?: string | null;
          lost_log_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          pilot_id?: string;
          name?: string;
          description?: string | null;
          acquired_date?: string;
          notes?: string | null;
          acquired_log_id?: string | null;
          lost_log_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      clocks: {
        Row: {
          id: string;
          pilot_id: string | null;
          name: string;
          segments: number;
          filled: number;
          tick_amount: number;
          manual_ticks: number;
          is_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          pilot_id?: string | null;
          name: string;
          segments: number;
          filled?: number;
          tick_amount?: number;
          manual_ticks?: number;
          is_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          pilot_id?: string | null;
          name?: string;
          segments?: number;
          filled?: number;
          tick_amount?: number;
          manual_ticks?: number;
          is_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      log_entries: {
        Row: {
          id: string;
          pilot_id: string;
          log_type: "game" | "trade";
          description: string | null;
          manna_change: number;
          downtime_change: number;
          ll_clock_change: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          pilot_id: string;
          log_type: "game" | "trade";
          description?: string | null;
          manna_change?: number;
          downtime_change?: number;
          ll_clock_change?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          pilot_id?: string;
          log_type?: "game" | "trade";
          description?: string | null;
          manna_change?: number;
          downtime_change?: number;
          ll_clock_change?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      clock_progress: {
        Row: {
          id: string;
          log_entry_id: string;
          clock_id: string;
          ticks_applied: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          log_entry_id: string;
          clock_id: string;
          ticks_applied: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          log_entry_id?: string;
          clock_id?: string;
          ticks_applied?: number;
          created_at?: string;
        };
      };
      reputation_changes: {
        Row: {
          id: string;
          log_entry_id: string;
          pilot_id: string;
          corporation_id: string;
          change_value: number;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          log_entry_id: string;
          pilot_id: string;
          corporation_id: string;
          change_value: number;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          log_entry_id?: string;
          pilot_id?: string;
          corporation_id?: string;
          change_value?: number;
          notes?: string | null;
          created_at?: string;
        };
      };
    };
    Enums: {
      log_type: "game" | "trade";
    };
  };
};

// Convenience types
export type User = Database["public"]["Tables"]["users"]["Row"];
export type Pilot = Database["public"]["Tables"]["pilots"]["Row"];
export type Corporation = Database["public"]["Tables"]["corporations"]["Row"];
export type ExoticGear = Database["public"]["Tables"]["exotic_gear"]["Row"];
export type Clock = Database["public"]["Tables"]["clocks"]["Row"];
export type LogEntry = Database["public"]["Tables"]["log_entries"]["Row"];
export type ClockProgress =
  Database["public"]["Tables"]["clock_progress"]["Row"];
export type ReputationChange =
  Database["public"]["Tables"]["reputation_changes"]["Row"];
export type LogType = Database["public"]["Enums"]["log_type"];

// View types (aggregated from tables)
export type PilotReputation = {
  pilot_id: string;
  corporation_id: string;
  corporation_name: string;
  reputation_value: number;
};
