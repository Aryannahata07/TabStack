import CryptoJS from 'crypto-js';

/**
 * Derives a consistent encryption key from the user's unique ID.
 * Note: For absolute privacy from Firestore admins, this should ideally 
 * be a secret provided by the user that is NEVER stored in the cloud.
 */
const deriveKey = (uid) => {
  if (!uid) return null;
  // We use SHA256 to create a consistent 256-bit key from the UID
  return CryptoJS.SHA256(uid + "TabStack-Encryption-Salt-2025").toString();
};

/**
 * Encrypts a string using AES.
 * Adds an 'enc:' prefix to identify encrypted data.
 */
export const encryptData = (text, uid) => {
  if (!text || !uid) return text;
  
  try {
    const key = deriveKey(uid);
    const encrypted = CryptoJS.AES.encrypt(text.toString(), key).toString();
    return `enc:${encrypted}`;
  } catch (error) {
    console.error("Encryption error:", error);
    return text;
  }
};

/**
 * Decrypts data if it has the 'enc:' prefix.
 * Otherwise returns the original data (for backward compatibility).
 */
export const decryptData = (encryptedText, uid) => {
  if (!encryptedText || !uid || typeof encryptedText !== 'string' || !encryptedText.startsWith('enc:')) {
    return encryptedText;
  }

  try {
    const key = deriveKey(uid);
    const ciphertext = encryptedText.substring(4); // Remove 'enc:' prefix
    const bytes = CryptoJS.AES.decrypt(ciphertext, key);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    
    // If decryption fails or returns empty, something is wrong
    if (!decrypted) return encryptedText;
    
    return decrypted;
  } catch (error) {
    console.error("Decryption error:", error);
    return encryptedText;
  }
};
