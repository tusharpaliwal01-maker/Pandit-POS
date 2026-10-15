import React, { useState } from 'react';
import { UserCheck, UserPlus, X, Search, Phone, MapPin, IndianRupee } from 'lucide-react';
import { Customer, Shop } from '../../types';
import { StorageService } from '../../services/storage';

interface CustomerSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  shop: Shop;
  customers: Customer[];
  selectedCustomer?: Customer;
  onSelectCustomer: (customer?: Customer) => void;
  onRefreshCustomers: () => void;
}

export const CustomerSelectModal: React.FC<CustomerSelectModalProps> = ({
  isOpen,
  onClose,
  shop,
  customers,
  selectedCustomer,
  onSelectCustomer,
  onRefreshCustomers,
}) => {
  const [search, setSearch] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);

  // New Customer Form
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [creditLimit, setCreditLimit] = useState('25000');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.mobile.includes(search) ||
      (c.address && c.address.toLowerCase().includes(search.toLowerCase()))
  );

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Customer name is required');
      return;
    }
    if (!mobile.trim() || mobile.replace(/\D/g, '').length < 10) {
      setError('A valid 10-digit mobile number is required');
      return;
    }

    const newCustomer: Customer = {
      id: `cust-${Date.now()}`,
      shopId: shop.id,
      name: name.trim(),
      mobile: mobile.trim(),
      address: address.trim() || undefined,
      email: email.trim() || undefined,
      totalPurchases: 0,
      khataBalance: 0,
      maxCreditLimit: parseFloat(creditLimit) || 25000,
      createdAt: new Date().toISOString(),
    };

    StorageService.saveCustomer(newCustomer);
    onRefreshCustomers();
    onSelectCustomer(newCustomer);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-base">Select or Add Customer</h3>
              <p className="text-xs text-slate-500">Link Bill to Customer Khata &amp; Purchase History</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher: Existing List vs Quick Add */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold">
          <button
            onClick={() => setIsAddingNew(false)}
            className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
              !isAddingNew
                ? 'border-orange-600 text-orange-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Existing Customers ({customers.length})
          </button>
          <button
            onClick={() => setIsAddingNew(true)}
            className={`flex-1 py-2.5 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
              isAddingNew
                ? 'border-orange-600 text-orange-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Quick Add New</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!isAddingNew ? (
            <div className="space-y-3">
              {/* Search Box */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search customer by name, mobile, or address..."
                  autoFocus
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:border-orange-500"
                />
              </div>

              {/* Clear Link Button if currently selected */}
              {selectedCustomer && (
                <button
                  onClick={() => {
                    onSelectCustomer(undefined);
                    onClose();
                  }}
                  className="w-full py-1.5 text-xs text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg font-medium transition-colors"
                >
                  Clear Linked Customer (Walk-in Cash Sale)
                </button>
              )}

              {/* Customer List */}
              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1">
                {filteredCustomers.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    No customers found matching "{search}".
                  </div>
                ) : (
                  filteredCustomers.map((c) => {
                    const isSelected = selectedCustomer?.id === c.id;
                    return (
                      <div
                        key={c.id}
                        onClick={() => {
                          onSelectCustomer(c);
                          onClose();
                        }}
                        className={`p-3 rounded-lg cursor-pointer transition-colors flex items-center justify-between text-xs ${
                          isSelected ? 'bg-orange-50 border border-orange-200' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="font-semibold text-slate-900 flex items-center gap-2">
                            <span>{c.name}</span>
                            {isSelected && (
                              <span className="text-[10px] bg-orange-600 text-white px-1.5 py-0.2 rounded font-mono">
                                Linked
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-slate-500 text-[11px] font-mono">
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {c.mobile}
                            </span>
                            {c.address && (
                              <span className="flex items-center gap-1 truncate max-w-[150px]">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                {c.address}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-[10px] text-slate-400">Khata Due</div>
                          <div
                            className={`font-mono font-bold text-xs ${
                              c.khataBalance > 0 ? 'text-amber-600' : 'text-emerald-600'
                            }`}
                          >
                            ₹{c.khataBalance.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            /* Quick Add Customer Form */
            <form onSubmit={handleCreateCustomer} className="space-y-3">
              {error && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Full Customer Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Chandra (Event Decorator)"
                  required
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
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="10-digit mobile"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono outline-none focus:bg-white focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Khata Credit Limit (₹)
                  </label>
                  <input
                    type="number"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value)}
                    placeholder="25000"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono outline-none focus:bg-white focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Shop Address / Location
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Near Ramlila Ground, Sector 12"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:border-orange-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                >
                  Save &amp; Link Customer
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
