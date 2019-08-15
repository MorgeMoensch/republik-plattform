import { css } from 'glamor'
import PropTypes from 'prop-types'
import React from 'react'
import colors from '../../theme/colors'
import { serifBold28, serifRegular15 } from '../Typography/styles'
import RawHtml from '../RawHtml'

const styles = {
  body: css({
    ...serifRegular15,
    color: colors.text,
    margin: '12px 0'
  }),
  highlight: css({
    ...serifBold28,
    color: colors.text,
    margin: '12px 0'
  })
}

const DebateComment = ({ id, highlight, preview }) => {
  return (
    <>
      {!highlight && preview && (
        <div {...styles.body}>
          <React.Fragment>
            <RawHtml
              dangerouslySetInnerHTML={{
                __html: preview.string
              }}
            />

            {/* {!endsWithPunctuation && <Fragment>&nbsp;…</Fragment>} */}
          </React.Fragment>
        </div>
      )}
      {highlight && (
        <div {...styles.highlight}>
          &#171;
          <RawHtml
            dangerouslySetInnerHTML={{
              __html: highlight
            }}
          />
          &#187;
        </div>
      )}
    </>
  )
}

export default DebateComment

DebateComment.propTypes = {
  id: PropTypes.string,
  highlight: PropTypes.string,
  preview: PropTypes.shape({
    string: PropTypes.string,
    more: PropTypes.bool
  })
}
