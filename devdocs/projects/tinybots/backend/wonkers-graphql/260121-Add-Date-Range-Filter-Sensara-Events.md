# 📋 260121 - Add Date Range Filter for Sensara Events GraphQL

## References

### Source Files
- **Current Implementation:**
  - `wonkers-graphql/src/graphql/schema/reports/allReports/sensaraEvent/sensaraEvent.type.ts` - Type definitions
  - `wonkers-graphql/src/graphql/schema/reports/allReports/sensaraEvent/sensaraEvent.service.ts` - Service layer
  - `wonkers-graphql/src/graphql/schema/reports/allReports/allReports.type.ts` - Query resolver

### Related Documentation
- **Original Implementation Plan:** `devdocs/projects/tinybots/backend/wonkers-graphql/251223-Sensara-Events-GraphQL.md`
- **Folder Restructure:** `devdocs/projects/tinybots/backend/wonkers-graphql/260120-Schema-Folder-Restructure.md`
- **Repository Standard:** `devdocs/projects/tinybots/backend/wonkers-graphql/OVERVIEW.md`

## User Requirements

```
Currently we have the created since field. Please also add a field where we can write a 
time period of events we want to see. e.g. a specific date or a range.
```

## 🎯 Objective

Add the ability to filter Sensara events by **date range** (specific time period) by adding a `createdUntil` parameter to the `sensaraEventReport` query.

### ⚠️ Key Considerations

1. **Current Filters:**
   - `createdSince`: ISO 8601 datetime - filters events from date X to present
   - `timePeriod`: Enum preset (LAST_HOUR, TODAY, etc.) - automatically calculates range backwards from "now"

2. **Limitation:** There is no way to:
   - Specify an **end date**
   - Query events within a **specific date range** (e.g., 2026-01-10 to 2026-01-20)
   - Query events for a **specific date** (e.g., only 2026-01-15)

3. **Solution:** Add `createdUntil` parameter with a consistent date parsing strategy (Direction B)
   - Support both:
     - ISO 8601 datetime strings (e.g., `2026-01-10T12:34:56.000Z`, `2026-01-10T12:34:56+01:00`)
     - Date-only strings `YYYY-MM-DD` (e.g., `2026-01-15`) for day-based queries
   - When `createdSince` and/or `createdUntil` are provided (and `timePeriod` is absent), treat the manual range as:
     - Start: inclusive (`>=`)
     - End: exclusive (`<`)
   - Behavior summary:
     - `createdSince` + `createdUntil` = date range
     - `createdSince` alone = events from start bound to now (preserves existing behavior)
     - `createdUntil` alone = events strictly before end bound (no lower bound)
     - Specific date (day-based): use date-only input
       - `createdSince: "2026-01-15", createdUntil: "2026-01-15"` returns events in that day (server timezone)

4. **Priority Rules:**
   - If `timePeriod` is provided → overrides both `createdSince` and `createdUntil`
   - If no `timePeriod` → use `createdSince` and/or `createdUntil`

5. **Backward Compatibility:** No breaking change - `createdUntil` is a new optional parameter

## 🔄 Implementation Plan

### Phase 1: Analysis & Preparation

- [ ] Analyze current filter logic in service
  - **Outcome**: Current implementation only supports `gte: startDate` for time filtering
  - **Outcome**: Need to add end-bound logic (prefer `< endExclusive` for manual ranges)

- [ ] Define scope and edge cases
  - **Outcome**: Handle cases:
    - `createdUntil` alone → `{ lt: endExclusive }`
    - `createdSince` + `createdUntil` → `{ gte: startInclusive, lt: endExclusive }`
    - Validation: `createdUntil` must be >= `createdSince` after normalization (if both provided)
    - Date parsing: Support ISO 8601 datetime and date-only `YYYY-MM-DD`
    - Timezone: date-only inputs are interpreted in server timezone (same convention as `timePeriod` TODAY/YESTERDAY)

