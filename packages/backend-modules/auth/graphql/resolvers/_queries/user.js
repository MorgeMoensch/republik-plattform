const { getUserByAccessToken } = require('../../../lib/AccessToken')
const { resolveUser } = require('../../../lib/Users')
const Roles = require('../../../lib/Roles')
const transformUser = require('../../../lib/transformUser')

module.exports = async (_, { slug, accessToken }, context) => {
  // use access token to return user
  if (!slug && accessToken) {
    return getUserByAccessToken(accessToken, context)
  }

  if (!slug) {
    return null
  }

  const { user: me, pgdb } = context

  const user = await resolveUser({ slug, pgdb })

  if (
    !user ||
    (user.deletedAt && !Roles.userIsInRoles(me, ['admin', 'supporter']))
  ) {
    return null
  }

  if (
    Roles.userIsInRoles(me, ['admin', 'supporter']) ||
    Roles.userIsMeOrProfileVisible(user, me)
  ) {
    return transformUser(user)
  }

  return null
}
