import React from 'react'
import { SchemaConfig } from '../../custom-types'
import { Break } from '../config/elements/break'
import { Sub, Sup } from '../../../Typography'
import {
  BlockQuote,
  BlockQuoteParagraph,
  Heading,
  Link,
  ListItem,
  Paragraph,
  StrikeThrough,
} from '../../../CommentBody/email'
import { Bold } from '../config/marks/bold'
import { Italic } from '../config/marks/italic'
import { List as InnerEmailList } from '../../../CommentBody/email'
import {
  Byline,
  Caption,
} from '../../../../templates/EditorialNewsletter/email/Figure'

const List: React.FC<{
  ordered: boolean
  attributes: any
  [x: string]: unknown
}> = ({ children, ordered }) => (
  <InnerEmailList data={{ ordered }}>{children}</InnerEmailList>
)

const schema: SchemaConfig = {
  blockQuote: BlockQuote,
  blockQuoteText: BlockQuoteParagraph,
  figureByline: Byline,
  figureCaption: Caption,
  list: List,
  listItem: ListItem,
  break: Break,
  headline: Heading,
  link: Link,
  paragraph: Paragraph,
  bold: Bold,
  italic: Italic,
  strikethrough: StrikeThrough,
  sub: Sub,
  sup: Sup,
}

export default schema
