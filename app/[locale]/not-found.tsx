import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background p-4 text-center">
            <div className="rounded-full bg-muted p-4">
                <FileQuestion className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Page Not Found</h2>
            <p className="max-w-[500px] text-muted-foreground">
                Could not find the requested resource. It might have been moved or deleted.
            </p>
            <Button asChild>
                <Link href="/">
                    Return Home
                </Link>
            </Button>
        </div>
    );
}
