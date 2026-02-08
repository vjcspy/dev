# 📋 [PROD-XXX: 2026-02-02] - Simplify fromDate Format from ISO8601 to YYYY-MM-DD

## References

- **Target Repository**: `eve` (Java/Dropwizard)
- **Related Plan**: `devdocs/projects/tinybots/backend/eve/260121-Soft-Delete-Recurring-Schedule-Series.md`
- **Key Files**:
  - `eve/src/main/java/nl/tinybots/eve/resource/DeleteV4ScheduleResource.java`
  - `eve/src/main/java/nl/tinybots/eve/model/dto/TaskIdentifierDto.java`
  - `eve/src/main/java/nl/tinybots/eve/service/ScheduleService.java`

## User Requirements

> **From Developer:**
>
> Hiện tại `fromDate` yêu cầu ISO8601 format với timezone offset (e.g., `2026-05-05T00:00:00+02:00`). Điều này gây khó khăn cho frontend vì:
> - Phải tính toán timezone offset (DST-aware)
> - Format phức tạp, dễ gây parsing errors
> - User intent chỉ là "delete from ngày X", không cần precision đến giây
>
> **Yêu cầu**: Đổi sang format `YYYY-MM-DD` để frontend đơn giản hơn.

## 🎯 Objective

Simplify `fromDate` parameter từ ISO8601 (`2026-05-05T00:00:00+02:00`) sang YYYY-MM-DD (`2026-05-05`) để cải thiện Developer Experience cho frontend và giảm risk về timezone handling errors.

### ⚠️ Key Considerations

#### 1. Timezone Handling Strategy

**Current (ISO8601):**
```
Client sends: "2026-05-05T00:00:00+02:00"
Server: Parse ZonedDateTime → normalize to robot TZ
```

**Proposed (YYYY-MM-DD):**
```
Client sends: "2026-05-05"
Server: Parse LocalDate → convert to ZonedDateTime using robot TZ from X-Time-Zone header
        → "2026-05-05T00:00:00" in robot timezone (start of day)
```

#### 2. Semantic Change

| Aspect | Before | After |
|--------|--------|-------|
| **Format** | `2026-05-05T00:00:00+02:00` | `2026-05-05` |
| **Precision** | Arbitrary instant | Start of day (00:00:00) |
| **Timezone source** | Client-provided offset | `X-Time-Zone` header (robot TZ) |
| **DST handling** | Client responsibility | Server responsibility |

#### 3. Boundary Semantics (Unchanged)

`fromDate = 2026-05-05` → interpreted as `2026-05-05T00:00:00` in robot TZ (exclusive boundary)

```
Schedule: Daily at 09:00 (Europe/Amsterdam)
fromDate: "2026-05-05"
→ end_at = 2026-05-05T00:00:00+02:00

Results:
  ✅ 2026-05-04 09:00 → Kept (< 2026-05-05T00:00:00)
  ❌ 2026-05-05 09:00 → Removed (>= 2026-05-05T00:00:00)
  ❌ 2026-05-06 09:00 → Removed
```

#### 4. Validation Rules

| Rule | Before | After |
|------|--------|-------|
| **Format** | ISO8601 with offset required | YYYY-MM-DD (LocalDate) |
| **Past date check** | `Instant` comparison | `LocalDate` comparison in robot TZ |
| **Allow today?** | Yes (if instant >= now) | **Yes** (today is valid) |

**Decision**: Allow `fromDate = today` vì:

#### 4.1 Parameter Precedence

`fromDate` có thể được truyền qua **query param** hoặc **request body**. Quy tắc precedence:

| Priority | Source | Example |
|----------|--------|---------|
| 1 (highest) | Query param | `?fromDate=2026-05-05` |
| 2 | Request body | `{"fromDate": "2026-05-05", ...}` |

**Rule**: Nếu cả hai được cung cấp → **query param wins**.

**Implementation Note**:
```java
// In DeleteV4ScheduleResource.java
LocalDate fromDateLocal = null;
String fromDateSource = "default";  // For audit logging

if (fromDateParam != null) {
    // Query param takes precedence
    fromDateLocal = parseLocalDate(fromDateParam);
    fromDateSource = "query";
} else if (taskDto.getFromDate() != null) {
    // Fallback to body
    fromDateLocal = taskDto.getFromDate();
    fromDateSource = "body";
}
```

#### 4.3 Audit Logging (Traceability)

Để hỗ trợ debugging và traceability, log các thông tin sau khi soft-delete:

