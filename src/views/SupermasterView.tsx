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
  Eye,
  EyeOff,
  Copy,
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
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [createdBranchNotice, setCreatedBranchNotice] = useState<{
    shopName: string;
    username: string;
    password: string;
    mobile: string;
  } | null>(null);
  const [shopError, setShopError] = useState<string | null>(null);

  // Edit Store Branch State
  const [isEditShopOpen, setIsEditShopOpen] = useState(false);
  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [editShopName, setEditShopName] = useState('');
  const [editShopCode, setEditShopCode] = useState('');
  const [editGstin, setEditGstin] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editState, setEditState] = useState('');
  const [editPincode, setEditPincode] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editUpiId, setEditUpiId] = useState('');
  const [editReceiptFooter, setEditReceiptFooter] = useState('');

  const refreshUsers = () => {
    setAllUsers(StorageService.getUsers());
    onRefreshData();
  };

  const handleOpenEditShop = (shop: Shop) => {
    setEditingShop(shop);
    setEditShopName(shop.name);
    setEditShopCode(shop.code);
    setEditGstin(shop.gstin || '');
    setEditAddress(shop.address || '');
    setEditCity(shop.city || '');
    setEditState(shop.state || '');
    setEditPincode(shop.pincode || '');
    setEditPhone(shop.phonePrimary || '');
    setEditUpiId(shop.upiId || '');
    setEditReceiptFooter(shop.receiptFooter || '');
    setIsEditShopOpen(true);
  };

  const handleSaveEditShop = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShop) return;

    const updatedShop: Shop = {
      ...editingShop,
      name: editShopName.trim(),
      code: (editShopCode.trim() || 'STORE').toUpperCase(),
      gstin: editGstin.trim().toUpperCase(),
      address: editAddress.trim(),
      city: editCity.trim(),
      state: editState.trim(),
      pincode: editPincode.trim(),
      phonePrimary: editPhone.trim(),
      upiId: editUpiId.trim(),
      receiptFooter: editReceiptFooter.trim(),
    };

    StorageService.saveShop(updatedShop);
    setIsEditShopOpen(false);
    refreshUsers();
  };

  const handleDeleteShop = (shop: Shop) => {
    if (shops.length <= 1) {
      alert('Cannot delete the only remaining store branch.');
      return;
    }
    if (
      window.confirm(
        `Are you sure you want to permanently delete store branch "${shop.name}" (${shop.code})? All associated products, stock, and invoices in this store will be deleted.`
      )
    ) {
      StorageService.deleteShop(shop.id);
      const remainingShops = StorageService.getShops();
      if (shop.id === currentShop.id && remainingShops.length > 0) {
        onSelectShop(remainingShops[0]);
      }
      refreshUsers();
    }
  };

  const handleResetToCleanSlate = () => {
    if (
      window.confirm(
        '⚠️ Are you sure you want to RESET ALL DATA to a clean slate? This will remove all demo products, demo invoices, demo customers, and Sivakasi demo stores. Your Supermaster account (tushar.paliwal01) will remain active.'
      )
    ) {
      StorageService.resetToCleanSlate();
      const freshShops = StorageService.getShops();
      if (freshShops.length > 0) {
        onSelectShop(freshShops[0]);
      }
      refreshUsers();
    }
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

    const cleanUsername = formUsername.trim().replace(/^@/, '').toLowerCase();
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

    const cleanShopName = shopName.trim();
    const cleanAdminUsername = adminUsername.trim().replace(/^@/, '').toLowerCase();
    const cleanAdminMobile = adminMobile.trim();
    const cleanAdminPassword = adminPassword.trim() || 'admin123';

    if (!cleanShopName || !cleanAdminUsername || !cleanAdminMobile) {
      setShopError('Shop Name, Admin Username, and Admin Mobile are required.');
      return;
    }

    const newShopId = `shop-${Date.now()}`;
    const newShop: Shop = {
      id: newShopId,
      name: cleanShopName,
      code: (shopCode.trim() || cleanShopName.slice(0, 3)).toUpperCase(),
      gstin: (gstin.trim() || '07AAAAA0000A1Z5').toUpperCase(),
      address: 'Shop No. 1, Central Commercial Market',
      city: city.trim() || 'New Delhi',
      state: 'Delhi',
      pincode: '110001',
      phonePrimary: phone.trim() || '+91 98765 00000',
      email: `${cleanAdminUsername}@retailpos.com`,
      upiId: `${cleanAdminUsername}@upi`,
      receiptFooter: 'Thank you for shopping with us! Please visit again.',
      defaultPaperWidth: '80mm',
      defaultPrinterQueue: 'RETSOL RTP82',
      createdAt: new Date().toISOString(),
      active: true,
    };

    const newAdminUser: User = {
      id: `user-${Date.now()}`,
      shopId: newShopId,
      username: cleanAdminUsername,
      password: cleanAdminPassword,
      fullName: adminFullName.trim() || cleanAdminUsername,
      mobile: cleanAdminMobile,
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

    // Show credential card notice
    setCreatedBranchNotice({
      shopName: newShop.name,
      username: newAdminUser.username,
      password: newAdminUser.password || 'pandit12345678',
      mobile: newAdminUser.mobile,
    });

    // Reset Form
    setShopName('');
    setShopCode('');
    setGstin('');
    setCity('');
    setPhone('');
    setAdminUsername('');
    setAdminFullName('');
    setAdminMobile('');
    setAdminPassword('pandit12345678');
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

      {/* Success Notification for Newly Provisioned Branch & Admin Credentials */}
      {createdBranchNotice && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl text-emerald-950 flex items-start justify-between gap-4 animate-in fade-in duration-200 shadow-sm">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-sm text-emerald-900">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Store Branch &amp; Admin Account Provisioned Successfully!</span>
            </div>
            <p className="text-xs text-emerald-800">
              Branch Name: <strong>{createdBranchNotice.shopName}</strong>
            </p>
            <div className="p-3 bg-white border border-emerald-200 rounded-xl text-xs font-mono space-y-1 text-slate-800 shadow-2xs">
              <div>Username: <strong className="text-orange-600 text-sm">@{createdBranchNotice.username}</strong></div>
              <div>Password: <strong className="text-slate-900 text-sm">{createdBranchNotice.password}</strong></div>
              <div>Mobile: <strong className="text-slate-900">{createdBranchNotice.mobile}</strong></div>
            </div>
            <p className="text-[11px] text-emerald-700">
              ✓ Credentials are fully active. The new branch administrator can log in directly on the login screen using this username/mobile and password.
            </p>
          </div>
          <button
            onClick={() => setCreatedBranchNotice(null)}
            className="p-1.5 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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

                        <td className="py-3 px-3 font-mono text-[11px] text-slate-700">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-800">
                              {revealedPasswords[u.id] ? u.password || '123456' : '••••••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setRevealedPasswords((prev) => ({ ...prev, [u.id]: !prev[u.id] }))
                              }
                              title={revealedPasswords[u.id] ? 'Hide password' : 'View password'}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer"
                            >
                              {revealedPasswords[u.id] ? (
                                <EyeOff className="w-3.5 h-3.5" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
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
          {/* Supermaster Data Management Bar */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 text-amber-900 rounded-xl">
                <Store className="w-5 h-5 text-amber-800" />
              </div>
              <div>
                <h4 className="font-bold text-amber-950 text-sm">Store Branches ({shops.length})</h4>
                <p className="text-amber-800/80 text-[11px] mt-0.5">
                  Configure store identity, edit branch addresses, or reset all demo products to a clean slate.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleResetToCleanSlate}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer shrink-0 text-xs"
              title="Wipe demo items, demo invoices, demo customers and reset to fresh clean slate"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Reset to Clean Slate</span>
            </button>
          </div>

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
                        <span className="font-mono">{s.gstin || 'Unspecified'}</span>
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

                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-500 font-medium truncate max-w-[200px]">
                      {s.city}, {s.state} · {s.phonePrimary}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEditShop(s)}
                        className="p-1.5 text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors cursor-pointer border border-slate-200"
                        title="Edit store branch name, address, GSTIN, and receipts"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {shops.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteShop(s)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer border border-slate-200"
                          title="Delete store branch"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {!isCurrent ? (
                        <button
                          onClick={() => onSelectShop(s)}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Switch Context
                        </button>
                      ) : (
                        <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 px-2 py-1 bg-emerald-50 rounded-lg border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Active</span>
                        </span>
                      )}
                    </div>
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
                    <div className="relative">
                      <input
                        type={showFormPassword ? 'text' : 'password'}
                        value={formPassword}
                        onChange={(e) => setFormPassword(e.target.value)}
                        placeholder="Enter security password"
                        required
                        className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-hidden focus:bg-white focus:border-orange-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowFormPassword(!showFormPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        {showFormPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
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
                    <label className="block text-slate-700 font-medium mb-1">Admin Password *</label>
                    <div className="relative">
                      <input
                        type={showAdminPassword ? 'text' : 'password'}
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="Default: pandit12345678"
                        required
                        className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono outline-hidden focus:bg-white focus:border-orange-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAdminPassword(!showAdminPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        {showAdminPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
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
      {/* MODAL: Edit Store Branch Details */}
      {isEditShopOpen && editingShop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-orange-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Edit Store Branch: {editingShop.name}
                </h3>
              </div>
              <button
                onClick={() => setIsEditShopOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditShop} className="p-6 space-y-4 text-xs">
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-slate-700 font-semibold mb-1">Store Name *</label>
                    <input
                      type="text"
                      value={editShopName}
                      onChange={(e) => setEditShopName(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-hidden focus:bg-white focus:border-orange-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Branch Code *</label>
                    <input
                      type="text"
                      value={editShopCode}
                      onChange={(e) => setEditShopCode(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono uppercase outline-hidden focus:bg-white focus:border-orange-500 font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">GSTIN Number</label>
                    <input
                      type="text"
                      value={editGstin}
                      onChange={(e) => setEditGstin(e.target.value)}
                      placeholder="e.g. 07AAAAA0000A1Z5"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-hidden focus:bg-white focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Primary Phone</label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-hidden focus:bg-white focus:border-orange-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Store Address</label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    placeholder="Shop No., Market / Area"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-hidden focus:bg-white focus:border-orange-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">City</label>
                    <input
                      type="text"
                      value={editCity}
                      onChange={(e) => setEditCity(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-hidden focus:bg-white focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">State</label>
                    <input
                      type="text"
                      value={editState}
                      onChange={(e) => setEditState(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-hidden focus:bg-white focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Pincode</label>
                    <input
                      type="text"
                      value={editPincode}
                      onChange={(e) => setEditPincode(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-hidden focus:bg-white focus:border-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">UPI ID for Invoices / QR</label>
                  <input
                    type="text"
                    value={editUpiId}
                    onChange={(e) => setEditUpiId(e.target.value)}
                    placeholder="e.g. storename@upi"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-hidden focus:bg-white focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Printed Receipt Footer</label>
                  <textarea
                    rows={2}
                    value={editReceiptFooter}
                    onChange={(e) => setEditReceiptFooter(e.target.value)}
                    placeholder="Thank you for shopping with us! Please visit again."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-hidden focus:bg-white focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditShopOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
                >
                  Save Store Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
