import React from 'react'
import ReactDOM from 'react-dom/client'
import { HeroUIProvider, ToastProvider } from '@heroui/react'
import App from './App'
import { DialogProvider } from './components/Dialogs'
import './index.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <HeroUIProvider locale="es-MX">
      <ToastProvider placement="bottom-center" toastOffset={16} />
      <DialogProvider>
        <App />
      </DialogProvider>
    </HeroUIProvider>
  </React.StrictMode>
)
