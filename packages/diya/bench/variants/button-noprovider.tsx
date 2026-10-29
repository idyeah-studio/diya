import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Button } from '@idyeah/diya'
import '@idyeah/diya/styles.css'
createRoot(document.getElementById('root')!).render(<StrictMode><Button>Hi</Button></StrictMode>)
