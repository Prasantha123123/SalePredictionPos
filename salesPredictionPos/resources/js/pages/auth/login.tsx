import { Form, Head } from '@inertiajs/react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import AuthSplitLayout from '@/layouts/auth/auth-split-layout';
import { store } from '@/routes/login';
import { request } from '@/routes/password';
import { motion } from 'framer-motion';
import { Lock, Mail } from 'lucide-react';

type Props = {
    status?: string;
    canResetPassword: boolean;
};

export default function Login({ status, canResetPassword }: Props) {
    return (
        <AuthSplitLayout
            title="Welcome back"
            description="Sign in to your Smart POS AI management dashboard"
        >
            <Head title="Log in - Smart POS AI" />

            {status && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-600 dark:text-emerald-400 text-center"
                >
                    {status}
                </motion.div>
            )}

            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                className="flex flex-col gap-5"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-4">
                            {/* Email Input */}
                            <div className="grid gap-2">
                                <Label htmlFor="email" className="text-xs font-semibold text-foreground/80">
                                    Work Email Address
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="email"
                                        type="email"
                                        name="email"
                                        required
                                        autoFocus
                                        tabIndex={1}
                                        autoComplete="email"
                                        placeholder="admin@smartpos.lk"
                                        className="pl-10 h-11 bg-muted/30 focus:bg-background rounded-xl transition-all"
                                    />
                                    <Mail className="absolute left-3.5 top-3.5 size-4 text-muted-foreground pointer-events-none" />
                                </div>
                                <InputError message={errors.email} />
                            </div>

                            {/* Password Input */}
                            <div className="grid gap-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password" className="text-xs font-semibold text-foreground/80">
                                        Password
                                    </Label>
                                    {canResetPassword && (
                                        <TextLink
                                            href={request()}
                                            className="text-xs font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
                                            tabIndex={5}
                                        >
                                            Forgot password?
                                        </TextLink>
                                    )}
                                </div>
                                <div className="relative">
                                    <PasswordInput
                                        id="password"
                                        name="password"
                                        required
                                        tabIndex={2}
                                        autoComplete="current-password"
                                        placeholder="••••••••••••"
                                        className="pl-10 h-11 bg-muted/30 focus:bg-background rounded-xl transition-all"
                                    />
                                    <Lock className="absolute left-3.5 top-3.5 size-4 text-muted-foreground pointer-events-none z-10" />
                                </div>
                                <InputError message={errors.password} />
                            </div>

                            {/* Remember Me */}
                            <div className="flex items-center space-x-2.5 pt-1">
                                <Checkbox
                                    id="remember"
                                    name="remember"
                                    tabIndex={3}
                                    className="rounded-md border-muted-foreground/30 data-[state=checked]:bg-blue-600"
                                />
                                <Label htmlFor="remember" className="text-xs text-muted-foreground font-normal cursor-pointer select-none">
                                    Keep me signed in on this device
                                </Label>
                            </div>

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                className="mt-2 h-11 w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/20 transition-all hover:shadow-blue-500/30 active:scale-[0.99]"
                                tabIndex={4}
                                disabled={processing}
                            >
                                {processing ? (
                                    <div className="flex items-center gap-2">
                                        <Spinner className="size-4 text-white" />
                                        <span>Authenticating...</span>
                                    </div>
                                ) : (
                                    <span>Sign in to Dashboard</span>
                                )}
                            </Button>
                        </div>
                    </>
                )}
            </Form>
        </AuthSplitLayout>
    );
}
