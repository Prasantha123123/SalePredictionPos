import { useState } from 'react';
import { Head, router, useForm, Link } from '@inertiajs/react';
import { Edit, Plus, Save, Search, Trash2, Truck, Eye, FileSpreadsheet, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';

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
    suppliers: {
        data: Supplier[];
        links: { url: string | null; label: string; active: boolean }[];
        current_page: number;
        last_page: number;
    };
    districts: string[];
    filters: { search?: string; district?: string; status?: string };
    canManage: boolean;
    canDelete: boolean;
}

export default function SuppliersIndex({ suppliers, districts = [], filters, canManage, canDelete }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [district, setDistrict] = useState(filters.district || '');
    const [status, setStatus] = useState(filters.status || '');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        company_name: '',
        supplier_name: '',
        contact_person: '',
        phone: '',
        mobile: '',
        email: '',
        address: '',
        city: '',
        district: '',
        country: 'Sri Lanka',
        business_registration_no: '',
        tax_number: '',
        bank_name: '',
        bank_account_no: '',
        payment_terms: 'COD',
        credit_limit: 0,
        opening_balance: 0,
        status: 'active' as 'active' | 'inactive',
        notes: '',
    });

    const openCreateModal = () => {
        setEditingSupplier(null);
        clearErrors();
        reset();
        setIsModalOpen(true);
    };

    const openEditModal = (sup: Supplier) => {
        setEditingSupplier(sup);
        clearErrors();
        setData({
            company_name: sup.company_name || '',
            supplier_name: sup.supplier_name || '',
            contact_person: sup.contact_person || '',
            phone: sup.phone || '',
            mobile: sup.mobile || '',
            email: sup.email || '',
            address: sup.address || '',
            city: sup.city || '',
            district: sup.district || '',
            country: sup.country || 'Sri Lanka',
            business_registration_no: sup.business_registration_no || '',
            tax_number: sup.tax_number || '',
            bank_name: sup.bank_name || '',
            bank_account_no: sup.bank_account_no || '',
            payment_terms: sup.payment_terms || 'COD',
            credit_limit: sup.credit_limit || 0,
            opening_balance: sup.opening_balance || 0,
            status: sup.status || 'active',
            notes: sup.notes || '',
        });
        setIsModalOpen(true);
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingSupplier) {
            put(`/suppliers/${editingSupplier.id}`, {
                onSuccess: () => {
                    setIsModalOpen(false);
                    reset();
                },
            });
        } else {
            post('/suppliers', {
                onSuccess: () => {
                    setIsModalOpen(false);
                    reset();
                },
            });
        }
    };

    const applyFilters = (newSearch = search, newDistrict = district, newStatus = status) => {
        router.get('/suppliers', {
            search: newSearch,
            district: newDistrict,
            status: newStatus
        }, { preserveState: true });
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const handleDelete = (sup: Supplier) => {
        if (confirm(`Are you sure you want to delete supplier "${sup.company_name}"? This is a soft-delete and cannot be undone if there is active history.`)) {
            router.delete(`/suppliers/${sup.id}`);
        }
    };

    // Print & Export functions
    const handlePrint = () => {
        window.print();
    };

    const handleExport = () => {
        const headers = ['Code', 'Company Name', 'Supplier Name', 'Phone', 'Email', 'City', 'Current Balance', 'Status'];
        const csvRows = [headers.join(',')];
        
        suppliers.data.forEach(s => {
            csvRows.push([
                s.supplier_code,
                `"${s.company_name.replace(/"/g, '""')}"`,
                `"${s.supplier_name.replace(/"/g, '""')}"`,
                s.phone,
                s.email || '',
                s.city || '',
                s.current_balance,
                s.status
            ].join(','));
        });

        const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `suppliers_report_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Supplier Directory', href: '/suppliers' }]}>
            <Head title="Supplier Management - Smart POS" />

            <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full print:p-0">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
                    <div className="flex items-center gap-3">
                        <div className="size-12 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center dark:bg-blue-500/10 dark:text-blue-400">
                            <Truck className="size-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-foreground">Supplier Directory</h2>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Manage wholesale vendors, bank details, and supply lines.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button onClick={handlePrint} variant="outline" size="sm" className="h-9 gap-1.5 text-xs rounded-xl">
                            <Printer className="size-3.5" />
                            <span>Print</span>
                        </Button>
                        <Button onClick={handleExport} variant="outline" size="sm" className="h-9 gap-1.5 text-xs rounded-xl">
                            <FileSpreadsheet className="size-3.5" />
                            <span>Export CSV</span>
                        </Button>
                        {canManage && (
                            <Button onClick={openCreateModal} className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl h-9 text-xs gap-1.5 shadow-lg shadow-blue-500/20">
                                <Plus className="size-3.5" />
                                <span>Add Supplier</span>
                            </Button>
                        )}
                    </div>
                </div>

                {/* Filters Row */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-card border border-border/60 p-4 rounded-2xl shadow-xs print:hidden">
                    <form onSubmit={handleSearchSubmit} className="md:col-span-2 relative">
                        <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by code, company, contact or phone..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 h-9.5 text-xs rounded-xl bg-muted/30"
                        />
                    </form>

                    <select
                        value={district}
                        onChange={(e) => {
                            setDistrict(e.target.value);
                            applyFilters(search, e.target.value, status);
                        }}
                        className="h-9.5 rounded-xl border border-input bg-card px-3 py-1 text-xs shadow-xs focus-visible:outline-hidden"
                    >
                        <option value="">All Districts</option>
                        {districts.map(d => (
                            <option key={d} value={d}>{d}</option>
                        ))}
                    </select>

                    <select
                        value={status}
                        onChange={(e) => {
                            setStatus(e.target.value);
                            applyFilters(search, district, e.target.value);
                        }}
                        className="h-9.5 rounded-xl border border-input bg-card px-3 py-1 text-xs shadow-xs focus-visible:outline-hidden"
                    >
                        <option value="">All Statuses</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>

                {/* Directory Table */}
                <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-xs">
                            <thead>
                                <tr className="border-b border-border/50 bg-muted/40 font-semibold text-muted-foreground text-left">
                                    <th className="px-4 py-3.5">Code</th>
                                    <th className="px-4 py-3.5">Company Name</th>
                                    <th className="px-4 py-3.5">Supplier Name</th>
                                    <th className="px-4 py-3.5">Contact Details</th>
                                    <th className="px-4 py-3.5">District / City</th>
                                    <th className="px-4 py-3.5 text-right">Outstanding</th>
                                    <th className="px-4 py-3.5 text-center">Status</th>
                                    <th className="px-4 py-3.5 text-right print:hidden">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                                {suppliers.data.length > 0 ? (
                                    suppliers.data.map((sup) => (
                                        <tr key={sup.id} className="hover:bg-muted/10 transition-colors">
                                            <td className="px-4 py-3.5 font-mono font-bold text-blue-600 dark:text-blue-400">
                                                {sup.supplier_code}
                                            </td>
                                            <td className="px-4 py-3.5 font-medium text-foreground">
                                                {sup.company_name}
                                            </td>
                                            <td className="px-4 py-3.5 text-muted-foreground">
                                                {sup.supplier_name}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <div>{sup.phone}</div>
                                                {sup.email && <div className="text-[10px] text-muted-foreground mt-0.5">{sup.email}</div>}
                                            </td>
                                            <td className="px-4 py-3.5 text-muted-foreground">
                                                {sup.district ? `${sup.district}, ${sup.city || ''}` : sup.city || 'N/A'}
                                            </td>
                                            <td className="px-4 py-3.5 text-right font-mono font-medium">
                                                Rs. {numberFormat(sup.current_balance)}
                                            </td>
                                            <td className="px-4 py-3.5 text-center">
                                                <Badge className={sup.status === 'active' 
                                                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] rounded-full' 
                                                    : 'bg-muted text-muted-foreground border-border text-[10px] rounded-full'
                                                }>
                                                    {sup.status === 'active' ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3.5 text-right print:hidden">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <Link href={`/suppliers/${sup.id}`} className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors" title="View Profile">
                                                        <Eye className="size-4" />
                                                    </Link>
                                                    {canManage && (
                                                        <button onClick={() => openEditModal(sup)} className="p-1.5 hover:bg-muted text-muted-foreground hover:text-blue-600 rounded-lg transition-colors" title="Edit">
                                                            <Edit className="size-4" />
                                                        </button>
                                                    )}
                                                    {canDelete && (
                                                        <button onClick={() => handleDelete(sup)} className="p-1.5 hover:bg-muted text-muted-foreground hover:text-destructive rounded-lg transition-colors" title="Delete">
                                                            <Trash2 className="size-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={8} className="text-center py-10 text-muted-foreground">
                                            No suppliers found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {suppliers.links && suppliers.links.length > 3 && (
                        <div className="p-4 border-t border-border/50 flex items-center justify-between gap-4 print:hidden">
                            <span className="text-muted-foreground text-xs">
                                Page {suppliers.current_page} of {suppliers.last_page}
                            </span>
                            <div className="flex items-center gap-1">
                                {suppliers.links.map((link, idx) => {
                                    if (!link.url) return null;
                                    return (
                                        <Link
                                            key={idx}
                                            href={link.url}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                            className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                                                link.active
                                                    ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/10'
                                                    : 'bg-card border-border hover:bg-muted'
                                            }`}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Form Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-2xl text-xs">
                    <DialogHeader>
                        <DialogTitle className="text-sm font-bold">
                            {editingSupplier ? `Edit Supplier: ${editingSupplier.supplier_code}` : 'Add New Supplier'}
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleFormSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto px-1 py-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="font-semibold text-muted-foreground">Company Name *</label>
                                <Input
                                    value={data.company_name}
                                    onChange={(e) => setData('company_name', e.target.value)}
                                    className="h-9.5 text-xs rounded-xl"
                                />
                                {errors.company_name && <p className="text-destructive text-[10px] mt-0.5">{errors.company_name}</p>}
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="font-semibold text-muted-foreground">Supplier/Owner Name *</label>
                                <Input
                                    value={data.supplier_name}
                                    onChange={(e) => setData('supplier_name', e.target.value)}
                                    className="h-9.5 text-xs rounded-xl"
                                />
                                {errors.supplier_name && <p className="text-destructive text-[10px] mt-0.5">{errors.supplier_name}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="font-semibold text-muted-foreground">Phone Number *</label>
                                <Input
                                    value={data.phone}
                                    onChange={(e) => setData('phone', e.target.value)}
                                    className="h-9.5 text-xs rounded-xl"
                                    placeholder="+94..."
                                />
                                {errors.phone && <p className="text-destructive text-[10px] mt-0.5">{errors.phone}</p>}
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="font-semibold text-muted-foreground">Mobile (Optional)</label>
                                <Input
                                    value={data.mobile}
                                    onChange={(e) => setData('mobile', e.target.value)}
                                    className="h-9.5 text-xs rounded-xl"
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="font-semibold text-muted-foreground">Email Address</label>
                                <Input
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    className="h-9.5 text-xs rounded-xl"
                                />
                                {errors.email && <p className="text-destructive text-[10px] mt-0.5">{errors.email}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="flex flex-col gap-1.5 sm:col-span-2">
                                <label className="font-semibold text-muted-foreground">Contact Person</label>
                                <Input
                                    value={data.contact_person}
                                    onChange={(e) => setData('contact_person', e.target.value)}
                                    className="h-9.5 text-xs rounded-xl"
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="font-semibold text-muted-foreground">Payment Terms</label>
                                <select
                                    value={data.payment_terms}
                                    onChange={(e) => setData('payment_terms', e.target.value)}
                                    className="h-9.5 rounded-xl border border-input bg-card px-3 py-1 text-xs focus-visible:outline-hidden"
                                >
                                    <option value="COD">Cash On Delivery (COD)</option>
                                    <option value="Net 7">Net 7 Days</option>
                                    <option value="Net 15">Net 15 Days</option>
                                    <option value="Net 30">Net 30 Days</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="font-semibold text-muted-foreground">City</label>
                                <Input
                                    value={data.city}
                                    onChange={(e) => setData('city', e.target.value)}
                                    className="h-9.5 text-xs rounded-xl"
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="font-semibold text-muted-foreground">District</label>
                                <Input
                                    value={data.district}
                                    onChange={(e) => setData('district', e.target.value)}
                                    className="h-9.5 text-xs rounded-xl"
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="font-semibold text-muted-foreground">Country</label>
                                <Input
                                    value={data.country}
                                    onChange={(e) => setData('country', e.target.value)}
                                    className="h-9.5 text-xs rounded-xl"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="font-semibold text-muted-foreground">Address</label>
                                <textarea
                                    value={data.address}
                                    onChange={(e) => setData('address', e.target.value)}
                                    className="flex min-h-16 w-full rounded-xl border border-input bg-transparent px-3 py-2 text-xs shadow-xs focus-visible:outline-hidden"
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="font-semibold text-muted-foreground">Notes</label>
                                <textarea
                                    value={data.notes}
                                    onChange={(e) => setData('notes', e.target.value)}
                                    className="flex min-h-16 w-full rounded-xl border border-input bg-transparent px-3 py-2 text-xs shadow-xs focus-visible:outline-hidden"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="font-semibold text-muted-foreground">Business Registration No.</label>
                                <Input
                                    value={data.business_registration_no}
                                    onChange={(e) => setData('business_registration_no', e.target.value)}
                                    className="h-9.5 text-xs rounded-xl"
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="font-semibold text-muted-foreground">VAT/Tax Number</label>
                                <Input
                                    value={data.tax_number}
                                    onChange={(e) => setData('tax_number', e.target.value)}
                                    className="h-9.5 text-xs rounded-xl"
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="font-semibold text-muted-foreground">Status</label>
                                <select
                                    value={data.status}
                                    onChange={(e) => setData('status', e.target.value as 'active' | 'inactive')}
                                    className="h-9.5 rounded-xl border border-input bg-card px-3 py-1 text-xs focus-visible:outline-hidden"
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="font-semibold text-muted-foreground">Bank Name</label>
                                <Input
                                    value={data.bank_name}
                                    onChange={(e) => setData('bank_name', e.target.value)}
                                    className="h-9.5 text-xs rounded-xl"
                                    placeholder="e.g. BOC, Sampath"
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="font-semibold text-muted-foreground">Bank Account Number</label>
                                <Input
                                    value={data.bank_account_no}
                                    onChange={(e) => setData('bank_account_no', e.target.value)}
                                    className="h-9.5 text-xs rounded-xl"
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="font-semibold text-muted-foreground">Credit Limit (Rs.)</label>
                                <Input
                                    type="number"
                                    value={data.credit_limit}
                                    onChange={(e) => setData('credit_limit', parseFloat(e.target.value) || 0)}
                                    className="h-9.5 text-xs rounded-xl"
                                />
                            </div>
                        </div>

                        {!editingSupplier && (
                            <div className="flex flex-col gap-1.5 max-w-xs">
                                <label className="font-semibold text-muted-foreground">Opening Balance (Rs.)</label>
                                <Input
                                    type="number"
                                    value={data.opening_balance}
                                    onChange={(e) => setData('opening_balance', parseFloat(e.target.value) || 0)}
                                    className="h-9.5 text-xs rounded-xl"
                                />
                            </div>
                        )}

                        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/50">
                            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="rounded-xl h-9.5 text-xs">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={processing} className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl h-9.5 text-xs gap-1.5">
                                <Save className="size-3.5" />
                                <span>Save Supplier</span>
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

function numberFormat(val: number): string {
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
}
