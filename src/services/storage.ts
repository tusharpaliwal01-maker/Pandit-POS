import {
  Shop,
  User,
  Category,
  Product,
  Customer,
  Invoice,
  CartItem,
  KhataEntry,
  PaymentMethod,
  ParsedSupplierBill,
  HardwareConfig,
  BackupData,
  BarcodeScannerSettings,
} from '../types';

const STORAGE_KEYS = {
  SHOPS: 'pandit_pos_shops',
  USERS: 'pandit_pos_users',
  CATEGORIES: 'pandit_pos_categories',
  PRODUCTS: 'pandit_pos_products',
  CUSTOMERS: 'pandit_pos_customers',
  INVOICES: 'pandit_pos_invoices',
  KHATA_ENTRIES: 'pandit_pos_khata_entries',
  CURRENT_SESSION: 'pandit_pos_session',
  PRINTER_CONFIG: 'npf-billing-printer',
  HARDWARE_CONFIG: 'pandit_pos_hardware_config',
};

// Initial Seed Shops
const SEED_SHOPS: Shop[] = [
  {
    id: 'shop-1',
    name: 'PANDIT FIREWORKS & CELEBRATIONS',
    code: 'PFC-MAIN',
    gstin: '07AAECP1234F1Z5',
    address: 'Shop No. 12-14, Fireworks Wholesale Market, Main Bazar',
    city: 'Delhi',
    state: 'Delhi',
    pincode: '110006',
    phonePrimary: '+91 98765 43210',
    phoneSecondary: '+91 98111 22334',
    email: 'contact@panditfireworks.com',
    upiId: 'panditfireworks@upi',
    receiptFooter: 'Wish you a Safe, Green & Prosperous Diwali! Goods once sold cannot be returned or exchanged.',
    defaultPaperWidth: '80mm',
    defaultPrinterQueue: 'RETSOL RTP82',
    createdAt: '2026-01-01T00:00:00Z',
    active: true,
  },
  {
    id: 'shop-2',
    name: 'PANDIT CRACKER DEPOT (Branch 2)',
    code: 'PCD-BR2',
    gstin: '07AAECP1234F2Z4',
    address: 'Plot 45, Ring Road Bypass, Near Sivakasi Godown',
    city: 'Gurugram',
    state: 'Haryana',
    pincode: '122001',
    phonePrimary: '+91 99887 76655',
    email: 'branch2@panditfireworks.com',
    upiId: 'panditcrackerbranch@upi',
    receiptFooter: 'PESO Certified Green Fireworks. Celebrate responsibly.',
    defaultPaperWidth: '80mm',
    defaultPrinterQueue: 'RETSOL RTP82',
    createdAt: '2026-02-15T00:00:00Z',
    active: true,
  },
];

// Initial Seed Users with Credentials and Role Permissions
const SEED_USERS: User[] = [
  {
    id: 'user-super',
    shopId: 'shop-1',
    username: 'tushar.paliwal01',
    password: 'Asdf@1234',
    fullName: 'Tushar Paliwal (Supermaster)',
    mobile: '9876543210',
    role: 'SUPERMASTER',
    permissions: {
      canBilling: true,
      canInventory: true,
      canReports: true,
      canSettings: true,
      canManageStaff: true,
    },
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'user-pandit-store',
    shopId: 'shop-1',
    username: 'panditfireworks',
    password: 'pandit12345678',
    fullName: 'Pandit Fireworks Store Owner',
    mobile: '9811122334',
    role: 'ADMIN',
    permissions: {
      canBilling: true,
      canInventory: true,
      canReports: true,
      canSettings: true,
      canManageStaff: true,
    },
    active: true,
    createdAt: '2026-01-02T00:00:00Z',
  },
  {
    id: 'user-admin-1',
    shopId: 'shop-1',
    username: 'admin',
    password: 'pandit12345678',
    fullName: 'Rajesh Sharma (Store Admin)',
    mobile: '9988776655',
    role: 'ADMIN',
    permissions: {
      canBilling: true,
      canInventory: true,
      canReports: true,
      canSettings: true,
      canManageStaff: true,
    },
    active: true,
    createdAt: '2026-01-05T00:00:00Z',
  },
  {
    id: 'user-staff-1',
    shopId: 'shop-1',
    username: 'staff',
    password: 'staff123',
    fullName: 'Amit Kumar (Cashier)',
    mobile: '9123456780',
    role: 'STAFF',
    permissions: {
      canBilling: true,
      canInventory: false,
      canReports: false,
      canSettings: false,
      canManageStaff: false,
    },
    active: true,
    createdAt: '2026-01-10T00:00:00Z',
  },
];

// Initial Seed Categories
const SEED_CATEGORIES: Category[] = [
  { id: 'cat-1', shopId: 'shop-1', name: 'Sparklers (Phuljhadi)', code: 'SPARK' },
  { id: 'cat-2', shopId: 'shop-1', name: 'Flower Pots (Anar)', code: 'ANAR' },
  { id: 'cat-3', shopId: 'shop-1', name: 'Ground Chakkars', code: 'CHAKRA' },
  { id: 'cat-4', shopId: 'shop-1', name: 'Rockets & Missiles', code: 'ROCKET' },
  { id: 'cat-5', shopId: 'shop-1', name: 'Aerial Multi-Shots (Cakes)', code: 'CAKE' },
  { id: 'cat-6', shopId: 'shop-1', name: 'Garlands & Crackers (Ladi)', code: 'LADI' },
  { id: 'cat-7', shopId: 'shop-1', name: 'Gift Boxes & Assorted', code: 'GIFT' },
];

