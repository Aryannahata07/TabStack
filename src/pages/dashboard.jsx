
import { useState, useEffect } from "react";
import { db, auth } from "../firebase/config";
import CategoryForm from "../components/CategoryForm";
import LinkForm from '../components/LinkForm';
import LinkList from "../components/LinkList";
import { motion, AnimatePresence } from "framer-motion";

import {
  FaPlus,
  FaSearch,
  FaRegFolderOpen,
  FaEllipsisV,
  FaBars,
} from "react-icons/fa";
import { FiLogOut } from "react-icons/fi";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { useAuth } from "../context/AuthContext";
import {
  Plus,
  Hash,
  Folder,
  Grid,
  BookOpen,
  Code,
  Coffee,
  Film,
  Music,
  Link2,
  Bookmark,
  X,
} from "lucide-react";
import {
  collection,
  getDocs,
  query,
  doc,
  deleteDoc,
} from "firebase/firestore";

import { decryptData } from "../utils/encryption";


export default function Dashboard() {
  const [selectedCategory, setSelectedCategory] = useState("All Links");
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [openMenuId, setOpenMenuId] = useState(null);
  const [isLinkFormOpen, setIsLinkFormOpen] = useState(false);
  const [linkToEdit, setLinkToEdit] = useState(null);
  const [categoryToEdit, setCategoryToEdit] = useState(null);
  const [linkCount, setLinkCount] = useState(0);
  const [sortOption, setSortOption] = useState("newest");
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Global click outside listener for dropdown menus
  useEffect(() => {
    const handleOutsideClick = (e) => {
      // Close category menu if clicked outside
      if (!e.target.closest('.category-menu-container')) {
        setOpenMenuId(null);
      }
      // Close profile menu if clicked outside
      if (!e.target.closest('.user-menu-container')) {
        setIsUserMenuOpen(false);
      }
      // Close sort menu if clicked outside
      if (!e.target.closest('.sort-menu-container')) {
        setIsSortMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  useEffect(() => {
    const fetchCategories = async () => {
      if (!currentUser?.uid) return;

      const q = query(collection(db, "users", currentUser.uid, "categories"));
      const snapshot = await getDocs(q);
      const fetched = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          name: decryptData(data.name, currentUser.uid)
        };
      });
      setCategories([
        { name: "All Links", icon: "Grid", color: "text-white", id: "all" },
        ...fetched,
      ]);
    };

    fetchCategories();
  }, [currentUser]);

  const getIconForCategory = (iconName = "Folder", color = "text-gray-400") => {
    const size = 18;
    const iconMap = {
      hash: <Hash className={`mr-2 ${color}`} size={size} />,
      folder: <Folder className={`mr-2 ${color}`} size={size} />,
      grid: <Grid className={`mr-2 ${color}`} size={size} />,
      bookopen: <BookOpen className={`mr-2 ${color}`} size={size} />,
      code: <Code className={`mr-2 ${color}`} size={size} />,
      coffee: <Coffee className={`mr-2 ${color}`} size={size} />,
      film: <Film className={`mr-2 ${color}`} size={size} />,
      music: <Music className={`mr-2 ${color}`} size={size} />,
      link2: <Link2 className={`mr-2 ${color}`} size={size} />,
    };

    return iconMap[iconName?.toLowerCase()] || (
      <Folder className={`mr-2 ${color}`} size={size} />
    );
  };


  const handleDeleteCategory = async (id) => {
    if (id === "all") return;
    await deleteDoc(doc(db, "users", currentUser.uid, "categories", id));
    setCategories((prev) => prev.filter((cat) => cat.id !== id));
  };

  return (
    <div className="flex h-screen bg-[#040b16] text-slate-300 font-sans selection:bg-indigo-500/30 relative overflow-hidden">
      {/* Global Background Glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[120%] h-[60%] bg-indigo-500/10 blur-[120px] pointer-events-none z-0 rounded-full"></div>
      
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-[#0a1226] lg:bg-[#0a1226]/40 lg:backdrop-blur-xl border-r border-indigo-500/10 p-4 flex flex-col 
        transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
        shadow-[4px_0_24px_-4px_rgba(0,0,0,0.5)] lg:shadow-none
        lg:translate-x-0 lg:static lg:inset-auto
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex gap-2 items-center justify-between px-2">
          <div className="flex gap-2 items-center">
            <img src="/favicon.png" alt="logo" className="h-8 w-8 object-contain" />
            <h1 className="text-3xl font-bold font-['Pacifico']">TabStack</h1>
          </div>
          <button
            className="lg:hidden text-zinc-400 hover:text-zinc-200 transition-all duration-200 p-1.5 rounded-lg hover:bg-white/5 active:scale-95 cursor-pointer"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Close Sidebar"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex items-center justify-between text-xs font-semibold tracking-wider mb-2 mt-8 text-zinc-500 px-2">
          <span className="uppercase">Categories</span>
          <button onClick={() => setIsAddCategoryOpen(true)} className="p-1 rounded-md hover:bg-white/10 transition-colors" aria-label="Add Category">
             <FaPlus className="cursor-pointer text-zinc-400 hover:text-zinc-200 transition-colors" />
          </button>
        </div>
        <ul className="space-y-2 overflow-y-auto flex-1">
          {categories.map((category) => (
            <li key={category.id} className="relative group">
              <button
                onClick={() => {
                  setSelectedCategory(category.name);
                  setIsSidebarOpen(false); // Close sidebar on selection on mobile
                }}
                className={`w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${selectedCategory === category.name
                  ? "bg-white/10 text-zinc-100 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]"
                  : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                  }`}
              >
                {getIconForCategory(category.icon, category.color)}
                <span className="ml-1 truncate flex-1 text-left">{category.name}</span>
              </button>
              {category.id !== "all" && (
                <div className="absolute right-2 top-2.5 category-menu-container opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-1 rounded-md hover:bg-white/10 transition-colors" onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === category.id ? null : category.id); }} aria-label="Category Options">
                    <FaEllipsisV className="text-slate-400 hover:text-slate-200" size={12} />
                  </button>
                  {openMenuId === category.id && (
                    <div className="absolute right-0 mt-1 w-32 rounded-lg bg-[#0a1226] shadow-2xl border border-indigo-500/10 z-50 overflow-hidden py-1">
                      <button
                        onClick={() => {
                          setCategoryToEdit(category);
                          setIsAddCategoryOpen(true);
                          setOpenMenuId(null);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-zinc-300 hover:bg-white/10 transition-colors"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-8 py-5 border-b border-indigo-500/10 bg-[#0a1226]/40 backdrop-blur-xl shadow-[0_4px_24px_-4px_rgba(0,0,0,0.3)] sticky top-0 z-30 gap-4">
          <div className="flex items-center flex-1 max-w-2xl">
            <button
              className="lg:hidden mr-4 text-zinc-400 hover:text-zinc-200 transition-all duration-200 p-2 rounded-lg hover:bg-white/5 active:scale-95 cursor-pointer"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Open Sidebar"
            >
              <FaBars size={24} />
            </button>
            <div className="flex items-center gap-2 bg-[#0a1226]/50 border border-indigo-500/10 px-4 py-2 rounded-xl w-full shadow-inner transition-all duration-300 focus-within:border-indigo-500/50 focus-within:ring-2 focus-within:ring-indigo-500/20">
              <FaSearch className="text-slate-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search links..."
                className="bg-transparent outline-none w-full text-slate-200 text-sm placeholder:text-slate-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <button
              onClick={() => {
                setLinkToEdit(null);
                setIsLinkFormOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 
                bg-indigo-500/10 hover:bg-indigo-500/20
                text-indigo-300 text-sm font-medium rounded-xl 
                transition-all duration-300 border border-indigo-500/20 active:scale-[0.98]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Add Link</span>
              <span className="sm:hidden">Add</span>
            </button>

            <div className="relative user-menu-container">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className={`group p-0.5 rounded-full bg-[#0a1226] border border-white/10 hover:border-white/20
                  transition-all duration-300 active:scale-[0.98] relative z-50
                  ${isUserMenuOpen ? 'ring-2 ring-indigo-500/50' : 'hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]'}`}
              >
                {currentUser?.photoURL ? (
                  <img src={currentUser.photoURL} alt="User" className="h-9 w-9 rounded-full border-2 border-gray-900" />
                ) : (
                  <div className="h-9 w-9 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <span className="font-semibold text-sm">
                      {currentUser?.displayName?.[0]?.toUpperCase() || currentUser?.email?.[0]?.toUpperCase()}
                    </span>
                  </div>
                )}
              </button>
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-3 w-56 rounded-xl shadow-2xl border border-indigo-500/10 py-1 bg-[#0a1226] backdrop-blur-xl z-50">
                  <div className="px-4 py-3 border-b border-indigo-500/10">
                    <p className="text-sm font-semibold text-slate-200 truncate">{currentUser?.displayName || "User"}</p>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{currentUser?.email}</p>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-2.5 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors mt-1"
                  >
                    <FiLogOut className="mr-2 h-4 w-4" /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Body */}

        <div className="p-4 sm:p-8 h-full overflow-y-auto relative z-10 scroll-smooth">
          <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h2 className="relative inline-flex items-center gap-3 text-3xl font-bold tracking-tight text-slate-100 group">
                <span className="transition-all duration-300 group-hover:text-indigo-400">
                  {selectedCategory}
                </span>
                <span className="text-sm font-medium px-2.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/10">
                  {linkCount}
                </span>
              </h2>
            </div>

            <div className="flex justify-start sm:justify-end relative sort-menu-container">
              <button
                onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                className="flex items-center justify-between gap-2 bg-[#0a1226]/40 backdrop-blur-xl text-slate-200 px-4 py-2.5 rounded-xl text-sm shadow-[0_4px_15px_-3px_rgba(0,0,0,0.2)] border border-indigo-500/20 hover:border-indigo-500/40 hover:bg-[#0a1226]/60 focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all duration-300 w-full sm:w-[220px]"
              >
                <span className="truncate">
                  {sortOption === "az" ? "Title: A → Z" :
                   sortOption === "za" ? "Title: Z → A" :
                   sortOption === "newest" ? "Recently Added: New → Old" :
                   "Recently Added: Old → New"}
                </span>
                <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isSortMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <AnimatePresence>
                {isSortMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full right-0 mt-2 w-full sm:w-[220px] rounded-xl bg-[#040b16]/95 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.5)] border border-indigo-500/20 py-1.5 z-50 overflow-hidden"
                  >
                    {[
                      { value: "newest", label: "Recently Added: New → Old" },
                      { value: "oldest", label: "Recently Added: Old → New" },
                      { value: "az", label: "Title: A → Z" },
                      { value: "za", label: "Title: Z → A" }
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSortOption(option.value);
                          setIsSortMenuOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${sortOption === option.value ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-300 hover:bg-white/5'}`}
                      >
                        {option.label}
                        {sortOption === option.value && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <LinkList
            selectedCategoryId={categories.find(c => c.name === selectedCategory)?.id}
            searchQuery={searchQuery}
            setLinkToEdit={setLinkToEdit}
            setIsLinkFormOpen={setIsLinkFormOpen}
            onCountChange={setLinkCount}
            sortOption={sortOption}
          />
        </div>


      </main>

      {/* Modal */}
      <CategoryForm
        isOpen={isAddCategoryOpen}
        onClose={() => {
          setIsAddCategoryOpen(false);
          setCategoryToEdit(null);
        }}
        existingCategories={categories}
        categoryToEdit={categoryToEdit}
        onSuccess={(updatedCat) => {
          if (categoryToEdit) {
            setCategories((prev) =>
              prev.map((cat) => (cat.id === updatedCat.id ? updatedCat : cat))
            );
          } else {
            setCategories((prev) => [...prev, updatedCat]);
          }
          setIsAddCategoryOpen(false);
          setCategoryToEdit(null);
        }}
      />


      <LinkForm
        isOpen={isLinkFormOpen}
        onClose={() => setIsLinkFormOpen(false)}
        onSuccess={(newCat) => {
          setIsLinkFormOpen(false);
          setLinkToEdit(null);
          if (newCat) {
            setCategories((prev) => [...prev, newCat]);
          }
        }}
        categories={categories}
        initialCategoryId={selectedCategory}  // if you're tracking selected category
        linkToEdit={linkToEdit}
      />

    </div>
  );
}