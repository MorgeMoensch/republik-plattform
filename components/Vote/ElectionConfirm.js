import React, { useState } from 'react'
import { A, Button, Interaction, InlineSpinner } from '@project-r/styleguide'
import compose from 'lodash/flowRight'
import { graphql } from '@apollo/client/react/hoc'
import { gql } from '@apollo/client'
import { css } from 'glamor'
import voteT from './voteT'
import ErrorMessage from '../ErrorMessage'
import { ElectionActions, ElectionHeader } from './Election'

const { P } = Interaction

const submitElectionBallotMutation = gql`
  mutation submitElectionBallot($electionId: ID!, $candidacyIds: [ID!]!) {
    submitElectionBallot(electionId: $electionId, candidacyIds: $candidacyIds) {
      id
      userHasSubmitted
      userSubmitDate
    }
  }
`

const styles = {
  wrapper: css({
    width: '100%',
    position: 'relative',
    minHeight: 200
  }),
  confirm: css({
    textAlign: 'center',
    width: '80%',
    margin: '10px 0 15px 0'
  }),
  link: css({
    marginTop: 10
  })
}

const CandidatesLocation = ({ candidates }) => {
  return <div>CANDIDATES LOCATION</div>
}

const CandidatesGender = ({ candidates }) => {
  return <div>CANDIDATES GENDER</div>
}

const CandidatesAge = ({ candidates }) => {
  return <div>CANDIDATES AGE</div>
}

const ElectionConfirm = compose(
  voteT,
  graphql(submitElectionBallotMutation, {
    props: ({ mutate }) => ({
      submitElectionBallot: (electionId, candidacyIds) => {
        return mutate({
          variables: {
            electionId,
            candidacyIds
          }
        })
      }
    })
  })
)(({ election, vote, submitElectionBallot, goBack, vt }) => {
  const [isUpdating, setUpdating] = useState(false)
  const [error, setError] = useState(null)
  const selectedCandidates = vote
    .filter(item => item.selected)
    .map(item => item.candidate)

  const submitBallot = async () => {
    setUpdating(true)
    await submitElectionBallot(
      election.id,
      selectedCandidates.map(candidate => candidate.id)
    )
      .then(() => {
        setUpdating(false)
        setError(null)
        goBack()
      })
      .catch(error => {
        setUpdating(false)
        setError(error)
      })
  }

  const { numSeats } = election
  const givenVotes = vote.filter(item => item.selected).length
  const remainingVotes = numSeats - givenVotes

  const confirmation = (
    <P {...styles.confirm}>
      {givenVotes < numSeats
        ? vt.pluralize('vote/election/labelConfirmCount', {
            count: givenVotes,
            numSeats,
            remaining: remainingVotes
          })
        : vt.pluralize('vote/election/labelConfirmAll', {
            numSeats,
            count: givenVotes
          })}
    </P>
  )

  const actions = (
    <>
      <Button primary onClick={submitBallot}>
        {isUpdating ? (
          <InlineSpinner size={40} />
        ) : (
          vt('vote/election/labelConfirm')
        )}
      </Button>
      <A href='#' {...styles.link} onClick={goBack}>
        Zurück
      </A>
    </>
  )

  return (
    <>
      {givenVotes && (
        <ElectionHeader>
          <P>
            <strong>
              So sieht das von Ihnen gewählten Genossenschaftsrat aus:
            </strong>
          </P>
        </ElectionHeader>
      )}
      <div {...styles.wrapper}>
        <CandidatesLocation candidates={selectedCandidates} />
        <CandidatesGender candidates={selectedCandidates} />
        <CandidatesAge candidates={selectedCandidates} />
        <ElectionActions>
          {error && <ErrorMessage error={error} />}
          {confirmation}
          {actions}
        </ElectionActions>
      </div>
    </>
  )
})

export default ElectionConfirm
