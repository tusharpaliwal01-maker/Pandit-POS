import React, { useState } from 'react';
import { UserCheck, Plus, UserX, Shield, KeyRound, Phone, X, Check } from 'lucide-react';
import { User, Shop } from '../types';
import { StorageService } from '../services/storage';

interface StaffViewProps {
  shop: Shop;
  users: User[];
  currentUserId: string;
  onRefreshData: () => void;
}

export const StaffView: React.FC<StaffViewProps> = ({
  shop,
  users,
  currentUserId,
  onRefreshData,
}) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'STAFF'>('STAFF');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleOpenAdd = () => {
    setEditingUser(null);
    setUsername('');
    setFullName('');
    setMobile('');
    setRole('STAFF');
    setPassword('123456');
    setError(null);
    setIsAddOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setUsername(user.username);
    setFullName(user.fullName);
    setMobile(user.mobile);
    setRole(user.role as any);
    setPassword('');
    setError(null);
    setIsAddOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !mobile.trim()) {
      setError('Username and mobile are required.');
      return;
    }

    const newUser: User = {
      id: editingUser ? editingUser.id : `user-${Date.now()}`,
      shopId: shop.id,
      username: username.trim().toLowerCase(),
      fullName: fullName.trim() || username.trim(),
      mobile: mobile.trim(),
      role,
      active: true,
      createdAt: editingUser ? editingUser.createdAt : new Date().toISOString(),
    };

    StorageService.saveUser(newUser);
    onRefreshData();
    setIsAddOpen(false);
  };

  const handleToggleActive = (user: User) => {
    if (user.id === currentUserId) {
      alert('You cannot deactivate your own active session account.');
      return;
    }
    const updated = { ...user, active: !user.active };
    StorageService.saveUser(updated);
    onRefreshData();
  };

  const handleDelete = (userId: string) => {
    if (userId === currentUserId) {
      alert('You cannot delete your own active account.');
      return;
    }
    if (window.confirm('Are you sure you want to remove this staff user?')) {
      StorageService.deleteUser(userId);
      onRefreshData();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-orange-600" />
            <span>Staff Accounts &amp; Cashier Logins</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage cashier POS access, supervisor authorizations, and role permissions.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Staff Member</span>
        </button>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
            <tr>
              <th className="py-3 px-4">Staff Name &amp; Username</th>
              <th className="py-3 px-3">Mobile Number</th>
              <th className="py-3 px-3">Assigned Role</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3">Created Date</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                <td className="py-3 px-4">
                  <div className="font-semibold text-slate-900">{u.fullName}</div>
                  <div className="text-[11px] font-mono text-slate-500">@{u.username}</div>
                </td>

                <td className="py-3 px-3 font-mono text-slate-600">{u.mobile}</td>

                <td className="py-3 px-3">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                      u.role === 'ADMIN'
                        ? 'bg-purple-100 text-purple-800'
                        : u.role === 'SUPERMASTER'
                        ? 'bg-amber-100 text-amber-900'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    <Shield className="w-3 h-3" />
                    {u.role}
                  </span>
                </td>

                <td className="py-3 px-3">
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                      u.active ? 'text-emerald-600' : 'text-slate-400'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        u.active ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                    />
                    {u.active ? 'Active' : 'Disabled'}
                  </span>
                </td>

                <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>

                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleToggleActive(u)}
                      className="text-xs text-slate-600 hover:text-slate-900 font-medium"
                    >
                      {u.active ? 'Deactivate' : 'Activate'}
                    </button>
                    <span>·</span>
                    <button
                      onClick={() => handleOpenEdit(u)}
                      className="text-xs text-orange-600 hover:text-orange-700 font-medium"
                    >
                      Edit
                    </button>
                    {u.id !== currentUserId && (
                      <>
                        <span>·</span>
                        <button
                          onClick={() => handleDelete(u.id)}
                          className="text-xs text-rose-600 hover:text-rose-700 font-medium"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Staff Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-semibold text-slate-900 text-sm">
                {editingUser ? 'Edit Staff Account' : 'Create Staff Member'}
              </h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 space-y-3.5">
              {error && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  required
                  autoFocus
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. ramesh1"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono outline-none focus:bg-white focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="10-digit number"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono outline-none focus:bg-white focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Role *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white"
                >
                  <option value="STAFF">STAFF (POS Billing &amp; Khata Only)</option>
                  <option value="ADMIN">ADMIN (Full Store Management &amp; Stock)</option>
                </select>
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Default Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Default: 123456"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono outline-none focus:bg-white focus:border-orange-500"
                  />
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
