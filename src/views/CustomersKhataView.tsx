import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Phone,
  MapPin,
  IndianRupee,
  Calendar,
  ArrowDownLeft,
  ArrowUpRight,
  AlertCircle,
  CheckCircle2,
  X,
  FileText,
} from 'lucide-react';
import { Customer, Shop, KhataEntry, Invoice } from '../types';
import { StorageService } from '../services/storage';
import { CustomerInvoiceHistoryModal } from '../components/customers/CustomerInvoiceHistoryModal';

interface CustomersKhataViewProps {
  shop: Shop;
  customers: Customer[];
  onRefreshData: () => void;
  invoices?: Invoice[];
}

export const CustomersKhataView: React.FC<CustomersKhataViewProps> = ({
  shop,
  customers,
  onRefreshData,
  invoices,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isCollectPaymentOpen, setIsCollectPaymentOpen] = useState(false);

  const allInvoices = invoices || StorageService.getInvoices(shop.id);

  // Collect Payment Form
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI'>('CASH');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // New Customer Form
  const [newName, setNewName] = useState('');
  const [newMobile, setNewMobile] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newCreditLimit, setNewCreditLimit] = useState('25000');
  const [newCustError, setNewCustError] = useState<string | null>(null);

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.mobile.includes(search) ||
      (c.address && c.address.toLowerCase().includes(search.toLowerCase()))
  );

  const totalOutstandingKhata = customers.reduce((acc, c) => acc + c.khataBalance, 0);

  // Get customer ledger entries
  const customerLedger: KhataEntry[] = selectedCustomer
    ? StorageService.getKhataEntries(shop.id, selectedCustomer.id)
    : [];

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    setNewCustError(null);

    if (!newName.trim() || !newMobile.trim()) {
      setNewCustError('Name and 10-digit mobile number are required.');
      return;
    }

    const newCustomer: Customer = {
      id: `cust-${Date.now()}`,
      shopId: shop.id,
      name: newName.trim(),
      mobile: newMobile.trim(),
      address: newAddress.trim() || undefined,
      totalPurchases: 0,
      khataBalance: 0,
      maxCreditLimit: parseFloat(newCreditLimit) || 25000,
      createdAt: new Date().toISOString(),
    };

    StorageService.saveCustomer(newCustomer);
    onRefreshData();
    setIsAddCustomerOpen(false);
    setNewName('');
    setNewMobile('');
    setNewAddress('');
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError(null);
    if (!selectedCustomer) return;

    const amt = parseFloat(paymentAmount);
    if (!amt || amt <= 0) {
      setPaymentError('Please enter a valid positive payment amount.');
      return;
    }

    if (amt > selectedCustomer.khataBalance) {
      setPaymentError(
        `Payment (₹${amt}) cannot exceed the customer's outstanding debt of ₹${selectedCustomer.khataBalance}.`
      );
      return;
    }

    const res = StorageService.recordKhataPayment({
      shopId: shop.id,
      customerId: selectedCustomer.id,
      amount: amt,
      paymentMode,
      notes: paymentNotes.trim() || undefined,
    });

    if (res.success) {
      onRefreshData();
      setIsCollectPaymentOpen(false);
      setPaymentAmount('');
      setPaymentNotes('');
      // Update local view
      setSelectedCustomer({
        ...selectedCustomer,
        khataBalance: res.newBalance || 0,
      });
    } else {
      setPaymentError(res.error || 'Failed to record payment');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-orange-600" />
            <span>Customers &amp; Khata Credit Ledger</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Track customer credit balances, payment histories, and enforce credit ceilings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-amber-50 border border-amber-200 px-3.5 py-1.5 rounded-lg text-right">
            <div className="text-[10px] text-amber-700 font-bold uppercase tracking-wider">
              Total Khata Receivables
            </div>
            <div className="text-base font-bold font-mono text-amber-900">
              ₹{totalOutstandingKhata.toLocaleString()}
            </div>
          </div>

          <button
            onClick={() => setIsAddCustomerOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* Main Content: Customers Table and Ledger Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Customer List Table */}
        <div className={`${selectedCustomer ? 'lg:col-span-6' : 'lg:col-span-12'} space-y-4`}>
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Customer Accounts ({customers.length})
              </span>
              <div className="relative w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, phone..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:border-orange-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Customer Name</th>
                    <th className="py-2.5 px-2">Mobile</th>
                    <th className="py-2.5 px-2">Total Purchases</th>
                    <th className="py-2.5 px-3 text-right">Khata Due</th>
                    <th className="py-2.5 px-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCustomers.map((c) => {
                    const isSelected = selectedCustomer?.id === c.id;
                    return (
                      <tr
                        key={c.id}
                        onClick={() => setSelectedCustomer(c)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-orange-50/70 font-medium' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900">{c.name}</div>
                          {c.address && (
                            <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
                              {c.address}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-2 font-mono text-slate-600">{c.mobile}</td>

                        <td className="py-3 px-2 font-mono text-slate-700">
                          ₹{c.totalPurchases.toLocaleString()}
                        </td>

                        <td className="py-3 px-3 text-right font-mono font-bold">
                          <span
                            className={c.khataBalance > 0 ? 'text-amber-600' : 'text-emerald-600'}
                          >
                            ₹{c.khataBalance.toLocaleString()}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setHistoryCustomer(c);
                              }}
                              className="px-2.5 py-1 text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                              title="View all invoices for this customer"
                            >
                              <FileText className="w-3 h-3 text-orange-600" />
                              <span>View History</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCustomer(c);
                              }}
                              className="px-2 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-md text-[11px] font-medium transition-colors cursor-pointer"
                              title="Open customer Khata credit ledger"
                            >
                              Ledger
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Customer Ledger Drawer */}
        {selectedCustomer && (
          <div className="lg:col-span-6 space-y-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              {/* Drawer Header */}
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm tracking-tight">{selectedCustomer.name}</h3>
                  <div className="flex items-center gap-3 text-xs text-slate-400 font-mono mt-0.5">
                    <span>{selectedCustomer.mobile}</span>
                    <span>·</span>
                    <span>Limit: ₹{selectedCustomer.maxCreditLimit || 25000}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setHistoryCustomer(selectedCustomer)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    title="View full invoice history for this customer"
                  >
                    <FileText className="w-3.5 h-3.5 text-orange-400" />
                    <span>View History</span>
                  </button>
                  {selectedCustomer.khataBalance > 0 && (
                    <button
                      onClick={() => {
                        setPaymentAmount(selectedCustomer.khataBalance.toString());
                        setIsCollectPaymentOpen(true);
                      }}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      Collect Payment
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedCustomer(null)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Balance Summary Strip */}
              <div className="grid grid-cols-2 p-3.5 bg-slate-50 border-b border-slate-200 text-xs font-mono">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Lifetime Orders</span>
                  <span className="font-bold text-slate-900 text-sm">
                    ₹{selectedCustomer.totalPurchases.toLocaleString()}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block text-[10px] uppercase">
                    Current Outstanding Due
                  </span>
                  <span
                    className={`font-bold text-base ${
                      selectedCustomer.khataBalance > 0 ? 'text-amber-600' : 'text-emerald-600'
                    }`}
                  >
                    ₹{selectedCustomer.khataBalance.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Ledger Entries Timeline */}
              <div className="p-4 space-y-3">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Khata Ledger Statement ({customerLedger.length} Transactions)
                </span>

                <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto pr-1">
                  {customerLedger.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs">
                      No Khata ledger activity recorded for this customer yet.
                    </div>
                  ) : (
                    customerLedger.map((entry) => (
                      <div key={entry.id} className="py-2.5 flex items-start justify-between text-xs">
                        <div className="flex items-start gap-2.5">
                          <div
                            className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                              entry.type === 'CREDIT_SALE'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {entry.type === 'CREDIT_SALE' ? (
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            ) : (
                              <ArrowDownLeft className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">
                              {entry.type === 'CREDIT_SALE'
                                ? 'Credit Sale on Invoice'
                                : 'Payment Received'}
                            </div>
                            <div className="text-[11px] text-slate-500">{entry.notes}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {new Date(entry.createdAt).toLocaleDateString()}{' '}
                              {new Date(entry.createdAt).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>

                        <div className="text-right font-mono">
                          <div
                            className={`font-bold ${
                              entry.type === 'CREDIT_SALE' ? 'text-amber-600' : 'text-emerald-600'
                            }`}
                          >
                            {entry.type === 'CREDIT_SALE' ? '+' : '-'}₹{entry.amount.toFixed(2)}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Bal: ₹{entry.balanceAfter.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Collect Payment Modal */}
      {isCollectPaymentOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-semibold text-slate-900 text-sm">Collect Khata Payment</h3>
              <button
                onClick={() => setIsCollectPaymentOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
              {paymentError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                  {paymentError}
                </div>
              )}

              <div className="p-3 bg-amber-50 rounded-lg text-xs font-mono text-amber-900 flex justify-between">
                <span>Customer Debt Balance:</span>
                <span className="font-bold">₹{selectedCustomer.khataBalance.toLocaleString()}</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Amount to Collect (₹) *
                </label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter amount"
                  required
                  autoFocus
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900 outline-none focus:bg-white focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Mode
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setPaymentMode('CASH')}
                    className={`py-2 rounded-lg border text-center transition-colors ${
                      paymentMode === 'CASH'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMode('UPI')}
                    className={`py-2 rounded-lg border text-center transition-colors ${
                      paymentMode === 'UPI'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    UPI / Online
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reference / Notes
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Paid via GPay / In-store cash counter"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white text-slate-800"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCollectPaymentOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Customer Modal */}
      {isAddCustomerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-semibold text-slate-900 text-sm">Add New Customer Account</h3>
              <button
                onClick={() => setIsAddCustomerOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="p-6 space-y-3.5">
              {newCustError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                  {newCustError}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Full Customer Name *
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Ramesh Chandra (Event Decorator)"
                  required
                  autoFocus
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    value={newMobile}
                    onChange={(e) => setNewMobile(e.target.value)}
                    placeholder="10-digit number"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono outline-none focus:bg-white focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Max Credit Limit (₹)
                  </label>
                  <input
                    type="number"
                    value={newCreditLimit}
                    onChange={(e) => setNewCreditLimit(e.target.value)}
                    placeholder="25000"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono outline-none focus:bg-white focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Address / City
                </label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="e.g. Sector 14, Fireworks Market"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:border-orange-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddCustomerOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Invoice History Modal */}
      <CustomerInvoiceHistoryModal
        isOpen={Boolean(historyCustomer)}
        onClose={() => setHistoryCustomer(null)}
        customer={historyCustomer}
        shop={shop}
        invoices={allInvoices}
      />
    </div>
  );
};
