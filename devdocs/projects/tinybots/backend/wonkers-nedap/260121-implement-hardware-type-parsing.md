# 📋 [260121] - Implement Hardware Type Parsing from ONS Survey

## References

- Global standard: `devdocs/projects/tinybots/OVERVIEW.md`
- Repo-specific standard: `devdocs/projects/tinybots/wonkers-nedap/OVERVIEW.md`
- Related repos: `wonkers-taas-orders`, `wonkers-db`, `tiny-internal-services`

## User Requirements

> From stakeholder:
>
> **Relevance:**
> People can order either a voice assistant or a robot. This question needs to be added to the forms where people order Tessa and then parsed by us.
>
> **Contact for forms:** Evan has created new ONS ECD form question
>
> **Tasks:**
> 1. Get the parameter `hardwareType` - values will be provided by Evan later
> 2. Implement parsing the new question in `wonkers-nedap`
> 3. Update concept orders to accept new field (db changes, concept library, wonkers-taas-orders)
> 4. Map concept order field to taas-order field for type (currently default ROBOT)

---

## 🔍 Pre-Implementation Analysis

### Existing Infrastructure (Already Available ✅)

| Component | Status | Details |
|-----------|--------|---------|
| **Database** | ✅ Ready | `hardware_type` table exists with values: `1=ROBOT`, `2=VOICE_ASSISTANT` |
| **DB Column** | ✅ Ready | `taas_concept_order.hardware_type_id` column exists (migration V52_5), DEFAULT=1 |
| **wonkers-taas-orders V6 API** | ⚠️ Exists | `POST /internal/v6/taas-orders/concepts/orders` - requires Phase 2 changes to accept `null` |
| **tiny-internal-services** | ✅ Ready | `HardwareTypeInputDataType` class handles string→id transformation |

### Required Changes (This Task)

| Component | Status | Details |
|-----------|--------|---------|
| **wonkers-taas-orders** | 🚧 TODO | Update V6 DTO to accept optional/null `hardwareType` |
| **wonkers-db** | 🔍 VERIFY | Confirm `hardware_type_id` is nullable and remove DEFAULT=1 |
| **wonkers-nedap** | 🚧 TODO | Parse `hardwareType` from survey and call V6 endpoint |

---

## ⚠️ Assumptions & Questions for Stakeholder Verification

> **IMPORTANT:** The following assumptions need to be confirmed before implementation. Update this section with confirmed answers.

### Assumption 1: Survey Question Key

| Item | Details |
|------|---------|
| **Question** | What is the exact key/identifier for the hardware type question in the ONS form? |
| **My Assumption** | The key will be `hardwareType` (matching the DTO field name) |
| **Expected Format** | e.g., `hardwareType`, `hwType`, `productType` |
| **Status** | ✅ CONFIRMED |
| **Stakeholder Response** | **Arno:** The key is `hardwareType` |

---

### Assumption 2: Hardware Type Values in Form

| Item | Details |
|------|---------|
| **Question** | What values will the form send for hardware type? |
| **Database Values** | `ROBOT` (id=1), `VOICE_ASSISTANT` (id=2) |
| **My Assumption** | Form will send exact strings: `ROBOT` or `VOICE_ASSISTANT` |
| **Alternative Options** | Could be lowercase (`robot`/`voice_assistant`) or Dutch labels |
| **Status** | ⬜ PENDING CONFIRMATION |
| **Stakeholder Response** | _[To be filled by Evan]_ |

---

### Assumption 3: Default Value Behavior

| Item | Details |
|------|---------|
| **Question** | If hardware type question is not answered or missing, what should the default be? |
| **Option A** | Default to `ROBOT` (backward compatible) |
| **Option B** | Leave as `null` (require manual selection in backoffice) |
| **My Assumption** | Default to `ROBOT` for backward compatibility |
| **Status** | ✅ CONFIRMED |
| **Stakeholder Response** | **Arno:** Leave as `null` (Option B) |

---

### Assumption 4: Scope Confirmation

