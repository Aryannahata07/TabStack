import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './context/AuthContext';
import { db } from './firebase/config';
import { collection, query, getDocs, addDoc } from 'firebase/firestore';
import { Globe, Edit3, Layout, CheckCircle, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { encryptData, decryptData } from './utils/encryption';
import { motion, AnimatePresence } from 'framer-motion';
import { colorOptions, iconMap } from './utils/constants';
import { useKeyboardSelect } from './hooks/useKeyboardSelect';

const getFavicon = (url) => {
    try {
        const domain = new URL(url).hostname;
        return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    } catch (error) {
        return '';
    }
};

export default function PopupApp() {
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(true);

    // Link Form State
    const [url, setUrl] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [categories, setCategories] = useState([]);

    // UI State
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);

    // Refs for keyboard navigation
    const triggerRef = useRef(null);
    // listRef points at the inner scrollable div so scrollIntoView works correctly
    const listRef = useRef(null);

    // Options list for dropdown keyboard navigation
    const dropdownOptions = [
        ...categories.map(cat => ({ id: cat.id, name: cat.name })),
        { id: 'new_category', name: 'Add New Category...' }
    ];

    const {
        highlightedIndex,
        setHighlightedIndex,
        handleKeyDown
    } = useKeyboardSelect({
        isOpen: isCategoryMenuOpen,
        setIsOpen: setIsCategoryMenuOpen,
        options: dropdownOptions,
        selectedValue: categoryId,
        onSelect: setCategoryId,
        triggerRef,
        listRef,
    });

    // New Category State
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryIcon, setNewCategoryIcon] = useState('folder');
    const [newCategoryColor, setNewCategoryColor] = useState('text-blue-400');

    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (!e.target.closest('.category-menu-container')) {
                setIsCategoryMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, []);


    useEffect(() => {
        // If running in extension, grab the current tab info
        if (typeof chrome !== 'undefined' && chrome.tabs) {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    setUrl(tabs[0].url || '');
                    setTitle(tabs[0].title || '');
                }
            });
        }
    }, []);

    useEffect(() => {
        if (currentUser) {
            const fetchCategories = async () => {
                try {
                    const q = query(collection(db, "users", currentUser.uid, "categories"));
                    const snapshot = await getDocs(q);
                    const fetched = snapshot.docs.map(doc => {
                        const data = doc.data();
                        return {
                            id: doc.id,
                            ...data,
                            name: decryptData(data.name, currentUser.uid)
                        };
                    });
                    setCategories(fetched);
                    if (fetched.length > 0) {
                        setCategoryId(fetched[0].id);
                    }
                } catch (err) {
                    setError('Failed to load categories');
                } finally {
                    setLoading(false);
                }
            };
            fetchCategories();
        } else {
            // Simulate checking auth state briefly
            const timer = setTimeout(() => {
                setLoading(false);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [currentUser]);



    const handleSave = async (e) => {
        e.preventDefault();
        if (!categoryId) {
            setError('Please select a category');
            return;
        }

        if (categoryId === 'new_category') {
            if (!newCategoryName.trim()) {
                setError('Category name is required');
                return;
            }
            const nameExists = categories.some(
                (cat) => cat.name.toLowerCase() === newCategoryName.trim().toLowerCase()
            );
            if (nameExists) {
                setError('A category with this name already exists');
                return;
            }
        }

        setSaving(true);
        setError('');

        try {
            let formattedUrl = url.trim();
            if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
                formattedUrl = `https://${formattedUrl}`;
            }

            const favicon = getFavicon(formattedUrl);
            const timestamp = Date.now();
            const uid = currentUser.uid;

            let finalCategoryId = categoryId;
            if (categoryId === 'new_category') {
                const categoryData = {
                    name: encryptData(newCategoryName.trim(), uid),
                    icon: newCategoryIcon,
                    color: newCategoryColor,
                    order: categories.length
                };
                const catRef = await addDoc(
                    collection(db, 'users', uid, 'categories'),
                    categoryData
                );
                finalCategoryId = catRef.id;
            }

            await addDoc(collection(db, "users", uid, "links"), {
                url: encryptData(formattedUrl, uid),
                title: encryptData(title.trim(), uid),
                description: encryptData(description.trim(), uid),
                categoryId: finalCategoryId,
                favicon,
                createdAt: timestamp,
                updatedAt: timestamp
            });

            setSuccess(true);
            setTimeout(() => {
                if (typeof window !== 'undefined') window.close();
            }, 1500);
        } catch (err) {
            setError(err.message || 'Failed to save link');
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <main className="w-[350px] min-h-[400px] flex items-center justify-center bg-[#040b16] text-white">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </main>
        );
    }

    if (!currentUser) {
        return (
            <main className="w-[350px] min-h-[400px] p-5 bg-[#040b16] text-slate-200 font-sans flex flex-col items-center justify-center">
                <img src="/favicon.png" alt="logo" className="h-16 w-16 mb-4" />
                <h1 className="text-3xl font-bold font-['Pacifico'] mb-3">TabStack</h1>
                <p className="text-slate-400 text-center text-sm mb-8 px-2">
                    Please log into the TabStack web application to start saving links.
                </p>
                <a
                    href="https://tabstack-9eea3.web.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 text-center font-medium py-3 rounded-lg transition-colors shadow-lg"
                >
                    Log In to TabStack
                </a>
            </main>
        );
    }

    if (success) {
        return (
            <main className="w-[350px] min-h-[300px] flex flex-col items-center justify-center bg-[#040b16] text-slate-200 font-sans">
                <CheckCircle className="w-16 h-16 text-emerald-500 mb-4" />
                <h2 className="text-xl font-bold">Saved successfully!</h2>
            </main>
        );
    }

    return (
        <main className="w-[350px] p-5 bg-[#040b16] text-slate-200 font-sans">
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                    <img src="/favicon.png" alt="logo" className="h-5 w-5" />
                    <h1 className="text-xl font-bold font-['Pacifico']">TabStack</h1>
                </div>
                <a
                    href="https://tabstack-9eea3.web.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-500 hover:text-slate-300 transition-colors"
                    title="Open TabStack"
                    aria-label="Open TabStack"
                >
                    <ExternalLink className="w-5 h-5" />
                </a>
            </div>

            {error && (
                <div className="mb-4 p-2 bg-red-900/30 border border-red-500 rounded flex items-center gap-2 text-sm text-red-200">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <form onSubmit={handleSave} className="space-y-3">
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">URL</label>
                    <div className="relative">
                        <Globe className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <input
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            className="w-full bg-[#0a1226] border border-indigo-500/20 rounded py-1.5 pl-9 pr-3 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                            required
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Title</label>
                    <div className="relative">
                        <Edit3 className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-[#0a1226] border border-indigo-500/20 rounded py-1.5 pl-9 pr-3 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                            required
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Category</label>
                     <div className="relative category-menu-container">
                        <button
                            ref={triggerRef}
                            type="button"
                            role="combobox"
                            aria-expanded={isCategoryMenuOpen}
                            aria-haspopup="listbox"
                            onKeyDown={handleKeyDown}
                            onClick={() => setIsCategoryMenuOpen(!isCategoryMenuOpen)}
                            className="w-full flex items-center justify-between bg-[#0a1226]/40 backdrop-blur-xl border border-indigo-500/20 rounded py-1.5 pl-9 pr-3 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                        >
                            <div className="flex items-center gap-2">
                                <Layout className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
                                <span className="truncate">
                                    {categoryId === 'new_category' ? 'Add New Category...' : (categories.find(c => c.id === categoryId)?.name || 'Select a category')}
                                </span>
                            </div>
                            <svg className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${isCategoryMenuOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                        
                        <AnimatePresence>
                            {isCategoryMenuOpen && (
                                <motion.div
                                    role="listbox"
                                    initial={{ opacity: 0, y: -5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -5 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute top-full left-0 mt-1 w-full rounded bg-[#040b16]/95 backdrop-blur-xl shadow-lg border border-indigo-500/20 py-1 z-50 flex flex-col"
                                >
                                    <div ref={listRef} className="max-h-[110px] overflow-y-auto">
                                        {categories.map((cat, idx) => {
                                            const isSelected = categoryId === cat.id;
                                            const isHighlighted = highlightedIndex === idx;
                                            return (
                                                <button
                                                    key={cat.id}
                                                    type="button"
                                                    role="option"
                                                    aria-selected={isSelected}
                                                    tabIndex={-1}
                                                    onMouseEnter={() => setHighlightedIndex(idx)}
                                                    onClick={() => {
                                                        setCategoryId(cat.id);
                                                        setIsCategoryMenuOpen(false);
                                                    }}
                                                    className={`w-full text-left px-3 py-1.5 text-sm transition-colors flex items-center justify-between ${isSelected ? 'bg-indigo-500/20 text-indigo-300' : isHighlighted ? 'bg-white/10 text-slate-200' : 'text-slate-300'}`}
                                                >
                                                    <span className="truncate">{cat.name}</span>
                                                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    
                                    {categories.length > 0 && (
                                        <div className="border-t border-indigo-500/10 my-1" />
                                    )}
                                    
                                    <button
                                        type="button"
                                        role="option"
                                        aria-selected={categoryId === 'new_category'}
                                        tabIndex={-1}
                                        onMouseEnter={() => setHighlightedIndex(categories.length)}
                                        onClick={() => {
                                            setCategoryId('new_category');
                                            setIsCategoryMenuOpen(false);
                                        }}
                                        className={`w-full text-left px-3 py-1.5 text-sm font-semibold transition-colors flex items-center justify-between ${categoryId === 'new_category' ? 'bg-indigo-500/20 text-indigo-300' : highlightedIndex === categories.length ? 'bg-white/10 text-slate-200' : 'text-indigo-400'}`}
                                    >
                                        <span>Add New Category...</span>
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                <AnimatePresence>
                    {categoryId === 'new_category' && (
                        <motion.div
                            initial={{ height: 0, opacity: 0, marginTop: 0 }}
                            animate={{ height: 'auto', opacity: 1, marginTop: 12 }}
                            exit={{ height: 0, opacity: 0, marginTop: 0 }}
                            transition={{ duration: 0.25, ease: "easeInOut" }}
                            className="overflow-hidden border border-indigo-500/20 bg-[#0a1226]/50 rounded-xl p-4 space-y-3"
                        >
                            <div>
                                <label htmlFor="newCategoryName" className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                    New Category Name
                                </label>
                                <div className="relative">
                                    <Edit3 className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                                    <input
                                        id="newCategoryName"
                                        type="text"
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                        className="pl-8 w-full bg-[#0a1226] border border-indigo-500/20 rounded py-1 px-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-xs"
                                        placeholder="e.g. Reference, Entertainment"
                                        required={categoryId === 'new_category'}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Icon</span>
                                    <div className="grid grid-cols-4 gap-1 bg-[#040b16] p-1 rounded border border-indigo-500/10">
                                        {Object.entries(iconMap).map(([key, IconComponent]) => (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() => setNewCategoryIcon(key)}
                                                className={`p-1 rounded flex items-center justify-center transition-all ${newCategoryIcon === key ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent'}`}
                                                title={key}
                                            >
                                                <IconComponent className="h-3.5 w-3.5" />
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Color</span>
                                    <div className="grid grid-cols-4 gap-1 bg-[#040b16] p-1 rounded border border-indigo-500/10">
                                        {colorOptions.map((option) => (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => setNewCategoryColor(option.value)}
                                                className={`h-5 w-5 rounded-full flex items-center justify-center transition-all ${newCategoryColor === option.value ? 'ring-2 ring-white scale-105' : 'hover:scale-105'}`}
                                            >
                                                <div className={`w-3.5 h-3.5 rounded-full ${option.bg} shadow-md`}></div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                </div>

                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Description (Optional)</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full bg-[#0a1226] border border-indigo-500/20 rounded py-1.5 px-3 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/50 outline-none resize-none transition-all"
                        rows={2}
                    />
                </div>

                <button
                    type="submit"
                    disabled={saving || categories.length === 0}
                    className="w-full mt-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 font-medium py-2 text-sm rounded-lg transition-all disabled:opacity-50 active:scale-[0.98]"
                >
                    {saving ? 'Saving...' : 'Save Link'}
                </button>
            </form>
        </main>
    );
}
