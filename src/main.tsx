import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Cache bust: v1.1.2 - Final Cleanup and Sync
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
