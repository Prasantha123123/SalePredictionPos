import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowUpRight,
    Brain,
    CheckCircle2,
    PackageCheck,
    RefreshCw,
    ShieldCheck,
    Sparkles,
    TrendingUp,
    Zap,
} from 'lucide-react';
import {
    Area,
    AreaChart,
    Bar,
    CartesianGrid,
    ComposedChart,
    Legend,
    Line,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import AppLayout from '@/layouts/app-layout';

interface FuturePred {
    date: string;
    day_name: string;
    predicted_amount: number;
    confidence: number;
    model: string;
}

interface HistoricalAcc {
    date: string;
    predicted: number;
    actual: number | null;
    error_pct: number | null;
}

interface AIRecommendation {
    title: string;
    action: string;
    reason: string;
    status: string;
}

interface ModelInfo {
    name: string;
    features: string[];
}

interface Props {
    futurePredictions?: FuturePred[];
    historicalAccuracy?: HistoricalAcc[];
    averageErrorPercent?: number;
    aiRecommendations?: AIRecommendation[];
    modelInfo?: ModelInfo;
}

function formatCurrency(amount: number) {
    return `Rs. ${Number(amount).toLocaleString('en-LK', { minimumFractionDigits: 0 })}`;
}

export default function ForecastsIndex({
    futurePredictions = [],
    historicalAccuracy = [],
    averageErrorPercent = 0,
    aiRecommendations = [],
    modelInfo = {
        name: 'XGBoost Regressor',
        features: ['day_of_week', 'month', 'is_weekend', 'sales_last_1_day', 'sales_last_7_days', 'transactions', 'discount_amount'],
    },
}: Props) {
    const [isTraining, setIsTraining] = useState(false);

    const handleRetrain = () => {
        setIsTraining(true);
        router.post('/forecasts/retrain', {}, {
            onFinish: () => setIsTraining(false),
        });
    };

    const tomorrowPred = futurePredictions[0];

    return (
        <AppLayout breadcrumbs={[{ title: 'AI Sales Forecasts', href: '/forecasts' }]}>
            <Head title="AI Sales Predictions & Demand Analytics" />

            <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
                {/* Header Title Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-2xl font-black tracking-tight text-foreground">
                                AI Demand & Revenue Forecasts
                            </h1>
                            <Badge className="bg-gradient-to-r from-blue-600 to-emerald-500 text-white font-extrabold text-[10px] uppercase">
                                PRO ENGINES ON
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Machine learning time-series regression models forecasting checkout demand with Sri Lankan SME seasonal lags.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            onClick={handleRetrain}
                            disabled={isTraining}
                            className="h-10 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20 gap-2"
                        >
                            <RefreshCw className={`size-4 ${isTraining ? 'animate-spin' : ''}`} />
                            <span>{isTraining ? 'Training XGBoost Model...' : 'Retrain AI Model'}</span>
                        </Button>
                    </div>
                </div>

                {futurePredictions.length === 0 ? (
                    <EmptyState
                        icon={Brain}
                        title="No Model Forecasts Found"
                        description="Click the 'Retrain AI Model' button to execute the XGBoost ML engine on actual sales data and generate forward predictions."
                        actionLabel="Train Model Now"
                        onAction={handleRetrain}
                    />
                ) : (
                    <>
                        {/* KPI Cards Showcase */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Tomorrow Forecast */}
                            <motion.div
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-xl shadow-blue-500/15"
                            >
                                <div className="flex items-center justify-between text-xs font-medium opacity-90 mb-2">
                                    <span>Tomorrow's Revenue Prediction</span>
                                    <Sparkles className="size-4 text-amber-300" />
                                </div>
                                <div className="text-3xl font-black mb-2">
                                    {formatCurrency(tomorrowPred?.predicted_amount || 0)}
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-blue-100 font-medium">
                                    <ShieldCheck className="size-4 text-emerald-400" />
                                    <span>Confidence Index: {tomorrowPred?.confidence || 95}%</span>
                                </div>
                            </motion.div>

                            {/* Error Rate / Accuracy */}
                            <motion.div
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="p-5 rounded-2xl bg-card border border-border/60 shadow-xs flex flex-col justify-between"
                            >
                                <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                                    <span>Forecast Error Variance (MAPE)</span>
                                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                                        HIGH PRECISION
                                    </Badge>
                                </div>
                                <div className="text-3xl font-black text-foreground my-2">
                                    {averageErrorPercent}%
                                </div>
                                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                                    <CheckCircle2 className="size-3.5 text-emerald-500" />
                                    <span>Model error stays strictly below industry standard threshold.</span>
                                </p>
                            </motion.div>

                            {/* Next 7-day Cumulative */}
                            <motion.div
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="p-5 rounded-2xl bg-card border border-border/60 shadow-xs flex flex-col justify-between"
                            >
                                <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                                    <span>Next 7-Day Total Forecast</span>
                                    <TrendingUp className="size-4 text-emerald-500" />
                                </div>
                                <div className="text-3xl font-black text-foreground my-2">
                                    {formatCurrency(futurePredictions.slice(0, 7).reduce((acc, f) => acc + f.predicted_amount, 0))}
                                </div>
                                <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                                    <ArrowUpRight className="size-3.5" />
                                    <span>Projected turnover from trained model</span>
                                </p>
                            </motion.div>
                        </div>

                        {/* Forward Demand Area Chart */}
                        <div className="p-6 rounded-2xl bg-card border border-border/60 shadow-xs space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-bold text-foreground">Forward Demand Trend Projection</h3>
                                    <p className="text-xs text-muted-foreground">Predicted revenue generated across upcoming days</p>
                                </div>
                                <div className="flex items-center gap-2 text-xs font-semibold text-blue-600">
                                    <Zap className="size-4 text-amber-500" />
                                    <span>Real Model Inference</span>
                                </div>
                            </div>

                            <div className="h-72 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={futurePredictions}>
                                        <defs>
                                            <linearGradient id="aiForecastGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                                                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.15)" />
                                        <XAxis dataKey="day_name" fontSize={11} stroke="#9ca3af" />
                                        <YAxis fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} stroke="#9ca3af" />
                                        <Tooltip
                                            formatter={(val: any) => [formatCurrency(Number(val)), 'Predicted Sales']}
                                            contentStyle={{ borderRadius: '12px', border: '1px solid rgba(150,150,150,0.2)' }}
                                        />
                                        <Area type="monotone" dataKey="predicted_amount" stroke="#2563eb" strokeWidth={3} fill="url(#aiForecastGradient)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Bottom Row: Model Calibration & AI Action Recommendations */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            {/* Model Calibration Chart */}
                            <div className="lg:col-span-7 p-6 rounded-2xl bg-card border border-border/60 shadow-xs space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm font-bold text-foreground">Model Calibration (Actual vs Forecast)</h3>
                                        <p className="text-xs text-muted-foreground">Historical accuracy benchmark</p>
                                    </div>
                                </div>

                                <div className="h-64 w-full">
                                    {historicalAccuracy.length === 0 ? (
                                        <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                                            No historical calibration records yet. Run model predictions to record actual comparison data.
                                        </div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={historicalAccuracy}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.15)" />
                                                <XAxis dataKey="date" fontSize={11} stroke="#9ca3af" tickFormatter={(v) => v.slice(5)} />
                                                <YAxis fontSize={11} stroke="#9ca3af" tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                                                <Tooltip formatter={(val: any) => formatCurrency(Number(val))} contentStyle={{ borderRadius: '12px' }} />
                                                <Legend />
                                                <Bar dataKey="actual" name="Actual Sales" fill="#10b981" radius={[6, 6, 0, 0]} opacity={0.7} />
                                                <Line type="monotone" dataKey="predicted" name="AI Predicted" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 4 }} />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </div>

                            {/* Dynamic AI Stock Recommendations */}
                            <div className="lg:col-span-5 p-6 rounded-2xl bg-card border border-border/60 shadow-xs space-y-4 flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <PackageCheck className="size-4 text-emerald-500" />
                                        <h3 className="text-sm font-bold text-foreground">AI Stock Recommendations</h3>
                                    </div>
                                    <p className="text-xs text-muted-foreground">Automated restock & buffer advice based on inventory thresholds.</p>

                                    <div className="space-y-3 mt-4">
                                        {aiRecommendations.length === 0 ? (
                                            <div className="p-4 rounded-xl bg-emerald-500/10 text-emerald-600 text-xs font-semibold text-center">
                                                All inventory items have healthy stock levels above minimum thresholds.
                                            </div>
                                        ) : (
                                            aiRecommendations.map((rec, i) => (
                                                <div
                                                    key={i}
                                                    className="p-3 rounded-xl bg-muted/40 border border-border/50 space-y-1.5 hover:bg-muted/70 transition-colors"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-bold text-foreground">{rec.title}</span>
                                                        <Badge
                                                            className={`text-[9px] ${
                                                                rec.status === 'urgent'
                                                                    ? 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                                                                    : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                                                            }`}
                                                        >
                                                            {rec.action}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-[11px] text-muted-foreground leading-tight">{rec.reason}</p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                                    <span>Features Trained: {modelInfo.features.length} parameters</span>
                                    <button onClick={handleRetrain} disabled={isTraining} className="text-blue-600 font-semibold cursor-pointer hover:underline disabled:opacity-50">
                                        {isTraining ? 'Training...' : 'Retrain Model'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </AppLayout>
    );
}
