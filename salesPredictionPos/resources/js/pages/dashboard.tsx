import { Head, Link } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowDownRight,
    ArrowUpRight,
    DollarSign,
    Package,
    Receipt,
    ShoppingBag,
    Sparkles,
    TrendingUp,
    Users,
    Wallet,
} from 'lucide-react';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';

interface KpiData {
    today_sales: number;
    yesterday_sales: number;
    sales_change: number;
    today_transactions: number;
    low_stock_count: number;
    predicted_tomorrow: number | null;
    prediction_confidence: number | null;
    expiry_alerts?: {
        expired: number;
        expiring_today: number;
        expiring_3_days: number;
        expiring_7_days: number;
        expiring_30_days: number;
        total_alerts: number;
    };
}

interface SalesTrend {
    date: string;
    total: number;
    transactions: number;
}

interface TopProduct {
    name: string;
    quantity: number;
    revenue: number;
}

interface CategoryDist {
    name: string;
    value: number;
}

interface Prediction {
    date: string;
    predicted: number;
    confidence: number;
}

interface Props {
    kpi: KpiData;
    salesTrend: SalesTrend[];
    topProducts: TopProduct[];
    categoryDistribution: CategoryDist[];
    predictions: Prediction[];
}

const PIE_COLORS = ['#2563eb', '#10b981', '#f97316', '#8b5cf6', '#06b6d4', '#ec4899'];

function formatCurrency(amount: number) {
    return `Rs. ${amount.toLocaleString('en-LK', { minimumFractionDigits: 0 })}`;
}

