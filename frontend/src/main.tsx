/**
 * main.tsx — React app entry point.
 *
 * Sets up:
 *   - React Query (server state management — caches API calls)
 *   - React Router (client-side routing)
 *   - Mounts <App /> into the #root div in index.html
 */
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,         // data stays fresh for 60s — no refetch on nav
      gcTime: 5 * 60_000,        // keep unused cache for 5 min
      refetchOnWindowFocus: false,
      refetchOnMount: false,     // use cached data when navigating back to a page
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)
