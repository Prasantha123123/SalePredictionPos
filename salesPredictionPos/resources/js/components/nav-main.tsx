import { useState } from 'react';
import { Link } from '@inertiajs/react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import type { ExtendedNavItem } from '@/components/app-sidebar';

export function NavMain({ items = [] }: { items: ExtendedNavItem[] }) {
    const { isCurrentUrl } = useCurrentUrl();
    const [reportsOpen, setReportsOpen] = useState(true);

    return (
        <SidebarGroup className="px-1 py-2 space-y-1">
            <SidebarGroupLabel className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70 px-2 mb-1">
                Main Menu
            </SidebarGroupLabel>
            <SidebarMenu className="space-y-1">
                {items.map((item) => {
                    const active = isCurrentUrl(item.href) || (item.subItems && item.subItems.some((s) => isCurrentUrl(s.href)));
                    const hasSubItems = item.subItems && item.subItems.length > 0;

                    return (
                        <SidebarMenuItem key={item.title} className="flex flex-col">
                            <SidebarMenuButton
                                asChild={!hasSubItems}
                                isActive={active}
                                tooltip={{ children: item.title }}
                                onClick={() => {
                                    if (hasSubItems) {
                                        setReportsOpen(!reportsOpen);
                                    }
                                }}
                                className={`rounded-xl h-10 transition-all font-medium cursor-pointer ${
                                    active
                                        ? 'bg-blue-600/10 text-blue-600 dark:text-blue-400 font-semibold shadow-xs'
                                        : 'hover:bg-muted/60 text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {hasSubItems ? (
                                    <div className="flex items-center justify-between w-full px-2 py-1">
                                        <div className="flex items-center gap-3">
                                            {item.icon && <item.icon className={`size-4 ${active ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}`} />}
                                            <span className="text-xs">{item.title}</span>
                                        </div>
                                        {reportsOpen ? <ChevronDown className="size-3 text-muted-foreground" /> : <ChevronRight className="size-3 text-muted-foreground" />}
                                    </div>
                                ) : (
                                    <Link href={item.href} prefetch className="flex items-center justify-between w-full">
                                        <div className="flex items-center gap-3">
                                            {item.icon && <item.icon className={`size-4 ${active ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}`} />}
                                            <span className="text-xs">{item.title}</span>
                                        </div>
                                        {item.badge && (
                                            <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${item.badgeColor}`}>
                                                {item.badge}
                                            </span>
                                        )}
                                    </Link>
                                )}
                            </SidebarMenuButton>

                            {/* Sub items dropdown list */}
                            {hasSubItems && reportsOpen && (
                                <div className="ml-7 mt-1 space-y-0.5 border-l border-border/50 pl-2">
                                    {item.subItems?.map((sub) => {
                                        const isSubActive = isCurrentUrl(sub.href);
                                        return (
                                            <Link
                                                key={sub.href}
                                                href={sub.href}
                                                className={`block px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                                                    isSubActive
                                                        ? 'bg-blue-600/10 text-blue-600 dark:text-blue-400 font-bold'
                                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                                                }`}
                                            >
                                                {sub.title}
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </SidebarMenuItem>
                    );
                })}
            </SidebarMenu>
        </SidebarGroup>
    );
}
