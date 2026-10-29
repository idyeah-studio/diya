import { createRoot } from 'react-dom/client'
import { Theme, Button, Table } from '@radix-ui/themes'
import '@radix-ui/themes/styles.css'
createRoot(document.getElementById('root')!).render(<Theme><Button>Hi</Button><Table.Root><Table.Body><Table.Row><Table.Cell>Ada</Table.Cell></Table.Row></Table.Body></Table.Root></Theme>)
