import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { Product, Invoice, Customer, Shop } from '../types';
import { StorageService } from './storage';

// Initialize Firebase App singleton
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const firebaseAuth = getAuth(app);

// Configure Google Auth Provider with Google Sheets & Drive Scopes
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
// Prompt user to select account when connecting
provider.setCustomParameters({
  prompt: 'select_account',
});

// IN-MEMORY TOKEN CACHE (Mandatory rule: Never store OAuth tokens in localStorage/sessionStorage)
let cachedAccessToken: string | null = null;
let currentFirebaseUser: FirebaseUser | null = null;
let isSigningIn = false;

type AuthCallback = (user: FirebaseUser | null, token: string | null) => void;
const authListeners: AuthCallback[] = [];

// Initialize Firebase Auth listener
export const initGoogleAuth = (onAuthChange: AuthCallback): (() => void) => {
  authListeners.push(onAuthChange);

  // Trigger with current state immediately
  onAuthChange(currentFirebaseUser, cachedAccessToken);

  const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
    currentFirebaseUser = user;
    if (!user) {
      cachedAccessToken = null;
    }
    // If user is present but token expired/null and we're not signing in,
    // token will be refreshed on explicit login
    authListeners.forEach((fn) => fn(currentFirebaseUser, cachedAccessToken));
  });

  return () => {
    const idx = authListeners.indexOf(onAuthChange);
    if (idx !== -1) authListeners.splice(idx, 1);
    unsubscribe();
  };
};

/**
 * Sign in with Google Popup and obtain access token with Sheets/Drive scopes
 */
