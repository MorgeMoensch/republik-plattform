import React from 'react'
import { compose } from 'react-apollo'
import AccessCampaigns from '../components/Access/Campaigns'
import Frame from '../components/Frame'
import { enforceMembership } from '../components/Auth/withMembership'
import { t } from '../lib/withT'

const meta = {
  title: t('pages/access/title')
}

const Page = () => (
  <Frame meta={meta}>
    <AccessCampaigns />
  </Frame>
)

export default compose(enforceMembership())(Page)
