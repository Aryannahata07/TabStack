import React from 'react';
import ReactDOM from 'react-dom/client';
import PopupApp from './PopupApp';
import './index.css';
import { AuthProvider } from './context/AuthContext';

ReactDOM.createRoot(document.getElementById('popup-root')).render(
    <React.StrictMode>
        <AuthProvider>
            <PopupApp />
        </AuthProvider>
    </React.StrictMode>
);
