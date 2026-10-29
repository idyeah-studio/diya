import { createRoot } from 'react-dom/client'
import { MantineProvider, Button, Table } from '@mantine/core'
import '@mantine/core/styles.css'
createRoot(document.getElementById('root')!).render(<MantineProvider><Button>Hi</Button><Table data={{ head: ['Name'], body: [['Ada']] }} /></MantineProvider>)
