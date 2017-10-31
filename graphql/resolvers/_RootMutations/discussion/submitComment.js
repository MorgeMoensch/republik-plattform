const Roles = require('../../../../lib/Roles')
const hottnes = require('../../../../lib/hottnes')
const setDiscussionPreferences = require('./lib/setDiscussionPreferences')
const userWaitUntil = require('../../Discussion/userWaitUntil')

module.exports = async (_, args, { pgdb, user, t, pubsub }) => {
  Roles.ensureUserHasRole(user, 'member')

  const userId = user.id
  const {
    id,
    discussionId,
    parentId,
    content,
    discussionPreferences
  } = args

  const transaction = await pgdb.transactionBegin()
  try {
    const discussion = await transaction.public.discussions.findOne({
      id: discussionId
    })
    if (!discussion) {
      throw new Error(t('api/discussion/404'))
    }

    // check if client-side generated ID already exists
    if (await transaction.public.comments.findFirst({
      id
    })) {
      throw new Error(t('api/comment/id/duplicate'))
    }

    // ensure user is within minInterval
    if (discussion.minInterval) {
      const waitUntil = await userWaitUntil(discussion, null, { pgdb, user })
      if (waitUntil) {
        throw new Error(t('api/comment/tooEarly', {
          waitFor: `${(waitUntil.getTime() - new Date().getTime()) / 1000}s`
        }))
      }
    }

    // ensure comment length is within limit
    if (discussion.maxLength && content.length > discussion.maxLength) {
      throw new Error(t('api/comment/tooLong', { maxLength: discussion.maxLength }))
    }

    if (discussionPreferences) {
      await setDiscussionPreferences({
        discussionPreferences,
        userId,
        discussion,
        transaction,
        t
      })
    }

    const comment = await transaction.public.comments.insertAndGet({
      id,
      discussionId: discussion.id,
      parentId,
      userId,
      content,
      hottnes: hottnes(0, 0, (new Date().getTime()))
    }, {
      skipUndefined: true
    })

    await transaction.transactionCommit()

    await pubsub.publish('comments', { comments: comment })

    return comment
  } catch (e) {
    await transaction.transactionRollback()
    throw e
  }
}