| Item | Details |
|------|---------|
| **Question** | Confirm that only `wonkers-nedap` needs changes? |
| **My Analysis** | DB and `wonkers-taas-orders` V6 API are already prepared |
| **Status** | ⬜ PENDING CONFIRMATION |
| **Stakeholder Response** | _[To be filled]_ |

---

## 🎯 Objective

Implement parsing of the new `hardwareType` survey question in `wonkers-nedap` and send it to `wonkers-taas-orders` V6 API, enabling the system to distinguish between ROBOT and VOICE_ASSISTANT orders.

### ⚠️ Key Considerations

1. **Default Behavior**: Orders without `hardwareType` will have `null` value (requires manual selection in backoffice) - confirmed by Arno
2. **V6 Migration**: Switch from V1 to V6 endpoint for concept orders
3. **Value Mapping**: May need to map form values to exact `HardwareTypeInputDataType` values

### 🔒 Atomicity Constraint (Critical)

> **Deployment Order** (cần maintain integrity khi default = null):
>
> **Step 1: wonkers-taas-orders** (deploy first)
> - Update `ConceptOrderV6Dto` to accept optional `hardwareType`
> - Update `createConceptV6` to handle null
>
> **Step 2: wonkers-db** (verify/update if needed)
> - Ensure `hardware_type_id` column is nullable
> - Remove DEFAULT=1 if present (để null khi không có giá trị)
>
> **Step 3: wonkers-nedap** (deploy last)
> - Add `getHardwareType()` mapper method
> - Switch URL V1 → V6
>
> **Rollback strategy:**
> - Rollback wonkers-nedap first (switch V6 → V1)
> - Then rollback wonkers-taas-orders if needed

---

## 🔄 Implementation Plan

### Phase 1: Analysis & Preparation

- [x] ~~Confirm survey question key from Evan (Assumption 1)~~ → ✅ Confirmed: `hardwareType`
- [ ] Confirm form values from Evan (Assumption 2)
- [x] ~~Confirm default behavior (Assumption 3)~~ → ✅ Confirmed: `null`
- [ ] Confirm scope (Assumption 4)
- [ ] **Obtain sample Survey Result JSON** from Evan containing `hardwareType` question
   - Verify `answeredQuestions[].additionalInfo` contains expected key
   - Save as test fixture: `wonkers-nedap/test/fixtures/survey-result-with-hardware-type.json`
- [ ] Review existing `ConceptOrderMapper` implementation
   - **File**: `wonkers-nedap/src/mappers/ConceptOrderMapper.ts`
- [ ] Review existing `WonkersTaasOrderService` implementation
   - **File**: `wonkers-nedap/src/service/WonkersTaasOrderService.ts`

---

### Phase 2: Upstream Changes (wonkers-taas-orders)

> **Required:** V6 API hiện tại không chấp nhận `hardwareType = null`. Cần update trước khi wonkers-nedap có thể gửi null.

#### Task 2.1: Update `ConceptOrderV6Dto` to Accept Optional hardwareType

**File:** `wonkers-taas-orders/src/model/dto/ConceptOrderV6Dto.ts`

**Current:**
```typescript
export class ConceptOrderV6Dto extends ConceptOrderDto {
   @Expose()
   @IsDefined()
   @AsHardwareTypeInputDataType
   hardwareType: HardwareTypeInputDataType
}
```

**Proposed Change:**
```typescript
export class ConceptOrderV6Dto extends ConceptOrderDto {
   @Expose()
   @IsOptional()
   @AsOptionalHardwareTypeInputDataType  // Use optional variant from tiny-internal-services
   hardwareType?: HardwareTypeInputDataType | null
}
```

**Status:** ⬜ TODO

---

#### Task 2.2: Update `createConceptV6` to Handle null

**File:** `wonkers-taas-orders/src/repository/ConceptOrderRepository.ts` (or similar)

**Current:** `+order.hardwareType` (unary plus assumes non-null)

**Proposed Change:**
```typescript
hardwareTypeId: order.hardwareType != null ? +order.hardwareType : null
```

