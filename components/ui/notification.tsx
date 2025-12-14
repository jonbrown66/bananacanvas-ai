'use client';

import React, { useEffect } from 'react';
import { X, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NotificationProps {
    message: string;
    isVisible: boolean;
    onClose: () => void;
    duration?: number;
}

export const Notification: React.FC<NotificationProps> = ({
    message,
    isVisible,
    onClose,
    duration = 3000
}) => {
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [isVisible, duration, onClose]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 50, x: "-50%" }}
                    animate={{ opacity: 1, y: 0, x: "-50%" }}
                    exit={{ opacity: 0, y: 20, x: "-50%" }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="fixed bottom-6 left-1/2 z-50 min-w-[320px] max-w-md"
                >
                    <div className="bg-card text-card-foreground border border-border shadow-2xl rounded-xl px-6 py-4 flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-brand-DEFAULT/10 flex items-center justify-center flex-shrink-0">
                            <Info size={18} className="text-brand-DEFAULT" />
                        </div>
                        <p className="text-sm font-medium flex-1">{message}</p>
                        <button
                            onClick={onClose}
                            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
