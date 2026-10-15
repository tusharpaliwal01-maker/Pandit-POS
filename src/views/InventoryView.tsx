import React, { useState, useMemo, useEffect } from 'react';
import {
  Package,
  Search,
  Plus,
  AlertTriangle,
  AlertCircle,
  Edit2,
  Trash2,
  Tag,
  Filter,
  CheckCircle2,
  X,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Percent,
  ArrowUpDown,
  FileSpreadsheet,
} from 'lucide-react';
import { Product, Shop } from '../types';
import { StorageService } from '../services/storage';

export interface ProfitMarginInfo {
  profit: number;
  marginPercent: number;
  markupPercent: number;
  isLowMargin: boolean;
  isLoss: boolean;
}

export const calculateProfitMargin = (
  purchasePrice: number,
  sellingPrice: number,
  threshold = 15
): ProfitMarginInfo => {
  const pPrice = Number(purchasePrice) || 0;
  const sPrice = Number(sellingPrice) || 0;
  const profit = Number((sPrice - pPrice).toFixed(2));
  const marginPercent = sPrice > 0 ? Number(((profit / sPrice) * 100).toFixed(1)) : 0;
  const markupPercent = pPrice > 0 ? Number(((profit / pPrice) * 100).toFixed(1)) : 0;
  const isLoss = profit < 0;
  const isLowMargin = marginPercent <= threshold;
  return { profit, marginPercent, markupPercent, isLowMargin, isLoss };
};

