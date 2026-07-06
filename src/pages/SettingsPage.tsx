import { useState } from 'react';
import { SectionHeader, Card, Button, Input, Select, Badge } from '../components/ui';

export function SettingsPage() {
  const [theme, setTheme] = useState('light');

  return (
    <div className="space-y-6">
      <SectionHeader title="Settings" subtitle="Configure application preferences, outlets, and local display options." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-bold text-slate-950">Application preferences</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Theme</label>
              <Select value={theme} onChange={(event) => setTheme(event.target.value)}>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </Select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Default outlet</label>
              <Input defaultValue="Colombo Central Branch" />
            </div>
            <Button>Save settings</Button>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-bold text-slate-950">System status</h2>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"><span>Backend API</span><Badge tone="green">Connected</Badge></div>
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"><span>Prediction service</span><Badge tone="blue">Demo mode</Badge></div>
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"><span>Audit logging</span><Badge tone="green">Enabled</Badge></div>
          </div>
        </Card>
      </div>
    </div>
  );
}