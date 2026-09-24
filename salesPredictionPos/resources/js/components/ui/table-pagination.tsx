import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface Props {
    links: PaginationLink[];
    currentPage: number;
    lastPage: number;
}

/**
 * TablePagination — drop-in pagination bar for all report tables.
 * Renders previous/next arrows + numbered page buttons from Laravel's paginator links.
 */
export function TablePagination({ links, currentPage, lastPage }: Props) {
    if (lastPage <= 1) return null;

    const pageLinks = links.filter(
        (l) => !l.label.includes('Previous') && !l.label.includes('Next') && !l.label.includes('&laquo;') && !l.label.includes('&raquo;'),
    );

    const prevLink = links.find((l) => l.label.includes('&laquo;') || l.label.includes('Previous'));
    const nextLink = links.find((l) => l.label.includes('&raquo;') || l.label.includes('Next'));

    const firstLink = pageLinks[0];
    const lastLink = pageLinks[pageLinks.length - 1];

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border/40 bg-muted/20">
            <p className="text-[11px] text-muted-foreground font-medium">
                Page <span className="text-foreground font-bold">{currentPage}</span> of{' '}
                <span className="text-foreground font-bold">{lastPage}</span>
            </p>

            <div className="flex items-center gap-1">
                {/* First page */}
                {firstLink?.url ? (
                    <Link href={firstLink.url}>
                        <Button variant="ghost" size="sm" disabled={currentPage === 1} className="h-7 w-7 p-0 rounded-lg disabled:opacity-40" title="First page">
                            <ChevronsLeft className="size-3.5" />
                        </Button>
                    </Link>
                ) : (
                    <Button variant="ghost" size="sm" disabled className="h-7 w-7 p-0 rounded-lg opacity-40"><ChevronsLeft className="size-3.5" /></Button>
                )}

                {/* Previous */}
                {prevLink?.url ? (
                    <Link href={prevLink.url}>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-lg" title="Previous page"><ChevronLeft className="size-3.5" /></Button>
                    </Link>
                ) : (
                    <Button variant="ghost" size="sm" disabled className="h-7 w-7 p-0 rounded-lg opacity-40"><ChevronLeft className="size-3.5" /></Button>
                )}

                {/* Page number buttons */}
                {pageLinks.map((link) => {
                    const page = parseInt(link.label, 10);
                    if (isNaN(page)) return null;
                    const cur = currentPage;
                    const total = lastPage;
                    const isVisible = page === 1 || page === total || (page >= cur - 2 && page <= cur + 2);
                    if (!isVisible) {
                        if (page === cur - 3 || page === cur + 3) {
                            return <span key={link.label} className="px-1 text-muted-foreground text-xs select-none">…</span>;
                        }
                        return null;
                    }
                    return link.active ? (
                        <Button key={link.label} variant="default" size="sm" className="h-7 min-w-7 px-2 rounded-lg text-[11px] font-bold cursor-default">
                            {link.label}
                        </Button>
                    ) : link.url ? (
                        <Link key={link.label} href={link.url}>
                            <Button variant="ghost" size="sm" className="h-7 min-w-7 px-2 rounded-lg text-[11px] hover:bg-muted">
                                {link.label}
                            </Button>
                        </Link>
                    ) : null;
                })}

                {/* Next */}
                {nextLink?.url ? (
                    <Link href={nextLink.url}>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-lg" title="Next page"><ChevronRight className="size-3.5" /></Button>
                    </Link>
                ) : (
                    <Button variant="ghost" size="sm" disabled className="h-7 w-7 p-0 rounded-lg opacity-40"><ChevronRight className="size-3.5" /></Button>
                )}

                {/* Last page */}
                {lastLink?.url ? (
                    <Link href={lastLink.url}>
                        <Button variant="ghost" size="sm" disabled={currentPage === lastPage} className="h-7 w-7 p-0 rounded-lg disabled:opacity-40" title="Last page">
                            <ChevronsRight className="size-3.5" />
                        </Button>
                    </Link>
                ) : (
                    <Button variant="ghost" size="sm" disabled className="h-7 w-7 p-0 rounded-lg opacity-40"><ChevronsRight className="size-3.5" /></Button>
                )}
            </div>
        </div>
    );
}