// Initial Seed Fireworks Products
const SEED_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    shopId: 'shop-1',
    name: '10cm Electric Sparklers (10 pcs/box)',
    barcode: '890123400001',
    category: 'Sparklers (Phuljhadi)',
    purchasePrice: 28,
    mrp: 65,
    sellingPrice: 50,
    gstRate: 18,
    stockQty: 350,
    lowStockThreshold: 40,
    unit: 'box',
    description: 'Bright golden sparks, low smoke, safe indoor/outdoor sparklers.',
    batchNumber: 'PFC-2026-B1',
    active: true,
  },
  {
    id: 'prod-2',
    shopId: 'shop-1',
    name: '15cm Tri-Colour Sparklers (Green/Red/Gold)',
    barcode: '890123400002',
    category: 'Sparklers (Phuljhadi)',
    purchasePrice: 45,
    mrp: 110,
    sellingPrice: 85,
    gstRate: 18,
    stockQty: 220,
    lowStockThreshold: 30,
    unit: 'box',
    description: 'Long burning 15cm color sparklers, 10 pcs.',
    batchNumber: 'PFC-2026-B1',
    active: true,
  },
  {
    id: 'prod-3',
    shopId: 'shop-1',
    name: '30cm Giant Night Sparklers (5 pcs)',
    barcode: '890123400003',
    category: 'Sparklers (Phuljhadi)',
    purchasePrice: 80,
    mrp: 180,
    sellingPrice: 140,
    gstRate: 18,
    stockQty: 18,
    lowStockThreshold: 25, // LOW STOCK
    unit: 'box',
    description: 'Mega 30cm sparklers with crackling stars.',
    batchNumber: 'PFC-2026-B2',
    active: true,
  },
  {
    id: 'prod-4',
    shopId: 'shop-1',
    name: 'Special Ashoka Deluxe Flower Pot (10 pcs)',
    barcode: '890123400004',
    category: 'Flower Pots (Anar)',
    purchasePrice: 130,
    mrp: 290,
    sellingPrice: 220,
    gstRate: 18,
    stockQty: 85,
    lowStockThreshold: 20,
    unit: 'box',
    description: 'High vertical golden fountain, 15 feet spray height.',
    batchNumber: 'PFC-2026-B3',
    active: true,
  },
  {
    id: 'prod-5',
    shopId: 'shop-1',
    name: 'Colour Tri-Flower Pot Fountain (5 pcs)',
    barcode: '890123400005',
    category: 'Flower Pots (Anar)',
    purchasePrice: 160,
    mrp: 350,
    sellingPrice: 280,
    gstRate: 18,
    stockQty: 60,
    lowStockThreshold: 15,
    unit: 'box',
    description: 'Three-stage colour shifting anar (Red to Silver to Crackling).',
    batchNumber: 'PFC-2026-B3',
    active: true,
  },
  {
    id: 'prod-6',
    shopId: 'shop-1',
    name: 'Deluxe Special Ground Chakra (10 pcs)',
    barcode: '890123400006',
    category: 'Ground Chakkars',
    purchasePrice: 75,
    mrp: 175,
    sellingPrice: 130,
    gstRate: 18,
    stockQty: 140,
    lowStockThreshold: 30,
    unit: 'box',
    description: 'Fast spinning silver wheel with crackling perimeter.',
    batchNumber: 'PFC-2026-B4',
    active: true,
  },
  {
    id: 'prod-7',
    shopId: 'shop-1',
    name: 'Mega Disco Whistling Chakkar (5 pcs)',
    barcode: '890123400007',
    category: 'Ground Chakkars',
    purchasePrice: 110,
    mrp: 240,
    sellingPrice: 190,
    gstRate: 18,
    stockQty: 12, // LOW STOCK
    lowStockThreshold: 20,
    unit: 'box',
    description: 'Musical whistling ground spinner with vibrant green halo.',
    batchNumber: 'PFC-2026-B4',
    active: true,
  },
  {
    id: 'prod-8',
    shopId: 'shop-1',
    name: 'Sonic Boom Sound Rocket (10 pcs)',
    barcode: '890123400008',
    category: 'Rockets & Missiles',
    purchasePrice: 140,
    mrp: 320,
    sellingPrice: 250,
    gstRate: 28,
    stockQty: 95,
    lowStockThreshold: 25,
    unit: 'box',
    description: 'High altitude sonic bang rocket with green trail.',
    batchNumber: 'PFC-2026-B5',
    active: true,
  },
  {
    id: 'prod-9',
    shopId: 'shop-1',
    name: 'Twinkling Star Parachute Rocket (5 pcs)',
    barcode: '890123400009',
    category: 'Rockets & Missiles',
    purchasePrice: 210,
    mrp: 450,
    sellingPrice: 360,
    gstRate: 28,
    stockQty: 42,
    lowStockThreshold: 15,
    unit: 'box',
    description: 'Launches parachute carrying illuminated glowing flare.',
    batchNumber: 'PFC-2026-B5',
    active: true,
  },
  {
    id: 'prod-10',
    shopId: 'shop-1',
    name: '30-Shot Multi-Color Aerial Wonder Cake',
    barcode: '890123400010',
    category: 'Aerial Multi-Shots (Cakes)',
    purchasePrice: 420,
    mrp: 950,
    sellingPrice: 750,
    gstRate: 28,
    stockQty: 38,
    lowStockThreshold: 10,
    unit: 'box',
    description: 'Continuous 30-shot sky spectacle with brocade crown finish.',
    batchNumber: 'PFC-2026-B6',
    active: true,
  },
  {
    id: 'prod-11',
    shopId: 'shop-1',
    name: '120-Shot Sky Symphony Grand Finale Cake',
    barcode: '890123400011',
    category: 'Aerial Multi-Shots (Cakes)',
    purchasePrice: 1450,
    mrp: 3200,
    sellingPrice: 2600,
    gstRate: 28,
    stockQty: 14,
    lowStockThreshold: 8,
    unit: 'box',
    description: 'Massive festival aerial battery: gold willow, crackling palms, blue stars.',
    batchNumber: 'PFC-2026-B6',
    active: true,
  },
  {
    id: 'prod-12',
    shopId: 'shop-1',
    name: '1000 Wala Deluxe Crackers Garland (Red Ladi)',
    barcode: '890123400012',
    category: 'Garlands & Crackers (Ladi)',
    purchasePrice: 220,
    mrp: 500,
    sellingPrice: 390,
    gstRate: 18,
    stockQty: 55,
    lowStockThreshold: 20,
    unit: 'roll',
    description: 'Long continuous red paper crackers roll, energetic rhythm.',
    batchNumber: 'PFC-2026-B7',
    active: true,
  },
  {
    id: 'prod-13',
    shopId: 'shop-1',
    name: '5000 Wala Jumbo Crackers Garland (Roll)',
    barcode: '890123400013',
    category: 'Garlands & Crackers (Ladi)',
    purchasePrice: 850,
    mrp: 1900,
    sellingPrice: 1490,
    gstRate: 18,
    stockQty: 6, // LOW STOCK
    lowStockThreshold: 10,
    unit: 'roll',
    description: 'Extra heavy 5000 crackers roll with mega climax burst.',
    batchNumber: 'PFC-2026-B7',
    active: true,
  },
  {
    id: 'prod-14',
    shopId: 'shop-1',
    name: 'Royal Heritage Family Gift Box (25 Assorted Items)',
    barcode: '890123400014',
    category: 'Gift Boxes & Assorted',
    purchasePrice: 800,
    mrp: 1800,
    sellingPrice: 1350,
    gstRate: 18,
    stockQty: 48,
    lowStockThreshold: 15,
    unit: 'box',
    description: 'Complete family assortment: sparklers, flower pots, chakkars, and whistling bombs.',
    batchNumber: 'PFC-2026-B8',
    active: true,
  },
  {
    id: 'prod-15',
    shopId: 'shop-1',
    name: 'Daylight Multi-Colour Smoke Fountains (5 pcs)',
    barcode: '890123400015',
    category: 'Gift Boxes & Assorted',
    purchasePrice: 120,
    mrp: 260,
    sellingPrice: 200,
    gstRate: 18,
    stockQty: 70,
    lowStockThreshold: 15,
    unit: 'box',
    description: 'Daytime celebrations: thick vibrant smoke in orange, violet, yellow, red, blue.',
    batchNumber: 'PFC-2026-B8',
    active: true,
  },
  {
    id: 'prod-16',
    shopId: 'shop-1',
    name: 'Classic Safety Match Sparklers (Standard Box)',
    barcode: '890123400016',
    category: 'Sparklers (Phuljhadi)',
    purchasePrice: 48,
    mrp: 60,
    sellingPrice: 52, // Profit: ₹4, Margin: 7.7% (Low Margin)
    gstRate: 18,
    stockQty: 180,
    lowStockThreshold: 30,
    unit: 'box',
    description: 'Everyday quick sparklers, high-volume fast retail item.',
    batchNumber: 'PFC-2026-B9',
    active: true,
  },
  {
    id: 'prod-17',
    shopId: 'shop-1',
    name: 'Festival Red Chatai 28 Crackers (Economy Pack)',
    barcode: '890123400017',
    category: 'Garlands & Crackers (Ladi)',
    purchasePrice: 88,
    mrp: 110,
    sellingPrice: 98, // Profit: ₹10, Margin: 10.2% (Low Margin)
    gstRate: 18,
    stockQty: 8, // Low Stock + Low Margin
    lowStockThreshold: 15,
    unit: 'roll',
    description: 'Economy festive 28 chatai red roll, competitive pricing.',
    batchNumber: 'PFC-2026-B9',
    active: true,
  },
];

