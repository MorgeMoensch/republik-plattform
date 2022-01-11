import React from 'react'
import compose from 'lodash/flowRight'
import { useRouter } from 'next/router'
import Frame from '../../components/Frame'
import withT from '../../lib/withT'
import withDefaultSSR from '../../lib/hocs/withDefaultSSR'
import AccountTabs from '../../components/Account/AccountTabs'
import { MainContainer } from '../../components/Frame'
import PledgeList from '../../components/Account/PledgeList'
import AccountSection from '../../components/Account/AccountSection'

const TransactionPage = ({ t }) => {
  const { query, pathname } = useRouter()
  return (
    <Frame raw>
      <MainContainer>
        <AccountTabs pathname={pathname} t={t} />
        <AccountSection
          id='transactions'
          title={t('account/transactions/title')}
        >
          <PledgeList highlightId={query.id} />
        </AccountSection>
      </MainContainer>
    </Frame>
  )
}

export default withDefaultSSR(compose(withT)(TransactionPage))
