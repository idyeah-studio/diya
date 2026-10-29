import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as D from '@idyeah/diya'
import '@idyeah/diya/styles.css'
;(window as any).D = D
createRoot(document.getElementById('root')!).render(<StrictMode><D.DiyaProvider><D.Button>Hi</D.Button></D.DiyaProvider></StrictMode>)
