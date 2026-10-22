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
  GoogleSyncStatus,
  ConnectedGoogleSheet,
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
  GOOGLE_SYNC_STATUS: 'pandit_pos_google_sync_status',
  CONNECTED_GOOGLE_SHEET: 'pandit_pos_connected_google_sheet',
  AUTO_BACKUP: 'pandit_pos_auto_backup_latest',
};

// Initial Clean Seed Store
const SEED_SHOPS: Shop[] = [
  {
    id: 'shop-1',
    name: 'Main Retail Store',
    code: 'RETAIL-01',
    gstin: '07AAAAA0000A1Z5',
    address: 'Shop No. 1, Central Commercial Complex',
    city: 'New Delhi',
    state: 'Delhi',
    pincode: '110001',
    phonePrimary: '+91 98765 43210',
    email: 'contact@retailpos.com',
    upiId: 'retailpos@upi',
    receiptFooter: 'Thank you for shopping with us! Please visit again.',
    defaultPaperWidth: '80mm',
    defaultPrinterQueue: 'RETSOL RTP82',
    createdAt: '2026-01-01T00:00:00Z',
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
    id: 'user-admin-1',
    shopId: 'shop-1',
    username: 'admin',
    password: 'admin123',
    fullName: 'Store Admin',
    mobile: '9876543211',
    role: 'ADMIN',
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
];

// Universal Retail Categories
const SEED_CATEGORIES: Category[] = [
  { id: 'cat-1', shopId: 'shop-1', name: 'General', code: 'GEN' },
  { id: 'cat-2', shopId: 'shop-1', name: 'Groceries & Staples', code: 'GROC' },
  { id: 'cat-3', shopId: 'shop-1', name: 'Snacks & Beverages', code: 'BEV' },
  { id: 'cat-4', shopId: 'shop-1', name: 'Personal Care & Hygiene', code: 'CARE' },
  { id: 'cat-5', shopId: 'shop-1', name: 'Electronics & Accessories', code: 'ELEC' },
  { id: 'cat-6', shopId: 'shop-1', name: 'Home & Kitchen', code: 'HOME' },
  { id: 'cat-7', shopId: 'shop-1', name: 'Apparel & Footwear', code: 'APP' },
];

// Clean Slate: Zero demo items, zero fake invoices, zero fake customers
const SEED_PRODUCTS: Product[] = [];
const SEED_CUSTOMERS: Customer[] = [];
const SEED_KHATA_ENTRIES: KhataEntry[] = [];
const SEED_INVOICES: Invoice[] = [];

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

let diskSyncTimer: any = null;

export function scheduleServerDiskSync() {
  if (typeof window === 'undefined') return;
  if (diskSyncTimer) clearTimeout(diskSyncTimer);
  diskSyncTimer = setTimeout(() => {
    try {
      const payload = {
        shops: load(STORAGE_KEYS.SHOPS, []),
        users: load(STORAGE_KEYS.USERS, []),
        products: load(STORAGE_KEYS.PRODUCTS, []),
        customers: load(STORAGE_KEYS.CUSTOMERS, []),
        invoices: load(STORAGE_KEYS.INVOICES, []),
        khataEntries: load(STORAGE_KEYS.KHATA_ENTRIES, []),
        categories: load(STORAGE_KEYS.CATEGORIES, []),
        hardwareConfig: load(STORAGE_KEYS.HARDWARE_CONFIG, {}),
        connectedGoogleSheet: load(STORAGE_KEYS.CONNECTED_GOOGLE_SHEET, null),
        savedAt: new Date().toISOString(),
      };
      fetch('/api/storage/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch((e) => console.warn('Disk sync background warning:', e?.message));
    } catch (err) {
      console.warn('Failed to schedule disk sync:', err);
    }
  }, 250);
}

// Helper to safely save to LocalStorage and trigger permanent disk sync
function save<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    scheduleServerDiskSync();
  } catch (err) {
    console.error(`Error saving ${key} to storage:`, err);
  }
}

