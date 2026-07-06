import { Menu, LogOut, Search, Shield, Sparkles, UserCircle2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sidebarGroups } from '../lib/navigation';
import { Badge, Button, Card } from './ui';

export function DashboardLayout() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const availableGroups = useMemo(() => sidebarGroups.map((group) => ({
    ...group,
    items: group.items.filter((item) => user ? item.roles.includes(user.role) : false),
  })).filter((group) => group.items.length > 0), [user]);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f6f8fc_0%,#eef3f9_100%)] text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className={`fixed inset-y-0 z-30 w-72 border-r border-slate-200 bg-white/95 p-4 shadow-xl shadow-slate-950/5 backdrop-blur xl:static xl:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} transform transition-transform duration-300 xl:block`}>
          <div className="mb-6 flex items-center gap-3 rounded-3xl bg-slate-950 px-4 py-4 text-white">
            <div className="rounded-2xl bg-white/10 p-2">
              <Sparkles className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Smart POS</p>
              <p className="text-xs text-slate-300">Sales Prediction Platform</p>
            </div>
          </div>

          <div className="space-y-6 overflow-y-auto pb-8 pr-1">
            {availableGroups.map((group) => (
              <div key={group.title}>
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{group.title}</p>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;

                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) => `flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition ${isActive ? 'bg-slate-950 text-white shadow-lg shadow-slate-950/10' : 'text-slate-600 hover:bg-slate-100'}`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {mobileOpen ? <button aria-label="Close sidebar" className="fixed inset-0 z-20 bg-slate-950/40 xl:hidden" onClick={() => setMobileOpen(false)} /> : null}

        <main className="flex min-h-screen flex-1 flex-col xl:ml-0">
          <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/85 backdrop-blur">
            <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3">
                <Button variant="secondary" className="xl:hidden" onClick={() => setMobileOpen(true)}>
                  <Menu className="h-4 w-4" />
                </Button>
                <div className="hidden items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-500 lg:flex">
                  <Search className="h-4 w-4" />
                  Quick search is ready for API integration
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Badge tone="blue">
                  <Shield className="mr-1 h-3 w-3" />
                  {user?.role ?? 'guest'}
                </Badge>
                <Card className="flex items-center gap-3 px-4 py-3">
                  <div className="rounded-full bg-slate-100 p-2 text-slate-600">
                    <UserCircle2 className="h-5 w-5" />
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-sm font-semibold text-slate-950">{user?.name}</p>
                    <p className="text-xs text-slate-500">{user?.email}</p>
                  </div>
                  <Button variant="ghost" className="px-3" onClick={logout}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </Card>
              </div>
            </div>
          </header>

          <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}