#!/usr/bin/env node
require('@orbiting/backend-modules-env').config()

const Promise = require('bluebird')
const moment = require('moment')
const debug = require('debug')(
  'republik:script:prolong:segmentUsersForMailchimp',
)

const {
  lib: { ConnectionContext },
} = require('@orbiting/backend-modules-base')
const { AccessToken } = require('@orbiting/backend-modules-auth')
const {
  findEligableMemberships,
  hasDormantMembership: hasDormantMembership_,
  resolveMemberships,
} = require('@orbiting/backend-modules-republik-crowdfundings/lib/CustomPackages')
const {
  getPeriodEndingLast,
} = require('@orbiting/backend-modules-republik-crowdfundings/lib/utils')

// const { getConsentLink } = require('../../lib/Newsletter')

const applicationName =
  'backends republik script prolong segmentUsersForMailchimp'

const stats = {}

const handleRow = async (row) => {
  const { memberships, accessGrants, ...user } = row

  // whether or not a user had any periods
  const hadSomePeriods =
    memberships
      .reduce((acc, cur) => acc.concat(cur.periods), [])
      .filter(Boolean).length > 0

  // had a non-monthly-abo membership once
  const hadAbo = !!memberships
    .filter((m) => m.periods?.length)
    .find((m) => m.membershipType.name !== 'MONTHLY_ABO')

  // find any currently active memberships
  const activeMembership = memberships.find((m) => m.active)

  // memberships which could be prolonged
  const eligableMemberships = findEligableMemberships({
    memberships,
    user,
    ignoreClaimedMemberships: true,
  })

  // check if there is a dormant membership
  const hasDormantMembership = hasDormantMembership_({
    user,
    memberships: eligableMemberships,
  })

  // return last period of all memberships
  const lastPeriod = getPeriodEndingLast(
    memberships
      .reduce((acc, cur) => acc.concat(cur.periods), [])
      .filter(Boolean),
  )

  // return last end date of all memberships
  const lastEndDate = !!lastPeriod && moment(lastPeriod.endDate)

  // if active, package option used to pay latest period
  const mostRecentPackageOption =
    activeMembership?.latestPeriod?.pledgeOption?.packageOption

  // if active, package option used to buy membership
  const pledgePackageOption = activeMembership?.pledgeOption?.packageOption

  // if active, current membership type name
  const membershipTypeName =
    mostRecentPackageOption?.membershipType?.name ||
    pledgePackageOption?.membershipType?.name

  // if active, last price paid
  const price = mostRecentPackageOption?.price || pledgePackageOption?.price

  // reducedPrice?!

  // suggested membership type (name)
  const suggestedMembershipTypeName = ['ABO', 'BENEFACTOR_ABO'].includes(
    membershipTypeName,
  )
    ? membershipTypeName
    : 'ABO'

  // suggested price
  const suggestedPrice = price >= 24000 ? price : 24000

  // had an access grant
  const hadGrant = !!accessGrants?.length

  const vars = {
    activeMembership: !!activeMembership,
    hasDormantMembership,
    membershipTypeName,
    lastEndDate: lastEndDate?.format?.('YYYY-MM-DD'),
    hadSomePeriods,
    hadAbo,
    hadGrant,
  }

  const record = {
    id: row.id,
    EMAIL: row.email,
    FNAME: `"${row.firstName ?? ''}"`,
    LNAME: `"${row.lastName ?? ''}"`,
    PRLG_MT: membershipTypeName || '',
    PRLG_PRC: '',
    PRLG_PRC2: '',
    PRLG_SEG: '',
    CP_ATOKEN: '',
    // NL_LINK: getConsentLink(row.email, 'WINTER'),

    __vars: Object.keys(vars)
      .map((key) => `${key}:${vars[key]}`)
      .join(' / '),
  }

  if (
    activeMembership &&
    !hasDormantMembership &&
    membershipTypeName !== 'MONTHLY_ABO' &&
    lastEndDate?.isBefore('2023-04-01')
  ) {
    record.PRLG_SEG = 'prolong-before-2023-04'
    record.CP_ATOKEN = row.accessToken
    record.PRLG_MT = suggestedMembershipTypeName
    record.PRLG_PRC = suggestedPrice
    record.PRLG_PRC2 = suggestedPrice * 2
  } else if (
    activeMembership &&
    (membershipTypeName !== 'MONTHLY_ABO' ||
      (membershipTypeName === 'MONTHLY_ABO' && hasDormantMembership)) // those upgrading from MONTHLY_ABO
  ) {
    // - prolong after
    // - (maybe) hasDormantMembership
    // - monthly abo but going to changeover
    record.PRLG_SEG = 'is-active-abo'
    record.CP_ATOKEN = row.accessToken
    record.PRLG_MT = suggestedMembershipTypeName
    record.PRLG_PRC = suggestedPrice
    record.PRLG_PRC2 = suggestedPrice * 2
  } else if (
    activeMembership &&
    membershipTypeName === 'MONTHLY_ABO' &&
    !hasDormantMembership
  ) {
    // - monthly abo
    // - but not those in changeover to ABO
    record.PRLG_SEG = 'is-active-monthly'
    record.CP_ATOKEN = hadAbo ? row.accessToken : ''
    record.PRLG_MT = hadAbo ? suggestedMembershipTypeName : ''
    record.PRLG_PRC = hadAbo ? suggestedPrice : ''
    record.PRLG_PRC2 = hadAbo ? suggestedPrice * 2 : ''
  } else if (!activeMembership && hadSomePeriods && hadAbo) {
    // find memberships which were not MONTHLY_ABO
    record.PRLG_SEG = 'is-alumni-abo'
    record.CP_ATOKEN = row.accessToken
    record.PRLG_MT = hadAbo ? suggestedMembershipTypeName : ''
    record.PRLG_PRC = hadAbo ? suggestedPrice : ''
    record.PRLG_PRC2 = hadAbo ? suggestedPrice * 2 : ''
  } else if (!activeMembership && hadSomePeriods && !hadAbo) {
    // find memberships which were MONTHLY_ABO
    record.PRLG_SEG = 'is-alumni-monthly'
    record.CP_ATOKEN = ''
  } else if (!activeMembership && !hadSomePeriods && hadGrant) {
    // had access grant
    record.PRLG_SEG = 'had-grant'
    record.CP_ATOKEN = ''
  } else if (
    !activeMembership &&
    !hasDormantMembership &&
    !membershipTypeName &&
    !lastEndDate &&
    !hadSomePeriods &&
    !hadAbo &&
    !hadGrant
  ) {
    // neither props is true
    record.PRLG_SEG = 'is-prospect'
    record.CP_ATOKEN = ''
  } else {
    record.PRLG_SEG = 'n/a'
    console.error(record)
    throw new Error(`fall through: userId:${row.id}`)
  }

  const key = record.PRLG_SEG // [record.PRLG_SEG, record.PRLG_MT].filter(Boolean).join(' - ')

  if (!stats[key]) {
    stats[key] = 1
  } else {
    stats[key]++
  }

  // if (stats[key] <= 5) {
  console.log(
    Object.keys(record)
      .map((key) => record[key])
      .join(','),
  )
  // }
}

