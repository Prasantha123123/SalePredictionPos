import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, ArrowUpRight, Activity } from 'lucide-react';
import { Card, SectionHeader, StatCard, Badge, Button } from '../components/ui';
import { demoStats, inventoryWarnings, recentSales, salesTrend } from '../lib/navigation';

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Dashboard"
        subtitle="Operational overview for sales, inventory, and prediction-driven decision making."
        action={<Button><ArrowUpRight className="h-4 w-4" />Open reports</Button>}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {demoStats.map((stat) => (
          <div key={stat.label} className={`rounded-[1.75rem] bg-gradient-to-br ${stat.accent} p-[1px] shadow-lg shadow-slate-950/5`}>
            <div className="rounded-[1.70rem] bg-white p-5">
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-950">Sales trend and forecast</h2>
              <p className="text-sm text-slate-500">Historical sales versus predicted demand.</p>
            </div>
            <Badge tone="green">AI enabled</Badge>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesTrend}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f172a" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip />
                <Area type="monotone" dataKey="sales" stroke="#0f172a" fill="url(#salesGradient)" strokeWidth={3} />
                <Area type="monotone" dataKey="forecast" stroke="#0ea5e9" fillOpacity={0} strokeWidth={2} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <div className="mb-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <div>
                <h2 className="font-bold text-slate-950">Low stock alerts</h2>
                <p className="text-sm text-slate-500">Items requiring attention.</p>
              </div>
            </div>
            <div className="space-y-3">
              {inventoryWarnings.map((item) => (
                <div key={item.product} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <div>
                    <p className="font-semibold text-slate-950">{item.product}</p>
                    <p className="text-xs text-slate-500">Reorder level {item.reorderLevel}</p>
                  </div>
                  <Badge tone={item.stock <= 6 ? 'red' : 'amber'}>{item.stock} left</Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="mb-4 flex items-center gap-3">
              <Activity className="h-5 w-5 text-sky-500" />
              <div>
                <h2 className="font-bold text-slate-950">Recent activity</h2>
                <p className="text-sm text-slate-500">Latest sale transactions.</p>
              </div>
            </div>
            <div className="space-y-3">
              {recentSales.map((sale) => (
                <div key={sale.invoice} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                  <div>
                    <p className="font-semibold text-slate-950">{sale.invoice}</p>
                    <p className="text-xs text-slate-500">Cashier: {sale.cashier}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-950">{sale.amount}</p>
                    <Badge tone={sale.status === 'Paid' ? 'green' : 'amber'}>{sale.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Billing Queue" value="08 orders" description="Pending orders waiting for checkout." />
        <StatCard label="Daily Orders" value="146" description="Completed transactions in the current day." />
        <StatCard label="Audit Log Events" value="1,284" description="Tracked system actions and changes." />
      </div>
    </div>
  );
}