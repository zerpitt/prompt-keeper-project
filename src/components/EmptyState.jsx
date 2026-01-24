import React from 'react';
import { Ghost, Terminal } from 'lucide-react';
import NeoButton from './NeoButton';

const EmptyState = ({ title = "ไม่พบข้อมูล", message = "ยังไม่มีรายการในหมวดหมู่นี้", actionLabel, onAction }) => {
    return (
        <div className="col-span-full flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-24 h-24 bg-white border-3 border-black shadow-[8px_8px_0px_0px_#000] flex items-center justify-center mb-6 rotate-[-3deg] hover:rotate-[3deg] transition-transform duration-300">
                <Terminal size={48} strokeWidth={1.5} className="text-black" />
            </div>
            <h2 className="text-3xl font-black mb-2 uppercase font-display dark:text-white">{title}</h2>
            <p className="text-gray-500 mb-8 max-w-md dark:text-gray-400">{message}</p>
            {actionLabel && onAction && (
                <NeoButton onClick={onAction} variant="primary" icon={Ghost}>
                    {actionLabel}
                </NeoButton>
            )}
        </div>
    );
};

export default EmptyState;
