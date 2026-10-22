import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Download,
  ArrowRight,
  RefreshCw,
  FileText,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Product, Shop } from '../../types';
import { StorageService } from '../../services/storage';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  shop: Shop;
  onImportSuccess: (count: number) => void;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  shop,
  onImportSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsedProducts, setParsedProducts] = useState<Product[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [rawWorkbook, setRawWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');

  if (!isOpen) return null;

  const parseWorkbookSheet = (wb: XLSX.WorkBook, sheetName: string) => {
    try {
      const ws = wb.Sheets[sheetName];
      if (!ws) return;

      const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });

      if (rawData.length === 0) {
        setError(`Sheet "${sheetName}" is empty. Please choose a sheet containing product data.`);
        setParsedProducts([]);
        return;
      }

      // Flexible column matcher
      const findKey = (row: Record<string, any>, candidates: string[]): any => {
        const keys = Object.keys(row);
        for (const candidate of candidates) {
          const match = keys.find(
            (k) =>
              k.trim().toLowerCase() === candidate.toLowerCase() ||
              k.trim().toLowerCase().includes(candidate.toLowerCase())
          );
          if (match !== undefined && row[match] !== undefined && row[match] !== '') {
            return row[match];
          }
        }
        return undefined;
      };

      const products: Product[] = [];

      for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i];

        const name = String(
          findKey(row, ['name', 'product name', 'item name', 'item', 'title', 'description', 'product']) ||
            ''
        ).trim();

        if (!name) continue; // Skip completely empty rows

        let barcode = String(
          findKey(row, ['barcode', 'code', 'item code', 'sku', 'upc', 'ean', 'bar code']) || ''
        ).trim();

        // If no barcode provided, generate standard retail 12-digit code
        if (!barcode) {
          barcode = `890${Math.floor(100000000 + Math.random() * 900000000)}`;
        }

        const category = String(
          findKey(row, ['category', 'group', 'type', 'department', 'cat']) || 'General'
        ).trim();

        const purchasePrice =
          parseFloat(
            String(findKey(row, ['purchase price', 'purchase', 'cost price', 'cost', 'buy price', 'rate']) || '0')
              .replace(/[^0-9.]/g, '')
          ) || 0;

        let mrp =
          parseFloat(
            String(findKey(row, ['mrp', 'max retail price', 'list price', 'retail price']) || '0')
              .replace(/[^0-9.]/g, '')
          ) || 0;

        let sellingPrice =
          parseFloat(
            String(findKey(row, ['selling price', 'selling', 'sale price', 'price', 'our price']) || '0')
              .replace(/[^0-9.]/g, '')
          ) || 0;

        // Sensible price fallbacks
        if (sellingPrice === 0 && mrp > 0) sellingPrice = mrp;
        if (mrp === 0 && sellingPrice > 0) mrp = sellingPrice;
        if (mrp === 0 && purchasePrice > 0) {
          mrp = Math.round(purchasePrice * 1.3);
          sellingPrice = Math.round(purchasePrice * 1.2);
        }

        const gstRate =
          parseFloat(
            String(findKey(row, ['gst', 'gst rate', 'tax', 'tax rate', 'gst%']) || '18')
              .replace(/[^0-9.]/g, '')
          ) || 18;

        const stockQty =
          parseInt(
            String(findKey(row, ['stock', 'qty', 'quantity', 'stock qty', 'opening stock', 'inventory']) || '10')
              .replace(/[^0-9]/g, '')
          ) || 0;

        const lowStockThreshold =
          parseInt(
            String(findKey(row, ['low stock', 'threshold', 'min stock', 'alert qty']) || '10')
              .replace(/[^0-9]/g, '')
          ) || 10;

        const unit = String(
          findKey(row, ['unit', 'uom', 'pack', 'unit of measure']) || 'pcs'
        ).trim() || 'pcs';

        products.push({
          id: `prod-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
          shopId: shop.id,
          name,
          barcode,
          category,
          purchasePrice,
          mrp,
          sellingPrice,
          gstRate,
          stockQty,
          lowStockThreshold,
          unit,
          batchNumber: `IMP-${new Date().getFullYear()}`,
          active: true,
        });
      }

      if (products.length === 0) {
        setError(
          'No valid product rows could be detected. Please make sure your sheet has a "Name" column.'
        );
        setParsedProducts([]);
      } else {
        setError(null);
        setParsedProducts(products);
      }
    } catch (err: any) {
      setError(`Failed to parse sheet: ${err.message || 'Unknown error'}`);
      setParsedProducts([]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsParsing(true);
    setError(null);

    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const wb = XLSX.read(data, { type: 'binary' });

        setRawWorkbook(wb);
        setSheetNames(wb.SheetNames);

        const firstSheet = wb.SheetNames[0] || '';
        setSelectedSheet(firstSheet);
        parseWorkbookSheet(wb, firstSheet);
      } catch (err: any) {
        setError(`Unable to read spreadsheet: ${err.message || 'Corrupted file'}`);
      } finally {
        setIsParsing(false);
      }
    };

    reader.onerror = () => {
      setError('Error reading file. Please try again.');
      setIsParsing(false);
    };

    reader.readAsBinaryString(selectedFile);
  };

  const handleSheetChange = (sheetName: string) => {
    setSelectedSheet(sheetName);
    if (rawWorkbook) {
      parseWorkbookSheet(rawWorkbook, sheetName);
    }
  };

  const handleSaveImport = () => {
    if (parsedProducts.length === 0) return;

    if (
      importMode === 'replace' &&
      !window.confirm(
        `Are you sure you want to replace the current catalog in "${shop.name}" with these ${parsedProducts.length} items? All previous products in this shop will be overwritten.`
      )
    ) {
      return;
    }

    try {
      const result = StorageService.saveProductsBulk(
        shop.id,
        parsedProducts,
        importMode === 'replace'
      );
      onImportSuccess(result.count);
      onClose();
    } catch (err: any) {
      setError(`Error saving products: ${err.message}`);
    }
  };

  const downloadSampleTemplate = () => {
    const sampleData = [
      {
        'Product Name': 'Basmati Premium Rice 5kg',
        'Barcode': '8901030012345',
        'Category': 'Groceries & Staples',
        'Purchase Price': 380,
        'MRP': 520,
        'Selling Price': 475,
        'Stock Qty': 40,
        'GST Rate': 5,
        'Unit': 'bag',
      },
      {
        'Product Name': 'Pure Mustard Oil 1L',
        'Barcode': '8901030056789',
        'Category': 'Groceries & Staples',
        'Purchase Price': 120,
        'MRP': 175,
        'Selling Price': 155,
        'Stock Qty': 60,
        'GST Rate': 5,
        'Unit': 'bottle',
      },
      {
        'Product Name': 'Organic Green Tea (Pack of 25 Bags)',
        'Barcode': '8901030099881',
        'Category': 'Snacks & Beverages',
        'Purchase Price': 110,
        'MRP': 190,
        'Selling Price': 165,
        'Stock Qty': 30,
        'GST Rate': 12,
        'Unit': 'box',
      },
      {
        'Product Name': 'Antibacterial Hand Wash 500ml',
        'Barcode': '8901030044321',
        'Category': 'Personal Care & Hygiene',
        'Purchase Price': 85,
        'MRP': 150,
        'Selling Price': 125,
        'Stock Qty': 50,
        'GST Rate': 18,
        'Unit': 'bottle',
      },
      {
        'Product Name': 'Heavy Duty Extension Board 4-Way',
        'Barcode': '8901030077654',
        'Category': 'Electronics & Accessories',
        'Purchase Price': 220,
        'MRP': 450,
        'Selling Price': 350,
        'Stock Qty': 25,
        'GST Rate': 18,
        'Unit': 'pcs',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    XLSX.writeFile(wb, 'retail_inventory_sample_template.xlsx');
  };

  const downloadBlankTemplate = () => {
    const blankHeaders = [
      {
        'Product Name': '',
        'Barcode': '',
        'Category': '',
        'Unit': 'pcs',
        'Purchase Price': '',
        'MRP': '',
        'Selling Price': '',
        'Stock Qty': '',
        'GST Rate': 18,
        'Low Stock Threshold': 10,
      },
    ];
    const ws = XLSX.utils.json_to_sheet(blankHeaders);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    XLSX.writeFile(wb, 'fresh_blank_inventory_template.xlsx');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <span>Bulk Import Inventory (Excel / CSV)</span>
                <span className="text-xs font-mono font-normal bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                  {shop.name}
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Upload your product spreadsheet (.xlsx, .xls, .csv). Barcodes are auto-generated if missing.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {/* Action Row: File Picker & Download Template */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 p-5 border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl bg-slate-50/50 flex flex-col items-center justify-center text-center transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv, .tsv"
                onChange={handleFileChange}
                className="hidden"
                id="excel-file-upload"
              />

              <div className="p-3 bg-white shadow-2xs rounded-full text-emerald-600 mb-2 border border-slate-200">
                <Upload className="w-5 h-5" />
              </div>

              <label
                htmlFor="excel-file-upload"
                className="font-bold text-slate-800 hover:text-emerald-700 cursor-pointer text-sm"
              >
                {file ? file.name : 'Click to select Excel or CSV file'}
              </label>

              <p className="text-slate-400 text-[11px] mt-1">
                Supports Excel (.xlsx, .xls), CSV, or TSV formats
              </p>

              {file && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg font-mono font-medium text-[11px]">
                    Size: {(file.size / 1024).toFixed(1)} KB
                  </span>
                  <label
                    htmlFor="excel-file-upload"
                    className="text-orange-600 hover:underline cursor-pointer font-semibold text-[11px]"
                  >
                    Change File
                  </label>
                </div>
              )}
            </div>

            {/* Template Download Card */}
            <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-emerald-950 flex items-center gap-1.5 text-xs">
                  <FileText className="w-4 h-4 text-emerald-700" />
                  <span>Download Templates</span>
                </h4>
                <p className="text-[11px] text-emerald-800/80 mt-1 leading-relaxed">
                  Download a pre-filled sample spreadsheet or a fresh blank template with headers only.
                </p>
              </div>

              <div className="mt-3 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={downloadSampleTemplate}
                  className="flex-1 py-2 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-1 text-[11px] shadow-2xs transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Sample (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={downloadBlankTemplate}
                  title="Pristine blank template with zero demo rows, ready for new store data"
                  className="flex-1 py-2 px-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold flex items-center justify-center gap-1 text-[11px] shadow-2xs transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Blank Clean (.xlsx)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Sheet Selector if multiple sheets exist */}
          {sheetNames.length > 1 && (
            <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="font-bold text-slate-700">Workbook Sheet:</span>
              <div className="flex flex-wrap gap-1.5">
                {sheetNames.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => handleSheetChange(name)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      selectedSheet === name
                        ? 'bg-slate-900 text-white font-bold'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Parsing Spinner */}
          {isParsing && (
            <div className="p-8 flex flex-col items-center justify-center text-slate-500 gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
              <span>Analyzing spreadsheet columns and rows...</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{error}</div>
            </div>
          )}

          {/* Preview Table of Parsed Products */}
          {parsedProducts.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-100/80 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-slate-900 text-xs sm:text-sm">
                    {parsedProducts.length} Products Detected
                  </span>
                </div>

                {/* Import Mode Radio Switcher */}
                <div className="flex items-center gap-4 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="excelImportMode"
                      checked={importMode === 'merge'}
                      onChange={() => setImportMode('merge')}
                      className="text-orange-600 focus:ring-orange-500"
                    />
                    <span className="text-slate-700 font-medium">Merge &amp; Update</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer" title="Removes existing products from this shop and replaces with new file">
                    <input
                      type="radio"
                      name="excelImportMode"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    <span className="text-rose-700 font-bold">Replace Catalog (Clean Slate)</span>
                  </label>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Product Name</th>
                        <th className="py-2.5 px-3">Barcode</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3 text-right">Cost Price</th>
                        <th className="py-2.5 px-3 text-right">MRP</th>
                        <th className="py-2.5 px-3 text-right">Sell Price</th>
                        <th className="py-2.5 px-3 text-right">Stock</th>
                        <th className="py-2.5 px-3 text-right">GST %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedProducts.slice(0, 20).map((prod, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80">
                          <td className="py-2 px-3 text-slate-400 font-mono">{idx + 1}</td>
                          <td className="py-2 px-3 font-semibold text-slate-900">{prod.name}</td>
                          <td className="py-2 px-3 font-mono text-slate-600">{prod.barcode}</td>
                          <td className="py-2 px-3">
                            <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-700">
                              {prod.category}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-600">
                            ₹{prod.purchasePrice}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-500">
                            ₹{prod.mrp}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                            ₹{prod.sellingPrice}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-semibold text-emerald-700">
                            {prod.stockQty} {prod.unit}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-600">
                            {prod.gstRate}%
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

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl font-semibold transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={parsedProducts.length === 0}
            onClick={handleSaveImport}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer text-xs sm:text-sm"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Import &amp; Save {parsedProducts.length} Products</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
