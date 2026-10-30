# Record Refresh

Last updated: 2026-10-30

## Normal Use

The site's `Refresh records` link opens the manual `Refresh Maishift records`
GitHub workflow. Run it on `main` as the repository owner after refreshing
the public Maishift profile. The local equivalent is `npm run sync:records`.
There is no new background polling, NET login, API key, or paid service.

## Catalog Recovery

On 2026-10-30 the public ASIA chart set had grown from 6,060 to 6,084 charts,
while the site's catalog was still pinned to the earlier set. The strict
coverage check correctly rejected an incomplete import rather than silently
dropping the 24 unknown charts. Updating the catalog restored the import.

Normal record sync now has a narrowly scoped recovery path:

1. Import against the existing pinned catalog as before.
2. Only a typed `MAISHIFT_CATALOG_DRIFT` coverage failure runs the existing
   `npm run refresh:catalog` pipeline, including candidate reconciliation,
   level/constant validation, and incremental self-hosted jacket sync.
3. Retry the record importer once in a fresh process against the new catalog.
   A second mismatch or catalog validation failure remains an error.

Network, access, unsupported response, and ambiguous mapping failures do not
trigger catalog replacement. The raw importer and catalog-pinning commands
retain strict full coverage and never recursively invoke the recovery runner.
An ordinary successful record refresh does not fetch external catalog data.

## Publication

The manual workflow detects changes across the record snapshot, pinned and
generated catalogs, jacket manifest, and jacket files. Tests and the configured
static build run before any commit or push. Only validated changes are committed
and deployed together; no-change runs skip build, commit, and deployment.
The existing weekly catalog schedule and all owner/Planner/video permissions
remain unchanged.

## Verification

The recovery included five new CiRCLE PLUS songs and 24 charts, bringing the
catalog to 1,415 songs / 6,084 charts. All 6,060 previous chart IDs were retained.
The public record import succeeded with 994 records, rating 14,874, and 238
AP/AP+ charts (previously 964 records, 14,842, and 221 respectively). All existing
AP/AP+ milestone dates were preserved. Five new self-hosted jackets were fetched;
the other 1,410 were reused. Missing translations for four new titles are not
invented and do not block original-title search or record import. Known Maishift
genre enums for the new songs join the existing Touhou Project and maimai groups.

All 186 tests and the 1,491-page local static build passed. Recovery tests cover
the normal path, exact drift recovery order, unrelated failures, catalog
validation failure, a second mismatch without loops, and workflow commit/build
ordering and file coverage. Local preview wrappers are not part of publication.
