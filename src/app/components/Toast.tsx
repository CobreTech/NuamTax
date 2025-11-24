"use client";

import { useEffect, useState } from "react";
import Icons from "../utils/icons";

type ToastType = "success" | "error" | "info" | "warning";

interface ToastProps {
    message: string;
    type?: ToastType;
    onClose: () => void;
    duration?: number;
}

export default function Toast({ message, type = "info", onClose, duration = 4000 }: ToastProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onClose, 300); // Wait for animation
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const getStyles = () => {
        switch (type) {
            case "success":
                return "bg-green-500/10 border-green-500/20 text-green-400";
            case "error":
                return "bg-red-500/10 border-red-500/20 text-red-400";
            case "warning":
                return "bg-amber-500/10 border-amber-500/20 text-amber-400";
            default:
                return "bg-blue-500/10 border-blue-500/20 text-blue-400";
        }
    };

    const getIcon = () => {
        switch (type) {
            case "success": return <Icons.Success className="w-5 h-5" />;
            case "error": return <Icons.Error className="w-5 h-5" />;
            case "warning": return <Icons.Warning className="w-5 h-5" />;
            default: return <Icons.Info className="w-5 h-5" />;
        }
    };

    return (
        <div className={`fixed bottom-4 right-4 z-[100] transition-all duration-300 transform ${isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-lg ${getStyles()}`}>
                {getIcon()}
                <p className="text-sm font-medium">{message}</p>
                <button onClick={() => setIsVisible(false)} className="ml-2 hover:opacity-70">
                    <Icons.Close className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
