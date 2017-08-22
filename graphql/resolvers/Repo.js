const { createGithubFetchForUser } = require('../../lib/github')
const GitHub = require('github-api')
const { descending } = require('d3-array')
const uniqBy = require('lodash/uniqBy')

module.exports = {
  commits: async (repo, { page }, { user }) => {
    const refsQuery = `
      query repository(
        $login: String!,
        $repoName: String!,
        $first: Int
      ) {
        repository(owner: $login, name: $repoName) {
          refs(refPrefix: "refs/heads/", first: $first) {
            nodes {
              name
              target {
                ... on Commit {
                  oid
                }
              }
            }
          }
        }
      }
    `
    const [login, repoName] = repo.id.split('/')
    const variables = {
      login,
      repoName,
      first: 100
    }

    const {
      errors,
      data: {
        repository: {
          refs: {
            nodes: refs
          }
        }
      }
    } = await createGithubFetchForUser(user)({ query: refsQuery, variables })
    if (errors) {
      throw new Error(JSON.stringify(errors))
    }

    const github = new GitHub({
      token: user.githubAccessToken
    })

    return Promise.all(
      refs.map(({ target: { oid } }) => {
        return github
          .getRepo(login, repoName)
          .listCommits({
            sha: oid,
            per_page: 30,
            page: page || 1
          })
          .then(response => response ? response.data : response)
          .then(commits => commits
            .map(({ sha, parents, commit: { message, author } }) => ({
              id: sha,
              parentIds: parents
                ? parents.map(parent => parent.sha)
                : [],
              message,
              author,
              date: new Date(author.date),
              repo
            }))
          )
      })
    )
      .then(commits => [].concat.apply([], commits))
      .then(commits => uniqBy(commits, 'id'))
      .then(commits => commits.sort((a, b) => descending(a.date, b.date)))
  },
  milestones: async (repo, args, { user }) => {
    const refsQuery = `
      query repository(
        $login: String!,
        $repoName: String!,
        $first: Int
      ) {
        repository(owner: $login, name: $repoName) {
          refs(refPrefix: "refs/tags/", first: $first) {
            nodes {
              name
              target {
                ... on Tag {
                  oid
                }
              }
            }
          }
        }
      }
    `
    const [login, repoName] = repo.id.split('/')
    const variables = {
      login,
      repoName,
      first: 100
    }
    const {
      errors,
      data: {
        repository: {
          refs: {
            nodes: refs
          }
        }
      }
    } = await createGithubFetchForUser(user)({ query: refsQuery, variables })
    if (errors) {
      throw new Error(JSON.stringify(errors))
    }

    // TODO: check if commits are requested and get them in bulk

    return refs
  },
  uncommittedChanges: async ({owner: login, name: repository}, {path}, {redis, pgdb}) => {
    const key = `${login}/${repository}/${path}`
    const userIds = await redis.zrangeAsync(key, 0, -1)
    if (!userIds.length) {
      return []
    }
    return pgdb.public.users.find({id: userIds})
  }
}
