import React, { useState, useEffect } from 'react';
import {
    Plus, Search, Copy, Heart, Trash2, Edit2, Play,
    LogOut, User, X, Check, Terminal,
    Upload, Hash, ArrowUpDown, Clock, AlertTriangle,
    BookOpen, Info, Layers, GripVertical, RotateCcw
} from 'lucide-react';
import {
    onAuthStateChanged, signInAnonymously,
    signInWithCustomToken, signOut, signInWithPopup
} from 'firebase/auth';
import {
    collection, addDoc, query, onSnapshot,
    deleteDoc, doc, updateDoc, serverTimestamp, writeBatch, where, getDocs
} from 'firebase/firestore';

// Config & Utils
import { auth, db, appId, googleProvider } from './config/firebase';
import { compressImage, formatDate } from './utils/helpers';
import { ICON_MAP, DEFAULT_CATEGORIES, COLORS } from './utils/constants';

// Components
import NeoButton from './components/NeoButton';
import NeoBadge from './components/NeoBadge';
import Modal from './components/Modal';
import Toast from './components/Toast';

export default function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Data State
    const [prompts, setPrompts] = useState([]);
    const [userCategories, setUserCategories] = useState([]);

    // UI State
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const [showFavorites, setShowFavorites] = useState(false);
    const [isTagMenuOpen, setIsTagMenuOpen] = useState(false);
    const [selectedTag, setSelectedTag] = useState(null);
    const [toast, setToast] = useState(null);

    // Sorting State
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState('desc');

    // Modals & Forms
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPrompt, setEditingPrompt] = useState(null);
    const [variableModal, setVariableModal] = useState({ isOpen: false, prompt: null });
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    // Form State (Dynamic Workflow)
    const [formData, setFormData] = useState({
        title: '',
        category: 'image',
        tags: '',
        guideText: '',
        workflow: [] // Array of { id, title, content }
    });

    // Image State
    const [imagePreview, setImagePreview] = useState(null);
    const [runnerInputs, setRunnerInputs] = useState({});

    // Refs for textarea helper (Using active element approach)
    const [activeTextareaId, setActiveTextareaId] = useState(null); // Can be 'guideText' or a workflow ID

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
    };

    // Auth
    useEffect(() => {
        const initAuth = async () => {
            // Check for custom token passed via global variable (legacy) or just init anon
            if (typeof window !== 'undefined' && window.__initial_auth_token) {
                await signInWithCustomToken(auth, window.__initial_auth_token);
            } else {
                await signInAnonymously(auth);
            }
        };
        initAuth();
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        return () => unsubscribeAuth();
    }, []);

    // Fetch Data
    useEffect(() => {
        if (!user) { setPrompts([]); setUserCategories([]); return; }
        const promptsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'prompts');
        const qPrompts = query(promptsRef);
        const unsubPrompts = onSnapshot(qPrompts, (snapshot) => {
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPrompts(items);
        });
        const categoriesRef = collection(db, 'artifacts', appId, 'users', user.uid, 'categories');
        const qCats = query(categoriesRef);
        const unsubCats = onSnapshot(qCats, (snapshot) => {
            const cats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUserCategories(cats);
        });
        return () => { unsubPrompts(); unsubCats(); };
    }, [user]);

    const allCategories = [...DEFAULT_CATEGORIES, ...userCategories];
    const allTags = [...new Set(prompts.flatMap(p => p.tags || []))].sort();

    // Sorting Logic
    const sortedPrompts = [...prompts].sort((a, b) => {
        const dateA = a[sortBy]?.toMillis ? a[sortBy].toMillis() : 0;
        const dateB = b[sortBy]?.toMillis ? b[sortBy].toMillis() : 0;
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    const filteredPrompts = sortedPrompts.filter(p => {
        const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.content && p.content.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (p.workflow && p.workflow.some(w => w.content.toLowerCase().includes(searchTerm.toLowerCase())));
        const matchesCategory = activeCategory === 'all' || p.category === activeCategory;
        const matchesFavorite = showFavorites ? p.isFavorite : true;
        const matchesTag = selectedTag ? (p.tags && p.tags.includes(selectedTag)) : true;
        return matchesSearch && matchesCategory && matchesFavorite && matchesTag;
    });

    const renderIcon = (iconName, size = 16) => {
        const IconComponent = ICON_MAP[iconName] || Terminal;
        return <IconComponent size={size} />;
    };

    // --- Handlers ---

    const handleOpenCreateModal = () => {
        setEditingPrompt(null);
        setImagePreview(null);
        // Default: 1 workflow block
        setFormData({
            title: '', category: 'image', tags: '', guideText: '',
            workflow: [{ id: Date.now().toString(), title: 'ขั้นตอนที่ 1', content: '' }]
        });
        setShowHistory(false);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (prompt) => {
        setEditingPrompt(prompt);
        setImagePreview(prompt.image || null);

        // Migration Logic for old data structure
        let loadedWorkflow = prompt.workflow || [];
        if (loadedWorkflow.length === 0) {
            if (prompt.content) loadedWorkflow.push({ id: 'legacy-img', title: 'Prompt รูปภาพ', content: prompt.content });
            if (prompt.videoPrompt) loadedWorkflow.push({ id: 'legacy-vid', title: 'Prompt วิดีโอ', content: prompt.videoPrompt });
            // If totally empty, add one default
            if (loadedWorkflow.length === 0) loadedWorkflow.push({ id: Date.now().toString(), title: 'ขั้นตอนที่ 1', content: '' });
        }

        setFormData({
            title: prompt.title || '',
            category: prompt.category || 'image',
            tags: prompt.tags?.join(', ') || '',
            guideText: prompt.guideText || '',
            workflow: loadedWorkflow
        });
        setShowHistory(false);
        setIsModalOpen(true);
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Workflow Handlers
    const addWorkflowBlock = () => {
        setFormData(prev => ({
            ...prev,
            workflow: [...prev.workflow, { id: Date.now().toString(), title: `ขั้นตอนที่ ${prev.workflow.length + 1}`, content: '' }]
        }));
    };

    const removeWorkflowBlock = (id) => {
        setFormData(prev => ({
            ...prev,
            workflow: prev.workflow.filter(w => w.id !== id)
        }));
    };

    const updateWorkflowBlock = (id, field, value) => {
        setFormData(prev => ({
            ...prev,
            workflow: prev.workflow.map(w => w.id === id ? { ...w, [field]: value } : w)
        }));
    };

    const insertVariableTemplate = () => {
        if (!activeTextareaId) return;

        let currentValue = '';
        let updateFn = null;

        if (activeTextareaId === 'guideText') {
            currentValue = formData.guideText;
            updateFn = (val) => setFormData(prev => ({ ...prev, guideText: val }));
        } else {
            const block = formData.workflow.find(w => w.id === activeTextareaId);
            if (block) {
                currentValue = block.content;
                updateFn = (val) => updateWorkflowBlock(activeTextareaId, 'content', val);
            }
        }

        if (!updateFn) return;

        const textarea = document.getElementById(`textarea-${activeTextareaId}`);
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const before = currentValue.substring(0, start);
        const after = currentValue.substring(end, currentValue.length);
        const newText = before + " [] " + after;

        updateFn(newText);

        setTimeout(() => {
            textarea.focus();
            const cursorPosition = start + 2;
            textarea.setSelectionRange(cursorPosition, cursorPosition);
        }, 0);
    };

    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const compressedBase64 = await compressImage(file);
                setImagePreview(compressedBase64);
            } catch (err) { showToast("รูปภาพมีขนาดใหญ่เกินไป หรือรูปแบบไม่ถูกต้อง", "error"); }
        }
    };

    const handleSavePrompt = async (e) => {
        e.preventDefault();
        if (!user) return;

        const { title, category, tags: tagsStr, guideText, workflow } = formData;
        if (!title.trim()) {
            showToast("กรุณาใส่หัวข้อ", "error");
            return;
        }
        // Check if at least one workflow has content
        if (workflow.length === 0 || !workflow.some(w => w.content.trim())) {
            showToast("กรุณาใส่เนื้อหา Prompt อย่างน้อย 1 ขั้นตอน", "error");
            return;
        }

        const tags = tagsStr.split(',').map(t => t.trim()).filter(Boolean);

        // Extract variables from Guide + All Workflow Steps
        let allContent = guideText;
        workflow.forEach(w => allContent += " " + w.content);
        const variables = [...new Set([...allContent.matchAll(/\[([^\]]+)\]/g)].map(m => m[1]))];

        // For backward compatibility (search/display), we save the first block content to 'content' field
        const mainContent = workflow.length > 0 ? workflow[0].content : '';

        const data = {
            title,
            content: mainContent, // Primary content for listing
            category,
            tags,
            variables,
            guideText,
            workflow, // Save dynamic workflow
            image: imagePreview,
            updatedAt: serverTimestamp(),
        };

        try {
            const colRef = collection(db, 'artifacts', appId, 'users', user.uid, 'prompts');
            if (editingPrompt) {
                // Save snapshot history
                const newHistory = [
                    ...(editingPrompt.history || []),
                    {
                        guideText: editingPrompt.guideText || '',
                        workflow: editingPrompt.workflow || (editingPrompt.content ? [{ id: 'legacy', title: 'Legacy', content: editingPrompt.content }] : []),
                        updatedAt: editingPrompt.updatedAt?.toMillis ? editingPrompt.updatedAt.toMillis() : Date.now(),
                        version: (editingPrompt.history?.length || 0) + 1
                    }
                ];
                await updateDoc(doc(colRef, editingPrompt.id), { ...data, history: newHistory });
                showToast("แก้ไขข้อมูลสำเร็จ");
            } else {
                await addDoc(colRef, { ...data, createdAt: serverTimestamp(), isFavorite: false, history: [] });
                showToast("สร้าง Prompt ใหม่สำเร็จ");
            }
            setIsModalOpen(false);
            setEditingPrompt(null);
            setImagePreview(null);
        } catch (err) {
            console.error("Error saving:", err);
            showToast("เกิดข้อผิดพลาดในการบันทึก", "error");
        }
    };

    const handleRestoreVersion = (versionData) => {
        if (confirm("ต้องการใช้เนื้อหาจากเวอร์ชันนี้แทนที่ปัจจุบันหรือไม่?")) {
            // Restore
            let restoredWorkflow = versionData.workflow || [];
            // Fallback if restoring really old version without workflow array
            if (restoredWorkflow.length === 0 && (versionData.content || versionData.videoPrompt)) {
                if (versionData.content) restoredWorkflow.push({ id: 'r1', title: 'Prompt รูปภาพ', content: versionData.content });
                if (versionData.videoPrompt) restoredWorkflow.push({ id: 'r2', title: 'Prompt วิดีโอ', content: versionData.videoPrompt });
            }

            setFormData(prev => ({
                ...prev,
                guideText: versionData.guideText || '',
                workflow: restoredWorkflow
            }));
            showToast("เรียกคืนเนื้อหาเรียบร้อย");
        }
    };

    const handleCreateCategory = async (e) => {
        e.preventDefault();
        if (!user) return;
        const form = e.target;
        const name = form.catName.value;
        const icon = form.iconSelect.value;
        const color = COLORS[Math.floor(Math.random() * COLORS.length)];
        try {
            const colRef = collection(db, 'artifacts', appId, 'users', user.uid, 'categories');
            await addDoc(colRef, { name, icon, color, createdAt: serverTimestamp() });
            setIsCategoryModalOpen(false);
            showToast("สร้างหมวดหมู่สำเร็จ");
        } catch (err) { console.error(err); showToast("สร้างหมวดหมู่ไม่สำเร็จ", "error"); }
    };

    const initiateDeleteCategory = (catId, catName) => {
        setDeleteConfirm({ type: 'category', id: catId, name: catName });
    };

    const initiateDeletePrompt = (id) => {
        setDeleteConfirm({ type: 'prompt', id: id });
    };

    const confirmDeleteAction = async () => {
        if (!deleteConfirm || !user) return;

        try {
            if (deleteConfirm.type === 'category') {
                const promptsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'prompts');
                const q = query(promptsRef, where("category", "==", deleteConfirm.id));
                const snapshot = await getDocs(q);
                const batch = writeBatch(db);
                snapshot.forEach((doc) => { batch.update(doc.ref, { category: 'other' }); });
                await batch.commit();
                await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'categories', deleteConfirm.id));
                if (activeCategory === deleteConfirm.id) setActiveCategory('all');
                showToast("ลบหมวดหมู่เรียบร้อย (ข้อมูลถูกย้ายไป 'อื่นๆ')");
            } else if (deleteConfirm.type === 'prompt') {
                await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'prompts', deleteConfirm.id));
                showToast("ลบ Prompt เรียบร้อย");
            }
        } catch (err) {
            console.error("Delete error:", err);
            showToast("เกิดข้อผิดพลาดในการลบ", "error");
        } finally {
            setDeleteConfirm(null);
        }
    };

    const toggleFavorite = async (prompt) => {
        try {
            const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'prompts', prompt.id);
            await updateDoc(docRef, { isFavorite: !prompt.isFavorite });
        } catch (err) { console.error(err); }
    };

    const openRunner = (prompt) => {
        // Migration for runner: if opening old prompt without workflow
        let runnerPrompt = { ...prompt };
        if (!runnerPrompt.workflow || runnerPrompt.workflow.length === 0) {
            runnerPrompt.workflow = [];
            if (prompt.content) runnerPrompt.workflow.push({ id: 'legacy-img', title: 'Prompt รูปภาพ', content: prompt.content });
            if (prompt.videoPrompt) runnerPrompt.workflow.push({ id: 'legacy-vid', title: 'Prompt วิดีโอ', content: prompt.videoPrompt });
        }
        setVariableModal({ isOpen: true, prompt: runnerPrompt });
        setRunnerInputs({});
    };

    const handleGoogleLogin = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (err) {
            console.error(err);
            showToast("เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google", "error");
        }
    };

    const handleGoogleLogin = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (err) {
            console.error(err);
            showToast("เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google", "error");
        }
    };

    const handleCopy = (text) => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            const btn = document.activeElement;
            if (btn && !btn.innerText.includes("คัดลอกแล้ว")) {
                const originalText = btn.innerHTML;
                btn.innerText = "คัดลอกแล้ว!";
                setTimeout(() => btn.innerHTML = originalText, 1500);
            }
            showToast("คัดลอกลง Clipboard แล้ว");
        } catch (err) {
            showToast("ไม่สามารถคัดลอกได้", "error");
        } finally {
            document.body.removeChild(textarea);
        }
    };

    const getProcessedContent = (template) => {
        if (!template) return '';
        let content = template;
        variableModal.prompt?.variables?.forEach(v => {
            const val = runnerInputs[v] || `[${v}]`;
            content = content.replace(new RegExp(`\\[${v}\\]`, 'g'), val);
        });
        return content;
    };

    // --- Render Helper: Unique Variables ---
    const uniqueVariables = [...new Set(variableModal.prompt?.variables || [])];

    // --- Render ---

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white font-display animate-pulse">กำลังเริ่มต้นระบบ...</div>;

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                <div className="neo-box-static bg-white p-8 max-w-md w-full relative z-10">
                    <div className="bg-black text-white px-2 py-1 font-bold text-xs absolute -top-4 left-4 border-2 border-black font-display">
                        PROMPT.KEEPER_V.1.0
                    </div>
                    <div className="mb-8 text-center">
                        <div className="w-16 h-16 bg-black text-white flex items-center justify-center mx-auto mb-4 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]">
                            <Terminal size={40} />
                        </div>
                        <h1 className="text-4xl uppercase mb-2">PROMPT.KEEPER</h1>
                        <p className="text-sm text-gray-600">จัดการคำสั่ง AI ของคุณ</p>
                    </div>
                    <div className="flex flex-col gap-3">
                        <button onClick={handleGoogleLogin} className="w-full border-3 border-black p-4 flex items-center justify-center gap-3 font-bold hover:bg-black hover:text-white transition-all shadow-[4px_4px_0px_0px_#000] active:translate-x-1 active:translate-y-1 active:shadow-none bg-white font-display">
                            เข้าสู่ระบบด้วย Google
                        </button>
                        <button onClick={() => signInAnonymously(auth)} className="w-full border-3 border-black p-4 flex items-center justify-center gap-3 font-bold hover:bg-yellow-300 transition-all shadow-[4px_4px_0px_0px_#000] active:translate-x-1 active:translate-y-1 active:shadow-none bg-white font-display">
                            <User /> เข้าใช้งานแบบผู้เยี่ยมชม
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-[#f3f4f6]">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Sidebar */}
            <aside className="w-full md:w-64 bg-white border-r-4 border-black flex flex-col md:h-screen sticky top-0 z-10">
                <div className="p-6 border-b-4 border-black bg-yellow-300">
                    <h1 className="text-2xl italic tracking-tighter flex items-center gap-2">
                        <Terminal strokeWidth={3} />
                        PROMPT.KEEPER
                    </h1>
                </div>
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    <button onClick={() => setActiveCategory('all')} className={`w-full text-left p-3 font-bold border-2 border-black flex justify-between items-center transition-all mb-2 ${activeCategory === 'all' ? 'bg-black text-white' : 'bg-white hover:bg-gray-100'}`}>
                        <span className="font-display">ทั้งหมด</span>
                        <span className="bg-white text-black text-xs px-2 py-0.5 border border-black">{prompts.length}</span>
                    </button>
                    {allCategories.map(cat => {
                        const isSystemCategory = DEFAULT_CATEGORIES.some(dc => dc.id === cat.id);
                        return (
                            <div key={cat.id} className="relative group">
                                <button onClick={() => setActiveCategory(cat.id)} className={`w-full text-left p-3 font-bold border-2 border-black flex justify-between items-center transition-all mb-2 ${activeCategory === cat.id ? 'translate-x-2 shadow-none ' + cat.color : 'bg-white hover:bg-gray-50'}`}>
                                    <div className="flex items-center gap-2 font-display">{renderIcon(cat.icon)}{cat.name}</div>
                                    <span className="bg-black text-white text-xs px-2 py-0.5">{prompts.filter(p => p.category === cat.id).length}</span>
                                </button>
                                {!isSystemCategory && (
                                    <button onClick={(e) => { e.stopPropagation(); initiateDeleteCategory(cat.id, cat.name); }} className="absolute right-[-8px] top-[-8px] bg-red-500 text-white border-2 border-black p-1 w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-[2px_2px_0px_0px_#000] cursor-pointer z-10" title="ลบหมวดหมู่">
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                    <button onClick={() => setIsCategoryModalOpen(true)} className="w-full text-left p-3 font-bold border-2 border-dashed border-gray-400 text-gray-500 hover:border-black hover:text-black hover:bg-white flex justify-center items-center gap-2 transition-all mt-4">
                        <Plus size={16} /> สร้างหมวดหมู่
                    </button>
                </nav>
                <div className="p-4 border-t-4 border-black bg-gray-100">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 border-2 border-black bg-white flex items-center justify-center font-bold text-lg font-display">{user.isAnonymous ? '?' : user.displayName?.[0] || 'U'}</div>
                        <div className="overflow-hidden"><p className="font-bold text-sm truncate font-display">{user.isAnonymous ? 'ผู้เยี่ยมชม' : user.displayName}</p><p className="text-xs text-gray-500 truncate">{user.uid.slice(0, 8)}...</p></div>
                    </div>
                    <button onClick={() => signOut(auth)} className="w-full border-2 border-black bg-red-400 text-white font-bold py-2 text-xs hover:bg-red-500 flex items-center justify-center gap-2 font-display"><LogOut size={14} /> ออกจากระบบ</button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="h-20 bg-white border-b-4 border-black flex items-center px-6 gap-4 shrink-0">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" placeholder="ค้นหาคำสั่ง..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full h-12 pl-12 pr-4 border-3 border-black font-bold focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all outline-none font-display bg-white" />
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 border-2 border-black bg-gray-50 px-2 h-12 mr-2">
                            <span className="text-xs font-bold hidden xl:block uppercase">เรียงตาม:</span>
                            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-transparent font-bold text-sm outline-none cursor-pointer">
                                <option value="createdAt">วันที่สร้าง</option>
                                <option value="updatedAt">วันที่แก้ไข</option>
                            </select>
                            <button onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')} className="p-1 hover:bg-black hover:text-white rounded-none transition-all" title={sortOrder === 'desc' ? 'มากไปน้อย' : 'น้อยไปมาก'}><ArrowUpDown size={16} /></button>
                        </div>
                        <button onClick={() => setShowFavorites(!showFavorites)} className={`h-12 w-12 border-2 border-black flex items-center justify-center shadow-[4px_4px_0px_0px_#000] active:translate-y-[2px] active:shadow-none transition-all ${showFavorites ? 'bg-pink-500 text-white' : 'bg-white text-pink-500 hover:bg-pink-500 hover:text-white'}`} title="รายการโปรด">
                            <Heart size={24} strokeWidth={3} fill={showFavorites ? "currentColor" : "none"} />
                        </button>
                        <div className="relative">
                            <button onClick={() => setIsTagMenuOpen(!isTagMenuOpen)} className={`h-12 w-12 border-2 border-black flex items-center justify-center shadow-[4px_4px_0px_0px_#000] active:translate-y-[2px] active:shadow-none transition-all ${selectedTag ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'}`} title="กรองตามแท็ก"><Hash size={24} strokeWidth={3} /></button>
                            {isTagMenuOpen && (
                                <div className="absolute top-full right-0 mt-3 w-64 bg-white border-3 border-black shadow-[4px_4px_0px_0px_#000] p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-100">
                                    <div className="flex justify-between items-center mb-3"><h4 className="font-bold font-display uppercase text-sm">เลือกแท็ก</h4><button onClick={() => setIsTagMenuOpen(false)} className="hover:text-red-500"><X size={16} /></button></div>
                                    {allTags.length === 0 ? <p className="text-xs text-gray-500 text-center py-2">ยังไม่มีแท็ก</p> : (
                                        <div className="flex flex-wrap gap-2">{allTags.map(tag => (
                                            <button key={tag} onClick={() => setSelectedTag(selectedTag === tag ? null : tag)} className={`px-2 py-1 text-xs font-bold border-2 border-black transition-all ${selectedTag === tag ? 'bg-black text-white' : 'bg-white hover:bg-gray-100'}`}>#{tag}</button>
                                        ))}</div>
                                    )}
                                    {selectedTag && <button onClick={() => setSelectedTag(null)} className="w-full mt-3 text-xs font-bold text-red-500 hover:underline text-center border-t-2 border-gray-100 pt-2">ล้างตัวกรอง</button>}
                                </div>
                            )}
                        </div>
                        <NeoButton onClick={handleOpenCreateModal} icon={Plus} variant="accent" className="h-12">สร้างใหม่</NeoButton>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-6 bg-[#f3f4f6]">
                    <div className="fixed inset-0 pointer-events-none opacity-5 z-0" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 relative z-10 pb-20">
                        {filteredPrompts.length === 0 && (
                            <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-400"><Terminal size={64} className="mb-4 opacity-20" /><h2 className="text-2xl font-black text-gray-300 font-display">ไม่พบข้อมูล</h2></div>
                        )}
                        {filteredPrompts.map(prompt => {
                            const category = allCategories.find(c => c.id === prompt.category) || allCategories[4];
                            // Support new workflow display
                            const displayWorkflow = prompt.workflow && prompt.workflow.length > 0 ? prompt.workflow : [{ content: prompt.content }];

                            return (
                                <div key={prompt.id} className="bg-white border-3 border-black shadow-[6px_6px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#000] transition-all flex flex-col h-auto min-h-[320px]">
                                    {prompt.image && (
                                        <div className="w-full h-40 border-b-3 border-black bg-gray-100 overflow-hidden relative"><img src={prompt.image} alt="cover" className="w-full h-full object-cover" /><div className="absolute top-2 right-2 bg-black text-white text-[10px] px-1 font-bold">WEBP</div></div>
                                    )}
                                    <div className="p-3 border-b-3 border-black flex justify-between items-center bg-gray-50">
                                        <NeoBadge color={category.color}>{category.name}</NeoBadge>
                                        <div className="flex gap-2">
                                            <button onClick={() => toggleFavorite(prompt)} className={`hover:scale-110 transition-transform ${prompt.isFavorite ? 'text-red-500 fill-red-500' : 'text-gray-400'}`}><Heart size={20} strokeWidth={3} /></button>
                                            <button onClick={() => handleOpenEditModal(prompt)} className="hover:text-blue-600"><Edit2 size={20} strokeWidth={3} /></button>
                                            <button onClick={() => initiateDeletePrompt(prompt.id)} className="hover:text-red-600"><Trash2 size={20} strokeWidth={3} /></button>
                                        </div>
                                    </div>
                                    <div className="p-4 flex-1 overflow-hidden relative group">
                                        <h3 className="text-xl font-black leading-tight mb-2 line-clamp-2">{prompt.title}</h3>
                                        <div className="text-xs text-gray-500 mb-2 flex flex-wrap gap-1">{prompt.tags?.map((tag, i) => <span key={i} className="bg-gray-200 px-1 border border-black rounded-none">#{tag}</span>)}</div>

                                        {/* Content Preview - Show first block or summary */}
                                        <div className="space-y-2">
                                            {prompt.guideText && (
                                                <div className="flex items-center gap-1 text-[10px] font-bold bg-yellow-100 border border-black px-1 w-fit">
                                                    <Info size={10} /> มีลำดับการทำงาน
                                                </div>
                                            )}
                                            <p className="text-sm text-gray-600 overflow-hidden line-clamp-3 leading-relaxed font-mono">
                                                {/* Display badge if title exists in workflow, otherwise generic */}
                                                {prompt.workflow && prompt.workflow.length > 0 && <span className="font-bold text-xs bg-gray-200 px-1 mr-1">{prompt.workflow[0].title || 'Step 1'}</span>}
                                                {prompt.content || (prompt.workflow && prompt.workflow[0]?.content)}
                                            </p>
                                            {/* Indicator if more steps */}
                                            {prompt.workflow && prompt.workflow.length > 1 && (
                                                <p className="text-xs text-blue-600 font-bold mt-1">+ อีก {prompt.workflow.length - 1} ขั้นตอน</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="p-3 border-t-3 border-black grid grid-cols-2 gap-3 bg-gray-50">
                                        <button onClick={() => handleCopy(prompt.content || (prompt.workflow && prompt.workflow[0]?.content))} className="flex items-center justify-center gap-2 font-bold text-sm border-2 border-black bg-white hover:bg-gray-100 py-2 shadow-[2px_2px_0px_0px_#000] active:translate-y-[2px] active:shadow-none transition-all font-display"><Copy size={16} /> คัดลอก</button>
                                        <button onClick={() => openRunner(prompt)} className="flex items-center justify-center gap-2 font-bold text-sm border-2 border-black bg-cyan-300 hover:bg-cyan-400 py-2 shadow-[2px_2px_0px_0px_#000] active:translate-y-[2px] active:shadow-none transition-all font-display"><Play size={16} /> ใช้งาน</button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </main>

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <Modal isOpen={true} onClose={() => setDeleteConfirm(null)} title="ยืนยันการลบ">
                    <div className="text-center p-4">
                        <div className="bg-red-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-black"><AlertTriangle size={40} className="text-red-500" /></div>
                        <p className="font-bold text-xl mb-2 font-display uppercase">คุณแน่ใจหรือไม่?</p>
                        <p className="text-sm text-gray-600 mb-8 font-mono">{deleteConfirm.type === 'category' ? `คุณกำลังจะลบหมวดหมู่ "${deleteConfirm.name}" ข้อมูลทั้งหมดในหมวดหมู่นี้จะถูกย้ายไปที่ "อื่นๆ"` : "ข้อมูลที่ลบแล้วจะไม่สามารถกู้คืนได้"}</p>
                        <div className="flex gap-4 justify-center"><NeoButton onClick={() => setDeleteConfirm(null)} variant="invert">ยกเลิก</NeoButton><NeoButton onClick={confirmDeleteAction} variant="danger">ยืนยันการลบ</NeoButton></div>
                    </div>
                </Modal>
            )}

            {/* MODAL: Create / Edit Prompt */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingPrompt ? (showHistory ? "ประวัติการแก้ไข" : "แก้ไขข้อมูล") : "สร้างใหม่"}>
                <div className="flex gap-4 mb-4">
                    {editingPrompt && (
                        <button onClick={() => setShowHistory(!showHistory)} className={`flex items-center gap-2 px-3 py-1 border-2 border-black text-xs font-bold ${showHistory ? 'bg-black text-white' : 'bg-white hover:bg-gray-100'}`}>
                            {showHistory ? <Edit2 size={14} /> : <Clock size={14} />}
                            {showHistory ? "กลับไปแก้ไข" : "ดูประวัติการแก้ไข"}
                        </button>
                    )}
                </div>

                {showHistory && editingPrompt?.history ? (
                    <div className="space-y-3">
                        {editingPrompt.history.length === 0 && <p className="text-center text-gray-500">ยังไม่มีประวัติการแก้ไข</p>}
                        {[...editingPrompt.history].reverse().map((hist, idx) => (
                            <div key={idx} className="border-2 border-black p-3 flex justify-between items-center bg-gray-50">
                                <div><p className="font-bold text-sm">เวอร์ชัน {hist.version || 'Old'}</p><p className="text-xs text-gray-500">{formatDate(hist.updatedAt)}</p></div>
                                <button onClick={() => handleRestoreVersion(hist)} className="bg-white border-2 border-black px-2 py-1 text-xs font-bold hover:bg-yellow-300 flex items-center gap-1"><RotateCcw size={12} /> เรียกคืน</button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <form onSubmit={handleSavePrompt} className="space-y-4">
                        {/* 1. Image Upload (Priority Top) */}
                        <div>
                            <label className="block font-bold mb-1 text-sm uppercase font-display">รูปภาพประกอบ</label>
                            {!imagePreview ? (
                                <div className="border-3 border-dashed border-gray-300 bg-gray-50 p-6 flex flex-col items-center justify-center text-gray-500 hover:border-black hover:bg-white transition-all cursor-pointer relative">
                                    <Upload size={32} className="mb-2" /><span className="text-xs font-bold">คลิกเพื่ออัปโหลด (Max 1MB)</span>
                                    <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                                </div>
                            ) : (
                                <div className="relative border-3 border-black inline-block group">
                                    <img src={imagePreview} alt="Preview" className="h-40 object-cover" />
                                    <button type="button" onClick={() => setImagePreview(null)} className="absolute top-2 right-2 bg-red-500 text-white p-1 border-2 border-black shadow-[2px_2px_0px_0px_#000] hover:bg-red-600 hover:scale-110 transition-all"><Trash2 size={16} /></button>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block font-bold mb-1 text-sm uppercase font-display">หัวข้อ <span className="text-red-500">*</span></label>
                            <input required name="title" value={formData.title} onChange={handleFormChange} className="w-full neo-input" placeholder="เช่น ตัวช่วยเขียนบล็อก SEO" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block font-bold mb-1 text-sm uppercase font-display">หมวดหมู่</label>
                                <div className="relative">
                                    <select name="category" value={formData.category} onChange={handleFormChange} className="w-full neo-input appearance-none bg-white">
                                        {allCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">▼</div>
                                </div>
                            </div>
                            <div>
                                <label className="block font-bold mb-1 text-sm uppercase font-display">แท็ก (คั่นด้วยจุลภาค)</label>
                                <input name="tags" value={formData.tags} onChange={handleFormChange} className="w-full neo-input" placeholder="seo, writing, gpt4" />
                            </div>
                        </div>

                        {/* --- WORKFLOW SECTIONS --- */}

                        {/* Guide Section */}
                        <div className="bg-gray-50 border-2 border-black p-3">
                            <label className="block font-bold mb-1 text-sm uppercase font-display flex items-center gap-2">
                                <BookOpen size={16} /> คู่มือ / วิธีใช้
                            </label>
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-xs text-gray-500">คำแนะนำการตั้งค่า หรือเทคนิคการใช้ Prompt นี้</span>
                                <button type="button" onClick={() => { setActiveTextareaId('guideText'); insertVariableTemplate(); }} className="text-xs bg-black text-white px-2 py-1 font-bold flex items-center gap-1 hover:bg-gray-800">[ ] แทรกตัวแปร</button>
                            </div>
                            <textarea
                                id="textarea-guideText"
                                name="guideText"
                                value={formData.guideText}
                                onChange={handleFormChange}
                                onFocus={() => setActiveTextareaId('guideText')}
                                className="w-full neo-input h-24 text-sm"
                                placeholder="เขียนคำแนะนำที่นี่..."
                            />
                        </div>

                        {/* Dynamic Workflow Blocks */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 border-b-2 border-black pb-2 mb-2">
                                <Layers size={18} />
                                <h3 className="font-bold font-display uppercase">ขั้นตอนการทำงาน (Workflow)</h3>
                            </div>

                            {formData.workflow.map((block, index) => (
                                <div key={block.id} className="bg-white border-2 border-black p-4 relative shadow-[4px_4px_0px_0px_#ccc]">
                                    {/* Header: Title Input & Controls */}
                                    <div className="flex justify-between items-start mb-3 gap-2">
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">ชื่อขั้นตอน <span className="text-red-500">*</span></label>
                                            <input
                                                value={block.title}
                                                onChange={(e) => updateWorkflowBlock(block.id, 'title', e.target.value)}
                                                className="w-full font-bold border-b-2 border-gray-300 focus:border-black outline-none py-1 bg-transparent"
                                                placeholder={`ขั้นตอนที่ ${index + 1}`}
                                            />
                                        </div>
                                        {formData.workflow.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeWorkflowBlock(block.id)}
                                                className="text-red-500 hover:bg-red-50 p-1 border border-transparent hover:border-red-200 rounded"
                                                title="ลบขั้นตอนนี้"
                                            >
                                                <X size={16} />
                                            </button>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="text-xs font-bold uppercase text-gray-500">เนื้อหา Prompt <span className="text-red-500">*</span></label>
                                            <button
                                                type="button"
                                                onMouseDown={(e) => { e.preventDefault(); setActiveTextareaId(block.id); insertVariableTemplate(); }}
                                                className="text-[10px] bg-black text-white px-2 py-0.5 font-bold hover:bg-gray-800"
                                            >
                                                [ ] แทรกตัวแปร
                                            </button>
                                        </div>
                                        <textarea
                                            id={`textarea-${block.id}`}
                                            value={block.content}
                                            onChange={(e) => updateWorkflowBlock(block.id, 'content', e.target.value)}
                                            onFocus={() => setActiveTextareaId(block.id)}
                                            className="w-full neo-input h-24 font-mono text-sm"
                                            placeholder="ใส่ Prompt ที่นี่..."
                                        />
                                    </div>
                                    <div className="absolute -left-3 top-1/2 -translate-y-1/2 bg-gray-200 border border-black p-1 cursor-move hidden group-hover:block">
                                        <GripVertical size={12} />
                                    </div>
                                </div>
                            ))}

                            <button
                                type="button"
                                onClick={addWorkflowBlock}
                                className="w-full border-2 border-dashed border-gray-400 p-3 flex items-center justify-center gap-2 text-gray-500 font-bold hover:border-black hover:text-black hover:bg-gray-50 transition-all"
                            >
                                <Plus size={16} /> เพิ่มขั้นตอนใหม่
                            </button>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t-2 border-gray-200">
                            <NeoButton onClick={() => setIsModalOpen(false)} variant="invert">ยกเลิก</NeoButton>
                            <NeoButton type="submit" variant="invert" icon={Check}>บันทึก</NeoButton>
                        </div>
                    </form>
                )}
            </Modal>

            {/* MODAL: Create Category */}
            <Modal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} title="สร้างหมวดหมู่ใหม่">
                <form onSubmit={handleCreateCategory} className="space-y-6">
                    <div><label className="block font-bold mb-2 text-sm uppercase font-display">ชื่อหมวดหมู่</label><input required name="catName" className="w-full neo-input" placeholder="เช่น การเงิน, สุขภาพ, ออกแบบ..." /></div>
                    <div>
                        <label className="block font-bold mb-2 text-sm uppercase font-display">เลือกไอคอน</label>
                        <div className="grid grid-cols-5 gap-2 h-40 overflow-y-auto border-2 border-black p-2">
                            {Object.keys(ICON_MAP).map((iconKey) => {
                                const IconComp = ICON_MAP[iconKey];
                                return (
                                    <label key={iconKey} className="cursor-pointer">
                                        <input type="radio" name="iconSelect" value={iconKey} className="peer sr-only" required defaultChecked={iconKey === 'Star'} />
                                        <div className="w-full aspect-square border-2 border-transparent peer-checked:border-black peer-checked:bg-yellow-300 peer-hover:bg-gray-100 flex items-center justify-center transition-all"><IconComp size={24} /></div>
                                    </label>
                                )
                            })}
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t-2 border-gray-200"><NeoButton onClick={() => setIsCategoryModalOpen(false)} variant="invert">ยกเลิก</NeoButton><NeoButton type="submit" variant="invert" icon={Plus}>สร้างหมวดหมู่</NeoButton></div>
                </form>
            </Modal>

            {/* MODAL: Variable Runner */}
            <Modal isOpen={variableModal.isOpen} onClose={() => setVariableModal({ isOpen: false, prompt: null })} title="รันคำสั่ง (Workflow)">
                <div className="flex flex-col md:flex-row gap-6 h-full">
                    {/* Left: Inputs & Guide */}
                    {((uniqueVariables.length > 0) || variableModal.prompt?.guideText) ? (
                        <div className="flex-1 space-y-4 overflow-y-auto">
                            {/* Guide Box */}
                            {variableModal.prompt?.guideText && (
                                <div className="bg-yellow-50 border-2 border-black p-4 shadow-[4px_4px_0px_0px_#000]">
                                    <h4 className="font-bold text-sm mb-2 flex items-center gap-2"><BookOpen size={16} /> คำแนะนำ</h4>
                                    <p className="text-sm whitespace-pre-wrap">{variableModal.prompt.guideText}</p>
                                </div>
                            )}

                            {uniqueVariables.length > 0 && (
                                <div className="bg-cyan-100 border-2 border-black p-3 mb-4">
                                    <h4 className="font-bold text-sm mb-1 font-display">ตัวแปร (กรอกครั้งเดียวใช้ได้ทั้งหมด)</h4>
                                    <p className="text-xs">กรอกข้อมูลลงในตัวแปรด้านล่างเพื่อสร้าง Prompt ที่สมบูรณ์</p>
                                </div>
                            )}
                            {uniqueVariables.map(v => (
                                <div key={v}>
                                    <label className="block font-bold mb-1 text-xs uppercase bg-black text-white inline-block px-1 font-display">{v}</label>
                                    <input className="w-full neo-input" placeholder={`ใส่ค่าสำหรับ ${v}...`} onChange={(e) => setRunnerInputs(prev => ({ ...prev, [v]: e.target.value }))} />
                                </div>
                            ))}
                        </div>
                    ) : null}

                    {/* Right: Outputs */}
                    <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
                        {variableModal.prompt?.workflow?.map((block, idx) => (
                            <div key={block.id || idx} className="flex-1 flex flex-col">
                                {variableModal.prompt.workflow.length > 1 && (
                                    <label className="block font-bold mb-1 text-sm uppercase font-display flex items-center gap-2">
                                        <span className="bg-black text-white text-[10px] px-1.5 py-0.5 rounded-full">{idx + 1}</span>
                                        {block.title || `ขั้นตอนที่ ${idx + 1}`}
                                    </label>
                                )}
                                <div className="flex-1 bg-gray-900 text-green-400 p-4 border-3 border-black overflow-y-auto text-sm whitespace-pre-wrap relative shadow-[4px_4px_0px_0px_#ccc] font-mono min-h-[120px]">
                                    {getProcessedContent(block.content)}
                                </div>
                                <button
                                    onClick={() => handleCopy(getProcessedContent(block.content))}
                                    className="mt-2 w-full bg-white border-3 border-black font-bold py-2 hover:bg-gray-100 shadow-[2px_2px_0px_0px_#000] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-2 text-sm"
                                >
                                    <Copy size={16} /> คัดลอก {variableModal.prompt.workflow.length > 1 && (block.title ? `"${block.title}"` : 'คำสั่ง')}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </Modal>

        </div>
    );
}