const handleBatch = async (rows, count, pgdb) => {
  const memberships = await resolveMemberships({
    memberships: await pgdb.public.memberships.find({
      userId: rows.map((row) => row.id),
    }),
    pgdb,
  })

  const accessGrants = await pgdb.public.accessGrants.find({
    recipientUserId: rows.map((row) => row.id),
    'beginAt !=': null,
  })

  await Promise.map(rows, async (row, index) => {
    rows[index].memberships = memberships.filter((m) => m.userId === row.id)
    rows[index].accessGrants = accessGrants.filter(
      (ag) => ag.recipientUserId === row.id,
    )
    rows[index].accessToken = await AccessToken.generateForUser(
      row,
      'CUSTOM_PLEDGE_EXTENDED',
    )
  })

  await Promise.map(rows, handleRow, { concurrency: 1 })
  debug('%i rows processed', count)
}

ConnectionContext.create(applicationName)
  .then(async (context) => {
    const { pgdb } = context

    console.log(
      [
        'id',
        'EMAIL',
        'FNAME',
        'LNAME',
        'PRLG_MT',
        'PRLG_PRC',
        'PRLG_PRC2',
        'PRLG_SEG',
        'CP_ATOKEN',
        // 'NL_LINK',

        '__vars',
      ].join(','),
    )

    await pgdb
      .queryInBatches(
        { handleFn: handleBatch, size: 2000 },
        `
          SELECT u.*
          FROM users u
          -- Include if only users with memberships matter
          -- JOIN memberships m ON m."userId" = u.id

          -- Test Geschenk-Monatsabos:
          -- JOIN "membershipTypes" mt ON mt.id = m."membershipTypeId" AND mt.name IN ('ABO_GIVE_MONTHS') AND m.active = TRUE
          
          -- Test Monatsabos:
          -- JOIN "membershipTypes" mt ON mt.id = m."membershipTypeId" AND mt.name IN ('MONTHLY_ABO') AND m.active = TRUE

          -- Link to temp MailChimp Audience table
          LEFT JOIN "paeMailchimpAudience" pmc ON pmc.email = u.email

          WHERE
            u.email != 'jefferson@project-r.construction'
            AND "deletedAt" IS NULL
            AND u.email NOT LIKE '%_deleted@republik.ch'
            -- Benachrichten notwendig
            -- AND u.roles @> '"gen202211"'
            -- AND m.active = TRUE
            -- Test specific user:
            -- AND u.id = 'd94a7540-afbd-4134-b35d-19f9f5a28598'
            AND pmc."Republik NL" LIKE '%Project R%'
            -- AND u.id = 
            /* AND u.id IN (
              '8320ccba-529b-4682-907d-1d8c1fe5aca3',
              '3b0dad5c-813a-4003-b4e1-64e3dfd137d7',
              '7f7f5474-8d85-4ab4-86a0-ad48c300019e'
            ) */
          GROUP BY u.id
          ORDER BY RANDOM()
          -- LIMIT 100
          ;
        `,
      )
      .catch((e) => console.error(e))

    debug(stats)
    debug('Done!')

    return context
  })
  .then((context) => ConnectionContext.close(context))