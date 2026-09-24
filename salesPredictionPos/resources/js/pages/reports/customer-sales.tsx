import { Head } from '@inertiajs/react';
import { Award, Printer, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TablePagination } from '@/components/ui/table-pagination';
import AppLayout from '@/layouts/app-layout';

interface CustomerRow {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    loyalty_points: number;
    orders_count: number;
    total_spent: number;
    avg_order: number;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface Props {
    topCustomers: {
        data: CustomerRow[];
        links: PaginationLink[];
        current_page: number;
        last_page: number;
        total: number;
    };
}

function formatCurrency(val: number) {
    return `Rs. ${Number(val).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;
}

export default function CustomerReport({ topCustomers }: Props) {
    const customers = topCustomers?.data ?? [];
    // Offset rank by page
    const pageOffset = ((topCustomers?.current_page ?? 1) - 1) * 20;

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Analytics Dashboard', href: '/reports' },
                { title: 'Customer Spending Report', href: '/reports/customer-sales' },
            ]}
        >
            <Head title="Customer Report - Smart POS" />

            <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-foreground">
                            Top Customers &amp; Purchasing Habits
                        </h1>
                        <p className="text-xs text-muted-foreground">
                            Identify highest spending clientele, purchase frequency, and loyalty points balances.
                        </p>
                    </div>

                    <Button onClick={() => window.print()} variant="outline" className="h-9 px-3 rounded-xl text-xs gap-1.5">
                        <Printer className="size-3.5" />
                        <span>Print</span>
                    </Button>
                </div>

                {/* Table */}
                <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead className="bg-muted/40 border-b border-border/60 text-muted-foreground uppercase font-bold tracking-wider text-[10px]">
                                <tr>
                                    <th className="px-4 py-3.5 text-left">Rank &amp; Customer Name</th>
                                    <th className="px-4 py-3.5 text-left">Contact Info</th>
                                    <th className="px-4 py-3.5 text-center">Orders Completed</th>
                                    <th className="px-4 py-3.5 text-right">Avg Purchase</th>
                                    <th className="px-4 py-3.5 text-right">Loyalty Points</th>
                                    <th className="px-4 py-3.5 text-right">Total Lifetime Spent</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                                {customers.map((c, i) => (
                                    <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3.5 font-bold text-foreground">
                                            <div className="flex items-center gap-2.5">
                                                <span className={`size-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
                                                    pageOffset + i === 0 ? 'bg-amber-500 text-white' : pageOffset + i === 1 ? 'bg-slate-400 text-white' : pageOffset + i === 2 ? 'bg-amber-700 text-white' : 'bg-muted text-muted-foreground'
                                                }`}>
                                                    #{pageOffset + i + 1}
                                                </span>
                                                <span>{c.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5 font-mono text-muted-foreground">
                                            <div>{c.email || 'No Email'}</div>
                                            <div className="text-[10px]">{c.phone || 'No Phone'}</div>
                                        </td>
                                        <td className="px-4 py-3.5 text-center font-bold">{c.orders_count} orders</td>
                                        <td className="px-4 py-3.5 text-right font-semibold text-muted-foreground">{formatCurrency(c.avg_order)}</td>
                                        <td className="px-4 py-3.5 text-right">
                                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold">
                                                {c.loyalty_points} PTS
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3.5 text-right font-black text-foreground text-sm">{formatCurrency(c.total_spent)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <TablePagination
                        links={topCustomers.links}
                        currentPage={topCustomers.current_page}
                        lastPage={topCustomers.last_page}
                    />
                </div>
            </div>
        </AppLayout>
    );
}