- [ ] Evaluate existing test structures
  - **Outcome**: 
    - Unit test: `test/graphql/schema/reports/allReports/sensaraEvent/sensaraEvent.service.test.ts`
    - Integration test: `test/graphqlIT/reports/sensaraEventReportIT.ts`
    - Need to add test cases for `createdUntil` parameter

### Phase 2: Implementation (File/Code Structure)

```
wonkers-graphql/src/graphql/schema/reports/allReports/
├── sensaraEvent/
│   ├── index.ts                    # ✅ NO CHANGE
│   ├── sensaraEvent.type.ts        # ✅ NO CHANGE (no new types needed)
│   └── sensaraEvent.service.ts     # 🔄 UPDATE - Add createdUntil to filters
└── allReports.type.ts              # 🔄 UPDATE - Add createdUntil argument

wonkers-graphql/test/
├── graphql/schema/reports/allReports/sensaraEvent/
│   └── sensaraEvent.service.test.ts    # 🔄 UPDATE - Add test cases
└── graphqlIT/reports/
    └── sensaraEventReportIT.ts         # 🔄 UPDATE - Add IT cases (if needed)
```

### Phase 3: Detailed Implementation Steps

#### Step 1: Update Service Interface & Logic
**File:** `src/graphql/schema/reports/allReports/sensaraEvent/sensaraEvent.service.ts`

- [ ] Add `createdUntil` to `SensaraEventFilters` interface
  ```typescript
  export interface SensaraEventFilters {
    createdSince?: string | null
    createdUntil?: string | null  // NEW
    timePeriod?: 'LAST_HOUR' | 'LAST_3_HOURS' | 'LAST_6_HOURS' | 'TODAY' | 'YESTERDAY' | 'LAST_WEEK' | null
    eventType?: string | null
    event?: string | null
    robotId?: number | null
  }
  ```

- [ ] Update `buildReport()` method to handle `createdUntil` and date-only parsing
  ```typescript
  // Handle time filtering (timePeriod takes precedence)
  if (filters.timePeriod) {
    const startDate = this.calculateTimePeriodRange(filters.timePeriod)
    whereClause.created_at = { gte: startDate }
  } else {
    // Build created_at filter from createdSince and/or createdUntil
    // Manual range semantics: [startInclusive, endExclusive)
    // - ISO datetime: parse as exact instant
    // - Date-only YYYY-MM-DD: expand to start-of-day and next-day start (server timezone)
    const createdAtFilter: any = {}

    const startInclusive = parseCreatedAtBound(filters.createdSince, { kind: 'start' }) // Date | undefined
    const endExclusive = parseCreatedAtBound(filters.createdUntil, { kind: 'endExclusive' }) // Date | undefined

    if (startInclusive) {
      createdAtFilter.gte = startInclusive
    }

    if (endExclusive) {
      createdAtFilter.lt = endExclusive
    }

    if (startInclusive && endExclusive && endExclusive.getTime() < startInclusive.getTime()) {
      throw new Error('createdUntil must be greater than or equal to createdSince')
    }

    if (Object.keys(createdAtFilter).length > 0) {
      whereClause.created_at = createdAtFilter
    }
  }
  ```

**Rationale:** Preserve priority rule: `timePeriod` overrides manual date filters. If no `timePeriod`, build filter from `createdSince` and `createdUntil`.

#### Step 2: Update GraphQL Query Arguments
**File:** `src/graphql/schema/reports/allReports/allReports.type.ts`

- [ ] Add `createdUntil` argument to `sensaraEventReport` field
  ```typescript
  t.list.field('sensaraEventReport', {
    type: nonNull(SensaraEventReportRow),
    args: {
      createdSince: stringArg({ 
        description: 'Start of range. Accepts ISO 8601 datetime or YYYY-MM-DD (server timezone for date-only).' 
      }),
      createdUntil: stringArg({  // NEW
        description: 'End of range. Accepts ISO 8601 datetime or YYYY-MM-DD (server timezone for date-only). End is exclusive.'
      }),
      timePeriod: arg({
        type: SensaraEventTimePeriod,
        description: 'Filter by predefined time period (overrides createdSince/createdUntil if provided)'
      }),
      // ... other args unchanged
    },
    // ...
  })
  ```