export const signInWithGoogle = async (): Promise<{ user: FirebaseUser; token: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(firebaseAuth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    if (!credential?.accessToken) {
      throw new Error('Google authentication succeeded but no OAuth access token was returned.');
    }

    cachedAccessToken = credential.accessToken;
    currentFirebaseUser = result.user;

    authListeners.forEach((fn) => fn(currentFirebaseUser, cachedAccessToken));

    // If a connected spreadsheet exists, auto-sync latest inventory immediately
    setTimeout(() => {
      triggerRealtimeInventorySync().catch((err) =>
        console.warn('Initial real-time auto-sync after sign-in:', err)
      );
    }, 200);

    return {
      user: result.user,
      token: cachedAccessToken,
    };
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Sign out from Google Session and wipe in-memory token
 */
export const signOutGoogle = async (): Promise<void> => {
  await signOut(firebaseAuth);
  cachedAccessToken = null;
  currentFirebaseUser = null;
  authListeners.forEach((fn) => fn(null, null));
};

export const getGoogleAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const isGoogleConnected = (): boolean => {
  return !!cachedAccessToken && !!currentFirebaseUser;
};

export const getConnectedGoogleUser = (): FirebaseUser | null => {
  return currentFirebaseUser;
};

// ==========================================
// Google Drive & Sheets REST API Helpers
// ==========================================

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<any> {
  const token = await getGoogleAccessToken();
  if (!token) {
    throw new Error('Not connected to Google. Please sign in with your Google account first.');
  }

  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Content-Type') && options.method && options.method !== 'GET') {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    let errorDetail = '';
    try {
      const errJson = await res.json();
      errorDetail = errJson.error?.message || JSON.stringify(errJson);
    } catch {
      errorDetail = await res.text();
    }
    throw new Error(`Google Sheets API Error (${res.status}): ${errorDetail}`);
  }

  return res.json();
}

/**
 * Search existing spreadsheets accessible to this app in user's Drive
 */
export async function listUserSpreadsheets(): Promise<
  Array<{ id: string; name: string; modifiedTime: string; webViewLink?: string }>
> {
  const q = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&orderBy=modifiedTime desc&pageSize=25&fields=files(id,name,modifiedTime,webViewLink)`;
  const data = await fetchWithAuth(url);
  return data.files || [];
}

/**
 * Fetch spreadsheet metadata to get tab names and dimensions
 */
export async function getSpreadsheetMetadata(spreadsheetId: string) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties,sheets.properties`;
  return fetchWithAuth(url);
}

/**
 * Create a brand new Google Spreadsheet
 */
export async function createSpreadsheet(
  title: string,
  sheetTitles: string[] = ['Sheet1']
): Promise<{ spreadsheetId: string; spreadsheetUrl: string; sheetIds: Record<string, number> }> {
  const sheets = sheetTitles.map((sheetTitle, index) => ({
    properties: {
      sheetId: index === 0 ? 0 : index * 1000 + 1,
      title: sheetTitle,
      gridProperties: {
        frozenRowCount: 1,
      },
    },
  }));

  const payload = {
    properties: {
      title,
    },
    sheets,
  };

  const data = await fetchWithAuth('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  const sheetIds: Record<string, number> = {};
  if (data.sheets) {
    data.sheets.forEach((s: any) => {
      sheetIds[s.properties.title] = s.properties.sheetId;
    });
  }

  return {
    spreadsheetId: data.spreadsheetId,
    spreadsheetUrl: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
    sheetIds,
  };
}

/**
 * Read values from a given range
 */
export async function readSheetValues(spreadsheetId: string, range: string): Promise<string[][]> {
  const encodedRange = encodeURIComponent(range);
  const data = await fetchWithAuth(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}?valueRenderOption=FORMATTED_VALUE`
  );
  return data.values || [];
}

/**
 * Update (overwrite) a specific range with new values
 */
export async function updateSheetValues(
  spreadsheetId: string,
  range: string,
  values: any[][]
): Promise<any> {
  const encodedRange = encodeURIComponent(range);
  return fetchWithAuth(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      body: JSON.stringify({
        range,
        majorDimension: 'ROWS',
        values,
      }),
    }
  );
}

/**
 * Append rows to the end of a sheet
 */
export async function appendSheetValues(
  spreadsheetId: string,
  range: string,
  values: any[][]
): Promise<any> {
  const encodedRange = encodeURIComponent(range);
  return fetchWithAuth(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      body: JSON.stringify({
        range,
        majorDimension: 'ROWS',
        values,
      }),
    }
  );
}

/**
 * Add a new sheet/tab to existing spreadsheet if it doesn't already exist
 */
export async function ensureSheetTabExists(spreadsheetId: string, tabName: string): Promise<void> {
  const meta = await getSpreadsheetMetadata(spreadsheetId);
  const existingTabs = meta.sheets?.map((s: any) => s.properties?.title) || [];
  if (existingTabs.includes(tabName)) {
    return;
  }

  await fetchWithAuth(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({
      requests: [
        {
          addSheet: {
            properties: {
              title: tabName,
              gridProperties: {
                frozenRowCount: 1,
              },
            },
          },
        },
      ],
    }),
  });
}

/**
 * Apply styling (header background color, bold text) to a tab
 */
export async function styleHeaderRow(spreadsheetId: string, sheetId: number, colCount: number) {
  try {
    await fetchWithAuth(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [
          {
            repeatCell: {
              range: {
                sheetId,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: colCount,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.12, green: 0.16, blue: 0.22 }, // dark slate
                  textFormat: {
                    foregroundColor: { red: 1.0, green: 0.65, blue: 0.0 }, // orange/amber
                    bold: true,
                    fontSize: 10,
                  },
                  horizontalAlignment: 'CENTER',
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
            },
          },
        ],
      }),
    });
  } catch (err) {
    // Non-fatal styling error
    console.warn('Could not apply header styling to Google Sheet:', err);
  }
}

// ==========================================
// PANDIT POS High-Level Sync Operations
// ==========================================

export interface SyncResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  tabName: string;
  rowsExported: number;
  timestamp: string;
}

/**
 * Sync / Export Inventory Products to Google Sheet
 */
export async function exportInventoryToGoogleSheet(
  shop: Shop,
  products: Product[],
  targetSpreadsheetId?: string
): Promise<SyncResult> {
  let spreadsheetId = targetSpreadsheetId;
  let spreadsheetUrl = '';
  const tabName = 'Inventory Stock';

  if (!spreadsheetId) {
    const created = await createSpreadsheet(`PANDIT POS - Inventory Stock [${shop.name}]`, [tabName]);
    spreadsheetId = created.spreadsheetId;
    spreadsheetUrl = created.spreadsheetUrl;
  } else {
    spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    await ensureSheetTabExists(spreadsheetId, tabName);
  }

  const headers = [
    'Product ID / SKU',
    'Barcode',
    'Product Name',
    'Category',
    'Unit',
    'Purchase Price (₹)',
    'Selling Price (₹)',
    'Profit Margin (%)',
    'Current Stock',
    'Low Stock Threshold',
    'Stock Status',
    'GST Rate (%)',
    'Total Valuation (₹)',
    'Last Synced At',
  ];

  const nowIso = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  const rows = products.map((p) => {
    const profitMargin =
      p.sellingPrice > 0
        ? Math.round(((p.sellingPrice - p.purchasePrice) / p.sellingPrice) * 100)
        : 0;
    const valuation = Math.round(p.stockQty * p.purchasePrice);
    const stockStatus =
      p.stockQty <= 0
        ? 'OUT OF STOCK'
        : p.stockQty <= p.lowStockThreshold
        ? 'LOW STOCK'
        : 'IN STOCK';

    return [
      p.id,
      p.barcode,
      p.name,
      p.category,
      p.unit,
      p.purchasePrice,
      p.sellingPrice,
      `${profitMargin}%`,
      p.stockQty,
      p.lowStockThreshold,
      stockStatus,
      `${p.gstRate}%`,
      valuation,
      nowIso,
    ];
  });

  const fullData = [headers, ...rows];

  await updateSheetValues(spreadsheetId, `${tabName}!A1`, fullData);

  return {
    spreadsheetId,
    spreadsheetUrl,
    tabName,
    rowsExported: rows.length,
    timestamp: nowIso,
  };
}

/**
 * Sync / Export Sales & Invoices to Google Sheet
 */
export async function exportSalesToGoogleSheet(
  shop: Shop,
  invoices: Invoice[],
  targetSpreadsheetId?: string
): Promise<SyncResult> {
  let spreadsheetId = targetSpreadsheetId;
  let spreadsheetUrl = '';
  const tabName = 'Sales & Invoices';

  if (!spreadsheetId) {
    const created = await createSpreadsheet(`PANDIT POS - Sales & Invoices [${shop.name}]`, [tabName]);
    spreadsheetId = created.spreadsheetId;
    spreadsheetUrl = created.spreadsheetUrl;
  } else {
    spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    await ensureSheetTabExists(spreadsheetId, tabName);
  }

  const headers = [
    'Invoice Number',
    'Date & Time',
    'Customer Name',
    'Customer Mobile',
    'Items Count',
    'Subtotal (₹)',
    'Discount (₹)',
    'GST / Tax (₹)',
    'Grand Total (₹)',
    'Payment Mode',
    'Cashier Name',
    'Items Summary',
  ];

  const rows = invoices.map((inv) => {
    const itemsSummary = inv.items
      .map((it) => `${it.name} (x${it.quantity} ${it.unit})`)
      .join(', ');

    return [
      inv.invoiceNumber,
      new Date(inv.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      inv.customerName || 'Walk-in Retail Buyer',
      inv.customerMobile || '-',
      inv.items.length,
      inv.subtotal,
      inv.discountTotal,
      inv.gstTotal,
      inv.grandTotal,
      inv.paymentMethod,
      inv.cashierName,
      itemsSummary,
    ];
  });

  const fullData = [headers, ...rows];
  await updateSheetValues(spreadsheetId, `${tabName}!A1`, fullData);

  const nowIso = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  return {
    spreadsheetId,
    spreadsheetUrl,
    tabName,
    rowsExported: rows.length,
    timestamp: nowIso,
  };
}

/**
 * Sync / Export Customers & Khata Ledger to Google Sheet
 */
export async function exportKhataToGoogleSheet(
  shop: Shop,
  customers: Customer[],
  targetSpreadsheetId?: string
): Promise<SyncResult> {
  let spreadsheetId = targetSpreadsheetId;
  let spreadsheetUrl = '';
  const tabName = 'Customers & Khata';

  if (!spreadsheetId) {
    const created = await createSpreadsheet(`PANDIT POS - Khata Ledger [${shop.name}]`, [tabName]);
    spreadsheetId = created.spreadsheetId;
    spreadsheetUrl = created.spreadsheetUrl;
  } else {
    spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    await ensureSheetTabExists(spreadsheetId, tabName);
  }

  const headers = [
    'Customer Name',
    'Mobile Number',
    'Address',
    'Credit Limit (₹)',
    'Current Khata Due (₹)',
    'Status',
    'Created Date',
  ];

  const rows = customers.map((c) => [
    c.name,
    c.mobile,
    c.address || '-',
    c.maxCreditLimit || 0,
    c.khataBalance,
    c.khataBalance > 0 ? 'PAYMENT DUE' : 'CLEAR',
    c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN') : '-',
  ]);

  const fullData = [headers, ...rows];
  await updateSheetValues(spreadsheetId, `${tabName}!A1`, fullData);

  const nowIso = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  return {
    spreadsheetId,
    spreadsheetUrl,
    tabName,
    rowsExported: rows.length,
    timestamp: nowIso,
  };
}

/**
 * Sync / Export Complete Multi-Tab Store Backup to Google Sheet
 */
export async function exportCompleteStoreToGoogleSheet(
  shop: Shop,
  products: Product[],
  invoices: Invoice[],
  customers: Customer[]
): Promise<SyncResult> {
  const title = `PANDIT POS - Master Data Sync [${shop.name}]`;
  const tabs = ['Inventory Stock', 'Sales & Invoices', 'Customers & Khata'];

  const created = await createSpreadsheet(title, tabs);
  const spreadsheetId = created.spreadsheetId;

  // 1. Export Inventory
  await exportInventoryToGoogleSheet(shop, products, spreadsheetId);

  // 2. Export Sales
  await exportSalesToGoogleSheet(shop, invoices, spreadsheetId);

  // 3. Export Khata
  await exportKhataToGoogleSheet(shop, customers, spreadsheetId);

  const nowIso = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  return {
    spreadsheetId,
    spreadsheetUrl: created.spreadsheetUrl,
    tabName: 'All Tabs (3 Sheets)',
    rowsExported: products.length + invoices.length + customers.length,
    timestamp: nowIso,
  };
}

/**
 * Import and update products catalog directly from a user's Google Sheet
 */
export async function importProductsFromGoogleSheet(
  spreadsheetId: string,
  tabName = 'Inventory Stock'
): Promise<Partial<Product>[]> {
  const rows = await readSheetValues(spreadsheetId, `${tabName}!A1:N500`);
  if (!rows || rows.length < 2) {
    throw new Error('No product data rows found in the specified Google Sheet tab.');
  }

  const headerRow = rows[0].map((h) => h.toLowerCase().trim());
  const barcodeIdx = headerRow.findIndex((h) => h.includes('barcode'));
  const nameIdx = headerRow.findIndex((h) => h.includes('name'));
  const catIdx = headerRow.findIndex((h) => h.includes('category'));
  const unitIdx = headerRow.findIndex((h) => h.includes('unit'));
  const purchaseIdx = headerRow.findIndex((h) => h.includes('purchase'));
  const sellingIdx = headerRow.findIndex((h) => h.includes('selling') || h.includes('price'));
  const stockIdx = headerRow.findIndex((h) => h.includes('current stock') || h.includes('stock'));
  const gstIdx = headerRow.findIndex((h) => h.includes('gst'));

  const parsedProducts: Partial<Product>[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0 || !row[nameIdx !== -1 ? nameIdx : 2]) continue;

    const barcode = barcodeIdx !== -1 ? String(row[barcodeIdx] || '').trim() : '';
    const name = nameIdx !== -1 ? String(row[nameIdx] || '').trim() : String(row[2] || '').trim();
    if (!name) continue;

    const category = catIdx !== -1 ? String(row[catIdx] || 'General').trim() : 'General';
    const unit = unitIdx !== -1 ? String(row[unitIdx] || 'box').trim() : 'box';
    const purchasePrice = purchaseIdx !== -1 ? parseFloat(String(row[purchaseIdx]).replace(/[^0-9.]/g, '')) || 0 : 0;
    const sellingPrice = sellingIdx !== -1 ? parseFloat(String(row[sellingIdx]).replace(/[^0-9.]/g, '')) || 0 : purchasePrice * 1.3;
    const stockQty = stockIdx !== -1 ? parseInt(String(row[stockIdx]).replace(/[^0-9-]/g, ''), 10) || 0 : 0;
    const gstRate = gstIdx !== -1 ? parseFloat(String(row[gstIdx]).replace(/[^0-9.]/g, '')) || 18 : 18;

    parsedProducts.push({
      barcode: barcode || `BC-${Date.now()}-${i}`,
      name,
      category,
      unit,
      purchasePrice,
      sellingPrice,
      stockQty,
      gstRate,
      mrp: Math.round(sellingPrice * 1.2),
      lowStockThreshold: 10,
      active: true,
    });
  }

  return parsedProducts;
}

// ==========================================
// Real-Time Inventory & Stock Auto-Sync Engine
// ==========================================

let autoSyncTimer: any = null;

/**
 * Trigger immediate or debounced real-time sync of current store inventory to connected Google Sheet
 */
export async function triggerRealtimeInventorySync(
  shopId?: string,
  immediateProduct?: Product
): Promise<SyncResult | null> {
  const session = StorageService.getCurrentSession();
  const targetShopId =
    shopId || session?.shop.id || StorageService.getShops()[0]?.id;
  if (!targetShopId) return null;

  const shop = StorageService.getShopById(targetShopId) || StorageService.getShops()[0];
  if (!shop) return null;

  const connectedSheet = StorageService.getConnectedGoogleSheet(shop.id);
  // Auto-sync requires an active connected spreadsheet ID and autoSync === true
  if (!connectedSheet || !connectedSheet.autoSync || !connectedSheet.spreadsheetId) {
    return null;
  }

  // Check if currently authenticated with Google
  const token = await getGoogleAccessToken();
  if (!token) {
    console.info('Google Sheets auto-sync waiting: Google session token not available.');
    return null;
  }

  if (autoSyncTimer) {
    clearTimeout(autoSyncTimer);
  }

  return new Promise((resolve) => {
    autoSyncTimer = setTimeout(async () => {
      try {
        const liveProducts = StorageService.getProducts(shop.id);
        const res = await exportInventoryToGoogleSheet(
          shop,
          liveProducts,
          connectedSheet.spreadsheetId
        );

        StorageService.recordGoogleSyncSuccess({
          spreadsheetName: connectedSheet.spreadsheetName,
          spreadsheetUrl: res.spreadsheetUrl,
          rowsCount: res.rowsExported,
        });

        StorageService.setConnectedGoogleSheet({
          ...connectedSheet,
          spreadsheetUrl: res.spreadsheetUrl,
          lastAutoSyncTimestamp: new Date().toISOString(),
        });

        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('google-sheet-auto-synced', {
              detail: {
                productName: immediateProduct?.name,
                rowsCount: res.rowsExported,
                spreadsheetName: connectedSheet.spreadsheetName,
                spreadsheetUrl: res.spreadsheetUrl,
                timestamp: res.timestamp,
              },
            })
          );
        }

        resolve(res);
      } catch (err: any) {
        console.error('Real-time auto-sync to Google Sheet failed:', err);
        StorageService.recordGoogleSyncFailure(err?.message || 'Real-time auto-sync failed');
        resolve(null);
      }
    }, 350); // 350ms debounce
  });
}

/**
 * Global Real-time Auto-Sync Listener
 * Automatically listens for all product additions, stock edits, and bulk imports across the app
 */
export function initRealtimeInventoryAutoSync(): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleProductSaved = (e: any) => {
    const product = e.detail as Product;
    if (product && product.shopId) {
      triggerRealtimeInventorySync(product.shopId, product);
    } else {
      triggerRealtimeInventorySync();
    }
  };

  const handleBulkSaved = (e: any) => {
    const detail = e.detail;
    triggerRealtimeInventorySync(detail?.shopId);
  };

  const handleStockAdjusted = (e: any) => {
    const detail = e.detail;
    triggerRealtimeInventorySync(detail?.shopId);
  };

  const handleProductsCleared = (e: any) => {
    const detail = e.detail;
    triggerRealtimeInventorySync(detail?.shopId);
  };

  window.addEventListener('pandit-product-saved', handleProductSaved);
  window.addEventListener('pandit-product-deleted', handleProductSaved);
  window.addEventListener('pandit-products-bulk-saved', handleBulkSaved);
  window.addEventListener('pandit-stock-adjusted', handleStockAdjusted);
  window.addEventListener('pandit-shop-products-cleared', handleProductsCleared);

  return () => {
    window.removeEventListener('pandit-product-saved', handleProductSaved);
    window.removeEventListener('pandit-product-deleted', handleProductSaved);
    window.removeEventListener('pandit-products-bulk-saved', handleBulkSaved);
    window.removeEventListener('pandit-stock-adjusted', handleStockAdjusted);
    window.removeEventListener('pandit-shop-products-cleared', handleProductsCleared);
  };
}
