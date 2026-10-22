import React, { useState } from 'react';
import { Scan, X, CheckCircle2, Zap, AlertTriangle, RefreshCw, Camera } from 'lucide-react';
import { useBarcodeScanner, ScannerDiagnostic, sanitizeBarcode } from '../../hooks/useBarcodeScanner';

interface ScannerTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSimulateScan?: (barcode: string) => void;
  onOpenLiveCamera?: () => void;
}

export const ScannerTestModal: React.FC<ScannerTestModalProps> = ({
  isOpen,
  onClose,
  onSimulateScan,
  onOpenLiveCamera,
}) => {
  const [testInput, setTestInput] = useState('');
  const [history, setHistory] = useState<ScannerDiagnostic[]>([]);

  const handleScan = (barcode: string) => {
    const clean = sanitizeBarcode(barcode);
    if (!clean) return;
    const diag: ScannerDiagnostic = {
      lastBarcode: clean,
      timestamp: new Date().toLocaleTimeString(),
      charCount: clean.length,
      durationMs: 45,
      isProbableHardwareGun: true,
    };
    setHistory((prev) => [diag, ...prev.slice(0, 9)]);
    setTestInput('');
  };

  useBarcodeScanner({
    onScan: handleScan,
    debounceMs: 400,
    enabled: isOpen,
  });

  const handleManualEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      const code = sanitizeBarcode(testInput);
      if (code) {
        const diag: ScannerDiagnostic = {
          lastBarcode: code,
          timestamp: new Date().toLocaleTimeString(),
          charCount: code.length,
          durationMs: 180,
          isProbableHardwareGun: false,
        };
        setHistory((prev) => [diag, ...prev.slice(0, 9)]);
        if (onSimulateScan) onSimulateScan(code);
        setTestInput('');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-base">Handheld Barcode Scanner Setup</h3>
              <p className="text-xs text-slate-500">USB / Bluetooth Laser Gun in Keyboard Wedge Mode</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onOpenLiveCamera && (
              <button
                type="button"
                onClick={onOpenLiveCamera}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-blue-600" />
                <span>Camera Scanner</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Hardware Guidance */}
          <div className="bg-amber-50/80 border border-amber-200/80 rounded-lg p-3.5 text-xs text-amber-900 space-y-1.5 leading-relaxed">
            <div className="flex items-center gap-1.5 font-semibold text-amber-950">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Scanner Configuration Notice:</span>
            </div>
            <p>
              Connect your USB or Bluetooth barcode gun. Ensure your scanner is programmed in <strong>HID (Keyboard)</strong> mode and configured to send an <strong>Enter (CR / Carriage Return)</strong> suffix after each barcode.
            </p>
            <p className="text-emerald-800 font-medium text-[11px] bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded flex items-center gap-1.5 mt-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span><strong>Hardware Double-Scan Filter Active:</strong> 400ms debounce window and dual CR+LF terminator suppression prevent duplicate cart increments on single trigger pulls.</span>
            </p>
          </div>

          {/* Test Input Area */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Diagnostic Scan Input Field
            </label>
            <div className="relative">
              <input
                id="scanner-test-field"
                data-barcode-input="true"
                type="text"
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                onKeyDown={handleManualEnter}
                placeholder="Pull trigger or type barcode & press Enter..."
                autoFocus
                className="w-full pl-4 pr-24 py-3 bg-slate-50 border-2 border-dashed border-orange-400 focus:border-orange-600 focus:bg-white rounded-lg font-mono text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded">
                Auto-Enter
              </span>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500">
              When you pull the gun trigger, the scanned number will instantly record below.
            </p>
          </div>

          {/* Diagnostic Log */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Recent Scans Log ({history.length})
              </span>
              {history.length > 0 && (
                <button
                  onClick={() => setHistory([])}
                  className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Clear
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="border border-slate-100 rounded-lg p-6 text-center bg-slate-50/50">
                <Scan className="w-8 h-8 text-slate-300 mx-auto mb-2 animate-pulse" />
                <p className="text-xs text-slate-500">Awaiting scanner input. Pull the trigger on any product barcode.</p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-48 overflow-y-auto">
                {history.map((h, i) => (
                  <div key={i} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-mono font-semibold text-slate-900 text-sm">{h.lastBarcode}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
                      <span>{h.charCount} chars</span>
                      <span>·</span>
                      <span className="flex items-center gap-1 text-slate-600">
                        <Zap className="w-3 h-3 text-amber-500" />
                        {h.isProbableHardwareGun ? 'Hardware HID' : 'Manual'}
                      </span>
                      <span>·</span>
                      <span>{h.timestamp}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Status: <span className="text-emerald-600 font-medium">Scanner Listener Active</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors"
          >
            Done Testing
          </button>
        </div>
      </div>
    </div>
  );
};
