import { useState, useEffect } from 'react';
import { Form, Head } from '@inertiajs/react';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import AuthSplitLayout from '@/layouts/auth/auth-split-layout';
import { logout } from '@/routes';
import { send } from '@/routes/verification';
import { MailCheck, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

type Props = {
    status?: string;
};

export default function VerifyEmail({ status }: Props) {
    const [timer, setTimer] = useState(0);

    useEffect(() => {
        if (timer > 0) {
            const interval = setInterval(() => setTimer((t) => t - 1), 1000);
            return () => clearInterval(interval);
        }
    }, [timer]);

    return (
        <AuthSplitLayout
            title="Verify your email"
            description="We've sent a verification link to your email address. Please click the link to activate your store."
        >
            <Head title="Verify Email - Smart POS AI" />

            <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-center space-y-3">
                <div className="size-12 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <MailCheck className="size-6" />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
                    Check your inbox and spam folder. If you didn't receive the email, click below to request a new link.
                </p>
            </div>

            {status === 'verification-link-sent' && (
                <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-600 dark:text-emerald-400 text-center"
                >
                    A new verification link has been sent to your email address.
                </motion.div>
            )}

            <Form
                {...send.form()}
                onSubmit={() => setTimer(60)}
                className="flex flex-col gap-4"
            >
                {({ processing }) => (
                    <>
                        <Button
                            type="submit"
                            disabled={processing || timer > 0}
                            className="h-11 w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/20 gap-2"
                        >
                            {processing ? (
                                <div className="flex items-center gap-2">
                                    <Spinner className="size-4 text-white" />
                                    <span>Resending Email...</span>
                                </div>
                            ) : timer > 0 ? (
                                <span>Resend Link in {timer}s</span>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <RefreshCw className="size-4" />
                                    <span>Resend Verification Email</span>
                                </div>
                            )}
                        </Button>

                        <div className="pt-2 text-center text-xs text-muted-foreground">
                            Need to use a different account?{' '}
                            <TextLink
                                href={logout()}
                                method="post"
                                as="button"
                                className="font-semibold text-destructive hover:underline"
                            >
                                Log out
                            </TextLink>
                        </div>
                    </>
                )}
            </Form>
        </AuthSplitLayout>
    );
}
