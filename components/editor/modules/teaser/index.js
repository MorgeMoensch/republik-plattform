import React from 'react'
import { matchBlock } from '../../utils'
import { createRemoveEmptyKeyHandler } from '../../utils/keyHandlers'
import { Block } from 'slate'

import shortId from 'shortid'

import { getSerializer, getSubmodules } from './serializer'

import {
  getIndex,
  getParent,
  insert,
  moveUp,
  moveDown,
  remove
} from './actions'

import { TeaserButton, TeaserInlineUI, TeaserForm } from './ui'

export const getData = data => ({
  url: null,
  textPosition: 'topleft',
  color: '#000',
  bgColor: '#fff',
  center: false,
  image: null,
  byline: null,
  kind: 'editorial',
  titleSize: 'standard',
  teaserType: 'frontImage',
  reverse: false,
  portrait: true,
  showImage: true,
  onlyImage: false,
  id: (data && data.id) || shortId(),
  ...data || {}
})

export const getNewBlock = options => () => {
  const {
    titleModule,
    subjectModule,
    leadModule,
    formatModule,
    paragraphModule
  } = getSubmodules(options)

  const data = getData({
    teaserType: options.rule.editorOptions.teaserType
  })

  const res = Block.create({
    type: options.TYPE,
    data: {
      ...data,
      module: 'teaser'
    },
    nodes: [
      Block.create({
        type: formatModule.TYPE,
        data
      }),
      Block.create({
        type: titleModule.TYPE,
        data
      }),
      Block.create({
        type: subjectModule.TYPE,
        data
      }),
      Block.create({
        type: leadModule.TYPE,
        data
      }),
      Block.create({
        type: paragraphModule.TYPE,
        data
      })
    ]
  })
  return res
}

const teaserPlugin = options => {
  const { TYPE, rule } = options
  const {
    titleModule,
    subjectModule,
    leadModule,
    formatModule,
    paragraphModule
  } = getSubmodules(options)

  const Teaser = rule.component
  // To be removed, once normalize() is fixed.
  console.log(
    titleModule,
    subjectModule,
    leadModule,
    formatModule,
    paragraphModule
  )

  return {
    renderNode ({ editor, node, attributes, children }) {
      if (!matchBlock(TYPE)(node) && !matchBlock(`${TYPE}_VOID`)(node)) {
        return
      }

      const image = node.data.get('showImage') === true
        ? node.data.get('image') || '/static/placeholder.png'
        : null

      const data = node.data.toJS()

      const compiledTeaser = <Teaser key='teaser' {...data} image={image} attributes={attributes}>
        {children}
      </Teaser>

      if (options.rule.editorOptions.showUI === false) {
        return compiledTeaser
      }

      const UI = TeaserInlineUI(options)

      const teaser = editor.value.blocks.reduce(
        (memo, node) =>
          memo || editor.value.document.getFurthest(node.key, matchBlock(TYPE)),
        undefined
      )

      const isSelected = teaser === node && !editor.value.isBlurred

      return ([
        <UI
          key='ui'
          isSelected={isSelected}
          nodeKey={node.key}
          getIndex={getIndex(editor)}
          getParent={getParent(editor)}
          moveUp={moveUp(editor)}
          moveDown={moveDown(editor)}
          insert={insert(editor)}
          remove={remove(editor)}
        />,
        compiledTeaser
      ])
    },
    onKeyDown: createRemoveEmptyKeyHandler({
      TYPE,
      isEmpty: node => !node.text.trim() && !node.data.get('image')
    })
    // Can't get this working with subject, even with adjusted indeces in normalize().
    /* schema: {
      blocks: {
        [`${TYPE}_VOID`]: {
          isVoid: true
        },
        [TYPE]: {
          nodes: [
            {
              types: [formatModule.TYPE],
              min: 1,
              max: 1
            },
            {
              types: [titleModule.TYPE],
              min: 1,
              max: 1
            },
            {
              types: [subjectModule.TYPE],
              min: 1,
              max: 1
            },
            {
              types: [leadModule.TYPE],
              min: 1,
              max: 1
            },
            {
              types: [paragraphModule.TYPE],
              min: 1,
              max: 1
            }
          ],
          normalize: (change, reason, context) => {
            return null
            const {
              index,
              node
            } = context
            switch (reason) {
              case 'child_type_invalid':
                if (index === 0) {
                  return change.insertNodeByKey(
                    node.key,
                    0,
                    {
                      kind: 'block',
                      type: formatModule.TYPE
                    }
                  )
                }
                if (index === 2) {
                  if (context.child.type === paragraphModule.TYPE) {
                    const t = change.insertNodeByKey(
                      node.key,
                      2,
                      {
                        kind: 'block',
                        type: leadModule.TYPE
                      }
                    )
                    return t
                  }
                }
                break
              case 'child_required':
                if (index === 3) {
                  return change.insertNodeByKey(
                    node.key,
                    3,
                    {
                      kind: 'block',
                      type: paragraphModule.TYPE
                    }
                  )
                }
            }
            console.error({ reason, context })
          }
        }
      }
    } */
  }
}

export default options => {
  return ({
    helpers: {
      serializer: getSerializer(options),
      newItem: getNewBlock(options)
    },
    plugins: [
      teaserPlugin(options)
    ],
    ui: {
      insertButtons: options.rule.editorOptions.insertButtonText ? [
        TeaserButton(options)
      ] : [],
      forms: [
        TeaserForm(options)
      ]
    }
  })
}
