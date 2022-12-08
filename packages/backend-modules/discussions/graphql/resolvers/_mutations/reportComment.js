const slack = require('../../../lib/slack')
const { REPORTS_NOTIFY_THRESHOLD = 2 } = process.env

module.exports = async (_, args, context) => {
  const { id } = args
  const { pgdb, user: me, t, loaders } = context
  // Roles.ensureUserHasRole(me, 'member')

  const comment = await loaders.Comment.byId.load(id)
  if (!comment) {
    throw new Error(t('api/comment/404'))
  }
  const discussion = await loaders.Discussion.byId.load(comment.discussionId)

  const { id: commentId, userId: authorId } = comment

  if (authorId && authorId === me?.id) {
    throw new Error(t('api/comment/report/notYours'))
  }

  let newComment
  const transaction = await pgdb.transactionBegin()
  try {
    const existingComment = await pgdb.queryOne(
      `
      SELECT c.* FROM comments c WHERE c.id = :commentId FOR UPDATE
    `,
      {
        commentId,
      },
    )
    if (!existingComment) {
      throw new Error(t('api/comment/404'))
    }

    const reports = existingComment.reports || []
    const userId = me?.id ?? `guest-${new Date().toISOString()}`

    if (reports.findIndex((report) => report.userId === userId) < 0) {
      const userId = me?.id ?? `guest-${new Date().toISOString()}`
      reports.unshift({
        userId: userId,
        reportedAt: new Date(),
      })
      newComment = await pgdb.public.comments.updateAndGetOne(
        { id: commentId },
        { reports },
      )
    }

    await transaction.transactionCommit()
  } catch (e) {
    await transaction.transactionRollback()
    throw e
  }

  if (newComment) {
    await loaders.Comment.byId.clear(commentId)
    if (newComment.reports.length >= REPORTS_NOTIFY_THRESHOLD) {
      slack.publishCommentReport(
        me?.name ?? 'Gast',
        newComment,
        discussion,
        context,
      )
    }
  }

  return newComment || comment
}
