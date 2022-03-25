import { parse, stringify } from '@orbiting/remark-preset'

import createBlockquoteModule from './'
import createParagraphModule from '../paragraph'

const paragraphModule = createParagraphModule({
  TYPE: 'PARAGRAPH',
  rule: {},
  subModules: [],
})
paragraphModule.name = 'paragraph'

const blockquoteModule = createBlockquoteModule({
  TYPE: 'BLOCKQUOTE',
  rule: {
    matchMdast: (node) => node.type === 'blockquote',
  },
  subModules: [paragraphModule],
})
blockquoteModule.name = 'blockquote'

const serializer = blockquoteModule.helpers.serializer

describe(() => {
  it('blockquote serialization', () => {
    const value = serializer.deserialize(parse('> A test'))
    const node = value.document.nodes.first()
    expect(node.kind).toBe('block')
    expect(node.type).toBe('BLOCKQUOTE')
    expect(node.text).toBe('A test')
    expect(stringify(serializer.serialize(value)).trimRight()).toBe('> A test')
  })
})
