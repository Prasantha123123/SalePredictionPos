import { ShoppingBag, Sparkles } from 'lucide-react';

export default function AppLogo() {
    return (
        <div className="flex items-center gap-2.5">
            <div className="flex aspect-square size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-emerald-500 text-white shadow-md shadow-blue-500/20">
                <ShoppingBag className="size-5" />
            </div>
            <div className="flex flex-col text-left">
                <span className="truncate leading-none font-black text-sm text-foreground tracking-tight">
                    Smart POS <span className="text-blue-600 dark:text-blue-400">AI</span>
                </span>
                <span className="text-[10px] text-muted-foreground font-semibold tracking-wider uppercase mt-0.5">
                    Retail SaaS
                </span>
            </div>
        </div>
    );
}
