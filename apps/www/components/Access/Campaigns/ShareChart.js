import React from 'react'
import { gql } from '@apollo/client'
import compose from 'lodash/flowRight'
import { graphql } from '@apollo/client/react/hoc'
import {
  ChartTitle,
  ChartLead,
  Chart,
  Loader,
  Editorial,
} from '@project-r/styleguide'
import { timeDay } from 'd3-time'
import { ascending, max, sum, min } from 'd3-array'
import { countFormat, swissTime } from '../../../lib/utils/format'
import withT from '../../../lib/withT'
import { scaleLinear } from 'd3-scale'

const CAMPAIGN_IDS = {
  old: 'e3568e03-b6b3-46c5-b07a-e9afeea92023', // "Teilen Sie Ihr Abonnement"
  new: 'b86c78c5-b36b-4de6-8656-44d5e1ba410b', // "Verschenken"
}

const accessGrantQuery = gql`
  query accessGrantQuery($min: Date!, $max: Date!) {
    accessGrantStats {
      evolution(
        accessCampaignId: "${CAMPAIGN_IDS.old}"
        min: $min
        max: $max
      ) {
        buckets {
          date
          active
          activeUnconverted
          converted
        }
        updatedAt
      }
      events(
        accessCampaignId: "${CAMPAIGN_IDS.old}"
        min: $min
        max: $max
      ) {
        buckets {
          pledges
          claims
          invites
        }
        updatedAt
      }
    }
    accessGrantStats2: accessGrantStats {
      evolution(
        accessCampaignId: "${CAMPAIGN_IDS.new}"
        min: $min
        max: $max
      ) {
        buckets {
          date
          active
          activeUnconverted
          converted
        }
        updatedAt
      }
      events(
        accessCampaignId: "${CAMPAIGN_IDS.new}"
        min: $min
        max: $max
      ) {
        buckets {
          pledges
          claims
          invites
        }
        updatedAt
      }
    }
  }
`

const apiDateFormat = '%d.%m.%Y'
const formatApiDate = swissTime.format(apiDateFormat)
const parseApiDate = swissTime.parse(apiDateFormat)

const chartTimeFormat = '%-d. %B'
const formatChartDate = swissTime.format(chartTimeFormat)
const formatDateTime = swissTime.format('%d.%m.%Y %H:%M')

const ShareChart = ({ data, t }) => {
  return (
    <div style={{ margin: '16px 0px 32px 0px' }}>
      <Loader
        loading={data.loading}
        error={data.error}
        render={() => {
          if (!data.accessGrantStats) return null

          const { events, evolution } = data.accessGrantStats
          const { events: events2, evolution: evolution2 } =
            data.accessGrantStats2

          const mergedEvolutionBuckets = evolution.buckets
            .map((bucket) => {
              const bucket2 = evolution2.buckets.find(
                (bucket2) => bucket.date === bucket2.date,
              )
              return {
                date: bucket.date,
                active: bucket.active + (bucket2 ? bucket2.active : 0),
              }
            })
            .concat(
              evolution2.buckets.filter(
                (bucket) =>
                  !evolution.buckets.find(
                    (bucket2) => bucket.date === bucket2.date,
                  ),
              ),
            )
            .sort((a, b) =>
              ascending(parseApiDate(a.date), parseApiDate(b.date)),
            )
            .map((bucket) => {
              return {
                ...bucket,
                rate: bucket.converted / bucket.active,
              }
            })

          if (!mergedEvolutionBuckets.length) {
            return null
          }
          const firstBucket = mergedEvolutionBuckets[0]
          const lastBucket = mergedEvolutionBuckets.slice(-1).pop()
          const maxBarValue = max(
            mergedEvolutionBuckets,
            (bucket) => bucket.active,
          )

          const yMax = Math.max(
            // 1.1x, ensure there is enough space for the latest/max annotation
            maxBarValue * 1.1,
            // ensure min 10 scale
            10,
          )

          const yTicksNumber = yMax > 100 ? 5 : 3
          const yScale = scaleLinear().domain([0, yMax]).nice(yTicksNumber)

          const chartValues = mergedEvolutionBuckets.map((bucket) => {
            return {
              date: bucket.date,
              value: bucket.active,
            }
          })

          const eventSums = ['pledges', 'claims', 'invites'].reduce(
            (sums, key) => {
              sums[key] =
                sum(events.buckets, (bucket) => bucket[key]) +
                sum(events2.buckets, (bucket) => bucket[key])
              return sums
            },
            {},
          )

          return (
            <>
              <ChartTitle>
                {t('Share/chart/title', {
                  currentActiveAccessGrants: lastBucket.active,
                })}
              </ChartTitle>
              <ChartLead>
                {t('Share/chart/lead', {
                  days: mergedEvolutionBuckets.length,
                })}
              </ChartLead>
              <Chart
                config={{
                  type: 'TimeBar',
                  x: 'date',
                  xBandPadding: 0,
                  color: 'type',
                  timeParse: '%d.%m.%Y',
                  timeFormat: chartTimeFormat,
                  height: 300,
                  domain: yScale.domain(),
                  yTicks: yScale.ticks(yTicksNumber),
                  xTicks: [
                    firstBucket.date,
                    mergedEvolutionBuckets[
                      Math.round(mergedEvolutionBuckets.length / 2)
                    ]?.date,
                    lastBucket.date,
                  ].filter(Boolean),
                  xAnnotations: [
                    {
                      x1: lastBucket.date,
                      x2: lastBucket.date,
                      value: lastBucket.active,
                      label: t('Share/chart/annotation/lastBucket'),
                    },
                  ].filter(Boolean),
                  colorRange: ['#256900'],
                }}
                values={chartValues}
              />
              <ChartLead style={{ marginTop: 15 }}>
                {t('Share/chart/after', {
                  startDate: formatChartDate(parseApiDate(firstBucket.date)),
                  invites: countFormat(eventSums.invites),
                  claims: countFormat(eventSums.claims),
                  pledges: countFormat(eventSums.pledges),
                })}
              </ChartLead>
              <Editorial.Note style={{ marginTop: 0 }}>
                {t('Share/chart/legend', {
                  formattedDateTime: formatDateTime(
                    min([
                      new Date(evolution.updatedAt),
                      new Date(evolution2.updatedAt),
                      new Date(events.updatedAt),
                      new Date(events2.updatedAt),
                    ]),
                  ),
                })}
              </Editorial.Note>
            </>
          )
        }}
      />
    </div>
  )
}

export default compose(
  graphql(accessGrantQuery, {
    options: () => {
      const currentDay = timeDay.floor(new Date())
      return {
        variables: {
          max: formatApiDate(currentDay),
          min: '01.01.2022',
        },
      }
    },
  }),
  withT,
)(ShareChart)
