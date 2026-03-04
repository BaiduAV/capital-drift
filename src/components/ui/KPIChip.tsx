import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface KPIChipProps {
    label: string;
    value: ReactNode;
    icon?: ReactNode;
    trend?: 'up' | 'down' | 'neutral';
    className?: string;
}

export function KPIChip({ label, value, icon, trend, className }: KPIChipProps) {
    return (
        <div className={cn(
            "inline-flex items-center gap-1.5 bg-muted/40 border border-border/50 rounded-md px-2 py-1",
            className
        )}>
            {icon && <span className="text-muted-foreground shrink-0">{icon}</span>}
            <div className="flex flex-col">
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold leading-tight">
                    {label}
                </span>
                <span className={cn(
                    "text-xs font-mono font-bold leading-tight",
                    trend === 'up' ? "text-[hsl(var(--terminal-green))]" :
                        trend === 'down' ? "text-[hsl(var(--terminal-red))]" :
                            "text-foreground"
                )}>
                    {value}
                </span>
            </div>
        </div>
    );
}
