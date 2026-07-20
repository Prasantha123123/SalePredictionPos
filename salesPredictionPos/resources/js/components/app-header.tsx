import { useState, useEffect } from 'react';
import { Link, usePage } from '@inertiajs/react';
import {
    Bell,
    ChevronDown,
    Command,
    Plus,
    Search,
    Sun,
    Moon,
    ShoppingCart,
    PackagePlus,
    UserPlus,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { UserMenuContent } from '@/components/user-menu-content';
import { useInitials } from '@/hooks/use-initials';
import { useAppearance } from '@/hooks/use-appearance';
import type { BreadcrumbItem } from '@/types';

type Props = {
    breadcrumbs?: BreadcrumbItem[];
};

export function AppHeader({ breadcrumbs = [] }: Props) {
    const page = usePage();
    const { auth } = page.props;
    const getInitials = useInitials();
    const { appearance, updateAppearance } = useAppearance();

    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Global keyboard shortcut Ctrl+K / Cmd+K
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setSearchOpen((prev) => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const toggleTheme = () => {
        updateAppearance(appearance === 'dark' ? 'light' : 'dark');
    };

    const mockNotifications = [
        { id: 1, title: 'AI Demand Alert', text: 'Artisan Coffee predicted demand +35% tomorrow.', time: '5m ago', type: 'ai' },
        { id: 2, title: 'Low Stock Threshold', text: 'Organic Milk 1L down to 4 units in main warehouse.', time: '12m ago', type: 'stock' },
        { id: 3, title: 'Order Completed', text: 'Sale #POS-1049 ($142.50) processed successfully.', time: '1h ago', type: 'sale' },
    ];

    const searchQuickLinks = [
        { title: 'POS Terminal', href: '/pos', category: 'Pages' },
        { title: 'AI Demand Forecast', href: '/forecasts', category: 'Pages' },
        { title: 'Products Catalogue', href: '/products', category: 'Inventory' },
        { title: 'Stock Movements', href: '/inventory', category: 'Inventory' },
        { title: 'Customer Directory', href: '/customers', category: 'CRM' },
        { title: 'Sales Analytics', href: '/reports', category: 'Reports' },
    ];

    const filteredLinks = searchQuickLinks.filter((l) =>
        l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <>
            <header className="sticky top-0 z-30 h-16 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl transition-all">
                <div className="mx-auto flex h-full items-center justify-between px-4 sm:px-6">
                    {/* Left Sidebar Trigger + Breadcrumbs */}
                    <div className="flex items-center gap-3">
                        <SidebarTrigger className="size-9 rounded-xl hover:bg-muted shrink-0" />

                        <div className="lg:hidden">
                            <Link href="/dashboard">
                                <AppLogo />
                            </Link>
                        </div>
                        {breadcrumbs.length > 0 && (
                            <div className="hidden sm:block">
                                <Breadcrumbs breadcrumbs={breadcrumbs} />
                            </div>
                        )}
                    </div>

                    {/* Middle Quick Search Bar */}
                    <button
                        onClick={() => setSearchOpen(true)}
                        className="hidden md:flex items-center justify-between w-64 lg:w-80 h-9 px-3 rounded-xl bg-muted/40 hover:bg-muted/70 border border-border/50 text-xs text-muted-foreground transition-all cursor-pointer group"
                    >
                        <div className="flex items-center gap-2">
                            <Search className="size-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                            <span>Search products, sales, customers...</span>
                        </div>
                        <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-border bg-background text-[10px] font-mono font-medium">
                            <Command className="size-2.5" /> K
                        </kbd>
                    </button>

                    {/* Right Tools & Actions */}
                    <div className="flex items-center gap-2">
                        {/* Quick Add Menu */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    size="sm"
                                    className="h-9 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-md shadow-blue-500/20 gap-1.5"
                                >
                                    <Plus className="size-3.5" />
                                    <span className="hidden sm:inline">Quick Add</span>
                                    <ChevronDown className="size-3 opacity-70" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 rounded-xl p-1.5">
                                <DropdownMenuItem asChild className="rounded-lg text-xs gap-2 cursor-pointer">
                                    <Link href="/pos">
                                        <ShoppingCart className="size-4 text-emerald-500" />
                                        <span>New Checkout Sale</span>
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild className="rounded-lg text-xs gap-2 cursor-pointer">
                                    <Link href="/products">
                                        <PackagePlus className="size-4 text-blue-500" />
                                        <span>Add New Product</span>
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild className="rounded-lg text-xs gap-2 cursor-pointer">
                                    <Link href="/customers">
                                        <UserPlus className="size-4 text-amber-500" />
                                        <span>Register Customer</span>
                                    </Link>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Search Button for Mobile */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSearchOpen(true)}
                            className="md:hidden size-9 rounded-xl"
                        >
                            <Search className="size-4" />
                        </Button>

                        {/* Theme Toggle */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleTheme}
                            className="size-9 rounded-xl hover:bg-muted"
                            title="Toggle Light / Dark Mode"
                        >
                            {appearance === 'dark' ? (
                                <Sun className="size-4 text-amber-400" />
                            ) : (
                                <Moon className="size-4 text-slate-700" />
                            )}
                        </Button>

                        {/* Notifications Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="relative size-9 rounded-xl hover:bg-muted"
                                >
                                    <Bell className="size-4 text-foreground/80" />
                                    {((page.props.expiry_alerts_count as number) || 0) > 0 && (
                                        <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded-full bg-rose-600 text-[8px] font-black text-white ring-2 ring-background animate-pulse">
                                            {page.props.expiry_alerts_count as number}
                                        </span>
                                    )}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-80 p-0 rounded-2xl shadow-xl">
                                <div className="p-3.5 border-b border-border/60 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold">Notifications</span>
                                        {((page.props.expiry_alerts_count as number) || 0) > 0 && (
                                            <span className="px-1.5 py-0.5 rounded-full bg-rose-500/10 text-[10px] font-extrabold text-rose-600">
                                                {page.props.expiry_alerts_count as number} Alerts
                                            </span>
                                        )}
                                    </div>
                                    <button className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-medium">
                                        Mark all read
                                    </button>
                                </div>
                                <div className="divide-y divide-border/40 max-h-72 overflow-y-auto">
                                    {((page.props.expiry_alerts_count as number) || 0) > 0 && (
                                        <Link
                                            href="/reports/expiry-report"
                                            className="p-3 hover:bg-rose-500/5 transition-colors flex items-start gap-2.5 bg-rose-500/5"
                                        >
                                            <div className="size-2 rounded-full bg-rose-500 mt-1.5 shrink-0 animate-ping" />
                                            <div className="space-y-0.5 flex-1">
                                                <p className="text-xs font-bold text-rose-600">Inventory Expiry Alert</p>
                                                <p className="text-[11px] text-rose-700 leading-snug">
                                                    {page.props.expiry_alerts_count as number} batches have expired or are expiring within 30 days.
                                                </p>
                                                <span className="text-[10px] font-semibold text-rose-500 hover:underline">View Expiry Report →</span>
                                            </div>
                                        </Link>
                                    )}
                                    {mockNotifications.map((n) => (
                                        <div key={n.id} className="p-3 hover:bg-muted/40 transition-colors flex items-start gap-2.5">
                                            <div className="size-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                                            <div className="space-y-0.5 flex-1">
                                                <p className="text-xs font-semibold text-foreground">{n.title}</p>
                                                <p className="text-[11px] text-muted-foreground leading-snug">{n.text}</p>
                                                <span className="text-[10px] text-muted-foreground/70">{n.time}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Profile User Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className="h-9 gap-2 pl-1 pr-2 rounded-full hover:bg-muted"
                                >
                                    <Avatar className="size-7 border border-border">
                                        <AvatarImage src={auth.user?.avatar} alt={auth.user?.name} />
                                        <AvatarFallback className="bg-blue-600 text-white font-bold text-xs">
                                            {getInitials(auth.user?.name ?? 'Admin')}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs font-semibold hidden sm:inline max-w-[100px] truncate">
                                        {auth.user?.name ?? 'Super Admin'}
                                    </span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1.5">
                                {auth.user && <UserMenuContent user={auth.user} />}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </header>

            {/* Global Search Dialog Modal */}
            <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
                <DialogContent className="sm:max-w-lg rounded-2xl p-0 overflow-hidden">
                    <div className="p-4 border-b border-border flex items-center gap-3">
                        <Search className="size-4 text-muted-foreground" />
                        <Input
                            placeholder="Type to search POS navigation, products, reports..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="border-none shadow-none focus-visible:ring-0 text-sm h-8"
                            autoFocus
                        />
                    </div>
                    <div className="p-2 max-h-80 overflow-y-auto divide-y divide-border/30">
                        {filteredLinks.length > 0 ? (
                            filteredLinks.map((item, index) => (
                                <Link
                                    key={index}
                                    href={item.href}
                                    onClick={() => setSearchOpen(false)}
                                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-muted/60 transition-colors"
                                >
                                    <span className="text-xs font-medium">{item.title}</span>
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                        {item.category}
                                    </span>
                                </Link>
                            ))
                        ) : (
                            <div className="p-8 text-center text-xs text-muted-foreground">
                                No matching resources found. Try another search.
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
