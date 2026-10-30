'use client'
// File manager: a DIYA screen. Install: npm i @idyeah/diya lucide-react
// Next.js: save as app/files/page.tsx. Vite: save as src/FileManager.tsx and render it inside your DiyaProvider.
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import {
  Avatar, Breadcrumbs, Button, Card, Choice, Dialog, FileUpload, Inline, Menu, Progress, Search, Table, TextInput, TextLink, Toast,
  type MenuItem, type TableColumn,
} from '@idyeah/diya'
import {
  Ellipsis, File, FileArchive, FileImage, FilePenLine, FilePlay, FileSpreadsheet, FileText, Folder, FolderPlus, LayoutGrid, List, LucideProvider, Upload, X,
} from 'lucide-react'

// Your studio's files. Replace with a request for the folder on show.
const WORKSPACE = 'Halden Studio'
const ME = { name: 'Ines Halden', email: 'ines@example.com' }
const TODAY = '2026-11-06'
const LIMIT = 25 * 1024 * 1024
const PLAN = 20 * 1024 ** 3
const ELSEWHERE = 14.1 * 1024 ** 3
const FOLDERS = [
  ['clients', 'root', 'Clients', '2026-11-04'], ['studio', 'root', 'Studio', '2026-10-27'], ['archive', 'root', 'Archive', '2026-06-30'],
  ['marlow', 'clients', 'Marlow Bakery', '2026-11-04'], ['okafor', 'clients', 'Okafor & Lin Architects', '2026-10-22'],
  ['brand', 'marlow', 'Brand', '2026-11-03'], ['packaging', 'marlow', 'Packaging', '2026-10-29'], ['photos', 'marlow', 'Photography', '2026-11-05'],
  ['contracts', 'studio', 'Contracts', '2026-10-27'], ['templates', 'studio', 'Templates', '2026-09-14'],
]
// Folder, name, size in KB, last modified.
const FILES: [string, string, number, string][] = [
  ['marlow', 'Marlow brand guidelines.pdf', 8_602, '2026-11-04'], ['marlow', 'Logo primary.svg', 24, '2026-11-03'],
  ['marlow', 'Logo mark.svg', 12, '2026-11-03'], ['marlow', 'Storefront mockup.png', 6_349, '2026-11-02'],
  ['marlow', 'Menu board draft.fig', 15_155, '2026-10-30'], ['marlow', 'Launch timeline.xlsx', 96, '2026-10-28'],
  ['marlow', 'Kickoff notes.docx', 64, '2026-10-21'], ['marlow', 'Opening day teaser.mp4', 23_142, '2026-10-18'],
  ['marlow', 'Font licenses.zip', 3_174, '2026-10-12'], ['brand', 'Color palette.pdf', 1_208, '2026-11-03'],
  ['brand', 'Type specimen.pdf', 2_456, '2026-11-01'], ['packaging', 'Box dieline.pdf', 4_301, '2026-10-29'],
  ['packaging', 'Label artwork.fig', 9_830, '2026-10-26'], ['okafor', 'Site photos.zip', 18_022, '2026-10-22'],
  ['okafor', 'Proposal v3.docx', 210, '2026-10-20'], ['contracts', 'Marlow Bakery SOW.pdf', 412, '2026-10-27'],
  ['contracts', 'Okafor & Lin MSA.pdf', 388, '2026-09-30'], ['templates', 'Invoice template.xlsx', 58, '2026-09-14'],
  ['archive', 'Halden reel 2025.mp4', 21_504, '2026-06-30'],
]

type Kind = 'folder' | 'pdf' | 'image' | 'design' | 'sheet' | 'doc' | 'video' | 'zip' | 'other'
type Item = { id: string; name: string; kind: Kind; parent: string; size: number; modified: string }
type Transfer = { id: string; name: string; size: number; loaded: number; folder: string; folderName: string; error?: string }
type Sort = 'name' | 'modified' | 'size'
type Naming = { mode: 'rename'; item: Item } | { mode: 'folder' }

