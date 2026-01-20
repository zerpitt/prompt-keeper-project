import React from 'react';

const NeoButton = ({ children, onClick, className = '', variant = 'primary', icon: Icon, type = 'button', style = {} }) => {
    const baseClass = "neo-btn flex items-center justify-center gap-2 px-6 cursor-pointer select-none";
    const defaultHeight = className.includes('h-') ? '' : 'h-12';
    const colors = {
        primary: "bg-white text-black hover:bg-gray-100",
        black: "bg-black text-white hover:bg-gray-900",
        danger: "bg-white text-red-600 hover:bg-red-600 hover:text-white transition-colors duration-200",
        accent: "bg-yellow-300 text-black hover:bg-yellow-400",
        success: "bg-green-400 text-black hover:bg-green-500",
        invert: "bg-white text-black hover:bg-black hover:text-white transition-colors duration-200"
    };
    return (
        <button type={type} onClick={onClick} style={style} className={`${baseClass} ${defaultHeight} ${colors[variant]} ${className}`}>
            {Icon && <Icon size={20} strokeWidth={2.5} />}
            {children}
        </button>
    );
};

export default NeoButton;
