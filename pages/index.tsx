import { PageOptions } from '@graphcommerce/framer-next-pages'
import { hygraphPageContent, HygraphPagesQuery } from '@graphcommerce/graphcms-ui'
import { ProductListDocument, ProductListQuery } from '@graphcommerce/magento-product'
import { StoreConfigDocument } from '@graphcommerce/magento-store'
import { GetStaticProps, MetaRobots, PageMeta } from '@graphcommerce/next-ui'
import { LayoutHeader, LayoutDocument, RowProduct, RowRenderer } from '../components'
import { LayoutNavigation, LayoutNavigationProps } from '../components/Layout/LayoutNavigation'
import { graphqlSharedClient, graphqlSsrClient } from '../lib/graphql/graphqlSsrClient'

type Props = HygraphPagesQuery & {
  latestList: ProductListQuery
  favoritesList: ProductListQuery
  swipableList: ProductListQuery
}
type RouteProps = { url: string }
type GetPageStaticProps = GetStaticProps<LayoutNavigationProps, Props, RouteProps>

function CmsPage(props: Props) {
  const { pages, latestList, favoritesList, swipableList } = props
  const page = pages?.[0]

  const latest = latestList?.products?.items?.[0]
  const favorite = favoritesList?.products?.items?.[0]
  const swipable = swipableList?.products?.items?.[0]

  return (
    <>
      <PageMeta
        title={page?.metaTitle ?? page?.title ?? ''}
        metaDescription={page?.metaDescription ?? ''}
        metaRobots={page?.metaRobots.toLowerCase().split('_') as MetaRobots[] | undefined}
        canonical='/'
      />

      <LayoutHeader floatingMd />

      {page && (
        <RowRenderer
        
          content={page.content}
          renderer={{
            RowProduct: (rowProps) => {
              const { identity } = rowProps

              if (identity === 'home-favorites')
                return (
                  <RowProduct {...rowProps} {...favorite} items={favoritesList.products?.items} />
                )
              if (identity === 'home-latest')
                return <RowProduct {...rowProps} {...latest} items={latestList.products?.items} />
              if (identity === 'home-swipable')
                return (
                  <RowProduct {...rowProps} {...swipable} items={swipableList.products?.items} />
                )
              return (
                <RowProduct {...rowProps} {...favorite} items={favoritesList.products?.items} />
              )
            },
          }}
        />
      )}
    </>
  )
}

CmsPage.pageOptions = {
  Layout: LayoutNavigation,
} as PageOptions

export default CmsPage

export const getStaticProps: GetPageStaticProps = async ({ locale }) => {
  const client = graphqlSharedClient(locale)
  const staticClient = graphqlSsrClient(locale)

  const conf = client.query({ query: StoreConfigDocument })
  const page = hygraphPageContent(staticClient, 'page/home')
  const layout = staticClient.query({ query: LayoutDocument, fetchPolicy: 'cache-first' })

  // todo(paales): Remove when https://github.com/Urigo/graphql-mesh/issues/1257 is resolved
  const favoritesList = staticClient.query({
    query: ProductListDocument,
    variables: { pageSize: 8, filters: { category_uid: { eq: 'MTIx' } } },
  })

  const latestList = staticClient.query({
    query: ProductListDocument,
    variables: { pageSize: 8, filters: { category_uid: { eq: 'MTAy' } } },
  })

  const swipableList = staticClient.query({
    query: ProductListDocument,
    variables: { pageSize: 8, filters: { category_uid: { eq: 'MTIy' } } },
  })

  if (!(await page).data.pages?.[0]) return { notFound: true }

  return {
    props: {
      ...(await page).data,
      ...(await layout).data,
      latestList: (await latestList).data,
      favoritesList: (await favoritesList).data,
      swipableList: (await swipableList).data,
      apolloState: await conf.then(() => client.cache.extract()),
    },
    revalidate: 60 * 20,
  }
}