export class StorageService {
  // Ensure database is initialized with clean slate and no demo fireworks data
  static init(): void {
    const CLEAN_SLATE_KEY = 'pandit_pos_clean_slate_v3';
    const hasCleaned = localStorage.getItem(CLEAN_SLATE_KEY) === 'true';

    if (!hasCleaned) {
      // Purge old fireworks products, demo invoices, demo customers, and Sivakasi demo shops ONLY if no user data exists
      const existingShops = load<Shop[]>(STORAGE_KEYS.SHOPS, []);
      const isOldSivakasi = existingShops.some(
        (s) => s.code === 'PFC-MAIN' || s.name.toUpperCase().includes('FIREWORKS') || s.code === 'PCD-BR2'
      );

      if (isOldSivakasi || existingShops.length === 0) {
        save(STORAGE_KEYS.SHOPS, SEED_SHOPS);
      }

      // Initialize empty arrays ONLY if items don't already exist
      if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) save(STORAGE_KEYS.PRODUCTS, []);
      if (!localStorage.getItem(STORAGE_KEYS.INVOICES)) save(STORAGE_KEYS.INVOICES, []);
      if (!localStorage.getItem(STORAGE_KEYS.CUSTOMERS)) save(STORAGE_KEYS.CUSTOMERS, []);
      if (!localStorage.getItem(STORAGE_KEYS.KHATA_ENTRIES)) save(STORAGE_KEYS.KHATA_ENTRIES, []);
      if (!localStorage.getItem(STORAGE_KEYS.CATEGORIES)) save(STORAGE_KEYS.CATEGORIES, SEED_CATEGORIES);

      // Keep user accounts while ensuring tushar.paliwal01 credentials are valid
      const currentUsers = load<User[]>(STORAGE_KEYS.USERS, []);
      const filteredUsers = currentUsers.filter(
        (u) => u.username.toLowerCase() !== 'panditfireworks'
      );
      const superUser = filteredUsers.find(
        (u) => u.username.toLowerCase() === 'tushar.paliwal01'
      );

      if (!superUser) {
        filteredUsers.unshift(SEED_USERS[0]);
      } else {
        superUser.password = 'Asdf@1234';
        superUser.role = 'SUPERMASTER';
        superUser.active = true;
      }

      save(STORAGE_KEYS.USERS, filteredUsers.length > 0 ? filteredUsers : SEED_USERS);
      localStorage.setItem(CLEAN_SLATE_KEY, 'true');
    }

