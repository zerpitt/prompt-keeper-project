import React from 'react';

const NeoBadge = ({ children, color = 'bg-gray-200', className = '' }) => (
    <span className={`px-2 py-1 border-2 border-black text-xs font-bold font-display uppercase ${color} ${className}`}>
        {children}
    </span>
);

export default NeoBadge;
