import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import iconUrl from '@/assets/icon.gif'

// Fix for "chrome is not defined" error in non-extension environments
declare global {
  interface Window {
    chrome?: any;
  }
}

if (typeof window !== 'undefined' && !window.chrome) {
  // Create a minimal chrome-like object to prevent errors
  window.chrome = {
    runtime: {},
    extension: {},
    storage: {
      sync: {
        get: (_keys: any, _callback: any) => {},
        set: (_items: any, _callback: any) => {}
      },
      local: {
        get: (_keys: any, _callback: any) => {},
        set: (_items: any, _callback: any) => {}
      }
    },
    tabs: {
      query: (_queryInfo: any, _callback: any) => {},
      create: (_createProperties: any, _callback: any) => {}
    },
    cookies: {
      get: (_details: any, _callback: any) => {},
      set: (_details: any, _callback: any) => {}
    }
  };
}

// Load theme early to avoid flash
const savedTheme = localStorage.getItem("theme");
if (savedTheme === "light") {
  document.documentElement.classList.remove("dark");
} else {
  document.documentElement.classList.add("dark");
}

;(() => {
  const setFavicon = (href: string, type = 'image/gif') => {
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.type = type;
    link.href = href;
  };
  try {
    setFavicon(iconUrl);
  } catch {
    setFavicon('/icon.gif');
  }
})();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)