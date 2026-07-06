import { useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge, Card, SectionHeader, StatCard, Button } from '../components/ui';
import { forecastSeries, predictionMetrics, type ForecastPoint } from '../lib/navigation';

type Horizon = 'daily' | 'weekly' | 'monthly';

export function PredictionPage() {
  const [horizon, setHorizon] = useState<Horizon>('weekly');
  const data: ForecastPoint[] = [...forecastSeries[horizon]];
  const metrics = predictionMetrics[horizon];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Sales Prediction"
        subtitle="Machine learning-based forecasting for daily, weekly, and monthly horizons."
        action={<Badge tone="green">Best model: {metrics.model}</Badge>}
      />

      <div className="flex flex-wrap gap-3">
        {(['daily', 'weekly', 'monthly'] as Horizon[]).map((item) => (
          <Button key={item} variant={horizon === item ? 'primary' : 'secondary'} onClick={() => setHorizon(item)}>
            {item.charAt(0).toUpperCase() + item.slice(1)}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Selected Model" value={metrics.model} description="Chosen using RMSE and MAE." />
        <StatCard label="RMSE" value={metrics.rmse} description="Root mean squared error." />
        <StatCard label="MAE" value={metrics.mae} description="Mean absolute error." />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-950">Forecast curve</h2>
            <p className="text-sm text-slate-500">Actual versus predicted sales for the selected horizon.</p>
          </div>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="forecastFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip />
                <Area type="monotone" dataKey="actual" stroke="#0f172a" strokeWidth={3} fillOpacity={0} />
                <Area type="monotone" dataKey="predicted" stroke="#14b8a6" strokeWidth={3} fill="url(#forecastFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-bold text-slate-950">Prediction workflow</h2>
          <ol className="mt-4 space-y-3 text-sm text-slate-600">
            <li>1. Historical sales are exported from Laravel.</li>
            <li>2. Flask preprocesses the time-series dataset.</li>
            <li>3. Prophet and XGBoost are trained and evaluated.</li>
            <li>4. The best model is selected using RMSE and MAE.</li>
            <li>5. Forecast results are returned to the frontend and visualised.</li>
          </ol>
          <div className="mt-6 rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">
            Recommended use case: review forecasts before stock replenishment and promotional planning.
          </div>
        </Card>
      </div>
    </div>
  );
}