**Status:** ⬜ TODO

---

#### Task 2.3: Verify Database Schema

**Table:** `taas_concept_order`
**Column:** `hardware_type_id`

**Verify:**
- [ ] Column is **nullable** (not `NOT NULL`)
- [ ] Remove `DEFAULT=1` if present (to allow explicit null)

**Status:** 🔍 VERIFY

---

### Phase 3: Implementation Structure (wonkers-nedap)

```
wonkers-nedap/src/
├── mappers/
│   └── ConceptOrderMapper.ts        # 🔄 UPDATE - Add hardwareType parsing
├── model/
│   └── ConceptOrderDto.ts           # 🔄 UPDATE - Add hardwareType field
├── service/
│   └── WonkersTaasOrderService.ts   # 🔄 UPDATE - Call V6 endpoint
```

---

### Phase 3: Detailed Implementation Steps

#### Task 3.1: Update `ConceptOrderDto` to Include `hardwareType`

**File:** `wonkers-nedap/src/model/ConceptOrderDto.ts`

**Current:** No `hardwareType` field

**Proposed Change:**
```typescript
// Add new field
@IsString()
@IsOptional()
@IsIn(['ROBOT', 'VOICE_ASSISTANT'])
hardwareType?: 'ROBOT' | 'VOICE_ASSISTANT' | null
```

**Status:** ⬜ TODO

---

#### Task 3.2: Update `ConceptOrderMapper.map()` to Parse `hardwareType`

**File:** `wonkers-nedap/src/mappers/ConceptOrderMapper.ts`

**Current:** Does not parse `hardwareType`

**Proposed Change:**
```typescript
// Add after existing field mappings (around line 125)
dto.hardwareType = this.getHardwareType(resultProperties, 'hardwareType') // Key TBD from Evan
```

**Mapping Configuration (explicit map table):**
```typescript
// Explicit mapping table - values TBD from Evan
const HARDWARE_TYPE_MAP: Record<string, 'ROBOT' | 'VOICE_ASSISTANT'> = {
   'robot': 'ROBOT',
   'voice_assistant': 'VOICE_ASSISTANT',
   // Add Dutch labels if needed:
   // 'spraakassistent': 'VOICE_ASSISTANT',
}
```

**New Method:**
```typescript
static getHardwareType(
        answeredQuestions: SurveyAnsweredQuestion[],
        key: string
): 'ROBOT' | 'VOICE_ASSISTANT' | null {
   const data = answeredQuestions.filter((question) =>
           question.additionalInfo?.toLowerCase()?.includes(key.toLowerCase())
   )

   // Edge case: No match - return null (requires manual selection in backoffice)
   if (!data || data.length === 0) {
      return null // Confirmed by Arno: leave as null when missing
   }

   // Edge case: Multiple matches - log warning and use first
   if (data.length > 1) {
      console.warn(`[ConceptOrderMapper] Multiple hardwareType questions found: ${data.map(q => q.id).join(', ')}. Using first match.`)
   }

   const surveyValue = data[0].answer?.text?.trim().toLowerCase()

   // Explicit mapping lookup (deterministic)
   const mappedValue = HARDWARE_TYPE_MAP[surveyValue]

   if (!mappedValue) {
      console.warn(`[ConceptOrderMapper] Unknown hardwareType value: "${surveyValue}". Returning null.`)
      return null // Unknown values also require manual selection
   }

   return mappedValue
}
```

**Status:** ⬜ TODO (Blocked by Assumption 1 & 2)

---

#### Task 3.3: Update `WonkersTaasOrderService` to Call V6 Endpoint

**File:** `wonkers-nedap/src/service/WonkersTaasOrderService.ts`

**Current:**
```typescript
public async addConceptOrder (orderDto: ConceptOrderDto): Promise<ConceptOrderDto> {
   const url = `${this.wonkersTaasOrderAddress}/internal/v1/taas-orders/concepts/orders`
   // ...
}
```

