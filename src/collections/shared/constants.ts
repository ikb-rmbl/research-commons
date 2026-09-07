/**
 * Shared constants used across multiple collection definitions.
 */

// Geographic scope tiers, from your immediate study area outward. Derived
// from institution config place names so the admin UI matches your region.
import { institution } from '../../../config/institution'

export const GEOGRAPHIC_SCOPE_OPTIONS = [
  ...institution.region.placeNames.slice(0, 5).map((p) => ({
    label: p,
    value: p.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
  })),
  { label: 'Regional', value: 'regional' },
  { label: 'Other', value: 'other' },
]
