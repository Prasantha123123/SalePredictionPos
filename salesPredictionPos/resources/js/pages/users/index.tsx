import { useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Edit, Lock, Plus, Save, ShieldCheck, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import AppLayout from '@/layouts/app-layout';

interface Role {
    id: number;
    name: string;
}

interface User {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    is_active: boolean;
    roles: Role[];
}

interface Props {
    users: {
        data: User[];
        links: { url: string | null; label: string; active: boolean }[];
        current_page: number;
        last_page: number;
    };
    roles: Role[];
}

export default function UsersIndex({ users, roles = [] }: Props) {
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        name: '',
        email: '',
        phone: '',
        password: '',
        role_id: roles[0] ? roles[0].id.toString() : '',
        is_active: true,
    });

    const openCreateModal = () => {
        setEditingUser(null);
        clearErrors();
        reset();
        setIsModalOpen(true);
    };

    const openEditModal = (usr: User) => {
        setEditingUser(usr);
        clearErrors();
        setData({
            name: usr.name || '',
            email: usr.email || '',
            phone: usr.phone || '',
            password: '',
            role_id: usr.roles[0] ? usr.roles[0].id.toString() : '',
            is_active: usr.is_active,
        });
        setIsModalOpen(true);
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingUser) {
            put(`/users/${editingUser.id}`, {
                onSuccess: () => {
                    setIsModalOpen(false);
                    reset();
                },
            });
        } else {
            post('/users', {
                onSuccess: () => {
                    setIsModalOpen(false);
                    reset();
                },
            });
        }
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Team & Role Permissions', href: '/users' }]}>
            <Head title="Staff Accounts - Smart POS AI" />

            <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
                {/* Header Title Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-foreground">
                            Team & Role Management (RBAC)
                        </h1>
                        <p className="text-xs text-muted-foreground">
                            Assign cashier, manager, accountant, and inventory staff access permissions.
                        </p>
                    </div>

                    <Button
                        onClick={openCreateModal}
                        className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20 gap-1.5"
                    >
                        <Plus className="size-4" />
                        <span>Add Staff Member</span>
                    </Button>
                </div>

                {/* Banner Callout */}
                <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-600 dark:text-blue-400 flex items-center gap-3">
                    <ShieldCheck className="size-5 shrink-0 text-blue-500" />
                    <span>
                        System roles restrict access to terminal cashier drawers, inventory stock overrides, revenue reports, and ML prediction models.
                    </span>
                </div>

                {/* Users Table */}
                {users.data.length === 0 ? (
                    <EmptyState
                        icon={Users}
                        title="No Staff Accounts Found"
                        description="No team members registered yet. Click below to invite a cashier or store manager."
                        actionLabel="Add Staff Member"
                        onAction={openCreateModal}
                    />
                ) : (
                    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead className="bg-muted/40 border-b border-border/60 text-muted-foreground uppercase font-bold tracking-wider text-[10px]">
                                    <tr>
                                        <th className="px-4 py-3.5 text-left">Staff Name</th>
                                        <th className="px-4 py-3.5 text-left">Email Address</th>
                                        <th className="px-4 py-3.5 text-left">Phone</th>
                                        <th className="px-4 py-3.5 text-left">Assigned Role</th>
                                        <th className="px-4 py-3.5 text-center">Status</th>
                                        <th className="px-4 py-3.5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/40">
                                    {users.data.map((usr) => (
                                        <tr key={usr.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-3.5 font-bold text-foreground">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="size-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                                                        {usr.name[0]}
                                                    </div>
                                                    <span>{usr.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5 text-muted-foreground">{usr.email}</td>
                                            <td className="px-4 py-3.5 font-mono text-muted-foreground">{usr.phone || '—'}</td>
                                            <td className="px-4 py-3.5">
                                                {usr.roles.map((r) => (
                                                    <Badge key={r.id} className="bg-blue-500/10 text-blue-600 border-blue-500/20 font-bold">
                                                        {r.name}
                                                    </Badge>
                                                )) || <span className="text-muted-foreground">No Role</span>}
                                            </td>
                                            <td className="px-4 py-3.5 text-center">
                                                <Badge className={usr.is_active ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-muted text-muted-foreground'}>
                                                    {usr.is_active ? 'Active' : 'Disabled'}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3.5 text-right">
                                                <button onClick={() => openEditModal(usr)} className="text-muted-foreground hover:text-blue-600">
                                                    <Edit className="size-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* ADD / EDIT STAFF DIALOG MODAL */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-md rounded-2xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold">
                            {editingUser ? 'Edit Staff Credentials' : 'Add Staff Member'}
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleFormSubmit} className="space-y-4 mt-2">
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-muted-foreground">Full Name *</label>
                                <Input
                                    type="text"
                                    required
                                    placeholder="e.g. Kasun Fernando"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    className="h-10 rounded-xl"
                                />
                                {errors.name && <p className="text-[11px] text-destructive">{errors.name}</p>}
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-muted-foreground">Email Address *</label>
                                <Input
                                    type="email"
                                    required
                                    placeholder="kasun@smartpos.lk"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    className="h-10 rounded-xl"
                                />
                                {errors.email && <p className="text-[11px] text-destructive">{errors.email}</p>}
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-muted-foreground">Phone Number</label>
                                <Input
                                    type="tel"
                                    placeholder="+94 71 987 6543"
                                    value={data.phone}
                                    onChange={(e) => setData('phone', e.target.value)}
                                    className="h-10 rounded-xl"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-muted-foreground">System Role *</label>
                                <Select
                                    value={data.role_id}
                                    onValueChange={(val) => setData('role_id', val)}
                                >
                                    <SelectTrigger className="h-10 rounded-xl text-xs">
                                        <SelectValue placeholder="Select Role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(roles.length > 0 ? roles : [{ id: 1, name: 'Cashier' }, { id: 2, name: 'Manager' }, { id: 3, name: 'Admin' }]).map((r) => (
                                            <SelectItem key={r.id} value={r.id.toString()}>
                                                {r.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {!editingUser && (
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-muted-foreground">Initial Password *</label>
                                    <Input
                                        type="password"
                                        required={!editingUser}
                                        placeholder="••••••••••••"
                                        value={data.password}
                                        onChange={(e) => setData('password', e.target.value)}
                                        className="h-10 rounded-xl"
                                    />
                                    {errors.password && <p className="text-[11px] text-destructive">{errors.password}</p>}
                                </div>
                            )}
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
                                <span>{editingUser ? 'Update Staff' : 'Save Staff Member'}</span>
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