- [ ] Update resolver to pass `createdUntil` to service
  ```typescript
  return service.buildReport(
    {
      createdSince: args.createdSince,
      createdUntil: args.createdUntil,  // NEW
      timePeriod: args.timePeriod as SensaraEventFilters['timePeriod'],
      eventType: args.eventType,
      event: args.event,
      robotId: args.robotId
    },
    args.limit ?? undefined,
    args.offset ?? undefined
  )
  ```

#### Step 3: Update Unit Tests
**File:** `test/graphql/schema/reports/allReports/sensaraEvent/sensaraEvent.service.test.ts`

- [ ] Add test case: `createdUntil` alone
  - Input: `{ createdUntil: '2026-01-20T23:59:59.000Z' }`
  - Expected: Query with `created_at: { lt: ... }`

- [ ] Add test case: `createdSince` + `createdUntil` (date range)
  - Input: `{ createdSince: '2026-01-10T00:00:00.000Z', createdUntil: '2026-01-20T23:59:59.000Z' }`
  - Expected: Query with `created_at: { gte: ..., lt: ... }`

- [ ] Add test case: specific date (date-only)
  - Input: `{ createdSince: '2026-01-15', createdUntil: '2026-01-15' }`
  - Expected: Query uses `{ gte: startOfDay(2026-01-15), lt: startOfDay(2026-01-16) }` (server timezone)

- [ ] Add test case: `timePeriod` overrides `createdUntil`
  - Input: `{ timePeriod: 'TODAY', createdUntil: '2026-01-01T00:00:00.000Z' }`
  - Expected: `timePeriod` logic is used, `createdUntil` ignored

- [ ] Add test case: invalid range
  - Input: `{ createdSince: '2026-01-20', createdUntil: '2026-01-10' }`
  - Expected: throws validation error

#### Step 4: Verify & Test

- [ ] Generate Prisma clients (if needed)
  ```bash
  cd tinybots/backend/wonkers-graphql && yarn generate
  ```

- [ ] Regenerate GraphQL schema output
  ```bash
  cd tinybots/backend/wonkers-graphql && yarn graphql:types
  ```

- [ ] Run unit tests
  ```bash
  just -f devtools/tinybots/local/Justfile test-wonkers-graphql
  ```

- [ ] Manual testing via GraphQL Playground
  ```graphql
  # Test date range
  query {
    reports {
      allReports {
        sensaraEventReport(
          createdSince: "2026-01-10T00:00:00.000Z"
          createdUntil: "2026-01-20T23:59:59.999Z"
          limit: 10
        ) {
          sensaraId
          event
          createdAt
        }
      }
    }
  }

  # Test specific date (date-only)
  query {
    reports {
      allReports {
        sensaraEventReport(
          createdSince: "2026-01-15"
          createdUntil: "2026-01-15"
          limit: 10
        ) {
          sensaraId
          event
          createdAt
        }
      }
    }
  }

  # Test only createdUntil (events before date)
  query {
    reports {
      allReports {
        sensaraEventReport(
          createdUntil: "2026-01-15T00:00:00.000Z"
          limit: 10
        ) {
          sensaraId
          event
          createdAt
        }
      }
    }
  }
  ```

## 📊 Summary of Results
> Do not summarize the results until the implementation is done and I request it

### ✅ Completed Achievements
- (To be filled after implementation)

### 🧪 Test Results
- (To be filled after testing)

## 🚧 Outstanding Issues & Follow-up

### ⚠️ Questions to Clarify

- [ ] None (Direction B decided): support ISO 8601 datetime and `YYYY-MM-DD`, validate range server-side, and interpret date-only inputs in server timezone.

### 🔮 Future Enhancements (Out of Scope)

- [ ] Add calendar date picker support in frontend
- [ ] Update `timePeriod` enum to add `CUSTOM` option for clearer indication when using date range
