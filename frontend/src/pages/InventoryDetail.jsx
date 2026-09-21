import { useParams, Link } from 'react-router-dom'
import { getInventoryItem } from '../api/client'
import { daysInInventory, AGE_THRESHOLD_DAYS } from '../lib/vehicleAge'
import { LoadingState, ErrorState } from '../components/AsyncState'
import { DetailSection, DetailField } from '../components/DetailSection'
import { useApiData } from '../hooks/useApiData'
import RefreshButton from '../components/RefreshButton'

function formatPrice(value, currency = 'USD') {
  if (value === null || value === undefined) return null
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value)
  } catch {
    return `${value}`
  }
}

export default function InventoryDetail() {
  const { id } = useParams()
  const { loading, error, data: item, reload } = useApiData(() => getInventoryItem(id), [id])
  const age = item ? daysInInventory(item.createdOn) : null

  return (
    <div className="p-6">
      <Link to="/inventory" className="text-sm text-slate-500 hover:text-slate-800">
        ← Back to Inventory
      </Link>

      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">
          {item
            ? `${item.vehicle?.year ?? ''} ${item.vehicle?.make ?? ''} ${item.vehicle?.model ?? ''}`.trim() ||
              'Vehicle detail'
            : 'Vehicle detail'}
        </h1>
        <RefreshButton onClick={reload} loading={loading} />
      </div>

      {loading && <LoadingState label="Loading vehicle…" />}
      {error && <ErrorState error={error} />}

      {item && !loading && !error && (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <DetailSection title="Vehicle">
            <DetailField label="VIN" value={item.vehicle?.vin} />
            <DetailField label="Year" value={item.vehicle?.year} />
            <DetailField label="Make" value={item.vehicle?.make} />
            <DetailField label="Model" value={item.vehicle?.model} />
            <DetailField label="Series / Trim" value={item.vehicle?.series} />
            <DetailField label="Body type" value={item.vehicle?.bodyType} />
            <DetailField label="Odometer" value={item.vehicle?.odometer} />
            <DetailField label="Exterior color" value={item.vehicle?.exteriorColor} />
            <DetailField label="Interior color" value={item.vehicle?.interiorColor} />
          </DetailSection>

          <DetailSection title="Inventory status">
            <DetailField label="Stock #" value={item.stockNumber} />
            <DetailField label="Status" value={item.status} />
            <DetailField label="Disposition" value={item.disposition} />
            <DetailField label="Days in inventory" value={age !== null ? `${age}${age >= AGE_THRESHOLD_DAYS ? ' (aged)' : ''}` : null} />
            <DetailField label="Stocked in" value={item.createdOn} />
            <DetailField label="Last updated" value={item.updatedOn} />
            <DetailField label="Dealer entity" value={item.organization?.entityLogicalId} />
          </DetailSection>

          <DetailSection title="Pricing">
            <DetailField label="List price" value={formatPrice(item.pricing?.listPrice, item.pricing?.currency)} />
          </DetailSection>

          <DetailSection title="Certification">
            <DetailField
              label="Certified"
              value={item.certification?.certified === true ? 'Yes' : item.certification?.certified === false ? 'No' : null}
            />
            <DetailField label="Program" value={item.certification?.program} />
          </DetailSection>
        </div>
      )}
    </div>
  )
}
