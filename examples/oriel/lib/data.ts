// The demo's sample data: one small studio, its customers and their invoices.
// Every company and person here is invented for this demo. "Today" is fixed,
// so the screens read the same for everyone, on any day.

export const TODAY = '2026-10-21'

export type InvoiceStatus = 'draft' | 'sent' | 'overdue' | 'paid'

export type Customer = {
  id: string
  name: string
  contact: string
  email: string
  city: string
  /** Average days from sending to paid, over the last year. */
  paysIn: number
}

export type Invoice = {
  id: string
  number: string
  customerId: string
  issued: string
  due: string
  amount: number
  status: InvoiceStatus
  paidOn?: string
  remindedOn?: string
}

export const customers: Customer[] = [
  { id: 'ferro', name: 'Ferro Bikes', contact: 'Maya Lindqvist', email: 'maya@ferrobikes.example', city: 'Seattle', paysIn: 9 },
  { id: 'saltmarsh', name: 'Saltmarsh Coffee', contact: 'Omar Haddad', email: 'omar@saltmarsh.example', city: 'Austin', paysIn: 24 },
  { id: 'halden', name: 'Halden Clinic', contact: 'Priya Nair', email: 'priya@haldenclinic.example', city: 'Boston', paysIn: 31 },
  { id: 'bramble', name: 'Bramble Toys', contact: 'Jonah Reyes', email: 'jonah@brambletoys.example', city: 'Portland', paysIn: 12 },
  { id: 'cormorant', name: 'Cormorant Travel', contact: 'Ines Duarte', email: 'ines@cormorant.example', city: 'Lisbon', paysIn: 18 },
  { id: 'lantern', name: 'Lantern Tea House', contact: 'Ravi Menon', email: 'ravi@lanterntea.example', city: 'Bengaluru', paysIn: 7 },
  { id: 'juniper', name: 'Juniper Ridge Lodge', contact: 'Lena Brandt', email: 'lena@juniperridge.example', city: 'Innsbruck', paysIn: 15 },
  { id: 'ashby', name: 'Ashby Cellars', contact: 'Sam Whitlock', email: 'sam@ashbycellars.example', city: 'Napa', paysIn: 21 },
  { id: 'greyfield', name: 'Greyfield Credit Union', contact: 'Hana Sato', email: 'hana@greyfield.example', city: 'Toronto', paysIn: 38 },
  { id: 'pellow', name: 'Pellow Books', contact: 'Theo Marsh', email: 'theo@pellowbooks.example', city: 'London', paysIn: 14 },
]

// [number, customer, issued, due, amount, status, paidOn?]
const rows: [number, string, string, string, number, InvoiceStatus, string?][] = [
  [1048, 'saltmarsh', '2026-10-17', '2026-10-23', 1860, 'sent'],
  [1047, 'ferro', '2026-10-15', '2026-11-14', 4200, 'paid', '2026-10-19'],
  [1046, 'halden', '2026-10-14', '2026-11-13', 1890, 'sent'],
  [1045, 'cormorant', '2026-10-12', '2026-10-26', 2250, 'sent'],
  [1044, 'greyfield', '2026-09-22', '2026-10-06', 3140, 'overdue'],
  [1043, 'lantern', '2026-10-09', '2026-10-23', 980, 'paid', '2026-10-15'],
  [1042, 'juniper', '2026-10-06', '2026-11-05', 2780, 'sent'],
  [1041, 'ashby', '2026-09-30', '2026-10-14', 1520, 'overdue'],
  [1040, 'bramble', '2026-09-28', '2026-10-28', 3600, 'paid', '2026-10-09'],
  [1039, 'pellow', '2026-09-25', '2026-10-25', 2100, 'sent'],
  [1038, 'ferro', '2026-09-21', '2026-10-21', 5200, 'paid', '2026-10-01'],
  [1037, 'halden', '2026-09-15', '2026-10-15', 2880, 'overdue'],
  [1036, 'saltmarsh', '2026-09-12', '2026-10-12', 1340, 'paid', '2026-10-07'],
  [1035, 'lantern', '2026-09-08', '2026-10-08', 1200, 'paid', '2026-10-13'],
  [1034, 'cormorant', '2026-09-03', '2026-10-03', 2900, 'paid', '2026-10-17'],
  [1033, 'juniper', '2026-08-28', '2026-09-27', 3300, 'paid', '2026-10-03'],
  [1032, 'bramble', '2026-08-24', '2026-09-23', 1760, 'paid', '2026-10-02'],
  [1031, 'ashby', '2026-08-19', '2026-09-18', 2440, 'paid', '2026-10-06'],
  [1030, 'ferro', '2026-08-14', '2026-09-13', 4100, 'paid', '2026-10-04'],
  [1029, 'greyfield', '2026-08-08', '2026-09-07', 4720, 'paid', '2026-10-11'],
  [1028, 'pellow', '2026-08-02', '2026-09-01', 1980, 'paid', '2026-10-05'],
  [1027, 'halden', '2026-07-28', '2026-08-27', 2720, 'paid', '2026-10-08'],
  [1026, 'saltmarsh', '2026-07-21', '2026-08-20', 2460, 'paid', '2026-10-14'],
  [1049, 'bramble', '2026-10-21', '2026-11-20', 2900, 'draft'],
  [1050, 'pellow', '2026-10-21', '2026-11-20', 1650, 'draft'],
]

export const initialInvoices: Invoice[] = rows.map(([n, customerId, issued, due, amount, status, paidOn]) => ({
  id: `inv-${n}`,
  number: `INV-${n}`,
  customerId,
  issued,
  due,
  amount,
  status,
  paidOn,
}))

/** Invoiced and paid, by month, for the Overview chart. The last month is October so far. */
export const monthly = {
  months: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
  invoiced: [31400, 36800, 33100, 41900, 38600, 33790],
  paid: [29800, 33200, 35400, 36100, 40800, 42900],
}
