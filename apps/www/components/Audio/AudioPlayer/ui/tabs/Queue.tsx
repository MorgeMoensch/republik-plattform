import { css } from 'glamor'
import { MotionConfig, Reorder } from 'framer-motion'
import QueueItem from './QueueItem'
import useAudioQueue from '../../../hooks/useAudioQueue'
import { AudioQueueItem } from '../../../graphql/AudioQueueHooks'
import { useEffect, useRef, useState } from 'react'
import throttle from 'lodash/throttle'
import LoadingPlaceholder from './LoadingPlaceholder'

const styles = {
  list: css({
    listStyle: 'none',
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
    margin: '24px 0',
  }),
}

type QueueProps = {
  t: any
  activeItem: AudioQueueItem
  items: AudioQueueItem[]
  handleOpenArticle: (path: string) => Promise<void>
  handleDownload: (item: AudioQueueItem['document']) => Promise<void>
}

const Queue = ({
  t,
  activeItem,
  items: inputItems,
  handleOpenArticle,
  handleDownload,
}: QueueProps) => {
  /**
   * Work with a copy of the inputItems array to allow the mutation inside the
   * handleReorder function to be throttled while still having a smooth reordering in the ui.
   */
  const [items, setItems] = useState<AudioQueueItem[]>(inputItems)
  const ref = useRef()
  const {
    audioQueueIsLoading,
    moveAudioQueueItem,
    removeAudioQueueItem,
    reorderAudioQueue,
    checkIfActiveItem,
  } = useAudioQueue()

  /**
   * Synchronize the items passed via props with the internal items state.
   */
  useEffect(() => {
    setItems(inputItems)
  }, [inputItems])

  /**
   * Move the clicked queue-item to the front of the queue
   * @param item
   */
  const handleClick = async (item: AudioQueueItem) => {
    await moveAudioQueueItem({
      variables: {
        id: item.id,
        sequence: 1,
      },
    })
  }

  /**
   * Remove a given item from the queue
   * @param item
   */
  const handleRemove = async (item: AudioQueueItem) => {
    try {
      await removeAudioQueueItem({
        variables: {
          id: item.id,
        },
      })
    } catch (e) {
      console.error(e)
      alert(
        'Could not remove item from playlist\n' + JSON.stringify(item, null, 2),
      )
    }
  }

  const handleReorder = throttle(async (items: AudioQueueItem[]) => {
    try {
      const reorderedQueue = [activeItem, ...items].filter(Boolean)

      await reorderAudioQueue({
        variables: {
          ids: reorderedQueue.map(({ id }) => id),
        },
        optimisticResponse: {
          audioQueueItems: reorderedQueue.map((item, index) => ({
            ...item,
            sequence: index + 1,
            __typename: 'AudioQueueItem',
          })),
        },
      })
    } catch (e) {
      console.error(e)
      alert('Could not reorder playlist')
    }
  }, 1000)

  if (audioQueueIsLoading) {
    return <LoadingPlaceholder />
  }

  return (
    <MotionConfig transition={{ duration: 0.3 }}>
      <Reorder.Group
        as='ol'
        {...styles.list}
        axis='y'
        values={items}
        onReorder={(reorderedItems) => {
          setItems(reorderedItems)
          handleReorder(reorderedItems)
        }}
        ref={ref}
      >
        {items.map((item) => (
          <QueueItem
            key={item.id}
            t={t}
            item={item}
            isActive={checkIfActiveItem(item.document.id)}
            onClick={handleClick}
            onRemove={handleRemove}
            onDownload={handleDownload}
            onOpen={handleOpenArticle}
            constraintRef={ref}
          />
        ))}
      </Reorder.Group>
    </MotionConfig>
  )
}

export default Queue
