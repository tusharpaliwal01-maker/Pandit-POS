import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Scan,
  Camera,
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Banknote,
  BookOpen,
  User,
  Printer,
  Sparkles,
  Zap,
  Lock,
  Flame,
  ArrowRight,
  Phone,
  RotateCcw,
} from 'lucide-react';
import { Product, Customer, CartItem, Shop, PaymentMethod, Invoice } from '../types';
import { StorageService } from '../services/storage';
import { useBarcodeScanner, sanitizeBarcode } from '../hooks/useBarcodeScanner';
import { CustomerSelectModal } from '../components/pos/CustomerSelectModal';
import { ScannerTestModal } from '../components/hardware/ScannerTestModal';
import { CameraScannerModal } from '../components/hardware/CameraScannerModal';
import { PrinterTestModal } from '../components/hardware/PrinterTestModal';
import { ReceiptModal } from '../components/hardware/ReceiptModal';
import { hardwarePrinterManager } from '../utils/hardwarePrinters';
import { QuantityInput } from '../components/common/QuantityInput';
import { playBarcodeBeep, playErrorBeep, playSuccessChime } from '../utils/soundHelper';

interface PosBillingViewProps {
  shop: Shop;
  products: Product[];
  customers: Customer[];
  cashierName: string;
  userId: string;
  onRefreshData: () => void;
}

