import { ReactNode } from 'react';

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    children?: ReactNode;
}

export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-4">
            <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground">{title}</h1>
                {subtitle && (
                    <p className="text-sm text-foreground/70 mt-1">
                        {subtitle}
                    </p>
                )}
            </div>
            {children && (
                <div className="flex items-center gap-2 shrink-0">
                    {children}
                </div>
            )}
        </div>
    );
}
