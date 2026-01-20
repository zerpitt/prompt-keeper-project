import React from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_#000] w-full max-w-3xl max-h-[90vh] overflow-y-auto relative p-6 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-start mb-6 border-b-4 border-black pb-4">
                    <h2 className="text-2xl font-display uppercase tracking-tighter">{title}</h2>
                    <button onClick={onClose} className="p-1 hover:bg-red-500 hover:text-white border-2 border-black transition-colors">
                        <X size={24} strokeWidth={3} />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
};

export default Modal;
