import React, { useState } from 'react';
import {
  FileText,
  Search,
  Printer,
  Share2,
  Calendar,
  IndianRupee,
  Eye,
  CheckCircle2,
  X,
  CreditCard,
  Banknote,
  BookOpen,
} from 'lucide-react';
import { Invoice, Shop } from '../types';
import { ReceiptModal } from '../components/hardware/ReceiptModal';

interface InvoicesViewProps {
  shop: Shop;
  invoices: Invoice[];
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({ shop, invoices }) => {
  const [search, setSearch] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string>('ALL');
  const [activeReceiptInvoice, setActiveReceiptInvoice] = useState<Invoice | null>(null);
  const [expandedInvoice, setExpandedInvoice] = useState<Invoice | null>(null);

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      (inv.customerName && inv.customerName.toLowerCase().includes(search.toLowerCase())) ||
      (inv.customerMobile && inv.customerMobile.includes(search)) ||
      inv.cashierName.toLowerCase().includes(search.toLowerCase());

    const matchesMethod = selectedMethod === 'ALL' || inv.paymentMethod === selectedMethod;

    return matchesSearch && matchesMethod;
  });

  const totalRevenue = filteredInvoices.reduce((acc, curr) => acc + curr.grandTotal, 0);

  const handleWhatsAppShare = (inv: Invoice) => {
    const itemsList = inv.items
      .map((item) => `• ${item.name} x ${item.quantity} = ₹${item.total}`)
      .join('\n');

    const msg = `*${shop.name}*
${shop.address}, ${shop.city}
GSTIN: ${shop.gstin}
---------------------------
*TAX INVOICE: ${inv.invoiceNumber}*
Date: ${new Date(inv.createdAt).toLocaleDateString()}
Total: ₹${inv.grandTotal} (${inv.paymentMethod})
---------------------------
*ITEMS:*
${itemsList}
---------------------------
Thank you for celebrating with us!`;

    const phone = inv.customerMobile ? inv.customerMobile.replace(/[^0-9]/g, '') : '';
    const url = phone
      ? `https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-orange-600" />
            <span>Invoices &amp; Sales Audit</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable invoice snapshots, customer receipts, re-printing, and WhatsApp dispatch.
          </p>
        </div>

        <div className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-right shadow-2xs">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            Filtered Total ({filteredInvoices.length} Bills)
          </div>
          <div className="text-lg font-bold font-mono text-orange-600">
            ₹{totalRevenue.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Filter Strip */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by invoice number, customer, or mobile..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:border-orange-500"
          />
        </div>

        <div className="flex items-center gap-1.5 text-xs font-medium">
          <span className="text-slate-500 mr-1 text-[11px] uppercase tracking-wider">Mode:</span>
          {['ALL', 'CASH', 'UPI', 'KHATA'].map((method) => (
            <button
              key={method}
              onClick={() => setSelectedMethod(method)}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                selectedMethod === method
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {method}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-3">Date &amp; Time</th>
                <th className="py-3 px-3">Customer</th>
                <th className="py-3 px-3">Cashier</th>
                <th className="py-3 px-2">Payment Mode</th>
                <th className="py-3 px-3">Items</th>
                <th className="py-3 px-3 text-right">Grand Total</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">
                    {inv.invoiceNumber}
                  </td>

                  <td className="py-3 px-3 font-mono text-slate-500 text-[11px]">
                    <div>{new Date(inv.createdAt).toLocaleDateString()}</div>
                    <div className="text-[10px] text-slate-400">
                      {new Date(inv.createdAt).toLocaleTimeString()}
                    </div>
                  </td>

                  <td className="py-3 px-3">
                    <div className="font-semibold text-slate-900">
                      {inv.customerName || 'Walk-in Counter'}
                    </div>
                    {inv.customerMobile && (
                      <div className="text-[11px] font-mono text-slate-400">
                        {inv.customerMobile}
                      </div>
                    )}
                  </td>

                  <td className="py-3 px-3 text-slate-600">{inv.cashierName}</td>

                  <td className="py-3 px-2 font-mono">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                        inv.paymentMethod === 'CASH'
                          ? 'bg-emerald-50 text-emerald-700'
                          : inv.paymentMethod === 'UPI'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-amber-50 text-amber-800'
                      }`}
                    >
                      {inv.paymentMethod === 'CASH' && <Banknote className="w-3 h-3" />}
                      {inv.paymentMethod === 'UPI' && <CreditCard className="w-3 h-3" />}
                      {inv.paymentMethod === 'KHATA' && <BookOpen className="w-3 h-3" />}
                      {inv.paymentMethod}
                    </span>
                  </td>

                  <td className="py-3 px-3 font-mono text-slate-600">
                    {inv.items.reduce((a, c) => a + c.quantity, 0)} pcs ({inv.items.length} lines)
                  </td>

                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 text-sm">
                    ₹{inv.grandTotal.toFixed(2)}
                  </td>

                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setExpandedInvoice(inv)}
                        title="View Line Items"
                        className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setActiveReceiptInvoice(inv)}
                        title="Reprint Thermal Receipt"
                        className="p-1.5 text-orange-600 hover:text-orange-800 hover:bg-orange-50 rounded transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleWhatsAppShare(inv)}
                        title="Share on WhatsApp"
                        className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded transition-colors"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Snapshot Inspection Drawer / Modal */}
      {expandedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Invoice Snapshot: {expandedInvoice.invoiceNumber}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {new Date(expandedInvoice.createdAt).toLocaleString()} · Cashier: {expandedInvoice.cashierName}
                </p>
              </div>
              <button
                onClick={() => setExpandedInvoice(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {/* Customer info if present */}
              {expandedInvoice.customerName && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Customer Account:</span>
                  <div className="font-bold text-slate-900">{expandedInvoice.customerName}</div>
                  <div className="font-mono text-slate-500">{expandedInvoice.customerMobile}</div>
                </div>
              )}

              {/* Items Table */}
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                  <tr>
                    <th className="py-2">Item Name</th>
                    <th className="py-2 text-center">Qty</th>
                    <th className="py-2 text-right">Unit Rate</th>
                    <th className="py-2 text-right">Discount</th>
                    <th className="py-2 text-right">GST %</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expandedInvoice.items.map((it, idx) => (
                    <tr key={idx} className="font-mono">
                      <td className="py-2 pr-2 font-sans font-medium text-slate-900">{it.name}</td>
                      <td className="py-2 text-center font-bold">{it.quantity}</td>
                      <td className="py-2 text-right">₹{it.unitPrice}</td>
                      <td className="py-2 text-right text-emerald-600">
                        {it.discountAmount > 0 ? `-₹${it.discountAmount}` : '-'}
                      </td>
                      <td className="py-2 text-right">{it.gstRate}%</td>
                      <td className="py-2 text-right font-bold text-slate-900">₹{it.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Financial Totals */}
              <div className="pt-3 border-t border-slate-200 text-xs font-mono space-y-1 text-right">
                <div>Subtotal: ₹{expandedInvoice.subtotal.toFixed(2)}</div>
                {expandedInvoice.discountTotal > 0 && (
                  <div className="text-emerald-600 font-semibold">
                    Discount Total: -₹{expandedInvoice.discountTotal.toFixed(2)}
                  </div>
                )}
                <div className="text-slate-500">
                  GST Tax Total (Included): ₹{expandedInvoice.gstTotal.toFixed(2)}
                </div>
                <div className="text-base font-bold text-slate-900 pt-1 border-t border-slate-200">
                  Grand Total: ₹{expandedInvoice.grandTotal.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
              <span className="text-xs font-mono text-slate-500">
                Payment: <strong>{expandedInvoice.paymentMethod}</strong>
              </span>
              <button
                onClick={() => {
                  setActiveReceiptInvoice(expandedInvoice);
                  setExpandedInvoice(null);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold"
              >
                <Printer className="w-4 h-4" />
                <span>Open Receipt Printer Modal</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thermal Receipt Modal */}
      <ReceiptModal
        isOpen={!!activeReceiptInvoice}
        onClose={() => setActiveReceiptInvoice(null)}
        invoice={activeReceiptInvoice}
        shop={shop}
      />
    </div>
  );
};
