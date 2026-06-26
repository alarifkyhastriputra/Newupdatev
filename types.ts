
export interface User {
  id: string;
  name: string;
  email: string;
  bio: string;
  photoURL: string;
  followers: string[]; // array of user IDs
  following: string[]; // array of user IDs
  totalLikes: number;
  recentCaptures?: string[]; // array of image URLs
  isAdmin?: boolean;
  isBanned?: boolean;
  role?: string; // Custom role assigned by Admin King
  roleColor?: string; // Custom hex color for the role
}

export interface Story {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  text?: string;
  photoURL?: string;
  createdAt: number;
}

export interface Post {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  text: string;
  photoURL?: string;
  videoURL?: string;
  musicURL?: string;
  timestamp: number;
  likes: string[]; // array of user IDs
  dislikes: string[];
  comments: Comment[];
  isTakenDown?: boolean;
}

export interface Announcement {
  id: string;
  text: string;
  timestamp: number;
  authorId: string;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
}

export interface Notification {
  id: string;
  senderId: string;
  senderName: string;
  senderPhoto: string;
  type: 'follow' | 'like' | 'comment';
  timestamp: number;
  read: boolean;
}

export interface Group {
  id: string;
  name: string;
  bio?: string;
  photoURL?: string;
  creatorId: string;
  participants: string[]; // array of user IDs
  admins: string[]; // array of user IDs
  lastMessage?: string;
  lastTimestamp?: number;
}

export const View = {
  FEED: 'feed',
  REELS: 'reels',
  POST: 'post',
  LEADERBOARD: 'leaderboard',
  NOTIFICATIONS: 'notifications',
  CHAT: 'chat',
  PROFILE: 'profile',
  ADMIN: 'admin'
} as const;

export type View = typeof View[keyof typeof View];
