const debug = require('debug')('search:graphql:resolvers:_queries:search')
const {
  Roles: {
    userHasRole,
    userIsInRoles
  }
} = require('@orbiting/backend-modules-auth')
const {
  schema: documentSchema,
  addRelatedDocs
} = require('../../../lib/Documents')
const {
  filterReducer,
  getFilterValue,
  getFilterObj,
  elasticFilterBuilder
} = require('../../../lib/filters')
const {
  extractAggs
} = require('../../../lib/aggregations')
const {
  createSort
} = require('../../../lib/sort')
const {
  __resolveType: resolveHitType
} = require('../SearchEntity')
const { transformUser } = require('@orbiting/backend-modules-auth')

const _ = require('lodash')
const uuid = require('uuid/v4')

const indices = require('../../../lib/indices')
const { getIndexAlias, getDateIndex } = require('../../../lib/utils')

const reduceFilters = filterReducer(documentSchema)
const createElasticFilter = elasticFilterBuilder(documentSchema)
const schemaAggregations = extractAggs(documentSchema)

const getFieldList = require('@orbiting/graphql-list-fields')

const createCache = require('../../../lib/cache')

const {
  DOCUMENTS_RESTRICT_TO_ROLES,
  SEARCH_TRACK = false
} = process.env

const DEV = process.env.NODE_ENV && process.env.NODE_ENV !== 'production'

const FUZZINESS_WORD_LENGTH_THRESHOLD = 5

const deepMergeArrays = function (objValue, srcValue) {
  if (_.isArray(objValue)) {
    return objValue.concat(srcValue)
  }
}

