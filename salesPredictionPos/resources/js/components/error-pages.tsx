import { Link } from '@inertiajs/react';
import { AlertOctagon, ArrowLeft, Home, ShieldAlert, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorPageProps {
    status: 404 | 403 | 500;
}

export function ErrorPage({ status }: ErrorPageProps) {
    const errorDetails = {
        404: {
            title: 'Page Not Found',
            code: '404',
            description: "The resource or page you requested could not be located in our POS system.",
            icon: AlertOctagon,
            color: 'text-amber-500',
        },
        403: {
            title: 'Access Restricted',
            code: '403',
            description: 'You do not have sufficient permissions to view this module. Contact your Super Admin.',
            icon: ShieldAlert,
            color: 'text-red-500',
        },
        500: {
            title: 'Internal System Error',
            code: '500',
            description: 'Our server encountered an unexpected error. The technical team has been notified.',
            icon: WifiOff,
            color: 'text-blue-500',
        },
    };

    const details = errorDetails[status] || errorDetails[404];
    const Icon = details.icon;

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6 font-sans">
            <div className="w-full max-w-md text-center space-y-6">
                <div className="relative inline-flex items-center justify-center">
                    <div className="size-24 rounded-3xl bg-muted/50 border border-border flex items-center justify-center">
                        <Icon className={`size-12 ${details.color}`} />
                    </div>
                    <span className="absolute -bottom-2 px-3 py-0.5 rounded-full bg-foreground text-background font-mono text-xs font-black">
                        ERROR {details.code}
                    </span>
                </div>

                <div className="space-y-2">
                    <h1 className="text-2xl font-black text-foreground">{details.title}</h1>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        {details.description}
                    </p>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2">
                    <Button
                        asChild
                        variant="outline"
                        className="h-10 px-4 rounded-xl font-medium text-xs gap-2"
                    >
                        <Link href="/pos">
                            <ArrowLeft className="size-4" />
                            <span>Return to POS</span>
                        </Link>
                    </Button>

                    <Button
                        asChild
                        className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-500/20 gap-2"
                    >
                        <Link href="/dashboard">
                            <Home className="size-4" />
                            <span>Go to Dashboard</span>
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
