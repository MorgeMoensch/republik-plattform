require('@orbiting/backend-modules-env').config()

const debug = require('debug')('search:lib:notifyListener')

const mappings = require('./indices')
const inserts = require('./inserts')
const { getIndexAlias } = require('./utils')

const BULK_SIZE = 100000

const stats = { notifications: 0 }

const cascadeUpdateConfig = {
  credentials: [
    {
      table: 'users', // update all users
      via: 'userId', // via credentials.userId
      where: 'id', // where user.id === <via>
    },
    {
      table: 'comments', // update all comments
      via: 'userId', // via credentials.userId
      where: 'userId', // where comments.userid === <via>
    },
  ],
  discussions: [
    {
      table: 'comments', // update all comments
      via: 'id', // via discussions.id
      where: 'discussionId', // where comments.discussionId === <via>
    },
  ],
  discussionPreferences: [
    {
      table: 'comments', // update all comments
      via: 'discussionId', // via discussionPreferences.discussionId
      where: 'discussionId', // where comments.discussionId === <via>
    },
  ],
}

const updateCascade = async function ({ table, rows }, { pgdb, elastic }) {
  if (cascadeUpdateConfig[table]) {
    debug('found cascade configuration')

    return Promise.all(
      cascadeUpdateConfig[table].map(async function (config) {
        const sources =
          config.via === 'id'
            ? rows.map((row) => ({ id: row.id }))
            : await pgdb.public[table].find({ id: rows.map((row) => row.id) })

        const sourceIds = sources.map((source) => source[config.via])

        if (sourceIds.length < 1) {
          return
        }

        const updateRows = await pgdb.public[config.table].find(
          { [config.where]: sourceIds },
          { fields: ['id'] },
        )

        return notificationHandler(
          {
            rows: updateRows,
            payload: JSON.stringify({ table: config.table }),
          },
          { pgdb, elastic },
        )
      }),
    )
  }
}

const notificationHandler = async (
  { rows = false, payload: originalPayload },
  { pgdb, elastic },
) => {
  const notificationHandleId = ++stats.notifications

  const tx = await pgdb.transactionBegin()

  try {
    const { table } = JSON.parse(originalPayload)
    debug('notification received', { table, notificationHandleId })

    if (!rows) {
      rows = await tx.public.notifyTableChangeQueue.query(
        'SELECT * FROM "notifyTableChangeQueue" WHERE "table" = :table LIMIT :limit FOR UPDATE SKIP LOCKED',
        { table, limit: BULK_SIZE },
      )
    }

    if (rows.length === 0) {
      debug('queue noop', { table, notificationHandleId })
      return tx.transactionCommit()
    }

    debug(
      'queue skimmed',
      { table, notificationHandleId },
      { rows: rows.length },
    )

    if (mappings.dict[table]) {
      const { type, name } = mappings.dict[table]
      const { insert } = inserts.dict[name]

      const updateIds = rows
        .filter((row) => row.op !== 'DELETE')
        .map((row) => row.id)
      const deleteIds = rows
        .filter((row) => row.op === 'DELETE')
        .map((row) => row.id)

      debug(table, { updateIds, deleteIds })

      await insert({
        indexName: getIndexAlias(name, 'write'),
        type,
        pgdb,
        elastic,
        resource: {
          table: tx.public[table],
          where: { id: updateIds.length > 0 ? updateIds : null },
          delete: deleteIds,
        },
      })
    }

    await updateCascade({ table, rows }, { pgdb, elastic })

    // No delete if rows are provided from outside
    await tx.public.notifyTableChangeQueue.delete({
      id: rows.map((row) => row.id),
    })

    debug('queue done', { table, notificationHandleId })

    await tx.transactionCommit()
  } catch (err) {
    console.error(err)
    await tx.transactionRollback()
  }
}

const run = async (workQueue, context) => {
  while (workQueue.length) {
    const input = workQueue.pop()
    await notificationHandler(input, context)
  }
}

let singleton
const start = async function ({ pgdb, elastic }) {
  if (singleton) {
    // this is just a precautionary measure, the limitation could be lifted
    // without the need to change other code here
    throw new Error('NotifyListener must not be initiated twice!')
  }
  singleton = 'init'

  let closing = false

  let runPromise
  const workQueue = []

  const cxt = await pgdb.dedicatedConnectionBegin()

  await cxt.connection.query('LISTEN change')
  await cxt.connection.on('notification', async (input) => {
    if (closing) {
      return
    }

    workQueue.push(input)

    if (!runPromise) {
      runPromise = run(workQueue, { pgdb, elastic }).then(() => {
        runPromise = null
      })
    }
  })

  debug('listening')

  const close = async () => {
    closing = true
    workQueue.length = 0 // empty queue
    runPromise && (await runPromise)

    await cxt.dedicatedConnectionEnd()

    singleton = null
  }

  return {
    close,
  }
}

module.exports = {
  start,
}
