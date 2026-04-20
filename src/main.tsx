import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { isFirebaseConfigured } from './lib/firebaseConfig'
import './index.css'
import App from './App.tsx'
import { SetupEnvPage } from './pages/SetupEnvPage.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isFirebaseConfigured() ? <App /> : <SetupEnvPage />}
  </StrictMode>,
)
