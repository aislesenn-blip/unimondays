export type UserRole = 'student' | 'merchant' | 'admin';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  phone?: string;
  university?: string;
  category?: Category;
}

export type Category = 'Stationary' | 'Food' | 'Travel';

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
  price?: number; // Base price for sorting
  university: string;
  openingHours?: string;
  closingHours?: string;
  seoKeywords?: string[];
  // New props for Vendor Config (merged into Business for simplicity or managed separately in OrderContext)
  lipaNumber?: string;
  lipaName?: string;
  orderMode?: 'realtime' | 'batch';
  orderWindow?: { open: string; close: string };
}

export interface VendorConfig {
  lipaNumber: string;
  lipaName: string;
  orderMode: 'realtime' | 'batch';
  orderWindow: { open: string; close: string };
  instructions: string;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  description?: string;
  // No image
}

export interface OrderItem {
  id: string; // unique instance id for redemption
  menuItemId: string;
  name: string;
  price: number;
  status: 'active' | 'redeemed';
}

export interface Order {
  id: string;
  vendorId: string;
  studentId: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  paymentName: string;
  contactPhone: string;
  timestamp: Date;
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
  playbookUsage: { subject: string; queries: number }[];
}