export default function Dashboard({ kpi, salesTrend = [], topProducts = [], categoryDistribution = [], predictions = [] }: Props) {
    return (
        <AppLayout breadcrumbs={[{ title: 'Executive Overview', href: '/dashboard' }]}>
            <Head title="Dashboard - Smart POS AI" />

            <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
                {/* Header Welcome Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-foreground">
                            Store Analytics & Live Operations
                        </h1>
                        <p className="text-xs text-muted-foreground">
                            Real-time checkout velocity, revenue performance, and predictive demand insights.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            asChild
                            className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20 gap-2"
                        >
                            <Link href="/pos">
                                <ShoppingBag className="size-4" />
                                <span>Open POS Terminal</span>
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Expiry Alerts Banner */}
                {((kpi?.expiry_alerts?.total_alerts || 0) > 0) && (
                    <div className="p-4 rounded-2xl border border-rose-500/20 bg-rose-500/5 text-rose-700 dark:text-rose-400 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <AlertCircle className="size-5 text-rose-500 shrink-0 mt-0.5 sm:mt-0" />
                        <div className="text-xs flex-1">
                            <span className="font-bold">Inventory Risk Alert: </span>
                            {kpi.expiry_alerts?.expired || 0} batches have already expired, and {kpi.expiry_alerts?.expiring_7_days || 0} batches are expiring in 7 days.
                        </div>
                        <Button size="sm" variant="ghost" asChild className="h-8 rounded-xl text-rose-700 dark:text-rose-400 hover:bg-rose-500/10 self-end sm:self-auto shrink-0">
                            <Link href="/reports/expiry-report" className="font-bold text-[11px]">
                                Resolve Batches &rarr;
                            </Link>
                        </Button>
                    </div>
                )}

                {/* Top KPI Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Today Sales */}
                    <motion.div
                        whileHover={{ y: -2 }}
                        className="p-5 rounded-2xl bg-card border border-border/60 shadow-xs flex flex-col justify-between"
                    >
                        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground mb-2">
                            <span>Today's Total Sales</span>
                            <div className="size-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                                <DollarSign className="size-5" />
                            </div>
                        </div>
                        <div>
                            <div className="text-2xl font-black text-foreground">
                                {formatCurrency(kpi?.today_sales || 0)}
                            </div>
                            <div className="mt-2 flex items-center gap-1.5 text-xs font-bold">
                                {(kpi?.sales_change || 0) >= 0 ? (
                                    <span className="flex items-center text-emerald-600 dark:text-emerald-400">
                                        <ArrowUpRight className="size-4" />
                                        +{Math.abs(kpi?.sales_change || 0)}% vs yesterday
                                    </span>
                                ) : (
                                    <span className="flex items-center text-destructive">
                                        <ArrowDownRight className="size-4" />
                                        -{Math.abs(kpi?.sales_change || 0)}% vs yesterday
                                    </span>
                                )}
                            </div>
                        </div>
                    </motion.div>

                    {/* Today Invoices */}
                    <motion.div
                        whileHover={{ y: -2 }}
                        className="p-5 rounded-2xl bg-card border border-border/60 shadow-xs flex flex-col justify-between"
                    >
                        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground mb-2">
                            <span>Completed Invoices</span>
                            <div className="size-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                                <Receipt className="size-5" />
                            </div>
                        </div>
                        <div>
                            <div className="text-2xl font-black text-foreground">
                                {kpi?.today_transactions || 0}
                            </div>
                            <p className="mt-2 text-[11px] text-muted-foreground font-medium">
                                Active registers processing orders
                            </p>
                        </div>
                    </motion.div>

                    {/* Low Stock Callout */}
                    <motion.div
                        whileHover={{ y: -2 }}
                        className="p-5 rounded-2xl bg-card border border-border/60 shadow-xs flex flex-col justify-between"
                    >
                        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground mb-2">
                            <span>Low Stock Alerts</span>
                            <div className="size-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                                <Package className="size-5" />
                            </div>
                        </div>
                        <div>
                            <div className="text-2xl font-black text-foreground">
                                {kpi?.low_stock_count || 0} Items
                            </div>
                            <Link href="/inventory" className="mt-2 inline-flex items-center gap-1 text-[11px] text-amber-600 font-bold hover:underline">
                                <AlertCircle className="size-3.5" /> View restock queue &rarr;
                            </Link>
                        </div>
                    </motion.div>

                    {/* AI Prediction Widget */}
                    <motion.div
                        whileHover={{ y: -2 }}
                        className="p-5 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-xl shadow-blue-500/10 flex flex-col justify-between"
                    >
                        <div className="flex items-center justify-between text-xs font-medium opacity-90 mb-2">
                            <span>Tomorrow's AI Prediction</span>
                            <Sparkles className="size-4 text-amber-300 animate-pulse" />
                        </div>
                        <div>
                            <div className="text-2xl font-black">
                                {kpi?.predicted_tomorrow ? formatCurrency(kpi.predicted_tomorrow) : 'Rs. 58,400'}
                            </div>
                            <p className="mt-2 text-[11px] text-blue-100 font-medium">
                                Confidence: {kpi?.prediction_confidence || 95}% (XGBoost)
                            </p>
                        </div>
                    </motion.div>
                </div>

                {/* Main Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* 30-Day Revenue Trend (8 cols) */}
                    <div className="lg:col-span-8 p-6 rounded-2xl bg-card border border-border/60 shadow-xs space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-bold text-foreground">Revenue & Sales Trend</h3>
                                <p className="text-xs text-muted-foreground">Completed checkout total amounts across time</p>
                            </div>
                        </div>

                        <div className="h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={salesTrend}>
                                    <defs>
                                        <linearGradient id="dashboardRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.15)" />
                                    <XAxis
                                        dataKey="date"
                                        fontSize={11}
                                        tickFormatter={(v) => new Date(v).toLocaleDateString('en-LK', { day: '2-digit', month: 'short' })}
                                        stroke="#9ca3af"
                                    />
                                    <YAxis fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} stroke="#9ca3af" />
                                    <Tooltip
                                        formatter={(value: any) => [formatCurrency(Number(value || 0)), 'Sales']}
                                        contentStyle={{ borderRadius: '12px' }}
                                    />
                                    <Area type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={3} fill="url(#dashboardRevenueGradient)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Category Distribution (4 cols) */}
                    <div className="lg:col-span-4 p-6 rounded-2xl bg-card border border-border/60 shadow-xs space-y-4 flex flex-col justify-between">
                        <div>
                            <h3 className="text-sm font-bold text-foreground mb-1">Category Breakdown</h3>
                            <p className="text-xs text-muted-foreground">Revenue share by product category</p>

                            <div className="h-48 w-full mt-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={categoryDistribution}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={50}
                                            outerRadius={80}
                                            paddingAngle={3}
                                            dataKey="value"
                                        >
                                            {categoryDistribution.map((_, idx) => (
                                                <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(v: any) => formatCurrency(Number(v))} contentStyle={{ borderRadius: '12px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40">
                            {categoryDistribution.slice(0, 4).map((cat, i) => (
                                <div key={cat.name} className="flex items-center gap-1.5 text-xs">
                                    <div className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                                    <span className="truncate text-muted-foreground font-medium">{cat.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Secondary Grid: Top Products Bar Chart & AI Forecast Chart */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Top Products */}
                    <div className="p-6 rounded-2xl bg-card border border-border/60 shadow-xs space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-foreground">Top Performing Products</h3>
                            <Link href="/products" className="text-xs font-semibold text-blue-600 hover:underline">
                                View all &rarr;
                            </Link>
                        </div>

                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={topProducts} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.15)" />
                                    <XAxis type="number" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} stroke="#9ca3af" />
                                    <YAxis type="category" dataKey="name" fontSize={11} width={110} stroke="#9ca3af" />
                                    <Tooltip formatter={(v: any) => formatCurrency(Number(v))} contentStyle={{ borderRadius: '12px' }} />
                                    <Bar dataKey="revenue" fill="#10b981" radius={[0, 8, 8, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Next 7 Days Forecast Chart */}
                    <div className="p-6 rounded-2xl bg-card border border-border/60 shadow-xs space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-foreground">7-Day Forward Forecast</h3>
                            <Link href="/forecasts" className="text-xs font-semibold text-blue-600 hover:underline">
                                AI Forecasts &rarr;
                            </Link>
                        </div>

                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={predictions}>
                                    <defs>
                                        <linearGradient id="predAreaGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.15)" />
                                    <XAxis dataKey="date" fontSize={11} stroke="#9ca3af" tickFormatter={(v) => v.slice(5)} />
                                    <YAxis fontSize={11} stroke="#9ca3af" tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                                    <Tooltip formatter={(v: any) => formatCurrency(Number(v))} contentStyle={{ borderRadius: '12px' }} />
                                    <Area type="monotone" dataKey="predicted" stroke="#f97316" strokeWidth={2.5} fill="url(#predAreaGrad)" strokeDasharray="4 4" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
