const run = require('../run.js')

const dir = 'packages/republik/migrations/crowdfunding/sqls'
const file = '20170705130701-userRoles'

exports.up = (db) => run(db, dir, `${file}-up.sql`)

exports.down = (db) => run(db, dir, `${file}-down.sql`)
