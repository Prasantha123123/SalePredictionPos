import { Card, SectionHeader, Input, Button } from '../components/ui';

export function ProfilePage() {
  return (
    <div className="space-y-6">
      <SectionHeader title="Profile" subtitle="Manage the signed-in user profile and display information." />

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card>
          <h2 className="text-lg font-bold text-slate-950">Personal details</h2>
          <div className="mt-4 space-y-4">
            <Input defaultValue="Smart POS User" />
            <Input defaultValue="user@smartpos.lk" />
            <Input defaultValue="Colombo, Sri Lanka" />
            <Button>Update profile</Button>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-bold text-slate-950">Password change</h2>
          <div className="mt-4 space-y-4">
            <Input type="password" placeholder="Current password" />
            <Input type="password" placeholder="New password" />
            <Input type="password" placeholder="Confirm password" />
            <Button variant="secondary">Change password</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}