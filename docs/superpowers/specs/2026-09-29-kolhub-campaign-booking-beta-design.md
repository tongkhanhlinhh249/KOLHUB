# KOL Hub — Quản lý chiến dịch, Booking KOL & Sàn chiến dịch (beta)

| Trường | Giá trị |
|---|---|
| Phạm vi | Đợt 1: chỉ tầng dịch vụ (mock), chưa có UI |
| Ngày | 29/09/2026 |
| Mã nguồn | `src/app/services/campaign-types.ts`, `mock/campaign.ts`, `mock/booking.ts`, `mock/plans.ts`, `mock/campaignRules.ts`, `mock/campaignSeed.ts` |
| DB | `DB_VERSION` 9: thêm `campaigns`, `bookings`, `brandPlans` |

## 1. Mục tiêu & quyết định sản phẩm

- Nhãn hàng/Agency tạo chiến dịch, mời KOL (từ tìm kiếm / danh sách đã lưu) hoặc đăng lên **Sàn chiến dịch** để KOL/MCN ứng tuyển.
- Đối tác chính là **MCN** (đa số KOL do MCN quản lý). KOL độc lập dùng cùng luồng cho chính mình.
- **Không ký quỹ**: thanh toán chỉ ghi nhận (Nhãn hàng bấm "Đã thanh toán", nhà cung cấp bấm "Đã nhận").
- Vận hành đơn giản: không giới hạn số lần sửa nội dung, không hợp đồng điện tử (chỉ đính kèm metadata tệp hợp đồng tuỳ chọn), không tự động thuế, đánh giá lưu nội bộ.
- Nhãn hàng xem **hồ sơ công khai đầy đủ** của từng KOL trong đề xuất MCN trước khi chốt (phép chiếu `publicKolOf`, BR-58).
- Gói: "Dùng thử" (mặc định, Miễn phí), "Tiêu chuẩn", "Doanh nghiệp" (giá "Sẽ công bố"). Chỉ là danh mục + gói hiện tại, chưa giới hạn tính năng.

## 2. Danh tính & quyền

- Mọi hàm lấy người thao tác từ phiên đăng nhập (`state.sessionAccountId`), **không nhận accountId từ UI** (trừ `planService.getCurrentPlan(accountId?)`).
- Hàm Nhãn hàng: tài khoản BIZ (`currentBizAccount`, lỗi **4016**).
- Hàm nhà cung cấp: MCN hồ sơ APPROVED, hoặc KOL hồ sơ APPROVED có KOL ID (`currentSupplier`, lỗi **4806**).
- Hàm booking dùng chung cho hai bên: phiên BIZ là chủ booking → bên `BRAND`; nhà cung cấp là chủ booking → `SUPPLIER`; còn lại **4804** (không lộ việc booking tồn tại).
- Mỗi thao tác kiểm tra `allowedActions(booking, trạng thái hiệu lực, bên)` — cùng danh sách trả về trong `BookingView.allowedActions` cho UI; sai → **4805**.

## 3. Chiến dịch

`DRAFT → OPEN → RUNNING → COMPLETED`, và `DRAFT | OPEN | RUNNING → CANCELLED`.

- **Tạo**: chỉ bắt buộc `name`. Các trường khác kiểm tra kiểu (4803 + `meta.field`).
- **OPEN** khi `publish` hoặc khi gửi lời mời đầu tiên từ DRAFT. Điều kiện đủ: tên, `budget` > 0, `startDate ≤ endDate`, `endDate` chưa qua, ≥ 1 nền tảng, ≥ 1 hạng mục (nền tảng hạng mục ∈ nền tảng chiến dịch), `applyDeadline` (nếu có) ≤ `endDate` và chưa qua. Sửa khi OPEN phải giữ đủ các điều kiện này.
- **Sửa** chỉ khi DRAFT/OPEN (4802).
- **RUNNING** tự động khi booking đầu tiên được chốt (ACCEPTED).
- **COMPLETED chỉ khi Nhãn hàng bấm kết thúc** (`close`, từ OPEN/RUNNING) — không tự động, để Nhãn hàng còn mời thêm. `close`/`cancel` bị chặn (**4817**) khi còn booking ACCEPTED…VERIFIED; booking chưa chốt (SENT/APPLIED/NEGOTIATING) bị hệ thống huỷ kèm ghi chú.
- **Hiển thị trên Sàn**: `visibility = MARKETPLACE`, trạng thái OPEN **hoặc RUNNING**, `endDate` và `applyDeadline` (cuối ngày) chưa qua. RUNNING vẫn nhận đề xuất để chiến dịch không biến mất sau lần chốt đầu tiên.

