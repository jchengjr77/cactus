export interface Group {
  id: number;
  created_at: string;
  is_active: boolean;
  name: string;
  emoji_icon: string | null;
  cadence_hrs: number;
  updates_due: string | null;
  stake: number;
  stake_name: string | null;
  tab_id: number | null;
  members: string[]; // Array of user UUIDs
}

export interface User {
  id: number;
  created_at: string;
  name: string;
  email: string;
  uuid: string | null;
}

export interface Update {
  id: number;
  created_at: string;
  user_id: number; // Changed to number to match your users table
  group_id: number;
  content: string;
  media_url?: string | null;
  media_type?: 'photo' | 'video' | 'voice' | null;
  // Joined data
  user_name?: string;
  group_name?: string;
}
