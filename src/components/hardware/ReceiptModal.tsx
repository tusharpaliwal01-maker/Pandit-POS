import React, { useState, useEffect } from 'react';
import {
  Printer,
  Share2,
  X,
  FileText,
  CheckCircle2,
  ExternalLink,
  Download,
  Zap,
  RotateCcw,
  AlertCircle,
  Usb,
  Volume2,
} from 'lucide-react';
import { Invoice, Shop } from '../../types';
import { ThermalReceipt } from './ThermalReceipt';
import { StorageService } from '../../services/storage';
import {
  printReceipt,
  openReceiptInNewTab,
  downloadInvoiceEscPos,
} from '../../utils/printHelper';
import { hardwarePrinterManager } from '../../utils/hardwarePrinters';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  shop: Shop;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  invoice,
  shop,
}) => {
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>(shop.defaultPaperWidth || '80mm');
  const [copied, setCopied] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printStatusMsg, setPrintStatusMsg] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);
  const [isSerialConnected, setIsSerialConnected] = useState(hardwarePrinterManager.isConnected('RETSOL'));
  const [isDrawerKicking, setIsDrawerKicking] = useState(false);

  useEffect(() => {
    const unsub = hardwarePrinterManager.subscribe((type, status, msg) => {
      if (type === 'RETSOL') {
        setIsSerialConnected(status === 'connected');
        if (msg) {
          setPrintStatusMsg({ type: status === 'error' ? 'error' : 'info', text: msg });
        }
      }
    });
    return unsub;
  }, []);

  if (!isOpen || !invoice) return null;

  const currentPrinterQueue = StorageService.getPrinterQueue();

  const handlePrint = async () => {
    setIsPrinting(true);
    setPrintStatusMsg({ type: 'info', text: 'Dispatching bill to thermal printer...' });

    try {
      const res = await printReceipt(invoice, shop, paperWidth, {
        kickDrawer: false,
        autoCut: true,
        buzzer: true,
      });

      if (res.success) {
        setPrintStatusMsg({
          type: 'success',
          text: res.message || `Printed successfully (${paperWidth})`,
        });
      } else {
        setPrintStatusMsg({
          type: 'error',
          text: res.message || 'Print dispatch encountered an issue. Using fallback.',
        });
      }
    } catch (err: any) {
      setPrintStatusMsg({
        type: 'error',
        text: err?.message || 'Print error. Try opening in new window.',
      });
    } finally {
      setIsPrinting(false);
    }
  };

  const handleConnectSerial = async () => {
    const ok = await hardwarePrinterManager.connect('RETSOL', 9600);
    if (ok) {
      setPrintStatusMsg({ type: 'success', text: 'Connected to RETSOL RTP82 via Web Serial USB!' });
    }
  };

  const handleKickDrawer = async () => {
    setIsDrawerKicking(true);
    const ok = await hardwarePrinterManager.kickCashDrawer();
    if (ok) {
      setPrintStatusMsg({ type: 'success', text: 'Cash Drawer kick pulse sent to RETSOL RJ11 port!' });
    } else {
      setPrintStatusMsg({
        type: 'info',
        text: 'To kick cash drawer, connect RETSOL printer via Web Serial or USB port.',
      });
    }
    setTimeout(() => setIsDrawerKicking(false), 800);
  };

  const handleSoundBuzzer = async () => {
    const ok = await hardwarePrinterManager.soundBuzzer(2);
    if (ok) {
      setPrintStatusMsg({ type: 'success', text: 'Buzzer beep signal sent to RETSOL!' });
    } else {
      setPrintStatusMsg({ type: 'info', text: 'Connect RETSOL via Web Serial to trigger hardware buzzer.' });
    }
  };

  const handleCutPaper = async () => {
    const ok = await hardwarePrinterManager.cutPaper('partial');
    if (ok) {
      setPrintStatusMsg({ type: 'success', text: 'Auto-cut command sent to RETSOL RTP82!' });
    } else {
      setPrintStatusMsg({ type: 'info', text: 'Connect RETSOL via Web Serial to trigger auto-cut.' });
    }
  };

  const generateWhatsAppMessage = (): string => {
    const itemsList = invoice.items
      .map((item) => `• ${item.name} x ${item.quantity} = ₹${item.total}`)
      .join('\n');

    return `*${shop.name}*
${shop.address}, ${shop.city}
Ph: ${shop.phonePrimary}
GSTIN: ${shop.gstin}
---------------------------
*TAX INVOICE: ${invoice.invoiceNumber}*
Date: ${new Date(invoice.createdAt).toLocaleDateString()} ${new Date(invoice.createdAt).toLocaleTimeString()}
Cashier: ${invoice.cashierName}
${invoice.customerName ? `Customer: ${invoice.customerName}` : ''}
---------------------------
*ITEMS:*
${itemsList}
---------------------------
Subtotal: ₹${invoice.subtotal}
${invoice.discountTotal > 0 ? `Discount: -₹${invoice.discountTotal}\n` : ''}GST (Included): ₹${invoice.gstTotal}
*GRAND TOTAL: ₹${invoice.grandTotal}*
Payment Mode: ${invoice.paymentMethod}
---------------------------
${shop.receiptFooter}
Thank you for shopping with us!`;
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(generateWhatsAppMessage());
    const phone = invoice.customerMobile ? invoice.customerMobile.replace(/[^0-9]/g, '') : '';
    const url = phone ? `https://wa.me/91${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(generateWhatsAppMessage());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900 text-base">Sale Receipt</h3>
                <span className="font-mono text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                  {invoice.invoiceNumber}
                </span>
              </div>
              <p className="text-xs text-slate-500">RETSOL RTP82 Thermal Roll &amp; Digital Bill</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Paper Width Toggle */}
            <div className="flex items-center bg-slate-200 p-0.5 rounded-lg text-xs font-medium">
              <button
                onClick={() => setPaperWidth('80mm')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  paperWidth === '80mm' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                80 mm (RTP82)
              </button>
              <button
                onClick={() => setPaperWidth('58mm')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  paperWidth === '58mm' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                58 mm
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* RETSOL Hardware & Connection Toolbar */}
        <div className="px-6 py-2.5 bg-slate-900 text-slate-200 border-b border-slate-800 text-xs flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Printer:</span>
            <strong className="text-orange-400 font-mono">{currentPrinterQueue}</strong>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                isSerialConnected
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isSerialConnected ? 'bg-emerald-400' : 'bg-slate-500'}`} />
              {isSerialConnected ? 'Web Serial USB Connected' : 'Browser Driver Mode'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!isSerialConnected && hardwarePrinterManager.isSerialSupported() && (
              <button
                onClick={handleConnectSerial}
                className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-[11px] font-medium transition-colors"
                title="Connect directly to RETSOL RTP82 USB or COM port"
              >
                <Usb className="w-3 h-3 text-orange-400" />
                <span>Connect USB</span>
              </button>
            )}

            {/* RETSOL Hardware actions */}
            <button
              onClick={handleKickDrawer}
              disabled={isDrawerKicking}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded text-[11px] font-medium transition-colors flex items-center gap-1"
              title="Send RJ11 Cash Drawer Kick Pulse"
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span>Kick Drawer</span>
            </button>

            <button
              onClick={handleCutPaper}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded text-[11px] font-medium transition-colors"
              title="Test Paper Cutter"
            >
              Auto-Cut
            </button>

            <button
              onClick={handleSoundBuzzer}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded text-[11px] font-medium transition-colors"
              title="Test Printer Buzzer"
            >
              <Volume2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Live Status Toast Banner */}
        {printStatusMsg && (
          <div
            className={`px-6 py-2 text-xs flex items-center justify-between border-b shrink-0 ${
              printStatusMsg.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : printStatusMsg.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{printStatusMsg.text}</span>
            </div>
            <button
              onClick={() => setPrintStatusMsg(null)}
              className="text-slate-400 hover:text-slate-700 text-sm font-bold ml-2"
            >
              &times;
            </button>
          </div>
        )}

        {/* Scrollable Receipt Preview */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100/70 flex justify-center">
          <div className="bg-white shadow-md border border-slate-200 p-4 rounded-sm print-area-receipt">
            <ThermalReceipt invoice={invoice} shop={shop} paperWidth={paperWidth} />
          </div>
        </div>

        {/* Action Controls */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={handleWhatsAppShare}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              <Share2 className="w-4 h-4" />
              <span>WhatsApp Bill</span>
            </button>

            <button
              onClick={handleCopyText}
              className="px-3 py-2 border border-slate-300 hover:bg-white text-slate-700 rounded-lg text-xs font-medium transition-colors"
            >
              {copied ? 'Copied Bill!' : 'Copy Text'}
            </button>

            <button
              onClick={() => openReceiptInNewTab(invoice, shop, paperWidth)}
              title="Open printable bill in separate browser window"
              className="flex items-center gap-1 px-2.5 py-2 border border-slate-300 hover:bg-white text-slate-700 rounded-lg text-xs font-medium transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>New Tab</span>
            </button>

            <button
              onClick={() => downloadInvoiceEscPos(invoice, shop, paperWidth)}
              title="Download raw ESC/POS binary file (.bin) for RETSOL"
              className="flex items-center gap-1 px-2.5 py-2 border border-slate-300 hover:bg-white text-slate-700 rounded-lg text-xs font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>ESC/POS (.bin)</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 border border-slate-300 hover:bg-white text-slate-700 rounded-lg text-xs font-medium transition-colors"
            >
              Close
            </button>

            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="flex items-center gap-1.5 px-5 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>
                {isPrinting
                  ? 'Printing...'
                  : isSerialConnected
                  ? `Direct Print (RETSOL ${paperWidth})`
                  : `Print Receipt (${paperWidth})`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
