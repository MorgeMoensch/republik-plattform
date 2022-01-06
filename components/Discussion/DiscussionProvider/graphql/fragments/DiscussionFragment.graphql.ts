import { gql } from '@apollo/client'
import Nullable from '../../../../../lib/types/Nullable'
import {
  DateTime,
  DiscussionCredential,
  DiscussionPreferences,
  DiscussionRules
} from '../types/SharedTypes'

export type DiscussionFragmentType = {
  id: string
  title: Nullable<string>
  document: {
    id: string
    meta: {
      path: Nullable<string>
      twitterImage: Nullable<string>
      template: Nullable<string>
      publishDate: Nullable<DateTime>
      ownDiscussion: Nullable<{
        id: string
        closed: boolean
      }>
      linkedDiscussion: Nullable<{
        id: string
        path: Nullable<string>
        closed: boolean
      }>
    }
  }
  path: Nullable<string>
  closed: boolean
  collapsed: boolean
  isBoard: boolean
  userPreferences: Nullable<DiscussionPreferences>
  rules: DiscussionRules
  userWaitUntil: Nullable<DateTime>
  userCanComment: boolean
  displayAuthor: Nullable<{
    id: string
    name: string
    anonymity: boolean
    slug: Nullable<string>
    profilePicture: Nullable<string>
    credential: Pick<DiscussionCredential, 'description' | 'verified'>
  }>
  collapsable: boolean
  tagRequired: boolean
  tags: string[]
  tagBuckets: {
    value: string
    count: number
  }[]
}

export const DISCUSSION_FRAGMENT = gql`
  fragment Discussion on Discussion {
    id
    title
    document {
      id
      meta {
        path
        twitterImage
        template
        publishDate
        ownDiscussion {
          id
          closed
        }
        linkedDiscussion {
          id
          path
          closed
        }
      }
    }
    path
    closed
    isBoard
    userPreference {
      anonymity
      credential {
        description
        verified
      }
      notifications
    }
    rules {
      maxLength
      minInterval
      anonymity
      disableTopLevelComments
    }
    userWaitUntil
    userCanComment
    displayAuthor {
      id
      name
      slug
      credential {
        description
        verified
      }
      profilePicture
    }
    collapsable
    tagRequired
    tags
    tagBuckets {
      value
      count
    }
  }
`
