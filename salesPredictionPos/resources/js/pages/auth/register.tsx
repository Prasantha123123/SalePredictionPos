import { useState } from 'react';
import { Form, Head } from '@inertiajs/react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import AuthSplitLayout from '@/layouts/auth/auth-split-layout';
import { login } from '@/routes';
import { store } from '@/routes/register';
import { ArrowLeft, ArrowRight, Building2, CheckCircle2, Shield, User } from 'lucide-react';

type Props = {
    passwordRules: string;
};

export default function Register({ passwordRules }: Props) {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [agreed, setAgreed] = useState(false);
    const [businessDetails, setBusinessDetails] = useState({
        businessName: '',
        businessType: 'retail',
        phone: '',
        address: '',
    });

    const triggerSuccessConfetti = () => {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
        });
    };

    return (
        <AuthSplitLayout
            title="Create business account"
            description="Set up your store and AI prediction workspace in under 2 minutes"
        >
            <Head title="Register Business - Smart POS AI" />

            {/* Stepper Progress Bar */}
            <div className="mb-6 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                    <span className={step === 1 ? 'text-blue-600 font-bold' : ''}>1. Business Info</span>
                    <span className={step === 2 ? 'text-blue-600 font-bold' : ''}>2. Owner Details</span>
                    <span className={step === 3 ? 'text-blue-600 font-bold' : ''}>3. Final Review</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden flex">
                    <div
                        className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                        style={{ width: `${(step / 3) * 100}%` }}
                    />
                </div>
            </div>

            <Form
                {...store.form()}
                resetOnSuccess={['password', 'password_confirmation']}
                onSubmit={() => triggerSuccessConfetti()}
                className="flex flex-col gap-5"
            >
                {({ processing, errors }) => (
                    <>
                        <AnimatePresence mode="wait">
                            {/* STEP 1: Business Information */}
                            {step === 1 && (
                                <motion.div
                                    key="step-1"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.25 }}
                                    className="space-y-4"
                                >
                                    <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-600 dark:text-blue-400 flex items-center gap-2">
                                        <Building2 className="size-4 shrink-0" />
                                        <span>Tell us about your retail outlet or chain.</span>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="business_name" className="text-xs font-semibold">
                                            Store / Business Name
                                        </Label>
                                        <Input
                                            id="business_name"
                                            type="text"
                                            placeholder="Apex Supermarket Ltd"
                                            value={businessDetails.businessName}
                                            onChange={(e) => setBusinessDetails({ ...businessDetails, businessName: e.target.value })}
                                            className="h-11 rounded-xl bg-muted/30"
                                            required
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="business_type" className="text-xs font-semibold">
                                            Industry Category
                                        </Label>
                                        <Select
                                            value={businessDetails.businessType}
                                            onValueChange={(val) => setBusinessDetails({ ...businessDetails, businessType: val })}
                                        >
                                            <SelectTrigger className="h-11 rounded-xl bg-muted/30">
                                                <SelectValue placeholder="Select business type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="retail">Supermarket & Grocery</SelectItem>
                                                <SelectItem value="fashion">Apparel & Fashion Boutique</SelectItem>
                                                <SelectItem value="electronics">Electronics & Tech Store</SelectItem>
                                                <SelectItem value="pharmacy">Pharmacy & Healthcare</SelectItem>
                                                <SelectItem value="restaurant">Restaurant & Bakery</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="phone" className="text-xs font-semibold">
                                            Business Contact Phone
                                        </Label>
                                        <Input
                                            id="phone"
                                            type="tel"
                                            placeholder="+94 77 123 4567"
                                            value={businessDetails.phone}
                                            onChange={(e) => setBusinessDetails({ ...businessDetails, phone: e.target.value })}
                                            className="h-11 rounded-xl bg-muted/30"
                                        />
                                    </div>

                                    <Button
                                        type="button"
                                        onClick={() => setStep(2)}
                                        className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold mt-2 gap-2"
                                    >
                                        <span>Continue to Owner Details</span>
                                        <ArrowRight className="size-4" />
                                    </Button>
                                </motion.div>
                            )}

                            {/* STEP 2: Owner Credentials */}
                            {step === 2 && (
                                <motion.div
                                    key="step-2"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.25 }}
                                    className="space-y-4"
                                >
                                    <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                                        <User className="size-4 shrink-0" />
                                        <span>Create owner login credentials (Super Admin).</span>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="name" className="text-xs font-semibold">
                                            Owner Full Name
                                        </Label>
                                        <Input
                                            id="name"
                                            type="text"
                                            required
                                            autoComplete="name"
                                            name="name"
                                            placeholder="Jane Doe"
                                            className="h-11 rounded-xl bg-muted/30"
                                        />
                                        <InputError message={errors.name} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="email" className="text-xs font-semibold">
                                            Owner Email Address
                                        </Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            required
                                            autoComplete="email"
                                            name="email"
                                            placeholder="jane@apexpos.com"
                                            className="h-11 rounded-xl bg-muted/30"
                                        />
                                        <InputError message={errors.email} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="password" className="text-xs font-semibold">
                                            Password
                                        </Label>
                                        <PasswordInput
                                            id="password"
                                            required
                                            autoComplete="new-password"
                                            name="password"
                                            placeholder="••••••••••••"
                                            passwordrules={passwordRules}
                                            className="h-11 rounded-xl bg-muted/30"
                                        />
                                        <InputError message={errors.password} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="password_confirmation" className="text-xs font-semibold">
                                            Confirm Password
                                        </Label>
                                        <PasswordInput
                                            id="password_confirmation"
                                            required
                                            autoComplete="new-password"
                                            name="password_confirmation"
                                            placeholder="••••••••••••"
                                            passwordrules={passwordRules}
                                            className="h-11 rounded-xl bg-muted/30"
                                        />
                                        <InputError message={errors.password_confirmation} />
                                    </div>

                                    <div className="flex items-center gap-3 pt-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setStep(1)}
                                            className="h-11 rounded-xl font-medium gap-1.5"
                                        >
                                            <ArrowLeft className="size-4" />
                                            <span>Back</span>
                                        </Button>
                                        <Button
                                            type="button"
                                            onClick={() => setStep(3)}
                                            className="flex-1 h-11 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold gap-2"
                                        >
                                            <span>Review & Confirm</span>
                                            <ArrowRight className="size-4" />
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                            {/* STEP 3: Review & Submit */}
                            {step === 3 && (
                                <motion.div
                                    key="step-3"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.25 }}
                                    className="space-y-5"
                                >
                                    <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-3">
                                        <div className="flex items-center justify-between border-b border-border/60 pb-2">
                                            <span className="text-xs font-medium text-muted-foreground">Store Profile</span>
                                            <span className="text-xs font-bold text-foreground">{businessDetails.businessName || 'My Retail Store'}</span>
                                        </div>
                                        <div className="flex items-center justify-between border-b border-border/60 pb-2">
                                            <span className="text-xs font-medium text-muted-foreground">Category</span>
                                            <span className="text-xs font-semibold capitalize text-foreground">{businessDetails.businessType}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-medium text-muted-foreground">Security Standard</span>
                                            <span className="text-xs font-semibold text-emerald-500 flex items-center gap-1">
                                                <Shield className="size-3.5" /> 256-Bit Encrypted
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-start space-x-3 p-3 rounded-xl bg-muted/20 border border-border/50">
                                        <Checkbox
                                            id="terms"
                                            checked={agreed}
                                            onCheckedChange={(c) => setAgreed(!!c)}
                                            className="mt-0.5"
                                        />
                                        <Label htmlFor="terms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                                            I agree to the <span className="text-blue-600 underline">Terms of Service</span> and <span className="text-blue-600 underline">Privacy Policy</span>. I confirm all details are accurate.
                                        </Label>
                                    </div>

                                    <div className="flex items-center gap-3 pt-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setStep(2)}
                                            className="h-11 rounded-xl font-medium gap-1.5"
                                        >
                                            <ArrowLeft className="size-4" />
                                            <span>Back</span>
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={processing || !agreed}
                                            className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold shadow-lg shadow-emerald-500/20 gap-2"
                                        >
                                            {processing ? (
                                                <div className="flex items-center gap-2">
                                                    <Spinner className="size-4 text-white" />
                                                    <span>Initializing Account...</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle2 className="size-4" />
                                                    <span>Complete Setup</span>
                                                </div>
                                            )}
                                        </Button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="pt-2 text-center text-xs text-muted-foreground">
                            Already operating a POS store?{' '}
                            <TextLink
                                href={login()}
                                tabIndex={6}
                                className="font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400"
                            >
                                Log in instead
                            </TextLink>
                        </div>
                    </>
                )}
            </Form>
        </AuthSplitLayout>
    );
}
