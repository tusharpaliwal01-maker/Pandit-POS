import React, { useState, useEffect } from 'react';
import {
  Tag,
  Printer,
  Sliders,
  AlertCircle,
  Plus,
  Minus,
  Search,
  RotateCcw,
  Usb,
  Download,
  ExternalLink,
  Code,
  Check,
  CheckCircle2,
  FileCode,
  X,
} from 'lucide-react';
import { Product, Shop, LabelPrintConfig } from '../types';
import { generateCode128Svg } from '../utils/barcode128';
import { hardwarePrinterManager, buildTsplScript } from '../utils/hardwarePrinters';
import { QuantityInput } from '../components/common/QuantityInput';
import {
  printBarcodeLabels,
  openLabelsInNewTab,
  downloadTscTsplPrn,
} from '../utils/printHelper';

interface BarcodeLabelsViewProps {
  products: Product[];
  shop: Shop;
}

interface SelectedItem {
  product: Product;
  copies: number;
}

export const BarcodeLabelsView: React.FC<BarcodeLabelsViewProps> = ({
  products,
  shop,
}) => {
  const [search, setSearch] = useState('');
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>(
    products.slice(0, 4).map((p) => ({ product: p, copies: 4 }))
  );

  const [config, setConfig] = useState<LabelPrintConfig>({
    labelSize: '100x25',
    layoutMode: '2-up',
    offsetX: 0,
    offsetY: 0,
    showShopName: true,
    customShopName: shop?.name || '',
    showMrp: true,
    showSellingPrice: true,
    showBarcodeText: true,
    showBatch: true,
    copiesPerItem: 2,
    density: 10,
    speed: 3,
    gapMm: 2,
  });

  const [isTestPattern, setIsTestPattern] = useState(false);
  const [isTscConnected, setIsTscConnected] = useState(hardwarePrinterManager.isConnected('TSC'));
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);
  const [isTsplModalOpen, setIsTsplModalOpen] = useState(false);
  const [copiedTspl, setCopiedTspl] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // Sync customShopName when active shop changes unless user gave custom input
  useEffect(() => {
    if (shop?.name) {
      setConfig((prev) => ({
        ...prev,
        customShopName: prev.customShopName ? prev.customShopName : shop.name,
      }));
    }
  }, [shop?.id, shop?.name]);

  useEffect(() => {
    const unsub = hardwarePrinterManager.subscribe((type, status, msg) => {
      if (type === 'TSC') {
        setIsTscConnected(status === 'connected');
        if (msg) {
          setStatusMessage({ type: status === 'error' ? 'error' : 'info', text: msg });
        }
      }
    });
    return unsub;
  }, []);

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode.includes(search) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggleProduct = (product: Product) => {
    setSelectedItems((prev) => {
      const exists = prev.find((item) => item.product.id === product.id);
      if (exists) {
        return prev.filter((item) => item.product.id !== product.id);
      } else {
        const initialCopies =
          product.stockQty > 0
            ? Math.min(config.copiesPerItem, product.stockQty)
            : config.copiesPerItem;
        return [...prev, { product, copies: Math.max(1, initialCopies) }];
      }
    });
  };

  const handleSetCopies = (productId: string, copies: number) => {
    setSelectedItems((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          let nextCopies = Math.max(1, copies);
          if (item.product.stockQty > 0 && nextCopies > item.product.stockQty) {
            setStatusMessage({
              type: 'info',
              text: `Available stock for "${item.product.name}" is ${item.product.stockQty}. Clamped copies to available stock.`,
            });
            nextCopies = item.product.stockQty;
          }
          return { ...item, copies: nextCopies };
        }
        return item;
      })
    );
  };

  const handleUpdateCopies = (productId: string, delta: number) => {
    setSelectedItems((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          let nextCopies = Math.max(1, item.copies + delta);
          if (item.product.stockQty > 0 && nextCopies > item.product.stockQty) {
            setStatusMessage({
              type: 'info',
              text: `Available stock for "${item.product.name}" is ${item.product.stockQty}.`,
            });
            nextCopies = item.product.stockQty;
          }
          return { ...item, copies: nextCopies };
        }
        return item;
      })
    );
  };

  const handleSetAllCopies = (newCopies: number) => {
    const validCount = Math.max(1, newCopies);
    setSelectedItems((prev) =>
      prev.map((item) => {
        let count = validCount;
        if (item.product.stockQty > 0 && count > item.product.stockQty) {
          count = item.product.stockQty;
        }
        return { ...item, copies: count };
      })
    );
  };

  const totalLabelsToPrint = selectedItems.reduce((acc, curr) => acc + curr.copies, 0);

  // Dimension details based on label size
  const is2Up = config.layoutMode === '2-up' || config.labelSize === '100x25';

  const sizeMap = {
    '40x20': { width: '40mm', height: '20mm', barcodeHeight: 28, fontSize: 8, columns: 1, label: '40 × 20 mm (Compact Single)' },
    '50x25': { width: '50mm', height: '25mm', barcodeHeight: 34, fontSize: 9, columns: 1, label: '50 × 25 mm (Single Column)' },
    '70x35': { width: '70mm', height: '35mm', barcodeHeight: 46, fontSize: 10, columns: 1, label: '70 × 35 mm (Large Box)' },
    '100x25': { width: '48mm', height: '23mm', barcodeHeight: 38, fontSize: 9, columns: 2, label: '100 × 25 mm (Standard 2-Up Dual Roll · 48×23mm)' },
  };

  const currentDim = sizeMap[config.labelSize] || sizeMap['100x25'];

  // Generate expanded list of label objects to render
  const labelRenderQueue: Product[] = [];
  if (isTestPattern) {
    for (let i = 0; i < 4; i++) {
      labelRenderQueue.push({
        id: `test-${i}`,
        shopId: shop.id,
        name: `TSC TE244 TEST #${i + 1}`,
        barcode: '890123400000',
        category: 'CALIBRATION',
        purchasePrice: 0,
        mrp: 999,
        sellingPrice: 799,
        gstRate: 18,
        stockQty: 100,
        lowStockThreshold: 10,
        unit: 'box',
        batchNumber: 'CAL-2026',
        active: true,
      });
    }
  } else {
    selectedItems.forEach((item) => {
      for (let i = 0; i < item.copies; i++) {
        labelRenderQueue.push(item.product);
      }
    });
  }

  const currentItems = isTestPattern
    ? [
        { product: labelRenderQueue[0], copies: 2 },
        { product: labelRenderQueue[1], copies: 2 },
      ]
    : selectedItems;

  const handlePrintLabels = async () => {
    if (labelRenderQueue.length === 0) return;
    setIsPrinting(true);
    setStatusMessage({ type: 'info', text: 'Dispatching labels to TSC TE244...' });

    try {
      const res = await printBarcodeLabels(currentItems, config, shop);
      setStatusMessage({
        type: res.success ? 'success' : 'error',
        text: res.message || 'Labels printed successfully.',
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Print dispatch failed. Try Preview in New Tab.',
      });
    } finally {
      setIsPrinting(false);
    }
  };

  const handleConnectTsc = async () => {
    const ok = await hardwarePrinterManager.connect('TSC', 9600);
    if (ok) {
      setStatusMessage({ type: 'success', text: 'Connected directly to TSC TE244 via Web Serial USB!' });
    }
  };

  const handleCalibrateSensor = async () => {
    const ok = await hardwarePrinterManager.calibrateTscSensor();
    if (ok) {
      setStatusMessage({ type: 'success', text: 'Sent GAPDETECT & FORMFEED commands to TSC TE244!' });
    } else {
      setStatusMessage({ type: 'info', text: 'Connect TSC via Web Serial to run gap sensor calibration.' });
    }
  };

  const handleFeedOne = async () => {
    const ok = await hardwarePrinterManager.feedTscLabel();
    if (ok) {
      setStatusMessage({ type: 'success', text: 'Feed 1 label executed (FORMFEED)!' });
    } else {
      setStatusMessage({ type: 'info', text: 'Connect TSC via Web Serial to feed label.' });
    }
  };

  const effectiveShopName =
    config.customShopName !== undefined && config.customShopName.trim() !== ''
      ? config.customShopName.trim()
      : shop?.name || 'PANDIT POS';

  const generatedTspl = buildTsplScript(currentItems, config, shop);

  const handleCopyTspl = () => {
    navigator.clipboard.writeText(generatedTspl);
    setCopiedTspl(true);
    setTimeout(() => setCopiedTspl(false), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Tag className="w-6 h-6 text-orange-600" />
              <span>Barcode Label Printing (TSC TE244)</span>
            </h2>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                isTscConnected
                  ? 'bg-emerald-500/20 text-emerald-800 border border-emerald-400'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isTscConnected ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              {isTscConnected ? 'TSC TE244 Connected' : 'Browser / TSPL Queue Mode'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            CODE128 sticker printing for 100×25mm (2-Up) and single-column rolls on TSC TE244 thermal transfer printers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {!isTscConnected && hardwarePrinterManager.isSerialSupported() && (
            <button
              onClick={handleConnectTsc}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <Usb className="w-3.5 h-3.5 text-orange-400" />
              <span>Connect TSC USB</span>
            </button>
          )}

          <button
            onClick={() => setIsTestPattern(!isTestPattern)}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
              isTestPattern
                ? 'bg-amber-100 text-amber-900 border-amber-300'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isTestPattern ? 'Exit Test Pattern' : 'Print Alignment Test'}</span>
          </button>

          <button
            onClick={() => openLabelsInNewTab(currentItems, config, shop)}
            title="Open printable sticker sheet in a dedicated clean tab"
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>New Tab</span>
          </button>

          <button
            onClick={handlePrintLabels}
            disabled={labelRenderQueue.length === 0 || isPrinting}
            className="flex items-center gap-2 px-5 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>
              {isPrinting
                ? 'Printing...'
                : isTscConnected
                ? `Direct TSPL to TSC (${totalLabelsToPrint})`
                : `Print ${isTestPattern ? 'Test Pattern' : `${totalLabelsToPrint} Labels`}`}
            </span>
          </button>
        </div>
      </div>

      {/* Live Status Toast Banner */}
      {statusMessage && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center justify-between border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : statusMessage.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-slate-700 font-bold ml-2 text-sm"
          >
            &times;
          </button>
        </div>
      )}

      {/* TSC Hardware Toolbar & Quick Actions */}
      <div className="bg-slate-900 text-slate-200 rounded-xl p-4 text-xs space-y-3 border border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3 text-orange-400 font-semibold text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-orange-400 shrink-0" />
            <span>TSC TE244 Hardware Toolkit (100 × 25 mm &amp; TSPL2)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCalibrateSensor}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs transition-colors flex items-center gap-1"
              title="Calibrate gap sensor on media roll change"
            >
              <RotateCcw className="w-3 h-3 text-orange-400" />
              <span>Gap Calibrate</span>
            </button>
            <button
              onClick={handleFeedOne}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs transition-colors"
              title="Feed 1 label"
            >
              Feed 1
            </button>
            <button
              onClick={() => downloadTscTsplPrn(currentItems, config, shop)}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs transition-colors flex items-center gap-1"
              title="Download raw .PRN TSPL file for direct DOS or TSC Utility printing"
            >
              <Download className="w-3 h-3 text-emerald-400" />
              <span>Download .PRN</span>
            </button>
            <button
              onClick={() => setIsTsplModalOpen(true)}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs transition-colors flex items-center gap-1"
              title="View & copy TSPL script"
            >
              <FileCode className="w-3 h-3 text-blue-400" />
              <span>View TSPL</span>
            </button>
          </div>
        </div>

        <p className="text-slate-300 leading-relaxed text-[11px]">
          1. <strong>Direct USB Printing:</strong> Connect via Web Serial for 100% silent, exact dot alignment without browser print dialogs.
          <br />
          2. <strong>Browser Print Settings:</strong> Target queue: <strong>TSC TE244</strong>, Scale: <strong>100% (Actual Size)</strong>, Margins: <strong>None</strong>.
          <br />
          3. Media standard: <strong>100 × 25 mm (2-Up)</strong>. If labels drift vertically after 5 stickers, click <em>Gap Calibrate</em> to synchronize the optical sensor.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Product Selection */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Select Fireworks / Products
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {selectedItems.length} selected ({totalLabelsToPrint} stickers)
              </span>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, barcode, category..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:border-orange-500"
              />
            </div>

            {/* Quick Copies Helper */}
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1.5 text-xs">
              <span className="text-slate-600 font-medium">Default copies per item:</span>
              <div className="flex items-center gap-2">
                <QuantityInput
                  value={config.copiesPerItem}
                  min={1}
                  max={500}
                  onQuantityChange={(newCopies) =>
                    setConfig({ ...config, copiesPerItem: newCopies })
                  }
                />
                {selectedItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleSetAllCopies(config.copiesPerItem)}
                    className="px-2 py-1 bg-white hover:bg-orange-50 text-orange-700 border border-orange-200 rounded text-[11px] font-semibold transition-colors shadow-2xs"
                    title={`Set all ${selectedItems.length} selected items to ${config.copiesPerItem} copies`}
                  >
                    Apply to all ({selectedItems.length})
                  </button>
                )}
              </div>
            </div>

            {/* Product List */}
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto pr-1">
              {filteredProducts.map((p) => {
                const selected = selectedItems.find((item) => item.product.id === p.id);
                return (
                  <div
                    key={p.id}
                    className={`py-2.5 px-2 flex items-center justify-between text-xs rounded-lg transition-colors ${
                      selected ? 'bg-orange-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div
                      onClick={() => handleToggleProduct(p)}
                      className="cursor-pointer flex-1 min-w-0 pr-3"
                    >
                      <div className="font-semibold text-slate-900 truncate">{p.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2">
                        <span>{p.barcode}</span>
                        <span>·</span>
                        <span className="text-slate-800 font-semibold">₹{p.sellingPrice} (MRP ₹{p.mrp})</span>
                        {p.stockQty !== undefined && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${p.stockQty <= 0 ? 'bg-rose-100 text-rose-700 font-bold' : 'bg-slate-100 text-slate-600'}`}>
                            Stock: {p.stockQty}
                          </span>
                        )}
                      </div>
                    </div>

                    {selected ? (
                      <div className="flex items-center shrink-0">
                        <QuantityInput
                          value={selected.copies}
                          min={1}
                          stockLimit={p.stockQty > 0 ? p.stockQty : undefined}
                          productName={p.name}
                          onQuantityChange={(newCopies) => handleSetCopies(p.id, newCopies)}
                          onExceedStock={(max) =>
                            setStatusMessage({
                              type: 'info',
                              text: `Available stock for "${p.name}" is only ${max}. Clamped copies to available stock.`,
                            })
                          }
                          onRemove={() => handleToggleProduct(p)}
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() => handleToggleProduct(p)}
                        className="px-2.5 py-1 text-slate-600 hover:text-orange-600 hover:bg-orange-100 border border-slate-200 rounded text-xs font-medium transition-colors"
                      >
                        Add
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Label Settings & Live Preview */}
        <div className="lg:col-span-7 space-y-4">
          {/* Label Geometry & TSC Hardware Calibration Settings */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-orange-600" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  TSC TE244 Media &amp; Print Calibration
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                {is2Up ? '2-Up (Dual Column)' : '1-Up (Single Column)'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Sticker Roll Format</label>
                <select
                  value={config.labelSize}
                  onChange={(e) => {
                    const size = e.target.value as any;
                    setConfig({
                      ...config,
                      labelSize: size,
                      layoutMode: size === '100x25' ? '2-up' : '1-up',
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-slate-900 focus:bg-white focus:border-orange-500 font-medium"
                >
                  <option value="100x25">100 × 25 mm (Standard 2-Up Dual Roll)</option>
                  <option value="50x25">50 × 25 mm (Single Column)</option>
                  <option value="40x20">40 × 20 mm (Compact Single)</option>
                  <option value="70x35">70 × 35 mm (Large Box)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-semibold">
                  TSC Print Density ({config.density ?? 10}/15)
                </label>
                <input
                  type="range"
                  min="1"
                  max="15"
                  value={config.density ?? 10}
                  onChange={(e) => setConfig({ ...config, density: parseInt(e.target.value) || 10 })}
                  className="w-full accent-orange-600 mt-2"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>Light (1)</span>
                  <span>Normal (10)</span>
                  <span>Dark (15)</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-semibold">
                  TSC Print Speed ({config.speed ?? 3} IPS)
                </label>
                <select
                  value={config.speed ?? 3}
                  onChange={(e) => setConfig({ ...config, speed: parseInt(e.target.value) || 3 })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-slate-900 focus:bg-white focus:border-orange-500 font-medium"
                >
                  <option value="2">2.0 Inches/Sec (Crispest Wax Ribbon)</option>
                  <option value="3">3.0 Inches/Sec (Recommended)</option>
                  <option value="4">4.0 Inches/Sec (Fast Batch)</option>
                  <option value="5">5.0 Inches/Sec (Maximum Speed)</option>
                </select>
              </div>
            </div>

            {/* Fine Alignment Offsets */}
            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Horizontal Offset (X Drift)</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={config.offsetX}
                    onChange={(e) =>
                      setConfig({ ...config, offsetX: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-mono text-slate-900 text-xs"
                    step="0.5"
                  />
                  <span className="text-slate-400 text-xs">mm</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Vertical Offset (Y Drift)</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={config.offsetY}
                    onChange={(e) =>
                      setConfig({ ...config, offsetY: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-mono text-slate-900 text-xs"
                    step="0.5"
                  />
                  <span className="text-slate-400 text-xs">mm</span>
                </div>
              </div>
            </div>

            {/* Display Toggles */}
            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-700">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showShopName}
                  onChange={(e) => setConfig({ ...config, showShopName: e.target.checked })}
                  className="rounded text-orange-600 focus:ring-orange-500"
                />
                <span>Store Name</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showMrp}
                  onChange={(e) => setConfig({ ...config, showMrp: e.target.checked })}
                  className="rounded text-orange-600 focus:ring-orange-500"
                />
                <span>Strike MRP</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showSellingPrice}
                  onChange={(e) => setConfig({ ...config, showSellingPrice: e.target.checked })}
                  className="rounded text-orange-600 focus:ring-orange-500"
                />
                <span>Offer Price</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showBarcodeText}
                  onChange={(e) => setConfig({ ...config, showBarcodeText: e.target.checked })}
                  className="rounded text-orange-600 focus:ring-orange-500"
                />
                <span>Numeric Code</span>
              </label>
            </div>

            {/* Custom Store Name Input on Label */}
            {config.showShopName && (
              <div className="pt-2 border-t border-slate-100 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">Store Name on Label Header</label>
                  <span className="text-[11px] text-slate-400">Printed on the top border of each sticker</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={config.customShopName ?? shop?.name ?? ''}
                    onChange={(e) => setConfig({ ...config, customShopName: e.target.value })}
                    placeholder="Enter store name for labels..."
                    className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-slate-900 focus:bg-white focus:border-orange-500 font-bold text-xs uppercase"
                  />
                  {config.customShopName !== undefined && config.customShopName !== shop.name && (
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, customShopName: shop.name })}
                      className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors font-medium cursor-pointer"
                      title="Reset to default shop name"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Live Label Preview Grid */}
          <div className="bg-slate-200/70 rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Live Sticker Sheet Preview ({labelRenderQueue.length} stickers)
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {currentDim.label}
              </span>
            </div>

            {labelRenderQueue.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                Select products from the left to preview barcode stickers.
              </div>
            ) : (
              <div
                className="print-area-labels grid gap-2.5 justify-center"
                style={{
                  gridTemplateColumns: `repeat(${is2Up ? 2 : currentDim.columns}, minmax(0, auto))`,
                  transform: `translate(${config.offsetX}mm, ${config.offsetY}mm)`,
                }}
              >
                {labelRenderQueue.map((item, idx) => {
                  const svg = generateCode128Svg(item.barcode, {
                    height: currentDim.barcodeHeight,
                    fontSize: currentDim.fontSize,
                    showText: config.showBarcodeText,
                  });

                  return (
                    <div
                      key={idx}
                      className="barcode-label bg-white border border-slate-300 shadow-xs flex flex-col justify-between items-center text-black font-mono overflow-hidden print:overflow-visible"
                      style={{
                        width: is2Up ? '48mm' : currentDim.width,
                        height: is2Up ? '23mm' : currentDim.height,
                        minWidth: is2Up ? '48mm' : currentDim.width,
                        minHeight: is2Up ? '23mm' : currentDim.height,
                        padding: '1mm',
                        boxSizing: 'border-box',
                      }}
                    >
                      {/* Shop Name */}
                      {config.showShopName && (
                        <div
                          data-field="store-name"
                          title={effectiveShopName}
                          className="barcode-store barcode-label-store shrink-0 text-[8.5px] font-bold text-center uppercase tracking-tight truncate border-b border-black/40 pb-0.5 w-full leading-tight"
                        >
                          {effectiveShopName}
                        </div>
                      )}

                      {/* Product Name */}
                      <div
                        data-field="product-name"
                        title={item.name}
                        className="barcode-product barcode-label-title shrink-0 text-[9px] font-semibold text-center truncate leading-tight my-0.5 w-full"
                      >
                        {item.name}
                      </div>

                      {/* Barcode Vector Graphic */}
                      <div
                        data-field="barcode-wrapper"
                        className="barcode-code-wrap barcode-label-code-wrap shrink-0 w-full flex-1 min-h-[7mm] max-h-[11mm] flex flex-col justify-center items-center my-0.5 overflow-hidden [&>svg]:max-h-[11mm] [&>svg]:w-[92%]"
                        dangerouslySetInnerHTML={{ __html: svg }}
                      />

                      {/* Price Row */}
                      <div
                        data-field="prices-row"
                        className="barcode-prices barcode-label-prices shrink-0 flex items-center justify-between text-[9px] font-bold border-t border-black/40 pt-0.5 mt-0.5 w-full"
                      >
                        {config.showMrp ? (
                          <span data-field="mrp" className="barcode-mrp barcode-label-mrp text-gray-600 line-through">
                            MRP: ₹{item.mrp}
                          </span>
                        ) : (
                          <span className="barcode-mrp barcode-label-mrp" />
                        )}
                        {config.showSellingPrice ? (
                          <span data-field="selling-price" className="barcode-selling barcode-label-selling text-black text-[10px] font-bold">
                            ₹{item.sellingPrice}
                          </span>
                        ) : (
                          <span className="barcode-selling barcode-label-selling" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TSPL Script Viewer Modal */}
      {isTsplModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-xl text-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-orange-400" />
                <h3 className="font-bold text-white text-sm">Generated TSPL2 Code for TSC TE244</h3>
              </div>
              <button
                onClick={() => setIsTsplModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-emerald-400 overflow-x-auto max-h-80 leading-relaxed">
                {generatedTspl}
              </pre>
            </div>

            <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex justify-between items-center">
              <button
                onClick={() => downloadTscTsplPrn(currentItems, config, shop)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>Save .PRN File</span>
              </button>

              <div className="flex gap-2">
                <button
                  onClick={handleCopyTspl}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  {copiedTspl ? <Check className="w-4 h-4" /> : null}
                  <span>{copiedTspl ? 'Copied to Clipboard!' : 'Copy TSPL'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
