import React from 'react'
import { Map } from 'immutable'

import { Label } from '@project-r/styleguide'

import MetaForm from '../../utils/MetaForm'

import {
  createPropertyForm,
  matchBlock
} from '../../utils'

export const createCoverForm = TYPE => createPropertyForm({
  isDisabled: ({ value }) => {
    return !value.blocks.some(block => {
      return matchBlock(TYPE)(value.document.getParent(block.key))
    })
  }
})(({ disabled, value, onChange }) => {
  if (disabled) {
    return null
  }
  const node = value.blocks
    .map(
      block => value.document.getParent(block.key)
    )
    .find(matchBlock(TYPE))

  const onInputChange = key => (_, value) => {
    onChange(
      value
        .change()
        .setNodeByKey(node.key, {
          data: value
            ? node.data.set(key, value)
            : node.data.remove(key)
        })
    )
  }

  return <div>
    <Label>Cover</Label>
    <MetaForm
      data={Map({
        src: '',
        alt: ''
      }).merge(node.data)}
      onInputChange={onInputChange}
    />
    <Label>Anzeigegrössen: 2000x1125 und 1280x675 (zentrierter Schnitt)</Label>
  </div>
})
