export enum AudioEvent {
  // Sent to app
  PLAY = 'audio:play',
  PAUSE = 'audio:pause',
  STOP = 'audio:stop',
  SEEK = 'audio:seek',
  FORWARD = 'audio:forward',
  BACKWARD = 'audio:backward',
  PLAYBACK_RATE = 'audio:playbackRate',
  SETUP_TRACK = 'audio:setupTrack',
  // Received from app
  SYNC = 'audio:sync',
  QUEUE_ADVANCE = 'audio:queueAdvance',
  ERROR = 'audio:error',
}

// Object with callbacks to control the web audio player
export type AudioEventHandlers = {
  handlePlay: (initialPosition?: number) => Promise<void>
  handleSetPosition: (position: number) => Promise<void>
  handlePause: () => Promise<void>
  handleStop: () => Promise<void>
  handleSeekTo: (newPosition: number) => Promise<void>
  handleForward: (forwardTime: number) => Promise<void>
  handleBackward: (backwardTime: number) => Promise<void>
  handlePlaybackRateChange: (newPlaybackRate: number) => Promise<void>
}
