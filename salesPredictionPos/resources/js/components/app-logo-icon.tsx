import { ShoppingBag } from 'lucide-react';
import type { SVGAttributes } from 'react';

export default function AppLogoIcon({ className, ...props }: SVGAttributes<SVGElement>) {
    // Clean up Tailwind's fill-current to keep the Lucide outline styling intact
    const cleanClassName = className
        ? className.replace(/fill-current/g, '').trim()
        : '';

    return (
        <ShoppingBag
            className={cleanClassName}
            {...(props as any)}
            strokeWidth={2}
        />
    );
}
