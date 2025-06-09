import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { X, Globe, Edit3, Layout, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

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
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (linkToEdit) {
      setUrl(linkToEdit.url);
      setTitle(linkToEdit.title);
      setDescription(linkToEdit.description || '');
      setCategoryId(linkToEdit.categoryId);
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

      let formattedUrl = url;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        formattedUrl = `https://${url}`;
      }

      const favicon = getFavicon(formattedUrl);
      const timestamp = Date.now();

      if (linkToEdit) {
        const linkRef = doc(db, "users", currentUser.uid, "links", linkToEdit.id);
        await updateDoc(linkRef, {
          url: formattedUrl,
          title: title.trim(),
          description: description.trim(),
          categoryId,
          favicon,
          updatedAt: timestamp
        });
        toast.success('Link updated successfully');
      } else {
        await addDoc(collection(db, "users", currentUser.uid, "links"), {
            url: formattedUrl,
            title: title.trim(),
            description: description.trim(),
            categoryId: categoryId.trim(),
            favicon,
            createdAt: timestamp,
            updatedAt: timestamp
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/70 transition-opacity" onClick={onClose}></div>

        <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-gray-900 p-6 shadow-xl transition-all">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">
              {linkToEdit ? 'Edit Link' : 'Add New Link'}
            </h2>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-white"
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
              <label htmlFor="url" className="block text-sm font-medium text-gray-300 mb-1">
                URL
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="url"
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="pl-10 w-full bg-gray-800 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1">
                Title
              </label>
              <div className="relative">
                <Edit3 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="pl-10 w-full bg-gray-800 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="My favorite website"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">
                Description (optional)
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="A brief description of this link"
                rows={3}
              />
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-300 mb-1">
                Category
              </label>
              <div className="relative">
                <Layout className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  id="category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="pl-10 w-full bg-gray-800 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                  required
                >
                  <option value="" disabled>Select a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
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
                {loading ? 'Saving...' : linkToEdit ? 'Update Link' : 'Add Link'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LinkForm;
