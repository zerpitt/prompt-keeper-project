import React, { useEffect } from 'react';
import { AlertTriangle, Check, Info, X } from 'lucide-react';

const Toast = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const variants = {
        error: {
            bg: 'bg-red-500',
            text: 'text-white',
            icon: <AlertTriangle size={24} strokeWidth={3} className="text-white" />,
            border: 'border-black'
        },
        success: {
            bg: 'bg-green-500',
            text: 'text-white',
            icon: <Check size={24} strokeWidth={3} className="text-white" />,
            border: 'border-black'
        },
        info: {
            bg: 'bg-white',
            text: 'text-black',
            icon: <Info size={24} strokeWidth={3} className="text-black" />,
            border: 'border-black'
        }
    };

    const style = variants[type] || variants.info;

    return (
        <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 pr-12 pl-4 py-4 border-3 ${style.border} shadow-[6px_6px_0px_0px_#000] animate-in slide-in-from-right-full fade-in duration-300 ${style.bg}`}>
            <div className="shrink-0">{style.icon}</div>
            <span className={`font-black font-display text-base ${style.text}`}>{message}</span>
            <button
                onClick={onClose}
                className={`absolute top-2 right-2 p-1 hover:bg-black/20 rounded-full transition-colors ${style.text}`}
            >
                <X size={16} strokeWidth={3} />
            </button>
        </div>
    );
};

export default Toast;
