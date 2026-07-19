import { LucideIcon, PackageOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
    icon?: LucideIcon;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
}

export function EmptyState({
    icon: Icon = PackageOpen,
    title,
    description,
    actionLabel,
    onAction,
}: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl bg-card border border-border/60 my-6 space-y-3">
            <div className="size-16 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground/60 shadow-xs">
                <Icon className="size-8" />
            </div>
            <h3 className="text-sm font-bold text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">{description}</p>
            {actionLabel && onAction && (
                <Button
                    onClick={onAction}
                    className="mt-2 h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-500/20"
                >
                    {actionLabel}
                </Button>
            )}
        </div>
    );
}
