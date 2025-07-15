
import { useState, useEffect } from "react";
import { db, auth } from "../firebase/config";
import CategoryForm from "../components/CategoryForm";
import LinkForm from '../components/LinkForm'; 
import LinkList from "../components/LinkList";

import {
  FaPlus,
  FaSearch,
  FaRegFolderOpen,
  FaEllipsisV,
} from "react-icons/fa";
import { FiLogOut, FiUser, FiSettings } from "react-icons/fi";
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
} from "lucide-react";
import {
  collection,
  getDocs,
  query,
  doc,
  deleteDoc,
} from "firebase/firestore";


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
      const fetched = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
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
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 p-4 flex flex-col">
        <div className="flex gap-2">
        <img src="/favicon.png" alt="logo" className="h-8 w-8 object-contain" />
        <h1 className="text-3xl mb-6 font-bold font-['Pacifico']">TabStack</h1>
        </div>
        <div className="flex items-center justify-between text-sm mb-2 text-gray-400">
          <span className="uppercase">Categories</span>
          <FaPlus className="cursor-pointer hover:text-white" onClick={() => setIsAddCategoryOpen(true)} />
        </div>
        <ul className="space-y-2 overflow-y-auto">
          {categories.map((category) => (
            <li key={category.id} className="relative group">
              <button
                onClick={() => setSelectedCategory(category.name)}
                className={`w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === category.name
                    ? "bg-gray-700 text-white"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }`}
              >
                {getIconForCategory(category.icon, category.color)}
                <span className="ml-1 truncate flex-1 text-left">{category.name}</span>
              </button>
              {category.id !== "all" && (
                <div className="absolute right-2 top-2">
                  <button onClick={() => setOpenMenuId(openMenuId === category.id ? null : category.id)}>
                    <FaEllipsisV className="text-gray-400 hover:text-white" size={12} />
                  </button>
                  {openMenuId === category.id && (
                    <div className="absolute right-0 mt-2 w-32 rounded bg-gray-800 shadow-lg z-10">
                      <button
                          onClick={() => {
                            setCategoryToEdit(category);
                            setIsAddCategoryOpen(true);
                            setOpenMenuId(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700"
                        >
                          Edit
                        </button>

                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-700"
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
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 bg-gray-900 relative">
          <div className="flex-1 flex justify-center ">
            <div className="flex items-center gap-2 bg-gray-700 px-3 py-1.5 rounded-lg w-full max-w-md">
              <FaSearch className="text-gray-400" />
              <input
                type="text"
                placeholder="Search links..."
                className="bg-transparent outline-none w-full text-white text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-4 ml-auto">
            <button
              onClick={() => {
                setLinkToEdit(null);
                setIsLinkFormOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-900 to-pink-800
                text-white
                shadow-lg               
                transition-all duration-300
                transform hover:scale-105"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Link
            </button>

            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="p-2 rounded-full bg-gray-800 hover:bg-gray-700"
              >
                {currentUser?.photoURL ? (
                  <img src={currentUser.photoURL} alt="User" className="h-8 w-8 rounded-full" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-900 to-pink-800
                    text-white
                    shadow-lg
                    transition-all duration-300
                    transform hover:scale-105 flex items-center justify-center">
                    <span className="text-white font-medium">
                      {currentUser?.displayName?.[0]?.toUpperCase() || currentUser?.email?.[0]?.toUpperCase()}
                    </span>
                  </div>
                )}
              </button>
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-gray-800 ring-1 ring-black ring-opacity-5 z-10">
                  <div className="px-4 py-2 border-b border-gray-700">
                    <p className="text-sm font-medium text-white truncate">{currentUser?.displayName || "User"}</p>
                    <p className="text-xs text-gray-400 truncate">{currentUser?.email}</p>
                  </div>
                  <button className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">
                    <FiUser className="mr-2 h-4 w-4" /> Profile
                  </button>
                  <button className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">
                    <FiSettings className="mr-2 h-4 w-4" /> Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                  >
                    <FiLogOut className="mr-2 h-4 w-4" /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
          
              <div className="p-6 h-full overflow-y-auto">
                <h2 className="relative inline-flex items-center gap-3 mb-6 text-2xl font-bold tracking-wide group">
                  <span
                    className="
                      transition-all duration-500
                      group-hover:scale-105
                      group-hover:drop-shadow-[0_0_10px_rgba(168,85,247,0.7)]
                    "
                  >
                    {selectedCategory}
                  </span>
                  <span
                      className="
                        text-sm font-medium
                        px-3 py-1
                        rounded-full
                        bg-gray-800
                        transition-all duration-300
                        transform hover:scale-105
                      "
                    >
                    {linkCount}
                  </span>
                </h2>

                <LinkList
                  selectedCategoryId={categories.find(c => c.name === selectedCategory)?.id}
                  searchQuery={searchQuery}
                  setLinkToEdit={setLinkToEdit}
                  setIsLinkFormOpen={setIsLinkFormOpen}
                  onCountChange={setLinkCount} 
                />
              </div>
           

      </div>

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
        onSuccess={() => {
          setIsLinkFormOpen(false);
          setLinkToEdit(null);
          
        }}
        categories={categories}
        initialCategoryId={selectedCategory}  // if you're tracking selected category
        linkToEdit={linkToEdit}
      />

    </div>
  );
}