// Initial Seed Customers with realistic Khata balances
const SEED_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    shopId: 'shop-1',
    name: 'Virendra Aggarwal (Event Organizer)',
    mobile: '9810198101',
    address: '42, Civil Lines, North Delhi',
    email: 'virendra.events@gmail.com',
    totalPurchases: 48500,
    khataBalance: 14200, // Owes shop
    maxCreditLimit: 50000,
    createdAt: '2026-01-10T10:00:00Z',
  },
  {
    id: 'cust-2',
    shopId: 'shop-1',
    name: 'Sunil Verma (Tent & Decor)',
    mobile: '9871234567',
    address: 'B-104, Model Town, Delhi',
    totalPurchases: 32000,
    khataBalance: 6800, // Owes shop
    maxCreditLimit: 25000,
    createdAt: '2026-01-18T14:30:00Z',
  },
  {
    id: 'cust-3',
    shopId: 'shop-1',
    name: 'Pooja Singhal',
    mobile: '9911223344',
    address: 'Flat 302, Green Park, New Delhi',
    totalPurchases: 12400,
    khataBalance: 0, // Cleared
    maxCreditLimit: 15000,
    createdAt: '2026-02-02T11:20:00Z',
  },
  {
    id: 'cust-4',
    shopId: 'shop-1',
    name: 'Deepak Tyagi (Farmhouse Weddings)',
    mobile: '9899887766',
    address: 'Chattarpur Enclave, Mehrauli',
    totalPurchases: 78000,
    khataBalance: 24500, // Owes shop
    maxCreditLimit: 100000,
    createdAt: '2026-02-10T16:00:00Z',
  },
];

// Initial Seed Khata Entries
const SEED_KHATA_ENTRIES: KhataEntry[] = [
  {
    id: 'kht-1',
    shopId: 'shop-1',
    customerId: 'cust-1',
    type: 'CREDIT_SALE',
    amount: 18500,
    balanceBefore: 0,
    balanceAfter: 18500,
    notes: 'Credit invoice for wedding fireworks consignment',
    createdAt: '2026-02-15T12:00:00Z',
  },
  {
    id: 'kht-2',
    shopId: 'shop-1',
    customerId: 'cust-1',
    type: 'PAYMENT_RECEIVED',
    amount: 10000,
    balanceBefore: 18500,
    balanceAfter: 8500,
    notes: 'Received via NEFT / Cash payment',
    createdAt: '2026-02-28T16:15:00Z',
  },
  {
    id: 'kht-3',
    shopId: 'shop-1',
    customerId: 'cust-1',
    type: 'CREDIT_SALE',
    amount: 5700,
    balanceBefore: 8500,
    balanceAfter: 14200,
    notes: 'Added aerial cakes for reception party',
    createdAt: '2026-03-05T19:30:00Z',
  },
  {
    id: 'kht-4',
    shopId: 'shop-1',
    customerId: 'cust-2',
    type: 'CREDIT_SALE',
    amount: 12000,
    balanceBefore: 0,
    balanceAfter: 12000,
    notes: 'Festival advance order',
    createdAt: '2026-02-20T11:00:00Z',
  },
  {
    id: 'kht-5',
    shopId: 'shop-1',
    customerId: 'cust-2',
    type: 'PAYMENT_RECEIVED',
    amount: 5200,
    balanceBefore: 12000,
    balanceAfter: 6800,
    notes: 'UPI payment received',
    createdAt: '2026-03-01T15:20:00Z',
  },
  {
    id: 'kht-6',
    shopId: 'shop-1',
    customerId: 'cust-4',
    type: 'CREDIT_SALE',
    amount: 24500,
    balanceBefore: 0,
    balanceAfter: 24500,
    notes: 'Grand aerial display package for farm anniversary',
    createdAt: '2026-03-10T21:00:00Z',
  },
];

