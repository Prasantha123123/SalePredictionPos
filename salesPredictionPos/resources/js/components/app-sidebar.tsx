import { Link } from '@inertiajs/react';
import {
    BarChart3,
    Box,
    Calendar,
    CreditCard,
    DollarSign,
    FolderKanban,
    LayoutGrid,
    Package,
    PieChart,
    Settings,
    ShieldCheck,
    ShoppingCart,
    Sparkles,
    Users,
    Wallet,
    MessageCircle,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import type { NavItem } from '@/types';

export interface ExtendedNavItem extends NavItem {
    badge?: string;
    badgeColor?: string;
    subItems?: { title: string; href: string }[];
}

const mainNavItems: ExtendedNavItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
        icon: LayoutGrid,
    },
    {
        title: 'Smart POS',
        href: '/pos',
        icon: ShoppingCart,
        badge: 'LIVE',
        badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    },
    {
        title: 'AI Prediction',
        href: '/forecasts',
        icon: Sparkles,
        badge: 'AI 2.0',
        badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    },
    {
        title: 'AI Assistant',
        href: '/ai-assistant',
        icon: MessageCircle,
        badge: 'NEW',
        badgeColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    },
    {
        title: 'Products',
        href: '/products',
        icon: Package,
    },
    {
        title: 'Inventory',
        href: '/inventory',
        icon: Box,
    },
    {
        title: 'Customers',
        href: '/customers',
        icon: Users,
    },
    {
        title: 'Expenses',
        href: '/expenses',
        icon: Wallet,
    },
    {
        title: 'Analytics Reports',
        href: '/reports',
        icon: BarChart3,
        subItems: [
            { title: 'Dashboard', href: '/reports' },
            { title: 'Daily Sales Report', href: '/reports/daily-sales' },
            { title: 'Product Sales Report', href: '/reports/product-sales' },
            { title: 'Category Sales Report', href: '/reports/category-sales' },
            { title: 'Customer Report', href: '/reports/customer-sales' },
            { title: 'Payment Report', href: '/reports/payment-sales' },
            { title: 'Inventory Report', href: '/reports/inventory-sales' },
            { title: 'Profit Report', href: '/reports/profit-sales' },
            { title: 'Expiry & Waste Report', href: '/reports/expiry-report' },
        ],
    },
    {
        title: 'Team & Roles',
        href: '/users',
        icon: ShieldCheck,
    },
    {
        title: 'Store Settings',
        href: '/settings/profile',
        icon: Settings,
    },
];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset" className="border-r border-sidebar-border/60">
            <SidebarHeader className="py-3 px-4">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild className="hover:bg-transparent">
                            <Link href="/dashboard" prefetch className="flex items-center gap-3">
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="px-2">
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter className="border-t border-sidebar-border/50 p-2">
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
