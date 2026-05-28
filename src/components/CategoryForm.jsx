import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { X, Edit3, Tag, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

import { encryptData, decryptData } from '../utils/encryption';
import { colorOptions, iconOptions, iconMap } from '../utils/constants';
import { useKeyboardSelect } from '../hooks/useKeyboardSelect';

const CategoryForm = ({ isOpen, onClose, onSuccess, existingCategories, categoryToEdit }) => {
  const { currentUser } = useAuth();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('folder');
  const [color, setColor] = useState('text-blue-400');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isIconMenuOpen, setIsIconMenuOpen] = useState(false);

  // Refs for keyboard navigation
  const triggerRef = useRef(null);
  const listRef = useRef(null);

  const {
    highlightedIndex,
    setHighlightedIndex,
    handleKeyDown
  } = useKeyboardSelect({
    isOpen: isIconMenuOpen,
    setIsOpen: setIsIconMenuOpen,
    options: iconOptions,
    selectedValue: icon,
    onSelect: setIcon,
    triggerRef,
    listRef,
  });

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.icon-menu-container')) {
        setIsIconMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (categoryToEdit && isOpen) {
      // Data is already decrypted in the dashboard before passing to this form
      setName(categoryToEdit.name || '');
      setIcon(categoryToEdit.icon || 'folder');
      setColor(categoryToEdit.color || 'text-blue-400');
      setError('');
      setIsIconMenuOpen(false);
    } else if (!categoryToEdit && isOpen) {
      setName('');
      setIcon('folder');
      setColor('text-blue-400');
      setError('');
      setIsIconMenuOpen(false);
    }
  }, [categoryToEdit, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentUser) {
      setError('You must be logged in to add categories');
      return;
    }

    if (!name.trim()) {
      setError('Category name is required');
      return;
    }

    const nameExists = existingCategories.some(
      (cat) => cat.name.toLowerCase() === name.trim().toLowerCase() &&
        (!categoryToEdit || cat.id !== categoryToEdit.id)
    );

    if (nameExists) {
      setError('A category with this name already exists');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const categoryData = {
        name: encryptData(name.trim(), currentUser.uid),
        icon,
        color,
      };

      if (categoryToEdit) {
        await updateDoc(doc(db, 'users', currentUser.uid, 'categories', categoryToEdit.id), categoryData);
        // Important: success callback expects decrypted data to update UI immediately
        onSuccess({ id: categoryToEdit.id, ...categoryToEdit, name: name.trim(), icon, color });
        toast.success('Category updated successfully!');
      } else {
        categoryData.order = existingCategories.length;
        const docRef = await addDoc(
          collection(db, 'users', currentUser.uid, 'categories'),
          categoryData
        );
        onSuccess({ id: docRef.id, ...categoryData, name: name.trim() });
        toast.success('Category created successfully!');
      }
    } catch (err) {
      setError(err.message || 'Failed to save category');
      toast.error('Failed to save category');
    } finally {
      // Ensure loading state is reset after completion
      setLoading(false);
      onClose();
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
                  {categoryToEdit ? 'Edit Category' : 'Add New Category'}
                </h2>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-200 transition-colors">
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
                  <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1">
                    Category Name
                  </label>
                  <div className="relative">
                    <Edit3 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10 w-full bg-[#0a1226] border border-indigo-500/20 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                      placeholder="e.g., Work, Education, Entertainment"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Icon
                  </label>
                  <div className="relative icon-menu-container">
                    <button
                      ref={triggerRef}
                      type="button"
                      role="combobox"
                      aria-expanded={isIconMenuOpen}
                      aria-haspopup="listbox"
                      onKeyDown={handleKeyDown}
                      onClick={() => setIsIconMenuOpen(!isIconMenuOpen)}
                      className={`w-full flex items-center justify-between bg-[#0a1226] border rounded-lg py-2 px-3 text-sm text-slate-200 outline-none transition-all duration-300 relative z-10
                        ${isIconMenuOpen ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-indigo-500/20 hover:border-indigo-500/40'}
                      `}
                    >
                      <div className="flex items-center gap-2.5">
                        {(() => {
                          const SelectedIconComp = iconMap[icon.toLowerCase()] || iconMap.folder;
                          return <SelectedIconComp className="h-4 w-4 text-indigo-400" />;
                        })()}
                        <span className="truncate">
                          {iconOptions.find(o => o.value === icon)?.label || 'Folder'}
                        </span>
                      </div>
                      <svg className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${isIconMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    <AnimatePresence>
                      {isIconMenuOpen && (
                        <motion.div
                          ref={listRef}
                          role="listbox"
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.15 }}
                          className="absolute top-full left-0 mt-1.5 w-full rounded-xl bg-[#040b16]/95 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.5)] border border-indigo-500/20 py-1.5 z-30 max-h-[180px] overflow-y-auto"
                        >
                           {iconOptions.map((option, idx) => {
                            const IconComp = iconMap[option.value.toLowerCase()] || iconMap.folder;
                            const isSelected = icon === option.value;
                            const isHighlighted = highlightedIndex === idx;
                            return (
                              <button
                                key={option.value}
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                tabIndex={-1}
                                onMouseEnter={() => setHighlightedIndex(idx)}
                                onClick={() => {
                                  setIcon(option.value);
                                  setIsIconMenuOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center justify-between group ${isSelected ? 'bg-indigo-500/20 text-indigo-300' : isHighlighted ? 'bg-white/10 text-slate-200' : 'text-slate-300'}`}
                              >
                                <div className="flex items-center gap-2.5">
                                  <IconComp className="h-4 w-4 text-slate-400 group-hover:text-indigo-400 transition-colors" />
                                  <span className="truncate">{option.label}</span>
                                </div>
                                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.5)]"></span>}
                              </button>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Color
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {colorOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setColor(option.value)}
                        className={`h-10 rounded-md flex items-center justify-center transition-all ${color === option.value ? 'ring-2 ring-white scale-110' : 'ring-1 ring-indigo-500/20 hover:ring-indigo-500/40 hover:bg-white/5'
                          }`}
                      >
                        <div className={`w-6 h-6 rounded-full ${option.bg} shadow-lg`}></div>
                      </button>
                    ))}
                  </div>
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
                    {loading ? 'Saving...' : (categoryToEdit ? 'Save Changes' : 'Create Category')}
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

export default CategoryForm;
