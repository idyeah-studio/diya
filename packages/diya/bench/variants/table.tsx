import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { DiyaProvider, Button, Table } from '@idyeah/diya'
import '@idyeah/diya/styles.css'
const rows = [{ id: '1', name: 'Ada' }]
createRoot(document.getElementById('root')!).render(<StrictMode><DiyaProvider><Button>Hi</Button>
<Table label="People" rows={rows} rowLabel={r => r.name} columns={[{ key: 'name', label: 'Name', render: r => r.name }]} /></DiyaProvider></StrictMode>)
