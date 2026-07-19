import { AppHeader } from '@/components/app-header';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    return <AppHeader breadcrumbs={breadcrumbs} />;
}
