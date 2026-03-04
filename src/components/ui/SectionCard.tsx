import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface SectionCardProps {
    title: ReactNode;
    action?: ReactNode;
    children: ReactNode;
    className?: string;
    contentClassName?: string;
    noPadding?: boolean;
}

export function SectionCard({ title, action, children, className, contentClassName, noPadding }: SectionCardProps) {
    return (
        <Card className={cn("terminal-card flex flex-col overflow-hidden", className)}>
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-border/50 shrink-0 bg-muted/20">
                <CardTitle className="text-sm font-sans font-semibold tracking-tight">
                    {title}
                </CardTitle>
                {action && <div>{action}</div>}
            </CardHeader>
            <CardContent className={cn(
                "flex-1 overflow-auto scrollbar-terminal",
                noPadding ? "p-0" : "p-4",
                contentClassName
            )}>
                {children}
            </CardContent>
        </Card>
    );
}
