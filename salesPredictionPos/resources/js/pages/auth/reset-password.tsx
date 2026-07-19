import { useState } from 'react';
import { Form, Head } from '@inertiajs/react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import AuthSplitLayout from '@/layouts/auth/auth-split-layout';
import { update } from '@/routes/password';
import { Check, Lock, ShieldCheck } from 'lucide-react';

type Props = {
    token: string;
    email: string;
};

export default function ResetPassword({ token, email }: Props) {
    const [password, setPassword] = useState('');

    const getStrength = (pass: string) => {
        let score = 0;
        if (pass.length >= 8) score++;
        if (/[A-Z]/.test(pass)) score++;
        if (/[0-9]/.test(pass)) score++;
        if (/[^A-Za-z0-9]/.test(pass)) score++;
        return score;
    };

    const strength = getStrength(password);
    const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong'];
    const strengthColors = ['bg-red-500', 'bg-amber-500', 'bg-blue-500', 'bg-emerald-500'];

    return (
        <AuthSplitLayout
            title="Set new password"
            description="Create a robust new password to secure your POS admin account."
        >
            <Head title="Reset Password - Smart POS AI" />

            <Form
                {...update.form()}
                transform={(data) => ({ ...data, token, email })}
                resetOnSuccess={['password', 'password_confirmation']}
                className="flex flex-col gap-5"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="email" className="text-xs font-semibold">
                                    Account Email
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    value={email}
                                    disabled
                                    className="h-11 bg-muted/50 rounded-xl cursor-not-allowed text-muted-foreground"
                                />
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password" className="text-xs font-semibold">
                                    New Password
                                </Label>
                                <div className="relative">
                                    <PasswordInput
                                        id="password"
                                        name="password"
                                        required
                                        autoFocus
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••••••"
                                        className="pl-10 h-11 bg-muted/30 focus:bg-background rounded-xl"
                                    />
                                    <Lock className="absolute left-3.5 top-3.5 size-4 text-muted-foreground pointer-events-none z-10" />
                                </div>
                                <InputError message={errors.password} />

                                {/* Password Strength Meter */}
                                {password && (
                                    <div className="space-y-1.5 pt-1">
                                        <div className="flex items-center justify-between text-[11px]">
                                            <span className="text-muted-foreground font-medium">Strength</span>
                                            <span className="font-bold text-foreground">
                                                {strengthLabels[strength - 1] || 'Too Short'}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-4 gap-1.5 h-1.5">
                                            {[0, 1, 2, 3].map((idx) => (
                                                <div
                                                    key={idx}
                                                    className={`h-full rounded-full transition-all duration-300 ${
                                                        idx < strength ? strengthColors[strength - 1] : 'bg-muted'
                                                    }`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password_confirmation" className="text-xs font-semibold">
                                    Confirm New Password
                                </Label>
                                <div className="relative">
                                    <PasswordInput
                                        id="password_confirmation"
                                        name="password_confirmation"
                                        required
                                        placeholder="••••••••••••"
                                        className="pl-10 h-11 bg-muted/30 focus:bg-background rounded-xl"
                                    />
                                    <Lock className="absolute left-3.5 top-3.5 size-4 text-muted-foreground pointer-events-none z-10" />
                                </div>
                                <InputError message={errors.password_confirmation} />
                            </div>

                            <Button
                                type="submit"
                                className="mt-2 h-11 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/20 gap-2"
                                disabled={processing}
                            >
                                {processing ? (
                                    <div className="flex items-center gap-2">
                                        <Spinner className="size-4 text-white" />
                                        <span>Updating Password...</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <ShieldCheck className="size-4" />
                                        <span>Update Password & Log In</span>
                                    </div>
                                )}
                            </Button>
                        </div>
                    </>
                )}
            </Form>
        </AuthSplitLayout>
    );
}