const EXTENSIONS: Record<string, Kind> = { pdf: 'pdf', png: 'image', jpg: 'image', jpeg: 'image', svg: 'image', gif: 'image', fig: 'design', ai: 'design', xlsx: 'sheet', csv: 'sheet', docx: 'doc', txt: 'doc', mp4: 'video', mov: 'video', zip: 'zip' }
const ICONS: Record<Kind, ReactNode> = {
  folder: <Folder />, pdf: <FileText />, doc: <FileText />, image: <FileImage />, design: <FilePenLine />, sheet: <FileSpreadsheet />, video: <FilePlay />, zip: <FileArchive />, other: <File />,
}
// The previews stand in for the thumbnails your server makes from each image,
// so they keep their own colors in every theme. Other files show an icon.
const CREAM = '#f3ead8', WALL = '#e4dccf', KRAFT = '#cbb79a', CRUST = '#c9894f', ROSE = '#d9a79a', BOARD = '#2f4a3f', CHALK = '#f6f1e6', INK = '#3a2a1f'
const PREVIEWS: Record<string, ReactNode> = {
  'Logo primary.svg': <><rect width="160" height="120" fill={CREAM} /><circle cx="40" cy="60" r="14" fill={CRUST} /><path d="M35 65c3-8 7-12 10-12" stroke={CREAM} strokeWidth="3" fill="none" strokeLinecap="round" /><text x="62" y="67" fill={INK} fontSize="20" fontFamily="Georgia, serif" fontWeight="600">Marlow</text></>,
  'Logo mark.svg': <><rect width="160" height="120" fill={ROSE} /><circle cx="80" cy="60" r="30" fill={CREAM} /><text x="80" y="71" textAnchor="middle" fill={INK} fontSize="30" fontFamily="Georgia, serif" fontWeight="600">M</text></>,
  'Storefront mockup.png': <><rect width="160" height="120" fill={WALL} /><rect x="30" y="34" width="100" height="86" fill={CREAM} /><path d="M26 34h108l-6 16H32z" fill={CRUST} /><path d="M44 34l-4 16M62 34l-2 16M80 34v16M98 34l2 16M116 34l4 16" stroke={CREAM} strokeWidth="5" /><rect x="40" y="62" width="44" height="34" rx="2" fill={BOARD} opacity="0.85" /><rect x="94" y="62" width="24" height="58" rx="2" fill={INK} /><circle cx="54" cy="84" r="7" fill={CRUST} /><circle cx="70" cy="86" r="5" fill={ROSE} /></>,
  'Menu board draft.fig': <><rect width="160" height="120" fill={WALL} /><rect x="34" y="14" width="92" height="92" rx="4" fill={BOARD} /><path d="M58 50c6-14 38-14 44 0-8 8-36 8-44 0z" fill={CRUST} /><path d="M70 42l4 12M80 40v14M90 42l-4 12" stroke={INK} strokeWidth="1.5" opacity="0.5" /><path d="M48 72h64M48 84h46" stroke={CHALK} strokeWidth="2" strokeLinecap="round" strokeDasharray="1 5" /></>,
  'Label artwork.fig': <><rect width="160" height="120" fill={KRAFT} /><circle cx="80" cy="60" r="34" fill={CREAM} stroke={CRUST} strokeWidth="3" /><text x="80" y="66" textAnchor="middle" fill={INK} fontSize="18" fontFamily="Georgia, serif" fontWeight="600">Marlow</text></>,
  'Opening day teaser.mp4': <><rect width="160" height="120" fill={INK} /><ellipse cx="80" cy="74" rx="44" ry="20" fill={CRUST} /><path d="M52 70c8-6 16-6 24 0M76 66c8-6 16-6 24 0" stroke={CREAM} strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.7" /><circle cx="80" cy="44" r="13" fill={CHALK} opacity="0.92" /><path d="M76 38v12l10-6z" fill={INK} /></>,
}
const kindOf = (name: string): Kind => EXTENSIONS[name.split('.').pop()!.toLowerCase()] ?? 'other'
const SAMPLE: Item[] = [
  { id: 'root', name: 'All files', kind: 'folder', parent: '', size: 0, modified: TODAY },
  ...FOLDERS.map(([id, parent, name, modified]) => ({ id, name, kind: 'folder' as const, parent, size: 0, modified })),
  ...FILES.map(([parent, name, kb, modified], index) => ({ id: `file-${index}`, name, kind: kindOf(name), parent, size: kb * 1024, modified })),
]

// Replace with your API call. The stub waits a moment and agrees; the name
// checks run here first, and your server should run them again.
async function api(route: '/files/rename' | '/files/folder' | '/files/move' | '/files/delete', body: Record<string, unknown>) {
  await new Promise((resolve) => setTimeout(resolve, 600))
  return { route, ...body }
}

// Replace with your upload, such as a PUT to a presigned URL, and report its
// progress. The stub moves at a few MB a second and turns down anything over
// 25 MB, the way a server's limit would.
function sendFile(file: File, onProgress: (loaded: number) => void) {
  return new Promise<void>((resolve, reject) => {
    if (file.size > LIMIT) return setTimeout(() => reject(new Error(`It’s ${size(file.size)}, over the 25 MB limit.`)), 900)
    const step = Math.max(file.size / 40, Math.min(file.size / 6, 1.2 * 1024 * 1024))
    let loaded = 0
    const timer = setInterval(() => {
      loaded = Math.min(file.size, loaded + step)
      onProgress(loaded)
      if (loaded < file.size) return
      clearInterval(timer)
      resolve()
    }, 200)
  })
}

