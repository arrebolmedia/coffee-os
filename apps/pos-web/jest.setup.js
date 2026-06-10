/* eslint-env jest */
/* eslint-disable @typescript-eslint/no-require-imports */
// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render as rtlRender } from '@testing-library/react';
import React from 'react';

// Wrap render with QueryClientProvider globally so components using React Query work in tests
const originalRender = rtlRender;
global.renderWithProviders = (ui, options) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Wrapper = ({ children }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return originalRender(ui, { wrapper: Wrapper, ...options });
};

// Override the default render from @testing-library/react to include providers
jest.mock('@testing-library/react', () => {
  const actual = jest.requireActual('@testing-library/react');
  const React = require('react');
  const { QueryClient, QueryClientProvider } = require('@tanstack/react-query');

  const renderWithQuery = (ui, options) => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    const Wrapper = ({ children }) =>
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        children,
      );
    return actual.render(ui, { wrapper: Wrapper, ...options });
  };

  return { ...actual, render: renderWithQuery };
});

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

// Mock localStorage
const localStorageMock = (() => {
  let store = {};

  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
});

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

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: {
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        organizationId: 'org-123',
        locationId: 'location-123',
      },
      accessToken: 'test-token',
    },
    status: 'authenticated',
  })),
  SessionProvider: ({ children }) => children,
  signIn: jest.fn(),
  signOut: jest.fn(),
  getSession: jest.fn(),
}));
