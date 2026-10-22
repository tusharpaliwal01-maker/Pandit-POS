import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Tag,
  Users,
  FileText,
  BarChart3,
  UserCheck,
  Settings,
  ShieldAlert,
  Menu,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Store,
  LogOut,
  Scan,
  Printer,
  ChevronDown,
  User as UserIcon,
  AlertTriangle,
  Keyboard,
  FileSpreadsheet,
  Camera,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { Shop, User, Product, Customer, Invoice, GoogleSyncStatus } from './types';
import { StorageService } from './services/storage';

// Views
import { DashboardView } from './views/DashboardView';
import { PosBillingView } from './views/PosBillingView';
import { InventoryView } from './views/InventoryView';
import { BarcodeLabelsView } from './views/BarcodeLabelsView';
import { CustomersKhataView } from './views/CustomersKhataView';
import { InvoicesView } from './views/InvoicesView';
import { ReportsView } from './views/ReportsView';
import { StaffView } from './views/StaffView';
import { SettingsView } from './views/SettingsView';
import { SupermasterView } from './views/SupermasterView';
import { SupplierBillOcrView } from './views/SupplierBillOcrView';
import { GoogleSheetsView } from './views/GoogleSheetsView';

// Auth & Modals
import { LoginView } from './components/auth/LoginView';
import { KeyboardShortcutsModal } from './components/common/KeyboardShortcutsModal';
import { GeminiAssistantModal } from './components/assistant/GeminiAssistantModal';
import { ReceiptModal } from './components/hardware/ReceiptModal';
import { ScannerTestModal } from './components/hardware/ScannerTestModal';
import { CameraScannerModal } from './components/hardware/CameraScannerModal';
import { PrinterTestModal } from './components/hardware/PrinterTestModal';
import { initRealtimeInventoryAutoSync } from './services/googleSheetsService';
import { initFirebaseAutoSync } from './services/firebaseSync';

