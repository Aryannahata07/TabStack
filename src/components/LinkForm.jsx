import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { X, Globe, Edit3, Layout, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

import { encryptData } from '../utils/encryption';

const getFavicon = (url) => {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch (error) {
    return '';
  }
};

const LinkForm = ({
  isOpen,
  onClose,
  onSuccess,
  categories,
  initialCategoryId,
  linkToEdit
}) => {
  const { currentUser } = useAuth();
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (linkToEdit) {
      // Data is already decrypted in the LinkList before passing to this form
      setUrl(linkToEdit.url);
      setTitle(linkToEdit.title);
      setDescription(linkToEdit.description || '');
      setCategoryId(linkToEdit.categoryId);
      setIsPinned(linkToEdit.isPinned || false);
    } else if (initialCategoryId) {
      setCategoryId(initialCategoryId);
    } else if (categories.length > 0) {
      setCategoryId(categories[0].id);
    }
  }, [linkToEdit, initialCategoryId, categories]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentUser) {
      setError('You must be logged in to add links');
      return;
    }

    if (!url.trim()) {
      setError('URL is required');
      return;
    }

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (!categoryId) {
      setError('Category is required');
      return;
    }

    try {
      setLoading(true);
      setError('');

      let formattedUrl = url.trim();
      if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
        formattedUrl = `https://${formattedUrl}`;
      }

      const favicon = getFavicon(formattedUrl);
      const timestamp = Date.now();

      const linkData = {
        url: encryptData(formattedUrl, currentUser.uid),
        title: encryptData(title.trim(), currentUser.uid),
        description: encryptData(description.trim(), currentUser.uid),
        categoryId,
        isPinned,
        favicon,
        updatedAt: timestamp
      };

      if (linkToEdit) {
        const linkRef = doc(db, "users", currentUser.uid, "links", linkToEdit.id);
        await updateDoc(linkRef, linkData);
        toast.success('Link updated successfully (encrypted)');
      } else {
        await addDoc(collection(db, "users", currentUser.uid, "links"), {
          ...linkData,
          createdAt: timestamp
        });
        toast.success('Link added successfully');
      }

      onSuccess();
      onClose();
    } catch (error) {
      setError(error.message || 'Failed to save link');
      toast.error('Failed to save link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
              onClick={onClose}
            ></motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md overflow-hidden rounded-2xl bg-[#040b16]/95 backdrop-blur-xl p-6 shadow-[0_0_40px_-15px_rgba(0,0,0,0.5)] border border-indigo-500/20"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-200">
                  {linkToEdit ? 'Edit Link' : 'Add New Link'}
                </h2>
                <button
                  onClick={onClose}
                  className="text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-900/30 border border-red-500 rounded-lg flex items-center gap-2 text-red-200">
                  <AlertCircle className="h-5 w-5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="url" className="block text-sm font-medium text-slate-300 mb-1">
                    URL
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                      id="url"
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="pl-10 w-full bg-[#0a1226] border border-indigo-500/20 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                      placeholder="https://example.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-slate-300 mb-1">
                    Title
                  </label>
                  <div className="relative">
                    <Edit3 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                      id="title"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="pl-10 w-full bg-[#0a1226] border border-indigo-500/20 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                      placeholder="My favorite website"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-slate-300 mb-1">
                    Description (optional)
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-[#0a1226] border border-indigo-500/20 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                    placeholder="A brief description of this link"
                    rows={3}
                  />
                </div>

                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-slate-300 mb-1">
                    Category
                  </label>
                  <div className="relative">
                    <Layout className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <select
                      id="category"
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="pl-10 w-full bg-[#0a1226] border border-indigo-500/20 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none transition-all"
                      required
                    >
                      <option value="" disabled>Select a category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                      <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="flex items-center space-x-3 cursor-pointer w-fit group">
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${isPinned ? 'bg-indigo-500/20 border-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.3)]' : 'bg-[#0a1226] border-indigo-500/20 group-hover:border-indigo-500/50'}`}>
                      {isPinned && <div className="w-2.5 h-2.5 rounded-full bg-indigo-400" />}
                    </div>
                    <input
                      type="checkbox"
                      checked={isPinned}
                      onChange={(e) => setIsPinned(e.target.checked)}
                      className="hidden"
                    />
                    <span className="text-sm font-medium text-slate-300 group-hover:text-slate-100 transition-colors">Pin this link to the top</span>
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-[#0a1226] hover:bg-[#111c3b] border border-indigo-500/20 text-slate-300 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 
                  font-medium rounded-lg transition-all duration-300 
                  active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {loading ? 'Saving...' : linkToEdit ? 'Update Link' : 'Add Link'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default LinkForm;
