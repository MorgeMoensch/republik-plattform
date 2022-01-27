const { filtered } = require('@orbiting/backend-modules-base/lib/RedisPubSub')

module.exports = {
  subscribe: (_, args, { user, pubsub }) => {
    return filtered(
      pubsub.asyncIterator('comment'),
      (update) =>
        update &&
        update.comment &&
        update.comment.node.discussionId === args.discussionId,
    )()
  },
}
