'use client';

import { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useRouter } from "@/i18n/routing";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const router = useRouter();

    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background p-4 text-center">
            <div className="rounded-full bg-destructive/10 p-4">
                <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Something went wrong!</h2>
            <p className="max-w-[500px] text-muted-foreground">
                We apologize for the inconvenience. An unexpected error has occurred.
            </p>
            <div className="flex gap-2">
                <Button onClick={() => router.push('/')} variant="outline">
                    Go Home
                </Button>
                <Button onClick={() => reset()}>
                    Try again
                </Button>
            </div>
        </div>
    );
}
