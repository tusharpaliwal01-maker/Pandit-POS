import React from 'react';
import {
  Keyboard,
  X,
  CreditCard,
  Search,
  Scan,
  RefreshCw,
  UserCheck,
  Zap,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerAction?: (action: 'checkout' | 'search' | 'pos' | 'clear' | 'customer') => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
  onTriggerAction,
}) => {
  if (!isOpen) return null;

  const shortcuts = [
    {
      key: 'F2',
      label: 'Complete Checkout / Pay',
      desc: 'Opens payment confirmation & prints receipt immediately',
      icon: CreditCard,
      color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
      actionKey: 'checkout' as const,
    },
    {
      key: 'F3',
      label: 'Focus Barcode / Product Search',
      desc: 'Highlights the search input box for instant item lookups',
      icon: Search,
      color: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
      actionKey: 'search' as const,
    },
    {
      key: 'F4',
      label: 'Start POS Billing & Barcode Gun Ingest',
      desc: 'Switches directly to POS billing tab and readies the thermal barcode gun scanner',
      icon: Scan,
      color: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
      badge: 'Cashier Speed',
      actionKey: 'pos' as const,
    },
    {
      key: 'F6',
      label: 'Cycle Quantity Multiplier (1x-50x)',
      desc: 'Instantly cycle add-quantity multiplier: 1x → 2x → 5x → 10x → 20x for rapid box sales',
      icon: Zap,
      color: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
      badge: 'Speed Multiplier',
    },
    {
      key: 'F7',
      label: 'Toggle Scanner Auto-Focus Lock',
      desc: 'Keeps cursor locked in the barcode input continuously so cashier never touches the mouse',
      icon: Scan,
      color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
      badge: 'Auto Lock',
    },
    {
      key: 'F8',
      label: 'Clear Cart / Fresh Bill',
      desc: 'Clears current items from checkout and resets discounts',
      icon: RefreshCw,
      color: 'bg-rose-500/10 text-rose-600 border-rose-500/30',
      actionKey: 'clear' as const,
    },
    {
      key: 'F9',
      label: 'Select / Add Customer (Khata)',
      desc: 'Opens customer selector modal for credit/khata billing',
      icon: UserCheck,
      color: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
      actionKey: 'customer' as const,
    },
    {
      key: 'F10',
      label: 'Toggle Payment Method',
      desc: 'Cycles payment method instantly: CASH → UPI QR → KHATA Credit',
      icon: CreditCard,
      color: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
    },
    {
      key: 'Ctrl + Enter',
      label: '⚡ Instant Quick Cash & Bill',
      desc: 'Checks out exact cash amount and generates receipt in one stroke',
      icon: Zap,
      color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
      badge: '1-Touch',
      actionKey: 'checkout' as const,
    },
    {
      key: 'Enter',
      label: 'Add First Matched Item',
      desc: 'In search/barcode input, pressing Enter selects top product',
      icon: Zap,
      color: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
    },
    {
      key: 'Esc',
      label: 'Close Active Modal / Clear',
      desc: 'Dismisses popups, preview sheets, or resets search bar',
      icon: X,
      color: 'bg-slate-500/10 text-slate-600 border-slate-500/30',
    },
    {
      key: '? or F1',
      label: 'Open Shortcuts Cheat Sheet',
      desc: 'Quickly display this help guide anytime from any screen',
      icon: Keyboard,
      color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-600 text-white rounded-xl shadow-xs">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight flex items-center gap-2">
                <span>Cashier Keyboard Shortcuts Cheat Sheet</span>
                <span className="text-[10px] font-mono font-bold bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full border border-orange-500/30">
                  Speed POS
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Operate PANDIT POS at lightning speed using standard function keys &amp; thermal scanner guns.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-3 bg-slate-50/50">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {shortcuts.map((sc) => {
              const Icon = sc.icon;
              return (
                <div
                  key={sc.key}
                  className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs hover:border-orange-300 transition-all flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-slate-900 text-white font-mono font-bold text-xs rounded-md shadow-xs border border-slate-700">
                        {sc.key}
                      </span>
                      {sc.badge && (
                        <span className="text-[10px] font-semibold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-md">
                          {sc.badge}
                        </span>
                      )}
                    </div>
                    <div className={`p-1.5 rounded-lg border ${sc.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="mt-2.5">
                    <div className="text-xs font-bold text-slate-900">{sc.label}</div>
                    <p className="text-[11px] text-slate-500 leading-snug mt-0.5">{sc.desc}</p>
                  </div>

                  {sc.actionKey && onTriggerAction && (
                    <button
                      onClick={() => {
                        onTriggerAction(sc.actionKey!);
                        onClose();
                      }}
                      className="mt-2.5 w-full py-1 text-[11px] font-semibold text-orange-600 hover:text-orange-700 hover:bg-orange-50 border border-orange-200 rounded-lg transition-colors text-center"
                    >
                      Trigger Now ({sc.key})
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Thermal Gun Info Box */}
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 mt-4">
            <Scan className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900">
              <span className="font-bold">Thermal Barcode Gun Wedge:</span> The handheld laser/CCD scanner works seamlessly as an automated keyboard wedge. Press{' '}
              <strong className="font-mono bg-white px-1.5 py-0.5 rounded border border-amber-300">F4</strong> anytime to bring the cursor straight into the POS scan ingest buffer without touching the mouse!
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Shortcuts are active across all modern browsers &amp; POS terminals</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            Got it (Esc)
          </button>
        </div>
      </div>
    </div>
  );
};
