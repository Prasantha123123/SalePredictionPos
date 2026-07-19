import { Form, Head } from '@inertiajs/react';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import AuthSplitLayout from '@/layouts/auth/auth-split-layout';
import { login } from '@/routes';
import { email } from '@/routes/password';
import { ArrowLeft, KeyRound, Mail } from 'lucide-react';
import { motion } from 'framer-motion';

type Props = {
    status?: string;
};

export default function ForgotPassword({ status }: Props) {
    return (
        <AuthSplitLayout
            title="Reset your password"
            description="Enter your account email and we'll send a secure password reset link."
        >
            <Head title="Forgot Password - Smart POS AI" />

            {status && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-start gap-2.5"
                >
                    <Mail className="size-4 shrink-0 text-emerald-500 mt-0.5" />
                    <span>{status}</span>
                </motion.div>
            )}

            <Form {...email.form()} className="flex flex-col gap-5">
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="email" className="text-xs font-semibold">
                                    Registered Work Email
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="email"
                                        type="email"
                                        name="email"
                                        required
                                        autoFocus
                                        placeholder="admin@smartpos.lk"
                                        className="pl-10 h-11 bg-muted/30 focus:bg-background rounded-xl"
                                    />
                                    <Mail className="absolute left-3.5 top-3.5 size-4 text-muted-foreground pointer-events-none" />
                                </div>
                                <InputError message={errors.email} />
                            </div>

                            <Button
                                type="submit"
                                className="mt-2 h-11 w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/20 gap-2"
                                disabled={processing}
                            >
                                {processing ? (
                                    <div className="flex items-center gap-2">
                                        <Spinner className="size-4 text-white" />
                                        <span>Sending Reset Link...</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <KeyRound className="size-4" />
                                        <span>Send Instructions</span>
                                    </div>
                                )}
                            </Button>
                        </div>

                        <div className="pt-2 text-center text-xs text-muted-foreground">
                            <TextLink
                                href={login()}
                                className="inline-flex items-center gap-1.5 font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400"
                            >
                                <ArrowLeft className="size-3.5" />
                                <span>Return to sign in</span>
                            </TextLink>
                        </div>
                    </>
                )}
            </Form>
        </AuthSplitLayout>
    );
}
