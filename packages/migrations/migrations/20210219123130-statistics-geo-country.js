const run = require('../run.js')

const dir = 'packages/statistics/migrations/sqls'
const file = '20210219123130-statistics-geo-country-intial'

exports.up = (db) => run(db, dir, `${file}-up.sql`)

exports.down = (db) => run(db, dir, `${file}-down.sql`)
