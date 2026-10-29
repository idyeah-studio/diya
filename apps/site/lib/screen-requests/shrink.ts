import { SHRINK } from './config'

// Browser only. Every picture is redrawn before it's sent: at most 2,000px on
// its longest side, as WebP (JPEG where the browser can't write WebP). The
// redraw also leaves behind whatever else the file carried, such as where a
// photo was taken.

export type ShrunkImage = { blob: Blob; type: 'image/webp' | 'image/jpeg'; width: number; height: number }

/** Why a picture couldn't be prepared: the browser couldn't open it, or it stayed too big to send. */
export class ShrinkError extends Error {
  constructor(readonly reason: 'unreadable' | 'too_big') {
    super(reason)
  }
}

type Drawable = { width: number; height: number; source: CanvasImageSource; close(): void }

async function decode(file: Blob): Promise<Drawable> {
  if (typeof createImageBitmap === 'function') {
    // Turned upright first, the way the photo looks in the camera roll.
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    return { width: bitmap.width, height: bitmap.height, source: bitmap, close: () => bitmap.close() }
  }
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    return { width: image.naturalWidth, height: image.naturalHeight, source: image, close: () => {} }
  } finally {
    URL.revokeObjectURL(url)
  }
}

const encode = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality))

/** Steps tried in order until the picture fits under the target: full size first, then smaller and softer. */
const STEPS = [
  { scale: 1, quality: SHRINK.quality },
  { scale: 1, quality: 0.7 },
  { scale: 0.75, quality: 0.7 },
  { scale: 0.5, quality: 0.7 },
] as const

export async function shrinkImage(file: Blob, options: { maxSide: number; targetBytes: number } = SHRINK): Promise<ShrunkImage> {
  let picture: Drawable
  try {
    picture = await decode(file)
  } catch {
    throw new ShrinkError('unreadable')
  }
  try {
    if (!picture.width || !picture.height) throw new ShrinkError('unreadable')
    const fit = Math.min(1, options.maxSide / Math.max(picture.width, picture.height))
    let type: ShrunkImage['type'] = 'image/webp'
    for (const step of STEPS) {
      const width = Math.max(1, Math.round(picture.width * fit * step.scale))
      const height = Math.max(1, Math.round(picture.height * fit * step.scale))
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d')
      if (!context) throw new ShrinkError('unreadable')
      const draw = () => {
        // JPEG has no transparency: a transparent screenshot gets a white page, not a black one.
        if (type === 'image/jpeg') {
          context.fillStyle = '#ffffff'
          context.fillRect(0, 0, width, height)
        }
        context.imageSmoothingQuality = 'high'
        context.drawImage(picture.source, 0, 0, width, height)
      }
      draw()
      let blob = await encode(canvas, type, step.quality)
      // A browser that can't write WebP quietly hands back a PNG instead.
      if (type === 'image/webp' && blob?.type !== 'image/webp') {
        type = 'image/jpeg'
        context.clearRect(0, 0, width, height)
        draw()
        blob = await encode(canvas, type, step.quality)
      }
      if (!blob || blob.type !== type) throw new ShrinkError('unreadable')
      if (blob.size <= options.targetBytes) return { blob, type, width, height }
    }
    throw new ShrinkError('too_big')
  } finally {
    picture.close()
  }
}