// Initial Seed Invoices
const SEED_INVOICES: Invoice[] = [
  {
    id: 'inv-1',
    shopId: 'shop-1',
    invoiceNumber: 'INV-2026-0001',
    customerId: 'cust-3',
    customerName: 'Pooja Singhal',
    customerMobile: '9911223344',
    userId: 'user-staff-1',
    cashierName: 'Amit Kumar',
    items: [
      {
        productId: 'prod-14',
        name: 'Royal Heritage Family Gift Box (25 Assorted Items)',
        barcode: '890123400014',
        category: 'Gift Boxes & Assorted',
        quantity: 2,
        unit: 'box',
        mrp: 1800,
        unitPrice: 1350,
        discountAmount: 100,
        gstRate: 18,
        gstAmount: 396.61,
        total: 2600,
      },
      {
        productId: 'prod-4',
        name: 'Special Ashoka Deluxe Flower Pot (10 pcs)',
        barcode: '890123400004',
        category: 'Flower Pots (Anar)',
        quantity: 2,
        unit: 'box',
        mrp: 290,
        unitPrice: 220,
        discountAmount: 0,
        gstRate: 18,
        gstAmount: 67.12,
        total: 440,
      },
    ],
    subtotal: 2700,
    discountTotal: 100,
    gstTotal: 463.73,
    grandTotal: 3040,
    paymentMethod: 'UPI',
    status: 'PAID',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: 'inv-2',
    shopId: 'shop-1',
    invoiceNumber: 'INV-2026-0002',
    customerId: undefined,
    customerName: 'Counter Cash Customer',
    userId: 'user-staff-1',
    cashierName: 'Amit Kumar',
    items: [
      {
        productId: 'prod-1',
        name: '10cm Electric Sparklers (10 pcs/box)',
        barcode: '890123400001',
        category: 'Sparklers (Phuljhadi)',
        quantity: 5,
        unit: 'box',
        mrp: 65,
        unitPrice: 50,
        discountAmount: 0,
        gstRate: 18,
        gstAmount: 38.14,
        total: 250,
      },
      {
        productId: 'prod-6',
        name: 'Deluxe Special Ground Chakra (10 pcs)',
        barcode: '890123400006',
        category: 'Ground Chakkars',
        quantity: 3,
        unit: 'box',
        mrp: 175,
        unitPrice: 130,
        discountAmount: 0,
        gstRate: 18,
        gstAmount: 59.49,
        total: 390,
      },
    ],
    subtotal: 640,
    discountTotal: 0,
    gstTotal: 97.63,
    grandTotal: 640,
    paymentMethod: 'CASH',
    cashReceived: 700,
    changeGiven: 60,
    status: 'PAID',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'inv-3',
    shopId: 'shop-1',
    invoiceNumber: 'INV-2026-0003',
    customerId: 'cust-1',
    customerName: 'Virendra Aggarwal (Event Organizer)',
    customerMobile: '9810198101',
    userId: 'user-staff-1',
    cashierName: 'Amit Kumar',
    items: [
      {
        productId: 'prod-10',
        name: '30-Shot Multi-Color Aerial Wonder Cake',
        barcode: '890123400010',
        category: 'Aerial Multi-Shots (Cakes)',
        quantity: 2,
        unit: 'box',
        mrp: 950,
        unitPrice: 750,
        discountAmount: 50,
        gstRate: 28,
        gstAmount: 317.18,
        total: 1450,
      },
      {
        productId: 'prod-8',
        name: 'Sonic Boom Sound Rocket (10 pcs)',
        barcode: '890123400008',
        category: 'Rockets & Missiles',
        quantity: 4,
        unit: 'box',
        mrp: 320,
        unitPrice: 250,
        discountAmount: 0,
        gstRate: 28,
        gstAmount: 218.75,
        total: 1000,
      },
    ],
    subtotal: 2500,
    discountTotal: 50,
    gstTotal: 535.93,
    grandTotal: 2450,
    paymentMethod: 'UPI',
    status: 'PAID',
    createdAt: new Date(Date.now() - 86400000 * 1 - 3600000 * 3).toISOString(),
  },
  {
    id: 'inv-4',
    shopId: 'shop-1',
    invoiceNumber: 'INV-2026-0004',
    customerId: undefined,
    customerName: 'Retail Counter Customer',
    userId: 'user-staff-1',
    cashierName: 'Amit Kumar',
    items: [
      {
        productId: 'prod-12',
        name: '1000 Wala Deluxe Crackers Garland (Red Ladi)',
        barcode: '890123400012',
        category: 'Garlands & Crackers (Ladi)',
        quantity: 3,
        unit: 'roll',
        mrp: 500,
        unitPrice: 390,
        discountAmount: 30,
        gstRate: 18,
        gstAmount: 173.89,
        total: 1140,
      },
      {
        productId: 'prod-2',
        name: '15cm Tri-Colour Sparklers (Green/Red/Gold)',
        barcode: '890123400002',
        category: 'Sparklers (Phuljhadi)',
        quantity: 4,
        unit: 'box',
        mrp: 110,
        unitPrice: 85,
        discountAmount: 0,
        gstRate: 18,
        gstAmount: 51.86,
        total: 340,
      },
    ],
    subtotal: 1510,
    discountTotal: 30,
    gstTotal: 225.75,
    grandTotal: 1480,
    paymentMethod: 'CASH',
    cashReceived: 1500,
    changeGiven: 20,
    status: 'PAID',
    createdAt: new Date(Date.now() - 86400000 * 2 - 3600000 * 5).toISOString(),
  },
  {
    id: 'inv-5',
    shopId: 'shop-1',
    invoiceNumber: 'INV-2026-0005',
    customerId: 'cust-4',
    customerName: 'Deepak Tyagi (Farmhouse Weddings)',
    customerMobile: '9899887766',
    userId: 'user-admin-1',
    cashierName: 'Rajesh Sharma',
    items: [
      {
        productId: 'prod-11',
        name: '120-Shot Sky Symphony Grand Finale Cake',
        barcode: '890123400011',
        category: 'Aerial Multi-Shots (Cakes)',
        quantity: 2,
        unit: 'box',
        mrp: 3200,
        unitPrice: 2600,
        discountAmount: 200,
        gstRate: 28,
        gstAmount: 1093.75,
        total: 5000,
      },
    ],
    subtotal: 5200,
    discountTotal: 200,
    gstTotal: 1093.75,
    grandTotal: 5000,
    paymentMethod: 'KHATA',
    status: 'PAID',
    createdAt: new Date(Date.now() - 86400000 * 3 - 3600000 * 2).toISOString(),
  },
  {
    id: 'inv-6',
    shopId: 'shop-1',
    invoiceNumber: 'INV-2026-0006',
    customerId: undefined,
    customerName: 'Diwali Advance Shopper',
    userId: 'user-staff-1',
    cashierName: 'Amit Kumar',
    items: [
      {
        productId: 'prod-4',
        name: 'Special Ashoka Deluxe Flower Pot (10 pcs)',
        barcode: '890123400004',
        category: 'Flower Pots (Anar)',
        quantity: 4,
        unit: 'box',
        mrp: 290,
        unitPrice: 220,
        discountAmount: 40,
        gstRate: 18,
        gstAmount: 128.13,
        total: 840,
      },
      {
        productId: 'prod-6',
        name: 'Deluxe Special Ground Chakra (10 pcs)',
        barcode: '890123400006',
        category: 'Ground Chakkars',
        quantity: 5,
        unit: 'box',
        mrp: 175,
        unitPrice: 130,
        discountAmount: 0,
        gstRate: 18,
        gstAmount: 99.15,
        total: 650,
      },
    ],
    subtotal: 1530,
    discountTotal: 40,
    gstTotal: 227.28,
    grandTotal: 1490,
    paymentMethod: 'UPI',
    status: 'PAID',
    createdAt: new Date(Date.now() - 86400000 * 4 - 3600000 * 4).toISOString(),
  },
  {
    id: 'inv-7',
    shopId: 'shop-1',
    invoiceNumber: 'INV-2026-0007',
    customerId: 'cust-2',
    customerName: 'Sunil Verma (Tent & Decor)',
    customerMobile: '9871234567',
    userId: 'user-staff-1',
    cashierName: 'Amit Kumar',
    items: [
      {
        productId: 'prod-14',
        name: 'Royal Heritage Family Gift Box (25 Assorted Items)',
        barcode: '890123400014',
        category: 'Gift Boxes & Assorted',
        quantity: 3,
        unit: 'box',
        mrp: 1800,
        unitPrice: 1350,
        discountAmount: 150,
        gstRate: 18,
        gstAmount: 594.91,
        total: 3900,
      },
    ],
    subtotal: 4050,
    discountTotal: 150,
    gstTotal: 594.91,
    grandTotal: 3900,
    paymentMethod: 'CASH',
    cashReceived: 4000,
    changeGiven: 100,
    status: 'PAID',
    createdAt: new Date(Date.now() - 86400000 * 5 - 3600000 * 1).toISOString(),
  },
  {
    id: 'inv-8',
    shopId: 'shop-1',
    invoiceNumber: 'INV-2026-0008',
    customerId: undefined,
    customerName: 'Weekend Celebration Walk-in',
    userId: 'user-staff-1',
    cashierName: 'Amit Kumar',
    items: [
      {
        productId: 'prod-1',
        name: '10cm Electric Sparklers (10 pcs/box)',
        barcode: '890123400001',
        category: 'Sparklers (Phuljhadi)',
        quantity: 10,
        unit: 'box',
        mrp: 65,
        unitPrice: 50,
        discountAmount: 50,
        gstRate: 18,
        gstAmount: 68.64,
        total: 450,
      },
      {
        productId: 'prod-5',
        name: 'Colour Tri-Flower Pot Fountain (5 pcs)',
        barcode: '890123400005',
        category: 'Flower Pots (Anar)',
        quantity: 4,
        unit: 'box',
        mrp: 350,
        unitPrice: 280,
        discountAmount: 40,
        gstRate: 18,
        gstAmount: 164.74,
        total: 1080,
      },
    ],
    subtotal: 1620,
    discountTotal: 90,
    gstTotal: 233.38,
    grandTotal: 1530,
    paymentMethod: 'UPI',
    status: 'PAID',
    createdAt: new Date(Date.now() - 86400000 * 6 - 3600000 * 6).toISOString(),
  },
];

// Helper to safely load from LocalStorage
function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error(`Error reading ${key} from storage:`, err);
    return fallback;
  }
}

// Helper to safely save to LocalStorage
function save<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error(`Error saving ${key} to storage:`, err);
  }
}

