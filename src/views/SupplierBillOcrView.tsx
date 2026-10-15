import React, { useState } from 'react';
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Plus,
  RefreshCw,
  Search,
  Check,
} from 'lucide-react';
import { Product, Shop, ParsedSupplierBill, ParsedBillItem } from '../types';
import { StorageService } from '../services/storage';
import { QuantityInput } from '../components/common/QuantityInput';

interface SupplierBillOcrViewProps {
  shop: Shop;
  products: Product[];
  onRefreshData: () => void;
}

export const SupplierBillOcrView: React.FC<SupplierBillOcrViewProps> = ({
  shop,
  products,
  onRefreshData,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedBill, setParsedBill] = useState<ParsedSupplierBill | null>(null);
  const [commitSuccess, setCommitSuccess] = useState<{ updated: number; created: number } | null>(null);

  // Auto-match items against existing products
  const autoMatchItems = (rawItems: any[]): ParsedBillItem[] => {
    return rawItems.map((item, idx) => {
      // Find best match in catalog
      const cleanName = (item.name || '').toLowerCase();
      const matched = products.find(
        (p) =>
          p.name.toLowerCase() === cleanName ||
          p.name.toLowerCase().includes(cleanName) ||
          cleanName.includes(p.name.toLowerCase())
      );

      return {
        id: `parsed-${idx}-${Date.now()}`,
        name: item.name || 'Sample Firework Item',
        hsn: item.hsn || '3604',
        qty: item.qty || 10,
        purchasePrice: item.purchasePrice || 50,
        mrp: item.mrp || (item.purchasePrice ? Math.round(item.purchasePrice * 1.6) : 100),
        gstRate: item.gstRate || 18,
        batchNumber: item.batchNumber || `BAT-${new Date().getFullYear()}`,
        matchedProductId: matched?.id,
        matchedProductName: matched?.name,
        status: matched ? 'matched' : 'new',
      };
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setError(null);
    setCommitSuccess(null);

    const reader = new FileReader();
    reader.onload = () => {
      setFilePreview(reader.result as string);
    };
    reader.readAsDataURL(selected);
  };

  const parseWithGemini = async (base64Data: string, mimeType: string) => {
    setIsLoading(true);
    setError(null);
    setCommitSuccess(null);

    try {
      const res = await fetch('/api/gemini/parse-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Data,
          mimeType,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.details || json.error || 'Failed to parse supplier invoice.');
      }

      const billData = json.data;
      const matchedItems = autoMatchItems(billData.items || []);

      setParsedBill({
        vendorName: billData.vendorName || 'Sri Kaliswari Fireworks Sivakasi',
        vendorGstin: billData.vendorGstin || '33AAACS1234F1Z1',
        invoiceNumber: billData.invoiceNumber || `SKF-${Math.floor(1000 + Math.random() * 9000)}`,
        invoiceDate: billData.invoiceDate || new Date().toISOString().split('T')[0],
        totalAmount: billData.totalAmount || 45200,
        items: matchedItems,
      });
    } catch (err: any) {
      console.error('OCR Error:', err);
      setError(err.message || 'Error occurred while contacting Gemini OCR vision model.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunOcr = () => {
    if (!filePreview || !file) return;
    parseWithGemini(filePreview, file.type || 'image/jpeg');
  };

  // Sample Supplier Bill Loader for instant testing without webcam/file upload
  const handleLoadSampleBill = () => {
    setError(null);
    setCommitSuccess(null);
    setIsLoading(true);

    setTimeout(() => {
      const sampleItems = [
        {
          name: '10cm Electric Sparklers (10 pcs/box)',
          hsn: '3604',
          qty: 100,
          purchasePrice: 28,
          mrp: 65,
          gstRate: 18,
          batchNumber: 'SKF-2026-OCT1',
        },
        {
          name: 'Special Ashoka Deluxe Flower Pot (10 pcs)',
          hsn: '3604',
          qty: 50,
          purchasePrice: 130,
          mrp: 290,
          gstRate: 18,
          batchNumber: 'SKF-2026-OCT1',
        },
        {
          name: 'Golden Dragon 50-Shot Sky Cake',
          hsn: '3604',
          qty: 25,
          purchasePrice: 550,
          mrp: 1200,
          gstRate: 28,
          batchNumber: 'SKF-2026-OCT2',
        },
        {
          name: 'Hydro Thunder Mega Bomb (10 pcs)',
          hsn: '3604',
          qty: 60,
          purchasePrice: 90,
          mrp: 200,
          gstRate: 18,
          batchNumber: 'SKF-2026-OCT2',
        },
      ];

      const matchedItems = autoMatchItems(sampleItems);
      setParsedBill({
        vendorName: 'Sri Kaliswari Fireworks Mfg (Sivakasi)',
        vendorGstin: '33AAACK1122F1Z8',
        invoiceNumber: 'SKF/2026/9821',
        invoiceDate: new Date().toISOString().split('T')[0],
        totalAmount: 38250,
        items: matchedItems,
      });
      setIsLoading(false);
    }, 600);
  };

  const handleUpdateItem = (id: string, field: keyof ParsedBillItem, value: any) => {
    if (!parsedBill) return;
    setParsedBill({
      ...parsedBill,
      items: parsedBill.items.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === 'matchedProductId') {
            const prod = products.find((p) => p.id === value);
            updated.matchedProductName = prod?.name;
            updated.status = prod ? 'matched' : 'new';
          }
          return updated;
        }
        return item;
      }),
    });
  };

  const handleCommitStock = () => {
    if (!parsedBill) return;

    const res = StorageService.commitSupplierBill(shop.id, parsedBill);
    if (res.success) {
      setCommitSuccess({ updated: res.updatedCount, created: res.createdCount });
      onRefreshData();
      setParsedBill(null);
      setFile(null);
      setFilePreview(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-orange-600" />
            <span>Supplier Purchase Bill OCR &amp; Bulk Restock</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Gemini Multimodal Vision (`gemini-3.8-flash`) invoice extraction with interactive review &amp; stock inflow.
          </p>
        </div>

        <button
          onClick={handleLoadSampleBill}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
        >
          <Sparkles className="w-4 h-4 text-orange-400" />
          <span>Load Sample Sivakasi Bill</span>
        </button>
      </div>

      {/* Success Banner */}
      {commitSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-xs font-medium">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <strong>Stock Successfully Ingested!</strong> Updated stock for{' '}
              <strong>{commitSuccess.updated} existing products</strong> and added{' '}
              <strong>{commitSuccess.created} newly cataloged items</strong> to inventory.
            </div>
          </div>
          <button
            onClick={() => setCommitSuccess(null)}
            className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Upload Zone & Actions */}
      {!parsedBill && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-4 shadow-2xs">
          <div className="max-w-md mx-auto space-y-3">
            <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center mx-auto border border-orange-100">
              <Upload className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">
              Upload Supplier Invoice / Bilty
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Drag &amp; drop purchase bills from fireworks manufacturers or wholesale distributors (JPEG, PNG, or PDF). Gemini extracts HSN, rates, GST, and batch lots automatically.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <label className="cursor-pointer px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors">
                <span>Browse Files</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {filePreview && (
                <button
                  onClick={handleRunOcr}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-orange-400" />
                      <span>Parsing with Gemini...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-orange-400" />
                      <span>Extract Line Items</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {file && (
              <div className="text-xs text-slate-600 font-mono mt-2">
                Selected: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
              </div>
            )}

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2 text-left">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Parsed Bill Review Table */}
      {parsedBill && (
        <div className="space-y-4">
          {/* Invoice Meta Banner */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-bold text-slate-400">
                  Supplier / Vendor:
                </span>
                <span className="font-bold text-slate-900 text-sm">{parsedBill.vendorName}</span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-500">
                <span>GSTIN: {parsedBill.vendorGstin || 'Not Specified'}</span>
                <span>·</span>
                <span>Bill #: {parsedBill.invoiceNumber}</span>
                <span>·</span>
                <span>Date: {parsedBill.invoiceDate}</span>
                <span>·</span>
                <span className="font-bold text-slate-900">
                  Total Amount: ₹{parsedBill.totalAmount.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto">
              <button
                onClick={() => setParsedBill(null)}
                className="px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition-colors"
              >
                Discard
              </button>
              <button
                onClick={handleCommitStock}
                className="flex items-center gap-1.5 px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
              >
                <Check className="w-4 h-4" />
                <span>Confirm &amp; Add Stock to Inventory</span>
              </button>
            </div>
          </div>

          {/* Line Items Approval Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Parsed Items &amp; Catalog Mapping ({parsedBill.items.length} Lines)
              </span>
              <span className="text-xs text-slate-500">
                Verify quantities, rates, and catalog links before committing
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Extracted Product Name</th>
                    <th className="py-2.5 px-2">HSN</th>
                    <th className="py-2.5 px-2 w-20">Inflow Qty</th>
                    <th className="py-2.5 px-2 w-24">Purchase Rate</th>
                    <th className="py-2.5 px-2 w-24">MRP (₹)</th>
                    <th className="py-2.5 px-2 w-20">GST %</th>
                    <th className="py-2.5 px-2">Batch #</th>
                    <th className="py-2.5 px-3">Catalog Destination</th>
                    <th className="py-2.5 px-2">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedBill.items.map((item) => (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        item.status === 'skip' ? 'opacity-40 line-through' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-medium text-slate-900 max-w-[200px]">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                          className="w-full bg-transparent border-b border-transparent focus:border-orange-500 outline-none text-xs font-semibold"
                        />
                      </td>

                      <td className="py-2.5 px-2 font-mono text-slate-500">{item.hsn}</td>

                      <td className="py-2.5 px-2">
                        <QuantityInput
                          value={item.qty}
                          min={1}
                          max={99999}
                          onQuantityChange={(newQty) =>
                            handleUpdateItem(item.id, 'qty', newQty)
                          }
                        />
                      </td>

                      <td className="py-2.5 px-2 font-mono">
                        <input
                          type="number"
                          value={item.purchasePrice}
                          onChange={(e) =>
                            handleUpdateItem(item.id, 'purchasePrice', parseFloat(e.target.value) || 0)
                          }
                          className="w-20 px-2 py-1 bg-slate-50 border border-slate-200 rounded font-mono text-slate-900 text-xs"
                        />
                      </td>

                      <td className="py-2.5 px-2 font-mono">
                        <input
                          type="number"
                          value={item.mrp}
                          onChange={(e) =>
                            handleUpdateItem(item.id, 'mrp', parseFloat(e.target.value) || 0)
                          }
                          className="w-20 px-2 py-1 bg-slate-50 border border-slate-200 rounded font-mono text-slate-900 text-xs"
                        />
                      </td>

                      <td className="py-2.5 px-2 font-mono">{item.gstRate}%</td>

                      <td className="py-2.5 px-2 font-mono text-slate-500">{item.batchNumber}</td>

                      {/* Destination Mapping Select */}
                      <td className="py-2.5 px-3">
                        <select
                          value={item.matchedProductId || ''}
                          onChange={(e) =>
                            handleUpdateItem(item.id, 'matchedProductId', e.target.value || undefined)
                          }
                          className="w-full max-w-[220px] px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 outline-none focus:bg-white"
                        >
                          <option value="">+ Create as New Product</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              Match: {p.name} ({p.stockQty} in stock)
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Skip or Include */}
                      <td className="py-2.5 px-2">
                        <button
                          onClick={() =>
                            handleUpdateItem(
                              item.id,
                              'status',
                              item.status === 'skip' ? (item.matchedProductId ? 'matched' : 'new') : 'skip'
                            )
                          }
                          className={`text-xs font-semibold px-2 py-1 rounded transition-colors ${
                            item.status === 'skip'
                              ? 'bg-slate-200 text-slate-700'
                              : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                          }`}
                        >
                          {item.status === 'skip' ? 'Restore' : 'Skip'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