// Memoized Product Card for ultra-fast catalog rendering without re-render lag
const ProductCard = React.memo<{
  product: Product;
  multiplier: number;
  onAddToCart: (p: Product, qty: number) => void;
}>(({ product, multiplier, onAddToCart }) => {
  const isLowStock = product.stockQty <= product.lowStockThreshold;
  const isOutOfStock = product.stockQty <= 0;

  return (
    <div
      onClick={() => onAddToCart(product, multiplier)}
      className={`bg-white rounded-xl border p-3 flex flex-col justify-between transition-all cursor-pointer select-none active:scale-[0.98] ${
        isOutOfStock
          ? 'opacity-60 bg-slate-50 border-slate-200'
          : 'hover:border-orange-400 hover:shadow-xs border-slate-200'
      }`}
    >
      <div>
        <div className="flex items-start justify-between gap-1 mb-1">
          <span className="text-[10px] text-slate-400 font-mono truncate">{product.barcode}</span>
          <span
            className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
              isOutOfStock
                ? 'bg-rose-100 text-rose-700 font-bold'
                : isLowStock
                ? 'bg-amber-100 text-amber-800 font-bold'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {isOutOfStock ? '0 left' : `${product.stockQty} ${product.unit}`}
          </span>
        </div>

        <h4 className="font-semibold text-slate-900 text-xs leading-snug line-clamp-2">
          {product.name}
        </h4>
      </div>

      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
        <div>
          {product.mrp > product.sellingPrice && (
            <div className="text-[10px] text-slate-400 line-through">₹{product.mrp}</div>
          )}
          <div className="text-sm font-bold text-slate-900 font-mono">₹{product.sellingPrice}</div>
        </div>
        <button
          disabled={isOutOfStock}
          className="w-7 h-7 flex items-center justify-center bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 text-white rounded-lg transition-colors font-bold text-xs"
          title={`Add ${multiplier}x`}
        >
          {multiplier > 1 ? `+${multiplier}` : <Plus className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
});

export const PosBillingView: React.FC<PosBillingViewProps> = ({
  shop,
  products,
  customers,
  cashierName,
  userId,
  onRefreshData,
}) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | undefined>();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [saleNotes, setSaleNotes] = useState<string>('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Speed-Billing States
  const [multiplier, setMultiplier] = useState<number>(1);
  const [scannerLock, setScannerLock] = useState<boolean>(true);
  const [customerPhoneQuickInput, setCustomerPhoneQuickInput] = useState<string>('');

  // Modals
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isScannerTestOpen, setIsScannerTestOpen] = useState(false);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [isPrinterTestOpen, setIsPrinterTestOpen] = useState(false);
  const [completedInvoice, setCompletedInvoice] = useState<Invoice | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement | null>(null);
  const lastScanRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 2500);
  };

  // Auto-refocus scanner helper to ensure cashier never has to reach for mouse
  const refocusScanner = useCallback(() => {
    if (scannerLock) {
      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 40);
    }
  }, [scannerLock]);

  // Add item to cart helper (optimized for instant execution)
  const addToCart = useCallback((product: Product, qty: number = 1) => {
    if (product.stockQty <= 0) {
      playErrorBeep();
      showNotification('error', `"${product.name}" is OUT OF STOCK.`);
      return;
    }

    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.product.id === product.id);
      if (existingIndex >= 0) {
        const item = prev[existingIndex];
        const newQty = item.quantity + qty;
        if (newQty > product.stockQty) {
          playErrorBeep();
          showNotification('error', `Cannot add more. Available stock for "${product.name}" is ${product.stockQty}.`);
          return prev;
        }
        playBarcodeBeep();
        const updated = [...prev];
        const lineTotal = item.finalUnitPrice * newQty;
        updated[existingIndex] = {
          ...item,
          quantity: newQty,
          lineTotal: Math.round(lineTotal * 100) / 100,
        };
        return updated;
      } else {
        if (qty > product.stockQty) {
          playErrorBeep();
          showNotification('error', `Cannot add ${qty}. Available stock is ${product.stockQty}.`);
          return prev;
        }
        playBarcodeBeep();
        const unitDiscount = 0;
        const finalUnitPrice = product.sellingPrice - unitDiscount;
        const lineTotal = finalUnitPrice * qty;
        const gstRate = product.gstRate || 18;
        const taxBase = lineTotal / (1 + gstRate / 100);
        const gstAmount = lineTotal - taxBase;

        return [
          ...prev,
          {
            product,
            quantity: qty,
            unitDiscount,
            finalUnitPrice,
            gstAmount: Math.round(gstAmount * 100) / 100,
            lineTotal: Math.round(lineTotal * 100) / 100,
          },
        ];
      }
    });

    refocusScanner();
  }, [refocusScanner]);

  // Handle scanned barcode (from hardware gun, keyboard wedge, camera, or manual input)
  // Supports multiplier prefixes like "5*890123..." or "10*CHAKRI"
  const handleBarcodeScanned = useCallback((scannedCode: string) => {
    const rawCode = sanitizeBarcode(scannedCode);
    if (!rawCode) return;

    // Check for quantity prefix multiplier in barcode scan e.g. "5*890123"
    let effectiveQty = multiplier;
    let lookupCode = rawCode;
    if (rawCode.includes('*')) {
      const parts = rawCode.split('*');
      const parsedQ = parseInt(parts[0], 10);
      if (!isNaN(parsedQ) && parsedQ > 0 && parts[1]) {
        effectiveQty = parsedQ;
        lookupCode = parts[1].trim();
      }
    }

    // Rapid-scan duplicate prevention window (350ms - 400ms debounce)
    const now = Date.now();
    const RAPID_SCAN_DEBOUNCE_MS = 350;
    if (
      now - lastScanRef.current.time < RAPID_SCAN_DEBOUNCE_MS &&
      lastScanRef.current.code.toLowerCase() === lookupCode.toLowerCase()
    ) {
      return;
    }
    lastScanRef.current = { code: lookupCode, time: now };

    const lower = lookupCode.toLowerCase();
    const noLeadingZeros = lookupCode.replace(/^0+/, '');

    // 1. Direct exact barcode match
    let matched = products.find(
      (p) => p.active && p.barcode.trim().toLowerCase() === lower
    );

    // 2. Normalized leading zeros match (e.g. 12-digit UPC padded to 13-digit EAN)
    if (!matched && noLeadingZeros) {
      matched = products.find(
        (p) => p.active && p.barcode.trim().replace(/^0+/, '') === noLeadingZeros
      );
    }

    // 3. Match by Product ID / SKU
    if (!matched) {
      matched = products.find((p) => p.active && p.id.toLowerCase() === lower);
    }

    // 4. Match by batch number
    if (!matched) {
      matched = products.find(
        (p) => p.active && p.batchNumber?.trim().toLowerCase() === lower
      );
    }

    // 5. Match by exact product name
    if (!matched) {
      matched = products.find(
        (p) => p.active && p.name.trim().toLowerCase() === lower
      );
    }

    // 6. Fuzzy match in filtered catalog if unique
    if (!matched) {
      const partialMatches = products.filter(
        (p) => p.active && (p.name.toLowerCase().includes(lower) || p.barcode.includes(lower))
      );
      if (partialMatches.length === 1) {
        matched = partialMatches[0];
      }
    }

    if (matched) {
      addToCart(matched, effectiveQty);
      setSearch('');
      if (barcodeInputRef.current) barcodeInputRef.current.value = '';
    } else {
      playErrorBeep();
      showNotification('error', `Barcode/Item "${lookupCode}" not found.`);
    }
    refocusScanner();
  }, [products, multiplier, addToCart, refocusScanner]);

  // Setup keyboard wedge barcode scanner hook
  useBarcodeScanner({
    onScan: handleBarcodeScanned,
    debounceMs: 350,
    enabled: !isCustomerModalOpen && !isScannerTestOpen && !isCameraScannerOpen && !completedInvoice,
  });

  // Top Sellers / High-Frequency Items for 1-Tap Fast Billing
  const topSellers = useMemo(() => {
    return products
      .filter((p) => p.active && p.stockQty > 0)
      .slice(0, 8);
  }, [products]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return ['All', ...Array.from(set)];
  }, [products]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (!p.active) return false;
      const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
      if (!matchesCat) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });
  }, [products, selectedCategory, search]);

  // Update item quantity
  const updateQuantity = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      removeItem(productId);
      return;
    }

    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          let validQty = newQty;
          if (newQty > item.product.stockQty) {
            playErrorBeep();
            showNotification('error', `Available stock for "${item.product.name}" is only ${item.product.stockQty}.`);
            validQty = item.product.stockQty;
          }
          const lineTotal = item.finalUnitPrice * validQty;
          return {
            ...item,
            quantity: validQty,
            lineTotal: Math.round(lineTotal * 100) / 100,
          };
        }
        return item;
      })
    );
    refocusScanner();
  };

  // Remove single item
  const removeItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
    refocusScanner();
  };

  // Clear cart
  const clearCart = () => {
    setCart([]);
    setCashReceived('');
    setSaleNotes('');
    setCustomerPhoneQuickInput('');
    setSelectedCustomer(undefined);
    refocusScanner();
  };

  // Cart Totals calculation
  const totals = useMemo(() => {
    let subtotal = 0;
    let discountTotal = 0;
    let gstTotal = 0;

    cart.forEach((item) => {
      const lineSubtotal = item.product.sellingPrice * item.quantity;
      const lineDiscount = item.unitDiscount * item.quantity;
      const netLine = lineSubtotal - lineDiscount;
      const gstRate = item.product.gstRate || 18;
      const taxBase = netLine / (1 + gstRate / 100);
      const taxAmount = netLine - taxBase;

      subtotal += lineSubtotal;
      discountTotal += lineDiscount;
      gstTotal += taxAmount;
    });

    const grandTotal = Math.round((subtotal - discountTotal) * 100) / 100;
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      discountTotal: Math.round(discountTotal * 100) / 100,
      gstTotal: Math.round(gstTotal * 100) / 100,
      grandTotal,
    };
  }, [cart]);

  // Default cash received to grand total
  useEffect(() => {
    if (paymentMethod === 'CASH' && totals.grandTotal > 0 && !cashReceived) {
      setCashReceived(totals.grandTotal.toString());
    }
  }, [paymentMethod, totals.grandTotal, cashReceived]);

  const cashReceivedNum = parseFloat(cashReceived) || 0;
  const changeGiven = Math.max(0, cashReceivedNum - totals.grandTotal);

  // Quick Customer lookup by phone number without opening modal
  const handleQuickCustomerLookup = (phone: string) => {
    setCustomerPhoneQuickInput(phone);
    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (cleanPhone.length >= 10) {
      const found = customers.find((c) => c.mobile.includes(cleanPhone));
      if (found) {
        setSelectedCustomer(found);
        showNotification('success', `Linked customer: ${found.name}`);
      } else {
        showNotification('error', `No existing customer for ${cleanPhone}. Click 'Link Customer' to create.`);
      }
    }
  };

  // Execute Checkout (Standard or Quick Cash)
  const handleCheckout = (isQuickCashExact: boolean = false) => {
    if (cart.length === 0) {
      playErrorBeep();
      showNotification('error', 'Cart is empty. Please scan or select fireworks.');
      return;
    }

    const currentPayMethod: PaymentMethod = isQuickCashExact ? 'CASH' : paymentMethod;
    const finalCashTendered: number = isQuickCashExact ? totals.grandTotal : cashReceivedNum;

    if (currentPayMethod === 'KHATA') {
      if (!selectedCustomer) {
        playErrorBeep();
        showNotification('error', 'Khata payment requires selecting or adding a linked customer.');
        setIsCustomerModalOpen(true);
        return;
      }
      const potentialBalance = selectedCustomer.khataBalance + totals.grandTotal;
      if (selectedCustomer.maxCreditLimit && potentialBalance > selectedCustomer.maxCreditLimit) {
        playErrorBeep();
        showNotification(
          'error',
          `Customer credit limit exceeded! Max limit: ₹${selectedCustomer.maxCreditLimit}, current due: ₹${selectedCustomer.khataBalance}.`
        );
        return;
      }
    }

    if (currentPayMethod === 'CASH') {
      if (finalCashTendered < totals.grandTotal) {
        playErrorBeep();
        showNotification(
          'error',
          `Cash received (₹${finalCashTendered}) is less than total amount (₹${totals.grandTotal}).`
        );
        return;
      }
    }

    const result = StorageService.checkoutSale({
      shopId: shop.id,
      userId,
      cashierName,
      items: cart,
      paymentMethod: currentPayMethod,
      customer: selectedCustomer,
      cashReceived: currentPayMethod === 'CASH' ? finalCashTendered : undefined,
      notes: saleNotes.trim() || undefined,
    });

    if (result.success && result.invoice) {
      playSuccessChime();
      setCompletedInvoice(result.invoice);
      clearCart();
      onRefreshData();
      showNotification('success', `Invoice ${result.invoice.invoiceNumber} completed!`);

      // Auto-kick drawer if cash sale and enabled
      if (currentPayMethod === 'CASH') {
        const hwConfig = StorageService.getHardwareConfig();
        if (hwConfig.cashDrawerOnSale) {
          hardwarePrinterManager.kickCashDrawer();
        }
      }
    } else {
      playErrorBeep();
      showNotification('error', result.error || 'Failed to complete sale checkout.');
    }
  };

  // Keyboard Shortcuts (F2 Checkout, F3 Search, F4 Barcode Gun, F6 Multiplier, F7 Lock, F8 Clear, F9 Customer, F10 Pay Mode)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow Esc to close search or modal
      if (e.key === 'Escape') {
        setSearch('');
        refocusScanner();
        return;
      }

      // Quick Cash Bill with Ctrl + Enter
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        handleCheckout(true);
        return;
      }

      const isFunctionKey = ['F2', 'F3', 'F4', 'F6', 'F7', 'F8', 'F9', 'F10'].includes(e.key);
      if (!isFunctionKey) return;

      e.preventDefault();

      if (e.key === 'F2') {
        // Instant Quick Cash Checkout
        handleCheckout(paymentMethod === 'CASH');
      } else if (e.key === 'F3') {
        barcodeInputRef.current?.focus();
        barcodeInputRef.current?.select();
        showNotification('success', 'Focus: Product / Barcode Search (F3)');
      } else if (e.key === 'F4') {
        setSearch('');
        if (barcodeInputRef.current) barcodeInputRef.current.value = '';
        barcodeInputRef.current?.focus();
        showNotification('success', 'Ready for Barcode Gun Ingest (F4)');
      } else if (e.key === 'F6') {
        // Cycle quantity multiplier: 1x -> 2x -> 5x -> 10x -> 20x -> 1x
        const multipliers = [1, 2, 5, 10, 20, 50];
        setMultiplier((prev) => {
          const nextIdx = (multipliers.indexOf(prev) + 1) % multipliers.length;
          const nextM = multipliers[nextIdx];
          showNotification('success', `Quantity Multiplier: ${nextM}x (F6)`);
          return nextM;
        });
      } else if (e.key === 'F7') {
        // Toggle Scanner Auto-Focus Lock
        setScannerLock((prev) => {
          const next = !prev;
          showNotification('success', next ? 'Scanner Lock: ON (F7)' : 'Scanner Lock: OFF (F7)');
          return next;
        });
      } else if (e.key === 'F8') {
        clearCart();
        showNotification('success', 'Cart Cleared (F8)');
      } else if (e.key === 'F9') {
        setIsCustomerModalOpen(true);
      } else if (e.key === 'F10') {
        setPaymentMethod((prev) => (prev === 'CASH' ? 'UPI' : prev === 'UPI' ? 'KHATA' : 'CASH'));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, paymentMethod, totals, selectedCustomer, cashReceived, saleNotes, refocusScanner]);

  return (
    <div className="space-y-3.5">
      {/* Top Banner & Hardware / High-Speed Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-800 tracking-tight uppercase">
              POS Terminal: {shop.name}
            </span>
          </div>
          <span className="text-xs text-slate-300">·</span>
          <span className="text-xs text-slate-600">
            Cashier: <strong className="text-slate-900">{cashierName}</strong>
          </span>

          {/* Scanner Lock Status Badge */}
          <button
            onClick={() => {
              setScannerLock(!scannerLock);
              refocusScanner();
            }}
            className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold flex items-center gap-1 transition-colors ${
              scannerLock
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-slate-100 text-slate-600 border border-slate-200'
            }`}
            title="Auto-refocuses scanner after every click (F7)"
          >
            <Lock className="w-3 h-3" />
            <span>Scan Lock: {scannerLock ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        {/* Hardware shortcuts */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsScannerTestOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
          >
            <Scan className="w-3.5 h-3.5 text-orange-600" />
            <span>Gun Test</span>
          </button>

          <button
            onClick={() => setIsCameraScannerOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
          >
            <Camera className="w-3.5 h-3.5 text-blue-600" />
            <span>Camera</span>
          </button>

          <button
            onClick={() => setIsPrinterTestOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-orange-600" />
            <span>Printers</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-2.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all shadow-xs ${
            notification.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Main POS Split Layout: Catalog (Left) vs Cart & Checkout (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left: Speed Toolbar, Barcode Gun Ingest, Categories & Fast Product Grid */}
        <div className="lg:col-span-7 space-y-3">
          {/* Barcode & Search Input Bar with Multiplier Chips */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Scan className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-orange-600" />
                <input
                  id="pos-barcode-input"
                  ref={barcodeInputRef}
                  data-barcode-input="true"
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.stopPropagation();
                      const val = search.trim();
                      if (val) {
                        handleBarcodeScanned(val);
                        setSearch('');
                        if (barcodeInputRef.current) barcodeInputRef.current.value = '';
                      }
                    }
                  }}
                  placeholder="Scan barcode gun or type '5*item' / SKU (Enter)..."
                  autoFocus
                  className="w-full pl-9 pr-24 py-2 bg-slate-50 border border-slate-300 focus:border-orange-500 focus:bg-white rounded-lg text-xs font-mono text-slate-900 outline-none transition-all placeholder:text-slate-400 font-medium"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                  F4 / Gun
                </span>
              </div>

              {/* Quantity Multiplier Picker (1x, 2x, 5x, 10x, 20x) */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 px-1 font-mono">Qty:</span>
                {[1, 2, 5, 10, 20].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setMultiplier(m);
                      refocusScanner();
                    }}
                    className={`px-2 py-1 rounded text-[11px] font-mono font-bold transition-all ${
                      multiplier === m
                        ? 'bg-orange-600 text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {m}x
                  </button>
                ))}
              </div>
            </div>

            {/* Top Sellers / 1-Tap Quick-Add Bar (Fireworks Counter Speed) */}
            {topSellers.length > 0 && (
              <div className="pt-1 border-t border-slate-100">
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5 font-medium">
                  <span className="flex items-center gap-1 text-slate-700 font-bold">
                    <Flame className="w-3.5 h-3.5 text-orange-600" />
                    <span>⚡ 1-Tap Top Sellers:</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Tap to add {multiplier}x
                  </span>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {topSellers.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => addToCart(item, multiplier)}
                      className="px-2.5 py-1.5 bg-orange-50 hover:bg-orange-100 active:scale-95 border border-orange-200 text-slate-800 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 shadow-2xs shrink-0 cursor-pointer"
                    >
                      <span className="font-semibold truncate max-w-[120px]">{item.name}</span>
                      <span className="font-mono text-orange-700 font-bold">₹{item.sellingPrice}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Category Filter Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    refocusScanner();
                  }}
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors font-medium shrink-0 cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Catalog Grid (Memoized Cards) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[520px] overflow-y-auto pr-1">
            {filteredProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                multiplier={multiplier}
                onAddToCart={addToCart}
              />
            ))}
          </div>
        </div>

        {/* Right: Cart, Inline Customer Phone, Instant Cash Checkout & Settle */}
        <div className="lg:col-span-5 space-y-3">
          {/* Customer Fast-Association Card */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-slate-100 text-slate-700 rounded-lg">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    {selectedCustomer ? selectedCustomer.name : 'Counter Sale (Walk-in)'}
                  </div>
                  {selectedCustomer && (
                    <div className="text-[11px] font-mono text-amber-600 font-semibold">
                      Khata Due: ₹{selectedCustomer.khataBalance}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {selectedCustomer && (
                  <button
                    onClick={() => {
                      setSelectedCustomer(undefined);
                      setCustomerPhoneQuickInput('');
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600"
                    title="Clear Customer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setIsCustomerModalOpen(true)}
                  className="px-2.5 py-1 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                >
                  {selectedCustomer ? 'Change' : 'Link (F9)'}
                </button>
              </div>
            </div>

            {/* Quick Phone Number Input */}
            {!selectedCustomer && (
              <div className="relative">
                <Phone className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={customerPhoneQuickInput}
                  onChange={(e) => handleQuickCustomerLookup(e.target.value)}
                  placeholder="Quick enter customer mobile (10-digit)..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono outline-none focus:bg-white focus:border-orange-500 text-slate-800 placeholder:text-slate-400"
                />
              </div>
            )}
          </div>

          {/* Cart Table Container */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
            <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <ShoppingCart className="w-4 h-4 text-orange-600" />
                <span>Current Cart ({cart.reduce((a, c) => a + c.quantity, 0)})</span>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs text-rose-600 hover:text-rose-800 font-medium flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear (F8)
                </button>
              )}
            </div>

            {/* Cart Items List with Rapid Qty Increment Presets */}
            <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
              {cart.length === 0 ? (
                <div className="p-7 text-center text-slate-400 text-xs">
                  <ShoppingCart className="w-7 h-7 text-slate-300 mx-auto mb-1.5" />
                  Cart is empty. Scan barcodes or tap items to bill.
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.product.id} className="p-2.5 text-xs flex items-center justify-between gap-2 hover:bg-slate-50/60">
                    <div className="flex-1 min-w-0 pr-1">
                      <div className="font-semibold text-slate-900 truncate">{item.product.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2 mt-0.5">
                        <span>₹{item.product.sellingPrice}</span>
                        <span>·</span>
                        <span>GST {item.product.gstRate}%</span>
                      </div>
                    </div>

                    {/* Qty Controls + Fast Increment Buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      <QuantityInput
                        value={item.quantity}
                        min={1}
                        stockLimit={item.product.stockQty}
                        productName={item.product.name}
                        onQuantityChange={(newQty) => updateQuantity(item.product.id, newQty)}
                        onExceedStock={(max) =>
                          showNotification(
                            'error',
                            `Available stock for "${item.product.name}" is only ${max}.`
                          )
                        }
                        onRemove={() => removeItem(item.product.id)}
                      />

                      {/* Rapid +5 button for high rush box sales */}
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 5)}
                        className="px-1.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono font-bold text-[10px] rounded transition-colors"
                        title="Add 5 more boxes"
                      >
                        +5
                      </button>
                    </div>

                    {/* Item Total */}
                    <div className="text-right w-16 shrink-0 font-mono font-bold text-slate-900">
                      ₹{item.lineTotal}
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={() => removeItem(item.product.id)}
                      className="p-1 text-slate-300 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Cart Financial Summary */}
            <div className="p-3 bg-slate-50/70 border-t border-slate-200 space-y-1 text-xs font-mono">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span>₹{totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>Tax Breakdown (Inclusive GST):</span>
                <span>₹{totals.gstTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-slate-900 pt-1 border-t border-slate-200 font-sans">
                <span>Grand Total:</span>
                <span className="font-mono text-orange-600">₹{totals.grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Method Selector & Instant Settlement */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-3.5 space-y-3">
            {/* Instant Quick Cash & Bill Button (1-Touch Settlement) */}
            <button
              onClick={() => handleCheckout(true)}
              disabled={cart.length === 0}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>⚡ Quick Cash Bill · ₹{totals.grandTotal.toFixed(2)} (Exact & Print) [F2]</span>
            </button>

            {/* Payment Mode Tabs */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setPaymentMethod('CASH')}
                className={`py-1.5 px-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  paymentMethod === 'CASH'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Banknote className="w-3.5 h-3.5" />
                <span>Cash</span>
              </button>

              <button
                onClick={() => setPaymentMethod('UPI')}
                className={`py-1.5 px-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  paymentMethod === 'UPI'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>UPI QR</span>
              </button>

              <button
                onClick={() => setPaymentMethod('KHATA')}
                className={`py-1.5 px-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  paymentMethod === 'KHATA'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Khata</span>
              </button>
            </div>

            {/* Cash Tender & Rapid Change Calculation */}
            {paymentMethod === 'CASH' && (
              <div className="space-y-2 pt-0.5">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                      Cash Tendered (₹)
                    </label>
                    <input
                      type="number"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      placeholder="Received amount"
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono font-bold text-slate-900 outline-none focus:bg-white focus:border-orange-500"
                    />
                  </div>

                  <div className="w-36 text-right">
                    <div className="text-[11px] font-medium text-slate-500 mb-0.5">Change:</div>
                    <div
                      className={`text-base font-bold font-mono ${
                        cashReceivedNum >= totals.grandTotal ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      ₹{changeGiven.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Quick Currency Tender Chips */}
                <div className="flex gap-1 text-xs font-mono">
                  <button
                    onClick={() => setCashReceived(totals.grandTotal.toString())}
                    className="flex-1 py-1 bg-orange-100 hover:bg-orange-200 border border-orange-300 rounded text-orange-900 text-[11px] font-bold"
                  >
                    Exact
                  </button>
                  {[100, 500, 1000, 2000].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setCashReceived(amt.toString())}
                      className="flex-1 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-slate-700 text-[11px] font-semibold"
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {paymentMethod === 'UPI' && (
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-center space-y-1.5">
                <div className="text-xs text-slate-600">
                  Scan &amp; Pay via PhonePe, GPay, Paytm:
                </div>
                <div className="w-28 h-28 bg-white border border-slate-300 rounded-lg p-1.5 mx-auto flex flex-col items-center justify-center shadow-2xs">
                  <QrCode className="w-20 h-20 text-slate-900" />
                  <span className="text-[10px] font-mono font-bold text-slate-900">
                    ₹{totals.grandTotal}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-800">
                  UPI ID: <strong>{shop.upiId}</strong>
                </div>
              </div>
            )}

            {paymentMethod === 'KHATA' && (
              <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900 space-y-1">
                {selectedCustomer ? (
                  <>
                    <div className="font-semibold">
                      Debiting bill to {selectedCustomer.name}'s Khata
                    </div>
                    <div className="font-mono text-[11px]">
                      Current: ₹{selectedCustomer.khataBalance} → After: ₹
                      {selectedCustomer.khataBalance + totals.grandTotal}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-1.5 text-rose-700">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Please link a customer before completing Khata sale.</span>
                  </div>
                )}
              </div>
            )}

            {/* Optional Sale Notes */}
            <input
              type="text"
              value={saleNotes}
              onChange={(e) => setSaleNotes(e.target.value)}
              placeholder="Optional sale / token notes..."
              className="w-full px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white text-slate-800"
            />

            {/* Standard Complete Sale Button */}
            <button
              onClick={() => handleCheckout(false)}
              disabled={cart.length === 0}
              className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 active:scale-[0.99] disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Checkout · ₹{totals.grandTotal.toFixed(2)}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CustomerSelectModal
        isOpen={isCustomerModalOpen}
        onClose={() => {
          setIsCustomerModalOpen(false);
          refocusScanner();
        }}
        shop={shop}
        customers={customers}
        selectedCustomer={selectedCustomer}
        onSelectCustomer={(c) => {
          setSelectedCustomer(c);
          refocusScanner();
        }}
        onRefreshCustomers={onRefreshData}
      />

      <ScannerTestModal
        isOpen={isScannerTestOpen}
        onClose={() => {
          setIsScannerTestOpen(false);
          refocusScanner();
        }}
        onSimulateScan={handleBarcodeScanned}
      />

      <CameraScannerModal
        isOpen={isCameraScannerOpen}
        onClose={() => {
          setIsCameraScannerOpen(false);
          refocusScanner();
        }}
        onScan={handleBarcodeScanned}
      />

      <PrinterTestModal
        isOpen={isPrinterTestOpen}
        onClose={() => {
          setIsPrinterTestOpen(false);
          refocusScanner();
        }}
        shop={shop}
      />

      <ReceiptModal
        isOpen={!!completedInvoice}
        onClose={() => {
          setCompletedInvoice(null);
          refocusScanner();
        }}
        invoice={completedInvoice}
        shop={shop}
      />
    </div>
  );
};
