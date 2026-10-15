import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Zap,
  CheckCircle2,
  Banknote,
  CreditCard,
  Plus,
  Minus,
  Sparkles,
  ShoppingBag,
  IndianRupee,
  Search,
  ArrowRight,
  Printer,
  ChevronDown,
} from 'lucide-react';
import { Product, Shop, PaymentMethod, CartItem, Invoice } from '../../types';
import { StorageService } from '../../services/storage';
import { playBarcodeBeep, playErrorBeep } from '../../utils/soundHelper';

interface QuickSaleDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  shop: Shop;
  products: Product[];
  userId: string;
  cashierName: string;
  onSaleCompleted: (invoice: Invoice) => void;
  onAddToCart: (product: Product, quantity: number) => void;
}

interface QuickPreset {
  name: string;
  price: number;
  category: string;
}

const QUICK_PRESETS: QuickPreset[] = [
  { name: 'Diwali Sparklers (10 pcs)', price: 50, category: 'Sparklers (Phuljhadi)' },
  { name: 'Ground Chakra Deluxe', price: 100, category: 'Ground Chakkars' },
  { name: 'Special Flower Pot Anar', price: 150, category: 'Flower Pots (Anar)' },
  { name: 'Sonic Sound Rocket', price: 200, category: 'Rockets & Missiles' },
  { name: 'Counter Loose Item', price: 50, category: 'Miscellaneous' },
  { name: 'Safety Matchbox / Lighter', price: 20, category: 'Accessories' },
];

