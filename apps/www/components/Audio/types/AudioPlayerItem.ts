/**
 * PlayerItem is a Partial of the Document type.
 */
export type AudioPlayerItem = {
  id: string
  meta?: {
    title: string
    path: string
    publishDate?: string
    image?: string
    audioCoverCrop?: {
      x: number
      y: number
      width: number
      height: number
    }
    audioSource?: {
      mediaId: string
      kind: 'syntheticReadAloud' | 'readAloud'
      mp3: string
      aac: string
      ogg: string
      durationMs: number
      userProgress?: {
        id: string
        secs: number
      }
    }
    format?: {
      meta: {
        title: string
        color: string
        shareLogo: string
        shareBackgroundImage: string
        shareBackgroundImageInverted: string
      }
    }
  }
}
