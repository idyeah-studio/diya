import { createRoot } from 'react-dom/client'
import Button from '@mui/material/Button'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import TablePagination from '@mui/material/TablePagination'
createRoot(document.getElementById('root')!).render(<><Button variant="contained">Hi</Button><Table><TableBody><TableRow><TableCell>Ada</TableCell></TableRow></TableBody></Table><TablePagination count={1} page={0} rowsPerPage={10} onPageChange={() => {}} component="div" /></>)