## 4. Quy tắc định tuyến lời mời

`campaignService.inviteKols(campaignId, kolIds, { price?, note?, deliverable? })`, với mỗi KOL ID:

1. Không có hồ sơ công khai (`publicKolOf` null) → bỏ qua `NOT_FOUND`.
2. KOL đã có booking **đang chiếm chỗ** trong chiến dịch (khác DECLINED/CANCELLED/EXPIRED) → bỏ qua `ALREADY_INVITED`.
3. KOL đang giữ ≥ 1 kênh của **MCN đã duyệt** (`Channel.assignedKolAccountId`) → booking gửi **MCN** đó (nếu nhiều MCN: MCN có lần gán gần nhất). Ngược lại → booking gửi **chính KOL** (`supplierType: 'KOL'`).
4. Gom nhóm: nếu chiến dịch đã có booking INVITE của cùng nhà cung cấp đang **SENT** → thêm hạng mục vào booking đó (`ITEMS_ADDED`); nếu booking đã sang thương lượng/chốt → tạo booking mới. Vì vậy một chiến dịch có thể có nhiều booking với cùng MCN (theo từng đợt mời).
5. Hạng mục: loại/nền tảng/số lượng lấy từ `deliverable` hoặc hạng mục đầu tiên của chiến dịch. Kênh tự chọn: kênh hợp lệ (đã xác thực, đang hoạt động, còn hạn) cùng nền tảng; không có thì kênh hợp lệ khác thuộc nền tảng chiến dịch; không có nữa thì để trống — nhà cung cấp chọn bằng `assignItems` trước khi chốt.
6. Giá: `price` là giá **mỗi KOL**; booking = tổng. Không truyền giá → `price = 0` ("chờ báo giá"), nhà cung cấp phải báo giá (counter) trước khi chốt. Gộp một KOL không giá vào booking có giá → cả booking về 0.

## 5. Booking — máy trạng thái

```
INVITE:      SENT(chờ NCC) ─NCC chốt────────────────────────────┐
             SENT ─NCC báo giá→ NEGOTIATING(chờ NB) ⇄ báo giá ─bên được chờ chốt→ ACCEPTED
APPLICATION: APPLIED(chờ NB) ─NB chốt→ ACCEPTED · ─NB báo giá→ NEGOTIATING(chờ NCC)

ACCEPTED | IN_PRODUCTION ─NCC nộp nháp→ CONTENT_REVIEW
CONTENT_REVIEW ─NB duyệt/yêu cầu sửa; khi hết nháp chờ:
    mọi hạng mục có nháp đã duyệt → CONTENT_APPROVED, ngược lại → IN_PRODUCTION (không giới hạn vòng)
CONTENT_APPROVED | PUBLISHED ─NCC nộp link bài đăng→ (hệ thống xác minh ngay)
    mọi hạng mục có bài đã xác minh → VERIFIED, ngược lại → PUBLISHED
VERIFIED ─NB "Đã thanh toán"→ VERIFIED(đã ghi nhận) ─NCC "Đã nhận"→ COMPLETED
```

