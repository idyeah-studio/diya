// @demo-only file: your own image as Glass's backdrop, kept in this browser only.
// The file is checked, scaled down to 2560px at most, measured, and saved in
// IndexedDB. The measurements set a calm wash, a saturation cut and a soft blur
// for each mode and strength, so even a bright, neon or busy image sits quietly
// behind the glass and every label keeps 4.5:1.
import { useEffect, useSyncExternalStore, type CSSProperties } from 'react'
import { DEFAULT_LOOK, type Look } from '@/app/providers'

export type Strength = 'subtle' | 'balanced' | 'strong'
/** Measured on a small copy: luma percentiles and mean (0–255), OKLCH chroma (98th percentile, so a small vivid logo counts), busyness. */
export type Stats = { p5: number; p95: number; mean: number; chroma: number; busy: number }
type State = { url: string | null; stats: Stats | null; ready: boolean; remembered: boolean }

export const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']
export const MAX_BYTES = 10 * 1024 * 1024
const LONG_EDGE = 2560
const DB = 'oriel-backdrop'
const STORE = 'images'
const RECORD = 'yours'

let state: State = { url: null, stats: null, ready: false, remembered: true }
const SERVER: State = { url: null, stats: null, ready: false, remembered: true }
const listeners = new Set<() => void>()
function emit(next: Partial<State>) {
  state = { ...state, ...next }
  for (const listener of listeners) listener()
}
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
export const useUploadState = () => useSyncExternalStore(subscribe, () => state, () => SERVER)

// IndexedDB, every call guarded: a private window or blocked storage just means
// the image lives for this visit.
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB, 1)
      request.onupgradeneeded = () => request.result.createObjectStore(STORE)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
      request.onblocked = () => reject(new Error('blocked'))
    } catch (error) {
      reject(error)
    }
  })
}
async function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE, mode)
      const request = work(tx.objectStore(STORE))
      tx.oncomplete = () => {
        db.close()
        resolve(request ? request.result : undefined)
      }
      tx.onerror = tx.onabort = () => {
        db.close()
        reject(tx.error)
      }
    } catch (error) {
      db.close()
      reject(error)
    }
  })
}

const isStats = (s: unknown): s is Stats =>
  !!s && typeof s === 'object' && ['p5', 'p95', 'mean', 'chroma', 'busy'].every((k) => Number.isFinite((s as Record<string, number>)[k]))

let loading: Promise<void> | null = null
/** Reads the saved image once. A missing or unreadable one leaves no image, so the default backdrop shows. */
export function loadSaved() {
  loading ??= (async () => {
    try {
      const record = (await run('readonly', (store) => store.get(RECORD))) as { blob?: Blob; stats?: unknown } | undefined
      if (record?.blob instanceof Blob && isStats(record.stats)) {
        const bitmap = await createImageBitmap(record.blob)
        bitmap.close()
        emit({ url: URL.createObjectURL(record.blob), stats: record.stats, ready: true })
        return
      }
      if (record) await run('readwrite', (store) => store.delete(RECORD)).catch(() => {})
    } catch {}
    emit({ ready: true })
  })()
  return loading
}

export type UploadError = 'type' | 'size'
export class UploadProblem extends Error {
  constructor(readonly kind: UploadError) {
    super(kind)
  }
}

const lin = (v: number) => {
  v /= 255
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}
function oklchChroma(r: number, g: number, b: number) {
  const [R, G, B] = [lin(r), lin(g), lin(b)]
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B)
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B)
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B)
  return Math.hypot(1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s)
}

/** Luma spread, mean, chroma and busyness, from a 192px-wide copy. */
export function measure(source: CanvasImageSource, width: number, height: number): Stats {
  const w = 192
  const h = Math.max(1, Math.round((height / width) * w))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const g = canvas.getContext('2d', { willReadFrequently: true })!
  g.drawImage(source, 0, 0, w, h)
  const d = g.getImageData(0, 0, w, h).data
  const luma = new Float32Array(w * h)
  const chroma: number[] = []
  let sum = 0
  for (let i = 0; i < w * h; i++) {
    const [r, gg, b] = [d[i * 4], d[i * 4 + 1], d[i * 4 + 2]]
    luma[i] = 0.2126 * r + 0.7152 * gg + 0.0722 * b
    sum += luma[i]
    if (i % 3 === 0) chroma.push(oklchChroma(r, gg, b))
  }
  let edges = 0
  for (let y = 0; y < h - 1; y++)
    for (let x = 0; x < w - 1; x++) edges += Math.abs(luma[y * w + x] - luma[y * w + x + 1]) + Math.abs(luma[y * w + x] - luma[(y + 1) * w + x])
  const sorted = Array.from(luma).sort((a, b) => a - b)
  chroma.sort((a, b) => a - b)
  const at = (list: ArrayLike<number>, q: number) => list[Math.min(list.length - 1, Math.floor(q * list.length))]
  return { p5: at(sorted, 0.05), p95: at(sorted, 0.95), mean: sum / (w * h), chroma: at(chroma, 0.98), busy: edges / ((w - 1) * (h - 1)) }
}

