import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { db } from './firebase/config';
import { collection, query, getDocs, addDoc } from 'firebase/firestore';
import { Globe, Edit3, Layout, CheckCircle, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { encryptData, decryptData } from './utils/encryption';
import { motion, AnimatePresence } from 'framer-motion';

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

            await addDoc(collection(db, "users", uid, "links"), {
                url: encryptData(formattedUrl, uid),
                title: encryptData(title.trim(), uid),
                description: encryptData(description.trim(), uid),
                categoryId: categoryId,
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
            <div className="w-[350px] min-h-[400px] flex items-center justify-center bg-[#040b16] text-white">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (!currentUser) {
        return (
            <div className="w-[350px] min-h-[400px] p-5 bg-[#040b16] text-slate-200 font-sans flex flex-col items-center justify-center">
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
            </div>
        );
    }

    if (success) {
        return (
            <div className="w-[350px] min-h-[300px] flex flex-col items-center justify-center bg-[#040b16] text-slate-200 font-sans">
                <CheckCircle className="w-16 h-16 text-emerald-500 mb-4" />
                <h2 className="text-xl font-bold">Saved successfully!</h2>
            </div>
        );
    }

    return (
        <div className="w-[350px] p-5 bg-[#040b16] text-slate-200 font-sans">
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
                            type="button"
                            onClick={() => setIsCategoryMenuOpen(!isCategoryMenuOpen)}
                            className="w-full flex items-center justify-between bg-[#0a1226]/40 backdrop-blur-xl border border-indigo-500/20 rounded py-1.5 pl-9 pr-3 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                        >
                            <div className="flex items-center gap-2">
                                <Layout className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
                                <span className="truncate">
                                    {categories.find(c => c.id === categoryId)?.name || 'Select a category'}
                                </span>
                            </div>
                            <svg className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${isCategoryMenuOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                        
                        <AnimatePresence>
                            {isCategoryMenuOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: -5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -5 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute top-full left-0 mt-1 w-full rounded bg-[#040b16]/95 backdrop-blur-xl shadow-lg border border-indigo-500/20 py-1 z-50 max-h-[150px] overflow-y-auto"
                                >
                                    {categories.length === 0 ? (
                                        <div className="px-3 py-2 text-sm text-slate-500">No categories found</div>
                                    ) : (
                                        categories.map(cat => (
                                            <button
                                                key={cat.id}
                                                type="button"
                                                onClick={() => {
                                                    setCategoryId(cat.id);
                                                    setIsCategoryMenuOpen(false);
                                                }}
                                                className={`w-full text-left px-3 py-1.5 text-sm transition-colors flex items-center justify-between ${categoryId === cat.id ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-300 hover:bg-white/5'}`}
                                            >
                                                <span className="truncate">{cat.name}</span>
                                                {categoryId === cat.id && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>}
                                            </button>
                                        ))
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
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
        </div>
    );
}
