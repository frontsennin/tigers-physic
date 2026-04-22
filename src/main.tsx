import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { isFirebaseConfigured } from './lib/firebaseConfig'
import './index.css'
import App from './App.tsx'
import { SetupEnvPage } from './pages/SetupEnvPage.tsx'

registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isFirebaseConfigured() ? <App /> : <SetupEnvPage />}
  </StrictMode>,
)
