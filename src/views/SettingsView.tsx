import React, { useState, useRef } from 'react';
import {
  Settings,
  Save,
  CheckCircle2,
  QrCode,
  Store,
  Printer,
  Tag,
  Database,
  Download,
  Upload,
  FileJson,
  AlertTriangle,
  RefreshCw,
  FileCheck,
  HardDrive,
  ShieldCheck,
  Trash2,
  Info,
  Clock,
  Layers,
} from 'lucide-react';
import { Shop, BackupData } from '../types';
import { StorageService } from '../services/storage';

interface SettingsViewProps {
  shop: Shop;
  onRefreshData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ shop, onRefreshData }) => {
  const hw = StorageService.getHardwareConfig();
  const [name, setName] = useState(shop.name);
  const [gstin, setGstin] = useState(shop.gstin);
  const [address, setAddress] = useState(shop.address);
  const [city, setCity] = useState(shop.city);
  const [state, setState] = useState(shop.state);
  const [pincode, setPincode] = useState(shop.pincode);
  const [phonePrimary, setPhonePrimary] = useState(shop.phonePrimary);
  const [phoneSecondary, setPhoneSecondary] = useState(shop.phoneSecondary || '');
  const [email, setEmail] = useState(shop.email);
  const [upiId, setUpiId] = useState(shop.upiId);
  const [receiptFooter, setReceiptFooter] = useState(shop.receiptFooter);
  const [defaultPaperWidth, setDefaultPaperWidth] = useState<'80mm' | '58mm'>(
    shop.defaultPaperWidth || '80mm'
  );
  const [defaultPrinterQueue, setDefaultPrinterQueue] = useState(
    hw.retsolQueue || StorageService.getPrinterQueue()
  );
  const [tscQueue, setTscQueue] = useState(hw.tscQueue || 'TSC TE244');
  const [autoCut, setAutoCut] = useState(hw.autoCut ?? true);
  const [cashDrawerOnSale, setCashDrawerOnSale] = useState(hw.cashDrawerOnSale ?? false);
  const [buzzerOnSale, setBuzzerOnSale] = useState(hw.buzzerOnSale ?? true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Backup & Restore State
  const [dbSummary, setDbSummary] = useState(() => StorageService.getDatabaseSummary());
  const [isExporting, setIsExporting] = useState(false);
  const [lastExportTime, setLastExportTime] = useState<string | null>(null);
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [parsedBackup, setParsedBackup] = useState<BackupData | null>(null);
  const [restoreMode, setRestoreMode] = useState<'replace' | 'merge'>('replace');
  const [restoreStatus, setRestoreStatus] = useState<{
    type: 'success' | 'error';
    message: string;
    stats?: any;
  } | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const refreshSummary = () => {
    setDbSummary(StorageService.getDatabaseSummary());
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const updatedShop: Shop = {
      ...shop,
      name: name.trim(),
      gstin: gstin.trim().toUpperCase(),
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      phonePrimary: phonePrimary.trim(),
      phoneSecondary: phoneSecondary.trim() || undefined,
      email: email.trim(),
      upiId: upiId.trim(),
      receiptFooter: receiptFooter.trim(),
      defaultPaperWidth,
      defaultPrinterQueue: defaultPrinterQueue.trim(),
    };

    StorageService.saveShop(updatedShop);
    StorageService.setPrinterQueue(defaultPrinterQueue.trim());
    StorageService.saveHardwareConfig({
      retsolQueue: defaultPrinterQueue.trim(),
      tscQueue: tscQueue.trim(),
      paperWidth: defaultPaperWidth,
      autoCut,
      cashDrawerOnSale,
      buzzerOnSale,
    });
    onRefreshData();

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-orange-600" />
            <span>Store Profile &amp; Receipt Configuration</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure business identity, GSTIN tax credentials, UPI payment handles, and thermal roll layouts.
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Settings Saved Successfully!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Business Identity */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100">
            <Store className="w-4 h-4 text-orange-600" />
            <span>Shop Identity &amp; Tax Registration</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Store / Business Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:bg-white focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">
                GSTIN (Goods &amp; Services Tax ID) *
              </label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                required
                placeholder="e.g. 07AAECP1234F1Z5"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold outline-none focus:bg-white focus:border-orange-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-slate-700 font-medium mb-1">
                Shop Address (Printed on Receipts) *
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">City *</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">State &amp; Pincode *</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="State"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:border-orange-500"
                />
                <input
                  type="text"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="Pincode"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono outline-none focus:bg-white focus:border-orange-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Primary Phone *</label>
              <input
                type="text"
                value={phonePrimary}
                onChange={(e) => setPhonePrimary(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono outline-none focus:bg-white focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Support Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:border-orange-500"
              />
            </div>
          </div>
        </div>

        {/* Payment & Hardware Preferences */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100">
            <Printer className="w-4 h-4 text-orange-600" />
            <span>Thermal Receipt &amp; Digital Payments (UPI)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Shop UPI ID (for QR Code) *</label>
              <div className="relative">
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. panditfireworks@upi"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-semibold outline-none focus:bg-white focus:border-orange-500"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Used to generate instant UPI billing QR code.</p>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">
                Receipt Printer: Default Paper Width
              </label>
              <select
                value={defaultPaperWidth}
                onChange={(e) => setDefaultPaperWidth(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white font-medium"
              >
                <option value="80mm">80 mm Standard Thermal Roll (RETSOL RTP82 Recommended)</option>
                <option value="58mm">58 mm Compact Thermal Roll</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">
                Receipt Printer Queue (RETSOL)
              </label>
              <input
                type="text"
                value={defaultPrinterQueue}
                onChange={(e) => setDefaultPrinterQueue(e.target.value)}
                placeholder="e.g. RETSOL RTP82"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono outline-none focus:bg-white"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Thermal queue for sales receipts.
              </p>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">
                Barcode Label Printer Queue (TSC)
              </label>
              <input
                type="text"
                value={tscQueue}
                onChange={(e) => setTscQueue(e.target.value)}
                placeholder="e.g. TSC TE244"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono outline-none focus:bg-white"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Label printer for 100×25mm CODE128 continuous sticker rolls.
              </p>
            </div>

            <div className="md:col-span-2 pt-2 border-t border-slate-100 flex flex-wrap gap-4 text-xs text-slate-700">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoCut}
                  onChange={(e) => setAutoCut(e.target.checked)}
                  className="rounded text-orange-600 focus:ring-orange-500"
                />
                <span>Auto-cut paper at end of receipt (RETSOL)</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cashDrawerOnSale}
                  onChange={(e) => setCashDrawerOnSale(e.target.checked)}
                  className="rounded text-orange-600 focus:ring-orange-500"
                />
                <span>Auto-kick RJ11 Cash Drawer on Cash Sale</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={buzzerOnSale}
                  onChange={(e) => setBuzzerOnSale(e.target.checked)}
                  className="rounded text-orange-600 focus:ring-orange-500"
                />
                <span>Beep hardware buzzer when bill prints</span>
              </label>
            </div>

            <div className="md:col-span-2">
              <label className="block text-slate-700 font-medium mb-1">
                Receipt Footer / Festival Greeting Note
              </label>
              <textarea
                value={receiptFooter}
                onChange={(e) => setReceiptFooter(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:border-orange-500 leading-relaxed"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Save Store Settings</span>
          </button>
        </div>
      </form>

      {/* ========================================================= */}
      {/* DATABASE BACKUP, RESTORE & DATA PORTABILITY SECTION */}
      {/* ========================================================= */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Section Header */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-orange-100 text-orange-700 rounded-lg">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Database Backup &amp; Restore</span>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-semibold rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Portable JSON
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Export complete shop data (inventory, sales receipts, customer Khata, hardware configs) as JSON, and import back anytime.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={refreshSummary}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition-colors"
            title="Refresh database statistics"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Refresh Stats</span>
          </button>
        </div>

        {/* Status Notification */}
        {restoreStatus && (
          <div
            className={`mx-6 mt-6 p-4 rounded-xl border flex items-start gap-3 text-xs animate-in fade-in ${
              restoreStatus.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            {restoreStatus.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="font-bold">
                {restoreStatus.type === 'success' ? 'Operation Completed' : 'Operation Failed'}
              </div>
              <p className="mt-0.5 opacity-90">{restoreStatus.message}</p>
            </div>
            <button
              onClick={() => setRestoreStatus(null)}
              className="text-slate-400 hover:text-slate-700 text-sm"
            >
              ×
            </button>
          </div>
        )}

        <div className="p-6 space-y-6">
          {/* Database Live Health & Counts */}
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center justify-between">
              <span>Current Stored Records</span>
              <span className="font-mono text-slate-400 font-normal">
                Est. Size: ~{dbSummary.estimatedSizeKb} KB
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200/80">
                <span className="text-[10px] text-slate-500 font-medium block">Products</span>
                <span className="text-base font-bold font-mono text-slate-900">{dbSummary.totalProducts}</span>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200/80">
                <span className="text-[10px] text-slate-500 font-medium block">Sales Invoices</span>
                <span className="text-base font-bold font-mono text-slate-900">{dbSummary.totalInvoices}</span>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200/80">
                <span className="text-[10px] text-slate-500 font-medium block">Customers</span>
                <span className="text-base font-bold font-mono text-slate-900">{dbSummary.totalCustomers}</span>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200/80">
                <span className="text-[10px] text-slate-500 font-medium block">Khata Entries</span>
                <span className="text-base font-bold font-mono text-slate-900">{dbSummary.totalKhataEntries}</span>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200/80 col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-500 font-medium block">Shops / Users</span>
                <span className="text-base font-bold font-mono text-slate-900">
                  {dbSummary.totalShops} / {dbSummary.totalUsers}
                </span>
              </div>
            </div>
          </div>

          {/* Export & Import 2-Column Split */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* 1. EXPORT COLUMN */}
            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 mb-1">
                  <Download className="w-4 h-4 text-orange-600" />
                  <span>Export Database Backup (.JSON)</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Generate a complete, uncompressed JSON backup file. Includes product catalog, batch numbers, tax rates, sales bills, customer Khata ledger, and printer hardware configurations.
                </p>

                <div className="mt-3.5 space-y-2 text-[11px] text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Self-contained portable JSON file</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Safe to store on USB drives, local PC, or Google Drive</span>
                  </div>
                  {lastExportTime && (
                    <div className="flex items-center gap-1.5 text-orange-700 font-medium mt-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Last exported at {lastExportTime}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      setIsExporting(true);
                      const backup = StorageService.exportBackup(shop.id);
                      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
                        JSON.stringify(backup, null, 2)
                      )}`;
                      const downloadAnchor = document.createElement('a');
                      const timestamp = new Date()
                        .toISOString()
                        .replace(/[:.]/g, '-')
                        .slice(0, 19);
                      downloadAnchor.setAttribute('href', jsonString);
                      downloadAnchor.setAttribute(
                        'download',
                        `pandit_pos_backup_${shop.code || 'MAIN'}_${timestamp}.json`
                      );
                      document.body.appendChild(downloadAnchor);
                      downloadAnchor.click();
                      downloadAnchor.remove();

                      setLastExportTime(new Date().toLocaleTimeString());
                      setRestoreStatus({
                        type: 'success',
                        message: `Database backup file generated successfully (${backup.summary.totalProducts} products, ${backup.summary.totalInvoices} invoices, ${backup.summary.totalCustomers} customers).`,
                      });
                    } catch (err: any) {
                      setRestoreStatus({
                        type: 'error',
                        message: `Export failed: ${err.message || 'Unknown error'}`,
                      });
                    } finally {
                      setIsExporting(false);
                    }
                  }}
                  disabled={isExporting}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 active:scale-[0.99] text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{isExporting ? 'Generating JSON...' : 'Download JSON Backup'}</span>
                </button>
              </div>
            </div>

            {/* 2. IMPORT / RESTORE COLUMN */}
            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 mb-1">
                  <Upload className="w-4 h-4 text-blue-600" />
                  <span>Import / Restore Database (.JSON)</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Upload a previously exported PANDIT POS backup file. You can choose whether to completely overwrite the current data or safely merge records.
                </p>

                {/* File Selector Dropzone */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    setRestoreStatus(null);
                    setBackupFile(file);

                    const reader = new FileReader();
                    reader.onload = (event) => {
                      try {
                        const text = event.target?.result as string;
                        const parsed = JSON.parse(text);

                        if (!parsed || typeof parsed !== 'object' || !parsed.data) {
                          throw new Error(
                            'Invalid backup file: Missing "data" structure. Ensure this is a valid PANDIT POS JSON backup.'
                          );
                        }

                        setParsedBackup(parsed);
                      } catch (err: any) {
                        setBackupFile(null);
                        setParsedBackup(null);
                        setRestoreStatus({
                          type: 'error',
                          message: `Failed to parse backup file: ${err.message || 'Invalid JSON syntax'}`,
                        });
                      }
                    };
                    reader.readAsText(file);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="hidden"
                />

                <div className="mt-3.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-3 px-4 border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/40 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                  >
                    <FileJson className="w-4 h-4 text-blue-600" />
                    <span>{backupFile ? `Selected: ${backupFile.name}` : 'Select Backup JSON File'}</span>
                  </button>
                </div>
              </div>

              {/* Ready to restore state or placeholder notice */}
              <div>
                {backupFile && parsedBackup ? (
                  <div className="space-y-3">
                    {/* Safe Preview Box */}
                    <div className="p-3 bg-white rounded-lg border border-blue-200 text-xs space-y-2">
                      <div className="flex items-center justify-between font-semibold text-slate-800">
                        <span className="flex items-center gap-1.5 text-blue-700">
                          <FileCheck className="w-4 h-4 text-blue-600" />
                          <span>File Verified Ready</span>
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {parsedBackup.exportedAt
                            ? new Date(parsedBackup.exportedAt).toLocaleDateString()
                            : 'Valid Backup'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                        <span>📦 Products: <strong>{parsedBackup.data?.products?.length || 0}</strong></span>
                        <span>🧾 Invoices: <strong>{parsedBackup.data?.invoices?.length || 0}</strong></span>
                        <span>👥 Customers: <strong>{parsedBackup.data?.customers?.length || 0}</strong></span>
                        <span>📒 Khata: <strong>{parsedBackup.data?.khataEntries?.length || 0}</strong></span>
                      </div>

                      {/* Restore Mode Radios */}
                      <div className="pt-2 border-t border-slate-100 space-y-1.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block">
                          Select Restore Mode:
                        </span>
                        <label className="flex items-start gap-2 text-xs cursor-pointer">
                          <input
                            type="radio"
                            name="restoreMode"
                            checked={restoreMode === 'replace'}
                            onChange={() => setRestoreMode('replace')}
                            className="mt-0.5 text-orange-600 focus:ring-orange-500"
                          />
                          <div>
                            <span className="font-semibold text-slate-800 block">
                              Full Replace (Overwrite)
                            </span>
                            <span className="text-[11px] text-slate-500 leading-tight block">
                              Replaces current database with file contents (standard for restoring backups).
                            </span>
                          </div>
                        </label>

                        <label className="flex items-start gap-2 text-xs cursor-pointer">
                          <input
                            type="radio"
                            name="restoreMode"
                            checked={restoreMode === 'merge'}
                            onChange={() => setRestoreMode('merge')}
                            className="mt-0.5 text-orange-600 focus:ring-orange-500"
                          />
                          <div>
                            <span className="font-semibold text-slate-800 block">
                              Merge &amp; Sync (Append)
                            </span>
                            <span className="text-[11px] text-slate-500 leading-tight block">
                              Keeps existing records and adds new products/invoices without deleting anything.
                            </span>
                          </div>
                        </label>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setBackupFile(null);
                          setParsedBackup(null);
                        }}
                        className="px-3 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-medium"
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (!parsedBackup) return;
                          if (
                            restoreMode === 'replace' &&
                            !window.confirm(
                              'Warning: Full Replace mode will overwrite your current inventory and invoice database with the backup file. Proceed?'
                            )
                          ) {
                            return;
                          }

                          try {
                            const result = StorageService.importBackup(parsedBackup, restoreMode);
                            setDbSummary(StorageService.getDatabaseSummary());
                            onRefreshData();

                            setRestoreStatus({
                              type: 'success',
                              message: `${result.message} Loaded ${result.stats.products} products, ${result.stats.invoices} invoices, and ${result.stats.customers} customers.`,
                              stats: result.stats,
                            });

                            setParsedBackup(null);
                            setBackupFile(null);
                          } catch (err: any) {
                            setRestoreStatus({
                              type: 'error',
                              message: `Restore failed: ${err.message || 'Unknown error'}`,
                            });
                          }
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Confirm &amp; Restore Database</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 text-center py-1">
                    Select a JSON backup file above to preview and restore.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Factory Reset Danger Zone */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Reset to Factory Defaults</span>
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Clears custom local test transactions and re-seeds original catalog and sample Khata ledgers.
              </p>
            </div>

            {!isResetConfirmOpen ? (
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(true)}
                className="px-3.5 py-1.5 border border-rose-200 hover:bg-rose-50 text-rose-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                Reset Demo Data
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-rose-700 font-bold">Are you sure?</span>
                <button
                  type="button"
                  onClick={() => {
                    StorageService.resetToFactoryDefaults();
                    setDbSummary(StorageService.getDatabaseSummary());
                    onRefreshData();
                    setIsResetConfirmOpen(false);
                    setRestoreStatus({
                      type: 'success',
                      message: 'Database reset to factory default seed data successfully.',
                    });
                    setTimeout(() => setRestoreStatus(null), 4000);
                  }}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-2xs cursor-pointer"
                >
                  Yes, Reset
                </button>
                <button
                  type="button"
                  onClick={() => setIsResetConfirmOpen(false)}
                  className="px-2.5 py-1 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg text-xs"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