const getSimpleQueryStringQuery = (searchTerm) => {
  const sanitizedSearchTerm = searchTerm.trim()

  if (sanitizedSearchTerm.match(/[+|\-"*()~]/g)) {
    return sanitizedSearchTerm
  }

  // split search term and stitch together with fuzzy per word
  const fuzzySearchTerm = sanitizedSearchTerm
    .split(/\s/)
    .map(term => {
      if (term.length >= FUZZINESS_WORD_LENGTH_THRESHOLD * 2) {
        return `${term}~2`
      } else if (term.length >= FUZZINESS_WORD_LENGTH_THRESHOLD) {
        return `${term}~1`
      }

      return term
    })
    .join(' ')

  debug('getSimpleQueryStringQuery', {
    searchTerm,
    sanitizedSearchTerm,
    fuzzySearchTerm
  })

  return fuzzySearchTerm
}

const createShould = function (
  searchTerm, searchFilter, indicesList, user, scheduledAt, ignorePrepublished
) {
  const queries = []

  // A query for each ES index
  indicesList.forEach(({ type, index, search }) => {
    let must = {
      match_all: {}
    }

    let fields = Object.keys(search.termFields)

    // Append boost if available, annotation "<field name>^<boost>"
    fields = fields.map(field => {
      const boost = search.termFields[field].boost
      if (boost) {
        return `${field}^${boost}`
      }

      return field
    })

    if (searchTerm) {
      must = [
        {
          simple_query_string: {
            query: getSimpleQueryStringQuery(searchTerm),
            fields,
            default_operator: 'AND',
            analyzer: 'german'
          }
        }
      ]
    }

    const rolebasedFilterArgs = Object.assign(
      {},
      { scheduledAt, ignorePrepublished },
      getFilterObj(searchFilter)
    )

    const rolebasedFilterDefault =
      _.get(search, 'rolebasedFilter.default', () => ({}))(rolebasedFilterArgs)

    const rolebasedFilter = Object.assign({}, rolebasedFilterDefault)

    if (userHasRole(user, 'editor')) {
      Object.assign(
        rolebasedFilter,
        _.get(
          search,
          'rolebasedFilter.editor',
          () => rolebasedFilterDefault
        )(rolebasedFilterArgs)
      )
    }

    const filter = _.mergeWith(
      {},
      search.filter.default(searchFilter),
      createElasticFilter(searchFilter),
      rolebasedFilter,
      deepMergeArrays
    )

    debug('filter', JSON.stringify(filter, null, 2))

    queries.push({
      bool: {
        must,
        filter
      }
    })
  })

  return queries
}

const createHighlight = (indicesList) => {
  const fields = {}

  // A query for each ES index
  indicesList.forEach(({ search }) => {
    Object.keys(search.termFields).forEach((field) => {
      if (search.termFields[field].highlight) {
        fields[field] = { ...search.termFields[field].highlight, order: 'score' }
      }
    })
  })

  return { fields }
}

const defaultExcludes = ['contentString', 'resolved']
const createQuery = (
  searchTerm, filter, sort, indicesList, user, scheduledAt, withoutChildren, withoutAggs, ignorePrepublished
) => ({
  query: {
    bool: {
      should: createShould(
        searchTerm, filter, indicesList, user, scheduledAt, ignorePrepublished
      )
    }
  },
  sort: createSort(sort),
  highlight: createHighlight(indicesList),
  stored_fields: ['contentString.count'],
  ...withoutAggs ? {} : { aggs: schemaAggregations },
  _source: {
    excludes: [
      ...defaultExcludes,
      ...withoutChildren
        ? ['content.children']
        : []
    ]
  }
})

const mapHit = (hit) => {
  const type = resolveHitType(hit._source)
  const entity = type === 'User'
    ? transformUser(hit._source)
    : hit._source

  Object.assign(entity, { _storedFields: hit.fields })

  const highlights = []
  Object.keys(hit.highlight || {}).forEach(path => {
    highlights.push({ path, fragments: hit.highlight[path] })
  })

  return {
    entity,
    highlights,
    score: hit._score,
    type
  }
}

const transformTermsAgg = (key, agg, t) => ({
  key,
  label: t(
    `api/search/aggs/${key}`,
    { key },
    !DEV ? key : undefined
  ),
  buckets: agg.terms.buckets.map(bucket => ({
    label: t(
      `api/search/aggs/${key}/${bucket.key}`,
      { key, value: bucket.key, count: bucket.doc_count },
      !DEV ? bucket.key : undefined
    ),
    value: bucket.key,
    count: bucket.doc_count
  }))
})

const transformCountAgg = (key, agg, t) => ({
  key,
  label: t(
    `api/search/aggs/${key}`,
    { key },
    !DEV ? key : undefined
  ),
  count: agg.count ? agg.count.value : agg.doc_count
})

const transformRangeAgg = (key, agg, t) => ({
  key,
  label: t(
    `api/search/aggs/${key}`,
    { key },
    !DEV ? key : undefined
  ),
  count: agg.doc_count,
  buckets: agg.ranges.buckets.map(bucket => ({
    label: t(
      `api/search/aggs/${key}/${bucket.key}`,
      { key, value: bucket.key, count: bucket.doc_count },
      !DEV ? bucket.key : undefined
    ),
    value: bucket.key,
    count: bucket.doc_count
  }))
})

const mapAggregations = (result, t) => {
  const aggregations = result.aggregations
  if (!aggregations) {
    return []
  }
  return Object.keys(aggregations).map(name => {
    const parts = name.match(/(.*?)\/(.*)/)
    const type = parts[1]
    const key = parts[2]

    const agg = aggregations[name]

    switch (type) {
      case 'terms':
        return transformTermsAgg(key, agg, t)
      case 'valueCount':
      case 'trueCount':
      case 'existsCount':
        return transformCountAgg(key, agg, t)
      case 'range':
        return transformRangeAgg(key, agg, t)
      default:
        throw Error(`Unable to transform aggregation type "${type}"`)
    }
  })
}

const cleanOptions = (options) => ({
  ...options,
  after: undefined,
  before: undefined,
  filter: undefined,
  trackingId: undefined
})

const stringifyOptions = (options) =>
  Buffer.from(JSON.stringify(options)).toString('base64')

const parseOptions = (options) => {
  try {
    return JSON.parse(Buffer.from(options, 'base64').toString())
  } catch (e) {
    console.info('failed to parse options:', options, e)
  }
  return {}
}

const MAX_NODES = 10000 // Limit, but exceedingly high

const getFirst = (first, filter, user, recursive, unrestricted) => {
  // we only restrict the nodes array
  // making totalCount always available
  // querying a single document by path is always allowed
  const path = getFilterValue(filter, 'path')
  const repoId = getFilterValue(filter, 'repoId')
  const oneRepoId = repoId && (!Array.isArray(repoId) || repoId.length === 1)
  if (DOCUMENTS_RESTRICT_TO_ROLES && !recursive && !path && !oneRepoId && !unrestricted) {
    const roles = DOCUMENTS_RESTRICT_TO_ROLES.split(',')
    if (!userIsInRoles(user, roles)) {
      return 0
    }
  }

  if (first > MAX_NODES) {
    return MAX_NODES
  }

  return first
}

const getIndicesList = (filter) => {
  const limitType = getFilterValue(filter, 'type')
  const typeFilter = limitType
    ? ({ type }) => type === limitType
    : Boolean
  const searchableFilter = ({ searchable = true }) => searchable

  return indices.list.filter(typeFilter).filter(searchableFilter)
}

const hasFieldRequested = (fieldName, GraphQLResolveInfo) => {
  const fields = getFieldList(GraphQLResolveInfo, true)
  return !!fields.find(field => (
    field === fieldName ||
    field.split('.').find(f => f === fieldName)
  ))
}

const search = async (__, args, context, info) => {
  const { user, elastic, t, redis } = context
  const cache = createCache(redis)

  const {
    after,
    before,
    recursive = false,
    unrestricted = false,
    scheduledAt,
    ignorePrepublished,
    trackingId = uuid(),
    withoutContent: _withoutContent,
    withoutRelatedDocs = false,
    withoutAggs = false
  } = args

  // detect if Document.content is requested
  let withoutContent = _withoutContent || false
  let withoutChildren = withoutContent
  if (info && _withoutContent === undefined) {
    withoutContent = !hasFieldRequested('content', info)
    withoutChildren = (
      withoutContent &&
      !hasFieldRequested('children', info)
    )
  }

  const options = after
    ? { ...args, ...parseOptions(after) }
    : before
      ? { ...args, ...parseOptions(before) }
      : args

  const {
    search,
    filter: filterObj = { },
    filters: filterArray = [],
    sort = {
      key: 'relevance',
      direction: 'DESC'
    },
    first: _first = 40,
    from = 0
  } = options

  debug('options', JSON.stringify(options))

  Object.keys(filterObj).forEach(key => {
    filterArray.push({
      key,
      value: filterObj[key]
    })
  })

  const filter = reduceFilters(filterArray)

  debug('filter', JSON.stringify(filter))

  const first = getFirst(_first, filter, user, recursive, unrestricted)

  const indicesList = getIndicesList(filter)
  const query = {
    index: indicesList.map(({ name }) => getIndexAlias(name, 'read')),
    from,
    size: first,
    body: createQuery(search, filter, sort, indicesList, user, scheduledAt, withoutChildren, withoutAggs, ignorePrepublished)
  }
  debug('ES query', JSON.stringify(query))

  let result = await cache.get(query)
  const cacheHIT = !!result
  if (!result) {
    result = await elastic.search(query)
    await cache.set(query, result, options)
  }

  const hasNextPage = first > 0 && result.hits.total > from + first
  const hasPreviousPage = from > 0

  const response = {
    nodes: result.hits.hits.map(mapHit),
    aggregations: mapAggregations(result, t),
    totalCount: result.hits.total,
    pageInfo: {
      hasNextPage,
      endCursor: hasNextPage
        ? stringifyOptions(cleanOptions({
          ...options,
          filters: filterArray,
          first,
          from: from + first
        }))
        : null,
      hasPreviousPage,
      startCursor: hasPreviousPage
        ? stringifyOptions(cleanOptions({
          ...options,
          filters: filterArray,
          first,
          from: from - first
        }))
        : null
    },
    trackingId
  }

  if (!recursive && !withoutRelatedDocs && (!filter.type || filter.type === 'Document')) {
    await addRelatedDocs({
      connection: response,
      context,
      withoutContent
    })
  }

  if (!recursive && SEARCH_TRACK) {
    const took = cacheHIT ? 0 : result.took
    const total = result.hits.total
    const hits = result.hits.hits
      .map(hit => _.omit(hit, '_source'))
    const aggs = result.aggregations

    const filters = options.filters
      ? options.filters.map(filter => {
        if (typeof filter.value !== 'string') {
          filter.value = JSON.stringify(filter.value)
        }

        return filter
      })
      : []

    // not await tracking
    elastic.index({
      index: getDateIndex('searches'),
      type: 'Search',
      body: {
        date: new Date(),
        trackingId,
        roles: user && user.roles,
        took,
        cache: cacheHIT,
        options: Object.assign({}, options, { filters }),
        query,
        total,
        hits,
        aggs
      }
    }).catch(err => {
      console.error('search, tracking', err)
    })
  }

  return response
}

module.exports = search
