import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { X, Edit3, Tag, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

import { encryptData, decryptData } from '../utils/encryption';

const iconOptions = [
  { value: 'folder', label: 'Folder' },
  { value: 'grid', label: 'Grid' },
  { value: 'bookopen', label: 'BookOpen' },
  { value: 'code', label: 'Code' },
  { value: 'coffee', label: 'Coffee' },
  { value: 'film', label: 'Film' },
  { value: 'music', label: 'Music' },
  { value: 'link2', label: 'Link2' },
];

const colorOptions = [
  { value: 'text-blue-400', label: 'Blue', bg: 'bg-blue-400' },
  { value: 'text-green-400', label: 'Green', bg: 'bg-green-400' },
  { value: 'text-purple-400', label: 'Purple', bg: 'bg-purple-400' },
  { value: 'text-red-400', label: 'Red', bg: 'bg-red-400' },
  { value: 'text-yellow-400', label: 'Yellow', bg: 'bg-yellow-400' },
  { value: 'text-pink-400', label: 'Pink', bg: 'bg-pink-400' },
  { value: 'text-indigo-400', label: 'Indigo', bg: 'bg-indigo-400' },
  { value: 'text-gray-400', label: 'Gray', bg: 'bg-gray-400' },
];

const CategoryForm = ({ isOpen, onClose, onSuccess, existingCategories, categoryToEdit }) => {
  const { currentUser } = useAuth();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('folder');
  const [color, setColor] = useState('text-blue-400');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (categoryToEdit && isOpen) {
      // Data is already decrypted in the dashboard before passing to this form
      setName(categoryToEdit.name || '');
      setIcon(categoryToEdit.icon || 'folder');
      setColor(categoryToEdit.color || 'text-blue-400');
      setError('');
    } else if (!categoryToEdit && isOpen) {
      setName('');
      setIcon('folder');
      setColor('text-blue-400');
      setError('');
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
                  <label htmlFor="icon" className="block text-sm font-medium text-slate-300 mb-1">
                    Icon
                  </label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <select
                      id="icon"
                      value={icon}
                      onChange={(e) => setIcon(e.target.value)}
                      className="pl-10 w-full bg-[#0a1226] border border-indigo-500/20 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none transition-all"
                    >
                      {iconOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
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
