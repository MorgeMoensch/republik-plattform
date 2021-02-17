require('@orbiting/backend-modules-env').config()
const PgDb = require('@orbiting/backend-modules-base/lib/PgDb')
const rw = require('rw')
const { dsvFormat } = require('d3-dsv')
const csvParse = dsvFormat(',').parse

console.log('running import of first name statistics of BfS....')

PgDb.connect()
  .then(async (pgdb) => {
    const dry = process.argv[2] === '--dry'
    if (dry) {
      console.log("dry run: this won't change anything")
    }

    const input = rw.readFileSync('/dev/stdin', 'utf8')
    if (!input) {
      throw new Error('You need to provide input on stdin')
    }

    const transaction = await pgdb.transactionBegin()

    console.log('Truncate db table statisticsNameGender...')
    await transaction.query(`TRUNCATE TABLE "statisticsNameGender"`)

    console.log('Parse csv and insert into db table...')
    csvParse(input, async (row) => {
      let femaleCount = parseInt(row.female, 10)
      let maleCount = parseInt(row.male, 10)
      let gender = 'both'

      if (isNaN(femaleCount) || femaleCount === 0) {
        femaleCount = null
        gender = 'male'
      } else if (isNaN(maleCount) || maleCount === 0) {
        maleCount = null
        gender = 'female'
      }

      await transaction.public.statisticsNameGender.insert({
        firstName: row.firstname,
        femaleCount,
        maleCount,
        gender,
      })
    })

    if (dry) {
      console.log('rolling back...')
      await transaction.transactionRollback()
    } else {
      console.log('comitting changes...')
      await transaction.transactionCommit()
    }
  })
  .then(() => {
    process.exit()
  })
  .catch((e) => {
    console.log(e)
    process.exit(1)
  })