- `awaiting` cho biết bên phải trả lời trước khi chốt. **Bên được chờ**: `ACCEPT`, `COUNTER`, `DECLINE` (+ `ASSIGN_ITEMS` nếu là NCC). **Bên kia**: `CANCEL` (Nhãn hàng rút lời mời / NCC rút đề xuất).
- Chốt cần `price > 0` (4810) và mọi hạng mục có kênh (4809).
- **ACCEPTED = được bắt đầu sản xuất**; `IN_PRODUCTION` chỉ xuất hiện sau khi Nhãn hàng yêu cầu sửa (hoặc duyệt một phần hạng mục).
- **Huỷ sau khi chốt**: hai bên, bắt buộc lý do (4816), cho đến khi Nhãn hàng đã bấm "Đã thanh toán".
- **Hết hạn** (tính khi đọc, không ghi DB): SENT/APPLIED sau `createdAt + 7 ngày` hoặc cuối ngày `applyDeadline`, mốc nào đến trước → `EXPIRED`. `BookingView.expiresAt` cho UI đếm ngược. NEGOTIATING không hết hạn.
- **Một đề xuất/lời mời đang hoạt động cho mỗi NCC trên mỗi chiến dịch** (4807): mọi booking khác DECLINED/CANCELLED/EXPIRED đều chiếm chỗ (kể cả COMPLETED).
- **Nháp**: tiêu đề + tệp (metadata `StoredFile`) và/hoặc link xem trước; tệp được quét bằng `scanVideoFile` của KOL Safety → `safety { verdict, score, issues }`. Không chặn nháp VIOLATION — Nhãn hàng quyết định. `REQUEST_CHANGES` bắt buộc góp ý.
- **Bài đăng (xác minh mock)**: host của link phải thuộc nền tảng hạng mục (TikTok: tiktok.com, vt./vm.tiktok.com; YouTube: youtube.com, youtu.be; Facebook: facebook.com, fb.com, fb.watch) và có đường dẫn — sai → 4811. Số liệu `views/likes/comments/shares/engagementRate` sinh xác định theo link (`safetyHash`) và số người theo dõi của kênh.
- **Đánh giá** (1–5 sao, mỗi bên một lần sau COMPLETED): lưu `ratings.brand` (Nhãn hàng chấm NCC) và `ratings.supplier`; view chỉ trả `myRating` — **không bên nào thấy đánh giá của bên kia**.
- **Hợp đồng**: `setContractFile(id, file | null)`, hai bên, PDF/JPG/PNG/DOCX ≤ 10 MB, khi booking chưa kết thúc.
- `history` ghi mọi bước `{ at, by: BRAND | SUPPLIER | SYSTEM, action, price?, note? }`.

## 6. Sàn chiến dịch (phía NCC)

- `listMarketplace({ keyword, category, platform, budgetMin, budgetMax, sort })` — từ khoá không dấu trên tên/mục tiêu/brief/tên công ty; sort `newest` (mặc định, `publishedAt` giảm dần) · `budget` (giảm dần) · `deadline` (hạn gần nhất trước, không hạn ở cuối).
- `MarketplaceCampaign` không chứa `brandAccountId`/thống kê nội bộ; có `applicationCount` và `myBooking` (booking đang chiếm chỗ của người xem).
- `apply(campaignId, { items, price, note })`: MCN chọn KOL mình đang quản lý + **kênh MCN đã gán cho KOL đó**; KOL độc lập chọn kênh của mình. Kênh phải xác thực, đang hoạt động, còn hạn, thuộc nền tảng chiến dịch (4809).

## 7. API (tóm tắt)

```ts
campaignService.listMine(filters?: CampaignFilters): Promise<CampaignView[]>
campaignService.get(id): Promise<CampaignView>
campaignService.create(input: CampaignInput): Promise<CampaignView>
campaignService.update(id, patch: CampaignPatch): Promise<CampaignView>
campaignService.publish(id) / close(id) / cancel(id): Promise<CampaignView>
campaignService.inviteKols(campaignId, kolIds: string[], opts?: InviteOptions): Promise<InviteResult>
campaignService.listMarketplace(filters?: MarketplaceFilters): Promise<MarketplaceCampaign[]>
campaignService.getMarketplaceItem(id): Promise<MarketplaceCampaign>
campaignService.apply(campaignId, proposal: ApplyInput): Promise<BookingView>

bookingService.listForBrand(filters?: BrandBookingFilters): Promise<BookingView[]>
bookingService.listForSupplier(filters?: SupplierBookingFilters): Promise<BookingView[]>
bookingService.get(id): Promise<BookingView>
bookingService.counter(id, price, note?) / accept(id) / decline(id, note?) / cancel(id, note?)
bookingService.assignItems(id, items: ProposalItemInput[])
bookingService.submitDraft(id, DraftInput) / reviewContent(id, contentId, 'APPROVE' | 'REQUEST_CHANGES', feedback?)
bookingService.submitPost(id, PostInput) / markPaid(id) / confirmPaid(id) / rate(id, stars, comment?)
bookingService.setContractFile(id, file | null)
bookingService.brandCounts(): Promise<BrandBookingCounts>      // newApplications, awaitingBrand, pendingReviews, toPay
bookingService.supplierCounts(): Promise<SupplierBookingCounts> // newInvites, awaitingSupplier, toDeliver, toConfirmPayment, openMarketplace

planService.listPlans(): PlanInfo[]
planService.getCurrentPlan(accountId?): Promise<CurrentPlan>    // mặc định TRIAL
```

