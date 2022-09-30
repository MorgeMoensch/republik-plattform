import React from 'react'
import { css } from 'glamor'
import Scrubber from './controls/Scrubber'
import { AudioPlayerProps, FALLBACK_IMG_SRC } from './shared'
import Time from './ui/Time'
import {
  IconButton,
  Spinner,
  fontStyles,
  PlayIcon,
  PauseIcon,
  CloseIcon,
  ExpandLessIcon,
  mediaQueries,
} from '@project-r/styleguide'
import AudioPlayerTitle from './ui/AudioPlayerTitle'
import { imageResizeUrl } from 'mdast-react-render/lib/utils'

const styles = {
  root: css({
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    width: '100%',
    height: 68,
    [mediaQueries.mUp]: {
      marginBottom: 0,
    },
  }),
  cover: css({
    aspectRatio: '1 / 1',
    objectFit: 'cover',
    width: 40,
    height: 'auto',
  }),
  playerWrapper: css({
    flex: 1,
    display: 'flex',
    justifyContent: 'flex-start',
    gap: 8,
    alignItems: 'center',
    padding: '0 16px 0 8px',
  }),
  metaDataWrapper: css({
    display: 'flex',
    flex: 1,
    flexDirection: 'column',
  }),
  buttonWrapper: css({
    display: 'flex',
    flexDirection: 'row',
    margin: 0,
    '& > *:not(:last-child)': {
      marginRight: 6,
    },
  }),
  spinnerWrapper: css({
    position: 'relative',
    width: 42,
    height: 42,
  }),
  title: css({
    ...fontStyles.sansSerifRegular14,
    textDecoration: 'none',
    '&[href]:hover': {
      textDecoration: 'underline',
      textDecorationSkip: 'ink',
    },
  }),
}

type MiniAudioPlayerProps = {
  handleExpand: () => void
  handleToggle: () => void
  handleSeek: (progress: number) => void
  handleClose: () => void
  handleOpenArticle: (path: string) => Promise<void>
} & Omit<AudioPlayerProps, 'actions' | 'queuedItems' | 'playbackRate'>

const MiniAudioPlayer = ({
  t,
  activeItem,
  isPlaying,
  isLoading,
  currentTime = 0,
  duration = 0,
  buffered,
  handleExpand,
  handleToggle,
  handleSeek,
  handleClose,
  handleOpenArticle,
}: MiniAudioPlayerProps) => {
  const {
    document: {
      meta: { title, path, image },
    },
  } = activeItem
  const cover = imageResizeUrl(image, '250x') || FALLBACK_IMG_SRC

  return (
    <div {...styles.root}>
      <div {...styles.playerWrapper}>
        {isLoading ? (
          <div {...styles.spinnerWrapper}>
            <Spinner size={32} />
          </div>
        ) : (
          <IconButton
            onClick={handleToggle}
            title={t(`styleguide/AudioPlayer/${isPlaying ? 'pause' : 'play'}`)}
            aria-live='assertive'
            Icon={isPlaying ? PauseIcon : PlayIcon}
            size={42}
            fillColorName={'text'}
            style={{ marginRight: 0 }}
          />
        )}
        <img {...styles.cover} src={cover} />
        <div {...styles.metaDataWrapper}>
          <AudioPlayerTitle
            lineClamp={1}
            title={title}
            onClick={() => handleOpenArticle(path)}
          />
          <Time currentTime={currentTime} duration={duration} />
        </div>
        <div {...styles.buttonWrapper}>
          <IconButton
            Icon={ExpandLessIcon}
            size={32}
            fillColorName='text'
            title={t(`styleguide/AudioPlayer/expand`)}
            onClick={handleExpand}
          />
          <IconButton
            Icon={CloseIcon}
            size={24}
            fillColorName={'text'}
            onClick={handleClose}
            title={t('styleguide/AudioPlayer/close')}
          />
        </div>
      </div>
      <div>
        <Scrubber
          currentTime={currentTime}
          duration={duration}
          buffered={buffered}
          onSeek={handleSeek}
          disabled={isLoading}
          showScrubber={false}
        />
      </div>
    </div>
  )
}

export default MiniAudioPlayer
