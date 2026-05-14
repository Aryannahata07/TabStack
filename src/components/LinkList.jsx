// components/LinkList.jsx
import { useState, useEffect } from "react";
import { db } from "../firebase/config";
import {
  collection,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { Bookmark, Pencil, Trash2, Link2, Copy, Check, Pin } from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { decryptData } from "../utils/encryption";

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
  const [copiedId, setCopiedId] = useState(null);
  const { currentUser } = useAuth();

  const handleDelete = async (linkId) => {
    try {
      await deleteDoc(doc(db, "users", currentUser.uid, "links", linkId));
      // No need to manually remove it — onSnapshot will update automatically
    } catch (error) {
      console.error("Error deleting link:", error);
    }
  };

  const togglePin = async (link) => {
    try {
      const linkRef = doc(db, "users", currentUser.uid, "links", link.id);
      await updateDoc(linkRef, {
        isPinned: !link.isPinned
      });
      toast.success(link.isPinned ? "Link unpinned" : "Link pinned");
    } catch (error) {
      console.error("Error toggling pin:", error);
      toast.error("Failed to update pin status");
    }
  };

  useEffect(() => {
    if (!currentUser?.uid) return;

    setLoading(true);
    const ref = collection(db, "users", currentUser.uid, "links");

    const unsubscribe = onSnapshot(ref, (snapshot) => {
      let fetched = snapshot.docs.map(doc => {
        const data = doc.data();
        const uid = currentUser.uid;
        return {
          id: doc.id,
          ...data,
          title: decryptData(data.title, uid),
          url: decryptData(data.url, uid),
          description: decryptData(data.description, uid)
        };
      });

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

      // Force pinned items to top
      fetched.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return 0; // maintain relative order
      });

      setLinks(fetched);
      onCountChange?.(fetched.length);
      setLoading(false);
    }, (err) => {
      console.error("Real-time listener error:", err);
      setLoading(false);
    });

    return () => unsubscribe(); // Cleanup on unmount
  }, [currentUser, selectedCategoryId, searchQuery, sortOption]);

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
          className="flex flex-col bg-gray-800 rounded-xl p-4 shadow-md border border-gray-700 transform transition-all duration-300 hover:scale-[1.03] hover:shadow-xl hover:border-blue-600"
        >
          <div className="flex items-center gap-3 mb-2">
            {link.favicon ? (
              <img
                src={link.favicon}
                alt=""
                className="w-5 h-5 rounded-sm bg-white/10 p-0.5 object-contain"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : (
              <Link2 className="w-5 h-5 text-gray-500" />
            )}
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-shadow-gray-100 hover:underline text-sm font-bold truncate flex-1"
            >
              {link.title}
            </a>
            <button
              onClick={(e) => {
                e.preventDefault();
                navigator.clipboard.writeText(link.url);
                toast.success("Link copied!");
                setCopiedId(link.id);
                setTimeout(() => setCopiedId(null), 3000);
              }}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-colors flex-shrink-0"
              title="Copy Link"
            >
              {copiedId === link.id ? (
                <Check size={14} className="text-green-400" />
              ) : (
                <Copy size={14} />
              )}
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                togglePin(link);
              }}
              className={`p-1.5 rounded-md transition-colors flex-shrink-0 ${link.isPinned ? 'text-blue-400 bg-blue-400/10 hover:bg-blue-400/20' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
              title={link.isPinned ? "Unpin Link" : "Pin Link"}
            >
              <Pin size={14} className={link.isPinned ? "fill-current" : ""} />
            </button>
          </div>

          <p className="text-gray-400 text-xs line-clamp-2 mb-2 flex-1">
            {link.description}
          </p>

          <div className="flex justify-end gap-2 mt-auto pt-3">
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
