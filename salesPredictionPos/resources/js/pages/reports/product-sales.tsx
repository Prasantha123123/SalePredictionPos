import { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import {
    Award,
    BarChart3,
    Box,
    Calendar,
    DollarSign,
    Download,
    Eye,
    FileSpreadsheet,
    Filter,
    Package,
    Printer,
    Search,
    TrendingUp,
    Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';

interface ProductSaleRow {
    id: number;
    name: string;
    sku: string;
    barcode: string | null;
    category_name: string | null;
    units_sold: number;
    total_revenue: number;
    total_discount: number;
    total_cost: number;
    avg_price: number;
    profit: number;
    remaining_stock: number;
    stock_value: number;
}

interface Props {
    productSales: {
        data: ProductSaleRow[];
        links: { url: string | null; label: string; active: boolean }[];
        current_page: number;
        last_page: number;
    };
    productsList: { id: number; name: string; sku: string; barcode: string | null }[];
    categoriesList: { id: number; name: string }[];
    filters: {
        start_date?: string;
        end_date?: string;
        product_id?: string;
        category_id?: string;
        barcode?: string;
        sort_by?: string;
    };
}

function formatCurrency(val: number | string) {
    return `Rs. ${Number(val).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;
}

export default function ProductSalesReport({
    productSales,
    productsList = [],
    categoriesList = [],
    filters,
}: Props) {
    const [startDate, setStartDate] = useState(filters.start_date || '');
    const [endDate, setEndDate] = useState(filters.end_date || '');
    const [productId, setProductId] = useState(filters.product_id || '');
    const [categoryId, setCategoryId] = useState(filters.category_id || '');
    const [barcode, setBarcode] = useState(filters.barcode || '');
    const [sortBy, setSortBy] = useState(filters.sort_by || 'highest_sales');

    // Product Analytics Popup Drawer
    const [selectedProduct, setSelectedProduct] = useState<ProductSaleRow | null>(null);
    const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/reports/product-sales',
            {
                start_date: startDate,
                end_date: endDate,
                product_id: productId,
                category_id: categoryId,
                barcode,
                sort_by: sortBy,
            },
            { preserveState: true }
        );
    };

    const handleReset = () => {
        setStartDate('');
        setEndDate('');
        setProductId('');
        setCategoryId('');
        setBarcode('');
        setSortBy('highest_sales');
        router.get('/reports/product-sales', {}, { preserveState: true });
    };

    const openAnalytics = (p: ProductSaleRow) => {
        setSelectedProduct(p);
        setIsAnalyticsOpen(true);
    };

    const exportCSV = () => {
        const headers = ['Product Name', 'SKU', 'Barcode', 'Category', 'Units Sold', 'Total Revenue', 'Avg Selling Price', 'Discount', 'Profit', 'Stock', 'Stock Value'];
        const rows = productSales.data.map((p) => [
            p.name,
            p.sku,
            p.barcode || 'N/A',
            p.category_name || 'Uncategorized',
            p.units_sold,
            p.total_revenue,
            p.avg_price,
            p.total_discount,
            p.profit,
            p.remaining_stock,
            p.stock_value,
        ]);
        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `Product_Sales_Report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Analytics Dashboard', href: '/reports' },
                { title: 'Product Sales Report', href: '/reports/product-sales' },
            ]}
        >
            <Head title="Product Sales Report - Smart POS AI" />

            <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-foreground">
                            Merchandise & Product Performance Audit
                        </h1>
                        <p className="text-xs text-muted-foreground">
                            Track SKU velocity, gross margin profit per item, and remaining inventory valuations.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button onClick={exportCSV} variant="outline" className="h-9 px-3 rounded-xl text-xs gap-1.5">
                            <FileSpreadsheet className="size-3.5 text-emerald-500" />
                            <span>Export CSV</span>
                        </Button>
                        <Button onClick={() => window.print()} variant="outline" className="h-9 px-3 rounded-xl text-xs gap-1.5">
                            <Printer className="size-3.5" />
                            <span>Print</span>
                        </Button>
                    </div>
                </div>

                {/* Filter Form */}
                <form onSubmit={handleSearch} className="p-4 rounded-2xl bg-card border border-border/60 shadow-xs space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                        <Filter className="size-3.5 text-blue-500" />
                        <span>Filter Product Metrics</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div>
                            <label className="text-[11px] font-semibold text-muted-foreground">Start Date</label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="h-9 text-xs rounded-xl bg-background mt-1"
                            />
                        </div>

                        <div>
                            <label className="text-[11px] font-semibold text-muted-foreground">End Date</label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="h-9 text-xs rounded-xl bg-background mt-1"
                            />
                        </div>

                        <div>
                            <label className="text-[11px] font-semibold text-muted-foreground">Category</label>
                            <Select value={categoryId} onValueChange={(val) => setCategoryId(val === 'all' ? '' : val)}>
                                <SelectTrigger className="h-9 text-xs rounded-xl bg-background mt-1">
                                    <SelectValue placeholder="All Categories" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Categories</SelectItem>
                                    {categoriesList.map((c) => (
                                        <SelectItem key={c.id} value={c.id.toString()}>
                                            {c.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-[11px] font-semibold text-muted-foreground">Sort By Ranking</label>
                            <Select value={sortBy} onValueChange={(val) => setSortBy(val)}>
                                <SelectTrigger className="h-9 text-xs rounded-xl bg-background mt-1">
                                    <SelectValue placeholder="Sort By" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="highest_sales">Highest Sales Revenue</SelectItem>
                                    <SelectItem value="lowest_sales">Lowest Sales Revenue</SelectItem>
                                    <SelectItem value="most_profit">Most Profit Margin</SelectItem>
                                    <SelectItem value="most_quantity">Most Units Sold</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-[11px] font-semibold text-muted-foreground">Barcode / EAN</label>
                            <Input
                                type="text"
                                placeholder="8932014820"
                                value={barcode}
                                onChange={(e) => setBarcode(e.target.value)}
                                className="h-9 text-xs rounded-xl bg-background mt-1"
                            />
                        </div>

                        <div className="flex items-end gap-2 sm:col-span-2">
                            <Button type="submit" className="h-9 flex-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs">
                                Filter Data
                            </Button>
                            <Button type="button" onClick={handleReset} variant="outline" className="h-9 px-3 rounded-xl text-xs">
                                Reset
                            </Button>
                        </div>
                    </div>
                </form>

                {/* Table */}
                <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead className="bg-muted/40 border-b border-border/60 text-muted-foreground uppercase font-bold tracking-wider text-[10px]">
                                <tr>
                                    <th className="px-4 py-3.5 text-left">Product Name</th>
                                    <th className="px-4 py-3.5 text-left">Barcode / SKU</th>
                                    <th className="px-4 py-3.5 text-left">Category</th>
                                    <th className="px-4 py-3.5 text-center">Units Sold</th>
                                    <th className="px-4 py-3.5 text-right">Avg Price</th>
                                    <th className="px-4 py-3.5 text-right">Total Revenue</th>
                                    <th className="px-4 py-3.5 text-right">Profit</th>
                                    <th className="px-4 py-3.5 text-right">Stock</th>
                                    <th className="px-4 py-3.5 text-right">Stock Value</th>
                                    <th className="px-4 py-3.5 text-center">Analytics</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                                {productSales.data.map((p) => (
                                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3.5 font-bold text-foreground">{p.name}</td>
                                        <td className="px-4 py-3.5 font-mono text-muted-foreground">
                                            <div>{p.sku}</div>
                                            {p.barcode && <div className="text-[10px] text-muted-foreground/70">{p.barcode}</div>}
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 font-bold text-[10px]">
                                                {p.category_name || 'Uncategorized'}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3.5 text-center font-bold text-foreground">{p.units_sold}</td>
                                        <td className="px-4 py-3.5 text-right text-muted-foreground">{formatCurrency(p.avg_price)}</td>
                                        <td className="px-4 py-3.5 text-right font-black text-foreground">{formatCurrency(p.total_revenue)}</td>
                                        <td className="px-4 py-3.5 text-right font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(p.profit)}</td>
                                        <td className="px-4 py-3.5 text-right font-bold">{p.remaining_stock} units</td>
                                        <td className="px-4 py-3.5 text-right font-semibold text-muted-foreground">{formatCurrency(p.stock_value)}</td>
                                        <td className="px-4 py-3.5 text-center">
                                            <Button
                                                onClick={() => openAnalytics(p)}
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 px-2 rounded-lg text-blue-600 hover:bg-blue-500/10 gap-1"
                                            >
                                                <BarChart3 className="size-3.5" />
                                                <span>Stats</span>
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* PRODUCT ANALYTICS POPUP DIALOG */}
            <Dialog open={isAnalyticsOpen} onOpenChange={setIsAnalyticsOpen}>
                <DialogContent className="sm:max-w-md rounded-2xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center justify-between">
                            <span>Product Performance Profile</span>
                            <Badge className="bg-blue-500/10 text-blue-600 font-mono text-xs">{selectedProduct?.sku}</Badge>
                        </DialogTitle>
                    </DialogHeader>

                    {selectedProduct && (
                        <div className="space-y-4 text-xs mt-2">
                            <div className="p-4 rounded-xl bg-card border border-border/60 space-y-1">
                                <h3 className="font-extrabold text-foreground text-sm">{selectedProduct.name}</h3>
                                <p className="text-muted-foreground text-[11px]">Barcode: {selectedProduct.barcode || 'N/A'}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 rounded-xl bg-muted/40 border border-border/40">
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Units Sold</span>
                                    <div className="text-lg font-black text-foreground mt-0.5">{selectedProduct.units_sold} units</div>
                                </div>

                                <div className="p-3 rounded-xl bg-muted/40 border border-border/40">
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Current Stock</span>
                                    <div className="text-lg font-black text-foreground mt-0.5">{selectedProduct.remaining_stock} units</div>
                                </div>

                                <div className="p-3 rounded-xl bg-muted/40 border border-border/40">
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Total Revenue</span>
                                    <div className="text-lg font-black text-blue-600 dark:text-blue-400 mt-0.5">{formatCurrency(selectedProduct.total_revenue)}</div>
                                </div>

                                <div className="p-3 rounded-xl bg-muted/40 border border-border/40">
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Total Profit Margin</span>
                                    <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{formatCurrency(selectedProduct.profit)}</div>
                                </div>
                            </div>

                            <div className="pt-3 border-t border-border/50 flex justify-end">
                                <Button onClick={() => setIsAnalyticsOpen(false)} variant="outline" className="h-9 text-xs">
                                    Close
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