Mọi mutation trả view mới (đã tính trạng thái hiệu lực, `allowedActions`, `campaign`, `supplier`, `items[].kol`, `items[].channel`). Nhãn trạng thái: `CAMPAIGN_STATUS_LABEL`, `BOOKING_STATUS_LABEL`, `CONTENT_STATUS_LABEL`, `DELIVERABLE_TYPES`, `MARKETPLACE_SORTS`.

## 8. Mã lỗi mới (48xx)

| Mã | Ý nghĩa |
|---|---|
| 4801 | Không tìm thấy chiến dịch (hoặc không thuộc về / không hiển thị với người xem) |
| 4802 | Chiến dịch không ở trạng thái cho phép |
| 4803 | Trường không hợp lệ (`meta.field`: name, budget, dates, platforms, deliverables, applyDeadline, note, title, file, item, feedback, comment, contractFile…) |
| 4804 | Không tìm thấy booking / không phải bên của booking |
| 4805 | Booking không ở trạng thái cho phép thao tác (theo `allowedActions`) |
| 4806 | Chỉ dành cho KOL/MCN hồ sơ đã duyệt |
| 4807 | Đã có đề xuất/lời mời đang hoạt động cho chiến dịch |
| 4808 | Hết hạn nhận đề xuất |
| 4809 | KOL/kênh không hợp lệ (không thuộc quản lý, sai nền tảng, chưa xác thực) hoặc hạng mục chưa có kênh khi chốt |
| 4810 | Giá phải > 0 |
| 4811 | Link bài đăng không hợp lệ / sai nền tảng |
| 4812 | Chưa chọn KOL / hạng mục |
| 4813 | Không tìm thấy nội dung (hoặc đã duyệt) |
| 4814 | Số sao 1–5 |
| 4815 | Đã đánh giá |
| 4816 | Huỷ sau khi chốt cần lý do |
| 4817 | Còn booking đang thực hiện, chưa thể kết thúc/huỷ chiến dịch |

## 9. Dữ liệu mẫu (seed v9)

- **brand@vinamilk-demo.vn** (Công ty Demo Sữa):
  - "Ra mắt sữa hạt vị mới" — RUNNING, riêng tư. Booking với Sao Việt Media: `bk-seed-review` CONTENT_REVIEW (KOL-2026-0012, nháp 1 bị yêu cầu sửa — VIOLATION, nháp 2 chờ duyệt — GRAY), `bk-seed-verified` VERIFIED có số liệu, chờ thanh toán (KOL-2026-0013), `bk-seed-completed` COMPLETED có hợp đồng + đánh giá (KOL-2026-0011). Lời mời SENT trực tiếp tới Khánh Vy `bk-seed-khanhvy`.
  - "Tuần lễ ẩm thực mùa thu" — OPEN trên Sàn, đề xuất APPLIED của Sao Việt `bk-seed-application` (KOL-2026-0014 YouTube + KOL-2026-0011 TikTok).
  - "Tri ân khách hàng cuối năm" — DRAFT.
- **agency@newbrand-demo.vn**: 3 chiến dịch OPEN trên Sàn — thời trang thu đông (TikTok/Facebook, 120 tr, hạn 5 ngày), ứng dụng học tiếng Anh (YouTube, 80 tr, hạn 14 ngày), du lịch miền Trung (YouTube/Facebook, 200 tr, không hạn).
- `brandPlans` rỗng → mọi Nhãn hàng ở gói Dùng thử. Id cố định xuất ở `SEED_CAMPAIGN`, `SEED_BOOKING`.

## 10. Ngoài phạm vi beta

Ký quỹ/cổng thanh toán, hợp đồng điện tử, thuế, giới hạn theo gói, thông báo realtime, đồng bộ số liệu bài đăng định kỳ, hiển thị công khai đánh giá.
