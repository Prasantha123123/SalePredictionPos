import { Database, FileText, LineChart, Sparkles } from 'lucide-react';
import { Card, SectionHeader, Badge, StatCard } from '../components/ui';

export function ModulePage({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-6">
      <SectionHeader title={title} subtitle={description} />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Records" value="128" description="Latest synced demo records." />
        <StatCard label="Last Sync" value="2 mins ago" description="API-ready integration point." />
        <StatCard label="Status" value="Active" description="Module is available in the navigation." />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <div>
              <h2 className="text-lg font-bold text-slate-950">Frontend placeholder</h2>
              <p className="text-sm text-slate-500">Ready for backend integration and module-specific forms.</p>
            </div>
          </div>

          <div className="mt-5 space-y-3 text-sm text-slate-600">
            <p>This page is designed as a module scaffold for the thesis implementation.</p>
            <p>It supports CRUD views, forms, tables, and summary cards using the same reusable React architecture.</p>
            <p>Backend endpoints can be attached through the shared Axios client.</p>
          </div>
        </Card>

        <Card>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"><span className="flex items-center gap-2"><Database className="h-4 w-4 text-sky-500" />Data layer</span><Badge tone="blue">Ready</Badge></div>
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"><span className="flex items-center gap-2"><LineChart className="h-4 w-4 text-emerald-500" />Analytics support</span><Badge tone="green">Ready</Badge></div>
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"><span className="flex items-center gap-2"><FileText className="h-4 w-4 text-amber-500" />Reporting hooks</span><Badge tone="amber">Ready</Badge></div>
          </div>
        </Card>
      </div>
    </div>
  );
}