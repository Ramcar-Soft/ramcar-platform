# Contract: `pnpm check:vehicle-brand-logos`

**Implementation**: `scripts/check-vehicle-brand-logos.ts` (parallel to `scripts/check-shared-features.ts`).
**Pipeline integration**: registered as a `turbo` task in `turbo.json` and run from CI alongside `lint`, `typecheck`, `test`, and `check:shared-features`.

This contract documents the exact behavior the script MUST implement. It is the operational counterpart to data-model invariants `I-A1` … `I-A7`, `I-R2`, `I-R3`, and `I-S4`.

## Inputs (read by the script)

1. `packages/features/src/shared/vehicle-brand-model/data.ts` — parsed for the `VEHICLE_BRAND_MODEL` keys (the canonical brand set).
2. `packages/features/src/shared/vehicle-brand-logos/logo-registry.ts` — parsed for the keys and import paths inside `BRAND_LOGO_REGISTRY`. Implementation strategy: read the file as text and statically detect the keys via a parser (e.g., `@typescript-eslint/typescript-estree` already in the toolchain) — this avoids requiring the script to bundle the registry at runtime.
3. `packages/features/src/shared/vehicle-brand-logos/assets/*.svg` — file listing.
4. `packages/features/src/shared/vehicle-brand-logos/slugify.ts` — imported via `tsx` runner so the script can call the same `slugify()` used by the registry.
5. `LICENSE-third-party.md` (repo root) — presence + contains-substring check.

## Checks performed (each emits a violation on failure)

### C1 — No missing logos (data.ts → registry)

For every brand `b` in `VEHICLE_BRAND_MODEL`:

- The registry MUST contain a key strictly equal to `b`.
- Failure message:

  ```
  ✗ Missing logo for brand "<b>"
    The brand exists in packages/features/src/shared/vehicle-brand-model/data.ts
    but no entry exists in packages/features/src/shared/vehicle-brand-logos/logo-registry.ts.
    Action: add an SVG to packages/features/src/shared/vehicle-brand-logos/assets/<slug>.svg
            and a registry entry mapping "<b>" to it.
  ```

### C2 — No orphan logos (registry → data.ts)

For every key `k` in the registry:

- `VEHICLE_BRAND_MODEL` MUST contain `k`.
- Failure message:

  ```
  ✗ Orphan logo entry "<k>"
    The registry maps "<k>" to a logo asset, but "<k>" does not appear in
    packages/features/src/shared/vehicle-brand-model/data.ts.
    Action: either add "<k>" to VEHICLE_BRAND_MODEL or remove the registry entry
            and the asset file under packages/features/src/shared/vehicle-brand-logos/assets/.
  ```

### C3 — No abandoned files (filesystem → registry)

For every file `f` matching `packages/features/src/shared/vehicle-brand-logos/assets/*.svg`:

- The registry MUST reference `f` (i.e., `BRAND_LOGO_REGISTRY` has an entry whose import path resolves to `f`).
- Failure message:

  ```
  ✗ Abandoned asset <f>
    The file exists on disk but is not imported by logo-registry.ts.
    Action: import and reference it in the registry, or delete the file.
  ```

### C4 — File sanity

For every referenced asset file:

- The file MUST be ≥ 32 bytes.
- The first 64 bytes (after stripping a UTF-8 BOM if present) MUST contain `<svg`.
- Failure message:

  ```
  ✗ Corrupted or wrong-format asset <f>
    File is empty, too small, or does not start with "<svg". Bundling this would
    surface as a broken image at runtime.
    Action: re-export the asset from the source dataset and re-commit.
  ```

### C5 — Slug uniqueness

Map each brand `b` in `VEHICLE_BRAND_MODEL` through `slugify(b)`:

- The resulting set MUST have cardinality === `VEHICLE_BRAND_MODEL` key count.
- Failure message names the colliding pair:

  ```
  ✗ Slug collision: "<b1>" and "<b2>" both slugify to "<slug>"
    Action: choose a different canonical name in data.ts for one of the brands,
            or extend the slug strategy in slugify.ts (and add a test for the new rule).
  ```

### C6 — Asset budget

Sum the byte size of every file under `assets/`:

- Total MUST be ≤ 500 KB (= 512 000 bytes).
- Failure message:

  ```
  ✗ Asset bundle exceeds budget: <actual_kb> KB > 500 KB
    Files contributing the most:
      - <path1> (<sizeA> KB)
      - <path2> (<sizeB> KB)
      - <path3> (<sizeC> KB)
    Action: re-export the listed assets at icon scale (recommended SVGO defaults)
            or revisit the budget in research.md §8 with documented rationale.
  ```

### C7 — Attribution presence

- `LICENSE-third-party.md` at repo root MUST exist.
- Its contents MUST include the substring `car-logos-dataset` (case-sensitive).
- Failure message:

  ```
  ✗ Missing third-party license attribution
    Either LICENSE-third-party.md is absent at repo root or it does not reference
    the source dataset ("car-logos-dataset").
    Action: ensure the MIT notice from filippofilip95/car-logos-dataset is preserved
            in LICENSE-third-party.md (see spec 022 research.md §11).
  ```

## Exit code

- Exit `0` if and only if every check above produced zero violations.
- Exit `1` otherwise. Print all violations before exiting (do not stop at the first).

## Performance

- The script is purely static analysis + filesystem stat. Target wall-clock < 500 ms on a reviewer laptop. No network, no bundling, no AST traversal beyond reading the registry as text.

## CI integration

Add `check:vehicle-brand-logos` as a turbo task. Invoke from a single CI job that already runs `check:shared-features` so the two static checks share their cache.

## Local invocation

A developer can run the check from any directory in the repo:

```
pnpm check:vehicle-brand-logos
```

The output for a passing run:

```
✓ vehicle-brand-logos check
  • 20 brands, 20 logos — registry complete & closed
  • assets/ size 96 KB / 500 KB budget
  • LICENSE-third-party.md OK
```

The output for a failing run lists every violation with the failure messages above, sorted by check ID, and exits `1`.
