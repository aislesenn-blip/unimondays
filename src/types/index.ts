export type UserRole = 'student' | 'merchant' | 'admin';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  phone?: string;
}

export type Category = 'Stationary' | 'Food' | 'Travel' | 'Opportunities' | 'Tech' | 'Grooming' | 'Other';

export interface Business {
  id: string;
  name: string;
  category: Category;
  description: string;
  imageUrl?: string;
  iconFallback?: 'printer' | 'food' | 'bus' | 'tech' | 'scissors' | 'book' | 'default';
  amenities: ('delivery' | 'express' | 'wifi' | 'color_print')[];
  whatsapp: string;
  rating: number;
  isOpen: boolean;
  tags?: string[];
  isNegotiable?: boolean;
  price?: number; // Base price for sorting (e.g., avg meal cost or printing per page)
}

export interface ErnestMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  action?: ErnestAction;
  timestamp: Date;
}

export interface ErnestAction {
  type: 'format_doc' | 'ocr_scan' | 'rewrite_text' | 'summarize';
  status: 'pending' | 'processing' | 'completed';
  result?: string;
}

export interface AdminStats {
  peakHungerTimes: { time: string; orders: number }[];
  printingVolume: { shop: string; pages: number }[];
  travelTrends: { destination: string; count: number }[];
  ernestUsage: { subject: string; queries: number }[];
}