```java
// In ScheduleService.delete() - after successful operation
log.info("Soft-delete series: scheduleId={}, robotId={}, " +
         "robotTimezone={}, fromDate={}, fromDateSource={}, endAt={}",
         scheduleId, robotId,
         robotTz.getID(),           // Robot timezone used (e.g., "Europe/Amsterdam")
         fromDateLocal,             // Input date (e.g., "2026-05-05")
         fromDateSource,            // Source: "query", "body", or "default"
         endAt.toInstant());        // Final boundary as instant
```

**Log fields:**

| Field | Purpose | Example |
|-------|---------|---------|
| `robotTimezone` | Timezone used for conversion | `Europe/Amsterdam` |
| `fromDate` | Input date from client | `2026-05-05` |
| `fromDateSource` | Where fromDate came from | `query` / `body` / `default` |
| `endAt` | Final boundary (instant) | `2026-05-04T22:00:00Z` |

#### 4.2 Timezone Source (Clarification)

**QUAN TRỌNG**: Robot timezone được lấy từ **server (robot profile trong DB)**, KHÔNG phải từ `X-Time-Zone` header.

| Source | Mục đích | Trust Level |
|--------|----------|-------------|
| **Robot profile (DB)** | Nguồn chân lý cho robot timezone | Server-controlled ✅ |
| `X-Time-Zone` header | UI display hint (optional) | Client-controlled ⚠️ |

**Existing behavior** (giữ nguyên):
```java
// ScheduleService.java - existing code
TimeZone robotTz = robotService.getRobotTimezone(robotId);  // From DB, not header
ZoneId robotZoneId = ZoneId.of(robotTz.getID());
```

**Note**: Plan description đã gây hiểu nhầm khi viết "using robot TZ from X-Time-Zone header". Thực tế, server luôn lấy timezone từ robot profile.
- Past occurrences trong ngày đã execute rồi
- `end_at = start of today` không affect những occurrences đã chạy

#### 5. Breaking Change Assessment

| Client | Impact |
|--------|--------|
| **Frontend (my.tinybots.academy)** | ✅ Positive - simpler format |
| **Mobile apps** | ✅ Positive - simpler format |
| **Existing API calls** | ⚠️ Breaking - ISO8601 format no longer accepted |

**Context**: Soft-delete recurring schedule (`fromDate` parameter) là feature mới được implement trong plan `260121-Soft-Delete-Recurring-Schedule-Series.md`. Feature **chưa release to production** và chưa có client nào sử dụng.

**Decision**: Breaking change is acceptable vì:
1. Feature chưa release → không có existing client
2. Không cần deprecation period hay backward compatibility
3. Đơn giản hóa implementation

## 🔄 Implementation Plan

### Phase 1: Analysis & Preparation

- [ ] Xác nhận không có client nào đang dùng `fromDate` với ISO8601 format
  - **Outcome**: [Confirm từ frontend team]
- [ ] Review existing tests for fromDate parsing
  - **Outcome**: [List tests cần update]

### Phase 2: Implementation (File Structure)

```
eve/src/main/java/nl/tinybots/eve/
├── resource/
│   └── DeleteV4ScheduleResource.java       # 🔄 UPDATE - Change fromDate parsing
├── model/dto/
│   └── TaskIdentifierDto.java              # 🔄 UPDATE - Change fromDate type
├── service/
│   └── ScheduleService.java                # 🔄 UPDATE - Adjust validation logic

eve/src/test/java/nl/tinybots/eve/
├── resource/
│   └── DeleteV4ScheduleResourceIT.java     # 🔄 UPDATE - Update test cases
```

### Phase 3: Detailed Implementation Steps

#### Step 1: Update `TaskIdentifierDto`

**File**: `eve/src/main/java/nl/tinybots/eve/model/dto/TaskIdentifierDto.java`

```java
// BEFORE
@InFutureOrPresent
private ZonedDateTime fromDate;

// AFTER
private LocalDate fromDate;  // Simple date, no timezone - validated at service layer
```

**Note**: Remove `@InFutureOrPresent` annotation vì `LocalDate` validation cần robot timezone context (được handle ở service layer).

#### Step 2: Update `DeleteV4ScheduleResource`

**File**: `eve/src/main/java/nl/tinybots/eve/resource/DeleteV4ScheduleResource.java`

