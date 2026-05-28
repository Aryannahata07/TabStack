import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { X, Globe, Edit3, Layout, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

import { encryptData } from '../utils/encryption';
import { colorOptions, iconMap } from '../utils/constants';
import { useKeyboardSelect } from '../hooks/useKeyboardSelect';

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

  // New Category states
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('folder');
  const [newCategoryColor, setNewCategoryColor] = useState('text-blue-400');
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);

  // Refs for keyboard navigation
  const triggerRef = useRef(null);
  // listRef points at the inner scrollable div so scrollIntoView works correctly
  const listRef = useRef(null);

  // Options list for dropdown keyboard navigation
  const dropdownOptions = [
    ...categories.filter(c => c.id !== 'all').map(c => ({ id: c.id, name: c.name })),
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
    if (linkToEdit) {
      // Data is already decrypted in the LinkList before passing to this form
      setUrl(linkToEdit.url);
      setTitle(linkToEdit.title);
      setDescription(linkToEdit.description || '');
      setCategoryId(linkToEdit.categoryId);
      setIsPinned(linkToEdit.isPinned || false);
    } else {
      const realCategories = categories.filter(c => c.id !== 'all');
      if (initialCategoryId) {
        const matched = realCategories.find(
          (c) => c.id === initialCategoryId || c.name === initialCategoryId
        );
        if (matched) {
          setCategoryId(matched.id);
        } else if (realCategories.length > 0) {
          setCategoryId(realCategories[0].id);
        }
      } else if (realCategories.length > 0) {
        setCategoryId(realCategories[0].id);
      }
    }
  }, [linkToEdit, initialCategoryId, categories, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setUrl('');
      setTitle('');
      setDescription('');
      setCategoryId('');
      setIsPinned(false);
      setError('');
      setNewCategoryName('');
      setNewCategoryIcon('folder');
      setNewCategoryColor('text-blue-400');
      setIsCategoryMenuOpen(false);
    }
  }, [isOpen]);

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

    try {
      setLoading(true);
      setError('');

      let formattedUrl = url.trim();
      if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
        formattedUrl = `https://${formattedUrl}`;
      }

      const favicon = getFavicon(formattedUrl);
      const timestamp = Date.now();

      let finalCategoryId = categoryId;
      let createdCategory = null;

      if (categoryId === 'new_category') {
        const categoryData = {
          name: encryptData(newCategoryName.trim(), currentUser.uid),
          icon: newCategoryIcon,
          color: newCategoryColor,
          order: categories.length
        };
        const catRef = await addDoc(
          collection(db, 'users', currentUser.uid, 'categories'),
          categoryData
        );
        finalCategoryId = catRef.id;
        createdCategory = {
          id: catRef.id,
          ...categoryData,
          name: newCategoryName.trim()
        };
      }

      const linkData = {
        url: encryptData(formattedUrl, currentUser.uid),
        title: encryptData(title.trim(), currentUser.uid),
        description: encryptData(description.trim(), currentUser.uid),
        categoryId: finalCategoryId,
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

      onSuccess(createdCategory);
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
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Category
                  </label>
                  <div className="relative category-menu-container">
                    <button
                      ref={triggerRef}
                      type="button"
                      role="combobox"
                      aria-expanded={isCategoryMenuOpen}
                      aria-haspopup="listbox"
                      onKeyDown={handleKeyDown}
                      onClick={() => setIsCategoryMenuOpen(!isCategoryMenuOpen)}
                      className={`w-full flex items-center justify-between bg-[#0a1226] border rounded-lg py-2 px-3 text-sm text-slate-200 outline-none transition-all duration-300 relative z-10
                        ${isCategoryMenuOpen ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-indigo-500/20 hover:border-indigo-500/40'}
                      `}
                    >
                      <span className="truncate">
                        {categoryId === 'new_category' ? 'Add New Category...' : (categories.find(c => c.id === categoryId)?.name || 'Select a category')}
                      </span>
                      <svg className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${isCategoryMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    <AnimatePresence>
                      {isCategoryMenuOpen && (
                        <motion.div
                          role="listbox"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 8 }}
                          transition={{ duration: 0.15 }}
                          className="absolute bottom-full left-0 mb-1.5 w-full rounded-xl bg-[#040b16]/95 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.5)] border border-indigo-500/20 py-1.5 z-30 flex flex-col"
                        >
                          {/* listRef on the inner scrollable div so scrollIntoView works */}
                          <div ref={listRef} className="max-h-[160px] overflow-y-auto">
                            {categories.filter(c => c.id !== 'all').map((category, idx) => {
                              const isSelected = categoryId === category.id;
                              const isHighlighted = highlightedIndex === idx;
                              return (
                                <button
                                  key={category.id}
                                  type="button"
                                  role="option"
                                  aria-selected={isSelected}
                                  tabIndex={-1}
                                  onMouseEnter={() => setHighlightedIndex(idx)}
                                  onClick={() => {
                                    setCategoryId(category.id);
                                    setIsCategoryMenuOpen(false);
                                  }}
                                  className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center justify-between group ${isSelected ? 'bg-indigo-500/20 text-indigo-300' : isHighlighted ? 'bg-white/10 text-slate-200' : 'text-slate-300'}`}
                                >
                                  <span className="truncate">{category.name}</span>
                                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.5)]"></span>}
                                </button>
                              );
                            })}
                          </div>

                          <div className="border-t border-indigo-500/10 mt-1 pt-1.5" />

                          <button
                            type="button"
                            role="option"
                            aria-selected={categoryId === 'new_category'}
                            tabIndex={-1}
                            onMouseEnter={() => setHighlightedIndex(categories.filter(c => c.id !== 'all').length)}
                            onClick={() => {
                              setCategoryId('new_category');
                              setIsCategoryMenuOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-sm font-semibold transition-colors flex items-center justify-between ${categoryId === 'new_category' ? 'bg-indigo-500/20 text-indigo-300' : highlightedIndex === categories.filter(c => c.id !== 'all').length ? 'bg-white/10 text-slate-200' : 'text-indigo-400'}`}
                          >
                            <span>Add New Category...</span>
                            {categoryId === 'new_category' && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.5)]"></span>}
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <AnimatePresence>
                  {categoryId === 'new_category' && (
                    <motion.div
                      initial={{ height: 0, opacity: 0, marginTop: 0 }}
                      animate={{ height: 'auto', opacity: 1, marginTop: 12 }}
                      exit={{ height: 0, opacity: 0, marginTop: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden border border-indigo-500/20 bg-[#0a1226]/50 rounded-xl p-4 space-y-4"
                    >
                      <div>
                        <label htmlFor="newCategoryName" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                          New Category Name
                        </label>
                        <div className="relative">
                          <Edit3 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <input
                            id="newCategoryName"
                            type="text"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            className="pl-9 w-full bg-[#0a1226] border border-indigo-500/20 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm"
                            placeholder="e.g. Reference, Entertainment"
                            required={categoryId === 'new_category'}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Icon</span>
                          <div className="grid grid-cols-4 gap-1.5 bg-[#040b16] p-1.5 rounded-lg border border-indigo-500/10">
                            {Object.entries(iconMap).map(([key, IconComponent]) => (
                              <button
                                key={key}
                                type="button"
                                onClick={() => setNewCategoryIcon(key)}
                                className={`p-1.5 rounded-md flex items-center justify-center transition-all ${newCategoryIcon === key ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent'}`}
                                title={key}
                              >
                                <IconComponent className="h-4 w-4" />
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Color</span>
                          <div className="grid grid-cols-4 gap-1.5 bg-[#040b16] p-1.5 rounded-lg border border-indigo-500/10">
                            {colorOptions.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => setNewCategoryColor(option.value)}
                                className={`h-7 w-7 rounded-full flex items-center justify-center transition-all ${newCategoryColor === option.value ? 'ring-2 ring-white scale-105' : 'hover:scale-105'}`}
                              >
                                <div className={`w-4 h-4 rounded-full ${option.bg} shadow-md`}></div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

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
