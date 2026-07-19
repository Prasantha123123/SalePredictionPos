export default function AuthLayout({
    children,
}: {
    title?: string;
    description?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen w-full bg-background font-sans antialiased">
            {children}
        </div>
    );
}
