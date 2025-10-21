// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return '/';
  },
}));

// Mock IndexedDB
const indexedDB = {
  open: jest.fn(),
  deleteDatabase: jest.fn(),
  databases: jest.fn().mockResolvedValue([]),
};

global.indexedDB = indexedDB;

// Mock Service Worker
global.navigator.serviceWorker = {
  register: jest.fn().mockResolvedValue({
    installing: null,
    waiting: null,
    active: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }),
  ready: Promise.resolve({
    active: {
      postMessage: jest.fn(),
    },
    sync: {
      register: jest.fn(),
    },
  }),
  controller: null,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
};

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
};

// Mock environment variables
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001/api';