export class StorageService {
  // Ensure database is initialized with pre-seeded data
  static init(): void {
    if (!localStorage.getItem(STORAGE_KEYS.SHOPS)) save(STORAGE_KEYS.SHOPS, SEED_SHOPS);
    
    // Ensure Supermaster and Pandit Fireworks accounts exist in users table
    const storedUsers = load<User[]>(STORAGE_KEYS.USERS, []);
    let usersUpdated = false;
    let usersList = [...storedUsers];

    if (usersList.length === 0) {
      usersList = [...SEED_USERS];
      usersUpdated = true;
    } else {
      // Ensure tushar.paliwal01 exists
      const superIdx = usersList.findIndex((u) => u.username.toLowerCase() === 'tushar.paliwal01' || u.role === 'SUPERMASTER');
      if (superIdx >= 0) {
        usersList[superIdx] = {
          ...usersList[superIdx],
          username: 'tushar.paliwal01',
          password: 'Asdf@1234',
          fullName: usersList[superIdx].fullName || 'Tushar Paliwal (Supermaster)',
          role: 'SUPERMASTER',
          active: true,
          permissions: {
            canBilling: true,
            canInventory: true,
            canReports: true,
            canSettings: true,
            canManageStaff: true,
          },
        };
        usersUpdated = true;
      } else {
        usersList.unshift(SEED_USERS[0]);
        usersUpdated = true;
      }

      // Ensure panditfireworks exists
      const panditIdx = usersList.findIndex((u) => u.username.toLowerCase() === 'panditfireworks');
      if (panditIdx >= 0) {
        usersList[panditIdx] = {
          ...usersList[panditIdx],
          username: 'panditfireworks',
          password: 'pandit12345678',
          fullName: usersList[panditIdx].fullName || 'Pandit Fireworks Store Owner',
          role: 'ADMIN',
          active: true,
          permissions: {
            canBilling: true,
            canInventory: true,
            canReports: true,
            canSettings: true,
            canManageStaff: true,
          },
        };
        usersUpdated = true;
      } else {
        usersList.splice(1, 0, SEED_USERS[1]);
        usersUpdated = true;
      }
    }

    if (usersUpdated || !localStorage.getItem(STORAGE_KEYS.USERS)) {
      save(STORAGE_KEYS.USERS, usersList);
    }

    if (!localStorage.getItem(STORAGE_KEYS.CATEGORIES)) save(STORAGE_KEYS.CATEGORIES, SEED_CATEGORIES);
    if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
      save(STORAGE_KEYS.PRODUCTS, SEED_PRODUCTS);
    } else {
      const storedProds = load<Product[]>(STORAGE_KEYS.PRODUCTS, []);
      const missingLowMargin = SEED_PRODUCTS.filter(
        (sp) => sp.id === 'prod-16' || sp.id === 'prod-17'
      ).filter((sp) => !storedProds.some((p) => p.id === sp.id));
      if (missingLowMargin.length > 0) {
        save(STORAGE_KEYS.PRODUCTS, [...storedProds, ...missingLowMargin]);
      }
    }
    if (!localStorage.getItem(STORAGE_KEYS.CUSTOMERS)) save(STORAGE_KEYS.CUSTOMERS, SEED_CUSTOMERS);
    if (!localStorage.getItem(STORAGE_KEYS.KHATA_ENTRIES)) save(STORAGE_KEYS.KHATA_ENTRIES, SEED_KHATA_ENTRIES);
    const storedInvoices = load<Invoice[]>(STORAGE_KEYS.INVOICES, []);
    if (!storedInvoices || storedInvoices.length < 4) {
      save(STORAGE_KEYS.INVOICES, SEED_INVOICES);
    }
  }

  // --- Session Management ---
  static getCurrentSession(): { user: User; shop: Shop } | null {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.user) return null;
      const liveUser = this.getUserById(parsed.user.id) || parsed.user;
      const liveShop = this.getShopById(parsed.shop?.id) || this.getShops()[0];
      if (!liveUser.active) {
        this.clearSession();
        return null;
      }
      return { user: liveUser, shop: liveShop };
    } catch {
      return null;
    }
  }

  static setCurrentSession(user: User, shop: Shop): void {
    save(STORAGE_KEYS.CURRENT_SESSION, { user, shop });
  }

  static clearSession(): void {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION);
  }

  static authenticate(
    usernameInput: string,
    passwordInput: string
  ): { success: boolean; user?: User; shop?: Shop; error?: string } {
    const username = usernameInput.trim().toLowerCase();
    const password = passwordInput.trim();

    if (!username || !password) {
      return { success: false, error: 'Please enter both username and password' };
    }

    const users = this.getUsers();

    // 1. Direct Hardcoded Credentials Match for Instant Access
    if (username === 'tushar.paliwal01' && password === 'Asdf@1234') {
      const u = users.find((x) => x.username.toLowerCase() === 'tushar.paliwal01') || SEED_USERS[0];
      const s = this.getShopById(u.shopId) || this.getShops()[0];
      return { success: true, user: u, shop: s };
    }

    if (username === 'panditfireworks' && password === 'pandit12345678') {
      const u = users.find((x) => x.username.toLowerCase() === 'panditfireworks') || SEED_USERS[1];
      const s = this.getShopById(u.shopId) || this.getShops()[0];
      return { success: true, user: u, shop: s };
    }

    // 2. Lookup existing user in storage
    const matchedUser = users.find(
      (u) => u.username.toLowerCase() === username || u.mobile === username
    );

    if (!matchedUser) {
      return {
        success: false,
        error: 'Invalid username. Please check credentials or use Quick Switch.',
      };
    }

    if (!matchedUser.active) {
      return {
        success: false,
        error: 'Account has been deactivated. Contact the Supermaster.',
      };
    }

    // 3. Password Verification
    let isPasswordValid = false;
    if (matchedUser.password && matchedUser.password === password) {
      isPasswordValid = true;
    } else if (matchedUser.username.toLowerCase() === 'admin' && (password === 'pandit12345678' || password === '123456')) {
      isPasswordValid = true;
    } else if (matchedUser.username.toLowerCase() === 'staff' && (password === 'staff123' || password === '123456')) {
      isPasswordValid = true;
    } else if (!matchedUser.password && (password === '123456' || password === 'admin123')) {
      isPasswordValid = true;
    }

    if (!isPasswordValid) {
      return { success: false, error: 'Incorrect password. Please verify and try again.' };
    }

    const shop = this.getShopById(matchedUser.shopId) || this.getShops()[0];
    return { success: true, user: matchedUser, shop };
  }

  static getUserById(id: string): User | undefined {
    return this.getUsers().find((u) => u.id === id);
  }


  // --- Shops ---
  static getShops(): Shop[] {
    return load(STORAGE_KEYS.SHOPS, SEED_SHOPS);
  }

  static getShopById(id: string): Shop | undefined {
    return this.getShops().find((s) => s.id === id);
  }

  static saveShop(shop: Shop): void {
    const shops = this.getShops();
    const idx = shops.findIndex((s) => s.id === shop.id);
    if (idx >= 0) {
      shops[idx] = shop;
    } else {
      shops.push(shop);
    }
    save(STORAGE_KEYS.SHOPS, shops);
  }

  // --- Users ---
  static getUsers(shopId?: string): User[] {
    const users = load(STORAGE_KEYS.USERS, SEED_USERS);
    if (!shopId) return users;
    return users.filter((u) => u.shopId === shopId);
  }

  static saveUser(user: User): void {
    const users = load(STORAGE_KEYS.USERS, SEED_USERS);
    const idx = users.findIndex((u) => u.id === user.id);
    if (idx >= 0) {
      users[idx] = user;
    } else {
      users.push(user);
    }
    save(STORAGE_KEYS.USERS, users);
  }

  static deleteUser(userId: string): void {
    const users = load(STORAGE_KEYS.USERS, SEED_USERS).filter((u) => u.id !== userId);
    save(STORAGE_KEYS.USERS, users);
  }

  // --- Categories ---
  static getCategories(shopId: string): Category[] {
    const categories = load(STORAGE_KEYS.CATEGORIES, SEED_CATEGORIES);
    return categories.filter((c) => c.shopId === shopId);
  }

  static saveCategory(category: Category): void {
    const categories = load(STORAGE_KEYS.CATEGORIES, SEED_CATEGORIES);
    const idx = categories.findIndex((c) => c.id === category.id);
    if (idx >= 0) {
      categories[idx] = category;
    } else {
      categories.push(category);
    }
    save(STORAGE_KEYS.CATEGORIES, categories);
  }

  // --- Products ---
  static getProducts(shopId: string): Product[] {
    const products = load(STORAGE_KEYS.PRODUCTS, SEED_PRODUCTS);
    return products.filter((p) => p.shopId === shopId);
  }

  static getProductById(shopId: string, productId: string): Product | undefined {
    return this.getProducts(shopId).find((p) => p.id === productId);
  }

  static getProductByBarcode(shopId: string, barcode: string): Product | undefined {
    return this.getProducts(shopId).find((p) => p.barcode.trim() === barcode.trim());
  }

  static saveProduct(product: Product): void {
    const products = load(STORAGE_KEYS.PRODUCTS, SEED_PRODUCTS);
    const idx = products.findIndex((p) => p.id === product.id);
    if (idx >= 0) {
      products[idx] = product;
    } else {
      products.push(product);
    }
    save(STORAGE_KEYS.PRODUCTS, products);
  }

  static deleteProduct(productId: string): void {
    const products = load(STORAGE_KEYS.PRODUCTS, SEED_PRODUCTS).filter((p) => p.id !== productId);
    save(STORAGE_KEYS.PRODUCTS, products);
  }

  // --- Customers ---
  static getCustomers(shopId: string): Customer[] {
    const customers = load(STORAGE_KEYS.CUSTOMERS, SEED_CUSTOMERS);
    return customers.filter((c) => c.shopId === shopId);
  }

  static getCustomerById(shopId: string, customerId: string): Customer | undefined {
    return this.getCustomers(shopId).find((c) => c.id === customerId);
  }

  static saveCustomer(customer: Customer): void {
    const customers = load(STORAGE_KEYS.CUSTOMERS, SEED_CUSTOMERS);
    const idx = customers.findIndex((c) => c.id === customer.id);
    if (idx >= 0) {
      customers[idx] = customer;
    } else {
      customers.push(customer);
    }
    save(STORAGE_KEYS.CUSTOMERS, customers);
  }

  // --- Invoices & Checkout Transaction ---
  static getInvoices(shopId: string): Invoice[] {
    const invoices = load(STORAGE_KEYS.INVOICES, SEED_INVOICES);
    return invoices.filter((i) => i.shopId === shopId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Executes atomic POS checkout:
   * 1. Validates stock levels
   * 2. Decrements product stock
   * 3. Generates unique sequence invoice number
   * 4. Updates customer Khata or total purchases
   * 5. Saves immutable invoice snapshot
   */
  static checkoutSale(params: {
    shopId: string;
    userId: string;
    cashierName: string;
    items: CartItem[];
    paymentMethod: PaymentMethod;
    customer?: Customer;
    cashReceived?: number;
    notes?: string;
  }): { success: boolean; invoice?: Invoice; error?: string } {
    const { shopId, userId, cashierName, items, paymentMethod, customer, cashReceived, notes } = params;

    if (!items || items.length === 0) {
      return { success: false, error: 'Cart is empty' };
    }

    const allProducts = load<Product[]>(STORAGE_KEYS.PRODUCTS, SEED_PRODUCTS);
    const shopProductsMap = new Map(allProducts.filter((p) => p.shopId === shopId).map((p) => [p.id, p]));

    // 1. Stock Validation
    for (const item of items) {
      const liveProduct = shopProductsMap.get(item.product.id);
      if (!liveProduct) {
        return { success: false, error: `Product "${item.product.name}" is no longer in catalog.` };
      }
      if (liveProduct.stockQty < item.quantity) {
        return {
          success: false,
          error: `Insufficient stock for "${liveProduct.name}". Available: ${liveProduct.stockQty}, requested: ${item.quantity}`,
        };
      }
    }

    // 2. Decrement Stock
    for (const item of items) {
      const liveProduct = shopProductsMap.get(item.product.id)!;
      liveProduct.stockQty -= item.quantity;
    }
    save(STORAGE_KEYS.PRODUCTS, allProducts);

    // 3. Compute Totals
    let subtotal = 0;
    let discountTotal = 0;
    let gstTotal = 0;
    const invoiceItems = items.map((ci) => {
      const lineSubtotal = ci.product.sellingPrice * ci.quantity;
      const lineDiscount = ci.unitDiscount * ci.quantity;
      const netLine = lineSubtotal - lineDiscount;
      // GST calculation (inclusive)
      const gstRate = ci.product.gstRate || 18;
      const taxBase = netLine / (1 + gstRate / 100);
      const taxAmount = netLine - taxBase;

      subtotal += lineSubtotal;
      discountTotal += lineDiscount;
      gstTotal += taxAmount;

      return {
        productId: ci.product.id,
        name: ci.product.name,
        barcode: ci.product.barcode,
        category: ci.product.category,
        quantity: ci.quantity,
        unit: ci.product.unit,
        mrp: ci.product.mrp,
        unitPrice: ci.product.sellingPrice,
        discountAmount: lineDiscount,
        gstRate,
        gstAmount: Math.round(taxAmount * 100) / 100,
        total: Math.round(netLine * 100) / 100,
      };
    });

    const grandTotal = Math.round((subtotal - discountTotal) * 100) / 100;
    const changeGiven = paymentMethod === 'CASH' && cashReceived !== undefined ? Math.max(0, cashReceived - grandTotal) : 0;

    // 4. Generate Invoice Number
    const allInvoices = load<Invoice[]>(STORAGE_KEYS.INVOICES, SEED_INVOICES);
    const shopInvoices = allInvoices.filter((i) => i.shopId === shopId);
    const invoiceSeq = (shopInvoices.length + 1).toString().padStart(4, '0');
    const invoiceNumber = `INV-${new Date().getFullYear()}-${invoiceSeq}`;

    const newInvoice: Invoice = {
      id: `inv-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      shopId,
      invoiceNumber,
      customerId: customer?.id,
      customerName: customer?.name,
      customerMobile: customer?.mobile,
      userId,
      cashierName,
      items: invoiceItems,
      subtotal: Math.round(subtotal * 100) / 100,
      discountTotal: Math.round(discountTotal * 100) / 100,
      gstTotal: Math.round(gstTotal * 100) / 100,
      grandTotal,
      paymentMethod,
      cashReceived: paymentMethod === 'CASH' ? cashReceived : undefined,
      changeGiven: paymentMethod === 'CASH' ? changeGiven : undefined,
      notes,
      status: 'PAID',
      createdAt: new Date().toISOString(),
    };

    allInvoices.unshift(newInvoice);
    save(STORAGE_KEYS.INVOICES, allInvoices);

    // 5. Customer Ledger & Khata updates
    if (customer) {
      const allCustomers = load<Customer[]>(STORAGE_KEYS.CUSTOMERS, SEED_CUSTOMERS);
      const custIdx = allCustomers.findIndex((c) => c.id === customer.id);
      if (custIdx >= 0) {
        const liveCust = allCustomers[custIdx];
        liveCust.totalPurchases += grandTotal;

        if (paymentMethod === 'KHATA') {
          const balanceBefore = liveCust.khataBalance;
          const balanceAfter = balanceBefore + grandTotal;
          liveCust.khataBalance = balanceAfter;

          // Record Khata Entry
          const allKhata = load<KhataEntry[]>(STORAGE_KEYS.KHATA_ENTRIES, SEED_KHATA_ENTRIES);
          allKhata.unshift({
            id: `kht-${Date.now()}`,
            shopId,
            customerId: liveCust.id,
            invoiceId: newInvoice.id,
            type: 'CREDIT_SALE',
            amount: grandTotal,
            balanceBefore,
            balanceAfter,
            notes: `Khata credit sale on ${invoiceNumber}`,
            createdAt: new Date().toISOString(),
          });
          save(STORAGE_KEYS.KHATA_ENTRIES, allKhata);
        }

        save(STORAGE_KEYS.CUSTOMERS, allCustomers);
      }
    }

    return { success: true, invoice: newInvoice };
  }

  // --- Khata Ledger ---
  static getKhataEntries(shopId: string, customerId?: string): KhataEntry[] {
    const entries = load(STORAGE_KEYS.KHATA_ENTRIES, SEED_KHATA_ENTRIES);
    let filtered = entries.filter((e) => e.shopId === shopId);
    if (customerId) {
      filtered = filtered.filter((e) => e.customerId === customerId);
    }
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Records payment collected against outstanding Khata balance.
   */
  static recordKhataPayment(params: {
    shopId: string;
    customerId: string;
    amount: number;
    paymentMode: 'CASH' | 'UPI';
    notes?: string;
  }): { success: boolean; error?: string; newBalance?: number } {
    const { shopId, customerId, amount, paymentMode, notes } = params;
    if (amount <= 0) return { success: false, error: 'Amount must be greater than zero' };

    const customers = load<Customer[]>(STORAGE_KEYS.CUSTOMERS, SEED_CUSTOMERS);
    const customer = customers.find((c) => c.id === customerId && c.shopId === shopId);
    if (!customer) return { success: false, error: 'Customer not found' };

    if (amount > customer.khataBalance) {
      return {
        success: false,
        error: `Payment amount (₹${amount}) cannot exceed customer's outstanding balance (₹${customer.khataBalance})`,
      };
    }

    const balanceBefore = customer.khataBalance;
    const balanceAfter = Math.max(0, balanceBefore - amount);
    customer.khataBalance = balanceAfter;
    save(STORAGE_KEYS.CUSTOMERS, customers);

    const allKhata = load<KhataEntry[]>(STORAGE_KEYS.KHATA_ENTRIES, SEED_KHATA_ENTRIES);
    allKhata.unshift({
      id: `kht-pay-${Date.now()}`,
      shopId,
      customerId,
      type: 'PAYMENT_RECEIVED',
      amount,
      balanceBefore,
      balanceAfter,
      notes: notes || `Payment received via ${paymentMode}`,
      createdAt: new Date().toISOString(),
    });
    save(STORAGE_KEYS.KHATA_ENTRIES, allKhata);

    return { success: true, newBalance: balanceAfter };
  }

  // --- Commit OCR Supplier Bill Stock ---
  static commitSupplierBill(
    shopId: string,
    bill: ParsedSupplierBill
  ): { success: boolean; updatedCount: number; createdCount: number } {
    const products = load<Product[]>(STORAGE_KEYS.PRODUCTS, SEED_PRODUCTS);
    let updatedCount = 0;
    let createdCount = 0;

    for (const item of bill.items) {
      if (item.status === 'skip') continue;

      if (item.status === 'matched' && item.matchedProductId) {
        const prod = products.find((p) => p.id === item.matchedProductId && p.shopId === shopId);
        if (prod) {
          prod.stockQty += item.qty;
          prod.purchasePrice = item.purchasePrice > 0 ? item.purchasePrice : prod.purchasePrice;
          if (item.mrp > 0) prod.mrp = item.mrp;
          if (item.batchNumber) prod.batchNumber = item.batchNumber;
          updatedCount++;
        }
      } else if (item.status === 'new') {
        const generatedBarcode = `890${Math.floor(100000000 + Math.random() * 900000000)}`;
        const newProduct: Product = {
          id: `prod-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          shopId,
          name: item.name,
          barcode: generatedBarcode,
          category: 'Gift Boxes & Assorted',
          purchasePrice: item.purchasePrice || 100,
          mrp: item.mrp || (item.purchasePrice ? Math.round(item.purchasePrice * 1.6) : 200),
          sellingPrice: item.mrp ? Math.round(item.mrp * 0.85) : 180,
          gstRate: item.gstRate || 18,
          stockQty: item.qty || 10,
          lowStockThreshold: 15,
          unit: 'box',
          description: `Imported via Supplier Bill OCR (${bill.vendorName})`,
          batchNumber: item.batchNumber || `BAT-${new Date().getFullYear()}`,
          active: true,
        };
        products.push(newProduct);
        createdCount++;
      }
    }

    save(STORAGE_KEYS.PRODUCTS, products);
    return { success: true, updatedCount, createdCount };
  }

  // --- Hardware / Printer Preferences ---
  static getPrinterQueue(): string {
    return localStorage.getItem(STORAGE_KEYS.PRINTER_CONFIG) || 'RETSOL RTP82';
  }

  static setPrinterQueue(queueName: string): void {
    localStorage.setItem(STORAGE_KEYS.PRINTER_CONFIG, queueName);
  }

  static getHardwareConfig(): HardwareConfig {
    const raw = localStorage.getItem(STORAGE_KEYS.HARDWARE_CONFIG);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        // Fallback to default
      }
    }
    return {
      retsolQueue: localStorage.getItem(STORAGE_KEYS.PRINTER_CONFIG) || 'RETSOL RTP82',
      tscQueue: 'TSC TE244',
      baudRateRetsol: 9600,
      baudRateTsc: 9600,
      autoCut: true,
      cashDrawerOnSale: false,
      buzzerOnSale: true,
      paperWidth: '80mm',
    };
  }

  static saveHardwareConfig(config: Partial<HardwareConfig>): HardwareConfig {
    const current = this.getHardwareConfig();
    const updated = { ...current, ...config };
    localStorage.setItem(STORAGE_KEYS.HARDWARE_CONFIG, JSON.stringify(updated));
    if (updated.retsolQueue) {
      localStorage.setItem(STORAGE_KEYS.PRINTER_CONFIG, updated.retsolQueue);
    }
    return updated;
  }

  // --- Database Backup & Restore ---
  static getDatabaseSummary() {
    const shops = load<Shop[]>(STORAGE_KEYS.SHOPS, SEED_SHOPS);
    const users = load<User[]>(STORAGE_KEYS.USERS, SEED_USERS);
    const categories = load<Category[]>(STORAGE_KEYS.CATEGORIES, SEED_CATEGORIES);
    const products = load<Product[]>(STORAGE_KEYS.PRODUCTS, SEED_PRODUCTS);
    const customers = load<Customer[]>(STORAGE_KEYS.CUSTOMERS, SEED_CUSTOMERS);
    const invoices = load<Invoice[]>(STORAGE_KEYS.INVOICES, SEED_INVOICES);
    const khataEntries = load<KhataEntry[]>(STORAGE_KEYS.KHATA_ENTRIES, SEED_KHATA_ENTRIES);

    return {
      totalShops: shops.length,
      totalUsers: users.length,
      totalCategories: categories.length,
      totalProducts: products.length,
      totalCustomers: customers.length,
      totalInvoices: invoices.length,
      totalKhataEntries: khataEntries.length,
      estimatedSizeKb: Math.round(
        (JSON.stringify(shops).length +
          JSON.stringify(users).length +
          JSON.stringify(categories).length +
          JSON.stringify(products).length +
          JSON.stringify(customers).length +
          JSON.stringify(invoices).length +
          JSON.stringify(khataEntries).length) /
          1024
      ),
    };
  }

  static exportBackup(filterShopId?: string): BackupData {
    const shops = load<Shop[]>(STORAGE_KEYS.SHOPS, SEED_SHOPS);
    const users = load<User[]>(STORAGE_KEYS.USERS, SEED_USERS);
    const categories = load<Category[]>(STORAGE_KEYS.CATEGORIES, SEED_CATEGORIES);
    const products = load<Product[]>(STORAGE_KEYS.PRODUCTS, SEED_PRODUCTS);
    const customers = load<Customer[]>(STORAGE_KEYS.CUSTOMERS, SEED_CUSTOMERS);
    const invoices = load<Invoice[]>(STORAGE_KEYS.INVOICES, SEED_INVOICES);
    const khataEntries = load<KhataEntry[]>(STORAGE_KEYS.KHATA_ENTRIES, SEED_KHATA_ENTRIES);
    const hardwareConfig = this.getHardwareConfig();
    const printerConfig = this.getPrinterQueue();

    const currentShop = filterShopId ? shops.find((s) => s.id === filterShopId) : undefined;

    return {
      version: '1.0',
      appName: 'PANDIT POS',
      exportedAt: new Date().toISOString(),
      shopId: filterShopId,
      shopName: currentShop ? currentShop.name : undefined,
      data: {
        shops,
        users,
        categories,
        products,
        customers,
        invoices,
        khataEntries,
        hardwareConfig,
        printerConfig,
      },
      summary: {
        totalShops: shops.length,
        totalProducts: products.length,
        totalInvoices: invoices.length,
        totalCustomers: customers.length,
        totalKhataEntries: khataEntries.length,
      },
    };
  }

  static importBackup(
    backup: any,
    mode: 'replace' | 'merge' = 'replace'
  ): {
    success: boolean;
    message: string;
    stats: {
      shops: number;
      products: number;
      customers: number;
      invoices: number;
      khataEntries: number;
    };
  } {
    if (!backup || typeof backup !== 'object' || !backup.data) {
      throw new Error('Invalid backup file: Missing "data" section in JSON.');
    }

    const { data } = backup;

    if (mode === 'replace') {
      if (Array.isArray(data.shops)) save(STORAGE_KEYS.SHOPS, data.shops);
      if (Array.isArray(data.users)) save(STORAGE_KEYS.USERS, data.users);
      if (Array.isArray(data.categories)) save(STORAGE_KEYS.CATEGORIES, data.categories);
      if (Array.isArray(data.products)) save(STORAGE_KEYS.PRODUCTS, data.products);
      if (Array.isArray(data.customers)) save(STORAGE_KEYS.CUSTOMERS, data.customers);
      if (Array.isArray(data.invoices)) save(STORAGE_KEYS.INVOICES, data.invoices);
      if (Array.isArray(data.khataEntries)) save(STORAGE_KEYS.KHATA_ENTRIES, data.khataEntries);
      if (data.hardwareConfig) save(STORAGE_KEYS.HARDWARE_CONFIG, data.hardwareConfig);
      if (data.printerConfig) localStorage.setItem(STORAGE_KEYS.PRINTER_CONFIG, data.printerConfig);

      return {
        success: true,
        message: 'Database restored successfully (full replace).',
        stats: {
          shops: data.shops?.length || 0,
          products: data.products?.length || 0,
          customers: data.customers?.length || 0,
          invoices: data.invoices?.length || 0,
          khataEntries: data.khataEntries?.length || 0,
        },
      };
    } else {
      // Merge mode: deduplicate based on IDs
      const mergeById = <T extends { id: string }>(existing: T[], incoming: T[] = []): T[] => {
        const map = new Map<string, T>();
        existing.forEach((item) => map.set(item.id, item));
        incoming.forEach((item) => map.set(item.id, item));
        return Array.from(map.values());
      };

      const currentShops = load<Shop[]>(STORAGE_KEYS.SHOPS, SEED_SHOPS);
      const currentUsers = load<User[]>(STORAGE_KEYS.USERS, SEED_USERS);
      const currentCategories = load<Category[]>(STORAGE_KEYS.CATEGORIES, SEED_CATEGORIES);
      const currentProducts = load<Product[]>(STORAGE_KEYS.PRODUCTS, SEED_PRODUCTS);
      const currentCustomers = load<Customer[]>(STORAGE_KEYS.CUSTOMERS, SEED_CUSTOMERS);
      const currentInvoices = load<Invoice[]>(STORAGE_KEYS.INVOICES, SEED_INVOICES);
      const currentKhata = load<KhataEntry[]>(STORAGE_KEYS.KHATA_ENTRIES, SEED_KHATA_ENTRIES);

      const mergedShops = mergeById(currentShops, data.shops || []);
      const mergedUsers = mergeById(currentUsers, data.users || []);
      const mergedCategories = mergeById(currentCategories, data.categories || []);
      const mergedProducts = mergeById(currentProducts, data.products || []);
      const mergedCustomers = mergeById(currentCustomers, data.customers || []);
      const mergedInvoices = mergeById(currentInvoices, data.invoices || []);
      const mergedKhata = mergeById(currentKhata, data.khataEntries || []);

      save(STORAGE_KEYS.SHOPS, mergedShops);
      save(STORAGE_KEYS.USERS, mergedUsers);
      save(STORAGE_KEYS.CATEGORIES, mergedCategories);
      save(STORAGE_KEYS.PRODUCTS, mergedProducts);
      save(STORAGE_KEYS.CUSTOMERS, mergedCustomers);
      save(STORAGE_KEYS.INVOICES, mergedInvoices);
      save(STORAGE_KEYS.KHATA_ENTRIES, mergedKhata);

      return {
        success: true,
        message: 'Database merged successfully.',
        stats: {
          shops: mergedShops.length,
          products: mergedProducts.length,
          customers: mergedCustomers.length,
          invoices: mergedInvoices.length,
          khataEntries: mergedKhata.length,
        },
      };
    }
  }

  static resetToFactoryDefaults(): void {
    save(STORAGE_KEYS.SHOPS, SEED_SHOPS);
    save(STORAGE_KEYS.USERS, SEED_USERS);
    save(STORAGE_KEYS.CATEGORIES, SEED_CATEGORIES);
    save(STORAGE_KEYS.PRODUCTS, SEED_PRODUCTS);
    save(STORAGE_KEYS.CUSTOMERS, SEED_CUSTOMERS);
    save(STORAGE_KEYS.INVOICES, SEED_INVOICES);
    save(STORAGE_KEYS.KHATA_ENTRIES, SEED_KHATA_ENTRIES);
  }
}
