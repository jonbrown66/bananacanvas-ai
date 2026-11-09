"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { m as motion, AnimatePresence } from "framer-motion"

export function LandingThemeToggle() {
    const { setTheme, resolvedTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <button
                type="button"
                suppressHydrationWarning
                className="w-9 h-9 p-2 rounded-full hover:bg-muted text-muted-foreground flex items-center justify-center opacity-0 pointer-events-none"
                aria-label="Toggle theme"
            >
                <Sun size={18} />
            </button>
        )
    }

    const isDark = resolvedTheme === "dark"

    return (
        <button
            type="button"
            suppressHydrationWarning
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="w-9 h-9 p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground active:scale-90 flex items-center justify-center shrink-0"
            aria-label="Toggle theme"
        >
            <AnimatePresence mode="wait" initial={false}>
                <motion.div
                    key={isDark ? "dark" : "light"}
                    initial={{ rotate: -60, scale: 0.6, opacity: 0 }}
                    animate={{ rotate: 0, scale: 1, opacity: 1 }}
                    exit={{ rotate: 60, scale: 0.6, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                >
                    {isDark ? <Sun size={20} /> : <Moon size={20} />}
                </motion.div>
            </AnimatePresence>
        </button>
    )
}
