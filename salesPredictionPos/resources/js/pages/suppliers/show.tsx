import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Building2, Calendar, DollarSign, Package, Tag, Layers, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';

interface Product {
    id: number;
    name: string;
    sku: string;
    price: number;
}

interface Batch {
    id: number;
    batch_number: string;
    product_id: number;
    quantity_received: number;
    available_quantity: number;
    purchase_price: number;
    selling_price: number;
    manufacture_date: string | null;
    expiry_date: string | null;
    purchase_date: string;
    status: string;
    product?: Product;
}

interface Supplier {
    id: number;
    supplier_code: string;
    company_name: string;
    supplier_name: string;
    contact_person: string | null;
    phone: string;
    mobile: string | null;
    email: string | null;
    address: string | null;
    city: string | null;
    district: string | null;
    country: string | null;
    business_registration_no: string | null;
    tax_number: string | null;
    bank_name: string | null;
    bank_account_no: string | null;
    payment_terms: string | null;
    credit_limit: number;
    opening_balance: number;
    current_balance: number;
    status: 'active' | 'inactive';
    notes: string | null;
}

interface Props {
    supplier: Supplier;
    batches: Batch[];
    productsSupplied: Product[];
    stats: {
        total_purchases: number;
        outstanding_balance: number;
        last_supply_date: string | null;
    };
    canManage: boolean;
    canDelete: boolean;
}

