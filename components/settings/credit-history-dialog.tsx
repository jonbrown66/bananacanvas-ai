'use client';

import React, { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { useSupabase } from "@/components/providers/supabase-provider";
import { Database } from "@/lib/types";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CreditHistoryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onNavigate?: (sessionId: string) => void;
}

type Transaction = Database['public']['Tables']['credit_transactions']['Row'] & {
    metadata?: { project_id?: string } | null;
};

export function CreditHistoryDialog({ open, onOpenChange, onNavigate }: CreditHistoryDialogProps) {
    const { supabase, session } = useSupabase();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open && session?.user?.id) {
            const fetchHistory = async () => {
                setLoading(true);
                const { data, error } = await supabase
                    .from('credit_transactions')
                    .select('*')
                    .eq('user_id', session.user.id)
                    .order('created_at', { ascending: false });

                if (!error && data) {
                    setTransactions(data);
                }
                setLoading(false);
            };
            fetchHistory();
        }
    }, [open, session, supabase]);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleRowClick = (item: Transaction) => {
        if (item.metadata?.project_id && onNavigate) {
            onNavigate(item.metadata.project_id);
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Credit History</DialogTitle>
                    <DialogDescription>
                        Recent credit usage and transactions.
                    </DialogDescription>
                </DialogHeader>

                <div className="mt-4">
                    <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground mb-3 px-2">
                        <div className="col-span-4">Time</div>
                        <div className="col-span-5">Source</div>
                        <div className="col-span-3 text-right">Amount</div>
                    </div>

                    <div className="max-h-[300px] overflow-y-auto pr-2 space-y-1">
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="animate-spin text-muted-foreground" />
                            </div>
                        ) : transactions.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground text-sm">
                                No transactions found.
                            </div>
                        ) : (
                            transactions.map((item) => {
                                const isClickable = !!item.metadata?.project_id && !!onNavigate;
                                return (
                                    <div
                                        key={item.id}
                                        className={cn(
                                            "grid grid-cols-12 gap-2 text-sm py-3 px-2 rounded-lg transition-colors items-center border border-transparent",
                                            isClickable ? "hover:bg-muted cursor-pointer hover:border-border/50" : "hover:bg-muted/50"
                                        )}
                                        onClick={() => handleRowClick(item)}
                                    >
                                        <div className="col-span-4 text-muted-foreground text-xs">
                                            {formatDate(item.created_at)}
                                        </div>
                                        <div className="col-span-5 font-medium text-foreground flex items-center gap-2">
                                            {item.source}
                                            {isClickable && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">View</span>}
                                        </div>
                                        <div className={`col-span-3 text-right font-bold ${item.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                            {item.amount > 0 ? '+' : ''}{item.amount}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
