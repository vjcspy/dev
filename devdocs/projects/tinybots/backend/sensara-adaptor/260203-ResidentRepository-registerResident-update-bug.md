# 📌 Issue Note: `ResidentRepository.registerResident()` có thể không update mapping mong muốn

**Repo:** `projects/tinybots/backend/sensara-adaptor`  
**Branch liên quan:** `feature/PROD-437-sensara-endpoints` (so với `develop`)  
**Ngày ghi nhận:** 2026-02-03  

## TL;DR

Trong `ResidentRepository.registerResident()`, khi đã tìm thấy bản ghi mapping theo `robot_id` (không phải theo `resident_id`), code hiện tại vẫn thực hiện `UPDATE ... WHERE resident_id = <residentId mới>`. Điều này có thể:

- **Không update bản ghi nào** (silent fail) → mapping resident↔robot bị giữ nguyên (stale), nhưng `hearableLocations` vẫn bị cập nhật theo request.
- **Update nhầm bản ghi khác** nếu DB tình cờ đã có row `resident_id = <residentId mới>` ở nơi khác.

## Vị trí code liên quan

- `projects/tinybots/backend/sensara-adaptor/src/repository/ResidentRepository.ts`
  - `GET_REGISTER_USER_BY_ROBOT_OR_RESIDENT`
  - `UPDATE_REGISTER_USER`
  - method `registerResident(registration: ResidentRegistrationDto)`

## Flow hiện tại (end-to-end)

1) API `PUT /v1/sensara/residents` nhận body `ResidentRegistrationDto` (chứa `residentId`, `robotId`, `hearableLocations`).
2) Controller gọi `ResidentService.putResident()`.
3) Service gọi `ResidentRepository.registerResident()`.
4) Repository bắt đầu transaction và:
   - **SELECT** theo điều kiện `robot_id=? OR resident_id=?` để tìm row mapping hiện có.
   - Nếu **không có** row → `INSERT`.
   - Nếu **có** row → `UPDATE`.
   - Sau đó `DELETE` + `INSERT` lại `tessa_hearable_location` theo `robotId`.

## Vì sao lỗi xảy ra (case cụ thể)

### DB ban đầu

Bảng `sensara_resident_robot` đang có:

| id | resident_id      | robot_id |
|----|-------------------|---------|
| 5  | `resident-old`    | 10      |

### Request mới

Client gọi:

```json
{
  "residentId": "resident-new",
  "robotId": 10,
  "hearableLocations": ["KITCHEN"]
}
```

### Chạy SELECT

Query `WHERE robot_id=? OR resident_id=?` sẽ tìm thấy row `id=5` vì `robot_id=10` khớp (dù `resident_id` đang là `resident-old`).

### Chạy UPDATE (điểm lỗi)

Query update hiện tại về bản chất là:

```sql
UPDATE sensara_resident_robot
SET resident_id = 'resident-new', robot_id = 10, is_active = 1
WHERE resident_id = 'resident-new';
```

Nhưng trong DB **không có** row nào `resident_id='resident-new'` (row đang là `resident-old`), nên:

- `affectedRows = 0`
- Transaction vẫn commit (vì code không check)
- Mapping vẫn là `resident-old ↔ robot 10`

Trong khi đó, `hearableLocations` vẫn được xóa và insert lại cho `robot_id=10`.

## Impact

- API trả 200 nhưng mapping resident↔robot **không đổi** (stale).
- `hearableLocations` có thể đã đổi theo request, khiến dữ liệu **mất nhất quán**.
- Khó debug vì không có lỗi rõ ràng (silent fail).

## Root cause

Logic “tìm row” và “update row” dùng **khóa khác nhau**:

- Find: `robot_id OR resident_id` (có thể match theo `robot_id`)
- Update: `WHERE resident_id = <residentId mới>` (không đảm bảo match đúng row đã tìm thấy)

## Fix đề xuất (an toàn)

### Option A (khuyến nghị): Update theo `id` của row đã tìm thấy

- Khi SELECT ra `entry`, lấy `entry.id` và update:
  - `UPDATE sensara_resident_robot SET ... WHERE id=?`

Ưu điểm:
- Update đúng row 100% (khóa ổn định nhất).

### Option B: Update theo `resident_id` hiện tại của row đã tìm thấy

- Dùng `WHERE resident_id = entry.residentId` (residentId cũ), không dùng residentId mới.

Ưu điểm:
- Ít thay đổi SQL hơn.

### Thêm guard để tránh silent fail

Sau UPDATE, check `affectedRows`:
- Nếu `affectedRows === 0` → throw error / rollback (để biết chắc có vấn đề dữ liệu/logic).

## Checklist verify sau khi sửa

1) Case “robotId đã tồn tại với residentId cũ”:
   - Gọi `PUT /v1/sensara/residents` với residentId mới + robotId cũ
   - Expect: mapping đổi sang residentId mới
2) Case “residentId đã tồn tại”:
   - Update mapping residentId cũ sang robotId khác (nếu business cho phép)
3) Confirm `hearableLocations` vẫn đúng và không bị orphan/mismatch.
4) Run:
   - `yarn build`
   - `yarn lint`
   - (nếu môi trường devtools ổn) `just -f devtools/tinybots/local/Justfile test-sensara-adaptor`

## Note về test runner (Devtools)

Hiện tại chạy `just -f devtools/tinybots/local/Justfile test-sensara-adaptor` có thể fail nếu docker-compose mount sai path vào container (container báo không tìm thấy `/usr/src/app/package.json`). Nếu gặp lại, cần kiểm tra `devtools/tinybots/local/docker-compose.yaml` service `sensara-adaptor` và path volumes.

