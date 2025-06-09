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

export default function LinkList({
  selectedCategoryId,
  searchQuery,
  setLinkToEdit,
  setIsLinkFormOpen
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

      if (selectedCategoryId && selectedCategoryId !== "All Links") {
        fetched = fetched.filter(link => link.categoryId === selectedCategoryId);
      }

      if (searchQuery) {
        fetched = fetched.filter(link =>
          link.title.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      setLinks(fetched);
      setLoading(false);
    }, (err) => {
      console.error("Real-time listener error:", err);
      setLoading(false);
    });

    return () => unsubscribe(); // Cleanup on unmount
  }, [currentUser, selectedCategoryId, searchQuery]);

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
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
      {links.map((link) => (
        <div
          key={link.id}
          className="bg-gray-800 rounded-xl p-4 shadow hover:shadow-lg transition border border-gray-700"
        >
          <div className="flex items-center gap-3 mb-2">
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:underline text-sm font-semibold truncate"
            >
              {link.title}
            </a>
          </div>

          <p className="text-gray-400 text-xs truncate mb-3">
            {link.description}
          </p>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setLinkToEdit(link);
                setIsLinkFormOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded transition"
            >
              Edit
            </button>
            <button
              onClick={() => handleDelete(link.id)}
              className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 rounded transition"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