```java
// BEFORE - Parse ISO8601
@QueryParam("fromDate") String fromDateParam
// ...
if (fromDateParam != null) {
    try {
        fromDate = ZonedDateTime.parse(fromDateParam);
    } catch (DateTimeParseException e) {
        throw new BadRequestException("Invalid fromDate format. Expected ISO8601 with offset (e.g., 2026-05-05T00:00:00+02:00)");
    }
}

// AFTER - Parse YYYY-MM-DD
@QueryParam("fromDate") String fromDateParam
// ...
LocalDate fromDateLocal = null;
if (fromDateParam != null) {
    try {
        fromDateLocal = LocalDate.parse(fromDateParam);  // YYYY-MM-DD format
    } catch (DateTimeParseException e) {
        throw new BadRequestException("Invalid fromDate format. Expected YYYY-MM-DD (e.g., 2026-05-05)");
    }
    taskDto.setFromDate(fromDateLocal);
} else if (taskDto.getFromDate() != null) {
    fromDateLocal = taskDto.getFromDate();
}

// No timezone conversion here - service layer handles it
```

#### Step 3: Update `ScheduleService.delete()`

**File**: `eve/src/main/java/nl/tinybots/eve/service/ScheduleService.java`

```java
// BEFORE
ZonedDateTime endAt = task.getFromDate() != null ? task.getFromDate() : nowInRobotTz;
if (endAt.toInstant().isBefore(nowInRobotTz.toInstant())) {
    throw new BadRequestException("Cannot delete schedule series from a past date");
}

// AFTER
ZoneId robotZoneId = ZoneId.of(robotTz.getID());
LocalDate today = LocalDate.now(robotZoneId);

// Convert LocalDate to ZonedDateTime at start of day in robot timezone
LocalDate fromDateLocal = task.getFromDate();  // Now LocalDate
ZonedDateTime endAt;

if (fromDateLocal != null) {
    // Validate: fromDate must not be in the past
    if (fromDateLocal.isBefore(today)) {
        throw new BadRequestException("Cannot delete schedule series from a past date. fromDate must be today or future.");
    }
    endAt = fromDateLocal.atStartOfDay(robotZoneId);  // Start of day in robot TZ
} else {
    endAt = nowInRobotTz;  // Default to NOW
}
```

#### Step 4: Update Integration Tests

**File**: `eve/src/test/java/nl/tinybots/eve/resource/DeleteV4ScheduleResourceIT.java`

```java
// BEFORE
deleteRequest.setFromDate(ZonedDateTime.now(NL).plusDays(7));
// Query param
.queryParam("fromDate", ZonedDateTime.now(NL).plusDays(7).format(DateTimeFormatter.ISO_OFFSET_DATE_TIME))

// AFTER
deleteRequest.setFromDate(LocalDate.now(NL).plusDays(7));
// Query param
.queryParam("fromDate", LocalDate.now(NL).plusDays(7).toString())  // "2026-05-05"
```

**Test cases to update:**

| Test | Change |
|------|--------|
| `softDeleteSeriesFromFutureDate_*` | Use `LocalDate` instead of `ZonedDateTime` |
| `softDeleteSeriesFromPastDate_*` | Use `LocalDate` instead of `ZonedDateTime` |
| `softDeleteWithQueryParam_*` | Format as `YYYY-MM-DD` |
| `softDeleteWithInvalidFromDateFormat_*` | Test with invalid date like `"05-05-2026"` or `"2026/05/05"` |
| `softDeleteBoundary_*` | Use `LocalDate.of(2026, 5, 5)` |

**New test case:**

