import { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import { Edit, Plus, Save, Search, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import AppLayout from '@/layouts/app-layout';

interface Customer {
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    loyalty_points: number;
    sales_count?: number;
}

interface Props {
    customers: {
        data: Customer[];
        links: { url: string | null; label: string; active: boolean }[];
        current_page: number;
        last_page: number;
    };
    filters: { search?: string };
}

export default function CustomersIndex({ customers, filters }: Props) {
    const [search, setSearch] = useState(filters.search || '');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        name: '',
        phone: '',
        email: '',
        address: '',
    });

    const openCreateModal = () => {
        setEditingCustomer(null);
        clearErrors();
        reset();
        setIsModalOpen(true);
    };

    const openEditModal = (cust: Customer) => {
        setEditingCustomer(cust);
        clearErrors();
        setData({
            name: cust.name || '',
            phone: cust.phone || '',
            email: cust.email || '',
            address: cust.address || '',
        });
        setIsModalOpen(true);
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingCustomer) {
            put(`/customers/${editingCustomer.id}`, {
                onSuccess: () => {
                    setIsModalOpen(false);
                    reset();
                },
            });
        } else {
            post('/customers', {
                onSuccess: () => {
                    setIsModalOpen(false);
                    reset();
                },
            });
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/customers', { search }, { preserveState: true });
    };

    const handleDelete = (customer: Customer) => {
        if (confirm(`Are you sure you want to delete customer "${customer.name}"?`)) {
            router.delete(`/customers/${customer.id}`);
        }
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Customers Directory', href: '/customers' }]}>
            <Head title="Customer Directory - Smart POS AI" />

            <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
                {/* Header Title Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-foreground">
                            Customer Directory & Loyalty
                        </h1>
                        <p className="text-xs text-muted-foreground">
                            Manage customer contact profiles, reward points, and checkout transaction histories.
                        </p>
                    </div>

                    <Button
                        onClick={openCreateModal}
                        className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20 gap-1.5"
                    >
                        <Plus className="size-4" />
                        <span>Add Customer</span>
                    </Button>
                </div>

                {/* Filter Row */}
                <form onSubmit={handleSearch} className="relative flex-1">
                    <Search className="absolute left-3.5 top-3 size-4 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Search by customer name, phone or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 h-10 rounded-xl bg-card border-border/60 text-xs"
                    />
                </form>

                {/* Customer Table */}
                {customers.data.length === 0 ? (
                    <EmptyState
                        icon={Users}
                        title="No Customers Found"
                        description="No customer records matched your query. Add a new customer to start tracking loyalty points."
                        actionLabel="Register Customer"
                        onAction={openCreateModal}
                    />
                ) : (
                    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead className="bg-muted/40 border-b border-border/60 text-muted-foreground uppercase font-bold tracking-wider text-[10px]">
                                    <tr>
                                        <th className="px-4 py-3.5 text-left">Customer</th>
                                        <th className="px-4 py-3.5 text-left">Phone</th>
                                        <th className="px-4 py-3.5 text-left">Email</th>
                                        <th className="px-4 py-3.5 text-left">Address</th>
                                        <th className="px-4 py-3.5 text-right">Total Orders</th>
                                        <th className="px-4 py-3.5 text-right">Loyalty Points</th>
                                        <th className="px-4 py-3.5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/40">
                                    {customers.data.map((cust) => (
                                        <tr key={cust.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-3.5 font-bold text-foreground">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="size-8 rounded-full bg-blue-600/10 text-blue-600 flex items-center justify-center font-bold text-xs">
                                                        {cust.name[0]}
                                                    </div>
                                                    <span>{cust.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5 font-mono text-muted-foreground">{cust.phone || '—'}</td>
                                            <td className="px-4 py-3.5 text-muted-foreground">{cust.email || '—'}</td>
                                            <td className="px-4 py-3.5 text-muted-foreground max-w-xs truncate">{cust.address || '—'}</td>
                                            <td className="px-4 py-3.5 text-right font-black text-foreground">{cust.sales_count ?? 0}</td>
                                            <td className="px-4 py-3.5 text-right">
                                                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-extrabold">
                                                    {cust.loyalty_points} PTS
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3.5 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => openEditModal(cust)} className="text-muted-foreground hover:text-blue-600">
                                                        <Edit className="size-4" />
                                                    </button>
                                                    <button onClick={() => handleDelete(cust)} className="text-muted-foreground hover:text-destructive">
                                                        <Trash2 className="size-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* ADD / EDIT CUSTOMER DIALOG MODAL */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-md rounded-2xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold">
                            {editingCustomer ? 'Edit Customer Profile' : 'Add New Customer'}
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleFormSubmit} className="space-y-4 mt-2">
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-muted-foreground">Full Name *</label>
                                <Input
                                    type="text"
                                    required
                                    placeholder="e.g. Ruwan Perera"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    className="h-10 rounded-xl"
                                />
                                {errors.name && <p className="text-[11px] text-destructive">{errors.name}</p>}
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-muted-foreground">Phone Number</label>
                                <Input
                                    type="tel"
                                    placeholder="+94 77 123 4567"
                                    value={data.phone}
                                    onChange={(e) => setData('phone', e.target.value)}
                                    className="h-10 rounded-xl"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-muted-foreground">Email Address</label>
                                <Input
                                    type="email"
                                    placeholder="ruwan@example.com"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    className="h-10 rounded-xl"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-muted-foreground">Address</label>
                                <Input
                                    placeholder="Street, City, Postal Code"
                                    value={data.address}
                                    onChange={(e) => setData('address', e.target.value)}
                                    className="h-10 rounded-xl"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-3 border-t border-border/50">
                            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="h-10 rounded-xl text-xs">
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={processing}
                                className="h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20 gap-1.5"
                            >
                                <Save className="size-4" />
                                <span>{editingCustomer ? 'Update Profile' : 'Save Customer'}</span>
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