export default function SupplierShow({ supplier, batches = [], productsSupplied = [], stats }: Props) {
    return (
        <AppLayout breadcrumbs={[
            { title: 'Supplier Directory', href: '/suppliers' },
            { title: supplier.company_name, href: `/suppliers/${supplier.id}` }
        ]}>
            <Head title={`Supplier Profile: ${supplier.company_name}`} />

            <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
                {/* Back button */}
                <div className="flex items-center justify-between">
                    <Link href="/suppliers" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-bold transition-colors">
                        <ArrowLeft className="size-3.5" />
                        <span>Back to Directory</span>
                    </Link>
                </div>

                {/* Profile Banner */}
                <div className="bg-card border border-border/60 p-6 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-start gap-4">
                        <div className="size-16 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center dark:bg-blue-500/10 dark:text-blue-400 shrink-0">
                            <Building2 className="size-8" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="text-xl font-bold text-foreground">{supplier.company_name}</h2>
                                <Badge className="font-mono text-[9px] uppercase tracking-wider font-extrabold bg-blue-500/10 text-blue-600 border-blue-500/20 rounded-full">
                                    {supplier.supplier_code}
                                </Badge>
                                <Badge className={supplier.status === 'active' 
                                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[9px] rounded-full' 
                                    : 'bg-muted text-muted-foreground border-border text-[9px] rounded-full'
                                }>
                                    {supplier.status === 'active' ? 'Active' : 'Inactive'}
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Primary Contact: <span className="font-semibold text-foreground">{supplier.supplier_name}</span>
                                {supplier.contact_person && ` (${supplier.contact_person})`}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-1">
                                {supplier.address ? `${supplier.address}, ` : ''}{supplier.city ? `${supplier.city}, ` : ''}{supplier.district || ''}
                            </p>
                        </div>
                    </div>

                    {/* Stats Overview */}
                    <div className="grid grid-cols-3 gap-6 md:border-l border-border/60 pl-0 md:pl-6 shrink-0">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Total Purchases</span>
                            <span className="text-sm font-mono font-bold mt-1 text-foreground">
                                Rs. {numberFormat(stats.total_purchases)}
                            </span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Outstanding</span>
                            <span className="text-sm font-mono font-bold mt-1 text-rose-500">
                                Rs. {numberFormat(stats.outstanding_balance)}
                            </span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Last Supply</span>
                            <span className="text-sm font-mono font-bold mt-1 text-foreground">
                                {stats.last_supply_date || 'Never'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Main Content Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Panel: Supplier Metadata Cards */}
                    <div className="space-y-6 lg:col-span-1">
                        {/* Vendor Profile Info */}
                        <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-4 shadow-xs text-xs">
                            <h3 className="font-bold text-foreground flex items-center gap-1.5 pb-2 border-b border-border/40">
                                <FileText className="size-4 text-blue-600" />
                                <span>Vendor Details</span>
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <p className="text-muted-foreground font-semibold">Phone Number</p>
                                    <p className="text-foreground font-mono mt-0.5">{supplier.phone}</p>
                                </div>
                                {supplier.mobile && (
                                    <div>
                                        <p className="text-muted-foreground font-semibold">Mobile Number</p>
                                        <p className="text-foreground font-mono mt-0.5">{supplier.mobile}</p>
                                    </div>
                                )}
                                {supplier.email && (
                                    <div>
                                        <p className="text-muted-foreground font-semibold">Email Address</p>
                                        <p className="text-foreground mt-0.5">{supplier.email}</p>
                                    </div>
                                )}
                                <div>
                                    <p className="text-muted-foreground font-semibold">Payment Terms</p>
                                    <p className="text-foreground mt-0.5 font-medium">{supplier.payment_terms || 'COD'}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground font-semibold">Credit Limit</p>
                                    <p className="text-foreground mt-0.5 font-mono">Rs. {numberFormat(supplier.credit_limit)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Business & Banking Details */}
                        <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-4 shadow-xs text-xs">
                            <h3 className="font-bold text-foreground flex items-center gap-1.5 pb-2 border-b border-border/40">
                                <Building2 className="size-4 text-blue-600" />
                                <span>Business & Banking</span>
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <p className="text-muted-foreground font-semibold">Business Reg No.</p>
                                    <p className="text-foreground font-mono mt-0.5">{supplier.business_registration_no || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground font-semibold">VAT/Tax Number</p>
                                    <p className="text-foreground font-mono mt-0.5">{supplier.tax_number || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground font-semibold">Bank Name</p>
                                    <p className="text-foreground mt-0.5 font-medium">{supplier.bank_name || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground font-semibold">Bank Account No.</p>
                                    <p className="text-foreground font-mono mt-0.5">{supplier.bank_account_no || 'N/A'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Notes */}
                        {supplier.notes && (
                            <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-xs text-xs">
                                <h3 className="font-bold text-foreground pb-2 border-b border-border/40 mb-3">Internal Notes</h3>
                                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{supplier.notes}</p>
                            </div>
                        )}
                    </div>

                    {/* Right Panel: Products Supplied & Batches */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Products Supplied Tab */}
                        <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-xs text-xs">
                            <h3 className="font-bold text-foreground flex items-center gap-1.5 mb-4">
                                <Package className="size-4 text-blue-600" />
                                <span>Products Supplied ({productsSupplied.length})</span>
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {productsSupplied.length > 0 ? (
                                    productsSupplied.map(p => (
                                        <div key={p.id} className="p-3 bg-muted/20 border border-border/40 rounded-xl flex items-center justify-between">
                                            <div>
                                                <p className="font-semibold text-foreground">{p.name}</p>
                                                <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{p.sku}</p>
                                            </div>
                                            <Badge variant="outline" className="text-[10px] font-mono">
                                                Rs. {numberFormat(p.price)}
                                            </Badge>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-muted-foreground text-center py-4 col-span-2">
                                        No products registered for this supplier yet.
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Active Batches List */}
                        <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-xs text-xs">
                            <div className="p-5 border-b border-border/50">
                                <h3 className="font-bold text-foreground flex items-center gap-1.5">
                                    <Layers className="size-4 text-blue-600" />
                                    <span>Supply Batch History ({batches.length})</span>
                                </h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="border-b border-border/50 bg-muted/40 font-semibold text-muted-foreground text-left">
                                            <th className="px-4 py-3">Batch Number</th>
                                            <th className="px-4 py-3">Product</th>
                                            <th className="px-4 py-3 text-right">Qty Received</th>
                                            <th className="px-4 py-3 text-right">Available</th>
                                            <th className="px-4 py-3 text-right">Cost Price</th>
                                            <th className="px-4 py-3 text-right">Sell Price</th>
                                            <th className="px-4 py-3 text-center">Expiry</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/40">
                                        {batches.length > 0 ? (
                                            batches.map(b => (
                                                <tr key={b.id} className="hover:bg-muted/10 transition-colors">
                                                    <td className="px-4 py-3 font-mono font-bold text-foreground">
                                                        {b.batch_number}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="font-medium text-foreground">{b.product?.name || 'Deleted Product'}</div>
                                                        <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{b.product?.sku || 'N/A'}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-mono font-medium">
                                                        {b.quantity_received}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-mono font-medium">
                                                        {b.available_quantity}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-mono">
                                                        Rs. {numberFormat(b.purchase_price)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-mono">
                                                        Rs. {numberFormat(b.selling_price)}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        {b.expiry_date ? (
                                                            <span className={new Date(b.expiry_date) < new Date() ? 'text-destructive font-semibold' : 'text-muted-foreground'}>
                                                                {b.expiry_date}
                                                            </span>
                                                        ) : (
                                                            <span className="text-muted-foreground">N/A</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={7} className="text-center py-6 text-muted-foreground">
                                                    No batch history available.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

function numberFormat(val: number): string {
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
}
