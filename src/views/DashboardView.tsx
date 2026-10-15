import React, { useState, useMemo } from 'react';
import {
  IndianRupee,
  ShoppingCart,
  Users,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Banknote,
  CreditCard,
  BookOpen,
  Package,
  Printer,
  Sparkles,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
} from 'lucide-react';
import { Invoice, Product, Customer, Shop } from '../types';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface DashboardViewProps {
  shop: Shop;
  invoices: Invoice[];
  products: Product[];
  customers: Customer[];
  onNavigate: (tab: string) => void;
  onOpenReceipt: (invoice: Invoice) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  shop,
  invoices,
  products,
  customers,
  onNavigate,
  onOpenReceipt,
}) => {
  const [chartMetric, setChartMetric] = useState<'REVENUE' | 'BREAKDOWN' | 'BILLS'>('REVENUE');

  // Today's metrics
  const todayMetrics = useMemo(() => {
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDay = today.getDate();

    const todayInvoices = invoices.filter((i) => {
      const d = new Date(i.createdAt);
      return (
        d.getFullYear() === todayYear &&
        d.getMonth() === todayMonth &&
        d.getDate() === todayDay
      );
    });

    let revenue = 0;
    let cash = 0;
    let upi = 0;
    let khata = 0;

    todayInvoices.forEach((inv) => {
      revenue += inv.grandTotal;
      if (inv.paymentMethod === 'CASH') cash += inv.grandTotal;
      if (inv.paymentMethod === 'UPI') upi += inv.grandTotal;
      if (inv.paymentMethod === 'KHATA') khata += inv.grandTotal;
    });

    return {
      revenue,
      billCount: todayInvoices.length,
      cash,
      upi,
      khata,
    };
  }, [invoices]);

  // Overall Monthly totals
  const monthlyRevenue = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    return invoices
      .filter((i) => {
        const d = new Date(i.createdAt);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((acc, curr) => acc + curr.grandTotal, 0);
  }, [invoices]);

  // Outstanding Khata
  const totalKhataOutstanding = useMemo(() => {
    return customers.reduce((acc, c) => acc + c.khataBalance, 0);
  }, [customers]);

  // Low stock products
  const lowStockProducts = useMemo(() => {
    return products.filter((p) => p.stockQty <= p.lowStockThreshold && p.active);
  }, [products]);

  // 7-day daily sales revenue data pipeline from current shop invoices (robust calendar matching)
  const last7DaysData = useMemo(() => {
    const days: {
      date: string;
      shortDate: string;
      fullDate: string;
      dayName: string;
      revenue: number;
      cash: number;
      upi: number;
      khata: number;
      billCount: number;
    }[] = [];

    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const targetYear = targetDate.getFullYear();
      const targetMonth = targetDate.getMonth();
      const targetDay = targetDate.getDate();

      // Robust calendar date matching regardless of UTC vs local ISO string
      const dayInvoices = invoices.filter((inv) => {
        const d = new Date(inv.createdAt);
        return (
          d.getFullYear() === targetYear &&
          d.getMonth() === targetMonth &&
          d.getDate() === targetDay
        );
      });

      let revenue = 0;
      let cash = 0;
      let upi = 0;
      let khata = 0;

      dayInvoices.forEach((inv) => {
        revenue += inv.grandTotal;
        if (inv.paymentMethod === 'CASH') cash += inv.grandTotal;
        if (inv.paymentMethod === 'UPI') upi += inv.grandTotal;
        if (inv.paymentMethod === 'KHATA') khata += inv.grandTotal;
      });

      const dayName = targetDate.toLocaleDateString('en-IN', { weekday: 'short' });
      const dayLabel = targetDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });

      days.push({
        date: `${dayName}, ${dayLabel}`,
        shortDate: `${dayName} ${targetDay}`,
        fullDate: targetDate.toLocaleDateString('en-IN', {
          weekday: 'long',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
        dayName,
        revenue: Math.round(revenue * 100) / 100,
        cash: Math.round(cash * 100) / 100,
        upi: Math.round(upi * 100) / 100,
        khata: Math.round(khata * 100) / 100,
        billCount: dayInvoices.length,
      });
    }

    return days;
  }, [invoices]);

  const total7DayRevenue = useMemo(() => {
    return last7DaysData.reduce((acc, curr) => acc + curr.revenue, 0);
  }, [last7DaysData]);

  const total7DayBills = useMemo(() => {
    return last7DaysData.reduce((acc, curr) => acc + curr.billCount, 0);
  }, [last7DaysData]);

  const dailyAverage = Math.round(total7DayRevenue / 7);

  const peakDay = useMemo(() => {
    if (last7DaysData.length === 0) return null;
    return [...last7DaysData].sort((a, b) => b.revenue - a.revenue)[0];
  }, [last7DaysData]);

  // Performance pace: today vs daily run rate
  const performanceDiff = dailyAverage > 0
    ? Math.round(((todayMetrics.revenue - dailyAverage) / dailyAverage) * 100)
    : 0;

  // Recent invoices
  const recentInvoices = invoices.slice(0, 5);

  // Custom Tooltip for Line Chart
  const CustomChartTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white rounded-xl shadow-2xl p-3 border border-slate-700 text-xs font-mono space-y-1.5 z-50 min-w-[210px] animate-in fade-in duration-100">
          <div className="font-bold font-sans text-slate-200 border-b border-slate-700 pb-1.5 flex items-center justify-between gap-3">
            <span className="truncate">{data.fullDate}</span>
            <span className="text-[10px] font-mono text-orange-400 bg-orange-950/80 px-1.5 py-0.5 rounded border border-orange-800/50 shrink-0">
              {data.billCount} bills
            </span>
          </div>

          <div className="flex items-center justify-between gap-4 text-orange-400 font-bold text-sm pt-0.5">
            <span>Total Sales:</span>
            <span>₹{data.revenue.toLocaleString()}</span>
          </div>

          <div className="text-[11px] text-slate-400 space-y-1 pt-1.5 border-t border-slate-800 font-mono">
            <div className="flex items-center justify-between text-emerald-400">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Cash Counter:</span>
              </span>
              <span className="font-bold">₹{data.cash.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-blue-400">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span>UPI / Digital:</span>
              </span>
              <span className="font-bold">₹{data.upi.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-amber-400">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span>Khata Credit:</span>
              </span>
              <span className="font-bold">₹{data.khata.toLocaleString()}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Welcome / Fast POS Launch Action Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold tracking-widest text-orange-400">
              Retail Terminal Active
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">
            {shop.name}
          </h2>
          <p className="text-xs text-slate-300">
            {shop.address}, {shop.city} · GSTIN: <span className="font-mono">{shop.gstin}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('pos')}
            className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Launch POS Terminal</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Today's Sales */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Today's Net Revenue
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            ₹{todayMetrics.revenue.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            {todayMetrics.billCount} bills printed today
          </div>
        </div>

        {/* Monthly Revenue */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Monthly Sales
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            ₹{monthlyRevenue.toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium">
            Active Diwali/Festival Season
          </div>
        </div>

        {/* Khata Receivables */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Total Khata Due
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600">
            ₹{totalKhataOutstanding.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500">
            Across {customers.filter((c) => c.khataBalance > 0).length} accounts
          </div>
        </div>

        {/* Total Customers */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Customer Base
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {customers.length}
          </div>
          <div className="text-[11px] text-slate-400">Wholesale &amp; Retail Ledgers</div>
        </div>
      </div>

      {/* Today's Payment Breakup Strip */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Today's Payment Inflow Split
          </span>
          <span className="text-xs text-slate-500 font-mono">
            Total: ₹{todayMetrics.revenue.toLocaleString()}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Banknote className="w-5 h-5 text-emerald-600" />
              <div>
                <div className="text-[11px] font-semibold text-emerald-900">Cash Counter</div>
                <div className="text-xs text-emerald-700 font-mono">Instant Cash Drawer</div>
              </div>
            </div>
            <div className="font-mono font-bold text-base text-emerald-900">
              ₹{todayMetrics.cash.toLocaleString()}
            </div>
          </div>

          <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              <div>
                <div className="text-[11px] font-semibold text-blue-900">UPI Payments</div>
                <div className="text-xs text-blue-700 font-mono">{shop.upiId}</div>
              </div>
            </div>
            <div className="font-mono font-bold text-base text-blue-900">
              ₹{todayMetrics.upi.toLocaleString()}
            </div>
          </div>

          <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-amber-600" />
              <div>
                <div className="text-[11px] font-semibold text-amber-900">Khata Credit Given</div>
                <div className="text-xs text-amber-700 font-mono">Ledger Receivables</div>
              </div>
            </div>
            <div className="font-mono font-bold text-base text-amber-900">
              ₹{todayMetrics.khata.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* 7-Day Revenue Trend Line Chart */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
        {/* Chart Header & Executive Highlights */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>7-Day Sales Performance &amp; Revenue Trends</span>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Live Real-Time
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Turnover trajectory across retail billing, cash collections, and customer Khata credit.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono">
            <div className="bg-orange-50/80 border border-orange-200/80 px-3 py-1.5 rounded-xl text-left sm:text-right">
              <span className="text-[10px] text-orange-800 block uppercase font-sans font-bold">
                7-Day Turnover
              </span>
              <span className="font-bold text-orange-600 text-sm">
                ₹{total7DayRevenue.toLocaleString()}
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-left sm:text-right">
              <span className="text-[10px] text-slate-500 block uppercase font-sans font-bold">
                Daily Run Rate
              </span>
              <span className="font-bold text-slate-900 text-sm">
                ₹{dailyAverage.toLocaleString()}
              </span>
            </div>

            {peakDay && peakDay.revenue > 0 && (
              <div className="bg-emerald-50/70 border border-emerald-200/80 px-3 py-1.5 rounded-xl text-left sm:text-right hidden sm:block">
                <span className="text-[10px] text-emerald-700 block uppercase font-sans font-bold">
                  Peak Day ({peakDay.dayName})
                </span>
                <span className="font-bold text-emerald-800 text-sm">
                  ₹{peakDay.revenue.toLocaleString()}
                </span>
              </div>
            )}

            {dailyAverage > 0 && (
              <div
                className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 font-sans ${
                  performanceDiff >= 0
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
                title="Today's sales pace compared to 7-day average"
              >
                {performanceDiff >= 0 ? (
                  <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-slate-400" />
                )}
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                    Today vs Avg
                  </div>
                  <div className="font-bold text-xs font-mono">
                    {performanceDiff > 0 ? `+${performanceDiff}%` : `${performanceDiff}%`}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* View Toggle Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
            <button
              onClick={() => setChartMetric('REVENUE')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                chartMetric === 'REVENUE'
                  ? 'bg-white text-orange-600 shadow-2xs font-bold'
                  : 'hover:text-slate-900'
              }`}
            >
              <IndianRupee className="w-3.5 h-3.5" />
              <span>Total Sales (₹)</span>
            </button>

            <button
              onClick={() => setChartMetric('BREAKDOWN')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                chartMetric === 'BREAKDOWN'
                  ? 'bg-white text-orange-600 shadow-2xs font-bold'
                  : 'hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Payment Split (Cash/UPI/Khata)</span>
            </button>

            <button
              onClick={() => setChartMetric('BILLS')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                chartMetric === 'BILLS'
                  ? 'bg-white text-orange-600 shadow-2xs font-bold'
                  : 'hover:text-slate-900'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Bill Volume ({total7DayBills})</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-400 font-mono hidden md:block">
            {chartMetric === 'REVENUE' && 'Showing total daily turnover curve'}
            {chartMetric === 'BREAKDOWN' && 'Comparing Cash Drawer, UPI, & Khata trends'}
            {chartMetric === 'BILLS' && 'Tracking customer order volume over 7 days'}
          </div>
        </div>

        {/* Recharts LineChart Visual Container */}
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={last7DaysData}
              margin={{ top: 10, right: 20, left: 5, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#94A3B8"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#E2E8F0' }}
              />
              <YAxis
                stroke="#94A3B8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) =>
                  chartMetric === 'BILLS'
                    ? `${v} bills`
                    : `₹${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`
                }
              />
              <Tooltip content={<CustomChartTooltip />} />

              {/* Total Revenue Mode */}
              {chartMetric === 'REVENUE' && (
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="Total Revenue"
                  stroke="#EA580C"
                  strokeWidth={3}
                  dot={{ r: 4.5, stroke: '#EA580C', strokeWidth: 2, fill: '#FFFFFF' }}
                  activeDot={{ r: 7, stroke: '#EA580C', strokeWidth: 2.5, fill: '#EA580C' }}
                />
              )}

              {/* Payment Split Breakdown Mode */}
              {chartMetric === 'BREAKDOWN' && (
                <>
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    wrapperStyle={{ paddingBottom: '10px', fontSize: '11px', fontFamily: 'sans-serif' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="cash"
                    name="Cash Counter"
                    stroke="#10B981"
                    strokeWidth={2.5}
                    dot={{ r: 3.5, stroke: '#10B981', strokeWidth: 1.5, fill: '#FFFFFF' }}
                    activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2, fill: '#10B981' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="upi"
                    name="UPI / Digital"
                    stroke="#3B82F6"
                    strokeWidth={2.5}
                    dot={{ r: 3.5, stroke: '#3B82F6', strokeWidth: 1.5, fill: '#FFFFFF' }}
                    activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2, fill: '#3B82F6' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="khata"
                    name="Khata Credit"
                    stroke="#F59E0B"
                    strokeWidth={2.5}
                    dot={{ r: 3.5, stroke: '#F59E0B', strokeWidth: 1.5, fill: '#FFFFFF' }}
                    activeDot={{ r: 6, stroke: '#F59E0B', strokeWidth: 2, fill: '#F59E0B' }}
                  />
                </>
              )}

              {/* Bill Volume Mode */}
              {chartMetric === 'BILLS' && (
                <Line
                  type="monotone"
                  dataKey="billCount"
                  name="Printed Invoices"
                  stroke="#8B5CF6"
                  strokeWidth={3}
                  dot={{ r: 4.5, stroke: '#8B5CF6', strokeWidth: 2, fill: '#FFFFFF' }}
                  activeDot={{ r: 7, stroke: '#8B5CF6', strokeWidth: 2.5, fill: '#8B5CF6' }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Split Section: Low Stock Warning vs Recent Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Low Stock Alerts */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Low / Out-of-Stock Fireworks ({lowStockProducts.length})
              </span>
            </div>
            <button
              onClick={() => onNavigate('inventory')}
              className="text-xs text-orange-600 hover:text-orange-700 font-semibold"
            >
              Restock →
            </button>
          </div>

          <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1">
            {lowStockProducts.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                All fireworks have healthy inventory levels!
              </div>
            ) : (
              lowStockProducts.map((p) => (
                <div key={p.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-slate-900">{p.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{p.category}</div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                        p.stockQty <= 0
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {p.stockQty} {p.unit}
                    </span>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Min: {p.lowStockThreshold}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Recent Invoices
            </span>
            <button
              onClick={() => onNavigate('invoices')}
              className="text-xs text-orange-600 hover:text-orange-700 font-semibold"
            >
              View All ({invoices.length}) →
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentInvoices.map((inv) => (
              <div key={inv.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-mono font-bold text-slate-900">{inv.invoiceNumber}</div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-2">
                    <span>{inv.customerName || 'Walk-in Counter'}</span>
                    <span>·</span>
                    <span className="font-mono">{new Date(inv.createdAt).toLocaleTimeString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-mono font-bold text-slate-900 text-sm">
                      ₹{inv.grandTotal.toFixed(2)}
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                      {inv.paymentMethod}
                    </span>
                  </div>

                  <button
                    onClick={() => onOpenReceipt(inv)}
                    className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
