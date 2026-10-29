import { createRoot } from 'react-dom/client'
import { MantineProvider, Button } from '@mantine/core'
import '@mantine/core/styles.css'
createRoot(document.getElementById('root')!).render(<MantineProvider><Button>Hi</Button></MantineProvider>)
