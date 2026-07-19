import { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import {
    Calendar,
    CheckCircle2,
    Clock,
    Download,
    Eye,
    FileSpreadsheet,
    Filter,
    Printer,
    Receipt,
    RefreshCw,
    Search,
    User as UserIcon,
    Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';

interface SaleItem {
    id: number;
    product?: {
        name: string;
        sku: string;
        cost: number | string;
    };
    quantity: number;
    unit_price: number | string;
    discount: number | string;
    total: number | string;
}

interface Sale {
    id: number;
    invoice_number: string;
    created_at: string;
    subtotal: number | string;
    discount_amount: number | string;
    tax_amount: number | string;
    total: number | string;
    payment_method: string;
    status: string;
    notes?: string | null;
    user?: { id: number; name: string };
    customer?: { id: number; name: string };
    items?: SaleItem[];
}

interface Props {
    sales: {
        data: Sale[];
        links: { url: string | null; label: string; active: boolean }[];
        current_page: number;
        last_page: number;
    };
    cashiers: { id: number; name: string }[];
    customers: { id: number; name: string }[];
    categories: { id: number; name: string }[];
    filters: {
        start_date?: string;
        end_date?: string;
        cashier_id?: string;
        customer_id?: string;
        payment_method?: string;
        invoice_number?: string;
        category_id?: string;
    };
    totals: {
        totalOrders: number;
        totalQuantity: number;
        grossSales: number;
        discount: number;
        tax: number;
        netSales: number;
        profit: number;
    };
}

function formatCurrency(val: number | string) {
    return `Rs. ${Number(val).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;
}

export default function DailySalesReport({
    sales,
    cashiers = [],
    customers = [],
    categories = [],
    filters,
    totals,
}: Props) {
    const [startDate, setStartDate] = useState(filters.start_date || '');
    const [endDate, setEndDate] = useState(filters.end_date || '');
    const [cashierId, setCashierId] = useState(filters.cashier_id || '');
    const [customerId, setCustomerId] = useState(filters.customer_id || '');
    const [paymentMethod, setPaymentMethod] = useState(filters.payment_method || '');
    const [invoiceNumber, setInvoiceNumber] = useState(filters.invoice_number || '');
    const [categoryId, setCategoryId] = useState(filters.category_id || '');

    // View Invoice Modal
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
    const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/reports/daily-sales',
            {
                start_date: startDate,
                end_date: endDate,
                cashier_id: cashierId,
                customer_id: customerId,
                payment_method: paymentMethod,
                invoice_number: invoiceNumber,
                category_id: categoryId,
            },
            { preserveState: true }
        );
    };

    const handleReset = () => {
        setStartDate('');
        setEndDate('');
        setCashierId('');
        setCustomerId('');
        setPaymentMethod('');
        setInvoiceNumber('');
        setCategoryId('');
        router.get('/reports/daily-sales', {}, { preserveState: true });
    };

    const handleViewInvoice = async (sale: Sale) => {
        setSelectedSale(sale);
        setIsInvoiceOpen(true);
        // Fetch detailed invoice with items if not present
        try {
            const res = await fetch(`/reports/sales/${sale.id}`);
            const data = await res.json();
            setSelectedSale(data);
        } catch (err) {
            console.error('Failed to load invoice details', err);
        }
    };

    const exportCSV = () => {
        const headers = ['Invoice No', 'Date', 'Cashier', 'Customer', 'Items Count', 'Subtotal', 'Discount', 'Tax', 'Grand Total', 'Payment Method', 'Status'];
        const rows = sales.data.map((s) => [
            s.invoice_number,
            new Date(s.created_at).toLocaleString('en-LK'),
            s.user?.name || 'Cashier',
            s.customer?.name || 'Walk-in Customer',
            s.items?.length || 0,
            s.subtotal,
            s.discount_amount,
            s.tax_amount,
            s.total,
            s.payment_method,
            s.status,
        ]);
        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `Daily_Sales_Report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Analytics Dashboard', href: '/reports' },
                { title: 'Daily Sales Report', href: '/reports/daily-sales' },
            ]}
        >
            <Head title="Daily Sales Report - Smart POS AI" />

            <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-foreground">
                            Daily Sales Audit & Transaction Log
                        </h1>
                        <p className="text-xs text-muted-foreground">
                            Filter completed register checkouts, print tax invoices, and analyze revenue breakdowns.
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
                        <span>Filter Sales Transactions</span>
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
                            <label className="text-[11px] font-semibold text-muted-foreground">Cashier Staff</label>
                            <Select value={cashierId} onValueChange={(val) => setCashierId(val === 'all' ? '' : val)}>
                                <SelectTrigger className="h-9 text-xs rounded-xl bg-background mt-1">
                                    <SelectValue placeholder="All Cashiers" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Cashiers</SelectItem>
                                    {cashiers.map((c) => (
                                        <SelectItem key={c.id} value={c.id.toString()}>
                                            {c.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-[11px] font-semibold text-muted-foreground">Payment Method</label>
                            <Select value={paymentMethod} onValueChange={(val) => setPaymentMethod(val === 'all' ? '' : val)}>
                                <SelectTrigger className="h-9 text-xs rounded-xl bg-background mt-1">
                                    <SelectValue placeholder="All Methods" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Methods</SelectItem>
                                    <SelectItem value="cash">Cash</SelectItem>
                                    <SelectItem value="card">Card</SelectItem>
                                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                    <SelectItem value="mobile_payment">Mobile Wallet</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-[11px] font-semibold text-muted-foreground">Invoice No</label>
                            <Input
                                type="text"
                                placeholder="INV-1002"
                                value={invoiceNumber}
                                onChange={(e) => setInvoiceNumber(e.target.value)}
                                className="h-9 text-xs rounded-xl bg-background mt-1"
                            />
                        </div>

                        <div>
                            <label className="text-[11px] font-semibold text-muted-foreground">Customer</label>
                            <Select value={customerId} onValueChange={(val) => setCustomerId(val === 'all' ? '' : val)}>
                                <SelectTrigger className="h-9 text-xs rounded-xl bg-background mt-1">
                                    <SelectValue placeholder="All Customers" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Customers</SelectItem>
                                    {customers.map((c) => (
                                        <SelectItem key={c.id} value={c.id.toString()}>
                                            {c.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-[11px] font-semibold text-muted-foreground">Category</label>
                            <Select value={categoryId} onValueChange={(val) => setCategoryId(val === 'all' ? '' : val)}>
                                <SelectTrigger className="h-9 text-xs rounded-xl bg-background mt-1">
                                    <SelectValue placeholder="All Categories" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Categories</SelectItem>
                                    {categories.map((c) => (
                                        <SelectItem key={c.id} value={c.id.toString()}>
                                            {c.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-end gap-2">
                            <Button type="submit" className="h-9 flex-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs">
                                Apply Search
                            </Button>
                            <Button type="button" onClick={handleReset} variant="outline" className="h-9 px-3 rounded-xl text-xs">
                                Reset
                            </Button>
                        </div>
                    </div>
                </form>

                {/* Sales Table */}
                <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead className="bg-muted/40 border-b border-border/60 text-muted-foreground uppercase font-bold tracking-wider text-[10px]">
                                <tr>
                                    <th className="px-4 py-3.5 text-left">Invoice No</th>
                                    <th className="px-4 py-3.5 text-left">Date & Time</th>
                                    <th className="px-4 py-3.5 text-left">Cashier</th>
                                    <th className="px-4 py-3.5 text-left">Customer</th>
                                    <th className="px-4 py-3.5 text-center">Items</th>
                                    <th className="px-4 py-3.5 text-right">Subtotal</th>
                                    <th className="px-4 py-3.5 text-right">Discount</th>
                                    <th className="px-4 py-3.5 text-right">Tax</th>
                                    <th className="px-4 py-3.5 text-right">Grand Total</th>
                                    <th className="px-4 py-3.5 text-center">Payment</th>
                                    <th className="px-4 py-3.5 text-center">Status</th>
                                    <th className="px-4 py-3.5 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                                {sales.data.map((s) => (
                                    <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3.5 font-mono font-bold text-blue-600 dark:text-blue-400">{s.invoice_number}</td>
                                        <td className="px-4 py-3.5 text-muted-foreground font-mono text-[11px]">
                                            {new Date(s.created_at).toLocaleString('en-LK')}
                                        </td>
                                        <td className="px-4 py-3.5 font-medium text-foreground">{s.user?.name || 'Cashier'}</td>
                                        <td className="px-4 py-3.5 text-muted-foreground">{s.customer?.name || 'Walk-in Customer'}</td>
                                        <td className="px-4 py-3.5 text-center font-bold">{s.items?.length || 0}</td>
                                        <td className="px-4 py-3.5 text-right font-semibold text-muted-foreground">{formatCurrency(s.subtotal)}</td>
                                        <td className="px-4 py-3.5 text-right font-semibold text-amber-500">{formatCurrency(s.discount_amount)}</td>
                                        <td className="px-4 py-3.5 text-right font-semibold text-muted-foreground">{formatCurrency(s.tax_amount)}</td>
                                        <td className="px-4 py-3.5 text-right font-black text-foreground text-sm">{formatCurrency(s.total)}</td>
                                        <td className="px-4 py-3.5 text-center">
                                            <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 font-bold uppercase text-[10px]">
                                                {s.payment_method}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3.5 text-center">
                                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold text-[10px]">
                                                {s.status}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3.5 text-right">
                                            <Button
                                                onClick={() => handleViewInvoice(s)}
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 px-2 rounded-lg text-blue-600 hover:bg-blue-500/10 gap-1"
                                            >
                                                <Eye className="size-3.5" />
                                                <span>View</span>
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Bottom Summary Bar */}
                <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-xs grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-4 text-xs">
                    <div>
                        <span className="text-muted-foreground text-[10px] uppercase font-bold">Total Orders</span>
                        <div className="text-lg font-black text-foreground mt-0.5">{totals.totalOrders}</div>
                    </div>
                    <div>
                        <span className="text-muted-foreground text-[10px] uppercase font-bold">Items Sold</span>
                        <div className="text-lg font-black text-foreground mt-0.5">{totals.totalQuantity}</div>
                    </div>
                    <div>
                        <span className="text-muted-foreground text-[10px] uppercase font-bold">Gross Sales</span>
                        <div className="text-lg font-black text-foreground mt-0.5">{formatCurrency(totals.grossSales)}</div>
                    </div>
                    <div>
                        <span className="text-muted-foreground text-[10px] uppercase font-bold">Discount</span>
                        <div className="text-lg font-black text-amber-500 mt-0.5">{formatCurrency(totals.discount)}</div>
                    </div>
                    <div>
                        <span className="text-muted-foreground text-[10px] uppercase font-bold">Tax Collected</span>
                        <div className="text-lg font-black text-foreground mt-0.5">{formatCurrency(totals.tax)}</div>
                    </div>
                    <div>
                        <span className="text-muted-foreground text-[10px] uppercase font-bold">Net Sales</span>
                        <div className="text-lg font-black text-blue-600 dark:text-blue-400 mt-0.5">{formatCurrency(totals.netSales)}</div>
                    </div>
                    <div>
                        <span className="text-muted-foreground text-[10px] uppercase font-bold">Est. Profit</span>
                        <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{formatCurrency(totals.profit)}</div>
                    </div>
                </div>
            </div>

            {/* VIEW COMPLETE INVOICE DIALOG MODAL */}
            <Dialog open={isInvoiceOpen} onOpenChange={setIsInvoiceOpen}>
                <DialogContent className="sm:max-w-lg rounded-2xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center justify-between">
                            <span>Tax Invoice Receipt</span>
                            <span className="font-mono text-sm text-blue-600">{selectedSale?.invoice_number}</span>
                        </DialogTitle>
                    </DialogHeader>

                    {selectedSale && (
                        <div className="space-y-4 text-xs mt-2">
                            {/* Invoice Meta */}
                            <div className="p-3 rounded-xl bg-muted/40 border border-border/50 grid grid-cols-2 gap-2 text-[11px]">
                                <div>
                                    <span className="text-muted-foreground">Cashier:</span> <span className="font-bold">{selectedSale.user?.name || 'Staff'}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Customer:</span> <span className="font-bold">{selectedSale.customer?.name || 'Walk-in Customer'}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Date:</span> <span className="font-mono">{new Date(selectedSale.created_at).toLocaleString('en-LK')}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Payment Method:</span> <span className="font-bold uppercase">{selectedSale.payment_method}</span>
                                </div>
                            </div>

                            {/* Product Items Table */}
                            <div className="border border-border/50 rounded-xl overflow-hidden">
                                <table className="w-full text-xs">
                                    <thead className="bg-muted/60 text-[10px] uppercase font-bold">
                                        <tr>
                                            <th className="px-3 py-2 text-left">Product</th>
                                            <th className="px-3 py-2 text-center">Qty</th>
                                            <th className="px-3 py-2 text-right">Price</th>
                                            <th className="px-3 py-2 text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/40">
                                        {selectedSale.items?.map((item, idx) => (
                                            <tr key={idx}>
                                                <td className="px-3 py-2 font-medium">{item.product?.name || 'Item'}</td>
                                                <td className="px-3 py-2 text-center font-bold">{item.quantity}</td>
                                                <td className="px-3 py-2 text-right">{formatCurrency(item.unit_price)}</td>
                                                <td className="px-3 py-2 text-right font-bold">{formatCurrency(item.total)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Grand Totals */}
                            <div className="space-y-1 text-right pt-2">
                                <div className="flex justify-between text-muted-foreground">
                                    <span>Subtotal:</span>
                                    <span>{formatCurrency(selectedSale.subtotal)}</span>
                                </div>
                                <div className="flex justify-between text-amber-500 font-semibold">
                                    <span>Discount:</span>
                                    <span>-{formatCurrency(selectedSale.discount_amount)}</span>
                                </div>
                                <div className="flex justify-between text-muted-foreground">
                                    <span>Tax:</span>
                                    <span>+{formatCurrency(selectedSale.tax_amount)}</span>
                                </div>
                                <div className="flex justify-between text-sm font-black text-foreground pt-2 border-t border-border/50">
                                    <span>Grand Total Paid:</span>
                                    <span className="text-blue-600 dark:text-blue-400">{formatCurrency(selectedSale.total)}</span>
                                </div>
                            </div>

                            <div className="pt-3 border-t border-border/50 flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setIsInvoiceOpen(false)} className="h-9 text-xs">
                                    Close
                                </Button>
                                <Button onClick={() => window.print()} className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs gap-1.5">
                                    <Printer className="size-3.5" />
                                    <span>Print Invoice</span>
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
