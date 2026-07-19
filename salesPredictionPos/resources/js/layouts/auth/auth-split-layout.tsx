import { Link, usePage } from '@inertiajs/react';
import AppLogoIcon from '@/components/app-logo-icon';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';
import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, ShieldCheck, Zap } from 'lucide-react';

export default function AuthSplitLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    const { name } = usePage().props;

    return (
        <div className="relative min-h-screen grid lg:grid-cols-12 bg-background font-sans overflow-hidden">
            {/* Left Decorative & SaaS Showcase Column */}
            <div className="relative hidden lg:flex lg:col-span-6 xl:col-span-7 flex-col justify-between p-12 bg-slate-950 text-white overflow-hidden">
                {/* Background Gradients & Glows */}
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(37,99,235,0.35),rgba(255,255,255,0))]" />
                <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/3 w-[400px] h-[400px] bg-blue-600/15 rounded-full blur-3xl" />

                {/* Brand Header */}
                <div className="relative z-10 flex items-center justify-between">
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
                            {name || 'Smart POS AI'}
                        </span>
                    </Link>

                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs font-medium text-blue-400">
                        <Sparkles className="size-3.5 text-blue-400 animate-pulse" />
                        <span>AI Demand Forecast Engine v2.4</span>
                    </div>
                </div>

                {/* Hero Showcase Content */}
                <div className="relative z-10 my-auto max-w-xl space-y-8 py-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="space-y-4"
                    >
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-blue-300">
                            <Zap className="size-3.5 text-amber-400" />
                            <span>Enterprise Commerce Architecture</span>
                        </div>
                        <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl leading-[1.15]">
                            Predict Sales.{' '}
                            <span className="bg-gradient-to-r from-blue-400 via-emerald-400 to-teal-300 bg-clip-text text-transparent">
                                Automate Stock.
                            </span>{' '}
                            Boost Revenue.
                        </h2>
                        <p className="text-slate-400 text-base leading-relaxed">
                            Experience next-generation checkout velocity, real-time multi-location inventory syncing, and automated machine-learning sales forecasting tailored for retail growth.
                        </p>
                    </motion.div>

                    {/* Floating Glassmorphism Metric Cards */}
                    <div className="grid grid-cols-2 gap-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.4, delay: 0.2 }}
                            className="p-5 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 shadow-2xl space-y-2"
                        >
                            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                                <span>Prediction Accuracy</span>
                                <TrendingUp className="size-4 text-emerald-400" />
                            </div>
                            <div className="text-3xl font-black text-white">98.4%</div>
                            <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                                <span>+4.2% vs last month</span>
                            </p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.4, delay: 0.3 }}
                            className="p-5 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 shadow-2xl space-y-2"
                        >
                            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                                <span>Checkout Speed</span>
                                <ShieldCheck className="size-4 text-blue-400" />
                            </div>
                            <div className="text-3xl font-black text-white">&lt; 0.8s</div>
                            <p className="text-[11px] text-blue-400 font-medium">
                                Offline queue resilience
                            </p>
                        </motion.div>
                    </div>
                </div>

                {/* Footer Quote */}
                <div className="relative z-10 flex items-center justify-between text-xs text-slate-500 pt-6 border-t border-slate-800/60">
                    <p>© {new Date().getFullYear()} Smart POS System. All rights reserved.</p>
                    <div className="flex items-center gap-4 text-slate-400">
                        <span>PCI-DSS Compliant</span>
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
                            <span className="text-xl font-bold">{name || 'Smart POS AI'}</span>
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
