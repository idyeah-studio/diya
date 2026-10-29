import { DatePickerLibrary, ComboboxLibrary } from '../../components/AdvancedInputsLibrary'
import { V1WorkflowLibrary, type WorkflowPattern } from '../../components/V1WorkflowLibrary'
import {
  V1ApplicationLibrary,
  type ApplicationPattern,
} from '../../components/V1ApplicationLibrary'
import { DataVizLibrary } from '../../components/DataVizLibrary'
import { TableLibrary } from '../../components/TableLibrary'
import { notFound, redirect } from 'next/navigation'
import { DialogLibrary } from '../../components/DialogLibrary'
import { CardLibrary } from '../../components/CardLibrary'
import { SiteHeaderLibrary } from '../../components/SiteHeaderLibrary'
import { DataAtomsLibrary, type DataAtom } from '../../components/DataAtomsLibrary'
import { UtilityLibrary, type UtilityAtom } from '../../components/UtilityLibrary'
import { AlertLibrary } from '../../components/AlertLibrary'
import { CollectionsLibrary, type CollectionAtom } from '../../components/CollectionsLibrary'
import { MoreAtomsLibrary, type MoreAtom } from '../../components/MoreAtomsLibrary'
import { TabsLibrary } from '../../components/TabsLibrary'
import { BadgeLibrary } from '../../components/BadgeLibrary'
import { RatingLibrary } from '../../components/RatingLibrary'
import { ChoiceLibrary } from '../../components/ChoiceLibrary'
import { SelectLibrary } from '../../components/SelectLibrary'
import { PageHeaderLibrary } from '../../components/PageHeaderLibrary'
import { TextInputLibrary } from '../../components/TextInputLibrary'
import { ButtonLibrary } from '../../components/ButtonLibrary'
import type { Metadata } from 'next'
import { catalogIsOpen, resolveCatalogRoute, type CatalogRoute } from '../../lib/catalog-route'
import { catalogPath, catalogTitle } from '../../lib/catalog-route-meta'
import { CatalogFrame } from '../../components/catalog/CatalogFrame'
import { ProPage } from '../../components/catalog/ProPage'

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const route = resolveCatalogRoute(await searchParams)
  if ('redirect' in route) return {}
  return { title: catalogTitle(route), alternates: { canonical: catalogPath(route) } }
}

export default async function Explore({ searchParams }: Props) {
  if (!catalogIsOpen()) notFound()
  const route = resolveCatalogRoute(await searchParams)
  if ('redirect' in route) redirect(route.redirect)
  // Skills & Prompts was retired before launch; old links land on the library.
  if (route.area === 'skills') redirect('/explore')
  return (
    <CatalogFrame area={route.area} title={catalogTitle(route)} path={catalogPath(route)}>
      <CatalogPage route={route} />
    </CatalogFrame>
  )
}

function CatalogPage({ route }: { route: Exclude<CatalogRoute, { area: 'skills' }> }) {
  if (route.area === 'pro') return <ProPage />
  const initial = {
    area: route.area,
    component: route.area === 'components' ? route.id : '',
    pattern: route.area === 'patterns' ? route.id : '',
  }
  if (initial.area === 'components' && initial.component === 'date-picker')
    return <DatePickerLibrary />
  if (initial.area === 'components' && initial.component === 'combobox') return <ComboboxLibrary />
  if (['file-upload', 'form', 'drawer', 'empty-state', 'wizard'].includes(initial.pattern))
    return <V1WorkflowLibrary key={initial.pattern} pattern={initial.pattern as WorkflowPattern} />
  if (['side-navigation', 'chatbot'].includes(initial.pattern))
    return (
      <V1ApplicationLibrary key={initial.pattern} pattern={initial.pattern as ApplicationPattern} />
    )
  if (initial.pattern === 'data-viz') return <DataVizLibrary />
  if (initial.pattern === 'table') return <TableLibrary />
  if (initial.pattern === 'dialog') return <DialogLibrary />
  if (
    initial.area === 'components' &&
    ['tag', 'metric', 'link', 'pagination'].includes(initial.component)
  )
    return <DataAtomsLibrary key={initial.component} component={initial.component as DataAtom} />
  if (
    initial.area === 'components' &&
    ['progress', 'slider', 'breadcrumbs'].includes(initial.component)
  )
    return <UtilityLibrary key={initial.component} component={initial.component as UtilityAtom} />
  if (initial.area === 'components' && initial.component === 'alert') return <AlertLibrary />
  if (initial.area === 'components' && initial.component === 'tabs') return <TabsLibrary />
  if (
    initial.area === 'components' &&
    ['switch', 'tooltip', 'avatar', 'search', 'text-area'].includes(initial.component)
  )
    return <MoreAtomsLibrary key={initial.component} component={initial.component as MoreAtom} />
  if (
    initial.area === 'components' &&
    ['list', 'menu', 'popover', 'accordion'].includes(initial.component)
  )
    return (
      <CollectionsLibrary key={initial.component} component={initial.component as CollectionAtom} />
    )
  if (initial.area === 'components' && initial.component === 'badge') return <BadgeLibrary />
  if (initial.area === 'components' && initial.component === 'rating') return <RatingLibrary />
  if (initial.area === 'components' && initial.component === 'choice') return <ChoiceLibrary />
  if (initial.area === 'components' && initial.component === 'select') return <SelectLibrary />
  if (initial.area === 'components')
    return initial.component === 'text-input' ? <TextInputLibrary /> : <ButtonLibrary />
  if (initial.pattern === 'card') return <CardLibrary />
  return initial.pattern === 'site-header' ? <SiteHeaderLibrary /> : <PageHeaderLibrary />
}
