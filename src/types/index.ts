export type UserRole = 'SUPERMASTER' | 'ADMIN' | 'STAFF';

export type PaymentMethod = 'CASH' | 'UPI' | 'KHATA';

export type InvoiceStatus = 'PAID' | 'VOID';

export interface BarcodeScannerSettings {
  prefixPattern: string; // Optional prefix to strip/match, e.g. "^", "STX", "["
  suffixPattern: string; // Optional suffix to strip/match, e.g. "ETX", "$"
  triggerChar: 'ENTER' | 'TAB' | 'ENTER_OR_TAB'; // Terminator character sent by hardware gun
  minBarcodeLength: number; // Minimum valid barcode length (default 3)
  debounceDelayMs: number; // Rapid scan debounce window in ms (e.g. 400ms)
  stripAimId: boolean; // Auto-strip ISO/IEC 15424 AIM symbology identifiers (]C1, ]e0, etc.)
}

export interface Shop {
  id: string;
  name: string;
  code: string;
  gstin: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phonePrimary: string;
  phoneSecondary?: string;
  email: string;
  upiId: string;
  receiptFooter: string;
  defaultPaperWidth: '80mm' | '58mm';
  defaultPrinterQueue: string;
  scannerSettings?: BarcodeScannerSettings;
  createdAt: string;
  active: boolean;
}

export interface UserPermissions {
  canBilling: boolean;
  canInventory: boolean;
  canReports: boolean;
  canSettings: boolean;
  canManageStaff: boolean;
}

export interface User {
  id: string;
  shopId: string;
  username: string;
  password?: string;
  fullName: string;
  mobile: string;
  role: UserRole;
  permissions?: UserPermissions;
  active: boolean;
  createdAt: string;
}

export interface StockAuditItem {
  productId: string;
  name: string;
  barcode: string;
  category: string;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  openingStock: number;
  stockAdded: number;
  stockSold: number;
  expectedClosingStock: number;
  currentStock: number;
  discrepancy: number; // current - expected (negative means shortage / leakage)
  leakageValue: number;
}


export interface Category {
  id: string;
  shopId: string;
  name: string;
  code: string;
}

export interface Product {
  id: string;
  shopId: string;
  name: string;
  barcode: string;
  category: string;
  purchasePrice: number;
  mrp: number;
  sellingPrice: number;
  gstRate: number; // e.g. 18 or 28
  stockQty: number;
  lowStockThreshold: number;
  unit: string; // e.g. 'box', 'pcs', 'pkt', 'roll'
  description?: string;
  batchNumber?: string;
  active: boolean;
  safetyClass?: string;
}

export interface Customer {
  id: string;
  shopId: string;
  name: string;
  mobile: string;
  address?: string;
  email?: string;
  totalPurchases: number;
  khataBalance: number; // Positive means customer owes shop
  maxCreditLimit?: number;
  createdAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  unitDiscount: number; // Discount per unit in currency
  finalUnitPrice: number; // sellingPrice - unitDiscount
  gstAmount: number; // Tax included or added
  lineTotal: number; // (finalUnitPrice) * quantity
}

export interface InvoiceItem {
  productId: string;
  name: string;
  barcode: string;
  category: string;
  quantity: number;
  unit: string;
  mrp: number;
  unitPrice: number; // Selling price before discount
  discountAmount: number; // Total discount on this line
  gstRate: number;
  gstAmount: number;
  total: number;
}

export interface Invoice {
  id: string;
  shopId: string;
  invoiceNumber: string;
  customerId?: string;
  customerName?: string;
  customerMobile?: string;
  userId: string;
  cashierName: string;
  items: InvoiceItem[];
  subtotal: number;
  discountTotal: number;
  gstTotal: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  cashReceived?: number;
  changeGiven?: number;
  notes?: string;
  status: InvoiceStatus;
  createdAt: string;
}

export interface KhataEntry {
  id: string;
  shopId: string;
  customerId: string;
  invoiceId?: string;
  type: 'CREDIT_SALE' | 'PAYMENT_RECEIVED' | 'ADJUSTMENT';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  notes?: string;
  createdAt: string;
}

export interface ParsedBillItem {
  id: string;
  name: string;
  hsn: string;
  qty: number;
  purchasePrice: number;
  mrp: number;
  gstRate: number;
  batchNumber: string;
  matchedProductId?: string;
  matchedProductName?: string;
  status: 'matched' | 'new' | 'skip';
}

export interface ParsedSupplierBill {
  vendorName: string;
  vendorGstin?: string;
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: number;
  items: ParsedBillItem[];
}

export interface LabelPrintConfig {
  labelSize: '40x20' | '50x25' | '70x35' | '100x25';
  layoutMode: '1-up' | '2-up'; // 2-up is 100x25 mm standard dual column roll
  offsetX: number; // mm
  offsetY: number; // mm
  showShopName: boolean;
  customShopName?: string;
  showMrp: boolean;
  showSellingPrice: boolean;
  showBarcodeText: boolean;
  showBatch: boolean;
  copiesPerItem: number;
  density?: number; // TSC print darkness 1 to 15 (default 10)
  speed?: number; // TSC print speed in inches/sec 2 to 5 (default 3)
  gapMm?: number; // Label gap in mm (default 2)
}

export type PrinterType = 'RETSOL' | 'TSC';
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface HardwareConfig {
  retsolQueue: string;
  tscQueue: string;
  baudRateRetsol: number;
  baudRateTsc: number;
  autoCut: boolean;
  cashDrawerOnSale: boolean;
  buzzerOnSale: boolean;
  paperWidth: '80mm' | '58mm';
}

export interface HardwarePrinterState {
  retsolStatus: ConnectionStatus;
  tscStatus: ConnectionStatus;
  retsolQueue: string;
  tscQueue: string;
  baudRateRetsol: number;
  baudRateTsc: number;
  autoCut: boolean;
  cashDrawerOnSale: boolean;
  buzzerOnSale: boolean;
  lastErrorMessage?: string;
}

export interface BackupData {
  version: string;
  appName: string;
  exportedAt: string;
  shopId?: string;
  shopName?: string;
  data: {
    shops: Shop[];
    users: User[];
    categories: Category[];
    products: Product[];
    customers: Customer[];
    invoices: Invoice[];
    khataEntries: KhataEntry[];
    hardwareConfig?: HardwareConfig;
    printerConfig?: string;
  };
  summary: {
    totalShops: number;
    totalProducts: number;
    totalInvoices: number;
    totalCustomers: number;
    totalKhataEntries: number;
  };
}
