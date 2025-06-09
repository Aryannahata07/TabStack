import React, { useState } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { X, Edit3, Tag, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

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

const CategoryForm = ({ isOpen, onClose, onSuccess, existingCategories }) => {
  const { currentUser } = useAuth();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('folder');
  const [color, setColor] = useState('text-blue-400');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    (cat) => cat.name.toLowerCase() === name.trim().toLowerCase()
  );

  if (nameExists) {
    setError('A category with this name already exists');
    return;
  }

  try {
    setLoading(true);
    setError('');

    const newCategory = {
      name: name.trim(),
      icon,
      color,
      order: existingCategories.length,
    };

    // Create category in Firestore
    const docRef = await addDoc(
      collection(db, 'users', currentUser.uid, 'categories'),
      newCategory
    );

    // Update local state and close form
    onSuccess({ id: docRef.id, ...newCategory });

    toast.success('Category created successfully!');
  } catch (err) {
    setError(err.message || 'Failed to create category');
    toast.error('Failed to create category');
  } finally {
    // Ensure loading state is reset after completion
    setLoading(false);
    onClose();
  }
};
    

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/70 transition-opacity" onClick={onClose}></div>

        <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-gray-900 p-6 shadow-xl transition-all">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Add New Category</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
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
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
                Category Name
              </label>
              <div className="relative">
                <Edit3 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10 w-full bg-gray-800 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Work, Education, Entertainment"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="icon" className="block text-sm font-medium text-gray-300 mb-1">
                Icon
              </label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  id="icon"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  className="pl-10 w-full bg-gray-800 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                >
                  {iconOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
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
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Color
              </label>
              <div className="grid grid-cols-4 gap-2">
                {colorOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setColor(option.value)}
                    className={`h-10 rounded-md flex items-center justify-center ${
                      color === option.value ? 'ring-2 ring-white' : 'ring-1 ring-gray-700'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full ${option.bg}`}></div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Category'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CategoryForm;
