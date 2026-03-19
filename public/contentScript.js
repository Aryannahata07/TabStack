// contentScript.js
// Intercepts auth state from the TabStack Web App and sets it in the extension storage
window.addEventListener("message", (event) => {
    // Only accept messages from the same window
    if (event.source !== window) return;

    if (event.data && event.data.type === "TABSTACK_AUTH_SYNC") {
        if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ extensionSyncUser: event.data.user });
        }
    }
});

const askForAuth = () => {
    window.postMessage({ type: "TABSTACK_REQUEST_AUTH_SYNC" }, "*");
};
// Try requesting as quickly as possible
askForAuth();
window.addEventListener("load", askForAuth);
