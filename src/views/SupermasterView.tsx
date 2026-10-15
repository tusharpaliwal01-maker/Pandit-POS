import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  Building2,
  Plus,
  Store,
  Users,
  Package,
  FileText,
  CheckCircle2,
  X,
  ExternalLink,
  Edit2,
  Trash2,
  KeyRound,
  ShieldCheck,
  Search,
  Filter,
  UserPlus,
  Power,
  Lock,
} from 'lucide-react';
import { Shop, User, UserRole, UserPermissions } from '../types';
import { StorageService } from '../services/storage';

interface SupermasterViewProps {
  currentShop: Shop;
  shops: Shop[];
  onSelectShop: (shop: Shop) => void;
  onRefreshData: () => void;
}

export const SupermasterView: React.FC<SupermasterViewProps> = ({
  currentShop,
  shops,
  onSelectShop,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<'accounts' | 'shops'>('accounts');

  // Multi-shop Users State
  const [allUsers, setAllUsers] = useState<User[]>(() => StorageService.getUsers());
  const [userSearch, setUserSearch] = useState('');
  const [shopFilter, setShopFilter] = useState<string>('ALL');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Modals
  const [isCreateShopOpen, setIsCreateShopOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // User Form State
  const [formShopId, setFormShopId] = useState(currentShop.id);
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('123456');
  const [formFullName, setFormFullName] = useState('');
  const [formMobile, setFormMobile] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('STAFF');
  const [formPermissions, setFormPermissions] = useState<UserPermissions>({
    canBilling: true,
    canInventory: false,
    canReports: false,
    canSettings: false,
    canManageStaff: false,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // New Shop Form
  const [shopName, setShopName] = useState('');
  const [shopCode, setShopCode] = useState('');
  const [gstin, setGstin] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminFullName, setAdminFullName] = useState('');
  const [adminMobile, setAdminMobile] = useState('');
  const [adminPassword, setAdminPassword] = useState('pandit12345678');
  const [shopError, setShopError] = useState<string | null>(null);

  const refreshUsers = () => {
    setAllUsers(StorageService.getUsers());
    onRefreshData();
  };

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return allUsers.filter((u) => {
      const matchSearch =
        u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.fullName.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.mobile.includes(userSearch);
      if (!matchSearch) return false;

      if (shopFilter !== 'ALL' && u.shopId !== shopFilter) return false;
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;

      return true;
    });
  }, [allUsers, userSearch, shopFilter, roleFilter]);

  // Open Create User Modal
  const handleOpenCreateUser = () => {
    setEditingUser(null);
    setFormShopId(currentShop.id);
    setFormUsername('');
    setFormPassword('123456');
    setFormFullName('');
    setFormMobile('');
    setFormRole('STAFF');
    setFormPermissions({
      canBilling: true,
      canInventory: false,
      canReports: false,
      canSettings: false,
      canManageStaff: false,
    });
    setFormError(null);
    setIsUserModalOpen(true);
  };

  // Open Edit User Modal
  const handleOpenEditUser = (u: User) => {
    setEditingUser(u);
    setFormShopId(u.shopId);
    setFormUsername(u.username);
    setFormPassword(u.password || '123456');
    setFormFullName(u.fullName);
    setFormMobile(u.mobile);
    setFormRole(u.role);
    setFormPermissions(
      u.permissions || {
        canBilling: true,
        canInventory: u.role !== 'STAFF',
        canReports: u.role !== 'STAFF',
        canSettings: u.role === 'SUPERMASTER',
        canManageStaff: u.role !== 'STAFF',
      }
    );
    setFormError(null);
    setIsUserModalOpen(true);
  };

  // Save User (Create or Edit)
  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanUsername = formUsername.trim().toLowerCase();
    const cleanFullName = formFullName.trim();
    const cleanMobile = formMobile.trim();
    const cleanPassword = formPassword.trim();

    if (!cleanUsername || !cleanFullName || !cleanMobile) {
      setFormError('Username, Full Name, and Mobile Number are required.');
      return;
    }

    // Check duplicate username if new user or changing username
    const existing = allUsers.find(
      (u) => u.username.toLowerCase() === cleanUsername && (!editingUser || u.id !== editingUser.id)
    );
    if (existing) {
      setFormError(`Username "${cleanUsername}" is already taken by another user.`);
      return;
    }

    const targetUser: User = {
      id: editingUser ? editingUser.id : `user-${Date.now()}`,
      shopId: formShopId,
      username: cleanUsername,
      password: cleanPassword || (editingUser?.password || '123456'),
      fullName: cleanFullName,
      mobile: cleanMobile,
      role: formRole,
      permissions:
        formRole === 'SUPERMASTER'
          ? {
              canBilling: true,
              canInventory: true,
              canReports: true,
              canSettings: true,
              canManageStaff: true,
            }
          : formPermissions,
      active: editingUser ? editingUser.active : true,
      createdAt: editingUser ? editingUser.createdAt : new Date().toISOString(),
    };

    StorageService.saveUser(targetUser);
    refreshUsers();
    setIsUserModalOpen(false);
  };

  // Toggle User Active Status (1-Click)
  const handleToggleUserActive = (u: User) => {
    if (u.role === 'SUPERMASTER') {
      alert('Supermaster account cannot be deactivated.');
      return;
    }
    const updated: User = { ...u, active: !u.active };
    StorageService.saveUser(updated);
    refreshUsers();
  };

  // Delete User with confirmation
  const handleDeleteUser = (u: User) => {
    if (u.role === 'SUPERMASTER') {
      alert('Supermaster account cannot be deleted.');
      return;
    }
    if (confirm(`Are you sure you want to permanently delete account "${u.username}" (${u.fullName})?`)) {
      StorageService.deleteUser(u.id);
      refreshUsers();
    }
  };

  // Create Shop Branch
  const handleCreateShop = (e: React.FormEvent) => {
    e.preventDefault();
    setShopError(null);

    if (!shopName.trim() || !adminUsername.trim() || !adminMobile.trim()) {
      setShopError('Shop Name, Admin Username, and Admin Mobile are required.');
      return;
    }

    const newShopId = `shop-${Date.now()}`;
    const newShop: Shop = {
      id: newShopId,
      name: shopName.trim(),
      code: (shopCode.trim() || shopName.slice(0, 3)).toUpperCase(),
      gstin: (gstin.trim() || '07AAECP1234F1Z0').toUpperCase(),
      address: 'Main Commercial Market, Fireworks Wholesale Godown',
      city: city.trim() || 'Delhi',
      state: 'Delhi',
      pincode: '110006',
      phonePrimary: phone.trim() || '+91 98765 00000',
      email: `${adminUsername.trim()}@panditfireworks.com`,
      upiId: `${adminUsername.trim()}@upi`,
      receiptFooter: 'Thank you for shopping with Pandit Fireworks! Celebrate responsibly.',
      defaultPaperWidth: '80mm',
      defaultPrinterQueue: 'RETSOL RTP82',
      createdAt: new Date().toISOString(),
      active: true,
    };

    const newAdminUser: User = {
      id: `user-${Date.now()}`,
      shopId: newShopId,
      username: adminUsername.trim().toLowerCase(),
      password: adminPassword.trim() || 'pandit12345678',
      fullName: adminFullName.trim() || adminUsername.trim(),
      mobile: adminMobile.trim(),
      role: 'ADMIN',
      permissions: {
        canBilling: true,
        canInventory: true,
        canReports: true,
        canSettings: true,
        canManageStaff: true,
      },
      active: true,
      createdAt: new Date().toISOString(),
    };

    StorageService.saveShop(newShop);
    StorageService.saveUser(newAdminUser);
    refreshUsers();
    setIsCreateShopOpen(false);

    // Reset Form
    setShopName('');
    setShopCode('');
    setAdminUsername('');
    setAdminFullName('');
    setAdminMobile('');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-orange-600" />
            <span>SUPERMASTER Platform &amp; Multi-Branch Control</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Global account management, cashier permissions, branch provisioning, and store isolation.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleOpenCreateUser}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Admin / Staff Account</span>
          </button>

          <button
            onClick={() => setIsCreateShopOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Provision Store Branch</span>
          </button>
        </div>
      </div>

      {/* Primary Subtabs: Accounts vs Branches */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('accounts')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'accounts'
              ? 'border-orange-600 text-orange-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Global Accounts &amp; Role Permissions ({allUsers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('shops')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'shops'
              ? 'border-orange-600 text-orange-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Store Branches &amp; Isolation ({shops.length})</span>
        </button>
      </div>

      {/* TAB 1: Global Account & Staff Role Control */}
      {activeTab === 'accounts' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search by name, username, or mobile..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-hidden focus:bg-white focus:border-orange-500"
                />
              </div>

              {/* Branch Filter */}
              <select
                value={shopFilter}
                onChange={(e) => setShopFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
              >
                <option value="ALL">All Store Branches</option>
                {shops.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              {/* Role Filter */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
              >
                <option value="ALL">All Roles</option>
                <option value="SUPERMASTER">Supermaster</option>
                <option value="ADMIN">Store Admin</option>
                <option value="STAFF">Cashier Staff</option>
              </select>
            </div>

            <div className="text-xs text-slate-500">
              Showing <strong>{filteredUsers.length}</strong> of {allUsers.length} users
            </div>
          </div>

          {/* Accounts Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/70 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">User / Full Name</th>
                    <th className="py-3 px-3">Assigned Branch</th>
                    <th className="py-3 px-3">Role</th>
                    <th className="py-3 px-3">Privileges &amp; Permissions</th>
                    <th className="py-3 px-3">Password</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => {
                    const shop = shops.find((s) => s.id === u.shopId);
                    const isSuper = u.role === 'SUPERMASTER';

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{u.fullName}</div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            @{u.username} · {u.mobile}
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span className="font-semibold text-slate-700 block truncate max-w-[180px]">
                            {shop ? shop.name : 'All Platform Branches'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {shop ? shop.code : 'GLOBAL'}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${
                              u.role === 'SUPERMASTER'
                                ? 'bg-orange-100 text-orange-700 border border-orange-200'
                                : u.role === 'ADMIN'
                                ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                : 'bg-blue-100 text-blue-700 border border-blue-200'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1">
                            {isSuper ? (
                              <span className="text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded">
                                Full Master Access
                              </span>
                            ) : (
                              <>
                                <span
                                  className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                                    u.permissions?.canBilling !== false
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-slate-100 text-slate-400'
                                  }`}
                                >
                                  POS Billing
                                </span>
                                <span
                                  className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                                    u.permissions?.canInventory
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-slate-100 text-slate-400'
                                  }`}
                                >
                                  Inventory
                                </span>
                                <span
                                  className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                                    u.permissions?.canReports
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-slate-100 text-slate-400'
                                  }`}
                                >
                                  Reports
                                </span>
                                <span
                                  className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                                    u.permissions?.canManageStaff
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-slate-100 text-slate-400'
                                  }`}
                                >
                                  Staff
                                </span>
                              </>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                          {u.password ? '••••••••' : 'Default (123456)'}
                        </td>

                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => handleToggleUserActive(u)}
                            disabled={isSuper}
                            title={u.active ? 'Click to Deactivate' : 'Click to Activate'}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                              u.active
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                u.active ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                            />
                            <span>{u.active ? 'Active' : 'Suspended'}</span>
                          </button>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditUser(u)}
                              className="p-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit user details & permissions"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {!isSuper && (
                              <button
                                onClick={() => handleDeleteUser(u)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete user account"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
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
      )}

      {/* TAB 2: Store Branches Management */}
      {activeTab === 'shops' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {shops.map((s) => {
              const isCurrent = s.id === currentShop.id;
              const shopProducts = StorageService.getProducts(s.id);
              const shopInvoices = StorageService.getInvoices(s.id);
              const shopStaff = StorageService.getUsers(s.id);

              return (
                <div
                  key={s.id}
                  className={`bg-white rounded-2xl border p-5 shadow-2xs space-y-4 transition-all ${
                    isCurrent ? 'border-orange-500 ring-2 ring-orange-500/10' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-base">{s.name}</h3>
                        {isCurrent && (
                          <span className="text-[10px] bg-orange-600 text-white px-2 py-0.5 rounded font-mono font-bold">
                            CURRENT CONTEXT
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Code: <strong className="font-mono text-slate-700">{s.code}</strong> · GSTIN:{' '}
                        <span className="font-mono">{s.gstin}</span>
                      </p>
                    </div>

                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                        s.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {s.active ? 'Operational' : 'Suspended'}
                    </span>
                  </div>

                  {/* Branch Metrics */}
                  <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl text-xs font-mono text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Products</span>
                      <span className="font-bold text-slate-900 text-sm">{shopProducts.length}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Staff Accounts</span>
                      <span className="font-bold text-slate-900 text-sm">{shopStaff.length}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Invoices Issued</span>
                      <span className="font-bold text-slate-900 text-sm">{shopInvoices.length}</span>
                    </div>
                  </div>

                  <div className="pt-1 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      {s.city}, {s.state} · {s.phonePrimary}
                    </span>

                    {!isCurrent ? (
                      <button
                        onClick={() => onSelectShop(s)}
                        className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Switch Store Context
                      </button>
                    ) : (
                      <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Active Session</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL: Create / Edit Account with Role Permissions */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-orange-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  {editingUser ? `Edit Account: ${editingUser.username}` : 'Create New Account'}
                </h3>
              </div>
              <button
                onClick={() => setIsUserModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
                  {formError}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Assigned Store Branch *
                  </label>
                  <select
                    value={formShopId}
                    onChange={(e) => setFormShopId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white"
                  >
                    {shops.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Account Username *
                    </label>
                    <input
                      type="text"
                      value={formUsername}
                      onChange={(e) => setFormUsername(e.target.value)}
                      placeholder="e.g. rajesh_cashier"
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-hidden focus:bg-white focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Password *
                    </label>
                    <input
                      type="text"
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder="Enter security password"
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-hidden focus:bg-white focus:border-orange-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Full Legal Name *
                    </label>
                    <input
                      type="text"
                      value={formFullName}
                      onChange={(e) => setFormFullName(e.target.value)}
                      placeholder="e.g. Rajesh Kumar"
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-hidden focus:bg-white focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Mobile Number *
                    </label>
                    <input
                      type="tel"
                      value={formMobile}
                      onChange={(e) => setFormMobile(e.target.value)}
                      placeholder="10-digit mobile"
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-hidden focus:bg-white focus:border-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Account Role</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white"
                  >
                    <option value="STAFF">STAFF (Cashier / Retail Counter)</option>
                    <option value="ADMIN">ADMIN (Store Manager / Inventory Boss)</option>
                    <option value="SUPERMASTER">SUPERMASTER (Full Platform Superuser)</option>
                  </select>
                </div>

                {/* Granular Role Permissions */}
                {formRole !== 'SUPERMASTER' && (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                    <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider block">
                      Role Privileges &amp; Access Permissions
                    </span>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={formPermissions.canBilling}
                          onChange={(e) =>
                            setFormPermissions({ ...formPermissions, canBilling: e.target.checked })
                          }
                          className="rounded border-slate-300 text-orange-600"
                        />
                        <span>
                          <strong>POS Billing Terminal:</strong> Barcode gun scanning, customer cart &amp; checkout
                        </span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={formPermissions.canInventory}
                          onChange={(e) =>
                            setFormPermissions({
                              ...formPermissions,
                              canInventory: e.target.checked,
                            })
                          }
                          className="rounded border-slate-300 text-orange-600"
                        />
                        <span>
                          <strong>Inventory &amp; Stock:</strong> Add products, modify prices, OCR bill imports
                        </span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={formPermissions.canReports}
                          onChange={(e) =>
                            setFormPermissions({ ...formPermissions, canReports: e.target.checked })
                          }
                          className="rounded border-slate-300 text-orange-600"
                        />
                        <span>
                          <strong>Reports &amp; Audits:</strong> View financial totals, anti-theft stock ledger, export Excel
                        </span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={formPermissions.canManageStaff}
                          onChange={(e) =>
                            setFormPermissions({
                              ...formPermissions,
                              canManageStaff: e.target.checked,
                            })
                          }
                          className="rounded border-slate-300 text-orange-600"
                        />
                        <span>
                          <strong>Staff Management:</strong> Manage cashier logins for this store
                        </span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
                >
                  {editingUser ? 'Save Account Changes' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Provision New Shop Branch */}
      {isCreateShopOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">
                Provision New Shop Branch &amp; Admin
              </h3>
              <button
                onClick={() => setIsCreateShopOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateShop} className="p-6 space-y-4 text-xs">
              {shopError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
                  {shopError}
                </div>
              )}

              <div className="space-y-3">
                <span className="font-bold text-slate-800 uppercase tracking-wider block border-b border-slate-100 pb-1">
                  1. Branch Store Details
                </span>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Shop Name *</label>
                  <input
                    type="text"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="e.g. PANDIT CRACKERS NOIDA (Branch 3)"
                    required
                    autoFocus
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-hidden focus:bg-white focus:border-orange-500 font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Branch Code</label>
                    <input
                      type="text"
                      value={shopCode}
                      onChange={(e) => setShopCode(e.target.value)}
                      placeholder="e.g. PCN-BR3"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono outline-hidden focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">City</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Noida"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-hidden focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">GSTIN</label>
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    placeholder="e.g. 07AAECP1234F3Z2"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono outline-hidden focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <span className="font-bold text-slate-800 uppercase tracking-wider block border-b border-slate-100 pb-1">
                  2. Shop Admin Account Credentials
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Admin Full Name</label>
                    <input
                      type="text"
                      value={adminFullName}
                      onChange={(e) => setAdminFullName(e.target.value)}
                      placeholder="e.g. Manoj Sharma"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-hidden focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Admin Username *</label>
                    <input
                      type="text"
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      placeholder="e.g. manoj_admin"
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono outline-hidden focus:bg-white focus:border-orange-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Mobile Number *</label>
                    <input
                      type="tel"
                      value={adminMobile}
                      onChange={(e) => setAdminMobile(e.target.value)}
                      placeholder="10-digit number"
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono outline-hidden focus:bg-white focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Default Password</label>
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Default: pandit12345678"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono outline-hidden focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateShopOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
                >
                  Provision Branch &amp; Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
