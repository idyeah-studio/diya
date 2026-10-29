import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { DiyaProvider, Button, Stack, TextInput } from '@idyeah/diya'
import '@idyeah/diya/styles.css'
createRoot(document.getElementById('root')!).render(<StrictMode><DiyaProvider><Stack gap={4}><TextInput label="Name" /><Button>Hi</Button></Stack></DiyaProvider></StrictMode>)
