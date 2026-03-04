import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface StatCardProps {
    label: string;
    value: ReactNode;
    sub?: ReactNode;
    trend?: 'up' | 'down' | 'neutral';
    className?: string;
}

export function StatCard({ label, value, sub, trend, className }: StatCardProps) {
    return (
        <Card className={cn("terminal-card overflow-hidden", className)}>
            <CardContent className="p-3 sm:p-4">
                <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1 truncate">
                    {label}
                </div>
                <div className="text-sm sm:text-lg font-mono font-bold text-foreground truncate">
                    {value}
                </div>
                {sub && (
                    <div className={cn(
                        "text-xs font-mono mt-1",
                        trend === 'up' ? "text-[hsl(var(--terminal-green))]" :
                            trend === 'down' ? "text-[hsl(var(--terminal-red))]" :
                                "text-muted-foreground"
                    )}>
                        {trend === 'up' && "▲ "}
                        {trend === 'down' && "▼ "}
                        {sub}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
