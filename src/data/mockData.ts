import type { Business, AdminStats } from "../types";

export const mockBusinesses: Business[] = [
  {
    id: "1",
    name: "Mama Shavu's Kitchen",
    category: "Food",
    description: "Authentic Swahili cuisine. Late-night service available.",
    imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80",
    amenities: ["delivery", "express"],
    whatsapp: "1234567890",
    rating: 4.8,
    isOpen: true,
    tags: ["Rice", "Wali", "Cheap", "Night Food", "Usiku", "Njaa", "Pilau", "Biryani"],
    isNegotiable: true,
    price: 2500 // TZS
  },
  {
    id: "2",
    name: "Scholar’s Point Stationary",
    category: "Stationary",
    description: "Professional thesis binding, high-res printing, and scanning.",
    iconFallback: "printer",
    amenities: ["wifi", "color_print", "express"],
    whatsapp: "1234567891",
    rating: 4.5,
    isOpen: true,
    tags: ["Printing", "Binding", "Color", "Project", "Assignment", "Thesis", "Scan", "Notes"],
    isNegotiable: false,
    price: 100 // Per page
  },
  {
    id: "3",
    name: "Abood Bus Service",
    category: "Travel",
    description: "Daily intercity travel. Exclusive student discounts.",
    iconFallback: "bus",
    amenities: ["wifi", "express"],
    whatsapp: "1234567892",
    rating: 4.2,
    isOpen: true,
    tags: ["Bus", "Ticket", "Travel", "Safari", "Discount", "Nauli"],
    price: 30000
  },
  {
    id: "4",
    name: "The Tech Guy",
    category: "Tech",
    description: "Expert phone repair, screen replacements, and accessories.",
    iconFallback: "tech",
    amenities: ["express"],
    whatsapp: "1234567893",
    rating: 4.9,
    isOpen: true,
    tags: ["Repair", "Phone", "Simu", "Screen", "Battery", "Fundi"],
    isNegotiable: true,
    price: 15000
  },
  {
    id: "5",
    name: "Ernest AI Premium",
    category: "Other",
    description: "Unlock advanced academic intelligence tools.",
    iconFallback: "default",
    amenities: ["wifi"],
    whatsapp: "1234567894",
    rating: 5.0,
    isOpen: true,
    tags: ["AI", "Smart", "Study", "Premium", "Help"],
    price: 5000
  },
  {
    id: "6",
    name: "Flash Canteen",
    category: "Food",
    description: "Quick bites, energy drinks, and noodles.",
    imageUrl: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&q=80",
    amenities: ["delivery", "express"],
    whatsapp: "1234567895",
    rating: 4.3,
    isOpen: false,
    tags: ["Noodles", "Snack", "Drinks", "Soda", "Chapati"],
    price: 1500
  },
  {
    id: "7",
    name: "Kijana Smart Barber",
    category: "Grooming",
    description: "Premium cuts for the modern gentleman.",
    iconFallback: "scissors",
    amenities: ["wifi"],
    whatsapp: "1234567896",
    rating: 4.7,
    isOpen: true,
    tags: ["Barber", "Cut", "Nyoa", "Hair", "Style"],
    price: 5000
  },
  {
    id: "8",
    name: "Mwenge Books",
    category: "Stationary",
    description: "Quality second-hand textbooks and novels.",
    iconFallback: "book",
    amenities: ["delivery"],
    whatsapp: "1234567897",
    rating: 4.4,
    isOpen: true,
    tags: ["Books", "Novel", "Textbook", "Vitabu", "Used"],
    isNegotiable: true,
    price: 10000
  },
  {
    id: "9",
    name: "Campus Shuttle",
    category: "Travel",
    description: "Reliable internal campus transport.",
    iconFallback: "bus",
    amenities: ["express"],
    whatsapp: "1234567898",
    rating: 4.0,
    isOpen: true,
    tags: ["Shuttle", "Campus", "Transport", "Usafiri"],
    price: 500
  },
  {
    id: "10",
    name: "Digital Copy Centre",
    category: "Stationary",
    description: "High-volume printing and photocopying services.",
    iconFallback: "printer",
    amenities: ["color_print", "express", "wifi"],
    whatsapp: "1234567899",
    rating: 4.6,
    isOpen: true,
    tags: ["Bulk", "Copy", "Print", "Photo", "Passport"],
    price: 50
  }
];

export const mockAdminStats: AdminStats = {
  peakHungerTimes: [
    { time: "10:00", orders: 20 },
    { time: "12:00", orders: 120 },
    { time: "14:00", orders: 90 },
    { time: "16:00", orders: 40 },
    { time: "18:00", orders: 80 },
    { time: "20:00", orders: 150 },
    { time: "22:00", orders: 60 }
  ],
  printingVolume: [
    { shop: "Scholar's Point", pages: 1200 },
    { shop: "Digital Copy", pages: 3400 },
    { shop: "Mwenge Books", pages: 150 }
  ],
  travelTrends: [
    { destination: "City Center", count: 450 },
    { destination: "Home", count: 320 },
    { destination: "Beach", count: 120 },
    { destination: "Mall", count: 210 }
  ],
  ernestUsage: [
    { subject: "Calculus", queries: 340 },
    { subject: "History", queries: 120 },
    { subject: "Physics", queries: 280 },
    { subject: "Literature", queries: 90 },
    { subject: "Computer Science", queries: 500 }
  ]
};
