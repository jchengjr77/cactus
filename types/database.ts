export interface Group {
  id: number;
  created_at: string;
  is_active: boolean;
  name: string;
  emoji_icon: string | null;
  cadence_hrs: number;
  updates_due: string | null;
  points: number;
  members: number[]; // Array of user IDs
  emails_invited: string[]; // Array of invited emails
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
  comments: number[]; // Array of comment IDs attached to this update
  reactions: number[]; // Array of reaction IDs attached to this update
  media_url?: string | null;
  media_type?: 'photo' | 'video' | 'voice' | null;
  media?: string[]; // Array of photo URLs in storage
  // Joined data
  user_name?: string;
  user_avatar_color?: string | null;
  group_name?: string;
  group_emoji?: string | null;
  group_points?: number;
  comment_count?: number;
}

export type NotificationType =
  | 'group_invite'
  | 'group_settings_change'
  | 'group_members_change'
  | 'new_update'
  | 'new_comment'
  | 'new_reaction'
  | 'update_due'
  | 'update_missed_self'
  | 'update_missed_other'
  | 'group_streak'
  | 'group_reward';

export interface Notification {
  id: number;
  created_at: string;
  notification_type: NotificationType;
  data: any;
  user: number;
  opened: boolean;
}

export interface Comment {
  id: number;
  created_at: string;
  content: string;
  update: number; // Maps to 'update' in database (parent update ID)
  user: number; // Maps to 'user' in database (author user ID)
  // Joined data
  user_name?: string;
  user_avatar_color?: string | null;
}

export interface Reaction {
  id: number;
  created_at: string;
  user: number; // User ID who reacted
  update: number; // Update ID that was reacted to
  reaction: string; // The reaction emoji/type
}

export interface ReactionPack {
  id: number;
  pack_name: string;
  reactions: string[]; // Array of reaction emojis in this pack
  unlock_threshold: number; // Points needed to unlock this pack
}
