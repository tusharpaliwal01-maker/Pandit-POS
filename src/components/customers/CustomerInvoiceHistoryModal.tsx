import React, { useState, useMemo } from 'react';
import {
  X,
  FileText,
  Search,
  Calendar,
  Clock,
  ArrowUpDown,
  Printer,
  Share2,
  ChevronDown,
  ChevronUp,
  Tag,
  CreditCard,
  Banknote,
  BookOpen,
  IndianRupee,
  ShoppingBag,
  ExternalLink,
} from 'lucide-react';
import { Customer, Invoice, Shop, PaymentMethod } from '../../types';
import { ReceiptModal } from '../hardware/ReceiptModal';

interface CustomerInvoiceHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  shop: Shop;
  invoices: Invoice[];
}

export const CustomerInvoiceHistoryModal: React.FC<CustomerInvoiceHistoryModalProps> = ({
  isOpen,
  onClose,
  customer,
  shop,
  invoices,
}) => {
  const [search, setSearch] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc'); // default: newest first (chronological)
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
  const [receiptInvoice, setReceiptInvoice] = useState<Invoice | null>(null);

  // Filter invoices for this specific customer
  const customerInvoices = useMemo(() => {
    if (!customer) return [];
    return invoices.filter((inv) => {
      const matchId = inv.customerId === customer.id;
      const matchPhone = Boolean(
        customer.mobile &&
          inv.customerMobile &&
          inv.customerMobile.replace(/\D/g, '') === customer.mobile.replace(/\D/g, '')
      );
      const matchName = Boolean(
        inv.customerName &&
          inv.customerName.trim().toLowerCase() === customer.name.trim().toLowerCase()
      );
      return matchId || matchPhone || matchName;
    });
  }, [invoices, customer]);

  // Apply search, payment method filter, and sort order
  const filteredAndSortedInvoices = useMemo(() => {
    return customerInvoices
      .filter((inv) => {
        // Payment method filter
        if (selectedMethod !== 'ALL' && inv.paymentMethod !== selectedMethod) {
          return false;
        }

        // Text search
        if (!search.trim()) return true;
        const q = search.toLowerCase().trim();
        const matchNumber = inv.invoiceNumber.toLowerCase().includes(q);
        const matchCashier = inv.cashierName.toLowerCase().includes(q);
        const matchNotes = Boolean(inv.notes && inv.notes.toLowerCase().includes(q));
        const matchItem = inv.items.some((item) =>
          item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q)
        );

        return matchNumber || matchCashier || matchNotes || matchItem;
      })
      .sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
      });
  }, [customerInvoices, search, selectedMethod, sortOrder]);

  // Aggregate stats
  const stats = useMemo(() => {
    const totalCount = customerInvoices.length;
    const totalSpent = customerInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
    const avgOrderValue = totalCount > 0 ? Math.round(totalSpent / totalCount) : 0;
    return { totalCount, totalSpent, avgOrderValue };
  }, [customerInvoices]);

  const handleWhatsAppShare = (inv: Invoice) => {
    const itemsList = inv.items
      .map((item) => `• ${item.name} x ${item.quantity} = ₹${item.total}`)
      .join('\n');

    const msg = `*${shop.name}*
${shop.address}, ${shop.city}
GSTIN: ${shop.gstin}
---------------------------
*TAX INVOICE: ${inv.invoiceNumber}*
Date: ${new Date(inv.createdAt).toLocaleDateString()} ${new Date(inv.createdAt).toLocaleTimeString()}
Customer: ${customer?.name || inv.customerName || 'Valued Customer'}
Total: ₹${inv.grandTotal.toLocaleString()} (${inv.paymentMethod})
---------------------------
*ITEMS:*
${itemsList}
---------------------------
Grand Total: ₹${inv.grandTotal.toFixed(2)}
Thank you for celebrating with us!`;

    const phone = customer?.mobile ? customer.mobile.replace(/[^0-9]/g, '') : '';
    const url = phone
      ? `https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const getMethodBadge = (method: PaymentMethod) => {
    switch (method) {
      case 'CASH':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Banknote className="w-3 h-3" />
            <span>CASH</span>
          </span>
        );
      case 'UPI':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <CreditCard className="w-3 h-3" />
            <span>UPI / ONLINE</span>
          </span>
        );
      case 'KHATA':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <BookOpen className="w-3 h-3" />
            <span>KHATA CREDIT</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
            <span>{method}</span>
          </span>
        );
    }
  };

  if (!isOpen || !customer) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-600/20 text-orange-400 border border-orange-500/30 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base tracking-tight text-white">
                    {customer.name}
                  </h3>
                  <span className="px-2 py-0.5 bg-orange-600 text-white rounded-md text-[10px] font-bold uppercase tracking-wider">
                    Invoice History
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 font-mono mt-0.5">
                  <span>📱 {customer.mobile}</span>
                  {customer.address && (
                    <>
                      <span>·</span>
                      <span className="truncate max-w-[240px]">📍 {customer.address}</span>
                    </>
                  )}
                  <span>·</span>
                  <span>Ceiling: ₹{customer.maxCreditLimit?.toLocaleString() || '25,000'}</span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Stats Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 bg-slate-50 border-b border-slate-200 divide-x divide-slate-200/80 text-xs shrink-0">
            <div className="p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Total Invoices
              </div>
              <div className="text-base font-bold text-slate-900 font-mono mt-0.5">
                {stats.totalCount} bills
              </div>
            </div>

            <div className="p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Lifetime Billed
              </div>
              <div className="text-base font-bold text-orange-600 font-mono mt-0.5">
                ₹{stats.totalSpent.toLocaleString()}
              </div>
            </div>

            <div className="p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Avg Invoice Size
              </div>
              <div className="text-base font-bold text-slate-700 font-mono mt-0.5">
                ₹{stats.avgOrderValue.toLocaleString()}
              </div>
            </div>

            <div className="p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Current Khata Due
              </div>
              <div
                className={`text-base font-bold font-mono mt-0.5 ${
                  customer.khataBalance > 0 ? 'text-amber-600' : 'text-emerald-600'
                }`}
              >
                ₹{customer.khataBalance.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Filter & Sort Bar */}
          <div className="p-3 sm:p-4 bg-white border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search invoice #, product name..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:border-orange-500 text-slate-900"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Payment Method Filter */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold text-slate-600">
                {(['ALL', 'CASH', 'UPI', 'KHATA'] as const).map((method) => (
                  <button
                    key={method}
                    onClick={() => setSelectedMethod(method)}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      selectedMethod === method
                        ? 'bg-white text-orange-600 shadow-2xs font-bold'
                        : 'hover:text-slate-900'
                    }`}
                  >
                    {method === 'ALL' ? 'All' : method}
                  </button>
                ))}
              </div>

              {/* Chronological Sort Toggle */}
              <button
                onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                title={`Currently sorted: ${sortOrder === 'desc' ? 'Newest to Oldest' : 'Oldest to Newest'}`}
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-orange-600" />
                <span>{sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}</span>
              </button>
            </div>
          </div>

          {/* Invoice List (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-100/60">
            {filteredAndSortedInvoices.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300 p-8 space-y-2">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="text-sm font-bold text-slate-700">No Invoices Found</div>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {search || selectedMethod !== 'ALL'
                    ? 'No invoices match your current search and filter criteria.'
                    : `No past purchase invoices are recorded for ${customer.name} yet.`}
                </p>
                {(search || selectedMethod !== 'ALL') && (
                  <button
                    onClick={() => {
                      setSearch('');
                      setSelectedMethod('ALL');
                    }}
                    className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-lg text-xs font-semibold transition-colors mt-2"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            ) : (
              filteredAndSortedInvoices.map((inv, idx) => {
                const isExpanded = expandedInvoiceId === inv.id;
                const totalItemCount = inv.items.reduce((acc, i) => acc + i.quantity, 0);
                const invDate = new Date(inv.createdAt);

                return (
                  <div
                    key={inv.id}
                    className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all hover:border-slate-300"
                  >
                    {/* Invoice Card Top Row */}
                    <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 text-sm">
                            {inv.invoiceNumber}
                          </span>
                          {getMethodBadge(inv.paymentMethod)}
                          <span className="text-[10px] text-slate-400 font-mono">
                            #{idx + 1} of {filteredAndSortedInvoices.length}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500 font-mono">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{invDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{invDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                          </span>
                          <span>·</span>
                          <span className="text-slate-600">
                            Cashier: <strong className="text-slate-800">{inv.cashierName}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Right Amount & Actions */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <div className="text-left sm:text-right">
                          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                            Total Bill
                          </div>
                          <div className="text-base sm:text-lg font-bold font-mono text-slate-900">
                            ₹{inv.grandTotal.toFixed(2)}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Receipt Modal Trigger */}
                          <button
                            onClick={() => setReceiptInvoice(inv)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                            title="View receipt & reprint"
                          >
                            <Printer className="w-3.5 h-3.5 text-orange-600" />
                            <span className="hidden sm:inline">Receipt</span>
                          </button>

                          {/* WhatsApp Share */}
                          <button
                            onClick={() => handleWhatsAppShare(inv)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 border border-emerald-200 rounded-lg text-xs transition-colors cursor-pointer"
                            title="Share invoice on WhatsApp"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Expand Details */}
                          <button
                            onClick={() =>
                              setExpandedInvoiceId(isExpanded ? null : inv.id)
                            }
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs transition-colors cursor-pointer"
                            title={isExpanded ? 'Collapse item details' : 'View line items'}
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Preview summary line of items when collapsed */}
                    {!isExpanded && (
                      <div
                        onClick={() => setExpandedInvoiceId(inv.id)}
                        className="px-4 py-2 bg-slate-50/70 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between cursor-pointer hover:bg-slate-100/60 transition-colors"
                      >
                        <span className="truncate max-w-[85%]">
                          <strong className="text-slate-700">{totalItemCount} items:</strong>{' '}
                          {inv.items.map((i) => `${i.name} (${i.quantity})`).join(', ')}
                        </span>
                        <span className="text-[10px] text-orange-600 font-semibold shrink-0">
                          View Items ↓
                        </span>
                      </div>
                    )}

                    {/* Expanded Detailed Items Table */}
                    {isExpanded && (
                      <div className="p-4 bg-slate-50/90 border-t border-slate-200 text-xs space-y-3 animate-in fade-in duration-100">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left">
                            <thead className="text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200">
                              <tr>
                                <th className="pb-1.5">Item Description</th>
                                <th className="pb-1.5 text-center">Qty</th>
                                <th className="pb-1.5 text-right">Price</th>
                                <th className="pb-1.5 text-right">GST</th>
                                <th className="pb-1.5 text-right">Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200/60 font-mono">
                              {inv.items.map((item, iIdx) => (
                                <tr key={iIdx} className="hover:bg-white/60">
                                  <td className="py-1.5 pr-2">
                                    <div className="font-semibold text-slate-900 font-sans">
                                      {item.name}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-sans">
                                      {item.category} {item.discountAmount > 0 ? `· Disc: -₹${item.discountAmount}` : ''}
                                    </div>
                                  </td>
                                  <td className="py-1.5 text-center">{item.quantity}</td>
                                  <td className="py-1.5 text-right">₹{item.unitPrice}</td>
                                  <td className="py-1.5 text-right text-slate-500">
                                    ₹{item.gstAmount.toFixed(1)} ({item.gstRate}%)
                                  </td>
                                  <td className="py-1.5 text-right font-bold text-slate-900">
                                    ₹{item.total.toFixed(2)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Financial Totals Breakdown */}
                        <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs font-mono">
                          <div className="text-[11px] text-slate-500 font-sans">
                            {inv.notes && <div>Note: {inv.notes}</div>}
                            {inv.paymentMethod === 'CASH' && inv.cashReceived && (
                              <div>
                                Cash: ₹{inv.cashReceived} · Change: ₹{inv.changeGiven || 0}
                              </div>
                            )}
                          </div>

                          <div className="space-y-0.5 text-right min-w-[180px]">
                            <div className="flex justify-between text-slate-500">
                              <span>Subtotal:</span>
                              <span>₹{inv.subtotal.toFixed(2)}</span>
                            </div>
                            {inv.discountTotal > 0 && (
                              <div className="flex justify-between text-emerald-600">
                                <span>Discount:</span>
                                <span>-₹{inv.discountTotal.toFixed(2)}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-slate-500 text-[11px]">
                              <span>Taxes (GST):</span>
                              <span>₹{inv.gstTotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-slate-900 text-sm border-t border-slate-300 pt-1 mt-1">
                              <span>Grand Total:</span>
                              <span>₹{inv.grandTotal.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs shrink-0">
            <span className="text-slate-500 font-mono">
              Showing {filteredAndSortedInvoices.length} of {customerInvoices.length} total customer invoices
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Nested Receipt Print / Thermal Preview Modal */}
      {receiptInvoice && (
        <ReceiptModal
          isOpen={Boolean(receiptInvoice)}
          onClose={() => setReceiptInvoice(null)}
          invoice={receiptInvoice}
          shop={shop}
        />
      )}
    </>
  );
};
