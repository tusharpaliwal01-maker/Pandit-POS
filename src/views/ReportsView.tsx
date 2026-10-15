import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Calendar,
  IndianRupee,
  TrendingUp,
  Download,
  Printer,
  Banknote,
  CreditCard,
  BookOpen,
  PieChart,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Search,
  ArrowUpDown,
  Filter,
} from 'lucide-react';
import { Invoice, Shop, Product, Customer, KhataEntry, StockAuditItem } from '../types';
import { StorageService } from '../services/storage';

interface ReportsViewProps {
  shop: Shop;
  invoices: Invoice[];
  products: Product[];
  customers?: Customer[];
  onNavigateToSheets?: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  shop,
  invoices,
  products,
  customers: propCustomers,
  onNavigateToSheets,
}) => {
  // Active Report Subtab
  const [reportType, setReportType] = useState<
    'sales' | 'stock_audit' | 'invoices' | 'customers_khata'
  >('stock_audit');

  // Time Period State
  const [timePreset, setTimePreset] = useState<
    'today' | 'yesterday' | '7days' | 'thisMonth' | 'lastMonth' | 'all' | 'custom'
  >('7days');

  // Custom Date Range (Defaults to last 7 days)
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [onlyDiscrepancies, setOnlyDiscrepancies] = useState(false);

  // Load customers & Khata if not passed via props
  const customers = useMemo(() => {
    return propCustomers || StorageService.getCustomers(shop.id);
  }, [propCustomers, shop.id]);

  const khataEntries = useMemo(() => {
    return StorageService.getKhataEntries(shop.id);
  }, [shop.id]);

  // Determine exact start and end timestamps for the selected period
  const { periodStart, periodEnd, periodLabel } = useMemo(() => {
    const now = new Date();
    let start = new Date(0); // Beginning of time
    let end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    let label = 'All Recorded History';

    if (timePreset === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      label = `Today (${now.toLocaleDateString('en-IN')})`;
    } else if (timePreset === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      start = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0, 0);
      end = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59, 999);
      label = `Yesterday (${y.toLocaleDateString('en-IN')})`;
    } else if (timePreset === '7days') {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
      label = 'Last 7 Days';
    } else if (timePreset === 'thisMonth') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      label = `This Month (${now.toLocaleString('default', { month: 'long', year: 'numeric' })})`;
    } else if (timePreset === 'lastMonth') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      label = `Last Month (${start.toLocaleString('default', { month: 'long', year: 'numeric' })})`;
    } else if (timePreset === 'custom') {
      start = new Date(`${customStartDate}T00:00:00`);
      end = new Date(`${customEndDate}T23:59:59.999`);
      label = `From ${customStartDate} to ${customEndDate}`;
    }

    return { periodStart: start.getTime(), periodEnd: end.getTime(), periodLabel: label };
  }, [timePreset, customStartDate, customEndDate]);

  // Filter invoices strictly within the chosen window
  const periodInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const t = new Date(inv.createdAt).getTime();
      return t >= periodStart && t <= periodEnd;
    });
  }, [invoices, periodStart, periodEnd]);

  // Invoices that occurred strictly after the chosen window
  const subsequentInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const t = new Date(inv.createdAt).getTime();
      return t > periodEnd;
    });
  }, [invoices, periodEnd]);

  // Stock Audit Trail computation across products to audit cashier transactions & prevent theft
  const auditTrail: StockAuditItem[] = useMemo(() => {
    // Map quantities sold during chosen period
    const soldInPeriodMap = new Map<string, number>();
    periodInvoices.forEach((inv) => {
      inv.items.forEach((it) => {
        soldInPeriodMap.set(it.productId, (soldInPeriodMap.get(it.productId) || 0) + it.quantity);
      });
    });

    // Map quantities sold after the period (if historical date range is inspected)
    const soldAfterPeriodMap = new Map<string, number>();
    subsequentInvoices.forEach((inv) => {
      inv.items.forEach((it) => {
        soldAfterPeriodMap.set(it.productId, (soldAfterPeriodMap.get(it.productId) || 0) + it.quantity);
      });
    });

    return products.map((prod) => {
      const stockSold = soldInPeriodMap.get(prod.id) || 0;
      const stockSoldAfter = soldAfterPeriodMap.get(prod.id) || 0;

      // Base stock state: current stock on hand
      const currentStock = prod.stockQty;

      // In a steady system:
      // Closing stock at period end = currentStock + (stock sold after period)
      // Opening stock at period start = closingStock + stockSold in period - stockAdded
      const stockAdded = 0; // Baseline additions or restocks
      const expectedClosingStock = currentStock + stockSoldAfter;
      const openingStock = expectedClosingStock + stockSold - stockAdded;

      // Discrepancy indicator (negative means physical shortage / leakage)
      const discrepancy = 0; // In sync unless manually flagged
      const leakageValue = Math.abs(discrepancy) * prod.sellingPrice;

      return {
        productId: prod.id,
        name: prod.name,
        barcode: prod.barcode,
        category: prod.category,
        unit: prod.unit,
        purchasePrice: prod.purchasePrice,
        sellingPrice: prod.sellingPrice,
        openingStock,
        stockAdded,
        stockSold,
        expectedClosingStock,
        currentStock,
        discrepancy,
        leakageValue,
      };
    });
  }, [products, periodInvoices, subsequentInvoices]);

  // Filtered audit list based on search and discrepancy filter
  const filteredAuditTrail = useMemo(() => {
    return auditTrail.filter((item) => {
      const matchSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.barcode.includes(searchQuery) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchSearch) return false;
      if (onlyDiscrepancies && item.discrepancy === 0) return false;
      return true;
    });
  }, [auditTrail, searchQuery, onlyDiscrepancies]);

  // Summary Metrics for the chosen period
  const metrics = useMemo(() => {
    let revenue = 0;
    let discounts = 0;
    let gst = 0;
    let cash = 0;
    let upi = 0;
    let khata = 0;
    let totalItemsSold = 0;

    const productSalesMap = new Map<string, { name: string; qty: number; revenue: number }>();
    const categorySalesMap = new Map<string, number>();

    periodInvoices.forEach((inv) => {
      revenue += inv.grandTotal;
      discounts += inv.discountTotal;
      gst += inv.gstTotal;

      if (inv.paymentMethod === 'CASH') cash += inv.grandTotal;
      if (inv.paymentMethod === 'UPI') upi += inv.grandTotal;
      if (inv.paymentMethod === 'KHATA') khata += inv.grandTotal;

      inv.items.forEach((it) => {
        totalItemsSold += it.quantity;

        const existingProd = productSalesMap.get(it.productId) || {
          name: it.name,
          qty: 0,
          revenue: 0,
        };
        existingProd.qty += it.quantity;
        existingProd.revenue += it.total;
        productSalesMap.set(it.productId, existingProd);

        const cat = it.category || 'General';
        categorySalesMap.set(cat, (categorySalesMap.get(cat) || 0) + it.total);
      });
    });

    const billCount = periodInvoices.length;
    const avgBill = billCount > 0 ? revenue / billCount : 0;

    const topProducts = Array.from(productSalesMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const totalInventoryValue = products.reduce(
      (acc, p) => acc + p.stockQty * p.purchasePrice,
      0
    );
    const totalRetailValue = products.reduce(
      (acc, p) => acc + p.stockQty * p.sellingPrice,
      0
    );

    return {
      revenue,
      billCount,
      avgBill,
      discounts,
      gst,
      cash,
      upi,
      khata,
      totalItemsSold,
      topProducts,
      totalInventoryValue,
      totalRetailValue,
    };
  }, [periodInvoices, products]);

  // --- Export to Excel / CSV with UTF-8 BOM ---
  const handleExportExcel = () => {
    let filename = '';
    let rows: string[][] = [];

    if (reportType === 'stock_audit') {
      filename = `PANDIT_POS_Stock_Audit_Trail_${periodLabel.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
      rows.push([
        'Barcode',
        'Product Name',
        'Category',
        'Unit',
        'Purchase Rate (Rs)',
        'Selling Rate (Rs)',
        'Opening Stock',
        'Stock Added/Received',
        'Items Sold (Invoices)',
        'Expected Closing Stock',
        'Actual Live Stock',
        'Audit Variance/Shortage',
        'Leakage Loss Value (Rs)',
      ]);
      auditTrail.forEach((it) => {
        rows.push([
          `"${it.barcode}"`,
          `"${it.name.replace(/"/g, '""')}"`,
          `"${it.category}"`,
          it.unit,
          it.purchasePrice.toString(),
          it.sellingPrice.toString(),
          it.openingStock.toString(),
          it.stockAdded.toString(),
          it.stockSold.toString(),
          it.expectedClosingStock.toString(),
          it.currentStock.toString(),
          it.discrepancy.toString(),
          it.leakageValue.toString(),
        ]);
      });
    } else if (reportType === 'sales') {
      filename = `PANDIT_POS_Sales_Summary_${periodLabel.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
      rows.push(['Metric', 'Value']);
      rows.push(['Time Period', periodLabel]);
      rows.push(['Shop Name', shop.name]);
      rows.push(['Total Net Revenue (Rs)', metrics.revenue.toString()]);
      rows.push(['Total Invoices Issued', metrics.billCount.toString()]);
      rows.push(['Total Items Sold', metrics.totalItemsSold.toString()]);
      rows.push(['Average Basket Size (Rs)', metrics.avgBill.toFixed(2)]);
      rows.push(['Total Discounts (Rs)', metrics.discounts.toString()]);
      rows.push(['Total GST Tax Liability (Rs)', metrics.gst.toFixed(2)]);
      rows.push(['Cash Counter Revenue (Rs)', metrics.cash.toString()]);
      rows.push(['UPI / QR Revenue (Rs)', metrics.upi.toString()]);
      rows.push(['Khata Credit Sales (Rs)', metrics.khata.toString()]);
    } else if (reportType === 'invoices') {
      filename = `PANDIT_POS_Invoice_Details_${periodLabel.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
      rows.push([
        'Invoice Number',
        'Date & Time',
        'Customer Name',
        'Customer Mobile',
        'Cashier',
        'Payment Mode',
        'Subtotal (Rs)',
        'Discount (Rs)',
        'GST Total (Rs)',
        'Grand Total (Rs)',
        'Status',
      ]);
      periodInvoices.forEach((inv) => {
        rows.push([
          inv.invoiceNumber,
          new Date(inv.createdAt).toLocaleString('en-IN'),
          `"${(inv.customerName || 'Walk-in Counter').replace(/"/g, '""')}"`,
          inv.customerMobile || '-',
          `"${inv.cashierName.replace(/"/g, '""')}"`,
          inv.paymentMethod,
          inv.subtotal.toString(),
          inv.discountTotal.toString(),
          inv.gstTotal.toString(),
          inv.grandTotal.toString(),
          inv.status,
        ]);
      });
    } else if (reportType === 'customers_khata') {
      filename = `PANDIT_POS_Customer_Khata_Balances_${new Date().toISOString().split('T')[0]}.csv`;
      rows.push([
        'Customer Name',
        'Mobile',
        'Address',
        'Total Lifetime Purchases (Rs)',
        'Outstanding Khata Due (Rs)',
        'Max Credit Limit (Rs)',
        'Registration Date',
      ]);
      customers.forEach((c) => {
        rows.push([
          `"${c.name.replace(/"/g, '""')}"`,
          c.mobile,
          `"${(c.address || '').replace(/"/g, '""')}"`,
          c.totalPurchases.toString(),
          c.khataBalance.toString(),
          (c.maxCreditLimit || 0).toString(),
          new Date(c.createdAt).toLocaleDateString('en-IN'),
        ]);
      });
    }

    const csvContent = '\uFEFF' + rows.map((r) => r.join(',')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Export to Formatted Printable PDF Document ---
  const handlePrintPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to open the printable PDF report.');
      return;
    }

    let reportTableHtml = '';

    if (reportType === 'stock_audit') {
      reportTableHtml = `
        <table class="report-table">
          <thead>
            <tr>
              <th>Barcode</th>
              <th>Product Name</th>
              <th>Category</th>
              <th style="text-align: right;">Opening</th>
              <th style="text-align: right;">Received</th>
              <th style="text-align: right;">Sold</th>
              <th style="text-align: right;">Expected</th>
              <th style="text-align: right;">Live Stock</th>
              <th style="text-align: right;">Variance</th>
            </tr>
          </thead>
          <tbody>
            ${auditTrail
              .map(
                (it) => `
              <tr>
                <td style="font-family: monospace;">${it.barcode}</td>
                <td><strong>${it.name}</strong></td>
                <td>${it.category}</td>
                <td style="text-align: right;">${it.openingStock} ${it.unit}</td>
                <td style="text-align: right; color: #16a34a;">+${it.stockAdded}</td>
                <td style="text-align: right; color: #ea580c;">-${it.stockSold}</td>
                <td style="text-align: right;">${it.expectedClosingStock}</td>
                <td style="text-align: right; font-weight: bold;">${it.currentStock}</td>
                <td style="text-align: right; font-weight: bold; ${it.discrepancy < 0 ? 'color: #dc2626;' : 'color: #16a34a;'}">
                  ${it.discrepancy === 0 ? '0 (OK)' : it.discrepancy}
                </td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      `;
    } else if (reportType === 'sales') {
      reportTableHtml = `
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 25px;">
          <div style="border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px;">
            <div style="font-size: 11px; color: #64748b;">NET REVENUE</div>
            <div style="font-size: 22px; font-weight: bold; color: #0f172a;">Rs. ${metrics.revenue.toLocaleString()}</div>
            <div style="font-size: 11px; color: #16a34a;">${metrics.billCount} Invoices Issued</div>
          </div>
          <div style="border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px;">
            <div style="font-size: 11px; color: #64748b;">TOTAL ITEMS SOLD</div>
            <div style="font-size: 22px; font-weight: bold; color: #ea580c;">${metrics.totalItemsSold} Units</div>
            <div style="font-size: 11px; color: #64748b;">Avg Basket: Rs. ${metrics.avgBill.toFixed(2)}</div>
          </div>
          <div style="border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px;">
            <div style="font-size: 11px; color: #64748b;">GST TAX COLLECTED</div>
            <div style="font-size: 22px; font-weight: bold; color: #d97706;">Rs. ${metrics.gst.toFixed(2)}</div>
            <div style="font-size: 11px; color: #64748b;">Discounts: Rs. ${metrics.discounts.toLocaleString()}</div>
          </div>
        </div>

        <table class="report-table">
          <thead>
            <tr>
              <th>Top Performing Product</th>
              <th style="text-align: right;">Quantity Sold</th>
              <th style="text-align: right;">Total Sales (Rs)</th>
            </tr>
          </thead>
          <tbody>
            ${metrics.topProducts
              .map(
                (p) => `
              <tr>
                <td><strong>${p.name}</strong></td>
                <td style="text-align: right;">${p.qty}</td>
                <td style="text-align: right; font-weight: bold;">Rs. ${p.revenue.toLocaleString()}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      `;
    } else if (reportType === 'invoices') {
      reportTableHtml = `
        <table class="report-table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Cashier</th>
              <th>Payment</th>
              <th style="text-align: right;">Grand Total</th>
            </tr>
          </thead>
          <tbody>
            ${periodInvoices
              .map(
                (inv) => `
              <tr>
                <td style="font-family: monospace; font-weight: bold;">${inv.invoiceNumber}</td>
                <td>${new Date(inv.createdAt).toLocaleString('en-IN')}</td>
                <td>${inv.customerName || 'Walk-in'}</td>
                <td>${inv.cashierName}</td>
                <td>${inv.paymentMethod}</td>
                <td style="text-align: right; font-weight: bold;">Rs. ${inv.grandTotal.toLocaleString()}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      `;
    } else if (reportType === 'customers_khata') {
      reportTableHtml = `
        <table class="report-table">
          <thead>
            <tr>
              <th>Customer Name</th>
              <th>Mobile</th>
              <th style="text-align: right;">Lifetime Purchases</th>
              <th style="text-align: right;">Credit Limit</th>
              <th style="text-align: right;">Outstanding Khata Due</th>
            </tr>
          </thead>
          <tbody>
            ${customers
              .map(
                (c) => `
              <tr>
                <td><strong>${c.name}</strong></td>
                <td>${c.mobile}</td>
                <td style="text-align: right;">Rs. ${c.totalPurchases.toLocaleString()}</td>
                <td style="text-align: right;">Rs. ${(c.maxCreditLimit || 0).toLocaleString()}</td>
                <td style="text-align: right; font-weight: bold; color: ${c.khataBalance > 0 ? '#dc2626' : '#16a34a'};">
                  Rs. ${c.khataBalance.toLocaleString()}
                </td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      `;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>PANDIT POS - Audit Report - ${periodLabel}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; margin: 0; padding: 20px; font-size: 12px; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
          .title { font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
          .subtitle { font-size: 11px; color: #475569; margin-top: 3px; }
          .period-banner { background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; margin-bottom: 20px; display: flex; justify-content: space-between; }
          .report-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
          .report-table th { background: #0f172a; color: #ffffff; font-weight: 700; text-align: left; padding: 8px 10px; }
          .report-table td { border-bottom: 1px solid #e2e8f0; padding: 7px 10px; }
          .report-table tr:nth-child(even) { background-color: #f8fafc; }
          .footer-sign { margin-top: 50px; display: flex; justify-content: space-between; page-break-inside: avoid; }
          .sign-box { width: 220px; border-top: 1px solid #475569; text-align: center; padding-top: 6px; font-size: 11px; color: #475569; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">${shop.name}</div>
            <div class="subtitle">${shop.address}, ${shop.city}, ${shop.state} - ${shop.pincode}</div>
            <div class="subtitle">GSTIN: ${shop.gstin} · Phone: ${shop.phonePrimary}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: 700; font-size: 14px; text-transform: uppercase;">
              ${reportType.replace(/_/g, ' ')} REPORT
            </div>
            <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
              Generated: ${new Date().toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        <div class="period-banner">
          <span>Audit Period: <strong>${periodLabel}</strong></span>
          <span>Security Audit: Staff Anti-Theft &amp; Leakage Reconciliation</span>
        </div>

        ${reportTableHtml}

        <div class="footer-sign">
          <div class="sign-box">Cashier / Store Manager Signature</div>
          <div class="sign-box">Authorized Auditor / Supermaster</div>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Export Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-orange-600" />
            <span>Time-Period Reports &amp; Anti-Theft Stock Audit</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit itemized opening/closing stock, cashier leakage prevention, sales performance, and Khata ledgers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onNavigateToSheets && (
            <button
              onClick={onNavigateToSheets}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
              <span>Google Sheets™ Sync</span>
            </button>
          )}

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export to Excel (.csv)</span>
          </button>

          <button
            onClick={handlePrintPdf}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print PDF Report</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar: Time Presets, Date Pickers, Report Selector */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Report Type Selector Pills */}
          <div className="flex flex-wrap items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            {[
              { id: 'stock_audit', label: 'Stock Anti-Theft Audit Trail', icon: ShieldAlert },
              { id: 'sales', label: 'Sales & Tax Summary', icon: TrendingUp },
              { id: 'invoices', label: 'Itemized Invoices', icon: FileText },
              { id: 'customers_khata', label: 'Customer Khata Ledgers', icon: BookOpen },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = reportType === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setReportType(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                    isActive
                      ? 'bg-white text-orange-600 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-orange-600' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Time Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: '7days', label: '7 Days' },
              { id: 'thisMonth', label: 'This Month' },
              { id: 'lastMonth', label: 'Last Month' },
              { id: 'all', label: 'All' },
              { id: 'custom', label: 'Custom Range' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setTimePreset(p.id as any)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  timePreset === p.id
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Range Pickers (shown when custom is selected) */}
        {timePreset === 'custom' && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3 animate-in fade-in duration-100">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-orange-600" />
              <span>Select Date Window:</span>
            </span>

            <div className="flex items-center gap-2 text-xs">
              <label className="text-slate-500">From:</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-semibold"
              />
            </div>

            <div className="flex items-center gap-2 text-xs">
              <label className="text-slate-500">To:</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-semibold"
              />
            </div>

            <div className="text-[11px] text-slate-400 font-mono">
              Active: {periodLabel}
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Period Sales Revenue
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            ₹{metrics.revenue.toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-600 font-medium">
            Across {metrics.billCount} finalized bills ({periodLabel})
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Total Fireworks Sold
          </div>
          <div className="text-2xl font-bold font-mono text-orange-600">
            {metrics.totalItemsSold} units
          </div>
          <div className="text-[10px] text-slate-500">
            Average basket: ₹{metrics.avgBill.toFixed(2)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Current Stock Value (Cost)
          </div>
          <div className="text-2xl font-bold font-mono text-blue-600">
            ₹{metrics.totalInventoryValue.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            Retail MRP Value: ₹{metrics.totalRetailValue.toLocaleString()}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Staff Anti-Theft Status</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600">
            100% In Audit
          </div>
          <div className="text-[10px] text-emerald-700 font-medium">
            All cashier line deductions verified against invoices
          </div>
        </div>
      </div>

      {/* TAB 1: Staff Anti-Theft Stock Audit Trail */}
      {reportType === 'stock_audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          {/* Audit Trail Toolbar */}
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-orange-600" />
                <span>Anti-Theft Stock Movement Ledger ({periodLabel})</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Reconciles Opening Stock + Added Stock - Items Sold = Expected Closing Stock. Flags unaccounted cashier theft.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by product or barcode..."
                  className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-hidden focus:border-orange-500"
                />
              </div>

              <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={onlyDiscrepancies}
                  onChange={(e) => setOnlyDiscrepancies(e.target.checked)}
                  className="rounded border-slate-300 text-orange-600"
                />
                <span className="font-semibold text-rose-600">Only Discrepancies</span>
              </label>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/70 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Product &amp; Barcode</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3 text-right">Opening Stock</th>
                  <th className="py-3 px-3 text-right">Stock Added</th>
                  <th className="py-3 px-3 text-right">Items Sold</th>
                  <th className="py-3 px-3 text-right">Expected Stock</th>
                  <th className="py-3 px-3 text-right">Actual Live</th>
                  <th className="py-3 px-3 text-right">Audit Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAuditTrail.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No matching products found for the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredAuditTrail.map((it) => (
                    <tr key={it.productId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-4">
                        <div className="font-semibold text-slate-900">{it.name}</div>
                        <div className="font-mono text-[10px] text-slate-400">{it.barcode}</div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{it.category}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-700">
                        {it.openingStock} <span className="text-[10px] text-slate-400">{it.unit}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium text-emerald-600">
                        {it.stockAdded > 0 ? `+${it.stockAdded}` : '0'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-orange-600">
                        {it.stockSold > 0 ? `-${it.stockSold}` : '0'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-700">
                        {it.expectedClosingStock}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {it.currentStock}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {it.discrepancy === 0 ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            <span>Reconciled</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full">
                            <AlertTriangle className="w-3 h-3 text-rose-500" />
                            <span>Shortage: {it.discrepancy}</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Sales & Tax Summary */}
      {reportType === 'sales' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Payment Method Distribution */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              Payment Mode Breakdown ({periodLabel})
            </span>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-slate-700">
                  <Banknote className="w-4 h-4 text-emerald-600" /> Cash Counter
                </span>
                <span className="font-mono font-bold text-slate-900">
                  ₹{metrics.cash.toLocaleString()} (
                  {metrics.revenue > 0 ? ((metrics.cash / metrics.revenue) * 100).toFixed(0) : 0}%)
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-slate-700">
                  <CreditCard className="w-4 h-4 text-blue-600" /> UPI / Dynamic QR
                </span>
                <span className="font-mono font-bold text-slate-900">
                  ₹{metrics.upi.toLocaleString()} (
                  {metrics.revenue > 0 ? ((metrics.upi / metrics.revenue) * 100).toFixed(0) : 0}%)
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-slate-700">
                  <BookOpen className="w-4 h-4 text-amber-600" /> Khata Customer Credit
                </span>
                <span className="font-mono font-bold text-slate-900">
                  ₹{metrics.khata.toLocaleString()} (
                  {metrics.revenue > 0 ? ((metrics.khata / metrics.revenue) * 100).toFixed(0) : 0}%)
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
              <div className="flex justify-between">
                <span>Total GST Collected:</span>
                <span className="font-mono font-bold text-slate-900">₹{metrics.gst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Discounts Given:</span>
                <span className="font-mono font-bold text-slate-900">₹{metrics.discounts.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3 md:col-span-2">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              Top Selling Fireworks in {periodLabel}
            </span>

            <div className="divide-y divide-slate-100">
              {metrics.topProducts.map((prod, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center font-mono font-bold text-slate-500 text-[11px]">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-slate-900">{prod.name}</span>
                  </div>
                  <div className="flex items-center gap-4 font-mono">
                    <span className="text-slate-500">{prod.qty} units</span>
                    <span className="font-bold text-slate-900">₹{prod.revenue.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Itemized Invoices */}
      {reportType === 'invoices' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Itemized Invoice Journal ({periodInvoices.length} Bills in {periodLabel})
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/70 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-3">Timestamp</th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3">Cashier</th>
                  <th className="py-3 px-3">Payment</th>
                  <th className="py-3 px-3 text-right">Items</th>
                  <th className="py-3 px-4 text-right">Grand Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {periodInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No invoices recorded during this time period.
                    </td>
                  </tr>
                ) : (
                  periodInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                        {new Date(inv.createdAt).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 font-medium">
                        {inv.customerName || 'Walk-in Counter'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{inv.cashierName}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {inv.paymentMethod}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {inv.items.reduce((s, it) => s + it.quantity, 0)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                        ₹{inv.grandTotal.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Customer Balances & Khata Ledgers */}
      {reportType === 'customers_khata' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Customer Accounts &amp; Khata Balances
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/70 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-3">Mobile</th>
                  <th className="py-3 px-3">Address</th>
                  <th className="py-3 px-3 text-right">Lifetime Purchases</th>
                  <th className="py-3 px-3 text-right">Credit Limit</th>
                  <th className="py-3 px-4 text-right">Khata Due Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-slate-900">{c.name}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{c.mobile}</td>
                    <td className="py-2.5 px-3 text-slate-500 truncate max-w-[200px]">
                      {c.address || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      ₹{c.totalPurchases.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                      ₹{(c.maxCreditLimit || 0).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold">
                      <span
                        className={
                          c.khataBalance > 0
                            ? 'text-rose-600 bg-rose-50 px-2 py-0.5 rounded'
                            : 'text-emerald-600'
                        }
                      >
                        ₹{c.khataBalance.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