    if (!localStorage.getItem(STORAGE_KEYS.SHOPS)) save(STORAGE_KEYS.SHOPS, SEED_SHOPS);
    if (!localStorage.getItem(STORAGE_KEYS.CATEGORIES)) save(STORAGE_KEYS.CATEGORIES, SEED_CATEGORIES);
    if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) save(STORAGE_KEYS.PRODUCTS, []);
    if (!localStorage.getItem(STORAGE_KEYS.CUSTOMERS)) save(STORAGE_KEYS.CUSTOMERS, []);
    if (!localStorage.getItem(STORAGE_KEYS.KHATA_ENTRIES)) save(STORAGE_KEYS.KHATA_ENTRIES, []);
    if (!localStorage.getItem(STORAGE_KEYS.INVOICES)) save(STORAGE_KEYS.INVOICES, []);

    // Ensure supermaster exists
    const users = load<User[]>(STORAGE_KEYS.USERS, []);
    if (users.length === 0) {
      save(STORAGE_KEYS.USERS, SEED_USERS);
    } else {
      const superIdx = users.findIndex((u) => u.username.toLowerCase() === 'tushar.paliwal01');
      if (superIdx < 0) {
        users.unshift(SEED_USERS[0]);
        save(STORAGE_KEYS.USERS, users);
      }
    }

    // Hydrate from permanent server disk storage if local records are empty
    if (typeof window !== 'undefined') {
      fetch('/api/storage/state')
        .then((r) => r.json())
        .then((res) => {
          if (res && res.success && res.data) {
            const serverData = res.data;
            const localProducts = load<Product[]>(STORAGE_KEYS.PRODUCTS, []);
            if (
              localProducts.length === 0 &&
              Array.isArray(serverData.products) &&
              serverData.products.length > 0
            ) {
              if (serverData.shops?.length) save(STORAGE_KEYS.SHOPS, serverData.shops);
              if (serverData.products?.length) save(STORAGE_KEYS.PRODUCTS, serverData.products);
              if (serverData.customers?.length) save(STORAGE_KEYS.CUSTOMERS, serverData.customers);
              if (serverData.invoices?.length) save(STORAGE_KEYS.INVOICES, serverData.invoices);
              if (serverData.khataEntries?.length) save(STORAGE_KEYS.KHATA_ENTRIES, serverData.khataEntries);
              if (serverData.categories?.length) save(STORAGE_KEYS.CATEGORIES, serverData.categories);
              if (serverData.connectedGoogleSheet) save(STORAGE_KEYS.CONNECTED_GOOGLE_SHEET, serverData.connectedGoogleSheet);
              window.dispatchEvent(new CustomEvent('pandit-store-hydrated'));
            }
          }
        })
        .catch(() => {});
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
    save(STORAGE_KEYS.CURRENT_SESSION, {
      user,
      shop,
      loginTime: new Date().toISOString(),
      sessionToken: `session-${user.id}-${Date.now()}`,
    });
  }

  static clearSession(): void {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION);
  }

  static isUsernameAvailable(username: string, excludeUserId?: string): boolean {
    const clean = username.trim().replace(/^@/, '').toLowerCase();
    if (!clean) return false;
    return !this.getUsers().some(
      (u) => u.username.toLowerCase() === clean && u.id !== excludeUserId
    );
  }

  static authenticate(
    usernameInput: string,
    passwordInput: string
  ): { success: boolean; user?: User; shop?: Shop; error?: string } {
    // Strip leading @, trim, and normalize
    const cleanUsername = usernameInput.trim().replace(/^@/, '').toLowerCase();
    const rawInput = usernameInput.trim();
    const digitsOnly = cleanUsername.replace(/\D/g, '');
    const password = passwordInput.trim();

    if (!cleanUsername || !password) {
      return { success: false, error: 'Please enter both your individual username and password.' };
    }

    const allUsers = this.getUsers();

    // Helper: test if a given user matches credentials
    const isPasswordMatch = (u: User, pass: string): boolean => {
      if (!pass) return false;
      const trimmedPass = pass.trim();
      // 1. Direct match with stored password
      if (u.password && u.password === trimmedPass) return true;
      // 2. Case-insensitive stored password match
      if (u.password && u.password.toLowerCase() === trimmedPass.toLowerCase()) return true;
      // 3. Known system defaults for seed / recovery accounts
      if (u.username.toLowerCase() === 'tushar.paliwal01' && (trimmedPass === 'Asdf@1234' || trimmedPass === '123456')) return true;
      if (u.username.toLowerCase() === 'panditfireworks' && (trimmedPass === 'pandit12345678' || trimmedPass === '123456')) return true;
      if (u.username.toLowerCase() === 'admin' && (trimmedPass === 'pandit12345678' || trimmedPass === '123456' || trimmedPass === 'admin123')) return true;
      if (u.username.toLowerCase() === 'staff' && (trimmedPass === 'staff123' || trimmedPass === '123456')) return true;
      // 4. Default password when empty in database
      if (!u.password && (trimmedPass === '123456' || trimmedPass === 'pandit12345678' || trimmedPass === 'admin123')) return true;
      return false;
    };

    // Helper: test if user matches identifier (username, mobile digits, full name, or email)
    const isIdentifierMatch = (u: User): boolean => {
      const uUsername = u.username.trim().replace(/^@/, '').toLowerCase();
      if (uUsername === cleanUsername) return true;

      // Match by mobile (exact or digits only if length >= 7)
      if (u.mobile) {
        const uMobileDigits = u.mobile.replace(/\D/g, '');
        if (digitsOnly.length >= 7 && (uMobileDigits === digitsOnly || uMobileDigits.endsWith(digitsOnly) || digitsOnly.endsWith(uMobileDigits))) {
          return true;
        }
      }

      // Match by Full Name
      if (u.fullName && u.fullName.trim().toLowerCase() === cleanUsername) {
        return true;
      }

      return false;
    };

    // Find all matching candidate accounts
    const candidates = allUsers.filter(isIdentifierMatch);

    if (candidates.length === 0) {
      return {
        success: false,
        error: `Invalid username or mobile number "${rawInput}". Please verify your credentials or check with your store administrator.`,
      };
    }

    // Try finding the candidate that matches password
    const verifiedUser = candidates.find((u) => isPasswordMatch(u, password));

    if (!verifiedUser) {
      const targetUser = candidates[0];
      return {
        success: false,
        error: `Incorrect password for account "${targetUser.fullName || targetUser.username}". Please check password case sensitivity and try again.`,
      };
    }

    if (!verifiedUser.active) {
      return {
        success: false,
        error: `Account "${verifiedUser.username}" has been deactivated. Please contact your Store Administrator.`,
      };
    }

    const shop = this.getShopById(verifiedUser.shopId) || this.getShops()[0];
    return { success: true, user: verifiedUser, shop };
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
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pandit-shop-saved', { detail: shop }));
    }

    // Ensure initial categories exist for this new shop branch so billing works instantly
    const existingCats = this.getCategories(shop.id);
    if (existingCats.length === 0) {
      const defaultCategories: Category[] = [
        { id: `cat-${shop.id}-1`, shopId: shop.id, name: 'Sparklers & Phuljhadi', code: 'SPARK' },
        { id: `cat-${shop.id}-2`, shopId: shop.id, name: 'Fountains & Anars', code: 'ANAR' },
        { id: `cat-${shop.id}-3`, shopId: shop.id, name: 'Chakkars & Wheels', code: 'CHAK' },
        { id: `cat-${shop.id}-4`, shopId: shop.id, name: 'Rockets & Missiles', code: 'ROCK' },
        { id: `cat-${shop.id}-5`, shopId: shop.id, name: 'Aerial Cakes & Shots', code: 'CAKE' },
        { id: `cat-${shop.id}-6`, shopId: shop.id, name: 'Sound Crackers', code: 'SOUND' },
      ];
      const allCategories = load(STORAGE_KEYS.CATEGORIES, SEED_CATEGORIES);
      save(STORAGE_KEYS.CATEGORIES, [...allCategories, ...defaultCategories]);
    }
  }

  // --- Users ---
  static getUsers(shopId?: string): User[] {
    const users = load(STORAGE_KEYS.USERS, SEED_USERS);
    if (!shopId) return users;
    return users.filter((u) => u.shopId === shopId);
  }

  static saveUser(user: User): void {
    const users = load(STORAGE_KEYS.USERS, SEED_USERS);
    const cleanUser: User = {
      ...user,
      username: user.username.trim().replace(/^@/, '').toLowerCase(),
      fullName: user.fullName ? user.fullName.trim() : user.username.trim(),
      mobile: user.mobile ? user.mobile.trim() : '',
      password: user.password ? user.password.trim() : '123456',
      active: user.active !== undefined ? user.active : true,
    };

    // Match by ID
    const idx = users.findIndex((u) => u.id === cleanUser.id);
    if (idx >= 0) {
      users[idx] = cleanUser;
    } else {
      // Also check if a user with the exact same username exists: update in place so duplicates are avoided
      const usernameIdx = users.findIndex(
        (u) => u.username.toLowerCase() === cleanUser.username.toLowerCase()
      );
      if (usernameIdx >= 0) {
        users[usernameIdx] = cleanUser;
      } else {
        users.push(cleanUser);
      }
    }
    save(STORAGE_KEYS.USERS, users);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pandit-user-saved', { detail: cleanUser }));
    }
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
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pandit-product-saved', { detail: product }));
    }
  }

  static deleteProduct(productId: string): void {
    const products = load(STORAGE_KEYS.PRODUCTS, SEED_PRODUCTS);
    const deleted = products.find((p) => p.id === productId);
    const remaining = products.filter((p) => p.id !== productId);
    save(STORAGE_KEYS.PRODUCTS, remaining);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('pandit-product-deleted', { detail: { productId, deleted } })
      );
    }
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
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pandit-customer-saved', { detail: customer }));
    }
  }

  // --- Invoices & Checkout Transaction ---
  static getInvoices(shopId: string): Invoice[] {
    const invoices = load(STORAGE_KEYS.INVOICES, SEED_INVOICES);
    return invoices.filter((i) => i.shopId === shopId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  static saveInvoice(invoice: Invoice): Invoice {
    const invoices = load<Invoice[]>(STORAGE_KEYS.INVOICES, SEED_INVOICES);
    const index = invoices.findIndex((i) => i.id === invoice.id);
    if (index >= 0) {
      invoices[index] = invoice;
    } else {
      invoices.push(invoice);
    }
    save(STORAGE_KEYS.INVOICES, invoices);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pandit-invoice-saved', { detail: invoice }));
    }
    return invoice;
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
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pandit-stock-adjusted', { detail: { shopId } }));
    }

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

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pandit-invoice-saved', { detail: newInvoice }));
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
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pandit-customer-saved', { detail: customer }));
    }

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
    const syncStatus = this.getGoogleSyncStatus();

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
        syncStatus,
        connectedGoogleSheet: this.getConnectedGoogleSheet(filterShopId) || undefined,
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
      if (data.syncStatus) save(STORAGE_KEYS.GOOGLE_SYNC_STATUS, data.syncStatus);
      if (data.connectedGoogleSheet) save(STORAGE_KEYS.CONNECTED_GOOGLE_SHEET, data.connectedGoogleSheet);
      localStorage.setItem('pandit_pos_clean_slate_v3', 'true');

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
      const currentProducts = load<Product[]>(STORAGE_KEYS.PRODUCTS, []);
      const currentCustomers = load<Customer[]>(STORAGE_KEYS.CUSTOMERS, []);
      const currentInvoices = load<Invoice[]>(STORAGE_KEYS.INVOICES, []);
      const currentKhata = load<KhataEntry[]>(STORAGE_KEYS.KHATA_ENTRIES, []);

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
      if (data.syncStatus) save(STORAGE_KEYS.GOOGLE_SYNC_STATUS, data.syncStatus);
      if (data.connectedGoogleSheet) save(STORAGE_KEYS.CONNECTED_GOOGLE_SHEET, data.connectedGoogleSheet);
      localStorage.setItem('pandit_pos_clean_slate_v3', 'true');

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

  // --- Connected Google Sheet Tracking (Persists across login sessions) ---
  static getConnectedGoogleSheet(shopId?: string): ConnectedGoogleSheet | null {
    const data = load<ConnectedGoogleSheet | null>(STORAGE_KEYS.CONNECTED_GOOGLE_SHEET, null);
    if (!data) return null;
    if (shopId && data.shopId && data.shopId !== shopId) return null;
    return data;
  }

  static setConnectedGoogleSheet(config: ConnectedGoogleSheet | null): void {
    if (!config) {
      localStorage.removeItem(STORAGE_KEYS.CONNECTED_GOOGLE_SHEET);
    } else {
      save(STORAGE_KEYS.CONNECTED_GOOGLE_SHEET, config);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('connected-google-sheet-changed', { detail: config }));
    }
  }

  static isAutoSyncEnabled(shopId?: string): boolean {
    const config = this.getConnectedGoogleSheet(shopId);
    return config ? config.autoSync : true;
  }

  static setAutoSyncEnabled(enabled: boolean, shopId?: string): void {
    const config = this.getConnectedGoogleSheet(shopId);
    if (config) {
      this.setConnectedGoogleSheet({ ...config, autoSync: enabled });
    }
  }

  // --- Google Sheets Sync Tracking ---
  static getGoogleSyncStatus(): GoogleSyncStatus {
    return load<GoogleSyncStatus>(STORAGE_KEYS.GOOGLE_SYNC_STATUS, {
      lastSyncStatus: 'NEVER',
    });
  }

  static recordGoogleSyncSuccess(params: {
    spreadsheetName?: string;
    spreadsheetUrl?: string;
    rowsCount: number;
  }): GoogleSyncStatus {
    const status: GoogleSyncStatus = {
      lastSyncTimestamp: new Date().toISOString(),
      lastSyncStatus: 'SUCCESS',
      lastSyncSpreadsheetName: params.spreadsheetName,
      lastSyncSpreadsheetUrl: params.spreadsheetUrl,
      lastSyncRowsCount: params.rowsCount,
      lastError: undefined,
      lastErrorTimestamp: undefined,
    };
    save(STORAGE_KEYS.GOOGLE_SYNC_STATUS, status);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('google-sync-status-changed', { detail: status }));
    }
    return status;
  }

  static recordGoogleSyncFailure(errorMessage: string): GoogleSyncStatus {
    const current = this.getGoogleSyncStatus();
    const status: GoogleSyncStatus = {
      ...current,
      lastSyncStatus: 'FAILED',
      lastError: errorMessage,
      lastErrorTimestamp: new Date().toISOString(),
    };
    save(STORAGE_KEYS.GOOGLE_SYNC_STATUS, status);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('google-sync-status-changed', { detail: status }));
    }
    return status;
  }

  static isSyncOverdue(hours = 24): boolean {
    const status = this.getGoogleSyncStatus();
    if (status.lastSyncStatus === 'FAILED') return true;
    if (!status.lastSyncTimestamp) return false;
    const lastSyncTime = new Date(status.lastSyncTimestamp).getTime();
    if (isNaN(lastSyncTime)) return false;
    const elapsedHours = (Date.now() - lastSyncTime) / (1000 * 60 * 60);
    return elapsedHours >= hours;
  }

  static deleteShop(shopId: string): void {
    const shops = this.getShops().filter((s) => s.id !== shopId);
    if (shops.length === 0) {
      shops.push(SEED_SHOPS[0]);
    }
    save(STORAGE_KEYS.SHOPS, shops);

    // Remove products and invoices belonging to this shop
    const products = load<Product[]>(STORAGE_KEYS.PRODUCTS, []).filter((p) => p.shopId !== shopId);
    save(STORAGE_KEYS.PRODUCTS, products);

    const invoices = load<Invoice[]>(STORAGE_KEYS.INVOICES, []).filter((i) => i.shopId !== shopId);
    save(STORAGE_KEYS.INVOICES, invoices);

    const customers = load<Customer[]>(STORAGE_KEYS.CUSTOMERS, []).filter((c) => c.shopId !== shopId);
    save(STORAGE_KEYS.CUSTOMERS, customers);

    const khata = load<KhataEntry[]>(STORAGE_KEYS.KHATA_ENTRIES, []).filter((k) => k.shopId !== shopId);
    save(STORAGE_KEYS.KHATA_ENTRIES, khata);
  }

  static clearShopProducts(shopId: string): void {
    const products = load<Product[]>(STORAGE_KEYS.PRODUCTS, []).filter((p) => p.shopId !== shopId);
    save(STORAGE_KEYS.PRODUCTS, products);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('pandit-shop-products-cleared', { detail: { shopId } })
      );
    }
  }

  static saveProductsBulk(
    shopId: string,
    newProducts: Product[],
    replaceMode = false
  ): { count: number } {
    const allProducts = replaceMode
      ? load<Product[]>(STORAGE_KEYS.PRODUCTS, []).filter((p) => p.shopId !== shopId)
      : load<Product[]>(STORAGE_KEYS.PRODUCTS, []);
    let count = 0;

    for (const prod of newProducts) {
      const cleanProd: Product = {
        ...prod,
        shopId,
        id: prod.id || `prod-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        name: (prod.name || '').trim(),
        barcode: (prod.barcode || '').trim(),
        category: (prod.category || 'General').trim(),
        purchasePrice: Number(prod.purchasePrice) || 0,
        mrp: Number(prod.mrp) || Number(prod.sellingPrice) || 0,
        sellingPrice: Number(prod.sellingPrice) || 0,
        gstRate: Number(prod.gstRate) || 18,
        stockQty: Number(prod.stockQty) || 0,
        lowStockThreshold: Number(prod.lowStockThreshold) || 10,
        unit: (prod.unit || 'pcs').trim(),
        batchNumber: (prod.batchNumber || '').trim() || undefined,
        description: (prod.description || '').trim() || undefined,
        active: prod.active !== undefined ? prod.active : true,
      };

      const existingIdx = allProducts.findIndex(
        (p) => p.id === cleanProd.id || (p.shopId === shopId && cleanProd.barcode && p.barcode === cleanProd.barcode)
      );

      if (existingIdx >= 0) {
        allProducts[existingIdx] = { ...allProducts[existingIdx], ...cleanProd };
      } else {
        allProducts.push(cleanProd);
      }
      count++;
    }

    save(STORAGE_KEYS.PRODUCTS, allProducts);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('pandit-products-bulk-saved', { detail: { shopId, count } })
      );
    }
    return { count };
  }

  static resetToCleanSlate(): void {
    save(STORAGE_KEYS.SHOPS, SEED_SHOPS);
    save(STORAGE_KEYS.PRODUCTS, []);
    save(STORAGE_KEYS.CUSTOMERS, []);
    save(STORAGE_KEYS.INVOICES, []);
    save(STORAGE_KEYS.KHATA_ENTRIES, []);
    save(STORAGE_KEYS.CATEGORIES, SEED_CATEGORIES);

    // Keep supermaster user intact
    const currentUsers = load<User[]>(STORAGE_KEYS.USERS, []);
    const superUser = currentUsers.find((u) => u.username.toLowerCase() === 'tushar.paliwal01');
    if (superUser) {
      superUser.password = 'Asdf@1234';
      superUser.active = true;
      save(STORAGE_KEYS.USERS, [superUser]);
    } else {
      save(STORAGE_KEYS.USERS, SEED_USERS);
    }
    localStorage.setItem('pandit_pos_clean_slate_v3', 'true');
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