async function encode(canvas: HTMLCanvasElement): Promise<Blob> {
  const as = (type: string, quality: number) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality))
  const webp = await as('image/webp', 0.86)
  if (webp && webp.type === 'image/webp') return webp
  const jpeg = await as('image/jpeg', 0.88)
  if (!jpeg) throw new UploadProblem('type')
  return jpeg
}

/** Checks, scales and measures a file. Throws UploadProblem('type' | 'size'). */
export async function prepare(file: File): Promise<{ blob: Blob; stats: Stats }> {
  const typed = ACCEPTED.includes(file.type) || (!file.type && /\.(jpe?g|png|webp)$/i.test(file.name))
  if (!typed) throw new UploadProblem('type')
  if (file.size > MAX_BYTES) throw new UploadProblem('size')
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new UploadProblem('type')
  }
  const scale = Math.min(1, LONG_EDGE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const stats = measure(canvas, canvas.width, canvas.height)
  return { blob: await encode(canvas), stats }
}

/** Uses a file as the backdrop: shown at once, then saved if this browser allows. */
export async function applyFile(file: File) {
  const { blob, stats } = await prepare(file)
  if (state.url) URL.revokeObjectURL(state.url)
  let remembered = true
  try {
    await run('readwrite', (store) => store.put({ blob, stats }, RECORD))
  } catch {
    remembered = false
  }
  emit({ url: URL.createObjectURL(blob), stats, ready: true, remembered })
}

export async function removeImage() {
  if (state.url) URL.revokeObjectURL(state.url)
  emit({ url: null, stats: null, remembered: true })
  try {
    await run('readwrite', (store) => store.delete(RECORD))
  } catch {}
}

const STEPS: Record<Strength, { floor: number; light: number; ceiling: number; dark: number; chroma: number; blur: number }> = {
  // floor / ceiling: the darkest (Light) or brightest (Dark) the image may get after its wash, in luma.
  // chroma: the 98th-percentile OKLCH chroma left after the wash. The glass and the
  // sRGB blend keep more than that on screen; measured, these land at or under 0.05
  // (Subtle, Balanced) and 0.08 (Strong).
  subtle: { floor: 214, light: 0.6, ceiling: 52, dark: 0.64, chroma: 0.02, blur: 6 },
  balanced: { floor: 200, light: 0.46, ceiling: 64, dark: 0.52, chroma: 0.028, blur: 4 },
  strong: { floor: 186, light: 0.32, ceiling: 74, dark: 0.4, chroma: 0.045, blur: 2 },
}
const LIGHT_WASH = [245, 243, 240]
const DARK_WASH = [14, 13, 13]
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** The wash, saturation and blur for one strength, per mode, from the image's measurements. */
export function calming(stats: Stats, strength: Strength) {
  const step = STEPS[strength]
  const light = clamp(Math.max(step.light, (step.floor - stats.p5) / (LIGHT_WASH[1] - stats.p5 || 1)), 0, 0.92)
  const dark = clamp(Math.max(step.dark, (stats.p95 - step.ceiling) / (stats.p95 - DARK_WASH[1] || 1)), 0, 0.94)
  const saturate = (wash: number) => clamp(step.chroma / Math.max(0.001, (1 - wash) * stats.chroma), 0, 1)
  const blur = clamp(step.blur + stats.busy / 6, 2, 14)
  return { light, dark, saturateLight: saturate(light), saturateDark: saturate(dark), blur }
}

/** The inline style that puts the saved image behind the glass, or nothing. */
export function useUploadedBackdrop(look: Look, setLook: (next: Partial<Look>) => void): CSSProperties | undefined {
  const upload = useUploadState()
  useEffect(() => {
    loadSaved()
  }, [])
  // The image is gone (removed, corrupt or never saved): fall back to the default.
  useEffect(() => {
    if (upload.ready && !upload.url && look.backdrop === 'image') setLook({ backdrop: DEFAULT_LOOK.backdrop })
  }, [upload.ready, upload.url, look.backdrop])
  if (look.backdrop !== 'image' || !upload.url || !upload.stats) return undefined
  const c = calming(upload.stats, look.strength ?? 'balanced')
  const rgba = (rgb: number[], a: number) => `rgb(${rgb.join(' ')} / ${a.toFixed(3)})`
  return {
    '--backdrop-image': `url(${JSON.stringify(upload.url)})`,
    '--wash-light': rgba(LIGHT_WASH, c.light),
    '--wash-dark': rgba(DARK_WASH, c.dark),
    '--saturate-light': c.saturateLight.toFixed(3),
    '--saturate-dark': c.saturateDark.toFixed(3),
    '--image-blur': `${c.blur.toFixed(1)}px`,
  } as CSSProperties
}