**Proposed Change:**
```typescript
public async addConceptOrder (orderDto: ConceptOrderDto): Promise<ConceptOrderDto> {
   // Change V1 → V6
   const url = `${this.wonkersTaasOrderAddress}/internal/v6/taas-orders/concepts/orders`
   // ...
}
```

**Status:** ⬜ TODO

---

### Phase 4: Update Tests

**Files:**
- `wonkers-nedap/test/mappers/ConceptOrderMapperTest.ts` (if exists)
- `wonkers-nedap/test/service/WonkersTaasOrderServiceTest.ts` (if exists)
- `wonkers-nedap/test/fixtures/survey-result-with-hardware-type.json` (new fixture)

**Test Cases to Add:**

1. **Parse `hardwareType` = ROBOT**
   - Survey has `hardwareType` question with value `robot`
   - Expected: `dto.hardwareType = 'ROBOT'`
   - **Explicit assertion (Chai):** `expect(dto.hardwareType).to.eq('ROBOT')`

2. **Parse `hardwareType` = VOICE_ASSISTANT**
   - Survey has `hardwareType` question with value `voice_assistant`
   - Expected: `dto.hardwareType = 'VOICE_ASSISTANT'`
   - **Explicit assertion (Chai):** `expect(dto.hardwareType).to.eq('VOICE_ASSISTANT')`

3. **Default when missing**
   - Survey does NOT have `hardwareType` question
   - Expected: `dto.hardwareType = null` (requires manual selection)
   - **Explicit assertion (Chai):** `expect(dto.hardwareType).to.be.null`

4. **Unknown value returns null**
   - Survey has `hardwareType` question with unknown value (e.g., `foobar`)
   - Expected: `dto.hardwareType = null` + warning logged
   - **Explicit assertion (Chai):** `expect(dto.hardwareType).to.be.null`

5. **Multiple matches uses first and logs warning**
   - Survey has >1 questions with `additionalInfo` containing `hardwareType`
   - Expected: Uses first match + warning logged

6. **V6 Endpoint called**
   - Verify `WonkersTaasOrderService` calls `/internal/v6/...` instead of `/internal/v1/...`

7. **Existing tests remain stable**
   - All existing mapper tests should include explicit `hardwareType` expectation
   - For tests without hardwareType question in survey: expect `null`
   - Update snapshots/assertions to include new field

**Fixture-based testing:**
- Use sample JSON from Evan as base fixture
- Verify `answeredQuestions[].additionalInfo` parsing works correctly with real data

**Status:** ⬜ TODO

---

### Phase 5: Integration Testing

**Command:** `just -f devtools/tinybots/local/Justfile test-wonkers-nedap`

- [ ] All existing tests pass
- [ ] New tests for `hardwareType` parsing pass
- [ ] Manual test with sample survey data (if available)

**Status:** ⬜ TODO

---

## 📊 Task Breakdown Summary

| Task | Repo | File | Description | Depends On | Status |
|------|------|------|-------------|------------|--------|
| 1.0 | - | - | Confirm assumptions with stakeholder | - | ✅ DONE (1, 3) |
| 1.1 | - | - | Obtain sample Survey Result JSON | Assumption 2 | ⬜ BLOCKED |
| **2.1** | **wonkers-taas-orders** | ConceptOrderV6Dto.ts | Make `hardwareType` optional | - | ⬜ TODO |
| **2.2** | **wonkers-taas-orders** | ConceptOrderRepository.ts | Handle null in createConceptV6 | 2.1 | ⬜ TODO |
| **2.3** | **wonkers-db** | schema | Verify `hardware_type_id` nullable | - | 🔍 VERIFY |
| 3.1 | wonkers-nedap | ConceptOrderDto.ts | Add `hardwareType` field (nullable) | - | ⬜ TODO |
| 3.2 | wonkers-nedap | ConceptOrderMapper.ts | Add `getHardwareType()` with explicit map | Sample JSON | ⬜ BLOCKED |
| 4.0 | wonkers-nedap | Tests | Add/update test cases | 3.1, 3.2 | ⬜ TODO |
| 3.3 | wonkers-nedap | WonkersTaasOrderService.ts | Change to V6 endpoint | **2.1, 2.2, 3.2, 4.0** | ⬜ BLOCKED |
| 5.0 | - | - | Integration testing | 3.3 | ⬜ TODO |

