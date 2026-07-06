import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button, Card, Input } from '../components/ui';

type LoginForm = {
  email: string;
  password: string;
};

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    defaultValues: {
      email: 'manager@smartpos.lk',
      password: 'password',
    },
  });

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const onSubmit = handleSubmit(async (values) => {
    setError('');

    try {
      await login(values.email, values.password);
      navigate('/dashboard');
    } catch {
      setError('Unable to sign in. Please check your credentials.');
    }
  });

  return (
    <div className="grid min-h-screen place-items-center px-4 py-10">
      <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[2rem] bg-slate-950 p-8 text-white shadow-2xl shadow-slate-950/20 lg:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">Smart POS System</p>
          <h1 className="mt-4 max-w-xl text-4xl font-black tracking-tight md:text-5xl">Sales intelligence and point-of-sale operations in one unified interface.</h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
            This frontend demonstrates a thesis-ready architecture for restaurant and retail operations, integrating billing, inventory, reporting, and sales prediction into a modern React application.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              ['Secure Login', 'Sanctum-ready authentication flow'],
              ['Operational Modules', 'Billing, inventory, reports, and analytics'],
              ['Prediction Views', 'Daily, weekly, and monthly forecasts'],
              ['Responsive UI', 'Desktop and mobile optimized layouts'],
            ].map(([title, description]) => (
              <Card key={title} className="border-white/10 bg-white/5 text-white">
                <p className="font-semibold">{title}</p>
                <p className="mt-1 text-sm text-slate-300">{description}</p>
              </Card>
            ))}
          </div>
        </section>

        <Card className="flex flex-col justify-center bg-white p-8 shadow-xl shadow-slate-950/10 lg:p-10">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">Sign in</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Access the Smart POS dashboard</h2>
            <p className="mt-2 text-sm text-slate-500">Use a demo account to explore the frontend architecture.</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
              <Input type="email" placeholder="manager@smartpos.lk" {...register('email', { required: 'Email is required' })} />
              {errors.email ? <p className="mt-2 text-sm text-rose-600">{errors.email.message}</p> : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Password</label>
              <Input type="password" placeholder="••••••••" {...register('password', { required: 'Password is required' })} />
              {errors.password ? <p className="mt-2 text-sm text-rose-600">{errors.password.message}</p> : null}
            </div>

            {error ? <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Sign in to dashboard'}
            </Button>

            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Demo roles are inferred from email: use <span className="font-semibold">admin@smartpos.lk</span>, <span className="font-semibold">manager@smartpos.lk</span>, or <span className="font-semibold">cashier@smartpos.lk</span>.
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}