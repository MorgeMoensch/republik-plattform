import React, { Component } from 'react'
import { css } from 'glamor'

import { MdError } from 'react-icons/md'

import {
  colors,
  Interaction,
  A,
  Label,
  Overlay,
  OverlayToolbar,
  OverlayBody
} from '@project-r/styleguide'

const { H2, H3, P } = Interaction

const styles = {
  error: css({
    color: colors.error
  }),
  icon: css({
    verticalAlign: 'baseline',
    marginRight: 3,
    marginBottom: '-0.2em'
  })
}

export default class Status extends Component {
  constructor(props) {
    super(props)

    this.state = {
      isOpen: false
    }

    this.openHandler = e => {
      e.preventDefault()
      this.setState(() => ({ isOpen: true }))
    }

    this.closeHandler = () => {
      this.setState(() => ({ isOpen: false }))
    }
  }

  render() {
    const { status, error } = this.props
    const { isOpen } = this.state

    return (
      <>
        {status !== 'sent' && error && (
          <div>
            <A href='#' onClick={this.openHandler}>
              <span {...styles.error}>
                <MdError size='1.2em' {...styles.icon} /> Problem
              </span>
            </A>
          </div>
        )}
        {status !== 'sent' && !error && (
          <div>
            <Label>{status}</Label>
          </div>
        )}
        {isOpen && (
          <Overlay onClose={this.closeHandler}>
            <OverlayToolbar onClose={this.closeHandler} />
            <OverlayBody>
              <H2>
                <MdError size='1.2em' {...styles.icon} /> Problem
              </H2>
              <br />
              <H3>Status: {status}</H3>
              <br />
              <P>Fehlermeldung: {error}</P>
            </OverlayBody>
          </Overlay>
        )}
      </>
    )
  }
}
