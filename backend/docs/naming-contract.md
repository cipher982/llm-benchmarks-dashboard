# Naming Contract

LLM Bench separates model/provider identity from labels and URLs. Keep these fields distinct throughout the pipeline:

| Field | Meaning |
|-------|---------|
| `providerCanonical` | Provider identifier used for DB lookups and routing, for example `vertex`. |
| `provider` | Provider display label shown to users, for example `google`. |
| `providerSlug` | URL slug generated from `providerCanonical`. |
| `modelCanonical` | Model identifier used for DB lookups and routing. |
| `model_name` | Model display label shown to users after mapping. |
| `modelSlug` | URL slug generated from `modelCanonical`. |

`cleanTransformCloud` establishes canonical fields from raw Mongo rows. Mapping layers may change display labels, but must not mutate canonical fields. Slugs must always be generated from canonical fields, never display labels.

## Display Source Order

- Database mapping path: `models.display_name` is the source of truth. Missing DB metadata falls back to the canonical model id.
- Hardcoded fallback path: legacy mapping table wins first, then Bedrock Claude display normalization, then the raw model name.
- Provider display aliases live in `providerMetadata.ts`; `vertex` displays as `google` while its slug remains `vertex`.

The hardcoded fallback is compatibility behavior. Do not add new provider-wide display policy there when the `models` collection should own the label.