```java
@Test
public void softDeleteWithISO8601Format_shouldReturn400() {
    // Old format should now fail
    given()
        .contentType(ContentType.JSON)
        .header("X-Time-Zone", "Europe/Amsterdam")
        .queryParam("fromDate", "2026-05-05T00:00:00+02:00")  // Old ISO8601 format
        .body("{\"id\": " + scheduleId + "}")
        .delete("/v4/schedules/" + robotId)
    .then()
        .statusCode(400)
        .body("message", containsString("Invalid fromDate format"));
}

@Test
public void softDeleteWithToday_shouldSucceed() {
    // Today should be allowed
    given()
        .contentType(ContentType.JSON)
        .header("X-Time-Zone", "Europe/Amsterdam")
        .queryParam("fromDate", LocalDate.now(ZoneId.of("Europe/Amsterdam")).toString())
        .body("{\"id\": " + scheduleId + "}")
        .delete("/v4/schedules/" + robotId)
    .then()
        .statusCode(204);
}

@Test
public void softDeleteOnDstSpringForwardDate_shouldSucceed() {
    // DST "spring forward" gap - March 30, 2025 in Europe/Amsterdam
    // 02:00 → 03:00 (gap), atStartOfDay still works (00:00 exists)
    given()
        .contentType(ContentType.JSON)
        .header("X-Time-Zone", "Europe/Amsterdam")
        .queryParam("fromDate", "2025-03-30")  // DST transition day
        .body("{\"id\": " + scheduleId + "}")
        .delete("/v4/schedules/" + robotId)
    .then()
        .statusCode(204);  // Should succeed, 00:00 is valid
}

@Test
public void softDeleteOnDstFallBackDate_shouldSucceed() {
    // DST "fall back" overlap - October 26, 2025 in Europe/Amsterdam
    // 03:00 → 02:00 (overlap), atStartOfDay still works (00:00 is unambiguous)
    given()
        .contentType(ContentType.JSON)
        .header("X-Time-Zone", "Europe/Amsterdam")
        .queryParam("fromDate", "2025-10-26")  // DST transition day
        .body("{\"id\": " + scheduleId + "}")
        .delete("/v4/schedules/" + robotId)
    .then()
        .statusCode(204);  // Should succeed, 00:00 is unambiguous
}
```

#### Step 5: Update API Documentation

**File**: `docs/eve.yaml` (OpenAPI spec)

```yaml
# BEFORE
- name: fromDate
  in: query
  description: |
    ISO8601 datetime with offset. Soft delete series from this date onwards.
  schema:
    type: string
    format: date-time
  example: "2026-05-05T00:00:00+02:00"

# AFTER
- name: fromDate
  in: query
  description: |
    Date in YYYY-MM-DD format. Soft delete series from start of this date
    onwards (interpreted as start-of-day in robot's configured timezone).
    
    **Precedence**: If provided in both query param and body, query param wins.
    **Validation**: Must be today or future (in robot timezone). If not provided, defaults to NOW.
    **Error**: Returns 400 with message "Invalid fromDate format. Expected YYYY-MM-DD (e.g., 2026-05-05)"
  schema:
    type: string
    format: date
    pattern: "^\\d{4}-\\d{2}-\\d{2}$"
  example: "2026-05-05"
```

### Phase 4: Testing Checklist

- [ ] Unit test: `LocalDate` parsing in resource layer
- [ ] Unit test: Validation rejects past dates (LocalDate comparison)
- [ ] Unit test: `LocalDate.atStartOfDay(robotTz)` conversion
- [ ] Integration test: Query param with `YYYY-MM-DD` format
- [ ] Integration test: Body with `YYYY-MM-DD` format  
- [ ] Integration test: Query param precedence over body (when both provided)
- [ ] Integration test: Invalid format returns 400 (old ISO8601 format, `DD-MM-YYYY`, etc.)
- [ ] Integration test: `fromDate = today` succeeds
- [ ] Integration test: `fromDate = yesterday` fails with 400
- [ ] Integration test: Boundary semantics unchanged (start of day exclusive)
- [ ] Integration test: DST spring forward (2025-03-30 Europe/Amsterdam)
- [ ] Integration test: DST fall back (2025-10-26 Europe/Amsterdam)
- [ ] Integration test: `fromDate = null` defaults to NOW (existing semantics)
- [ ] Manual test: Coordinate with frontend team

## 📊 Summary of Results

> *To be completed after implementation*

### ✅ Completed Achievements

- [ ] `fromDate` accepts `YYYY-MM-DD` format
- [ ] Server handles timezone conversion using `X-Time-Zone` header
- [ ] All integration tests passing
- [ ] Frontend updated and working

## 🚧 Outstanding Issues & Follow-up

### ⚠️ Pre-Implementation Checklist

1. **[ ] Coordinate with Frontend Team**
   - Confirm no client is currently using ISO8601 format
   - Agree on release timing

2. **[ ] API Versioning Decision**
   - Option A: Breaking change in `/v4/schedules` (simpler, if no clients using yet)
   - Option B: Add `/v5/schedules` with new format (safer, backward compatible)
   - **Recommendation**: Option A nếu feature chưa release to production

### 📝 API Contract Summary

**Before:**
```bash
DELETE /v4/schedules/{robotId}?fromDate=2026-05-05T00:00:00%2B02:00
```

**After:**
```bash
DELETE /v4/schedules/{robotId}?fromDate=2026-05-05
```
