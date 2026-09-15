import { Link, usePage } from '@inertiajs/react';
import AppLogoIcon from '@/components/app-logo-icon';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';
import { motion } from 'framer-motion';
import { ShoppingCart, BarChart3, Package, DollarSign } from 'lucide-react';

export default function AuthSplitLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    const { name } = usePage().props;

    return (
        <div className="relative min-h-screen grid lg:grid-cols-12 bg-background font-sans overflow-hidden">
            {/* Left Branding Column */}
            <div className="relative hidden lg:flex lg:col-span-6 xl:col-span-7 flex-col justify-between p-12 bg-slate-950 text-white overflow-hidden">
                {/* Background Gradients */}
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(37,99,235,0.35),rgba(255,255,255,0))]" />
                <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/3 w-[400px] h-[400px] bg-blue-600/15 rounded-full blur-3xl" />

                {/* Brand Header */}
                <div className="relative z-10 flex items-center">
                    <Link
                        href={home.url()}
                        className="flex items-center gap-3 group transition-transform duration-200 hover:scale-105"
                    >
                        <div className="size-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-emerald-500 p-0.5 shadow-lg shadow-blue-500/20">
                            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                                <AppLogoIcon className="size-6 text-blue-400" />
                            </div>
                        </div>
                        <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                            {name || 'Smart POS'}
                        </span>
                    </Link>
                </div>

                {/* Hero Content */}
                <div className="relative z-10 my-auto max-w-xl space-y-8 py-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="space-y-4"
                    >
                        <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl leading-[1.15]">
                            Manage Your{' '}
                            <span className="bg-gradient-to-r from-blue-400 via-emerald-400 to-teal-300 bg-clip-text text-transparent">
                                Business
                            </span>{' '}
                            Smarter.
                        </h2>
                        <p className="text-slate-400 text-base leading-relaxed">
                            Your complete point-of-sale solution for sales tracking, inventory management, and business reporting — all in one place.
                        </p>
                    </motion.div>

                    {/* Feature Cards */}
                    <div className="grid grid-cols-2 gap-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.4, delay: 0.2 }}
                            className="p-4 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 space-y-2"
                        >
                            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                                <ShoppingCart className="size-4 text-blue-400" />
                                <span>Sales</span>
                            </div>
                            <p className="text-sm text-slate-300">Track daily sales and revenue in real time</p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.4, delay: 0.3 }}
                            className="p-4 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 space-y-2"
                        >
                            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                                <Package className="size-4 text-emerald-400" />
                                <span>Inventory</span>
                            </div>
                            <p className="text-sm text-slate-300">Monitor stock levels and batch tracking</p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.4, delay: 0.4 }}
                            className="p-4 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 space-y-2"
                        >
                            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                                <BarChart3 className="size-4 text-amber-400" />
                                <span>Reports</span>
                            </div>
                            <p className="text-sm text-slate-300">Detailed analytics and profit reports</p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.4, delay: 0.5 }}
                            className="p-4 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 space-y-2"
                        >
                            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                                <DollarSign className="size-4 text-purple-400" />
                                <span>Forecasting</span>
                            </div>
                            <p className="text-sm text-slate-300">Predict demand and optimize ordering</p>
                        </motion.div>
                    </div>
                </div>

                {/* Footer */}
                <div className="relative z-10 flex items-center justify-between text-xs text-slate-500 pt-6 border-t border-slate-800/60">
                    <p>© {new Date().getFullYear()} Smart POS System. All rights reserved.</p>
                    <div className="flex items-center gap-4 text-slate-400">
                        <span>Secure Login</span>
                        <span>•</span>
                        <span>256-Bit SSL</span>
                    </div>
                </div>
            </div>

            {/* Right Interactive Form Area */}
            <div className="flex col-span-12 lg:col-span-6 xl:col-span-5 flex-col justify-center px-6 py-12 lg:px-12 xl:px-16 bg-background relative z-10">
                <div className="w-full max-w-md mx-auto space-y-8">
                    <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-2">
                        <Link
                            href={home.url()}
                            className="flex items-center gap-2.5 lg:hidden mb-4"
                        >
                            <div className="size-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
                                <AppLogoIcon className="size-6 fill-current" />
                            </div>
                            <span className="text-xl font-bold">{name || 'Smart POS'}</span>
                        </Link>
                        {title && (
                            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                                {title}
                            </h1>
                        )}
                        {description && (
                            <p className="text-sm text-muted-foreground max-w-sm">
                                {description}
                            </p>
                        )}
                    </div>

                    {children}
                </div>
            </div>
        </div>
    );
}