interface InventoryViewProps {
  shop: Shop;
  products: Product[];
  onRefreshData: () => void;
  onNavigateToLabels?: () => void;
  onNavigateToSheets?: () => void;
  initialOnlyLowStock?: boolean;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  shop,
  products,
  onRefreshData,
  onNavigateToLabels,
  onNavigateToSheets,
  initialOnlyLowStock = false,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [onlyLowStock, setOnlyLowStock] = useState(initialOnlyLowStock);
  const [onlyLowMargin, setOnlyLowMargin] = useState(false);
  const [lowMarginThreshold, setLowMarginThreshold] = useState<number>(15);
  const [sortBy, setSortBy] = useState<'default' | 'margin_asc' | 'margin_desc' | 'stock' | 'name'>('default');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    if (initialOnlyLowStock) {
      setOnlyLowStock(true);
    }
  }, [initialOnlyLowStock]);

  // Form State
  const [formName, setFormName] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [formCategory, setFormCategory] = useState('Sparklers (Phuljhadi)');
  const [formPurchasePrice, setFormPurchasePrice] = useState('50');
  const [formMrp, setFormMrp] = useState('120');
  const [formSellingPrice, setFormSellingPrice] = useState('95');
  const [formGstRate, setFormGstRate] = useState('18');
  const [formStockQty, setFormStockQty] = useState('50');
  const [formLowStockThreshold, setFormLowStockThreshold] = useState('20');
  const [formUnit, setFormUnit] = useState('box');
  const [formBatch, setFormBatch] = useState(`PFC-${new Date().getFullYear()}-B1`);
  const [formDescription, setFormDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return ['All', ...Array.from(set)];
  }, [products]);

  // Margin summary stats
  const { lowStockCount, lowMarginCount, avgMarginPercent } = useMemo(() => {
    let lowStock = 0;
    let lowMargin = 0;
    let totalMarginSum = 0;
    let count = 0;

    products.filter((p) => p.active).forEach((p) => {
      if (p.stockQty <= p.lowStockThreshold) lowStock++;
      const { marginPercent, isLowMargin } = calculateProfitMargin(
        p.purchasePrice,
        p.sellingPrice,
        lowMarginThreshold
      );
      if (isLowMargin) lowMargin++;
      if (p.sellingPrice > 0) {
        totalMarginSum += marginPercent;
        count++;
      }
    });

    return {
      lowStockCount: lowStock,
      lowMarginCount: lowMargin,
      avgMarginPercent: count > 0 ? Number((totalMarginSum / count).toFixed(1)) : 0,
    };
  }, [products, lowMarginThreshold]);

  const filteredProducts = useMemo(() => {
    let list = products.filter((p) => {
      const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.barcode.includes(search) ||
        p.category.toLowerCase().includes(search.toLowerCase());
      const matchesLowStock = onlyLowStock ? p.stockQty <= p.lowStockThreshold : true;
      const marginInfo = calculateProfitMargin(p.purchasePrice, p.sellingPrice, lowMarginThreshold);
      const matchesLowMargin = onlyLowMargin ? marginInfo.isLowMargin : true;
      return matchesCat && matchesSearch && matchesLowStock && matchesLowMargin && p.active;
    });

    if (sortBy === 'margin_asc') {
      list = [...list].sort((a, b) => {
        const mA = calculateProfitMargin(a.purchasePrice, a.sellingPrice, lowMarginThreshold).marginPercent;
        const mB = calculateProfitMargin(b.purchasePrice, b.sellingPrice, lowMarginThreshold).marginPercent;
        return mA - mB;
      });
    } else if (sortBy === 'margin_desc') {
      list = [...list].sort((a, b) => {
        const mA = calculateProfitMargin(a.purchasePrice, a.sellingPrice, lowMarginThreshold).marginPercent;
        const mB = calculateProfitMargin(b.purchasePrice, b.sellingPrice, lowMarginThreshold).marginPercent;
        return mB - mA;
      });
    } else if (sortBy === 'stock') {
      list = [...list].sort((a, b) => a.stockQty - b.stockQty);
    } else if (sortBy === 'name') {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  }, [products, selectedCategory, search, onlyLowStock, onlyLowMargin, lowMarginThreshold, sortBy]);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormName('');
    setFormBarcode(`890${Math.floor(100000000 + Math.random() * 900000000)}`);
    setFormCategory(categories[1] || 'Sparklers (Phuljhadi)');
    setFormPurchasePrice('50');
    setFormMrp('120');
    setFormSellingPrice('95');
    setFormGstRate('18');
    setFormStockQty('50');
    setFormLowStockThreshold('20');
    setFormUnit('box');
    setFormBatch(`PFC-${new Date().getFullYear()}-B1`);
    setFormDescription('');
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormBarcode(product.barcode);
    setFormCategory(product.category);
    setFormPurchasePrice(product.purchasePrice.toString());
    setFormMrp(product.mrp.toString());
    setFormSellingPrice(product.sellingPrice.toString());
    setFormGstRate(product.gstRate.toString());
    setFormStockQty(product.stockQty.toString());
    setFormLowStockThreshold(product.lowStockThreshold.toString());
    setFormUnit(product.unit);
    setFormBatch(product.batchNumber || '');
    setFormDescription(product.description || '');
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formName.trim() || !formBarcode.trim()) {
      setFormError('Product Name and Barcode are required');
      return;
    }

    const newProd: Product = {
      id: editingProduct ? editingProduct.id : `prod-${Date.now()}`,
      shopId: shop.id,
      name: formName.trim(),
      barcode: formBarcode.trim(),
      category: formCategory,
      purchasePrice: parseFloat(formPurchasePrice) || 0,
      mrp: parseFloat(formMrp) || 0,
      sellingPrice: parseFloat(formSellingPrice) || 0,
      gstRate: parseFloat(formGstRate) || 18,
      stockQty: parseInt(formStockQty) || 0,
      lowStockThreshold: parseInt(formLowStockThreshold) || 10,
      unit: formUnit,
      batchNumber: formBatch.trim() || undefined,
      description: formDescription.trim() || undefined,
      active: true,
    };

    StorageService.saveProduct(newProd);
    onRefreshData();
    setIsAddModalOpen(false);
  };

  const handleDeleteProduct = (productId: string) => {
    if (window.confirm('Are you sure you want to remove this product from inventory?')) {
      StorageService.deleteProduct(productId);
      onRefreshData();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-orange-600" />
            <span>Product Inventory &amp; Stock Control</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage product catalog, MRPs, purchase costs, GST tax rates, and low-stock alerts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {onNavigateToSheets && (
            <button
              onClick={onNavigateToSheets}
              className="flex items-center gap-1.5 px-3.5 py-2 border border-emerald-300 bg-emerald-50/70 hover:bg-emerald-100/70 text-emerald-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Google Sheets Sync</span>
            </button>
          )}

          {onNavigateToLabels && (
            <button
              onClick={onNavigateToLabels}
              className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
            >
              <Tag className="w-4 h-4 text-orange-600" />
              <span>Print Barcode Labels</span>
            </button>
          )}

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase">Total Catalog</div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono text-slate-900">{products.filter((p) => p.active).length}</span>
            <span className="text-xs text-slate-400">Products</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase flex items-center justify-between">
            <span>Average Margin</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono text-emerald-700">+{avgMarginPercent}%</span>
            <span className="text-xs text-slate-400">Avg Markup</span>
          </div>
        </div>

        {/* Low Margin KPI Alert Card - Highlighted in Yellow */}
        <button
          onClick={() => setOnlyLowMargin(!onlyLowMargin)}
          className={`text-left rounded-xl border p-3.5 shadow-2xs transition-all cursor-pointer ${
            onlyLowMargin
              ? 'bg-yellow-100 border-yellow-400 ring-2 ring-yellow-400/50'
              : 'bg-yellow-50/80 border-yellow-300 hover:bg-yellow-100/70'
          }`}
          title="Click to toggle filter for low profit margin items"
        >
          <div className="text-[11px] font-bold text-yellow-900 uppercase flex items-center justify-between">
            <span className="flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-yellow-700" />
              Low Margin (&lt;{lowMarginThreshold}%)
            </span>
            <span className="text-[10px] px-1.5 py-0.2 bg-yellow-200 text-yellow-900 font-bold rounded">
              {onlyLowMargin ? 'FILTER ACTIVE' : 'CLICK TO FILTER'}
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono text-yellow-950">{lowMarginCount}</span>
            <span className="text-xs text-yellow-800 font-medium">Items Flagged</span>
          </div>
        </button>

        {/* Low Stock KPI Card */}
        <button
          onClick={() => setOnlyLowStock(!onlyLowStock)}
          className={`text-left rounded-xl border p-3.5 shadow-2xs transition-all cursor-pointer ${
            onlyLowStock
              ? 'bg-amber-100 border-amber-400 ring-2 ring-amber-400/50'
              : 'bg-amber-50/80 border-amber-200 hover:bg-amber-100/70'
          }`}
        >
          <div className="text-[11px] font-bold text-amber-900 uppercase flex items-center justify-between">
            <span className="flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              Low Stock Alerts
            </span>
            <span className="text-[10px] px-1.5 py-0.2 bg-amber-200 text-amber-900 font-bold rounded">
              {onlyLowStock ? 'FILTER ACTIVE' : 'CLICK TO FILTER'}
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono text-amber-900">{lowStockCount}</span>
            <span className="text-xs text-amber-700 font-medium">Under Threshold</span>
          </div>
        </button>
      </div>

      {/* Filter Strip */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search fireworks by name, barcode, or category..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:border-orange-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Low Margin Toggle Button in Yellow */}
            <button
              onClick={() => setOnlyLowMargin(!onlyLowMargin)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                onlyLowMargin
                  ? 'bg-yellow-300 text-yellow-950 border-yellow-500 shadow-2xs ring-2 ring-yellow-400/50'
                  : 'bg-yellow-50 text-yellow-900 border-yellow-300 hover:bg-yellow-100'
              }`}
              title={`Toggle filtering products with profit margin under ${lowMarginThreshold}%`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-yellow-800" />
              <span>Low Margin (&lt;{lowMarginThreshold}%) ({lowMarginCount})</span>
            </button>

            {/* Margin Threshold Selector */}
            <div className="flex items-center gap-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
              <span className="text-[11px] text-slate-500 font-medium">Alert at:</span>
              <select
                value={lowMarginThreshold}
                onChange={(e) => setLowMarginThreshold(Number(e.target.value))}
                className="bg-transparent font-bold text-slate-800 text-xs outline-none cursor-pointer"
                title="Set low margin highlight threshold percentage"
              >
                <option value={10}>&lt; 10%</option>
                <option value={15}>&lt; 15% (Default)</option>
                <option value={20}>&lt; 20%</option>
                <option value={25}>&lt; 25%</option>
              </select>
            </div>

            {/* Low stock toggle */}
            <button
              onClick={() => setOnlyLowStock(!onlyLowStock)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                onlyLowStock
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Low Stock ({lowStockCount})</span>
            </button>

            {/* Category Select */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:bg-white"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent font-medium text-slate-800 text-xs outline-none cursor-pointer"
              >
                <option value="default">Default Sort</option>
                <option value="margin_asc">Margin: Lowest First (Low Profit)</option>
                <option value="margin_desc">Margin: Highest First</option>
                <option value="stock">Stock Quantity</option>
                <option value="name">Product Name (A-Z)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
              <tr>
                <th className="py-3 px-4">Product Name &amp; Category</th>
                <th className="py-3 px-3">Barcode</th>
                <th className="py-3 px-3">Purchase Cost</th>
                <th className="py-3 px-3">MRP</th>
                <th className="py-3 px-3">Selling Price</th>
                {/* Dedicated Profit Margin Column with calculation formula hint */}
                <th className="py-3 px-3 text-center bg-yellow-50 border-x border-yellow-300 text-yellow-950 font-bold">
                  <div className="flex flex-col items-center justify-center">
                    <div className="flex items-center gap-1 text-xs">
                      <Percent className="w-3.5 h-3.5 text-yellow-800" />
                      <span>Profit Margin %</span>
                    </div>
                    <span className="text-[9px] font-normal text-yellow-800 lowercase">
                      ((sell - cost) ÷ sell)
                    </span>
                  </div>
                </th>
                <th className="py-3 px-2">GST</th>
                <th className="py-3 px-3">Stock On Hand</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((p) => {
                const isLow = p.stockQty <= p.lowStockThreshold;
                const isOut = p.stockQty <= 0;
                const marginInfo = calculateProfitMargin(p.purchasePrice, p.sellingPrice, lowMarginThreshold);

                return (
                  <tr
                    key={p.id}
                    className={`transition-colors ${
                      marginInfo.isLowMargin
                        ? 'bg-yellow-50/95 hover:bg-yellow-100 border-l-4 border-l-yellow-500 shadow-2xs'
                        : 'hover:bg-slate-50/70'
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 flex items-center gap-2">
                        <span>{p.name}</span>
                        {marginInfo.isLowMargin && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-300 text-yellow-950 font-extrabold text-[10px] rounded-md border border-yellow-500 shadow-2xs">
                            <AlertTriangle className="w-3 h-3 text-yellow-900 shrink-0" />
                            <span>LOW MARGIN</span>
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>{p.category}</span>
                        {p.batchNumber && (
                          <>
                            <span>·</span>
                            <span className="font-mono text-slate-400">Batch: {p.batchNumber}</span>
                          </>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-3 font-mono font-medium text-slate-700">
                      {p.barcode}
                    </td>

                    <td className="py-3 px-3 font-mono text-slate-600">
                      ₹{p.purchasePrice}
                    </td>

                    <td className="py-3 px-3 font-mono text-slate-500 line-through">
                      ₹{p.mrp}
                    </td>

                    <td className="py-3 px-3 font-mono font-bold text-slate-900">
                      ₹{p.sellingPrice}
                    </td>

                    {/* Profit Margin Cell - Prominently highlighted in Yellow for low margins */}
                    <td
                      className={`py-3 px-3 text-center border-x transition-colors ${
                        marginInfo.isLowMargin
                          ? 'bg-yellow-100 border-yellow-300 ring-1 ring-inset ring-yellow-400/60'
                          : 'border-slate-100'
                      }`}
                    >
                      <div className="flex flex-col items-center justify-center">
                        {marginInfo.isLoss ? (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold font-mono bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs"
                            title={`Loss of ₹${Math.abs(marginInfo.profit)} per unit! Selling price is below cost.`}
                          >
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            <span>{marginInfo.marginPercent}% Loss</span>
                          </span>
                        ) : marginInfo.isLowMargin ? (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-black font-mono bg-yellow-300 text-yellow-950 border border-yellow-500 shadow-xs ring-2 ring-yellow-400/80"
                            title={`LOW MARGIN ALERT: ${marginInfo.marginPercent}% margin is at or below the ${lowMarginThreshold}% threshold.`}
                          >
                            <AlertTriangle className="w-3.5 h-3.5 text-yellow-900 shrink-0" />
                            <span className="text-sm">{marginInfo.marginPercent}%</span>
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold font-mono bg-emerald-50 text-emerald-800 border border-emerald-200"
                            title={`Healthy profit margin: ${marginInfo.marginPercent}%`}
                          >
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>+{marginInfo.marginPercent}%</span>
                          </span>
                        )}

                        <span
                          className={`text-[10px] font-mono mt-1 ${
                            marginInfo.isLoss
                              ? 'text-rose-700 font-bold'
                              : marginInfo.isLowMargin
                              ? 'text-yellow-950 font-bold'
                              : 'text-slate-500'
                          }`}
                        >
                          {marginInfo.profit >= 0
                            ? `+₹${marginInfo.profit.toFixed(1)} (₹${p.sellingPrice} - ₹${p.purchasePrice})`
                            : `-₹${Math.abs(marginInfo.profit).toFixed(1)} (₹${p.sellingPrice} - ₹${p.purchasePrice})`}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-2 font-mono text-slate-600">
                      {p.gstRate}%
                    </td>

                    <td className="py-3 px-3 font-mono">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${
                          isOut
                            ? 'bg-rose-100 text-rose-700'
                            : isLow
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {isLow && <AlertTriangle className="w-3 h-3" />}
                        {p.stockQty} {p.unit}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-semibold text-slate-900 text-sm">
                {editingProduct ? 'Edit Fireworks Product' : 'Add New Product to Catalog'}
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
              {formError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. 15cm Tri-Colour Sparklers"
                  required
                  autoFocus
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:border-orange-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-slate-700">Barcode *</label>
                    <button
                      type="button"
                      onClick={() =>
                        setFormBarcode(`890${Math.floor(100000000 + Math.random() * 900000000)}`)
                      }
                      className="text-[10px] text-orange-600 hover:underline flex items-center gap-0.5"
                    >
                      <Sparkles className="w-3 h-3" /> Auto-Generate
                    </button>
                  </div>
                  <input
                    type="text"
                    value={formBarcode}
                    onChange={(e) => setFormBarcode(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono outline-none focus:bg-white focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category *
                  </label>
                  <input
                    type="text"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="e.g. Flower Pots (Anar)"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Purchase Cost (₹)
                  </label>
                  <input
                    type="number"
                    value={formPurchasePrice}
                    onChange={(e) => setFormPurchasePrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono outline-none focus:bg-white focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    MRP (₹)
                  </label>
                  <input
                    type="number"
                    value={formMrp}
                    onChange={(e) => setFormMrp(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono outline-none focus:bg-white focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Selling Price (₹) *
                  </label>
                  <input
                    type="number"
                    value={formSellingPrice}
                    onChange={(e) => setFormSellingPrice(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 outline-none focus:bg-white focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Live Profit Margin Calculator & Low Margin Warning */}
              {(() => {
                const modalPurchase = parseFloat(formPurchasePrice) || 0;
                const modalSelling = parseFloat(formSellingPrice) || 0;
                const modalMarginInfo = calculateProfitMargin(modalPurchase, modalSelling, lowMarginThreshold);
                const targetPrice20 = Math.ceil(modalPurchase / 0.8);

                return (
                  <div
                    className={`p-3 rounded-lg border text-xs transition-colors ${
                      modalMarginInfo.isLoss
                        ? 'bg-rose-50 border-rose-300 text-rose-900'
                        : modalMarginInfo.isLowMargin
                        ? 'bg-yellow-50 border-yellow-400 text-yellow-950 shadow-2xs'
                        : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {modalMarginInfo.isLoss ? (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      ) : modalMarginInfo.isLowMargin ? (
                        <AlertTriangle className="w-4 h-4 text-yellow-800 shrink-0 mt-0.5" />
                      ) : (
                        <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      )}

                      <div className="flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold">Calculated Profit Margin:</span>
                            <span
                              className={`font-mono font-bold text-sm px-2 py-0.5 rounded ${
                                modalMarginInfo.isLoss
                                  ? 'bg-rose-200 text-rose-900'
                                  : modalMarginInfo.isLowMargin
                                  ? 'bg-yellow-200 text-yellow-950 border border-yellow-400'
                                  : 'bg-emerald-100 text-emerald-900'
                              }`}
                            >
                              {modalMarginInfo.marginPercent}%
                            </span>
                            {modalMarginInfo.isLowMargin && !modalMarginInfo.isLoss && (
                              <span className="text-[10px] uppercase font-bold bg-yellow-300 text-yellow-950 px-1.5 py-0.2 rounded border border-yellow-500">
                                Low Margin
                              </span>
                            )}
                          </div>
                          <span className="font-mono font-semibold">
                            Net Profit: {modalMarginInfo.profit >= 0 ? `+₹${modalMarginInfo.profit.toFixed(2)}` : `-₹${Math.abs(modalMarginInfo.profit).toFixed(2)}`} / unit
                          </span>
                        </div>

                        <p className="text-[11px] mt-1 opacity-90 leading-relaxed">
                          {modalMarginInfo.isLoss ? (
                            <span className="font-semibold text-rose-700">
                              ⛔ Warning: Selling Price is lower than Purchase Cost! You will lose ₹{Math.abs(modalMarginInfo.profit).toFixed(2)} per unit sold.
                            </span>
                          ) : modalMarginInfo.isLowMargin ? (
                            <span>
                              ⚠️ <strong>Low Margin Alert:</strong> Margin of {modalMarginInfo.marginPercent}% is below your {lowMarginThreshold}% target. To achieve at least a 20% margin, recommend setting selling price to <strong>₹{targetPrice20}</strong>.
                            </span>
                          ) : (
                            <span>
                              ✅ <strong>Healthy Margin:</strong> {modalMarginInfo.marginPercent}% profit margin exceeds your {lowMarginThreshold}% threshold.
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    GST Rate
                  </label>
                  <select
                    value={formGstRate}
                    onChange={(e) => setFormGstRate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white"
                  >
                    <option value="18">18% (Standard Fireworks)</option>
                    <option value="28">28% (Aerial Cakes / Rockets)</option>
                    <option value="12">12%</option>
                    <option value="5">5%</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Stock Quantity *
                  </label>
                  <input
                    type="number"
                    value={formStockQty}
                    onChange={(e) => setFormStockQty(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono outline-none focus:bg-white focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Low Stock Alert
                  </label>
                  <input
                    type="number"
                    value={formLowStockThreshold}
                    onChange={(e) => setFormLowStockThreshold(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono outline-none focus:bg-white focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Unit Type
                  </label>
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white"
                  >
                    <option value="box">Box</option>
                    <option value="pcs">Pieces</option>
                    <option value="roll">Roll / Ladi</option>
                    <option value="pkt">Packet</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Batch Number
                  </label>
                  <input
                    type="text"
                    value={formBatch}
                    onChange={(e) => setFormBatch(e.target.value)}
                    placeholder="e.g. PFC-2026-B1"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono outline-none focus:bg-white focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description &amp; Safety Note
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                  placeholder="e.g. Green fireworks formulation, outdoor use only."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:border-orange-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  {editingProduct ? 'Save Changes' : 'Add to Inventory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
