import type { Business, AdminStats } from "../types";

export const mockBusinesses: Business[] = [
  // UDSM Businesses
  {
    id: "1",
    name: "Mama Shavu's Kitchen",
    category: "Food",
    description: "Authentic Swahili cuisine. Late-night service available near Hall 4.",
    imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80",
    amenities: ["delivery", "express"],
    whatsapp: "255700000001",
    rating: 4.8,
    isOpen: true,
    tags: ["Rice", "Wali", "Cheap", "Night Food", "Usiku", "Njaa", "Pilau", "Biryani"],
    isNegotiable: true,
    price: 2500, // TZS
    university: "UDSM",
    openingHours: "07:00",
    closingHours: "23:00",
    seoKeywords: ["food", "udsm", "wali", "cheap", "dinner"]
  },
  {
    id: "2",
    name: "Scholar’s Point Stationary",
    category: "Stationary",
    description: "Professional thesis binding, high-res printing, and scanning. Located at Yombo.",
    iconFallback: "printer",
    amenities: ["wifi", "color_print", "express"],
    whatsapp: "255700000002",
    rating: 4.5,
    isOpen: true,
    tags: ["Printing", "Binding", "Color", "Project", "Assignment", "Thesis", "Scan", "Notes"],
    isNegotiable: false,
    price: 100, // Per page
    university: "UDSM",
    openingHours: "08:00",
    closingHours: "20:00",
    seoKeywords: ["print", "stationery", "thesis", "binding", "udsm"]
  },
  {
    id: "3",
    name: "Campus Shuttle Service",
    category: "Travel",
    description: "Reliable internal campus transport from Main Gate to CoET.",
    iconFallback: "bus",
    amenities: ["express"],
    whatsapp: "255700000003",
    rating: 4.2,
    isOpen: true,
    tags: ["Shuttle", "Campus", "Transport", "Usafiri", "Bus"],
    price: 500,
    university: "UDSM",
    openingHours: "06:00",
    closingHours: "22:00",
    seoKeywords: ["transport", "shuttle", "bus", "udsm", "campus"]
  },
  // IFM Businesses
  {
    id: "6",
    name: "City Center Fries",
    category: "Food",
    description: "Quick bites, energy drinks, and noodles. Best fries in town.",
    imageUrl: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&q=80",
    amenities: ["delivery", "express"],
    whatsapp: "255700000006",
    rating: 4.3,
    isOpen: false,
    tags: ["Noodles", "Snack", "Drinks", "Soda", "Chips"],
    price: 2000,
    university: "IFM",
    openingHours: "10:00",
    closingHours: "19:00",
    seoKeywords: ["food", "fries", "chips", "ifm", "lunch"]
  },
  {
    id: "8",
    name: "Posta Books & More",
    category: "Stationary",
    description: "Quality textbooks and novels for finance students.",
    iconFallback: "book",
    amenities: ["delivery"],
    whatsapp: "255700000008",
    rating: 4.4,
    isOpen: true,
    tags: ["Books", "Novel", "Textbook", "Vitabu", "Finance"],
    isNegotiable: true,
    price: 15000,
    university: "IFM",
    openingHours: "09:00",
    closingHours: "18:00",
    seoKeywords: ["books", "stationery", "finance", "ifm", "textbooks"]
  },

  // CBE Businesses
  {
    id: "9",
    name: "Business Class Prints",
    category: "Stationary",
    description: "High-volume printing and photocopying services for business students.",
    iconFallback: "printer",
    amenities: ["color_print", "express", "wifi"],
    whatsapp: "255700000009",
    rating: 4.6,
    isOpen: true,
    tags: ["Bulk", "Copy", "Print", "Photo", "Passport"],
    price: 50,
    university: "CBE",
    openingHours: "07:30",
    closingHours: "19:30",
    seoKeywords: ["print", "copy", "cbe", "business", "stationery"]
  },
  {
    id: "10",
    name: "CBE Cafeteria",
    category: "Food",
    description: "Affordable meals for students. Rice, beans, and chapati.",
    iconFallback: "food",
    amenities: ["express"],
    whatsapp: "255700000010",
    rating: 4.1,
    isOpen: true,
    tags: ["Food", "Lunch", "Cheap", "Canteen"],
    price: 1500,
    university: "CBE",
    openingHours: "11:00",
    closingHours: "15:00",
    seoKeywords: ["food", "lunch", "cbe", "cheap", "cafeteria"]
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
  playbookUsage: [
    { subject: "Calculus", queries: 340 },
    { subject: "History", queries: 120 },
    { subject: "Physics", queries: 280 },
    { subject: "Literature", queries: 90 },
    { subject: "Computer Science", queries: 500 }
  ]
};
