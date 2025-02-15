const debug = require('debug')('mail:lib:scheduler')
const { timeScheduler } = require('@orbiting/backend-modules-schedulers')
const dayjs = require('dayjs')
const cleanedUserMailing = require('./cleanedUserMailing')

const DEV = process.env.NODE_ENV ? process.env.NODE_ENV !== 'production' : true

const init = async (context) => {
  debug('init')

  const scheduler = await timeScheduler.init({
    name: 'cleaned-user-mailing',
    context,
    runFunc: async (_args, context) => {
      const { now, dryRun } = _args
      const to = dayjs(now).format('YYYY-MM-DD')
      const from = dayjs(now).add(-30, 'day').format('YYYY-MM-DD')
      debug(
        `starting job to send mail to users who were cleaned from mailing list between ${from} and ${to}`,
      )
      await cleanedUserMailing(from, to, context, dryRun)
    },
    lockTtlSecs: 60,
    runAtTime: '09:00',
    runAtDaysOfWeek: [1, 2, 3, 4, 5, 6, 7], // every day of the week
    /* atm we do not send newsletters on Sundays, so there we will 
    not have newly cleaned users but it doesn't matter to execute 
    script anyway */
    runInitially: DEV,
  })

  const close = async () => {
    await scheduler.close()
  }

  return {
    close,
  }
}

module.exports = {
  init,
}
