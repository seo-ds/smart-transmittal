import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './AuthContext';

console.log('Index.tsx loaded');

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Root element not found!');
  throw new Error("Could not find root element to mount to");
}

console.log('Root element found, creating React root');

try {
  const root = ReactDOM.createRoot(rootElement);
  console.log('React root created, rendering app');
  root.render(
    <React.StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </React.StrictMode>
  );
  console.log('App render called');
} catch (error) {
  console.error('Error during app initialization:', error);
  document.body.innerHTML = `<div style="padding: 20px; color: red;">Error: ${error.message}</div>`;
}