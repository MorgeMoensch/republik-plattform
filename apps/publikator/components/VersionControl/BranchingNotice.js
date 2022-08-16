import { useState } from 'react'
import { compose, graphql, Subscription } from 'react-apollo'
import NewerVersionIcon from 'react-icons/lib/md/call-split'

import { Button, colors, Loader } from '@project-r/styleguide'

import { getCommits, repoSubscription } from './index'
import { Link } from '../../lib/routes'
import { descending } from 'd3-array'

const getColors = (warning) => ({
  backgroundColor: warning ? colors.social : 'inherit',
  borderColor: warning ? colors.social : 'inherit',
  color: warning ? '#fff' : 'inherit',
})

const BranchingIcon = ({ repoId, warning }) => (
  <div
    title={`Neuere Version verfügbar${
      warning ? ': dieses Commit wird ein Baum erzeugen' : ''
    }`}
  >
    <Link route='repo/tree' params={{ repoId: repoId.split('/') }}>
      <Button
        style={{
          ...getColors(warning),
          height: 40,
          marginRight: 4,
          marginTop: 27,
          minWidth: 40,
          padding: 0,
          width: 40,
        }}
      >
        <NewerVersionIcon style={{ marginTop: -5 }} />
      </Button>
    </Link>
  </div>
)

const BranchingButton = ({ repoId, warning }) => (
  <Link route='repo/tree' params={{ repoId: repoId.split('/') }}>
    <Button
      style={{
        ...getColors(warning),
        marginBottom: 10,
      }}
      primary={warning}
      block
    >
      <NewerVersionIcon style={{ marginBottom: 4, marginRight: 4 }} /> Neuere
      Version
    </Button>
  </Link>
)

const BranchingNotice = ({
  asIcon,
  repoId,
  commit,
  commits,
  hasUncommittedChanges,
}) => {
  const [isStale, setIsStale] = useState(false)

  const commitsBehind = [...commits]
    .sort(function (a, b) {
      return descending(new Date(a.date), new Date(b.date))
    })
    .map((c) => c.id)
    .indexOf(commit.id)

  const isBehind = !!commitsBehind && commitsBehind > 0

  if (isStale || isBehind) {
    const BranchingComponent = asIcon ? BranchingIcon : BranchingButton
    return (
      <BranchingComponent repoId={repoId} warning={hasUncommittedChanges} />
    )
  }

  return (
    <Subscription
      subscription={repoSubscription}
      variables={{ repoId }}
      onSubscriptionData={({ subscriptionData: { data } }) => {
        if (
          data &&
          data.repoChange &&
          data.repoChange.commit &&
          data.repoChange.commit.id !== commit.id
        ) {
          setIsStale(true)
        }
      }}
    />
  )
}

export default compose(
  graphql(getCommits, {
    options: (props) => ({
      fetchPolicy: 'network-only',
    }),
  }),
)(({ asIcon, repoId, commit, hasUncommittedChanges, data = {} }) => {
  const { loading, error, repo } = data
  return (
    <Loader
      loading={loading || !repo?.commits}
      error={error}
      render={() => (
        <BranchingNotice
          asIcon={asIcon}
          repoId={repoId}
          commit={commit}
          commits={repo.commits?.nodes}
          hasUncommittedChanges={hasUncommittedChanges}
        />
      )}
    />
  )
})
