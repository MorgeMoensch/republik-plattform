const crypto = require('crypto')
const {
  ensureSignedIn, checkUsername, transformUser
} = require('@orbiting/backend-modules-auth')
const {
  getKeyId,
  containsPrivateKey
} = require('../../../lib/pgp')
const { isEligible } = require('../../../lib/profile')
const { Redirections: {
  upsert: upsertRedirection,
  delete: deleteRedirection
} } = require('@orbiting/backend-modules-redirections')

const convertImage = require('../../../lib/convertImage')
const upload = require('../../../lib/uploadS3')
const ensureStringLength = require('../../../lib/ensureStringLength')

const {
  ASSETS_BASE_URL,
  AWS_S3_BUCKET
} = process.env

const MAX_STATEMENT_LENGTH = 140
const MAX_BIOGRAPHY_LENGTH = 2000
const MAX_PUBLIC_KEY_LENGTH = 10000 // 4k public key is 3114 chars
const MAX_PUBLIC_URL_LENGTH = 2048
const MAX_TWITTER_HANDLE_LENGTH = 15
const MAX_FACEBOOK_ID_LENGTH = 64 // (can also be something like profile.php?id=xxxxxxxxxxxxxxx)
const MAX_PHONE_NUMBER_NOTE_LENGTH = 140
const MAX_PHONE_NUMBER_LENGTH = 20 // 20 (15 digits but let's give 5 spaces for formatting, e.g. 0049 XXX XX XX XX XX)
const MAX_FIRSTNAME_LENGTH = 32
const MAX_LASTNAME_LENGTH = 32

const PORTRAIT_FOLDER = 'portraits'

const {
  IMAGE_ORIGINAL_SUFFIX,
  IMAGE_SMALL_SUFFIX,
  IMAGE_SHARE_SUFFIX
} = convertImage

const createEnsureStringLengthForProfile = (values, t) => (key, translationKey, max, min = 0) =>
  ensureStringLength(
    values[key],
    {
      min,
      max,
      error: t(`profile/generic/${min > 0 ? 'notInRange' : 'tooLong'}`, { key: t(translationKey), max, min })
    }
  )

