import { useParams, Link } from 'react-router-dom'
import { getAppraisal } from '../api/client'
import { LoadingState, ErrorState } from '../components/AsyncState'
import { DetailSection, DetailField } from '../components/DetailSection'
import { useApiData } from '../hooks/useApiData'
import RefreshButton from '../components/RefreshButton'

function formatPrice(value) {
  if (value === null || value === undefined) return null
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
  } catch {
    return `${value}`
  }
}

export default function AppraisalDetail() {
  const { id } = useParams()
  const { loading, error, data: item, reload } = useApiData(() => getAppraisal(id), [id])

  return (
    <div className="p-6">
      <Link to="/appraisals" className="text-sm text-slate-500 hover:text-slate-800">
        ← Back to Appraisals
      </Link>

      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">
          {item
            ? `${item.vehicle?.year ?? ''} ${item.vehicle?.make ?? ''} ${item.vehicle?.model ?? ''}`.trim() ||
              'Appraisal detail'
            : 'Appraisal detail'}
        </h1>
        <RefreshButton onClick={reload} loading={loading} />
      </div>

      {loading && <LoadingState label="Loading appraisal…" />}
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

          <DetailSection title="Appraisal">
            <DetailField label="Status" value={item.centralizedStatus} />
            <DetailField
              label="Completed"
              value={item.isCompleted === true ? 'Yes' : item.isCompleted === false ? 'No' : null}
            />
            <DetailField label="Created" value={item.created} />
            <DetailField label="Last modified" value={item.lastModified} />
            <DetailField label="Dealer entity" value={item.organization?.entityLogicalId} />
            <DetailField
              label="Appraised value"
              value={formatPrice(item.appraisalValue?.appraisedValue) ?? 'Not available (empty, or not permissioned for this account)'}
            />
          </DetailSection>
        </div>
      )}
    </div>
  )
}
