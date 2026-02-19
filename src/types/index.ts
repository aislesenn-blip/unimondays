export type UserRole = 'student' | 'merchant' | 'admin';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  phone?: string;
  university?: string;
  category?: Category;
  businessId?: string; // Link to a business if role is merchant
}

export type Category = 'Stationary' | 'Food' | 'Travel';

export type TurnaroundTime = 'Instant' | '2 Hours' | 'Next Day';

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

  // Vendor Configuration
  lipaNumber?: string;
  lipaName?: string;
  orderMode?: 'realtime' | 'batch';
  orderWindow?: { open: string; close: string };
  instructions?: string;
  turnaroundTime?: TurnaroundTime;
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
  icon?: string; // Lucide icon name or similar identifier
}

export interface OrderItem {
  id: string; // unique instance id for redemption
  menuItemId: string;
  name: string;
  price: number;
  status: 'active' | 'redeemed';
  redeemedAt?: Date;
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

  // Custom Task Fields
  type: 'standard' | 'custom_task';
  customDetails?: {
    description: string;
    fileUrl?: string;
  };
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
