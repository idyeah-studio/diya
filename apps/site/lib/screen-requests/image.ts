export type ImageType = 'image/png' | 'image/jpeg' | 'image/webp'

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const startsWith = (bytes: Uint8Array, signature: number[], at = 0) => signature.every((byte, i) => bytes[at + i] === byte)
const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0))

/**
 * The picture's real type, from its first bytes. Whatever the browser or the
 * file name claims, only PNG, JPEG and WebP get through. Nothing else in the
 * file is parsed.
 */
export function imageType(bytes: Uint8Array): ImageType | null {
  if (startsWith(bytes, PNG)) return 'image/png'
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (startsWith(bytes, ascii('RIFF')) && startsWith(bytes, ascii('WEBP'), 8)) return 'image/webp'
  return null
}

export const IMAGE_EXTENSION: Record<ImageType, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }
