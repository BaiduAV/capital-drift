import { ReactNode } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "./EmptyState";
import { cn } from "@/lib/utils";

interface Column<T> {
    key: string;
    header: ReactNode;
    align?: 'left' | 'center' | 'right';
    className?: string;
    render: (item: T) => ReactNode;
}

interface DataTableProps<T> {
    data: T[];
    columns: Column<T>[];
    keyExtractor: (item: T) => string;
    onRowClick?: (item: T) => void;
    emptyMessage?: string;
    emptyAction?: ReactNode;
    className?: string;
}

export function DataTable<T>({
    data,
    columns,
    keyExtractor,
    onRowClick,
    emptyMessage = "No data available",
    emptyAction,
    className
}: DataTableProps<T>) {

    if (data.length === 0) {
        return <EmptyState message={emptyMessage} action={emptyAction} className={className} />;
    }

    return (
        <div className={cn("overflow-x-auto", className)}>
            <Table>
                <TableHeader className="bg-muted/30 sticky top-0 z-10">
                    <TableRow className="hover:bg-transparent">
                        {columns.map((col) => (
                            <TableHead
                                key={col.key}
                                className={cn(
                                    "text-xs font-semibold h-8",
                                    col.align === 'right' ? "text-right" : col.align === 'center' ? "text-center" : "text-left",
                                    col.className
                                )}
                            >
                                {col.header}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((item) => (
                        <TableRow
                            key={keyExtractor(item)}
                            onClick={() => onRowClick?.(item)}
                            className={cn(
                                "border-border/50 transition-colors",
                                onRowClick ? "cursor-pointer hover:bg-muted/40" : ""
                            )}
                        >
                            {columns.map((col) => (
                                <TableCell
                                    key={col.key}
                                    className={cn(
                                        "py-2.5",
                                        col.align === 'right' ? "text-right" : col.align === 'center' ? "text-center" : "text-left",
                                        col.className
                                    )}
                                >
                                    {col.render(item)}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
