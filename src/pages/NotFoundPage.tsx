import { Button, Card } from '../components/ui';

export function NotFoundPage() {
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <Card className="max-w-xl text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">404</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">Page not found</h1>
        <p className="mt-3 text-sm text-slate-500">The requested route does not exist in the Smart POS frontend.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={() => window.location.assign('/dashboard')}>Go to dashboard</Button>
          <Button variant="secondary" onClick={() => window.location.assign('/login')}>Login</Button>
        </div>
      </Card>
    </div>
  );
}