export const QuickSaleDrawer: React.FC<QuickSaleDrawerProps> = ({
  isOpen,
  onClose,
  shop,
  products,
  userId,
  cashierName,
  onSaleCompleted,
  onAddToCart,
}) => {
  const [itemName, setItemName] = useState('Diwali Sparklers');
  const [priceStr, setPriceStr] = useState('50');
  const [quantity, setQuantity] = useState(1);
  const [gstRate, setGstRate] = useState<number>(18);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [cashTendered, setCashTendered] = useState<string>('50');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);

  // Reset or focus on open
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setIsSubmitting(false);
      setTimeout(() => {
        nameInputRef.current?.select();
      }, 100);
    }
  }, [isOpen]);

  const priceNum = Math.max(0, parseFloat(priceStr) || 0);
  const lineTotal = Math.round(priceNum * quantity * 100) / 100;
  const cashNum = parseFloat(cashTendered) || 0;
  const changeDue = paymentMethod === 'CASH' ? Math.max(0, cashNum - lineTotal) : 0;

  // Sync cash tendered whenever total changes
  useEffect(() => {
    if (paymentMethod === 'CASH') {
      setCashTendered(lineTotal.toString());
    }
  }, [lineTotal, paymentMethod]);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: QuickPreset) => {
    setItemName(preset.name);
    setPriceStr(preset.price.toString());
    setSelectedProductId('');
    setErrorMessage(null);
  };

  const handleSelectProduct = (productId: string) => {
    setSelectedProductId(productId);
    const prod = products.find((p) => p.id === productId);
    if (prod) {
      setItemName(prod.name);
      setPriceStr(prod.sellingPrice.toString());
      setGstRate(prod.gstRate || 18);
      setErrorMessage(null);
    }
  };

  const buildProductObject = (): Product => {
    // If mapped to existing product
    if (selectedProductId) {
      const existing = products.find((p) => p.id === selectedProductId);
      if (existing) {
        return {
          ...existing,
          sellingPrice: priceNum,
        };
      }
    }

    // Ad-hoc quick sale product
    const timestamp = Date.now();
    return {
      id: `quick-${timestamp}`,
      shopId: shop.id,
      name: itemName.trim() || 'Counter Quick Item',
      barcode: `QUICK${timestamp.toString().slice(-6)}`,
      category: 'Quick Counter Sale',
      purchasePrice: 0,
      mrp: priceNum,
      sellingPrice: priceNum,
      gstRate,
      stockQty: 999,
      lowStockThreshold: 10,
      unit: 'pcs',
      active: true,
    };
  };

  const handleCompleteSale = () => {
    setErrorMessage(null);

    if (!itemName.trim()) {
      setErrorMessage('Please enter an item name or description.');
      playErrorBeep();
      return;
    }

    if (priceNum <= 0) {
      setErrorMessage('Price must be greater than ₹0.');
      playErrorBeep();
      return;
    }

    if (quantity <= 0) {
      setErrorMessage('Quantity must be at least 1.');
      playErrorBeep();
      return;
    }

    if (paymentMethod === 'CASH' && cashNum < lineTotal) {
      setErrorMessage(`Cash tendered (₹${cashNum}) is less than total amount (₹${lineTotal}).`);
      playErrorBeep();
      return;
    }

    setIsSubmitting(true);

    try {
      const prod = buildProductObject();
      const taxBase = lineTotal / (1 + (prod.gstRate || 18) / 100);
      const taxAmount = lineTotal - taxBase;

      const singleCartItem: CartItem = {
        product: prod,
        quantity,
        unitDiscount: 0,
        finalUnitPrice: priceNum,
        gstAmount: Math.round(taxAmount * 100) / 100,
        lineTotal,
      };

      const result = StorageService.checkoutSale({
        shopId: shop.id,
        userId,
        cashierName,
        items: [singleCartItem],
        paymentMethod,
        cashReceived: paymentMethod === 'CASH' ? cashNum : undefined,
        notes: `Quick Sale: ${prod.name} x ${quantity}`,
      });

      if (result.success && result.invoice) {
        playBarcodeBeep();
        onSaleCompleted(result.invoice);
        onClose();
      } else {
        setErrorMessage(result.error || 'Failed to process quick checkout.');
        playErrorBeep();
        setIsSubmitting(false);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Unexpected checkout error occurred.');
      playErrorBeep();
      setIsSubmitting(false);
    }
  };

  const handleAddCartOnly = () => {
    if (!itemName.trim() || priceNum <= 0) {
      setErrorMessage('Please enter a valid item name and price.');
      return;
    }
    const prod = buildProductObject();
    onAddToCart(prod, quantity);
    playBarcodeBeep();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Click outside to close */}
      <div className="flex-1" onClick={onClose} />

      {/* Drawer Container */}
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200 border-l border-slate-200">
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600/30 text-orange-400 border border-orange-500/40 flex items-center justify-center shadow-xs">
              <Zap className="w-5 h-5 fill-orange-400 text-orange-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base tracking-tight text-white">
                  Quick Single-Item Sale
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-600 text-white uppercase tracking-wider">
                  Fast POS
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Instant checkout without selecting customer accounts or catalog lookup.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <span className="font-semibold">{errorMessage}</span>
            </div>
          )}

          {/* Quick Item Presets (1-Tap Selection) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                1-Tap Quick Presets
              </label>
              <span className="text-[10px] text-slate-400">Instant autofill</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {QUICK_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectPreset(p)}
                  className={`text-left p-2 rounded-lg border text-xs transition-all flex flex-col justify-between cursor-pointer ${
                    itemName === p.name && priceStr === p.price.toString()
                      ? 'bg-orange-50 border-orange-400 text-orange-950 font-semibold shadow-2xs'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  <span className="truncate w-full">{p.name}</span>
                  <span className="font-mono font-bold text-orange-600 mt-0.5">
                    ₹{p.price}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Optional Existing Product Selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Or Link From Catalog (Optional)
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => handleSelectProduct(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none text-slate-800 focus:bg-white focus:border-orange-500"
            >
              <option value="">-- Custom Ad-Hoc Item (No Catalog Link) --</option>
              {products
                .filter((p) => p.active)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Stock: {p.stockQty}) — ₹{p.sellingPrice}
                  </option>
                ))}
            </select>
          </div>

          {/* Item Details Form */}
          <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200 space-y-3.5">
            {/* Item Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Item Description / Name *
              </label>
              <input
                ref={nameInputRef}
                type="text"
                value={itemName}
                onChange={(e) => {
                  setItemName(e.target.value);
                  setErrorMessage(null);
                }}
                placeholder="e.g. Loose Sparklers / Counter Item"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 outline-none focus:border-orange-500 shadow-2xs"
              />
            </div>

            {/* Price & Quantity Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Selling Price (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={priceStr}
                    onChange={(e) => {
                      setPriceStr(e.target.value);
                      setErrorMessage(null);
                    }}
                    placeholder="0"
                    className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-base font-mono font-bold text-slate-900 outline-none focus:border-orange-500 shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Quantity
                </label>
                <div className="flex items-center border border-slate-300 rounded-lg bg-white overflow-hidden shadow-2xs h-[38px]">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-2.5 h-full text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full text-center font-mono font-bold text-xs text-slate-900 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-2.5 h-full text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Tax Rate (GST) Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                GST Rate (Inclusive)
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {[0, 5, 12, 18, 28].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setGstRate(rate)}
                    className={`py-1.5 rounded-lg border text-xs font-mono font-bold transition-colors cursor-pointer ${
                      gstRate === rate
                        ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    {rate}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Payment Inflow Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  paymentMethod === 'CASH'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                }`}
              >
                <Banknote className="w-4 h-4" />
                <span>Cash Counter</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('UPI')}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  paymentMethod === 'UPI'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>UPI / QR Scan</span>
              </button>
            </div>

            {/* Cash Tendered & Change Helper */}
            {paymentMethod === 'CASH' && (
              <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-emerald-900">Cash Received:</span>
                  <div className="relative w-28">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-xs">
                      ₹
                    </span>
                    <input
                      type="number"
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                      className="w-full pl-6 pr-2 py-1 bg-white border border-emerald-300 rounded text-right font-mono font-bold text-slate-900 text-xs outline-none"
                    />
                  </div>
                </div>

                {/* Fast Cash Tender Chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setCashTendered(lineTotal.toString())}
                    className="px-2 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-[11px] font-mono font-bold"
                  >
                    Exact ₹{lineTotal}
                  </button>
                  {[100, 200, 500, 1000].map(
                    (amt) =>
                      amt >= lineTotal && (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setCashTendered(amt.toString())}
                          className="px-2 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-[11px] font-mono font-bold"
                        >
                          ₹{amt}
                        </button>
                      )
                  )}
                </div>

                {cashNum > lineTotal && (
                  <div className="flex justify-between items-center text-xs font-bold text-emerald-900 pt-1 border-t border-emerald-200/60 font-mono">
                    <span>Return Change:</span>
                    <span>₹{changeDue.toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}

            {paymentMethod === 'UPI' && shop.upiId && (
              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 text-xs text-blue-900 font-mono flex items-center justify-between">
                <span>UPI ID: <strong>{shop.upiId}</strong></span>
                <span className="text-[10px] text-blue-700 bg-blue-100 px-2 py-0.5 rounded font-semibold">
                  Scan &amp; Collect
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-2.5 shrink-0">
          {/* Bill Summary Banner */}
          <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Total Payable
              </span>
              <span className="text-xs text-slate-500 font-sans">
                {itemName} × {quantity}
              </span>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold font-mono text-slate-900">
                ₹{lineTotal.toFixed(2)}
              </div>
              <div className="text-[10px] text-slate-400">
                Includes {gstRate}% GST
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Add to Cart secondary button */}
            <button
              type="button"
              onClick={handleAddCartOnly}
              className="flex-1 py-3 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <ShoppingBag className="w-4 h-4 text-slate-500" />
              <span>Add to Cart</span>
            </button>

            {/* Instant Complete & Print Primary Button */}
            <button
              type="button"
              onClick={handleCompleteSale}
              disabled={isSubmitting || lineTotal <= 0}
              className="flex-2 py-3 px-4 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>
                {isSubmitting
                  ? 'Completing...'
                  : `Complete Sale · ₹${lineTotal.toFixed(2)}`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