export default function App() {
  // Initialize relational storage
  useEffect(() => {
    StorageService.init();
  }, []);

  const [shops, setShops] = useState<Shop[]>(() => StorageService.getShops());
  const [currentShop, setCurrentShop] = useState<Shop>(() => {
    const session = StorageService.getCurrentSession();
    return session?.shop || StorageService.getShops()[0];
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const session = StorageService.getCurrentSession();
    return session?.user || null;
  });

  // Global Keyboard Shortcuts Cheat Sheet modal
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);

  // Global keydown listeners for cashier shortcuts (F4 to start POS, F1 / ? for cheat sheet)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F4') {
        e.preventDefault();
        setActiveTab('pos');
      } else if (
        e.key === 'F1' ||
        (e.key === '?' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName))
      ) {
        e.preventDefault();
        setIsShortcutsModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const handleLogout = () => {
    StorageService.clearSession();
    setCurrentUser(null);
  };

  // Data scoped by current shop
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Navigation State
  const [activeTab, setActiveTab] = useState<string>('pos');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isShopDropdownOpen, setIsShopDropdownOpen] = useState(false);

  // Global Modals
  const [isGeminiChatOpen, setIsGeminiChatOpen] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [isScannerTestOpen, setIsScannerTestOpen] = useState(false);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [isPrinterTestOpen, setIsPrinterTestOpen] = useState(false);
  const [isLowStockPopoverOpen, setIsLowStockPopoverOpen] = useState(false);
  const [inventoryFilterLowStock, setInventoryFilterLowStock] = useState(false);

  // Google Sheets Live Sync Status state
  const [googleSyncStatus, setGoogleSyncStatus] = useState<GoogleSyncStatus>(() =>
    StorageService.getGoogleSyncStatus()
  );
  const [isSyncPopoverOpen, setIsSyncPopoverOpen] = useState(false);
  const [isSyncWarningDismissed, setIsSyncWarningDismissed] = useState(false);
  const [autoSyncToast, setAutoSyncToast] = useState<{
    message: string;
    spreadsheetUrl?: string;
    spreadsheetName?: string;
  } | null>(null);

  // Initialize background real-time auto-sync to connected Google Sheet and Firebase Firestore
  useEffect(() => {
    const unsubscribeAutoSync = initRealtimeInventoryAutoSync();
    const unsubscribeFirebase = initFirebaseAutoSync();

    const handleAutoSynced = (e: any) => {
      const detail = e.detail;
      const label = detail?.productName
        ? `Auto-synced "${detail.productName}" to Google Sheets`
        : `Auto-synced ${detail?.rowsCount || 'catalog'} items to Google Sheets`;
      setAutoSyncToast({
        message: label,
        spreadsheetUrl: detail?.spreadsheetUrl,
        spreadsheetName: detail?.spreadsheetName,
      });
      setTimeout(() => {
        setAutoSyncToast((prev) => (prev?.message === label ? null : prev));
      }, 4500);
    };

    window.addEventListener('google-sheet-auto-synced', handleAutoSynced);

    return () => {
      unsubscribeAutoSync();
      unsubscribeFirebase();
      window.removeEventListener('google-sheet-auto-synced', handleAutoSynced);
    };
  }, []);

  useEffect(() => {
    const handleSyncStatusEvent = () => {
      setGoogleSyncStatus(StorageService.getGoogleSyncStatus());
    };
    window.addEventListener('google-sync-status-changed', handleSyncStatusEvent);
    const interval = setInterval(() => {
      setGoogleSyncStatus(StorageService.getGoogleSyncStatus());
    }, 30000);
    return () => {
      window.removeEventListener('google-sync-status-changed', handleSyncStatusEvent);
      clearInterval(interval);
    };
  }, []);

  const isSyncOverdueOrFailed = StorageService.isSyncOverdue(24);

  const getRelativeSyncTime = (timestamp?: string) => {
    if (!timestamp) return 'Never';
    const time = new Date(timestamp).getTime();
    if (isNaN(time)) return 'Never';
    const diffSeconds = Math.max(0, Math.floor((Date.now() - time) / 1000));
    if (diffSeconds < 60) return 'Just now';
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  // Load shop data
  const refreshShopData = () => {
    setShops(StorageService.getShops());
    const liveShop = StorageService.getShopById(currentShop.id) || StorageService.getShops()[0];
    setCurrentShop(liveShop);

    setProducts(StorageService.getProducts(liveShop.id));
    setCustomers(StorageService.getCustomers(liveShop.id));
    setInvoices(StorageService.getInvoices(liveShop.id));
    setUsers(StorageService.getUsers(liveShop.id));
  };

  useEffect(() => {
    refreshShopData();
  }, [currentShop.id]);

  // Low stock products calculation for persistent notification badge
  const lowStockProducts = products.filter(
    (p) => p.active && p.stockQty <= p.lowStockThreshold
  );
  const lowStockCount = lowStockProducts.length;

  // Handle switching active shop context
  const handleSelectShop = (shop: Shop) => {
    setCurrentShop(shop);
    if (currentUser) {
      StorageService.setCurrentSession(currentUser, shop);
    }
    setIsShopDropdownOpen(false);
  };

  // If no active session exists, display full authentication screen
  if (!currentUser) {
    return (
      <LoginView
        onLoginSuccess={(user, shop) => {
          setCurrentUser(user);
          setCurrentShop(shop);
          refreshShopData();
        }}
      />
    );
  }

  // Navigation items based on role
  const isSupermaster = currentUser.role === 'SUPERMASTER';
  const isAdmin = currentUser.role === 'ADMIN' || isSupermaster;
  const isStaff = currentUser.role === 'STAFF';

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, role: 'ADMIN' },
    { id: 'pos', label: 'POS Billing', icon: ShoppingCart, role: 'STAFF' },
    { id: 'inventory', label: 'Inventory & Stock', icon: Package, role: 'ADMIN' },
    { id: 'ocr-bills', label: 'Supplier Bill OCR', icon: Sparkles, role: 'ADMIN' },
    { id: 'barcode-labels', label: 'Barcode Labels', icon: Tag, role: 'ADMIN' },
    { id: 'customers', label: 'Customers & Khata', icon: Users, role: 'STAFF' },
    { id: 'invoices', label: 'Invoices & Sales', icon: FileText, role: 'ADMIN' },
    { id: 'reports', label: 'Reports & GST', icon: BarChart3, role: 'ADMIN' },
    { id: 'google-sheets', label: 'Google Sheets™', icon: FileSpreadsheet, role: 'STAFF' },
    { id: 'staff', label: 'Staff Management', icon: UserCheck, role: 'ADMIN' },
    { id: 'settings', label: 'Shop Settings', icon: Settings, role: 'ADMIN' },
  ];

  if (isSupermaster) {
    navItems.push({
      id: 'supermaster',
      label: 'Supermaster Shops',
      icon: ShieldAlert,
      role: 'SUPERMASTER',
    });
  }

  const visibleNavItems = navItems.filter((item) => {
    if (item.role === 'STAFF') return true;
    if (item.role === 'ADMIN') return isAdmin;
    if (item.role === 'SUPERMASTER') return isSupermaster;
    return false;
  });

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans antialiased text-slate-900 selection:bg-orange-500 selection:text-white">
      {/* Top Application Bar */}
      <header className="h-14 bg-slate-900 text-white border-b border-slate-800 px-4 flex items-center justify-between gap-4 sticky top-0 z-40 select-none">
        {/* Brand & Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-orange-600 rounded-lg flex items-center justify-center font-bold text-white text-sm shadow-xs">
              P
            </div>
            <span className="font-bold tracking-tight text-base whitespace-nowrap">
              PANDIT POS
            </span>
          </div>

          {/* Shop Switcher */}
          <div className="relative ml-2 hidden sm:block">
            <button
              onClick={() => setIsShopDropdownOpen(!isShopDropdownOpen)}
              className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-medium text-slate-200 transition-colors"
            >
              <Store className="w-3.5 h-3.5 text-orange-400" />
              <span className="truncate max-w-[180px]">{currentShop.name}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isShopDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-xl py-1 text-xs z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Select Active Shop
                </div>
                {shops.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleSelectShop(s)}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between transition-colors ${
                      s.id === currentShop.id
                        ? 'bg-orange-600/20 text-orange-400 font-bold'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="truncate">{s.name}</span>
                    <span className="font-mono text-[10px] text-slate-500">{s.code}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center / Right Controls */}
        <div className="flex items-center gap-2.5">
          {/* Persistent Low Stock Notification Badge */}
          {lowStockCount > 0 && (
            <div className="relative">
              <button
                onClick={() => setIsLowStockPopoverOpen(!isLowStockPopoverOpen)}
                title={`${lowStockCount} products are below the minimum stock alert threshold`}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 rounded-lg text-xs font-semibold transition-all active:scale-95 cursor-pointer shadow-xs"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
                <span className="font-mono font-bold text-amber-200">{lowStockCount}</span>
                <span className="hidden sm:inline font-sans text-[11px] text-amber-300">
                  Low Stock
                </span>
              </button>

              {/* Low Stock Popover / Quick Restock List */}
              {isLowStockPopoverOpen && (
                <div className="absolute right-0 sm:left-0 top-full mt-2 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-2 text-xs z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3.5 py-2 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-amber-400 text-xs uppercase tracking-wider">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Low Stock Alert ({lowStockCount})</span>
                    </div>
                    <button
                      onClick={() => setIsLowStockPopoverOpen(false)}
                      className="text-slate-400 hover:text-white p-0.5 text-sm"
                    >
                      &times;
                    </button>
                  </div>

                  <div className="divide-y divide-slate-800/80 max-h-56 overflow-y-auto px-1 py-1">
                    {lowStockProducts.map((p) => {
                      const isOut = p.stockQty <= 0;
                      return (
                        <div
                          key={p.id}
                          className="px-3 py-2 flex items-center justify-between text-xs hover:bg-slate-800/60 rounded-lg transition-colors"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="font-semibold text-slate-200 truncate">{p.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Min Threshold: {p.lowStockThreshold} {p.unit}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span
                              className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                                isOut
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {p.stockQty} {p.unit}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-2 border-t border-slate-800 flex gap-2">
                    <button
                      onClick={() => {
                        setInventoryFilterLowStock(true);
                        setActiveTab('inventory');
                        setIsLowStockPopoverOpen(false);
                      }}
                      className="flex-1 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold text-center transition-colors"
                    >
                      Open in Inventory
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('ocr-bills');
                        setIsLowStockPopoverOpen(false);
                      }}
                      className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium text-center transition-colors"
                    >
                      OCR Restock
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Hardware shortcuts */}
          <button
            onClick={() => setIsScannerTestOpen(true)}
            title="Handheld Barcode Gun Test"
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors hidden md:flex items-center gap-1.5 text-xs cursor-pointer"
          >
            <Scan className="w-4 h-4 text-orange-400" />
            <span className="text-slate-300">Scanner</span>
          </button>

          <button
            onClick={() => setIsCameraScannerOpen(true)}
            title="Optical Camera Barcode Reader"
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors hidden sm:flex items-center gap-1.5 text-xs cursor-pointer"
          >
            <Camera className="w-4 h-4 text-blue-400" />
            <span className="text-slate-200 font-medium">Camera Scan</span>
          </button>

          <button
            onClick={() => setIsPrinterTestOpen(true)}
            title="RETSOL RTP82 & TSC TE244 Hardware Printer Station"
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors hidden md:flex items-center gap-1.5 text-xs"
          >
            <Printer className="w-4 h-4 text-orange-400" />
            <span className="text-slate-200 font-medium">Printers (RETSOL / TSC)</span>
          </button>

          {/* Google Sheets Live Sync Visual Indicator & Popover */}
          <div className="relative">
            <button
              onClick={() => setIsSyncPopoverOpen(!isSyncPopoverOpen)}
              title="Google Sheets Cloud Sync Status. Click for details & quick sync."
              className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer border ${
                googleSyncStatus.lastSyncStatus === 'FAILED'
                  ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border-rose-500/50'
                  : isSyncOverdueOrFailed
                  ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/50'
                  : googleSyncStatus.lastSyncStatus === 'SUCCESS'
                  ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              <FileSpreadsheet
                className={`w-3.5 h-3.5 shrink-0 ${
                  googleSyncStatus.lastSyncStatus === 'SUCCESS'
                    ? 'text-emerald-400'
                    : googleSyncStatus.lastSyncStatus === 'FAILED'
                    ? 'text-rose-400'
                    : isSyncOverdueOrFailed
                    ? 'text-amber-400'
                    : 'text-slate-400'
                }`}
              />

              {/* Pulsing Status Dot */}
              <span className="relative flex h-2 w-2 shrink-0">
                {googleSyncStatus.lastSyncStatus === 'SUCCESS' && !isSyncOverdueOrFailed && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                {(googleSyncStatus.lastSyncStatus === 'FAILED' || isSyncOverdueOrFailed) && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    googleSyncStatus.lastSyncStatus === 'SUCCESS' && !isSyncOverdueOrFailed
                      ? 'bg-emerald-500'
                      : googleSyncStatus.lastSyncStatus === 'FAILED'
                      ? 'bg-rose-500'
                      : isSyncOverdueOrFailed
                      ? 'bg-amber-500'
                      : 'bg-slate-500'
                  }`}
                ></span>
              </span>

              <span className="hidden lg:inline font-mono text-[11px]">
                {googleSyncStatus.lastSyncStatus === 'SUCCESS'
                  ? `Sheets: ${getRelativeSyncTime(googleSyncStatus.lastSyncTimestamp)}`
                  : googleSyncStatus.lastSyncStatus === 'FAILED'
                  ? 'Sheets: Failed'
                  : isSyncOverdueOrFailed
                  ? 'Sheets: Overdue (>24h)'
                  : 'Sheets: Not Synced'}
              </span>
            </button>

            {/* Sync Status Popover */}
            {isSyncPopoverOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4 text-xs z-50 animate-in fade-in zoom-in-95 duration-100 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-1.5 font-bold text-slate-200">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <span>Google Sheets Sync Status</span>
                  </div>
                  <button
                    onClick={() => setIsSyncPopoverOpen(false)}
                    className="text-slate-400 hover:text-white p-0.5 text-sm"
                  >
                    &times;
                  </button>
                </div>

                <div className="space-y-2 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Current Status:</span>
                    <span
                      className={`font-semibold px-2 py-0.5 rounded text-[10px] border ${
                        googleSyncStatus.lastSyncStatus === 'SUCCESS' && !isSyncOverdueOrFailed
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : googleSyncStatus.lastSyncStatus === 'FAILED'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                          : isSyncOverdueOrFailed
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {googleSyncStatus.lastSyncStatus === 'SUCCESS' && !isSyncOverdueOrFailed
                        ? 'HEALTHY (ACTIVE)'
                        : googleSyncStatus.lastSyncStatus === 'FAILED'
                        ? 'SYNC FAILED'
                        : isSyncOverdueOrFailed
                        ? 'SYNC OVERDUE (>24H)'
                        : 'NOT SYNCED'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Last Sync Time:</span>
                    <span className="text-slate-200 font-mono font-medium">
                      {googleSyncStatus.lastSyncTimestamp
                        ? new Date(googleSyncStatus.lastSyncTimestamp).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })
                        : 'Never synced'}
                    </span>
                  </div>

                  {googleSyncStatus.lastSyncRowsCount !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Rows Synced:</span>
                      <span className="text-slate-200 font-mono font-medium">
                        {googleSyncStatus.lastSyncRowsCount} rows
                      </span>
                    </div>
                  )}

                  {googleSyncStatus.lastSyncSpreadsheetName && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Target Sheet:</span>
                      <span className="text-slate-200 font-medium truncate max-w-[150px]">
                        {googleSyncStatus.lastSyncSpreadsheetName}
                      </span>
                    </div>
                  )}

                  {googleSyncStatus.lastError && (
                    <div className="p-2 bg-rose-950/60 border border-rose-800/80 rounded-lg text-rose-300 text-[10px]">
                      <strong>Error:</strong> {googleSyncStatus.lastError}
                    </div>
                  )}

                  {isSyncOverdueOrFailed && (
                    <div className="p-2 bg-amber-950/50 border border-amber-800/70 rounded-lg text-amber-300 text-[10px]">
                      ⚠️ <strong>Sync Warning:</strong> Last sync was over 24 hours ago (or failed). Keep your store records synced with cloud spreadsheets.
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
                  <button
                    onClick={() => {
                      setActiveTab('google-sheets');
                      setIsSyncPopoverOpen(false);
                    }}
                    className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Sync Google Sheets Now</span>
                  </button>

                  {googleSyncStatus.lastSyncSpreadsheetUrl && (
                    <a
                      href={googleSyncStatus.lastSyncSpreadsheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors"
                      title="Open Google Sheet in new tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Keyboard Shortcuts Trigger Button */}
          <button
            onClick={() => setIsShortcutsModalOpen(true)}
            title="Cashier Keyboard Shortcuts Cheat Sheet (F1, F2, F3, F4)"
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors hidden sm:flex items-center gap-1.5 text-xs cursor-pointer"
          >
            <Keyboard className="w-4 h-4 text-orange-400" />
            <span className="text-slate-200 font-medium">Shortcuts</span>
          </button>

          {/* Gemini AI Retail Assistant Launcher */}
          <button
            onClick={() => setIsGeminiChatOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ask Pandit AI</span>
          </button>

          {/* Individual Authenticated User Profile (No Role Switching Allowed) */}
          <div className="flex items-center gap-2 pl-2 pr-3 py-1 bg-slate-800/90 border border-slate-700/80 rounded-xl text-xs text-slate-200 shadow-xs select-none">
            <div className="w-7 h-7 rounded-lg bg-orange-600/30 border border-orange-500/30 text-orange-400 flex items-center justify-center font-bold text-xs shrink-0">
              {currentUser.username[0].toUpperCase()}
            </div>
            <div className="text-left hidden sm:block">
              <div className="flex items-center gap-1.5 leading-tight">
                <span className="text-xs font-bold text-white truncate max-w-[140px]">
                  {currentUser.fullName}
                </span>
                <span
                  className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                    currentUser.role === 'SUPERMASTER'
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                      : currentUser.role === 'ADMIN'
                      ? 'bg-orange-500/20 text-orange-300 border-orange-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  }`}
                >
                  {currentUser.role}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono leading-none mt-0.5">
                @{currentUser.username}
              </div>
            </div>
          </div>

          {/* Prominent Individual Sign-Out / Logout Button */}
          <button
            onClick={handleLogout}
            title="Sign out of your individual account"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 hover:border-rose-600 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* 24-Hour Google Sheets Sync Overdue / Failed Alert Toast */}
      {isSyncOverdueOrFailed && !isSyncWarningDismissed && (
        <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 border-b border-amber-500/40 px-4 py-2 text-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-md animate-in slide-in-from-top-2 duration-150 shrink-0">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
            <div>
              <span className="font-bold text-amber-300">
                {googleSyncStatus.lastSyncStatus === 'FAILED'
                  ? 'Google Sheets Sync Failed: '
                  : 'Google Sheets Sync Overdue (>24 Hours): '}
              </span>
              <span className="text-slate-300 text-[11px]">
                {googleSyncStatus.lastSyncStatus === 'FAILED'
                  ? googleSyncStatus.lastError || 'Last sync encountered an error. Please re-authenticate or check sheet permissions.'
                  : googleSyncStatus.lastSyncTimestamp
                  ? `Your last cloud sync was ${getRelativeSyncTime(googleSyncStatus.lastSyncTimestamp)}. Keep your store records synced with cloud spreadsheets.`
                  : 'Store data has not been synced to Google Sheets yet. Sync now to enable cloud backups.'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              onClick={() => {
                setActiveTab('google-sheets');
                setIsSyncWarningDismissed(true);
              }}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-[11px] transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
            >
              <span>Sync Sheets Now</span>
              <ArrowRight className="w-3 h-3" />
            </button>
            <button
              onClick={() => setIsSyncWarningDismissed(true)}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="Dismiss warning"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Collapsible Sidebar */}
        <aside
          className={`bg-slate-900 text-slate-300 border-r border-slate-800 transition-all duration-200 shrink-0 flex flex-col justify-between ${
            sidebarCollapsed ? 'w-16' : 'w-60'
          }`}
        >
          {/* Navigation Links */}
          <nav className="p-2 space-y-1 overflow-y-auto">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors group relative ${
                    isActive
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
                  {!sidebarCollapsed && <span className="truncate">{item.label}</span>}

                  {sidebarCollapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-white text-xs rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50">
                      {item.label}
                    </div>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Sidebar Footer info */}
          <div className="p-3 border-t border-slate-800 text-xs">
            {!sidebarCollapsed ? (
              <div className="space-y-1.5">
                <div className="text-[11px] text-slate-400 truncate">
                  Logged in as <strong className="text-slate-200">{currentUser.fullName}</strong>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>Role: {currentUser.role}</span>
                  <span className="text-emerald-500">Online</span>
                </div>

                {/* Keyboard Shortcuts Trigger Button */}
                <button
                  onClick={() => setIsShortcutsModalOpen(true)}
                  className="w-full mt-2 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Keyboard className="w-3.5 h-3.5 text-orange-400" />
                  <span>Shortcuts (F2, F3, F4)</span>
                </button>
              </div>
            ) : (
              <div className="text-center">
                <button
                  onClick={() => setIsShortcutsModalOpen(true)}
                  title="Keyboard Shortcuts (F1, F2, F3, F4)"
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg mx-auto block cursor-pointer"
                >
                  <Keyboard className="w-4 h-4 text-orange-400" />
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-100">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && (
              <DashboardView
                shop={currentShop}
                invoices={invoices}
                products={products}
                customers={customers}
                onNavigate={setActiveTab}
                onOpenReceipt={setPreviewInvoice}
              />
            )}

            {activeTab === 'pos' && (
              <PosBillingView
                shop={currentShop}
                products={products}
                customers={customers}
                cashierName={currentUser.fullName}
                userId={currentUser.id}
                onRefreshData={refreshShopData}
              />
            )}

            {activeTab === 'inventory' && (
              <InventoryView
                shop={currentShop}
                products={products}
                onRefreshData={refreshShopData}
                onNavigateToLabels={() => setActiveTab('barcode-labels')}
                onNavigateToSheets={() => setActiveTab('google-sheets')}
                initialOnlyLowStock={inventoryFilterLowStock}
              />
            )}

            {activeTab === 'ocr-bills' && (
              <SupplierBillOcrView
                shop={currentShop}
                products={products}
                onRefreshData={refreshShopData}
              />
            )}

            {activeTab === 'barcode-labels' && (
              <BarcodeLabelsView products={products} shop={currentShop} />
            )}

            {activeTab === 'customers' && (
              <CustomersKhataView
                shop={currentShop}
                customers={customers}
                invoices={invoices}
                onRefreshData={refreshShopData}
              />
            )}

            {activeTab === 'invoices' && (
              <InvoicesView shop={currentShop} invoices={invoices} />
            )}

            {activeTab === 'reports' && (
              <ReportsView
                shop={currentShop}
                invoices={invoices}
                products={products}
                customers={customers}
                onNavigateToSheets={() => setActiveTab('google-sheets')}
              />
            )}

            {activeTab === 'google-sheets' && (
              <GoogleSheetsView
                shop={currentShop}
                products={products}
                invoices={invoices}
                customers={customers}
                onRefreshData={refreshShopData}
              />
            )}

            {activeTab === 'staff' && (
              <StaffView
                shop={currentShop}
                users={users}
                currentUserId={currentUser.id}
                onRefreshData={refreshShopData}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsView shop={currentShop} onRefreshData={refreshShopData} />
            )}

            {activeTab === 'supermaster' && (
              <SupermasterView
                currentShop={currentShop}
                shops={shops}
                onSelectShop={handleSelectShop}
                onRefreshData={refreshShopData}
              />
            )}
          </div>
        </main>
      </div>

      {/* Global Modals */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
        onTriggerAction={(action) => {
          if (['pos', 'checkout', 'search', 'clear', 'customer'].includes(action)) {
            setActiveTab('pos');
          }
        }}
      />

      <GeminiAssistantModal
        isOpen={isGeminiChatOpen}
        onClose={() => setIsGeminiChatOpen(false)}
        shop={currentShop}
        products={products}
        customers={customers}
      />

      <ReceiptModal
        isOpen={!!previewInvoice}
        onClose={() => setPreviewInvoice(null)}
        invoice={previewInvoice}
        shop={currentShop}
      />

      <ScannerTestModal
        isOpen={isScannerTestOpen}
        onClose={() => setIsScannerTestOpen(false)}
        onOpenLiveCamera={() => {
          setIsScannerTestOpen(false);
          setIsCameraScannerOpen(true);
        }}
      />

      <CameraScannerModal
        isOpen={isCameraScannerOpen}
        onClose={() => setIsCameraScannerOpen(false)}
        onScan={(barcode) => {
          setIsCameraScannerOpen(false);
          setActiveTab('pos');
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('global-barcode-scan', { detail: barcode }));
          }, 150);
        }}
      />

      <PrinterTestModal
        isOpen={isPrinterTestOpen}
        onClose={() => setIsPrinterTestOpen(false)}
        shop={currentShop}
      />
    </div>
  );
}
