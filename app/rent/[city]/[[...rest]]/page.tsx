import { SearchPage, searchMetadata, type SearchRouteProps } from '@/components/search/SearchPage'

/** Property for rent. The implementation is shared with the other intent. */
export const revalidate = 3600

export const generateMetadata = (props: SearchRouteProps) => searchMetadata('rent', props)

export default function Page(props: SearchRouteProps) {
  return <SearchPage intent="rent" {...props} />
}
