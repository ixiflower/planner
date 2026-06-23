/**
 * Utility functions for safely accessing Chrome extension APIs
 */

// Simple type definition
export interface ChromeAPI {
  runtime?: any;
  extension?: any;
  storage?: any;
  tabs?: any;
  cookies?: any;
}

// Check if we're in a Chrome extension environment
export function isChromeExtension(): boolean {
  return typeof window !== 'undefined' && 
         typeof (window as any).chrome !== 'undefined' && 
         typeof (window as any).chrome.runtime !== 'undefined';
}

// Safe access to chrome APIs
export const safeChrome: ChromeAPI = typeof window !== 'undefined' && (window as any).chrome ? 
  (window as any).chrome : {
  runtime: {},
  extension: {},
  storage: {
    sync: {
      get: () => {},
      set: () => {}
    },
    local: {
      get: () => {},
      set: () => {}
    }
  },
  tabs: {
    query: () => {},
    create: () => {}
  },
  cookies: {
    get: () => {},
    set: () => {}
  }
};