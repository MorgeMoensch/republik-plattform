import React from 'react'
import { withRouter } from 'next/router'
import { compose, graphql } from 'react-apollo'
import gql from 'graphql-tag'
import { descending } from 'd3-array'
import { css } from 'glamor'

import withT from '../lib/withT'
import { Link, routes } from '../lib/routes'
import {
  PUBLIC_BASE_URL,
  CDN_FRONTEND_BASE_URL
} from '../lib/constants'

import Frame from '../components/Frame'
import Loader from '../components/Loader'
import Container from '../components/Card/Container'
import Cantons from '../components/Card/Cantons'
import Logo from '../components/Card/Logo'
import { Center, Editorial, Interaction, colors } from '@project-r/styleguide'
import DiscussionIconLink from '../components/Card/DiscussionIconLink'
import LatestComments from '../components/Feedback/LatestComments'

const query = gql`
query {
  cardGroups(first: 50) {
    nodes {
      id
      slug
      name
      cards {
        totalCount
      }
      discussion {
        id
        comments {
          id
          totalCount
        }
      }
    }
  }
}
`

const SIZE = 40
const WIDTH = 270
const MARGIN = 10

const styles = {
  cantons: css({
    maxWidth: WIDTH * 3 + MARGIN * 2 * 3,
    margin: '0 auto',
    textAlign: 'center'
  }),
  canton: css(Interaction.fontRule, {
    fontSize: 16,
    position: 'relative',
    paddingLeft: SIZE + 10,
    paddingTop: 0,
    display: 'inline-block',
    color: colors.text,
    margin: MARGIN,
    textAlign: 'left',
    width: WIDTH,
    height: SIZE,
    overflow: 'hidden'
  }),
  cardCount: css({
    fontFeatureSettings: '"tnum" 1, "kern" 1'
  }),
  cardsLink: css({
    display: 'inline-block',
    minWidth: 130,
    color: colors.text,
    textDecoration: 'none',
    '@media(hover)': {
      '[href]:hover > *': {
        opacity: 0.8
      }
    }
  }),
  discussionLink: css({
    position: 'relative',
    top: -12,
    display: 'inline-block',
    paddingLeft: 10
  }),
  flag: css({
    position: 'absolute',
    left: 0,
    top: 0
  }),
  discussionFeedHeadline: css({
    marginTop: 20,
    marginBottom: 30
  })
}

const Page = ({ data, data: { cardGroups }, router, t }) => (
  <Frame raw meta={{
    pageTitle: t('pages/cardGroups/pageTitle'),
    title: t('pages/cardGroups/pageTitle'),
    description: t('pages/cardGroups/description'),
    url: `${PUBLIC_BASE_URL}${routes.find(r => r.name === 'cardGroups').toPath()}`,
    image: `${CDN_FRONTEND_BASE_URL}/static/social-media/republik-wahltindaer-08.png`
  }}>
    <Container imprint={false}>
      <div style={{ padding: 10, maxWidth: 700, margin: '40px auto 0', textAlign: 'center' }}>
        <Editorial.Headline>
          {t('pages/cardGroups/headline')}
          <Logo style={{
            marginLeft: 20,
            marginBottom: -20
          }} size={80} />
        </Editorial.Headline>
        <Editorial.P>
          {t('pages/cardGroups/lead')}
          {' '}
          <Editorial.A href='/wahltindaer/meta'>{t('pages/cardGroups/lead/more')}</Editorial.A>
        </Editorial.P>
        <Editorial.P>
          <strong>{t('pages/cardGroups/choose')}</strong>
        </Editorial.P>
      </div>
      <Loader loading={data.loading} error={data.error} render={() => {
        const groups = []
          .concat(cardGroups.nodes)
          .sort((a, b) => descending(a.cards.totalCount, b.cards.totalCount))

        return (
          <div {...styles.cantons} style={{ opacity: 1 }}>
            {groups.map(cardGroup => {
              const Flag = Cantons[cardGroup.slug] || null
              const commentCount = cardGroup.discussion.comments.totalCount
              const partyQuery = router.query.party && {
                party: router.query.party
              }
              return (
                <div {...styles.canton} key={cardGroup.slug}>
                  <Link route='cardGroup' params={{ group: cardGroup.slug, ...partyQuery }} passHref>
                    <a {...styles.cardsLink}>
                      {Flag && <Flag size={SIZE} {...styles.flag} />}
                      <strong>{cardGroup.name}</strong>
                      <br />
                      <span>{t.pluralize.elements('pages/cardGroups/cardCount', {
                        count: <span key='count' {...styles.cardCount}>
                          {cardGroup.cards.totalCount}
                        </span>
                      })}</span>
                    </a>
                  </Link>
                  {!!commentCount && <span {...styles.discussionLink}>
                    <Link route='cardGroup' params={{
                      group: cardGroup.slug,
                      suffix: 'diskussion',
                      ...partyQuery
                    }} passHref>
                      <DiscussionIconLink count={commentCount} />
                    </Link>
                  </span>}
                </div>
              )
            })}
          </div>
        )
      }} />
      <br />
      <br />
    </Container>

    <Center style={{ marginBottom: 30 }}>
      <Interaction.H3 {...styles.discussionFeedHeadline}>
        {t('pages/cardGroups/latestComments')}
      </Interaction.H3>
      <Loader
        loading={data.loading}
        error={data.error}
        render={() => {
          return (
            <LatestComments
              discussionIds={data.cardGroups.nodes.map(card => card.discussion.id)}
              toDepth={0} />
          )
        }} />
    </Center>
  </Frame>
)

export default compose(
  withRouter,
  withT,
  graphql(query)
)(Page)
