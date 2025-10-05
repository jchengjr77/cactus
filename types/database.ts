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
  avatar_color: string | null;
}

export interface Update {
  id: number;
  created_at: string;
  user_id: number; // Maps to 'author' in database
  group_id: number; // Maps to 'parent_group_id' in database
  content: string;
  read_by: number[]; // Array of user IDs who have read this update
  media_url?: string | null;
  media_type?: 'photo' | 'video' | 'voice' | null;
  // Joined data
  user_name?: string;
  user_avatar_color?: string | null;
  group_name?: string;
  group_emoji?: string | null;
}
