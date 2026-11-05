import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { StoreProvider } from './store/StoreContext';
import { AuthProvider } from './store/AuthContext';
import './styles.css';

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('BOUNDARY:', error, info); }
  render() {
    if (this.state.error) {
      return <pre style={{ color: 'red', padding: 20, whiteSpace: 'pre-wrap' }}>Erreur React : {String(this.state.error?.stack || this.state.error)}</pre>;
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <StoreProvider>
          <App />
        </StoreProvider>
      </AuthProvider>
    </BrowserRouter>
    </React.StrictMode>
  </ErrorBoundary>
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
