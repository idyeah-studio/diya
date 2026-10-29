import React from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import '@idyeah/diya/styles.css'
import './dashboard.css'
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>)
