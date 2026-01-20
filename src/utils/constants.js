import {
    Image as ImageIcon, Video, FileText, Code, PenTool, Megaphone, Terminal, Music,
    Box, Star, Zap, Activity, Smile, Coffee, LayoutGrid, Smartphone, Camera,
    Disc, Mic
} from 'lucide-react';

export const ICON_MAP = {
    'ImageIcon': ImageIcon, 'Video': Video, 'FileText': FileText, 'Code': Code,
    'PenTool': PenTool, 'Megaphone': Megaphone, 'Terminal': Terminal, 'Music': Music,
    'Box': Box, 'Star': Star, 'Zap': Zap, 'Activity': Activity, 'Smile': Smile,
    'Coffee': Coffee, 'LayoutGrid': LayoutGrid, 'Smartphone': Smartphone, 'Camera': Camera,
    'Disc': Disc, 'Mic': Mic
};

export const DEFAULT_CATEGORIES = [
    { id: 'image', name: 'รูปภาพ', color: 'bg-pink-400', icon: 'ImageIcon' },
    { id: 'video', name: 'วีดีโอ', color: 'bg-purple-400', icon: 'Video' },
    { id: 'text', name: 'ข้อความ', color: 'bg-yellow-300', icon: 'FileText' },
    { id: 'code', name: 'โค้ด', color: 'bg-cyan-300', icon: 'Code' },
    { id: 'other', name: 'อื่นๆ', color: 'bg-gray-200', icon: 'Box' },
];

export const COLORS = [
    'bg-pink-400', 'bg-purple-400', 'bg-yellow-300', 'bg-cyan-300',
    'bg-green-400', 'bg-red-400', 'bg-blue-400', 'bg-orange-400', 'bg-gray-200'
];
