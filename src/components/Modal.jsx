import React from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-white dark:bg-zinc-900 border-4 border-black dark:border-white shadow-[8px_8px_0px_0px_#000] dark:shadow-[8px_8px_0px_0px_#fff] w-full max-w-3xl max-h-[90vh] overflow-y-auto relative p-6 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-start mb-6 border-b-4 border-black dark:border-white pb-4">
                    <h2 className="text-2xl font-display uppercase tracking-tighter dark:text-white">{title}</h2>
                    <button onClick={onClose} className="p-1 hover:bg-red-500 hover:text-white border-2 border-black dark:border-white dark:text-white dark:hover:border-red-500 transition-colors">
                        <X size={24} strokeWidth={3} />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
};

export default Modal;
