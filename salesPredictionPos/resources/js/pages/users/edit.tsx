import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Save } from 'lucide-react';

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
    user: User;
    roles: Role[];
}

export default function UserEdit({ user, roles }: Props) {
    const { data, setData, put, processing, errors } = useForm({
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        role: user.roles[0]?.name || '',
        is_active: user.is_active,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(`/users/${user.id}`);
    };

    return (
        <>
            <Head title={`Edit ${user.name}`} />
            <div className="flex h-full flex-1 flex-col gap-4 p-4 lg:p-6">
                <div className="flex items-center gap-3">
                    <Link href="/users" className="rounded-lg border border-gray-300 p-2 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">Edit Staff Account</h1>
                </div>

                <form onSubmit={handleSubmit} className="mx-auto w-full max-w-2xl">
                    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900/50">
                        <div className="grid gap-5 sm:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Name *</label>
                                <input type="text" value={data.name} onChange={(e) => setData('name', e.target.value)}
                                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Email Address *</label>
                                <input type="email" value={data.email} onChange={(e) => setData('email', e.target.value)}
                                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                                {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
                                <input type="text" value={data.phone} onChange={(e) => setData('phone', e.target.value)}
                                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                                {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Role *</label>
                                <select value={data.role} onChange={(e) => setData('role', e.target.value)}
                                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white">
                                    {roles.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
                                </select>
                                {errors.role && <p className="mt-1 text-xs text-red-500">{errors.role}</p>}
                            </div>

                            <div className="sm:col-span-2">
                                <label className="flex items-center gap-2">
                                    <input type="checkbox" checked={data.is_active} onChange={(e) => setData('is_active', e.target.checked)}
                                        className="rounded border-gray-300 text-indigo-600" />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">Account Active</span>
                                </label>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <Link href="/users" className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300">
                                Cancel
                            </Link>
                            <button type="submit" disabled={processing}
                                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50">
                                <Save className="h-4 w-4" /> Update User
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </>
    );
}

UserEdit.layout = {
    breadcrumbs: [
        { title: 'Users', href: '/users' },
        { title: 'Edit User', href: '#' },
    ],
};