module.exports = async (_, args, context) => {
  const { pgdb, req, user: me, t } = context
  ensureSignedIn(req)

  const {
    username,
    address,
    pgpPublicKey,
    portrait,
    statement,
    isListed
  } = args

  const ensureStringLengthForProfile = createEnsureStringLengthForProfile(args, t)
  ensureStringLengthForProfile('statement', 'profile/statement/label', MAX_STATEMENT_LENGTH)
  ensureStringLengthForProfile('biography', 'profile/biography/label', MAX_BIOGRAPHY_LENGTH)
  ensureStringLengthForProfile('pgpPublicKey', 'profile/contact/pgpPublicKey/label', MAX_PUBLIC_KEY_LENGTH)
  ensureStringLengthForProfile('publicUrl', 'profile/contact/publicUrl/label', MAX_PUBLIC_URL_LENGTH)
  ensureStringLengthForProfile('twitterHandle', 'profile/contact/twitter/label', MAX_TWITTER_HANDLE_LENGTH)
  ensureStringLengthForProfile('facebookId', 'profile/contact/facebook/label', MAX_FACEBOOK_ID_LENGTH)
  ensureStringLengthForProfile('phoneNumberNote', 'profile/contact/phoneNumberNote/label', MAX_PHONE_NUMBER_NOTE_LENGTH)
  ensureStringLengthForProfile('phoneNumber', 'profile/contact/phoneNumber/label', MAX_PHONE_NUMBER_LENGTH)
  ensureStringLengthForProfile('firstName', 'pledge/contact/firstName/label', MAX_FIRSTNAME_LENGTH, 1)
  ensureStringLengthForProfile('lastName', 'pledge/contact/lastName/label', MAX_LASTNAME_LENGTH, 1)

  const updateFields = [
    'username',
    'firstName',
    'lastName',
    'birthday',
    'ageAccessRole',
    'phoneNumber',
    'phoneNumberNote',
    'phoneNumberAccessRole',
    'facebookId',
    'twitterHandle',
    'publicUrl',
    'emailAccessRole',
    'pgpPublicKey',
    'hasPublicProfile',
    'biography',
    'isListed',
    'statement'
  ]

  let portraitUrl = portrait === null
    ? null
    : undefined

  if (
    (isListed && !me._raw.isListed) ||
    (args.hasPublicProfile && !me.hasPublicProfile)
  ) {
    const check = await isEligible(me.id, pgdb)
    if (!check) {
      throw new Error(t('profile/notEligible'))
    }
  }

  if (isListed || (isListed === undefined && me._raw.isListed)) {
    if (
      !(statement && statement.trim()) &&
      !(statement === undefined && me._raw.statement && me._raw.statement.trim())
    ) {
      throw new Error(t('profile/statement/needed'))
    }
    if (
      !portrait &&
      !(portrait === undefined && me._raw.portraitUrl)
    ) {
      throw new Error(t('profile/portrait/needed'))
    }
  }

  if (portrait) {
    const inputBuffer = Buffer.from(portrait, 'base64')

    const portaitBasePath = [
      `${PORTRAIT_FOLDER}/`,
      // always a new path—cache busters!
      crypto.createHash('md5').update(portrait).digest('hex')
    ].join('')

    // IMAGE_SMALL_SUFFIX for cf compat
    portraitUrl = `${ASSETS_BASE_URL}${portaitBasePath}${IMAGE_SMALL_SUFFIX}`

    await Promise.all([
      convertImage.toJPEG(inputBuffer)
        .then((data) => {
          return upload({
            stream: data,
            path: `${portaitBasePath}${IMAGE_ORIGINAL_SUFFIX}`,
            mimeType: 'image/jpeg',
            bucket: AWS_S3_BUCKET
          })
        }),
      convertImage.toSmallBW(inputBuffer)
        .then((data) => {
          return upload({
            stream: data,
            path: `${portaitBasePath}${IMAGE_SMALL_SUFFIX}`,
            mimeType: 'image/jpeg',
            bucket: AWS_S3_BUCKET
          })
        }),
      convertImage.toShare(inputBuffer)
        .then((data) => {
          return upload({
            stream: data,
            path: `${portaitBasePath}${IMAGE_SHARE_SUFFIX}`,
            mimeType: 'image/jpeg',
            bucket: AWS_S3_BUCKET
          })
        })
    ])
  }

  if (username !== undefined && username !== null) {
    await checkUsername(username, me, pgdb)
  }
  if (args.hasPublicProfile && !username && (!me.username || username === null)) {
    throw new Error(t('api/publicProfile/usernameRequired'))
  }
  if (
    username === null &&
    me.hasPublicProfile &&
    args.hasPublicProfile !== false
  ) {
    throw new Error(t('api/publicProfile/usernameNeeded'))
  }
  if (pgpPublicKey) {
    if (containsPrivateKey(pgpPublicKey)) {
      throw new Error(t('api/pgpPublicKey/private'))
    }
    if (!getKeyId(pgpPublicKey)) {
      throw new Error(t('api/pgpPublicKey/invalid'))
    }
  }

  const transaction = await pgdb.transactionBegin()
  const now = new Date()
  try {
    if (
      updateFields.some(field => args[field] !== undefined) ||
      portraitUrl !== undefined
    ) {
      await transaction.public.users.updateOne(
        { id: me.id },
        updateFields.reduce(
          (updates, key) => {
            updates[key] = args[key]
            return updates
          },
          {
            portraitUrl,
            updatedAt: new Date()
          }
        ),
        { skipUndefined: true }
      )
      if (username) {
        // claim other's redirection
        await deleteRedirection({
          source: `/~${username}`
        }, context, now)
      }
      if (me.username && username && me.username !== username) {
        await upsertRedirection({
          source: `/~${me.username}`,
          target: `/~${username}`,
          resource: { user: { id: me.id } },
          status: 302 // allow reclaiming by somebody else
        }, context, now)
      }
    }
    if (address) {
      if (me._raw.addressId) {
        // update address of user
        await transaction.public.addresses.updateOne(
          { id: me._raw.addressId },
          {
            ...address,
            updatedAt: now
          }
        )
      } else {
        // user has no address yet
        const userAddress = await transaction.public.addresses.insertAndGet(
          address
        )
        await transaction.public.users.updateOne(
          { id: me.id },
          { addressId: userAddress.id, updatedAt: now }
        )
      }
    }
    await transaction.transactionCommit()
    const updatedUser = await pgdb.public.users.findOne({ id: me.id })
    return transformUser(updatedUser)
  } catch (e) {
    console.error('updateMe', e)
    await transaction.transactionRollback()
    throw new Error(t('api/unexpected'))
  }
}
