import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { DiyaProvider, Button } from '@idyeah/diya'
import '@idyeah/diya/styles.css'
createRoot(document.getElementById('root')!).render(<StrictMode><DiyaProvider><Button>Hi</Button></DiyaProvider></StrictMode>)
