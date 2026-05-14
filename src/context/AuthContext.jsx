// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../firebase/config";
import { onAuthStateChanged, signOut } from "firebase/auth";

const AuthContext = createContext();

// Helper to extract raw indexedDB auth
const exportFirebaseAuth = async () => {
    return new Promise((resolve) => {
        try {
            const req = indexedDB.open("firebaseLocalStorageDb");
            req.onsuccess = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains("firebaseLocalStorage")) return resolve(null);
                const tx = db.transaction("firebaseLocalStorage", "readonly");
                const store = tx.objectStore("firebaseLocalStorage");
                const getAll = store.getAll();
                const keysReq = store.getAllKeys();
                
                getAll.onsuccess = () => {
                    keysReq.onsuccess = () => {
                        if (getAll.result.length > 0) {
                            resolve({ key: keysReq.result[0], value: getAll.result[0] });
                        } else {
                            resolve(null);
                        }
                    }
                }
            };
            req.onerror = () => resolve(null);
        } catch (e) {
            resolve(null);
        }
    });
};

// Helper to inject raw indexedDB auth
const importFirebaseAuth = async (payload) => {
    return new Promise((resolve) => {
        try {
            const req = indexedDB.open("firebaseLocalStorageDb");
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains("firebaseLocalStorage")) {
                    db.createObjectStore("firebaseLocalStorage");
                }
            };
            req.onsuccess = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains("firebaseLocalStorage")) return resolve(); // Just in case
                const tx = db.transaction("firebaseLocalStorage", "readwrite");
                const store = tx.objectStore("firebaseLocalStorage");
                if (payload) {
                    if (store.keyPath) {
                        store.put(payload.value); // In-line keys
                    } else {
                        store.put(payload.value, payload.key); // Out-of-line keys
                    }
                } else {
                    store.clear();
                }
                tx.oncomplete = () => resolve();
            };
            req.onerror = () => resolve();
        } catch(e) {
            resolve();
        }
    });
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let storageListener = null;

    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      let userData = null;
      if (currentUser) {
        const payload = await exportFirebaseAuth();
        userData = {
          uid: currentUser.uid,
          email: currentUser.email || '',
          displayName: currentUser.displayName,
          photoURL: currentUser.photoURL,
          firebaseAuthPayload: payload
        };
        setUser(userData);
        
        // Broadcast login to extension (if running as web app)
        if (typeof window !== "undefined") {
            window.postMessage({ type: "TABSTACK_AUTH_SYNC", user: userData }, "*");
        }

        // Check if the extension syncing says we should actually be logged out
        if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get(['extensionSyncUser'], async (result) => {
                // if it's explicitly null, the web app told the extension to log out
                if (result.extensionSyncUser === null) {
                    importFirebaseAuth(null).then(() => signOut(auth));
                }
            });
        }
      } else {
        setUser(null);
        
        // Broadcast logout to extension (if running as web app)
        if (typeof window !== "undefined") {
            window.postMessage({ type: "TABSTACK_AUTH_SYNC", user: null }, "*");
        }

        // If in extension popup AND firebase is null, search for synced user
        if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get(['extensionSyncUser'], async (result) => {
                const syncedUser = result.extensionSyncUser;
                if (syncedUser && syncedUser.firebaseAuthPayload) {
                    // Prevent infinite reload loops directly via sessionStorage
                    const lastInjected = sessionStorage.getItem('tabstack_injection_attempt');
                    if (lastInjected !== syncedUser.uid) {
                        sessionStorage.setItem('tabstack_injection_attempt', syncedUser.uid);
                        // Magically Inject!
                        await importFirebaseAuth(syncedUser.firebaseAuthPayload);
                        // Reload to let Firebase correctly re-initialize and grab it!
                        if (typeof window !== "undefined") window.location.reload();
                    }
                }
            });
        }
      }

      setLoading(false);
    });

    // Handle requests for Sync state from the delayed content script
    const handleMessage = async (event) => {
        if (event.source !== window) return;
        if (event.data && event.data.type === "TABSTACK_REQUEST_AUTH_SYNC") {
            if (auth.currentUser) {
                const payload = await exportFirebaseAuth();
                window.postMessage({
                    type: "TABSTACK_AUTH_SYNC", 
                    user: {
                        uid: auth.currentUser.uid,
                        email: auth.currentUser.email || '',
                        displayName: auth.currentUser.displayName,
                        photoURL: auth.currentUser.photoURL,
                        firebaseAuthPayload: payload
                    }
                }, "*");
            }
        }
    };
    if (typeof window !== "undefined") {
        window.addEventListener("message", handleMessage);
    }

    // In extension popup, auto-logout or auto-login when web app state changes
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.onChanged) {
        storageListener = (changes, area) => {
             if (area === "local" && changes.extensionSyncUser) {
                 if (changes.extensionSyncUser.newValue === null) {
                     // The web app reported a log out! We must clear our extension DB and real-logout!
                     importFirebaseAuth(null).then(() => signOut(auth));
                 } else if (changes.extensionSyncUser.newValue && changes.extensionSyncUser.newValue.firebaseAuthPayload) {
                     // The web app reported a log in! Inject it and reload so extension catches it
                     const syncedUser = changes.extensionSyncUser.newValue;
                     const lastInjected = sessionStorage.getItem('tabstack_injection_attempt');
                     if (lastInjected !== syncedUser.uid) {
                         sessionStorage.setItem('tabstack_injection_attempt', syncedUser.uid);
                         importFirebaseAuth(syncedUser.firebaseAuthPayload).then(() => {
                             if (typeof window !== "undefined") window.location.reload();
                         });
                     }
                 }
             }
        };
        chrome.storage.onChanged.addListener(storageListener);
    }

    return () => {
        unsub();
        if (typeof window !== "undefined") {
            window.removeEventListener("message", handleMessage);
        }
        if (storageListener && typeof chrome !== "undefined" && chrome.storage && chrome.storage.onChanged) {
            chrome.storage.onChanged.removeListener(storageListener);
        }
    };
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser: user, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
