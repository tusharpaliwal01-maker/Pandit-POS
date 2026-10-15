import React, { useState, useEffect } from 'react';
import {
  Printer,
  X,
  Check,
  AlertCircle,
  Info,
  Usb,
  Zap,
  Volume2,
  Tag,
  Scissors,
  Download,
  ExternalLink,
  Sliders,
  RotateCcw,
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { Shop, Invoice, HardwareConfig, LabelPrintConfig } from '../../types';
import { ThermalReceipt } from './ThermalReceipt';
import {
  hardwarePrinterManager,
  buildEscPosTestReceipt,
} from '../../utils/hardwarePrinters';
import {
  printReceipt,
  printBarcodeLabels,
  openReceiptInNewTab,
  openLabelsInNewTab,
  downloadRawBinary,
  downloadRawText,
} from '../../utils/printHelper';

interface PrinterTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  shop: Shop;
}

export const PrinterTestModal: React.FC<PrinterTestModalProps> = ({
  isOpen,
  onClose,
  shop,
}) => {
  const [activeTab, setActiveTab] = useState<'retsol' | 'tsc'>('retsol');
  const [config, setConfig] = useState<HardwareConfig>(() => StorageService.getHardwareConfig());
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  // Serial status
  const [isRetsolConnected, setIsRetsolConnected] = useState(hardwarePrinterManager.isConnected('RETSOL'));
  const [isTscConnected, setIsTscConnected] = useState(hardwarePrinterManager.isConnected('TSC'));

  useEffect(() => {
    const unsub = hardwarePrinterManager.subscribe((type, status, msg) => {
      if (type === 'RETSOL') setIsRetsolConnected(status === 'connected');
      if (type === 'TSC') setIsTscConnected(status === 'connected');
      if (msg) {
        setStatusMessage({ type: status === 'error' ? 'error' : 'info', text: msg });
      }
    });
    return unsub;
  }, []);

  if (!isOpen) return null;

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    StorageService.saveHardwareConfig(config);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // Sample Diagnostic Invoice for RETSOL RTP82
  const sampleTestInvoice: Invoice = {
    id: 'test-inv-001',
    shopId: shop.id,
    invoiceNumber: 'TEST-RETSOL-001',
    customerName: 'Thermal Diagnostic Alignment',
    userId: 'test',
    cashierName: 'POS Alignment Diagnostic',
    items: [
      {
        productId: 'p-test-1',
        name: 'Alignment Test - 10cm Sparklers',
        barcode: '890123400001',
        category: 'Test',
        quantity: 1,
        unit: 'box',
        mrp: 65,
        unitPrice: 50,
        discountAmount: 0,
        gstRate: 18,
        gstAmount: 7.63,
        total: 50,
      },
      {
        productId: 'p-test-2',
        name: 'Alignment Test - Ashoka Anar',
        barcode: '890123400004',
        category: 'Test',
        quantity: 2,
        unit: 'box',
        mrp: 290,
        unitPrice: 220,
        discountAmount: 20,
        gstRate: 18,
        gstAmount: 30.51,
        total: 400,
      },
    ],
    subtotal: 470,
    discountTotal: 20,
    gstTotal: 38.14,
    grandTotal: 450,
    paymentMethod: 'CASH',
    cashReceived: 500,
    changeGiven: 50,
    status: 'PAID',
    createdAt: new Date().toISOString(),
  };

  // RETSOL Actions
  const handleConnectRetsol = async () => {
    const ok = await hardwarePrinterManager.connect('RETSOL', config.baudRateRetsol);
    if (ok) {
      setStatusMessage({ type: 'success', text: `RETSOL RTP82 connected on USB/COM port (${config.baudRateRetsol} baud)` });
    }
  };

  const handleDisconnectRetsol = async () => {
    await hardwarePrinterManager.disconnect('RETSOL');
  };

  const handlePrintRetsolTest = async () => {
    setStatusMessage({ type: 'info', text: 'Printing RETSOL RTP82 test receipt...' });
    const res = await printReceipt(sampleTestInvoice, shop, config.paperWidth, {
      kickDrawer: config.cashDrawerOnSale,
      autoCut: config.autoCut,
      buzzer: config.buzzerOnSale,
    });
    setStatusMessage({
      type: res.success ? 'success' : 'error',
      text: res.message || 'Test receipt printed.',
    });
  };

  const handleKickDrawer = async () => {
    const ok = await hardwarePrinterManager.kickCashDrawer();
    if (ok) {
      setStatusMessage({ type: 'success', text: 'Cash Drawer kick pulse sent to RETSOL RJ11!' });
    } else {
      setStatusMessage({ type: 'info', text: 'Connect RETSOL via Web Serial to send cash drawer pulse.' });
    }
  };

  const handleCutPaper = async () => {
    const ok = await hardwarePrinterManager.cutPaper('partial');
    if (ok) {
      setStatusMessage({ type: 'success', text: 'Auto-cut signal sent to RETSOL cutter!' });
    } else {
      setStatusMessage({ type: 'info', text: 'Connect RETSOL via Web Serial to test auto-cut.' });
    }
  };

  const handleBuzzer = async () => {
    const ok = await hardwarePrinterManager.soundBuzzer(2);
    if (ok) {
      setStatusMessage({ type: 'success', text: 'Buzzer beep sent to RETSOL printer!' });
    } else {
      setStatusMessage({ type: 'info', text: 'Connect RETSOL via Web Serial to test buzzer.' });
    }
  };

  const handleDownloadEscPos = () => {
    const bytes = buildEscPosTestReceipt(shop, config.paperWidth);
    downloadRawBinary('RETSOL_RTP82_Diagnostic.bin', bytes);
    setStatusMessage({ type: 'success', text: 'Downloaded RETSOL_RTP82_Diagnostic.bin raw binary file.' });
  };

  // TSC Actions
  const handleConnectTsc = async () => {
    const ok = await hardwarePrinterManager.connect('TSC', config.baudRateTsc);
    if (ok) {
      setStatusMessage({ type: 'success', text: `TSC TE244 connected on USB/COM port (${config.baudRateTsc} baud)` });
    }
  };

  const handleDisconnectTsc = async () => {
    await hardwarePrinterManager.disconnect('TSC');
  };

  const sampleLabelConfig: LabelPrintConfig = {
    labelSize: '100x25',
    layoutMode: '2-up',
    offsetX: 0,
    offsetY: 0,
    showShopName: true,
    showMrp: true,
    showSellingPrice: true,
    showBarcodeText: true,
    showBatch: true,
    copiesPerItem: 2,
    density: 10,
    speed: 3,
    gapMm: 2,
  };

  const sampleLabelProducts = [
    {
      product: {
        id: 'tsc-test-1',
        shopId: shop.id,
        name: 'TSC TE244 ALIGNMENT 1',
        barcode: '890123456789',
        category: 'Test',
        purchasePrice: 100,
        mrp: 299,
        sellingPrice: 199,
        gstRate: 18,
        stockQty: 50,
        lowStockThreshold: 10,
        unit: 'box',
        active: true,
      },
      copies: 2,
    },
    {
      product: {
        id: 'tsc-test-2',
        shopId: shop.id,
        name: 'TSC TE244 ALIGNMENT 2',
        barcode: '890987654321',
        category: 'Test',
        purchasePrice: 200,
        mrp: 599,
        sellingPrice: 449,
        gstRate: 18,
        stockQty: 30,
        lowStockThreshold: 5,
        unit: 'box',
        active: true,
      },
      copies: 2,
    },
  ];

  const handleCalibrateTsc = async () => {
    const ok = await hardwarePrinterManager.calibrateTscSensor();
    if (ok) {
      setStatusMessage({ type: 'success', text: 'Sent GAPDETECT & FORMFEED calibration commands to TSC TE244!' });
    } else {
      setStatusMessage({ type: 'info', text: 'Connect TSC via Web Serial to run sensor gap calibration.' });
    }
  };

  const handleFeedTsc = async () => {
    const ok = await hardwarePrinterManager.feedTscLabel();
    if (ok) {
      setStatusMessage({ type: 'success', text: 'Sent FORMFEED: 1 label sticker fed!' });
    } else {
      setStatusMessage({ type: 'info', text: 'Connect TSC via Web Serial to feed label.' });
    }
  };

  const handleSelfTestTsc = async () => {
    const ok = await hardwarePrinterManager.printTscSelfTest();
    if (ok) {
      setStatusMessage({ type: 'success', text: 'Sent SELFTEST diagnostic command to TSC TE244!' });
    } else {
      setStatusMessage({ type: 'info', text: 'Connect TSC via Web Serial to print self-test.' });
    }
  };

  const handlePrintTscTestLabels = async () => {
    setStatusMessage({ type: 'info', text: 'Dispatching TSC test labels...' });
    const res = await printBarcodeLabels(sampleLabelProducts, sampleLabelConfig, shop);
    setStatusMessage({
      type: res.success ? 'success' : 'error',
      text: res.message || 'TSC test labels printed.',
    });
  };

  const handleDownloadTspl = () => {
    const script = `SIZE 100 mm, 25 mm\r\nGAP 2 mm, 0 mm\r\nSPEED 3\r\nDENSITY 10\r\nDIRECTION 1\r\nCLS\r\nTEXT 20,10,"3",0,1,1,"${shop.name.slice(0, 18)}"\r\nTEXT 20,38,"2",0,1,1,"TSC ALIGNMENT TEST"\r\nBARCODE 20,68,"128",45,1,0,2,2,"890123456789"\r\nTEXT 20,125,"2",0,1,1,"MRP: Rs.299"\r\nTEXT 160,125,"3",0,1,1,"Rs.199"\r\nPRINT 2,1\r\n`;
    downloadRawText('TSC_TE244_Test.prn', script);
    setStatusMessage({ type: 'success', text: 'Downloaded TSC_TE244_Test.prn TSPL script.' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-orange-100 text-orange-700 rounded-lg">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Hardware Printer Station</h3>
              <p className="text-xs text-slate-500">
                Configure, Calibrate &amp; Test <strong>RETSOL RTP82</strong> &amp; <strong>TSC TE244</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-100/70 px-6 pt-2 shrink-0">
          <button
            onClick={() => setActiveTab('retsol')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'retsol'
                ? 'border-orange-600 text-orange-700 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>RETSOL RTP82 (Receipt Printer)</span>
            <span
              className={`w-2 h-2 rounded-full ${isRetsolConnected ? 'bg-emerald-500' : 'bg-slate-400'}`}
              title={isRetsolConnected ? 'Connected via Web Serial' : 'Disconnected'}
            />
          </button>

          <button
            onClick={() => setActiveTab('tsc')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'tsc'
                ? 'border-orange-600 text-orange-700 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>TSC TE244 (Barcode Label Printer)</span>
            <span
              className={`w-2 h-2 rounded-full ${isTscConnected ? 'bg-emerald-500' : 'bg-slate-400'}`}
              title={isTscConnected ? 'Connected via Web Serial' : 'Disconnected'}
            />
          </button>
        </div>

        {/* Status Toast Banner */}
        {statusMessage && (
          <div
            className={`px-6 py-2.5 text-xs flex items-center justify-between border-b shrink-0 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : statusMessage.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-slate-400 hover:text-slate-700 text-sm font-bold ml-2"
            >
              &times;
            </button>
          </div>
        )}

        {/* Scrollable Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* ======================================================== */}
          {/* TAB 1: RETSOL RTP82 THERMAL RECEIPT PRINTER */}
          {/* ======================================================== */}
          {activeTab === 'retsol' && (
            <div className="space-y-5">
              {/* Hardware Connection Card */}
              <div className="bg-slate-900 text-slate-200 rounded-xl p-4 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-white text-sm">
                    <Usb className="w-4 h-4 text-orange-400" />
                    <span>RETSOL RTP82 Direct Serial / USB Connection</span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      isRetsolConnected
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {isRetsolConnected ? '● Connected (Ready)' : '○ Not Connected'}
                  </span>
                </div>

                <p className="text-slate-300 text-xs leading-relaxed">
                  Connect your RETSOL RTP82 printer via USB cable or COM port for direct ESC/POS binary printing, silent fast execution, auto-cutting, and cash drawer kick.
                </p>

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  {isRetsolConnected ? (
                    <button
                      onClick={handleDisconnectRetsol}
                      className="px-3.5 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-semibold transition-colors"
                    >
                      Disconnect Port
                    </button>
                  ) : (
                    <button
                      onClick={handleConnectRetsol}
                      className="px-4 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                      <Usb className="w-3.5 h-3.5" />
                      <span>Connect RETSOL USB/Serial</span>
                    </button>
                  )}

                  <div className="flex items-center gap-2 text-xs text-slate-400 ml-auto">
                    <span>Baud Rate:</span>
                    <select
                      value={config.baudRateRetsol}
                      onChange={(e) =>
                        setConfig({ ...config, baudRateRetsol: parseInt(e.target.value) || 9600 })
                      }
                      className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs outline-none"
                    >
                      <option value="9600">9600 (Standard)</option>
                      <option value="19200">19200</option>
                      <option value="38400">38400</option>
                      <option value="115200">115200</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* RETSOL Diagnostic Tools */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  RETSOL Hardware Diagnostics &amp; Peripherals
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button
                    onClick={handleKickDrawer}
                    className="p-3 bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded-lg text-left transition-colors group"
                  >
                    <Zap className="w-4 h-4 text-amber-500 mb-1 group-hover:scale-110 transition-transform" />
                    <div className="font-bold text-slate-900 text-xs">Kick Cash Drawer</div>
                    <div className="text-[10px] text-slate-500">RJ11 pulse test</div>
                  </button>

                  <button
                    onClick={handleCutPaper}
                    className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-left transition-colors group"
                  >
                    <Scissors className="w-4 h-4 text-slate-700 mb-1 group-hover:scale-110 transition-transform" />
                    <div className="font-bold text-slate-900 text-xs">Test Auto-Cutter</div>
                    <div className="text-[10px] text-slate-500">Feed 4 lines &amp; cut</div>
                  </button>

                  <button
                    onClick={handleBuzzer}
                    className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-left transition-colors group"
                  >
                    <Volume2 className="w-4 h-4 text-blue-600 mb-1 group-hover:scale-110 transition-transform" />
                    <div className="font-bold text-slate-900 text-xs">Sound Buzzer</div>
                    <div className="text-[10px] text-slate-500">Double beep tone</div>
                  </button>

                  <button
                    onClick={handleDownloadEscPos}
                    className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-left transition-colors group"
                  >
                    <Download className="w-4 h-4 text-emerald-600 mb-1 group-hover:scale-110 transition-transform" />
                    <div className="font-bold text-slate-900 text-xs">Download ESC/POS</div>
                    <div className="text-[10px] text-slate-500">Raw .bin binary file</div>
                  </button>
                </div>
              </div>

              {/* Queue & Width Preferences Form */}
              <form onSubmit={handleSavePreferences} className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    RETSOL Print Queue &amp; Preferences
                  </span>
                  <button
                    type="submit"
                    className="flex items-center gap-1 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    {savedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : null}
                    <span>{savedSuccess ? 'Saved' : 'Save Preferences'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Target Queue Name in Windows / OS
                    </label>
                    <input
                      type="text"
                      value={config.retsolQueue}
                      onChange={(e) => setConfig({ ...config, retsolQueue: e.target.value })}
                      placeholder="e.g. RETSOL RTP82"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-xs text-slate-900 outline-none focus:border-orange-500"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Stored in browser localStorage (<code className="font-mono text-slate-700">npf-billing-printer</code>).
                    </p>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Thermal Roll Paper Width
                    </label>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setConfig({ ...config, paperWidth: '80mm' })}
                        className={`flex-1 py-2 px-3 rounded-lg border text-xs font-bold transition-colors ${
                          config.paperWidth === '80mm'
                            ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        80 mm (RTP82 Standard 48-Col)
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfig({ ...config, paperWidth: '58mm' })}
                        className={`flex-1 py-2 px-3 rounded-lg border text-xs font-bold transition-colors ${
                          config.paperWidth === '58mm'
                            ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        58 mm (Compact 32-Col)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Automation Toggles */}
                <div className="flex flex-wrap gap-4 pt-1 text-xs text-slate-700 border-t border-slate-200">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.autoCut}
                      onChange={(e) => setConfig({ ...config, autoCut: e.target.checked })}
                      className="rounded text-orange-600 focus:ring-orange-500"
                    />
                    <span>Automatic Paper Cut on Bill Completion</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.cashDrawerOnSale}
                      onChange={(e) => setConfig({ ...config, cashDrawerOnSale: e.target.checked })}
                      className="rounded text-orange-600 focus:ring-orange-500"
                    />
                    <span>Auto-Kick Cash Drawer on Cash Sale</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.buzzerOnSale}
                      onChange={(e) => setConfig({ ...config, buzzerOnSale: e.target.checked })}
                      className="rounded text-orange-600 focus:ring-orange-500"
                    />
                    <span>Beep Buzzer on Invoice Print</span>
                  </label>
                </div>
              </form>

              {/* Receipt Test Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Diagnostic Test Receipt Preview ({config.paperWidth})
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openReceiptInNewTab(sampleTestInvoice, shop, config.paperWidth)}
                      className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 rounded px-2.5 py-1 bg-white hover:bg-slate-50 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open in New Tab</span>
                    </button>
                    <button
                      onClick={handlePrintRetsolTest}
                      className="flex items-center gap-1.5 px-4 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print Test Receipt</span>
                    </button>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg p-3 bg-slate-100/50 max-h-48 overflow-y-auto flex justify-center">
                  <div className="bg-white p-3 shadow-xs border border-slate-200 rounded-xs">
                    <ThermalReceipt invoice={sampleTestInvoice} shop={shop} paperWidth={config.paperWidth} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: TSC TE244 BARCODE LABEL PRINTER */}
          {/* ======================================================== */}
          {activeTab === 'tsc' && (
            <div className="space-y-5">
              {/* TSC Hardware Connection Card */}
              <div className="bg-slate-900 text-slate-200 rounded-xl p-4 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-white text-sm">
                    <Tag className="w-4 h-4 text-orange-400" />
                    <span>TSC TE244 Direct Serial / USB TSPL2 Connection</span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      isTscConnected
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {isTscConnected ? '● Connected (Ready)' : '○ Not Connected'}
                  </span>
                </div>

                <p className="text-slate-300 text-xs leading-relaxed">
                  Connect your <strong>TSC TE244 (203 DPI)</strong> barcode sticker printer via USB or Virtual COM port. This enables raw TSPL2 command transmission, exact dot placement, media calibration, and continuous roll label feeding.
                </p>

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  {isTscConnected ? (
                    <button
                      onClick={handleDisconnectTsc}
                      className="px-3.5 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-semibold transition-colors"
                    >
                      Disconnect TSC
                    </button>
                  ) : (
                    <button
                      onClick={handleConnectTsc}
                      className="px-4 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                      <Usb className="w-3.5 h-3.5" />
                      <span>Connect TSC TE244 USB</span>
                    </button>
                  )}

                  <div className="flex items-center gap-2 text-xs text-slate-400 ml-auto">
                    <span>Baud Rate:</span>
                    <select
                      value={config.baudRateTsc}
                      onChange={(e) =>
                        setConfig({ ...config, baudRateTsc: parseInt(e.target.value) || 9600 })
                      }
                      className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs outline-none"
                    >
                      <option value="9600">9600 (TSC Default)</option>
                      <option value="19200">19200</option>
                      <option value="38400">38400</option>
                      <option value="57600">57600</option>
                      <option value="115200">115200</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* TSC Calibration & Diagnostic Actions */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  TSC TE244 Hardware Sensor Calibration &amp; Commands
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button
                    onClick={handleCalibrateTsc}
                    className="p-3 bg-slate-50 hover:bg-orange-50 border border-slate-200 hover:border-orange-300 rounded-lg text-left transition-colors group"
                  >
                    <RotateCcw className="w-4 h-4 text-orange-600 mb-1 group-hover:rotate-180 transition-transform duration-300" />
                    <div className="font-bold text-slate-900 text-xs">Gap Sensor Calibrate</div>
                    <div className="text-[10px] text-slate-500">Run GAPDETECT cmd</div>
                  </button>

                  <button
                    onClick={handleFeedTsc}
                    className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-left transition-colors group"
                  >
                    <Sliders className="w-4 h-4 text-slate-700 mb-1 group-hover:scale-110 transition-transform" />
                    <div className="font-bold text-slate-900 text-xs">Feed 1 Label</div>
                    <div className="text-[10px] text-slate-500">Run FORMFEED cmd</div>
                  </button>

                  <button
                    onClick={handleSelfTestTsc}
                    className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-left transition-colors group"
                  >
                    <Printer className="w-4 h-4 text-blue-600 mb-1 group-hover:scale-110 transition-transform" />
                    <div className="font-bold text-slate-900 text-xs">Print Self-Test</div>
                    <div className="text-[10px] text-slate-500">TSC internal pattern</div>
                  </button>

                  <button
                    onClick={handleDownloadTspl}
                    className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-left transition-colors group"
                  >
                    <Download className="w-4 h-4 text-emerald-600 mb-1 group-hover:scale-110 transition-transform" />
                    <div className="font-bold text-slate-900 text-xs">Download TSPL (.prn)</div>
                    <div className="text-[10px] text-slate-500">Direct DOS/Utility file</div>
                  </button>
                </div>
              </div>

              {/* TSC Media Guidelines (100x25mm Dual Column vs 50x25mm) */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-950">
                  <Info className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>TSC TE244 Media Formats in Indian Retail:</span>
                </div>
                <div className="space-y-1.5 text-[11px] text-amber-800 leading-relaxed">
                  <p>
                    • <strong>100 × 25 mm (2-Up):</strong> Most popular standard roll. Contains two 50×25mm stickers per row separated by a 2mm center gap. Set Print Queue scale to 100% and margins to None.
                  </p>
                  <p>
                    • <strong>50 × 25 mm (1-Up):</strong> Single column roll for smaller item tagging.
                  </p>
                  <p>
                    • <strong>Seagull Driver / TSC BarTender Driver:</strong> In driver properties, set Media: Continuous or Die-Cut with 2mm gap.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => openLabelsInNewTab(sampleLabelProducts, sampleLabelConfig, shop)}
                  className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Preview in New Tab</span>
                </button>

                <button
                  onClick={handlePrintTscTestLabels}
                  className="flex items-center gap-2 px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  <span>
                    {isTscConnected ? 'Send TSPL to TSC TE244' : 'Print Test Labels (100×25mm)'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 font-mono">
            {activeTab === 'retsol'
              ? `Target: ${config.retsolQueue} · ${config.paperWidth}`
              : `Target: ${config.tscQueue} · 100x25mm 2-Up`}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