> **⚠️ Deployment Order (Atomicity):**
> 1. **Deploy wonkers-taas-orders** (Task 2.1, 2.2) - V6 accepts null
> 2. **Verify wonkers-db** (Task 2.3) - column is nullable
> 3. **Deploy wonkers-nedap** (Task 3.1, 3.2, 3.3, 4.0) - mapper + V6 switch

---

## 📝 Verification Checklist

After implementation, verify:

- [ ] `hardwareType` is parsed from ONS survey correctly
- [ ] `null` is returned when question is missing (requires manual selection)
- [ ] V6 endpoint is called (not V1)
- [ ] Concept order is created with correct `hardware_type_id` in database (or null)
- [ ] All existing tests pass
- [ ] New tests cover hardware type scenarios
- [ ] Existing flows still work (with `hardwareType = null` for legacy orders)

---

## 📅 Timeline & Notes

| Date | Update |
|------|--------|
| 2026-01-21 | Plan created, awaiting stakeholder confirmation on assumptions |
| _TBD_ | Assumptions confirmed by Evan |
| _TBD_ | Implementation started |
| _TBD_ | Implementation completed |
| _TBD_ | PR submitted |

---

## 🚧 Blockers

1. ~~**Survey Question Key**~~ - ✅ Confirmed: `hardwareType` (Arno)
2. **Form Values** - Need exact values from Evan (Assumption 2)
3. ~~**Default Behavior Confirmation**~~ - ✅ Confirmed: `null` when missing (Arno)
4. **Sample Survey Result JSON** - Need 1 sample payload from Evan to:
   - Verify `additionalInfo` key pattern
   - Create test fixture
   - Confirm mapping table values

---

## 📎 Appendix: Reference Code

### Current `ConceptOrderMapper.map()` (relevant section)

```112:127:wonkers-nedap/src/mappers/ConceptOrderMapper.ts
    dto.tessaExpertNeeded = this.getTessaExpertNeeded(
      resultProperties,
      'tessaExpertNeeded'
    )
    dto.teamId = setStringProperty(resultProperties, 'teamId', 256)

    if (!dto.teamId && result.employeeObjectId > 0) {
      dto.addLazyPatch<OnsNedapApi, 'getTeamsByEmployeeId'>(
        getTeamsByEmployeeAlias,
        (val) => {
          dto.teamId = this.mapTeamNameFromGetTeamsResult(val)
        }
      )
    }

    dto.notes = setStringProperty(resultProperties, 'notes', 1024)
    return dto
```

### Current `WonkersTaasOrderService.addConceptOrder()`

```18:27:wonkers-nedap/src/service/WonkersTaasOrderService.ts
  public async addConceptOrder (orderDto: ConceptOrderDto): Promise<ConceptOrderDto> {
    try {
      const url = `${this.wonkersTaasOrderAddress}/internal/v1/taas-orders/concepts/orders`
      const response = await axios.post(url, orderDto)
      return response.data
    } catch (error) {
      console.error(error)
      throw new InternalServerError('Issue with sending request to tinybots')
    }
  }
```

### `ConceptOrderV6Dto` in wonkers-taas-orders

```1:12:wonkers-taas-orders/src/model/dto/ConceptOrderV6Dto.ts
import 'reflect-metadata'
import { Expose } from 'class-transformer'
import { IsDefined } from 'class-validator'
import { ConceptOrderDto } from './ConceptOrderDto'
import { AsHardwareTypeInputDataType, HardwareTypeInputDataType } from 'tiny-internal-services'

export class ConceptOrderV6Dto extends ConceptOrderDto {
  @Expose()
  @IsDefined()
  @AsHardwareTypeInputDataType
  hardwareType: HardwareTypeInputDataType
}
```
