import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Upload,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Database,
  ShieldCheck,
  Package,
  ShoppingCart,
  Users,
  LogOut,
  FolderOpen,
  Plus,
  HelpCircle,
  FileCheck,
} from 'lucide-react';
import { Shop, Product, Invoice, Customer } from '../types';
import {
  initGoogleAuth,
  signInWithGoogle,
  signOutGoogle,
  listUserSpreadsheets,
  exportInventoryToGoogleSheet,
  exportSalesToGoogleSheet,
  exportKhataToGoogleSheet,
  exportCompleteStoreToGoogleSheet,
  importProductsFromGoogleSheet,
  SyncResult,
} from '../services/googleSheetsService';
import { StorageService } from '../services/storage';

interface GoogleSheetsViewProps {
  shop: Shop;
  products: Product[];
  invoices: Invoice[];
  customers: Customer[];
  onRefreshData: () => void;
}

export const GoogleSheetsView: React.FC<GoogleSheetsViewProps> = ({
  shop,
  products,
  invoices,
  customers,
  onRefreshData,
}) => {
  // Google Auth state
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [hasAuthToken, setHasAuthToken] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Drive Spreadsheets List
  const [spreadsheets, setSpreadsheets] = useState<
    Array<{ id: string; name: string; modifiedTime: string; webViewLink?: string }>
  >([]);
  const [loadingSheets, setLoadingSheets] = useState(false);
  const [selectedSpreadsheetId, setSelectedSpreadsheetId] = useState<string>('');

  // Operations State
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // User Confirmation Dialog for Destructive / Overwrite operations
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmButtonText: string;
    onConfirm: () => void;
  } | null>(null);

  // Import preview state
  const [importPreview, setImportPreview] = useState<{
    isOpen: boolean;
    products: Partial<Product>[];
  }>({ isOpen: false, products: [] });

  // Initialize Auth listener on mount
  useEffect(() => {
    const unsubscribe = initGoogleAuth((user, token) => {
      setGoogleUser(user);
      setHasAuthToken(!!token);
    });
    return () => unsubscribe();
  }, []);

  // Fetch drive spreadsheets when connected
  const refreshSpreadsheetsList = async () => {
    if (!hasAuthToken) return;
    setLoadingSheets(true);
    try {
      const list = await listUserSpreadsheets();
      setSpreadsheets(list);
    } catch (err: any) {
      console.error('Failed to load spreadsheets list:', err);
    } finally {
      setLoadingSheets(false);
    }
  };

  useEffect(() => {
    if (hasAuthToken) {
      refreshSpreadsheetsList();
    }
  }, [hasAuthToken]);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
      setStatusMessage({
        type: 'success',
        text: 'Successfully linked Google Account with Google Sheets and Drive permissions!',
      });
    } catch (err: any) {
      setAuthError(err.message || 'Failed to authenticate with Google. Please check your popup permissions.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogout = async () => {
    await signOutGoogle();
    setSpreadsheets([]);
    setSelectedSpreadsheetId('');
    setLastSyncResult(null);
    setStatusMessage({
      type: 'info',
      text: 'Disconnected Google Account. Session tokens cleared from memory.',
    });
  };

  // Safe Export handler with user confirmation
  const handleTriggerExport = (
    type: 'all' | 'inventory' | 'sales' | 'khata',
    targetId?: string
  ) => {
    const isNewSheet = !targetId;
    const targetName = isNewSheet
      ? 'a new Google Spreadsheet'
      : `existing Google Sheet: ${spreadsheets.find((s) => s.id === targetId)?.name || targetId}`;

    let description = '';
    let confirmText = 'Proceed with Export';

    if (type === 'all') {
      description = `This will export ${products.length} inventory products, ${invoices.length} sales invoices, and ${customers.length} customer records into ${targetName}.`;
    } else if (type === 'inventory') {
      description = `This will write ${products.length} products with live stock balances, purchase prices, selling prices, and profit margins into ${targetName}.`;
    } else if (type === 'sales') {
      description = `This will write ${invoices.length} invoice records with item summaries and payment methods into ${targetName}.`;
    } else if (type === 'khata') {
      description = `This will write ${customers.length} customer Khata ledger records into ${targetName}.`;
    }

    if (!isNewSheet) {
      description += ` NOTE: Existing sheet data in target tabs will be refreshed.`;
      confirmText = 'Yes, Overwrite & Sync Sheet';
    }

    setConfirmDialog({
      isOpen: true,
      title: `Confirm Google Sheets Export (${type.toUpperCase()})`,
      description,
      confirmButtonText: confirmText,
      onConfirm: async () => {
        setConfirmDialog(null);
        await executeExport(type, targetId);
      },
    });
  };

  const executeExport = async (type: 'all' | 'inventory' | 'sales' | 'khata', targetId?: string) => {
    setIsSyncing(type);
    setStatusMessage(null);

    try {
      let res: SyncResult;
      if (type === 'all') {
        res = await exportCompleteStoreToGoogleSheet(shop, products, invoices, customers);
      } else if (type === 'inventory') {
        res = await exportInventoryToGoogleSheet(shop, products, targetId);
      } else if (type === 'sales') {
        res = await exportSalesToGoogleSheet(shop, invoices, targetId);
      } else {
        res = await exportKhataToGoogleSheet(shop, customers, targetId);
      }

      setLastSyncResult(res);
      setStatusMessage({
        type: 'success',
        text: `Export successful! Synced ${res.rowsExported} rows to "${res.tabName}".`,
      });
      refreshSpreadsheetsList();
    } catch (err: any) {
      console.error('Export failed:', err);
      setStatusMessage({
        type: 'error',
        text: `Export failed: ${err.message}`,
      });
    } finally {
      setIsSyncing(null);
    }
  };

  // Import from Google Sheet handler
  const handleLoadImportPreview = async () => {
    if (!selectedSpreadsheetId) {
      setStatusMessage({
        type: 'error',
        text: 'Please select a Google Sheet from the dropdown list to import.',
      });
      return;
    }

    setIsSyncing('import');
    try {
      const items = await importProductsFromGoogleSheet(selectedSpreadsheetId, 'Inventory Stock');
      setImportPreview({
        isOpen: true,
        products: items,
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Could not parse Google Sheet for import: ${err.message}`,
      });
    } finally {
      setIsSyncing(null);
    }
  };

  const handleConfirmImport = () => {
    if (!importPreview.products.length) return;

    let updatedCount = 0;
    let addedCount = 0;

    importPreview.products.forEach((parsed) => {
      if (!parsed.name) return;

      const existing = products.find(
        (p) =>
          (parsed.barcode && p.barcode === parsed.barcode) ||
          p.name.toLowerCase() === parsed.name?.toLowerCase()
      );

      if (existing) {
        StorageService.saveProduct({
          ...existing,
          stockQty: parsed.stockQty !== undefined ? parsed.stockQty : existing.stockQty,
          purchasePrice: parsed.purchasePrice !== undefined ? parsed.purchasePrice : existing.purchasePrice,
          sellingPrice: parsed.sellingPrice !== undefined ? parsed.sellingPrice : existing.sellingPrice,
          gstRate: parsed.gstRate !== undefined ? parsed.gstRate : existing.gstRate,
        });
        updatedCount++;
      } else {
        StorageService.saveProduct({
          id: `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          shopId: shop.id,
          name: parsed.name,
          barcode: parsed.barcode || `BC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          category: parsed.category || 'General Fireworks',
          unit: parsed.unit || 'box',
          purchasePrice: parsed.purchasePrice || 0,
          sellingPrice: parsed.sellingPrice || 0,
          mrp: parsed.mrp || (parsed.sellingPrice ? Math.round(parsed.sellingPrice * 1.2) : 0),
          stockQty: parsed.stockQty || 0,
          lowStockThreshold: parsed.lowStockThreshold || 10,
          gstRate: parsed.gstRate || 18,
          active: true,
        });
        addedCount++;
      }
    });

    onRefreshData();
    setImportPreview({ isOpen: false, products: [] });
    setStatusMessage({
      type: 'success',
      text: `Import Completed! ${updatedCount} products updated with new stock/pricing, ${addedCount} new products added to ${shop.name}.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 border border-emerald-800/40 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-full bg-emerald-500/5 -skew-x-12 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Google Workspace Cloud Integration
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                Shop: {shop.name}
              </span>
            </div>

            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <span>Google Sheets™ Live Sync & Cloud Backup</span>
            </h1>

            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Export real-time sales transactions, product inventory, and customer Khata balances directly to Google
              Sheets. Import product catalog edits made in Google Sheets straight back into PANDIT POS with 1-click.
            </p>
          </div>

          {/* Google Auth Status / Button */}
          <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-4 min-w-[280px]">
            {hasAuthToken && googleUser ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  {googleUser.photoURL ? (
                    <img
                      src={googleUser.photoURL}
                      alt={googleUser.displayName || 'Google User'}
                      className="w-10 h-10 rounded-full border border-emerald-500/50"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white text-base">
                      {googleUser.email?.[0].toUpperCase() || 'G'}
                    </div>
                  )}

                  <div className="overflow-hidden">
                    <div className="text-xs font-bold text-white truncate">
                      {googleUser.displayName || 'Google Workspace User'}
                    </div>
                    <div className="text-[11px] text-emerald-400 font-mono truncate">
                      {googleUser.email}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px]">
                  <span className="flex items-center gap-1 text-emerald-400 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Connected to Sheets
                  </span>

                  <button
                    onClick={handleGoogleLogout}
                    className="text-slate-400 hover:text-rose-400 flex items-center gap-1 text-[11px] transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3 h-3" />
                    Disconnect
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-3">
                <div className="text-xs text-slate-300">
                  Connect your Google Account to access your Google Sheets & Drive:
                </div>

                {/* Official Material Google Sign-In Button */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isLoggingIn}
                  className="w-full inline-flex items-center justify-center gap-3 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs rounded-lg shadow-md transition-all active:scale-[0.98] border border-slate-200 cursor-pointer disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 48 48">
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                  </svg>
                  <span>{isLoggingIn ? 'Connecting...' : 'Sign in with Google'}</span>
                </button>

                {authError && (
                  <div className="text-[11px] text-rose-400 bg-rose-950/40 p-2 rounded border border-rose-800">
                    {authError}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : statusMessage.type === 'error'
              ? 'bg-rose-50 text-rose-900 border-rose-200'
              : 'bg-blue-50 text-blue-900 border-blue-200'
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            {statusMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            {statusMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600" />}
            {statusMessage.type === 'info' && <HelpCircle className="w-4 h-4 text-blue-600" />}
            <span>{statusMessage.text}</span>
          </div>

          {lastSyncResult && (
            <a
              href={lastSyncResult.spreadsheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 text-white rounded-lg font-semibold text-xs hover:bg-emerald-700 transition-colors shadow-xs"
            >
              <span>Open in Google Sheets</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      {/* Target Spreadsheet Selector */}
      {hasAuthToken && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-emerald-600" />
                Target Google Spreadsheet
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Choose to export to a brand new sheet or select an existing spreadsheet from your Drive:
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedSpreadsheetId}
                onChange={(e) => setSelectedSpreadsheetId(e.target.value)}
                className="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-lg px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 max-w-xs"
              >
                <option value="">-- Create Brand New Spreadsheet on Export --</option>
                {spreadsheets.map((sheet) => (
                  <option key={sheet.id} value={sheet.id}>
                    {sheet.name} (Updated {new Date(sheet.modifiedTime).toLocaleDateString()})
                  </option>
                ))}
              </select>

              <button
                onClick={refreshSpreadsheetsList}
                disabled={loadingSheets}
                title="Refresh sheets from Drive"
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${loadingSheets ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Action Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* 1. Complete Master Store Backup */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition-all">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Database className="w-5 h-5" />
            </div>

            <div>
              <h3 className="font-bold text-slate-900 text-sm">Full Store Backup (Multi-Tab)</h3>
              <p className="text-xs text-slate-500 mt-1">
                Creates a workbook with 3 tabs: <strong>Inventory Stock</strong>, <strong>Sales & Invoices</strong>, and{' '}
                <strong>Customers Khata</strong>.
              </p>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-[11px] text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span>Products:</span>
                <strong className="text-slate-800">{products.length} items</strong>
              </div>
              <div className="flex justify-between">
                <span>Invoices:</span>
                <strong className="text-slate-800">{invoices.length} bills</strong>
              </div>
              <div className="flex justify-between">
                <span>Khata Customers:</span>
                <strong className="text-slate-800">{customers.length} accounts</strong>
              </div>
            </div>
          </div>

          <button
            onClick={() => handleTriggerExport('all')}
            disabled={!hasAuthToken || isSyncing !== null}
            className="w-full mt-4 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {isSyncing === 'all' ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Exporting All Tabs...</span>
              </>
            ) : (
              <>
                <FileCheck className="w-3.5 h-3.5" />
                <span>Export Master Store Sheet</span>
              </>
            )}
          </button>
        </div>

        {/* 2. Inventory & Stock Export */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition-all">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Package className="w-5 h-5" />
            </div>

            <div>
              <h3 className="font-bold text-slate-900 text-sm">Inventory & Stock Sheet</h3>
              <p className="text-xs text-slate-500 mt-1">
                Exports all product SKUs, barcodes, unit prices, purchase cost, margin %, current stock qty, and low
                stock flags.
              </p>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-[11px] text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span>Active Products:</span>
                <strong className="text-slate-800">{products.filter((p) => p.active).length}</strong>
              </div>
              <div className="flex justify-between">
                <span>Low Stock Items:</span>
                <strong className="text-amber-600">
                  {products.filter((p) => p.stockQty <= p.lowStockThreshold).length}
                </strong>
              </div>
            </div>
          </div>

          <button
            onClick={() => handleTriggerExport('inventory', selectedSpreadsheetId || undefined)}
            disabled={!hasAuthToken || isSyncing !== null}
            className="w-full mt-4 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {isSyncing === 'inventory' ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Exporting Inventory...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export Inventory Sheet</span>
              </>
            )}
          </button>
        </div>

        {/* 3. Sales & Invoices Export */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition-all">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <ShoppingCart className="w-5 h-5" />
            </div>

            <div>
              <h3 className="font-bold text-slate-900 text-sm">Sales & Invoices Register</h3>
              <p className="text-xs text-slate-500 mt-1">
                Detailed transaction log with invoice date, billing amount, GST breakdown, payment method (Cash / UPI /
                Khata), and cashier.
              </p>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-[11px] text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span>Total Invoices:</span>
                <strong className="text-slate-800">{invoices.length} bills</strong>
              </div>
              <div className="flex justify-between">
                <span>Total Revenue:</span>
                <strong className="text-emerald-700">
                  ₹{invoices.reduce((sum, inv) => sum + inv.grandTotal, 0).toLocaleString('en-IN')}
                </strong>
              </div>
            </div>
          </div>

          <button
            onClick={() => handleTriggerExport('sales', selectedSpreadsheetId || undefined)}
            disabled={!hasAuthToken || isSyncing !== null}
            className="w-full mt-4 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {isSyncing === 'sales' ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Exporting Sales...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>Export Sales Register</span>
              </>
            )}
          </button>
        </div>

        {/* 4. Khata & Customers Export */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition-all">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>

            <div>
              <h3 className="font-bold text-slate-900 text-sm">Customer Khata Ledger</h3>
              <p className="text-xs text-slate-500 mt-1">
                Customer contact details, GSTIN, credit limits, outstanding Khata balances, and payment statuses for
                accounting.
              </p>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-[11px] text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span>Total Customers:</span>
                <strong className="text-slate-800">{customers.length}</strong>
              </div>
              <div className="flex justify-between">
                <span>Total Market Due:</span>
                <strong className="text-rose-600">
                  ₹{customers.reduce((sum, c) => sum + (c.khataBalance > 0 ? c.khataBalance : 0), 0).toLocaleString('en-IN')}
                </strong>
              </div>
            </div>
          </div>

          <button
            onClick={() => handleTriggerExport('khata', selectedSpreadsheetId || undefined)}
            disabled={!hasAuthToken || isSyncing !== null}
            className="w-full mt-4 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {isSyncing === 'khata' ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Exporting Khata...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 text-purple-400" />
                <span>Export Khata Ledger</span>
              </>
            )}
          </button>
        </div>

        {/* 5. Import Stock / Prices from Google Sheet */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition-all md:col-span-2">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
              <Upload className="w-5 h-5" />
            </div>

            <div>
              <h3 className="font-bold text-slate-900 text-sm">Import & Update Catalog from Google Sheet</h3>
              <p className="text-xs text-slate-500 mt-1">
                Have you updated prices, stock quantities, or added new fireworks in Google Sheets? Select the sheet
                above and click preview to sync the changes directly into PANDIT POS.
              </p>
            </div>

            <div className="bg-amber-50/70 border border-amber-200/80 rounded-lg p-3 text-xs text-amber-800">
              <strong>How it works:</strong> The importer matches items by Barcode or Product Name. If an item matches, its
              stock quantity and selling price will be updated. If it’s a new barcode, it will be added to your inventory.
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleLoadImportPreview}
              disabled={!hasAuthToken || !selectedSpreadsheetId || isSyncing !== null}
              className="py-2.5 px-5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSyncing === 'import' ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Reading Sheet...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>Preview & Import from Selected Sheet</span>
                </>
              )}
            </button>

            {!selectedSpreadsheetId && (
              <span className="text-[11px] text-slate-500 italic">
                * Select a target spreadsheet above first
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Mandatory User Confirmation Dialog (Compliance with Workspace integration skill) */}
      {confirmDialog && confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">{confirmDialog.title}</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">{confirmDialog.description}</p>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                {confirmDialog.confirmButtonText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Preview Modal */}
      {importPreview.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  Google Sheet Import Preview ({importPreview.products.length} Products Detected)
                </h3>
              </div>
              <button
                onClick={() => setImportPreview({ isOpen: false, products: [] })}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Review the products parsed from your Google Sheet below before applying them to{' '}
              <strong>{shop.name}</strong>. Existing items with matching barcodes or names will have their stock and
              prices updated.
            </p>

            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">Barcode</th>
                    <th className="py-2.5 px-3">Product Name</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-right">Purchase Price</th>
                    <th className="py-2.5 px-3 text-right">Selling Price</th>
                    <th className="py-2.5 px-3 text-right">Stock Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {importPreview.products.slice(0, 50).map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 px-3 text-slate-600">{item.barcode}</td>
                      <td className="py-2 px-3 font-sans font-medium text-slate-900">{item.name}</td>
                      <td className="py-2 px-3 text-slate-600">{item.category}</td>
                      <td className="py-2 px-3 text-right text-slate-700">₹{item.purchasePrice}</td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-700">₹{item.sellingPrice}</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">{item.stockQty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {importPreview.products.length > 50 && (
                <div className="py-2 px-3 text-center text-xs text-slate-400 bg-slate-50">
                  ...and {importPreview.products.length - 50} more products
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Ready to sync into <strong>{shop.name}</strong> database
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setImportPreview({ isOpen: false, products: [] })}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  Confirm & Apply to POS Inventory
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
