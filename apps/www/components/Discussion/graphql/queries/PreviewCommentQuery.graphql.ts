import { gql } from '@apollo/client'
import { CommentFragmentType } from '../fragments/CommentFragment.graphql'
import Nullable from '../../../../lib/types/Nullable'

export type PreviewCommentQueryVariables = {
  discussionId: string
  content: string
  parentId?: string
  id?: string
  tags?: string[]
}

export type PreviewCommentQuery = {
  commentPreview: Pick<CommentFragmentType, 'id' | 'content' | 'embed'> & {
    contentLength: Nullable<number>
  }
}

export const PREVIEW_COMMENT_QUERY = gql`
  query commentPreview(
    $discussionId: ID!
    $content: String!
    $parentId: ID
    $id: ID
    $tags: [String!]
  ) {
    commentPreview(
      content: $content
      discussionId: $discussionId
      parentId: $parentId
      id: $id
      tags: $tags
    ) {
      id
      content
      contentLength
      tags
      updatedAt
      createdAt
      embed {
        ... on LinkPreview {
          url
          title
          description
          imageUrl
          imageAlt
          siteName
          siteImageUrl
          updatedAt
          __typename
        }
        ... on TwitterEmbed {
          id
          url
          text
          html
          userName
          userScreenName
          userProfileImageUrl
          image
          createdAt
          __typename
        }
      }
    }
  }
`
