import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { db } from './firebase/config';
import { collection, query, getDocs, addDoc } from 'firebase/firestore';
import { Globe, Edit3, Layout, CheckCircle, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { encryptData, decryptData } from './utils/encryption';

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
            <div className="w-[350px] min-h-[400px] flex items-center justify-center bg-gray-900 text-white">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (!currentUser) {
        return (
            <div className="w-[350px] min-h-[400px] p-5 bg-gray-900 text-white font-sans flex flex-col items-center justify-center">
                <img src="/favicon.png" alt="logo" className="h-16 w-16 mb-4" />
                <h1 className="text-3xl font-bold font-['Pacifico'] mb-3">TabStack</h1>
                <p className="text-gray-400 text-center text-sm mb-8 px-2">
                    Please log into the TabStack web application to start saving links.
                </p>
                <a
                    href="https://tabstack-9eea3.web.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-center font-medium py-3 rounded-lg transition-colors shadow-lg"
                >
                    Log In to TabStack
                </a>
            </div>
        );
    }

    if (success) {
        return (
            <div className="w-[350px] min-h-[300px] flex flex-col items-center justify-center bg-gray-900 text-white font-sans">
                <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
                <h2 className="text-xl font-bold">Saved successfully!</h2>
            </div>
        );
    }

    return (
        <div className="w-[350px] p-5 bg-gray-900 text-white font-sans">
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                    <img src="/favicon.png" alt="logo" className="h-5 w-5" />
                    <h1 className="text-xl font-bold font-['Pacifico']">TabStack</h1>
                </div>
                <a
                    href="https://tabstack-9eea3.web.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors"
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
                    <label className="block text-xs font-medium text-gray-400 mb-1">URL</label>
                    <div className="relative">
                        <Globe className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                        <input
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded py-1.5 pl-9 pr-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            required
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Title</label>
                    <div className="relative">
                        <Edit3 className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded py-1.5 pl-9 pr-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            required
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Category</label>
                    <div className="relative">
                        <Layout className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                        <select
                            value={categoryId}
                            onChange={(e) => setCategoryId(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded py-1.5 pl-9 pr-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                            required
                        >
                            {categories.length === 0 ? (
                                <option value="" disabled>No categories found</option>
                            ) : (
                                categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))
                            )}
                        </select>
                        <div className="pointer-events-none absolute right-2.5 top-1/2 transform -translate-y-1/2">
                            <svg className="h-4 w-4 text-gray-500 fill-current" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Description (Optional)</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded py-1.5 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                        rows={2}
                    />
                </div>

                <button
                    type="submit"
                    disabled={saving || categories.length === 0}
                    className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 text-sm rounded transition-colors disabled:opacity-50"
                >
                    {saving ? 'Saving...' : 'Save Link'}
                </button>
            </form>
        </div>
    );
}
