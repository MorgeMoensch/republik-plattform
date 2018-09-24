import React, { Component, Fragment } from 'react'
import PropTypes from 'prop-types'
import { css } from 'glamor'
import { A, fontStyles, mediaQueries, colors, Interaction, DEFAULT_PROFILE_PICTURE } from '@project-r/styleguide'
import ChevronRightIcon from 'react-icons/lib/md/chevron-right'
import ChevronDownIcon from 'react-icons/lib/md/expand-more'
import { Strong } from './text'
import { Checkbox, Radio } from '@project-r/styleguide'

const { P } = Interaction

const styles = {
  row: css({
    position: 'relative',
    width: '100%',
    marginRight: 20
  }),
  statement: css({
    [mediaQueries.onlyS]: {
      marginBottom: 15,
      ...fontStyles.serifTitle22
    },
    ...fontStyles.serifTitle26
  }),
  summaryWrapper: css({
  }),
  summary: css({
    width: '100%',
    display: 'flex',
    cursor: 'pointer',
    ...fontStyles.sansSerifRegular16,
    lineHeight: 1.3,
    '& :nth-child(1)': {
      width: '25%'
    },
    '& :nth-child(2)': {
      width: '15%'
    },
    '& :nth-child(3)': {
      width: '40%',
      paddingRight: 5,
    },
    ':nth-child(4)': {
      width: '20%'
    },
    [mediaQueries.onlyS]: {
      ...fontStyles.sansSerifRegular16,
      '& :nth-child(1)': {
        width: '100%'
      },
      '& :not(:first-child)': {
        display: 'none'
      }
    }
  }),
  summaryMobile: css({
    display: 'none',
    [mediaQueries.onlyS]: {
      width: '100%',
      lineHeight: 1.4,
      marginTop: 5,
      display: 'block'
    }
  }),
  summaryLinks: css({
    width: '100%',
    minHeight: 20,
    display: 'flex',
    borderTop: '1px solid black',
    '& :nth-child(1)': {
      width: '60%'
    }
  }),
  details: css({
    width: '100%',
    margin: '15px 0',
    '& img': {
      width: 104,
      height: 104,
      marginRight: 8
    }
  }),
  profile: css({
    display: 'flex',
    alignItems: 'start',
    [mediaQueries.onlyS]: {
      flexDirection: 'column-reverse',
    }
  }),
  recommendation: css({
    marginTop: 15,
  }),
  wrapper: css({
    width: '100%',
    display: 'flex',
    padding: 5

  }),
  wrapperSelected: css({
    background: colors.secondaryBg
  }),
  icon: css({
    marginTop: -3,
    padding: 2,
    [mediaQueries.onlyS]: {
      marginTop: 0,
    }
  })
}

class ElectionBallotRow extends Component {
  constructor (props) {
    super(props)
    this.state = {
      expanded: props.expanded || false
    }
    this.toggleExpanded = () => {
      this.setState(({expanded}) => ({
        expanded: !expanded
      }))
    }
  }

  render () {
    const { candidate, maxVotes, selected, onChange, disabled } = this.props
    const { expanded } = this.state
    const SelectionComponent = maxVotes > 1 ? Checkbox : Radio

    const { user: d } = candidate

    const summary =
      <Fragment>
        <div>
          { candidate.yearOfBirth }
        </div>
        <div>
          { (d.credentials.find(c => c.isListed) || {}).description }
        </div>
        <div>
          { candidate.city }
        </div>
      </Fragment>

    return (
      <div {...styles.wrapper} {...(expanded && styles.wrapperSelected)}>
        <div
          onClick={e => { e.preventDefault(); this.toggleExpanded(d.id) }}
        >
          {
            expanded
              ? <div {...styles.icon}><ChevronDownIcon /></div>
              : <div {...styles.icon}><ChevronRightIcon /></div>
          }
        </div>
        <div
          {...styles.row}
        >
          <div {...styles.summary} onClick={e => { e.preventDefault(); this.toggleExpanded(d.id) }}>
            <div>
              <A>{`${d.firstName} ${d.lastName}`}</A>
            </div>
            {
              summary
            }
          </div>
          { expanded &&
            <div {...styles.summaryWrapper}>
              <div {...styles.summaryMobile}>
                { summary }
              </div>
              <div {...styles.details}>
                <div {...styles.profile}>
                  <div>
                    <img src={d.portrait || DEFAULT_PROFILE_PICTURE} />
                    <div>
                      {/*<div>*/}
                        {/*<A href={`/~${d.id}`}>Profil</A>*/}
                      {/*</div>*/}
                      { candidate.commentId &&
                      <div>
                        <A href={`/~${d.id}`}>Debatte</A>
                      </div>
                      }
                    </div>
                  </div>
                  <div {...styles.statement}>
                    {d.statement}
                  </div>
                </div>
                { candidate.recommendation &&
                  <div {...styles.recommendation}>
                    <Strong>Wahlempfehlung der Republik:</Strong> {candidate.recommendation}
                  </div>
                }
              </div>
            </div>
          }
        </div>
        { maxVotes > 0 && onChange &&
          <div style={{width: 18}}>
            <SelectionComponent
              disabled={maxVotes > 1 && !selected && disabled}
              checked={selected}
              onChange={() => onChange(candidate.id)}
            />
          </div>
        }
      </div>
    )
  }
}

ElectionBallotRow.defaultProps = {
  selected: false,
  disabled: false,
  maxVotes: 1,
  onChange: () => {}
}

ElectionBallotRow.propTypes = {
  selected: PropTypes.bool,
  disabled: PropTypes.bool,
  maxVotes: PropTypes.number,
  onChange: PropTypes.func,
  candidate: PropTypes.object.isRequired
}

export default ElectionBallotRow
