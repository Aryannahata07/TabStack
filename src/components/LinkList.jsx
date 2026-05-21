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
import { Bookmark, Pencil, Trash2, Link2, Copy, Check, Pin, SearchX } from "lucide-react";
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
    if (searchQuery) {
      return (
        <div className="flex flex-col items-center justify-center h-[80%] text-center opacity-80">
          <SearchX className="h-16 w-16 text-indigo-500/50 mb-4 drop-shadow-lg" />
          <h2 className="text-2xl font-bold text-zinc-300 mb-2">
            No results found
          </h2>
          <p className="text-sm text-zinc-500 font-medium max-w-md">
            We couldn't find any links matching "{searchQuery}". Try a different keyword or spelling.
          </p>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-[80%] text-center opacity-80">
        <Bookmark className="h-16 w-16 text-indigo-500/50 mb-4 drop-shadow-lg" />
        <h2 className="text-2xl font-bold text-zinc-300 mb-2">
          No links yet <br />
          <span className="text-sm text-zinc-500 font-medium">
            Start adding your favorite links to keep them organized
          </span>
        </h2>
      </div>
    );
  }

  return (
    <motion.div 
      key={selectedCategoryId || "all"}
      variants={{
        hidden: { opacity: 0 },
        show: {
          opacity: 1,
          transition: { staggerChildren: 0.04 }
        }
      }}
      initial="hidden"
      animate="show"
      className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      {links.map((link) => (
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 15, scale: 0.98 },
            show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.25, ease: "easeOut" } }
          }}
          key={link.id}
          className="flex flex-col bg-[#0a1226]/60 backdrop-blur-md rounded-xl p-4 shadow-[0_4px_15px_-3px_rgba(0,0,0,0.3)] border border-indigo-500/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_25px_-5px_rgba(99,102,241,0.2)] hover:border-indigo-400/30 hover:bg-[#0a1226]"
        >
          <div className="flex items-center gap-2 mb-2">
            {link.favicon ? (
              <img
                src={link.favicon}
                alt=""
                className="w-6 h-6 rounded-md bg-white/5 p-1 object-contain border border-white/5 shadow-sm"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : (
              <div className="w-6 h-6 rounded-md bg-white/5 p-1 flex items-center justify-center border border-white/5 shadow-sm">
                <Link2 className="w-4 h-4 text-zinc-500" />
              </div>
            )}
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-100 hover:text-indigo-400 hover:underline text-sm font-semibold truncate flex-1 transition-colors"
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
              className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-white/10 rounded-lg transition-all active:scale-95 flex-shrink-0"
              title="Copy Link"
            >
              {copiedId === link.id ? (
                <Check size={16} className="text-emerald-400" />
              ) : (
                <Copy size={16} />
              )}
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                togglePin(link);
              }}
              className={`p-1.5 rounded-lg transition-all active:scale-95 flex-shrink-0 ${link.isPinned ? 'text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20' : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/10'}`}
              title={link.isPinned ? "Unpin Link" : "Pin Link"}
            >
              <Pin size={16} className={link.isPinned ? "fill-current" : ""} />
            </button>
          </div>

          <p className="text-slate-400 text-xs leading-relaxed line-clamp-2 mb-3 flex-1">
            {link.description}
          </p>

          <div className="flex justify-end gap-2 mt-auto pt-3 border-t border-indigo-500/10">
            <button
              onClick={() => {
                setLinkToEdit(link);
                setIsLinkFormOpen(true);
              }}
              className="flex items-center gap-1.5 bg-white/5 border border-white/5 text-zinc-300 hover:bg-white/10 hover:text-white px-2.5 py-1.5 text-xs rounded-lg transition-all active:scale-95 font-medium"
            >
              <Pencil size={13} />
              Edit
            </button>
            <button
              onClick={() => handleDelete(link.id)}
              className="flex items-center gap-1.5 bg-red-500/5 border border-red-500/10 text-red-400 hover:bg-red-500/10 hover:text-red-300 px-2.5 py-1.5 text-xs rounded-lg transition-all active:scale-95 font-medium"
            >
              <Trash2 size={13} />
              Delete
            </button>
          </div>

        </motion.div>
      ))}
    </motion.div>
  );
}
