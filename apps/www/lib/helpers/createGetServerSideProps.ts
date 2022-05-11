import { ParsedUrlQuery } from 'querystring'
import { ApolloClient, NormalizedCacheObject } from '@apollo/client'
import {
  GetServerSideProps,
  GetServerSidePropsContext,
  GetServerSidePropsResult,
} from 'next'
import { BasePageProps } from '../../pages/_app'
import {
  APOLLO_STATE_PROP_NAME,
  initializeApollo,
} from '../apollo/apolloClient'
import { meQuery } from '../apollo/withMe'
import { MeObjectType } from '../context/MeContext'

/**
 * Type of function that can be passed to `createGetServerSideProps`
 */
type ApolloSSRQueryFunc<P, Q extends ParsedUrlQuery> = (
  client: ApolloClient<NormalizedCacheObject>,
  params: Q,
  user: MeObjectType | null,
) => Promise<GetServerSidePropsResult<P>>

function createGetServerSideProps<P, Q extends ParsedUrlQuery = ParsedUrlQuery>(
  queryFunc: ApolloSSRQueryFunc<P, Q>,
): GetServerSideProps<BasePageProps<P>> {
  return async (
    context: GetServerSidePropsContext<Q>,
  ): Promise<GetServerSidePropsResult<BasePageProps<P>>> => {
    // Use the request object to pass on the cookies to the graphql requests
    const apolloClient = initializeApollo(null, {
      // Pass headers of the client-request to the apollo-link
      headers: context.req.headers,
    })

    // Request the user object to attach it to the query-func
    // as well as adding it to the apollo-client cache
    const {
      data: { me },
    } = await apolloClient.query<{ me?: MeObjectType }>({
      query: meQuery,
    })

    const result = await queryFunc(apolloClient, context.params, me)

    if ('props' in result) {
      result.props[APOLLO_STATE_PROP_NAME] = apolloClient.cache.extract()
    }

    return result
  }
}

export default createGetServerSideProps
