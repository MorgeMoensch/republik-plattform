import gql from 'graphql-tag'

export const cardFragment = gql`
  fragment Card on Card {
    id
    user {
      id
      name
      portrait(properties: {bw: false, width: 600, height: 800})
      slug
    }
    payload
    statement {
      id
      preview(length: 100) {
        string
        more
      }
      comments {
        totalCount
      }
    }
  }
`
