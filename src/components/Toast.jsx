import React, { useEffect } from 'react';
import { AlertTriangle, Bell } from 'lucide-react';

const Toast = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`fixed bottom-6 right-6 z-[60] flex items-center gap-3 px-6 py-4 border-2 border-black shadow-[4px_4px_0px_0px_#000] animate-in slide-in-from-bottom-5 fade-in duration-300 ${type === 'error' ? 'bg-red-100 text-red-900' : 'bg-green-100 text-green-900'}`}>
            {type === 'error' ? <AlertTriangle size={24} /> : <Bell size={24} />}
            <span className="font-bold font-display">{message}</span>
        </div>
    );
};

export default Toast;
