"use client"

import * as React from "react"
import { Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

export function ThemeToggle() {
    const { setTheme, theme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return <div className="h-9" /> // Placeholder to prevent layout shift
    }

    return (
        <div className="flex flex-col gap-1">
            <Button
                variant={theme === "light" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setTheme("light")}
                className="w-full justify-start gap-2 px-2 font-normal"
            >
                <Sun className="h-4 w-4" />
                Light
            </Button>
            <Button
                variant={theme === "dark" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setTheme("dark")}
                className="w-full justify-start gap-2 px-2 font-normal"
            >
                <Moon className="h-4 w-4" />
                Dark
            </Button>
            <Button
                variant={theme === "system" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setTheme("system")}
                className="w-full justify-start gap-2 px-2 font-normal"
            >
                <Monitor className="h-4 w-4" />
                System
            </Button>
        </div>
    )
}