const size = (bytes: number) =>
  bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(1)} GB` : bytes >= 1024 ** 2 ? `${(bytes / 1024 ** 2).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
const shortDate = (iso: string) => new Date(`${iso}T12:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: iso < '2026-01-01' ? 'numeric' : undefined })
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`
const nameProblem = (name: string, taken: Item[]) =>
  !name.trim() ? 'Give it a name.'
    : name.includes('/') ? 'Names can’t include a slash (/).'
      : taken.some((item) => item.name.toLowerCase() === name.trim().toLowerCase()) ? `There’s already something named “${name.trim()}” here. Try another name.`
        : undefined

export default function FileManagerScreen() {
  const [items, setItems] = useState(SAMPLE)
  const [folderId, setFolderId] = useState('marlow')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<Sort>('name')
  const [uploads, setUploads] = useState<Transfer[]>([])
  const [picking, setPicking] = useState(false)
  const [naming, setNaming] = useState<Naming>()
  const [toDelete, setToDelete] = useState<string[]>([])
  const [toMove, setToMove] = useState<string[]>([])
  const [notice, setNotice] = useState<{ text: string; tone?: 'info' }>()
  const titleRef = useRef<HTMLHeadingElement>(null)
  const shown = useRef(folderId)

  useEffect(() => {
    if (shown.current === folderId) return
    shown.current = folderId
    titleRef.current?.focus()
  }, [folderId])

  const byId = (id: string) => items.find((item) => item.id === id)!
  const folder = byId(folderId)
  const childrenOf = (id: string) => items.filter((item) => item.parent === id)
  const trail: Item[] = []
  for (let at: Item | undefined = folder; at; at = items.find((item) => item.id === at!.parent)) trail.unshift(at)
  const inside = childrenOf(folderId)
  const order = (a: Item, b: Item) =>
    sort === 'modified' ? b.modified.localeCompare(a.modified) : sort === 'size' ? b.size - a.size : a.name.localeCompare(b.name)
  const found = inside.filter((item) => item.name.toLowerCase().includes(query.trim().toLowerCase()))
  const folders = found.filter((item) => item.kind === 'folder').sort(order)
  const files = found.filter((item) => item.kind !== 'folder').sort(order)
  const used = ELSEWHERE + items.reduce((sum, item) => sum + item.size, 0)
  // No drag and drop between folders: each item's menu offers "Move to" this
  // folder's subfolders and the folder above it.
  const places = (moving: string[]) => [...inside.filter((item) => item.kind === 'folder' && !moving.includes(item.id)), ...(folder.parent ? [byId(folder.parent)] : [])]

  function open(id: string) {
    setFolderId(id)
    setQuery('')
  }

  function startUploads(chosen: File[]) {
    setPicking(false)
    const added = chosen.map((file) => ({ id: `${file.name}-${file.lastModified}-${Math.random()}`, name: file.name, size: file.size, loaded: 0, folder: folderId, folderName: folder.name }))
    setUploads((list) => [...list.filter((item) => item.error || item.loaded < item.size), ...added])
    chosen.forEach((file, index) => {
      const job = added[index]
      sendFile(file, (loaded) => setUploads((list) => list.map((item) => (item.id === job.id ? { ...item, loaded } : item)))).then(
        () => {
          setItems((list) => {
            const siblings = list.filter((item) => item.parent === job.folder)
            const [base, ext] = job.name.includes('.') ? [job.name.slice(0, job.name.lastIndexOf('.')), job.name.slice(job.name.lastIndexOf('.'))] : [job.name, '']
            let name = job.name
            for (let copy = 2; siblings.some((item) => item.name === name); copy++) name = `${base} ${copy}${ext}`
            return [...list, { id: job.id, name, kind: kindOf(name), parent: job.folder, size: job.size, modified: TODAY }]
          })
        },
        (error: Error) => setUploads((list) => list.map((item) => (item.id === job.id ? { ...item, error: error.message } : item))),
      )
    })
  }

  useEffect(() => {
    if (!uploads.length || uploads.some((item) => item.loaded < item.size && !item.error)) return
    const done = uploads.filter((item) => !item.error)
    if (!done.length) return
    setNotice({ text: `${plural(done.length, 'file')} uploaded to ${done[0].folderName}` })
    const timer = setTimeout(() => setUploads((list) => list.filter((item) => item.error)), 1200)
    return () => clearTimeout(timer)
  }, [uploads])

  async function move(ids: string[], target: Item) {
    await api('/files/move', { ids, to: target.id })
    setItems((list) => list.map((item) => (ids.includes(item.id) ? { ...item, parent: target.id } : item)))
    setNotice({ text: `Moved ${ids.length === 1 ? byId(ids[0]).name : plural(ids.length, 'item')} to ${target.name}` })
  }

  // Download is a stub: point it at your file's URL, such as a signed link.
  const actionsFor = (item: Item): MenuItem[] => [
    item.kind === 'folder'
      ? { id: 'open', label: 'Open', onSelect: () => open(item.id) }
      : { id: 'download', label: 'Download', onSelect: () => setNotice({ text: `Downloading ${item.name}`, tone: 'info' }) },
    { id: 'rename', label: 'Rename…', onSelect: () => setNaming({ mode: 'rename', item }) },
    ...places([item.id]).map((place, index) => ({
      id: `move-${place.id}`, label: `Move to ${place.name}`, separatorBefore: index === 0, onSelect: () => void move([item.id], place),
    })),
    { id: 'delete', label: 'Delete…', destructive: true, separatorBefore: true, onSelect: () => setToDelete([item.id]) },
  ]

  const openLink = (item: Item, children: ReactNode, className: string) =>
    item.kind === 'folder'
      ? <button type="button" className={className} onClick={() => open(item.id)}>{children}</button>
      : <a className={className} href={`/files/${item.id}`}>{children}</a>

  const amount = (item: Item) => (item.kind !== 'folder' ? size(item.size) : childrenOf(item.id).length ? plural(childrenOf(item.id).length, 'item') : 'Empty')
  const nameCell = (item: Item, meta?: string) =>
    openLink(item, (
      <>
        <span className="file-manager-row-icon" aria-hidden="true">{ICONS[item.kind]}</span>
        <span className="file-manager-row-name">{item.name}{meta && <span className="file-manager-muted">{meta}</span>}</span>
      </>
    ), 'file-manager-row-open')
  const narrow = useNarrow()
  const columns: TableColumn<Item>[] = narrow
    ? [{ key: 'name', label: 'Name', render: (item) => nameCell(item, `${amount(item)} · ${shortDate(item.modified)}`) }]
    : [
        { key: 'name', label: 'Name', render: (item) => nameCell(item) },
        { key: 'modified', label: 'Modified', width: 136, render: (item) => <span className="file-manager-muted">{shortDate(item.modified)}</span> },
        { key: 'size', label: 'Size', width: 112, numeric: true, render: (item) => <span className="file-manager-muted">{amount(item)}</span> },
      ]

  const empty = inside.length === 0
  const folderCount = inside.filter((item) => item.kind === 'folder').length
  const summary = [folderCount && plural(folderCount, 'folder'), inside.length - folderCount && plural(inside.length - folderCount, 'file')]
  const sortLabels: Record<Sort, string> = { name: 'Name', modified: 'Last modified', size: 'Size' }

  return (
    <LucideProvider size={18} strokeWidth={1.6}>
      <div className="file-manager">
        <style>{css}</style>
        <header className="file-manager-bar">
          <span className="file-manager-brand"><span className="file-manager-mark" aria-hidden="true">{WORKSPACE[0]}</span>{WORKSPACE}</span>
          <Menu label="Account" items={[{ id: 'settings', label: 'Account settings', href: '/settings' }, { id: 'sign-out', label: 'Sign out', href: '/sign-out' }]}
            trigger={<button type="button" className="file-manager-account" aria-label={`${ME.name}: account`}><Avatar name={ME.name} size="small" /></button>} />
        </header>
        <main className="file-manager-main">
          <header className="file-manager-header">
            {trail.length > 1 && (
              <Breadcrumbs items={trail.map((item) => ({ label: item.name, href: `/files/${item.id}` }))}
                onNavigate={(crumb) => open(crumb.href.split('/').pop()!)} />
            )}
            <div className="file-manager-heading">
              <div>
                <h1 ref={titleRef} tabIndex={-1} className="file-manager-title">{folder.name}</h1>
                <p className="file-manager-lede">{empty ? 'Nothing here yet' : summary.filter(Boolean).join(', ')}</p>
              </div>
              <Inline gap={2}>
                <Button variant="outline" onClick={() => setNaming({ mode: 'folder' })}><FolderPlus /> New folder</Button>
                <Button onClick={() => setPicking(true)}><Upload /> Upload</Button>
              </Inline>
            </div>
          </header>

          {!empty && (
            <div className="file-manager-toolbar">
              <Search className="file-manager-search" label={`Search ${folder.name}`} hideLabel size="small" clearable
                placeholder={`Search ${folder.name}`} value={query} onValueChange={setQuery} />
              <Inline gap={2}>
                <Menu
                  label={`Sort: ${sortLabels[sort]}`}
                  trigger={<Button variant="outline" size="small">Sort: {sortLabels[sort]}</Button>}
                  items={(Object.keys(sortLabels) as Sort[]).map((key) => ({ id: key, type: 'radio', label: sortLabels[key], checked: sort === key, onSelect: () => setSort(key) }))}
                />
                <div className="file-manager-views" role="group" aria-label="View">
                  {(['grid', 'list'] as const).map((mode) => (
                    <Button key={mode} iconOnly size="small" shape="rounded" variant={view === mode ? 'outline' : 'quiet'} aria-pressed={view === mode}
                      aria-label={mode === 'grid' ? 'Grid view' : 'List view'} onClick={() => setView(mode)}>
                      {mode === 'grid' ? <LayoutGrid /> : <List />}
                    </Button>
                  ))}
                </div>
              </Inline>
            </div>
          )}

          {uploads.length > 0 && <Uploads uploads={uploads} onDismiss={(id) => setUploads(uploads.filter((item) => item.id !== id))} />}

          {empty ? (
            <FileUpload multiple files={[]} onFilesChange={startUploads} className="file-manager-drop" headingLevel={2}
              title={`${folder.name} is empty`} description="Drop files here, or choose them from your device." helperText="Up to 25 MB each." />
          ) : !found.length ? (
            <div className="file-manager-none" role="status">
              <p className="file-manager-none-title">Nothing in {folder.name} matches “{query.trim()}”</p>
              <p className="file-manager-muted">
                Search looks at names in this folder only.{' '}
                <TextLink asChild inline><button type="button" className="file-manager-text-button" onClick={() => setQuery('')}>Clear search</button></TextLink>
              </p>
            </div>
          ) : view === 'grid' ? (
            <>
              {folders.length > 0 && (
                <section className="file-manager-section" aria-labelledby="file-manager-folders">
                  <h2 id="file-manager-folders" className="file-manager-section-title">Folders</h2>
                  <ul className="file-manager-folders">
                    {folders.map((item) => (
                      <li key={item.id} className="file-manager-folder">
                        {openLink(item, (
                          <>
                            <span className="file-manager-folder-icon" aria-hidden="true"><Folder /></span>
                            <span className="file-manager-name">{item.name}</span>
                            <span className="file-manager-muted">{amount(item)}</span>
                          </>
                        ), 'file-manager-open')}
                        <Menu label={`Actions for ${item.name}`} triggerIcon={<Ellipsis />} items={actionsFor(item)} />
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {files.length > 0 && (
                <section className="file-manager-section" aria-labelledby="file-manager-files">
                  <h2 id="file-manager-files" className="file-manager-section-title">Files</h2>
                  <ul className="file-manager-files">
                    {files.map((item) => (
                      <li key={item.id} className="file-manager-file">
                        {openLink(item, (
                          <>
                            <span className="file-manager-thumb" aria-hidden="true" data-preview={PREVIEWS[item.name] ? '' : undefined}>
                              {PREVIEWS[item.name] ? <svg viewBox="0 0 160 120" preserveAspectRatio="xMidYMid slice" focusable="false">{PREVIEWS[item.name]}</svg> : ICONS[item.kind]}
                            </span>
                            <span className="file-manager-name">{item.name}</span>
                            <span className="file-manager-muted">{size(item.size)} · {shortDate(item.modified)}</span>
                          </>
                        ), 'file-manager-open')}
                        <Menu className="file-manager-more" label={`Actions for ${item.name}`} triggerIcon={<Ellipsis />} items={actionsFor(item)} />
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          ) : (
            <Table
              label={`Contents of ${folder.name}`}
              showTitle={false}
              rows={[...folders, ...files]}
              columns={columns}
              density="compact"
              pagination={false}
              rowLabel={(item) => item.name}
              rowActions={actionsFor}
              bulkActions={[
                { label: 'Download', onAction: (ids) => setNotice({ text: `Zipping ${plural(ids.length, 'item')}. Your download starts in a moment.`, tone: 'info' }) },
                { label: 'Move to…', onAction: setToMove },
                { label: 'Delete…', onAction: setToDelete, destructive: true },
              ]}
            />
          )}

          <footer className="file-manager-storage">
            <span className="file-manager-storage-label">Storage</span>
            <Progress label="Storage used" value={(used / PLAN) * 100} showValue={false} className="file-manager-meter" />
            <span className="file-manager-muted">{size(used)} of {size(PLAN)} used on the {WORKSPACE} plan</span>
          </footer>

          <Dialog open={picking} onOpenChange={setPicking} headingLevel={2} title={`Upload to ${folder.name}`} description="Uploads start as soon as you choose. You can keep working while they finish.">
            <FileUpload multiple files={[]} onFilesChange={startUploads} title="Add files" headingLevel={3} helperText="Up to 25 MB each." />
          </Dialog>
          <NameDialog naming={naming} siblings={inside} onClose={() => setNaming(undefined)}
            onDone={(name) => {
              if (naming?.mode === 'rename') {
                setItems(items.map((item) => (item.id === naming.item.id ? { ...item, name, kind: item.kind === 'folder' ? 'folder' : kindOf(name) } : item)))
                setNotice({ text: `Renamed to ${name}` })
              } else {
                setItems([...items, { id: `folder-${Date.now()}`, name, kind: 'folder', parent: folderId, size: 0, modified: TODAY }])
                setNotice({ text: `Created ${name}` })
              }
            }} />
          <Dialog
            open={toDelete.length > 0}
            onOpenChange={(next) => !next && setToDelete([])}
            size="small"
            headingLevel={2}
            title={toDelete.length === 1 ? `Delete “${byId(toDelete[0]).name}”?` : `Delete ${toDelete.length} items?`}
            description={`${toDelete.some((id) => byId(id).kind === 'folder') ? 'Folders go with everything in them. ' : ''}Deleted items wait in Recently deleted for 30 days, then they’re gone for good.`}
            confirmVariant="destructive"
            confirmLabel="Delete"
            onConfirm={async () => {
              await api('/files/delete', { ids: toDelete })
              const gone = new Set(toDelete)
              for (let grew = true; grew;) {
                grew = false
                for (const item of items) if (!gone.has(item.id) && gone.has(item.parent)) { gone.add(item.id); grew = true }
              }
              setItems(items.filter((item) => !gone.has(item.id)))
              setNotice({ text: `Moved ${toDelete.length === 1 ? byId(toDelete[0]).name : plural(toDelete.length, 'item')} to Recently deleted` })
              setToDelete([])
            }}
          />
          <MoveDialog ids={toMove} places={places(toMove)} onClose={() => setToMove([])} onMove={move} />
          {notice && <Toast key={notice.text} tone={notice.tone ?? 'success'} onDismiss={() => setNotice(undefined)}>{notice.text}</Toast>}
        </main>
      </div>
    </LucideProvider>
  )
}

const PHONE = '(max-width: 720px)'
function useNarrow() {
  return useSyncExternalStore(
    (change) => {
      const query = window.matchMedia(PHONE)
      query.addEventListener('change', change)
      return () => query.removeEventListener('change', change)
    },
    () => window.matchMedia(PHONE).matches,
    () => false,
  )
}

function Uploads({ uploads, onDismiss }: { uploads: Transfer[]; onDismiss: (id: string) => void }) {
  const going = uploads.filter((item) => !item.error && item.loaded < item.size).length
  const failed = uploads.filter((item) => item.error).length
  return (
    <Card className="file-manager-uploads" headingLevel={2} title={going ? `Uploading ${plural(going, 'file')}` : failed ? `${plural(failed, 'file')} didn’t upload` : 'All done'}>
      <ul className="file-manager-upload-list">
        {uploads.map((item) => (
          <li key={item.id} className="file-manager-upload">
            <span className="file-manager-row-icon" aria-hidden="true">{ICONS[kindOf(item.name)]}</span>
            <span className="file-manager-upload-body">
              <span className="file-manager-name">{item.name}</span>
              {item.error ? (
                <span className="file-manager-error" role="alert">{item.error} Compress it or split it, then try again.</span>
              ) : (
                <>
                  <Progress label={`Uploading ${item.name}`} value={(item.loaded / item.size) * 100} showValue={false} />
                  <span className="file-manager-muted">{item.loaded >= item.size ? 'Uploaded' : `${size(item.loaded)} of ${size(item.size)}`}</span>
                </>
              )}
            </span>
            {item.error ? (
              <Button variant="quiet" size="small" iconOnly aria-label={`Dismiss ${item.name}`} onClick={() => onDismiss(item.id)}><X /></Button>
            ) : <span className="file-manager-upload-spacer" />}
          </li>
        ))}
      </ul>
    </Card>
  )
}

function NameDialog({ naming, siblings, onClose, onDone }: { naming?: Naming; siblings: Item[]; onClose: () => void; onDone: (name: string) => void }) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [selectTo, setSelectTo] = useState<number>()
  const field = useRef<HTMLInputElement>(null)
  const current = naming?.mode === 'rename' ? naming.item : undefined

  useEffect(() => {
    if (!naming) return
    const start = naming.mode === 'rename' ? naming.item.name : 'Untitled folder'
    setName(start)
    setError(undefined)
    setSelectTo(naming.mode === 'rename' && naming.item.kind !== 'folder' && start.includes('.') ? start.lastIndexOf('.') : start.length)
  }, [naming])

  useEffect(() => {
    if (selectTo === undefined) return
    field.current?.focus()
    field.current?.setSelectionRange(0, selectTo)
    setSelectTo(undefined)
  }, [selectTo])

  async function save() {
    if (busy) return false
    const problem = nameProblem(name, siblings.filter((item) => item.id !== current?.id))
    if (problem && name.trim() !== current?.name) {
      setError(problem)
      field.current?.focus()
      return false
    }
    setBusy(true)
    await api(current ? '/files/rename' : '/files/folder', { id: current?.id, name: name.trim() })
    setBusy(false)
    if (name.trim() !== current?.name) onDone(name.trim())
    onClose()
  }

  return (
    <Dialog
      open={!!naming}
      onOpenChange={(next) => !next && onClose()}
      size="small"
      headingLevel={2}
      title={current ? `Rename ${current.kind === 'folder' ? 'folder' : 'file'}` : 'New folder'}
      confirmLabel={current ? 'Rename' : 'Create folder'}
      loading={busy}
      onConfirm={save}
    >
      <form noValidate onSubmit={(event) => { event.preventDefault(); void save() }}>
        <TextInput ref={field} label="Name" autoComplete="off" spellCheck={false} value={name} error={error}
          onValueChange={(value) => { setName(value); setError(undefined) }} />
      </form>
    </Dialog>
  )
}

function MoveDialog({ ids, places, onClose, onMove }: { ids: string[]; places: Item[]; onClose: () => void; onMove: (ids: string[], to: Item) => Promise<void> }) {
  const [target, setTarget] = useState('')
  return (
    <Dialog
      open={ids.length > 0}
      onOpenChange={(next) => { if (!next) { onClose(); setTarget('') } }}
      size="small"
      headingLevel={2}
      title={`Move ${plural(ids.length, 'item')}`}
      confirmLabel="Move"
      confirmDisabled={!target}
      onConfirm={async () => {
        await onMove(ids, places.find((place) => place.id === target)!)
        setTarget('')
        onClose()
      }}
    >
      {places.length ? (
        <Choice label="Move to" options={places.map((place) => ({ value: place.id, label: place.name }))} value={target} onValueChange={setTarget} />
      ) : (
        <p className="file-manager-muted">There’s no other folder here yet. Make one with New folder, then move these into it.</p>
      )}
    </Dialog>
  )
}

const css = `
.file-manager { min-height: 100dvh; display: flex; flex-direction: column; color: var(--diya-color-text); }
.file-manager-bar { display: none; }
.file-manager-main {
  flex: 1;
  box-sizing: border-box;
  width: 100%;
  max-width: calc(1200px + 2 * var(--diya-space-7));
  padding: var(--diya-space-7) var(--diya-space-7) var(--diya-space-6);
  display: flex;
  flex-direction: column;
  gap: var(--diya-space-6);
}
.file-manager-brand { display: inline-flex; align-items: center; gap: 10px; font-size: var(--diya-text-large); font-weight: 600; letter-spacing: -0.01em; }
.file-manager-mark {
  display: inline-grid; place-items: center; width: 28px; height: 28px; border-radius: calc(8px * var(--diya-corner-scale, 1));
  background: var(--diya-color-accent); color: var(--diya-color-accent-text); font-size: var(--diya-text-body); font-weight: 650; line-height: 1;
}
.file-manager-account { display: grid; padding: 4px; margin-right: -4px; border: 0; border-radius: 50%; background: none; cursor: pointer; }
.file-manager-account:focus-visible { outline: 2px solid var(--diya-color-accent); outline-offset: 2px; }
.file-manager-header { display: grid; gap: var(--diya-space-4); }
.file-manager-heading { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: var(--diya-space-4); }
.file-manager-title {
  margin: 0;
  font-size: 28px;
  font-weight: 600;
  line-height: var(--diya-leading-tight);
  letter-spacing: -0.02em;
  overflow-wrap: anywhere;
}
.file-manager-title:focus { outline: none; }
.file-manager-lede { margin: var(--diya-space-2) 0 0; color: var(--diya-color-muted); font-size: var(--diya-text-body); }
.file-manager-toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--diya-space-3); }
.file-manager-search { flex: 1 1 240px; max-width: 360px; }
.file-manager-views { display: inline-flex; gap: 2px; padding: 2px; border-radius: calc(var(--diya-radius-control) + 2px); background: color-mix(in srgb, var(--diya-color-text) 6%, transparent); }
.file-manager-section { display: grid; gap: var(--diya-space-4); }
.file-manager-section-title { margin: 0; font-size: var(--diya-text-caption); font-weight: 600; color: var(--diya-color-muted); }
.file-manager-folders,
.file-manager-files { margin: 0; padding: 0; list-style: none; display: grid; gap: var(--diya-space-4); }
.file-manager-folders { grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr)); }
.file-manager-files { grid-template-columns: repeat(auto-fill, minmax(min(100%, 184px), 1fr)); row-gap: var(--diya-space-5); }
.file-manager-folder,
.file-manager-file { position: relative; display: flex; align-items: flex-start; gap: var(--diya-space-1); min-width: 0; }
.file-manager-folder {
  align-items: center;
  padding: var(--diya-space-2) var(--diya-space-2) var(--diya-space-2) var(--diya-space-3);
  border-radius: var(--diya-radius-control);
  background: color-mix(in srgb, var(--diya-color-text) 4%, transparent);
}
.file-manager-open,
.file-manager-row-open { padding: 0; border: 0; background: none; color: inherit; font: inherit; text-align: start; text-decoration: none; cursor: pointer; }
.file-manager-open { flex: 1; min-width: 0; display: grid; grid-auto-rows: auto; align-content: start; gap: 2px; border-radius: var(--diya-radius-control); }
.file-manager-file .file-manager-open { display: flex; flex-direction: column; }
.file-manager-folder .file-manager-open { grid-template-columns: auto minmax(0, 1fr); column-gap: var(--diya-space-3); align-items: center; }
.file-manager-folder-icon { grid-row: span 2; display: grid; color: var(--diya-color-muted); }
.file-manager-open:focus-visible,
.file-manager-row-open:focus-visible { outline: 2px solid var(--diya-color-text); outline-offset: 3px; }
.file-manager-thumb {
  display: grid;
  place-items: center;
  aspect-ratio: 4 / 3;
  margin-bottom: var(--diya-space-2);
  border-radius: var(--diya-radius-control);
  background: color-mix(in srgb, var(--diya-color-text) 5%, transparent);
  color: var(--diya-color-muted);
  transition: background-color 0.15s;
}
.file-manager-thumb { overflow: hidden; }
.file-manager-thumb svg { width: 36px; height: 36px; stroke-width: 1.2; }
.file-manager-thumb[data-preview] svg { width: 100%; height: 100%; }
.file-manager-open:hover .file-manager-thumb[data-preview] { opacity: 0.9; }
.file-manager-file:has([data-preview]) .file-manager-more { background: color-mix(in srgb, var(--diya-color-raised) 88%, transparent); }
.file-manager-open:hover .file-manager-thumb { background: color-mix(in srgb, var(--diya-color-text) 8%, transparent); }
.file-manager-file .file-manager-more { position: absolute; top: var(--diya-space-2); right: var(--diya-space-2); }
.file-manager-name {
  flex: none;
  min-height: calc(var(--diya-text-body) * var(--diya-leading-tight));
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  font-size: var(--diya-text-body);
  font-weight: 500;
  line-height: var(--diya-leading-tight);
  overflow-wrap: anywhere;
}
.file-manager-folder .file-manager-name { -webkit-line-clamp: 1; }
.file-manager-muted { color: var(--diya-color-muted); font-size: var(--diya-text-caption); }
.file-manager-row-open { display: flex; align-items: center; gap: var(--diya-space-3); font-weight: 500; }
.file-manager-row-open:hover { text-decoration: underline; }
.file-manager-row-icon { display: grid; flex: none; color: var(--diya-color-muted); }
.file-manager-row-name { display: grid; gap: 2px; min-width: 0; overflow-wrap: anywhere; }
.file-manager-row-name .file-manager-muted { font-weight: 400; }
.file-manager-uploads { margin: 0; }
.file-manager-upload-list { margin: 0; padding: 0; list-style: none; display: grid; gap: var(--diya-space-4); }
.file-manager-upload { display: grid; grid-template-columns: auto minmax(0, 1fr) 32px; gap: var(--diya-space-3); align-items: center; min-height: 32px; }
.file-manager-upload-body { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 240px) 132px; gap: var(--diya-space-2) var(--diya-space-5); align-items: center; min-width: 0; }
.file-manager-upload-body .file-manager-error { grid-column: 2 / -1; }
.file-manager-upload-body .file-manager-muted { text-align: end; font-variant-numeric: tabular-nums; }
.file-manager-error { color: var(--diya-color-error); font-size: var(--diya-text-caption); }
.file-manager-drop { max-width: 640px; width: 100%; margin: var(--diya-space-5) auto; }
.file-manager-none { display: grid; gap: var(--diya-space-2); padding-block: var(--diya-space-7); text-align: center; }
.file-manager-none-title { margin: 0; font-size: var(--diya-text-large); font-weight: 600; overflow-wrap: anywhere; }
.file-manager-none .file-manager-muted { margin: 0; font-size: var(--diya-text-body); }
.file-manager-text-button { padding: 0; border: 0; background: none; font: inherit; cursor: pointer; }
.file-manager-storage { display: flex; flex-wrap: wrap; align-items: center; gap: var(--diya-space-2) var(--diya-space-4); margin-top: auto; }
.file-manager-storage { padding-top: var(--diya-space-5); border-top: 1px solid var(--diya-color-line); }
.file-manager-storage-label { font-size: var(--diya-text-caption); font-weight: 600; }
.file-manager-meter { width: 200px; }
@media (max-width: 720px) {
  .file-manager-bar {
    display: flex; align-items: center; justify-content: space-between; gap: var(--diya-space-3); position: sticky; top: 0; z-index: 10;
    height: 56px; box-sizing: border-box; padding: 0 var(--diya-space-4); border-bottom: 1px solid var(--diya-color-line);
    background: color-mix(in srgb, var(--diya-color-surface) 82%, transparent); backdrop-filter: blur(20px) saturate(1.4);
  }
  .file-manager-main { padding: var(--diya-space-5) var(--diya-space-4); gap: var(--diya-space-5); }
  .file-manager-search { max-width: none; flex-basis: 100%; }
  .file-manager-files { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .file-manager-meter { width: 100%; order: 3; }
  .file-manager-upload { align-items: start; }
  .file-manager-upload-body { grid-template-columns: minmax(0, 1fr); }
  .file-manager-upload-body .file-manager-error { grid-column: auto; }
  .file-manager-upload-body .file-manager-muted { text-align: start; }
}
`
