import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
    message: string;
    description?: string;
    icon?: ReactNode;
    action?: ReactNode;
    className?: string;
}

export function EmptyState({ message, description, icon, action, className }: EmptyStateProps) {
    return (
        <div className={cn("flex flex-col items-center justify-center p-8 text-center", className)}>
            {icon && <div className="text-muted-foreground/50 mb-3">{icon}</div>}
            <h3 className="text-sm font-semibold text-foreground">{message}</h3>
            {description && <p className="text-xs text-muted-foreground mt-1 max-w-sm">{description}</p>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}
