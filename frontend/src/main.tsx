import './polyfills'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { applyThemeToDocument, readStoredTheme } from './lib/theme'

applyThemeToDocument(readStoredTheme())

import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)