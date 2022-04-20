import { IconButton } from '@project-r/styleguide'
import { DiscussionIcon } from '@project-r/styleguide'
import { focusSelector } from '../../lib/utils/scroll'
import { getDiscussionLinkProps } from './utils'
import Link from 'next/link'

const DiscussionLinkButton = ({
  t,
  document,
  forceShortLabel,
  useCallToActionLabel = false,
  isOnArticlePage,
}) => {
  const meta = document && document.meta
  const {
    discussionId,
    discussionPath,
    discussionQuery,
    discussionCount,
    isDiscussionPage,
  } = getDiscussionLinkProps(
    meta.linkedDiscussion,
    meta.ownDiscussion,
    meta.template,
    meta.path,
  )

  const getLabel = () => {
    if (useCallToActionLabel) {
      if (discussionCount > 0) {
        return t('article/actionbar/discussion/call-to-action', {
          count: discussionCount,
        })
      }
      return t('article/actionbar/discussion/call-to-action/empty')
    }

    if (forceShortLabel) {
      return discussionCount
    }

    return t('profile/documents/title/other', {
      count: discussionCount || '',
    })
  }

  return (
    <Link
      href={{
        pathname: discussionPath,
        query: discussionQuery,
      }}
      passHref
    >
      <IconButton
        Icon={DiscussionIcon}
        label={getLabel()}
        labelShort={useCallToActionLabel ? getLabel() : discussionCount}
        fillColorName='primary'
        onClick={
          isDiscussionPage && isOnArticlePage
            ? (e) => {
                e.preventDefault()
                focusSelector(`[data-discussion-id='${discussionId}']`)
              }
            : undefined
        }
      />
    </Link>
  )
}

export default DiscussionLinkButton
