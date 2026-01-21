// components/LinkList.jsx
import { useState, useEffect } from "react";
import { db } from "../firebase/config";
import {
  collection,
  onSnapshot,
  deleteDoc,
  doc
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { Bookmark } from "lucide-react";
import { motion } from "framer-motion";
import { Pencil, Trash2 } from "lucide-react";

export default function LinkList({
  selectedCategoryId,
  searchQuery,
  setLinkToEdit,
  setIsLinkFormOpen,
  onCountChange,
  sortOption
}) {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  const handleDelete = async (linkId) => {
    try {
      await deleteDoc(doc(db, "users", currentUser.uid, "links", linkId));
      // No need to manually remove it — onSnapshot will update automatically
    } catch (error) {
      console.error("Error deleting link:", error);
    }
  };

  useEffect(() => {
    if (!currentUser?.uid) return;

    setLoading(true);
    const ref = collection(db, "users", currentUser.uid, "links");

    const unsubscribe = onSnapshot(ref, (snapshot) => {
      let fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (selectedCategoryId && selectedCategoryId !== "all") {
          fetched = fetched.filter(link => link.categoryId === selectedCategoryId);
      }

      if (searchQuery) {
        fetched = fetched.filter(link =>
          link.title.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      if (sortOption === "az") {
        fetched.sort((a, b) => a.title.localeCompare(b.title));
      } else if (sortOption === "za") {
        fetched.sort((a, b) => b.title.localeCompare(a.title));
      } else if (sortOption === "oldest") {
        fetched.sort((a, b) => a.createdAt - b.createdAt);
      } else { // newest
        fetched.sort((a, b) => b.createdAt - a.createdAt);
      }
      setLinks(fetched);
      onCountChange?.(fetched.length);
      setLoading(false);
    }, (err) => {
      console.error("Real-time listener error:", err);
      setLoading(false);
    });

    return () => unsubscribe(); // Cleanup on unmount
  }, [currentUser, selectedCategoryId, searchQuery , sortOption]);

  if (loading) return <div className="text-white p-6">Loading...</div>;

  if (links.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[80%] text-center">
        <Bookmark className="h-16 w-16 text-blue-500 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">
          No links yet <br />
          <span className="text-sm text-gray-400">
            Start adding your favorite links to keep them organized
          </span>
        </h2>
      </div>
    );
  }

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {links.map((link) => (
        <motion.div
          key={link.id}
          initial={{ rotateY: 90, opacity: 0 }}
          animate={{ rotateY: 0, opacity: 1 }}
          transition={{ duration: 0.05, ease: "easeOut" }}
          className="bg-gray-800 rounded-xl p-4 shadow-md border border-gray-700 transform transition-all duration-300 hover:scale-[1.03] hover:shadow-xl hover:border-blue-600"
        >
          <div className="flex items-center gap-3 mb-2">
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-shadow-gray-100 hover:underline text-sm font-bold truncate"
            >
              {link.title}
            </a>
          </div>

          <p className="text-gray-400 text-xs truncate mb-2">
            {link.description}
          </p>

          <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => {
                  setLinkToEdit(link);
                  setIsLinkFormOpen(true);
                }}
                className="flex items-center gap-1 border border-blue-500 text-blue-400 hover:bg-blue-600/10 px-2 py-1 text-xs rounded-md transition-all"
              >
                <Pencil size={14} />
                Edit
              </button>
              <button
                onClick={() => handleDelete(link.id)}
                className="flex items-center gap-1 border border-red-500 text-red-400 hover:bg-red-600/10 px-2 py-1 text-xs rounded-md transition-all"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>

        </motion.div>
      ))}
    </div>
  );
}
