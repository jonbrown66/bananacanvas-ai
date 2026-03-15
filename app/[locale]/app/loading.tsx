import { Loader2 } from "lucide-react";

export default function AppLoading() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="h-14 border-b border-border bg-background/70 backdrop-blur" />
      <div className="flex">
        <div className="hidden md:block w-64 border-r border-border min-h-[calc(100vh-56px)] bg-muted/30" />
        <div className="flex-1 min-h-[calc(100vh-56px)] flex items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading workspace...</span>
          </div>
        </div>
      </div>
    </div>
  );
}
