import React from 'react';

const NeoButton = ({ children, onClick, className = '', variant = 'primary', icon: Icon, type = 'button', style = {} }) => {
    const baseClass = "neo-btn flex items-center justify-center gap-2 px-6 cursor-pointer select-none";
    const defaultHeight = className.includes('h-') ? '' : 'h-12';
    const colors = {
        primary: "bg-white text-black hover:bg-gray-100 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700",
        black: "bg-black text-white hover:bg-gray-900 dark:bg-white dark:text-black dark:hover:bg-gray-200",
        // UX Request: Cancel = Red Text, Save = Green Text. 
        // We ensure they have the border and shadow via baseClass.
        danger: "bg-white text-red-600 hover:bg-red-50 dark:bg-zinc-800 dark:text-red-400 dark:hover:bg-zinc-700",
        accent: "bg-yellow-300 text-black hover:bg-yellow-400 dark:bg-yellow-600 dark:text-white dark:hover:bg-yellow-700",
        success: "bg-white text-green-600 hover:bg-green-50 dark:bg-zinc-800 dark:text-green-400 dark:hover:bg-zinc-700",
        invert: "bg-white text-black hover:bg-black hover:text-white dark:bg-zinc-800 dark:text-white dark:hover:bg-white dark:hover:text-black transition-colors duration-200"
    };
    return (
        <button type={type} onClick={onClick} style={style} className={`${baseClass} ${defaultHeight} ${colors[variant]} ${className}`}>
            {Icon && <Icon size={20} strokeWidth={2.5} />}
            {children}
        </button>
    );
};

export default NeoButton;
