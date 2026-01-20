import React from 'react';

const NeoButton = ({ children, onClick, className = '', variant = 'primary', icon: Icon, type = 'button', style = {} }) => {
    const baseClass = "neo-btn flex items-center justify-center gap-2 px-6 cursor-pointer select-none";
    const defaultHeight = className.includes('h-') ? '' : 'h-12';
    const colors = {
        primary: "bg-white text-black hover:bg-gray-100 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700",
        black: "bg-black text-white hover:bg-gray-900 dark:bg-white dark:text-black dark:hover:bg-gray-200",
        danger: "bg-white text-red-600 hover:bg-red-600 hover:text-white dark:bg-zinc-800 dark:text-red-400 dark:hover:bg-red-600 dark:hover:text-white transition-colors duration-200",
        accent: "bg-yellow-300 text-black hover:bg-yellow-400 dark:bg-yellow-600 dark:text-white dark:hover:bg-yellow-700",
        success: "bg-green-400 text-black hover:bg-green-500 dark:bg-green-600 dark:text-white",
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
