import { ShieldCheck } from "lucide-react";

export const TrustCheckLogo = ({ className }: { className?: string }) => (
    <div className={`flex items-center gap-2 ${className}`}>
        <ShieldCheck className="h-8 w-8 text-primary" />
        <span className="text-2xl font-bold font-headline text-foreground">
            TrustCheck
        </span>
    </div>
);
