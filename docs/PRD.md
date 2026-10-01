# PRD — Hệ thống Vận chuyển Ngựa đua (EquineZ Logistics)

> Tài liệu nghiệp vụ gốc. Code phải khớp tài liệu này; chỗ nào lệch thì ghi vào mục 11.
> Nhóm đã chốt tài liệu nghiệp vụ mới (Google Doc "swp_tl", bỏ thẻ 1–6) ngày 27/09/2026. PRD đang được cập nhật dần theo tài liệu đó, từng phía một; phần chưa cập nhật vẫn ghi theo quy tắc cũ.
> Cập nhật lần cuối: 27/09/2026.

## 1. Phạm vi

- **Tự vận hành toàn bộ, không thuê ngoài, không hợp tác nhà xe khác.** Công ty có xe, tài xế, nhân viên chăm sóc (hộ tống) và trạm trung chuyển riêng. Mọi chi phí chuyến đi (nhiên liệu, lương, khấu hao, vận hành trạm) đều là chi phí nội bộ.
- **Chỉ vận chuyển đường bộ** bằng xe tải chuyên dụng chở ngựa.
- **Không làm hàng không, không đường biển.** Mọi nội dung về máy bay, sân bay, Air Cargo, IATA là dữ liệu cũ, cần xóa.
- **3 nước:** Việt Nam (VN), Campuchia (KH), Lào (LA).
- **Trong nước (nội địa)** = đi và đến đều trong VN. **Quốc tế (xuyên biên giới)** = từ VN sang KH hoặc LA, hoặc từ KH hoặc LA về VN, qua một cửa khẩu. Không nhận tuyến trong KH, trong LA, hay giữa KH và LA.

### Cửa khẩu đang dùng

| Tuyến | Cửa khẩu (phía VN – phía bạn) |
|---|---|
| VN ↔ KH | Mộc Bài (Tây Ninh) – Bavet (Svay Rieng) |
| VN ↔ KH | Tịnh Biên – Phnom Den |
| VN ↔ LA | Tây Trang – Sop Hun |
| VN ↔ LA | Cầu Treo – Nam Phao |
| VN ↔ LA | Lao Bảo – Densavanh |

Nguồn: `GATES` trong `src/shared/config/network.ts`. Trang tra cước (trang chủ) tự chọn cửa khẩu cho quãng đường ngắn nhất để báo giá tham khảo. **Khi đặt đơn quốc tế, khách bắt buộc chọn cửa khẩu**; cửa khẩu khóa theo đơn, không đổi được, và Tờ khai hải quan, Giấy chứng nhận kiểm dịch phải ghi đúng cửa khẩu đó (ghi sai thì giấy bị trả về để khách xin lại).

### Trạm trung chuyển (trạm của công ty, dùng để nghỉ đêm trên tuyến dài)

Vinh (Nghệ An), Quy Nhơn (Bình Định), Tuy Hòa (Phú Yên), Điện Biên. Danh mục: `STATIONS` trong `src/shared/config/network.ts` (Điều phối chọn khi thêm điểm dừng giữa chặng).

### Điểm đi / điểm đến (`src/shared/config/network.ts` → `COUNTRY_LOCATIONS`)

- VN: Kho Đồng Nai (Long Thành), Kho Long An (Đức Hòa), Kho Bình Dương, CLB Cưỡi ngựa Sài Gòn
- KH: Kho Phnom Penh, Kho Siem Reap, CLB Cưỡi ngựa Hoàng gia Phnom Penh
- LA: Kho Viêng Chăn, CLB Mã cầu & Cưỡi ngựa Viêng Chăn

## 2. Vai trò

| Vai trò | Thư mục code (`src/apps/`) | URL | Việc chính |
|---|---|---|---|
| Khách hàng | `customer/` | `/` | Khai Hồ sơ ngựa, đặt đơn, nộp giấy tờ, chọn phương án, thanh toán, theo dõi, nghiệm thu |
| Manager | `backoffice/features/manager/` | `/backoffice/manager` | Xử lý việc Kiểm dịch chuyển lên, duyệt đơn, **người duy nhất được từ chối đơn**, duyệt sự cố & chi phí, điều chuyển nhân sự, theo dõi đơn vận chuyển |
| Kiểm dịch viên | `backoffice/features/specialist/` | `/backoffice/specialist` | Xác minh giấy tờ, làm thủ tục với cơ quan chức năng, bàn giao giấy cho Điều phối |
| Điều phối viên | `backoffice/features/coordinator/` | `/backoffice/coordinator` | Khảo sát khả thi, lập lộ trình, chọn xe, giám sát chuyến, xử lý sự cố |
| Tài xế | `backoffice/features/driver/` | `/backoffice/driver` | Chạy xe theo mốc, xác nhận từng mốc |
| Hộ tống | `backoffice/features/escort/` | `/backoffice/escort` | Chăm sóc ngựa dọc đường, ghi báo cáo sức khỏe |

Đăng nhập nội bộ: `/backoffice/login` → chuyển trang theo vai trò (email chứa từ khóa vai trò, xem `LOGIN_KEYWORDS` trong `src/shared/services/mock/staff.ts`). Danh sách mọi trang: `/sitemap`.

## 3. Luồng chính

D = ngày khởi hành. "Ngày làm việc" = T2–T6, 08:00–17:00, trừ ngày lễ (`HOLIDAYS`).

1. **Khách đặt đơn** qua 4 bước: loại chuyến & tuyến → chọn ngựa → dịch vụ & bảo hiểm → xác nhận. Ngày khởi hành phải cách ngày đặt ít nhất **10 ngày** (`MIN_LEAD_DAYS`). Chỗ xe được giữ tạm ngay khi đặt.
   - **Hồ sơ ngựa** (trang Hồ sơ ngựa): khách khai ngựa một lần: tên, microchip (mã định danh, không sửa được), giống, giới tính (Đực / Cái / Thiến), màu lông, năm sinh, bản scan hộ chiếu ngựa và sổ tiêm phòng. Ngựa thiếu hộ chiếu hoặc sổ tiêm thì chưa chọn được khi đặt đơn.
   - Bước 1: khách chọn **Trong nước** hoặc **Quốc tế** trước. Trong nước: chọn điểm đón, điểm giao trong VN. Quốc tế: chọn nước bạn (KH / LA), chiều đi, điểm đón, điểm giao và **cửa khẩu** (bắt buộc, có cảnh báo đỏ, xem mục 1).
   - Bước 2: tick ngựa từ Hồ sơ ngựa (tối đa `MAX_HORSES` ngựa/đơn); hộ chiếu và sổ tiêm tự gắn vào đơn. Không tải giấy ở bước này.
   - Bước 3: dịch vụ chăm sóc và **bảo hiểm** (xem mục 7).
   - Bước 4: nhắc khách công ty chỉ vận chuyển, khách tự xin giấy kiểm dịch (và tờ khai hải quan nếu quốc tế).
2. **Hệ thống tự phân công** ngay khi khách gửi đơn: giao Kiểm dịch viên và Điều phối viên đang ít đơn nhất, không đang nghỉ (không còn bước Manager tiếp nhận). Nếu một vai trò không còn ai đang làm việc, đơn chờ ở tab "Cần xử lý" trang Phê duyệt đơn hàng và tự giao khi có người đi làm lại. Manager có thể từ chối sớm dựa trên thông tin khách khai (trùng đơn, không phải ngựa đua, khai mâu thuẫn) ở tab "Đang thẩm định" / "Cần xử lý" trang Phê duyệt đơn hàng.
3. **Kiểm dịch viên xác minh giấy tờ** (trang Hồ sơ được giao), làm tay từng giấy. Có 3 kết luận:
   - Hợp lệ (mọi giấy của mọi ngựa đều đạt) → chuyển Điều phối.
   - Yêu cầu khách bổ sung (lỗi sửa được) → đồng hồ hạn xử lý tạm dừng trong lúc chờ khách.
   - Báo cáo vấn đề không khắc phục được → chuyển Manager (xem mục 5).
4. **Điều phối viên khảo sát và lập lộ trình** (trang Đánh giá khả thi → Lập lộ trình): chia chặng, chọn xe cho từng chặng. Tài xế đi theo xe (mỗi xe một tài xế cố định). Hộ tống được tự gán cho người đang phụ trách ít chặng nhất; có thể đổi tay ở trang Phân công.
   - Khảo sát không khả thi (bắt buộc ghi lý do) → đơn trả về Manager ở trang Phê duyệt; Manager từ chối đơn.
   - Chốt lộ trình khi mọi chặng đã có xe → đơn chuyển Manager duyệt, kèm xe / tài xế / hộ tống.
5. **Manager duyệt đơn** (trang Phê duyệt đơn hàng) → khách nhận yêu cầu thanh toán.
6. **Khách thanh toán 100%** trước hạn (xem mục 4). Quá hạn thì đơn tự hủy và chỗ xe được nhả.
7. **Chuẩn bị giấy tờ** (trang Chuẩn bị giấy tờ chuyến đi):
   - Khách gửi **bản gốc** giấy tờ trước 17:00 D−3.
   - Kiểm dịch viên xin giấy của cơ quan chức năng (làm ngoài hệ thống), sau đó nhập số giấy, cơ quan cấp, hiệu lực và bản scan.
   - Kiểm dịch viên bàn giao cho Điều phối trước 12:00 D−2. Giấy có thời hạn phải còn hiệu lực đến hết ngày giao dự kiến.
8. **Vận chuyển:**
   - Điều phối xác nhận khởi hành (trang Phân công) khi mọi chặng đủ xe, tài xế, hộ tống và khách đã thanh toán. Khách thấy hành trình ngay. Mốc đầu (nhận ngựa) chờ tài xế làm checklist tại điểm đón.
   - **Checklist nhận ngựa** (tài xế, tại điểm đón): tick đã nhận bản gốc và chụp ảnh từng giấy (hộ chiếu ngựa, Giấy chứng nhận kiểm dịch, Tờ khai hải quan nếu quốc tế, Giấy ủy quyền áp tải có chữ ký khách); chụp ảnh hiện trạng từng ngựa (kèm ghi chú nếu có); khách ký điện tử bàn giao. Lưu checklist xong mới hiện nút **Bắt đầu chuyến**; bấm thì mốc nhận ngựa hoàn thành. Lộ trình (các mốc) do Điều phối lập, tài xế chỉ xác nhận; khách (Chi tiết đơn), Manager (Theo dõi đơn vận chuyển) và Điều phối (Giám sát vận chuyển) cùng xem. Khách thiếu bản gốc: tài xế báo thiếu → hệ thống tạo sự cố cho Điều phối và tính phí chờ **500.000đ/giờ** (block giờ); khách mang giấy tới thì tài xế bấm "Khách đã bổ sung bản gốc" để dừng đồng hồ, rồi làm checklist; chờ tối đa **4 giờ**, quá thì hủy lệnh, khách chịu cước chuyến.
   - Tài xế xác nhận từng mốc. Mốc cuối (giao ngựa) cần **checklist bàn giao**: tick đã trả bản gốc hộ chiếu và giấy kiểm dịch, chụp ảnh ngựa đã xuống xe, người nhận ký điện tử → đơn Đã giao, bắt đầu 24 giờ nghiệm thu. Người nhận vắng / từ chối nhận: tài xế báo giao thất bại (lưu thời điểm làm bằng chứng, tạo sự cố cho Điều phối), chờ tối đa **6 giờ** rồi đưa ngựa về trại ký gửi.
   - **Nút SOS** (tài xế, khi đang chạy chuyến): chọn loại sự cố (ngựa cấp cứu, ngựa không đủ sức khỏe lúc đón, tai nạn, hỏng xe: khẩn cấp; hải quan giữ xe, tắc đường / sạt lở: chỉ làm chậm), mô tả, ảnh → tạo sự cố cho Điều phối.
   - **Khai chi phí** (tài xế): loại phí, số tiền (Kíp / Riel quy đổi về VND theo tỷ giá tham khảo), ảnh biên lai bắt buộc. Xăng dầu, cầu đường, phí cửa khẩu, khác = phí vận hành công ty chịu; phí lưu bãi, phí thú y = phụ phí tính cho khách. Manager duyệt.
   - **1 đơn = 1 xe = 1 hộ tống.** Điều phối giao chuyến → hộ tống thấy ở tab Chuyến (tuyến, ngày đi, ngựa, xe, tài xế) và bấm **Nhận chuyến** để xác nhận. Khi xe chạy, tab Báo cáo ghi cho đúng chuyến đang chạy, không chọn chuyến; chưa nhận chuyến thì chưa ghi được.
   - Hộ tống ghi báo cáo sức khỏe theo thời gian thực (giờ kiểm tra ghi tự động lúc gửi, không tự chọn): thân nhiệt, nhịp tim, tình trạng (Khỏe / Mệt mỏi / Căng thẳng / Bỏ ăn / Thương tích / Nguy kịch / Khác, chọn Khác thì bắt buộc mô tả; `HEALTH_STATUS` trong `src/shared/config/health.ts`), ghi chú, ảnh. Chỉ số sớm nhất và mới nhất dùng làm chỉ số lúc nhận / lúc giao trên biên bản nghiệm thu.
   - Khi tài xế check-in một mốc (điểm đón, trạm dừng, cửa khẩu), trang Hộ tống nhắc ghi báo cáo cho các ngựa chưa ghi từ mốc đó.
   - Hộ tống sửa / xóa được báo cáo của mình trong **15 phút** sau khi gửi (`HEALTH_EDIT_MINUTES`); quá hạn thì khóa vì khách đã xem. Không có xóa hàng loạt.
   - Hộ tống báo tình trạng nặng (Thương tích, Nguy kịch) → hệ thống tự tạo sự cố khẩn cấp "Y tế ngựa" cho Điều phối.
   - Điều phối giám sát ở trang Giám sát vận chuyển.
   - Khi có sự cố, Điều phối ghi nhận ở trang Xử lý sự cố và đề xuất cách xử lý; Manager duyệt ở trang Sự cố & Chi phí.
9. **Nghiệm thu** (trang Nghiệm thu của khách):
   - Khách có **24 giờ** để xác nhận hoặc báo vấn đề. Không phản hồi thì hệ thống tự nghiệm thu, đơn chuyển sang Hoàn thành.
   - Nếu khách báo vấn đề: tạm dừng tự nghiệm thu, Manager liên hệ khách trong **4 giờ**.
10. **Manager theo dõi đơn** (trang Theo dõi đơn vận chuyển): đơn đang ở bước nào, ai phụ trách, nhật ký đơn; từ lúc xe khởi hành, nhật ký chuyển sang nhật ký giao hàng (mốc tài xế xác nhận, báo cáo sức khỏe của hộ tống).

## 4. Thời hạn (SLA)

| Việc | Hạn = mốc SỚM HƠN của | Hằng số |
|---|---|---|
| Thẩm định (cam kết với khách) | 17:00 ngày làm việc thứ 5 sau ngày gửi đơn · 17:00 D−4 | `APPRAISAL_WORKING_DAYS`, `APPRAISAL_CAP_DAYS` |
| Kiểm dịch xác minh | 2 ngày làm việc · D−7 | `SLA_WORKING_DAYS.inspector`, `CAP_DAYS.inspector` |
| Lập lộ trình | 2 ngày làm việc · D−5 | `SLA_WORKING_DAYS.coordinator`, `CAP_DAYS.coordinator` |
| Thanh toán | Lúc duyệt + 48 giờ · 17:00 D−2 | `PAYMENT_HOURS`, `PAYMENT_CAP_DAYS` |
| Khách chọn phương án | 48 giờ | `CHOICE_HOURS` |
| Khách gửi bản gốc giấy tờ | 17:00 D−3 | `ORIGINALS_DUE_DAYS` |
| Bàn giao giấy cho Điều phối | 12:00 D−2 | — |
| Phí chờ khi khách thiếu bản gốc tại điểm đón | 500.000đ/giờ, tối đa 4 giờ | `PICKUP_WAIT_FEE_PER_HOUR`, `PICKUP_MAX_WAIT_HOURS` |
| Chờ người nhận tại điểm giao | Tối đa 6 giờ | `RECEIVER_MAX_WAIT_HOURS` |
| Nghiệm thu | 24 giờ sau khi giao | `ACCEPTANCE_HOURS` |

Nếu mốc theo D rơi vào ngày nghỉ thì lùi về ngày làm việc liền trước.

## 5. Ngoại lệ

- **Hồ sơ có vấn đề không khắc phục được:** Manager gửi các phương án (tab "Cần xử lý" trang Phê duyệt đơn hàng), khách chọn trong 48 giờ.
  - **A.** Bỏ ngựa có vấn đề, báo giá lại (chỉ khi còn ít nhất 1 ngựa không bị ảnh hưởng). Giá mới: **giữ nguyên cước xe** (cước tính theo xe, không theo ngăn); các dòng còn lại (kiểm dịch, chăm sóc, bảo hiểm…) nhân theo tỷ lệ số ngựa còn lại / số ngựa ban đầu, làm tròn đến nghìn đồng. Hệ thống tự tính khi Manager gửi phương án (`requoteWithout` trong `src/shared/lib/pricing.ts`).
  - **B.** Thay ngựa khác
  - **C.** Dời ngày khởi hành (chỉ khi bệnh chữa được)
  - **D.** Kiểm tra lại, tối đa 1 lần, do một kiểm dịch viên KHÁC làm lại từ đầu
  - **E.** Hủy đơn miễn phí (luôn có)
  - Khách không chọn trong 48 giờ → Manager quyết định, có thể từ chối đơn.
- **Công ty trễ hạn thẩm định:** giữ chỗ xe, KHÔNG đổi ngày khởi hành. Đơn chuyển sang "Ưu tiên" và Manager xử lý trực tiếp; hạn mới là 17:00 ngày làm việc kế tiếp. Khách vẫn được hủy miễn phí.
- **Tự động chuyển người** (khi nhân viên trễ hạn hoặc đang nghỉ): chuyển cho người cùng vai trò, chưa từng làm đơn này, ít việc nhất. Nếu không còn ai hoặc đã qua mốc theo D thì Manager xử lý theo thứ tự: gia hạn đặc biệt → đề nghị khách dời ngày → từ chối.
- **Kiểm dịch viên không bao giờ từ chối đơn.** Mọi vấn đề đều báo lên Manager. Đơn bị từ chối phải ghi rõ bị từ chối ở bước nào.

## 6. Giấy tờ

**Khách nộp khi đặt đơn** (cả trong nước và quốc tế): Hộ chiếu ngựa (có microchip) · Sổ tiêm phòng. Lấy từ Hồ sơ ngựa, tự gắn vào đơn. **Không** đòi Giấy chứng nhận kiểm dịch hay Tờ khai hải quan lúc đặt (giấy kiểm dịch chỉ có hiệu lực vài ngày trước khi đi; tờ khai hải quan cần biển số xe, chỉ có sau khi đơn được duyệt).

**Kiểm dịch viên xin sau khi khách thanh toán:**
- Nội địa: Giấy chứng nhận kiểm dịch động vật vận chuyển ra khỏi tỉnh
- Xuyên biên giới: Giấy chứng nhận kiểm dịch xuất/nhập khẩu + Tờ khai hải quan cửa khẩu

## 7. Giá & thanh toán

- **Các dòng trên báo giá:** vận chuyển đường bộ (theo loại xe, số ngăn, km) · kiểm dịch & thủ tục · chăm sóc dọc đường · khoang VIP (tùy chọn) · cách ly (tùy chọn). Không có dòng bảo hiểm.
- **Bảo hiểm: công ty không bán.** Khi đặt đơn, khách bắt buộc chọn một trong hai: (1) đã tự mua bảo hiểm cho ngựa, nhập mã hợp đồng; (2) không mua, tick đồng ý miễn trừ 100% trách nhiệm cho Nhà vận chuyển khi ngựa ốm đau hoặc tử vong do bệnh lý tự nhiên. Không chọn thì không đặt được.
- **Thanh toán 100%** trước chuyến, chuyển khoản Vietcombank. Nghiệm thu không phát sinh thanh toán thêm.
- **Hoàn tiền:**

| Trường hợp | Hoàn |
|---|---|
| Công ty hủy chuyến | 100% |
| Ngựa không đạt kiểm tra sức khỏe tại chỗ ngày lấy ngựa | 100% trừ phí kiểm dịch đã phát sinh |
| Khách hủy ≥ 7 ngày trước D | 90% |
| Khách hủy 3–6 ngày trước D | 50% |
| Khách hủy < 3 ngày trước D | Không hoàn |

- **Giá biến động theo thị trường:** nhiên liệu (lớn nhất), tỷ giá (phí phát sinh ở KH/LA), phí cầu đường BOT, phí bảo hiểm, VAT. Cách xử lý phụ phí nhiên liệu: **chưa chốt**, xem mục 12.

## 8. Trạng thái

**Đơn phía khách** (`src/shared/types/order.ts` → `OrderStatus`): `processing` → (`choose_option` → `rechecking`) → `awaiting_payment` → `paid` → `in_transit` → `delivered` → `completed`. Nhánh kết thúc sớm: `rejected`, `cancelled`.
Khách chỉ thấy 5 bước: Gửi đơn · Chờ thẩm định · Thanh toán · Vận chuyển · Nghiệm thu.

**Chuyến phía Điều hành** (`src/shared/services/trips.ts` → `tripStatus`, suy từ trạng thái đơn): `pending_assessment` → `awaiting_routing` → `assigned` → `in_transit` → `done`. Nếu không khả thi: `rejected_assessment`, trả về Manager.
**Sự cố:** `open` → `proposed` (chờ Manager duyệt).

**Trang Theo dõi đơn vận chuyển của Manager** (`features/manager/tracking/tracking-stages.ts`, chỉ hiển thị, suy từ trạng thái đơn): 8 bước Chờ phê duyệt → Chờ thanh toán → Chờ giấy tờ → Đang thẩm định → Sẵn sàng xuất bến → Đang vận chuyển → Đã giao · chờ quyết toán → Hoàn thành. Thứ tự theo bản thiết kế của nhóm, khác thứ tự xử lý thật ở mục 3 (thẩm định diễn ra trước duyệt và thanh toán). Ngoại lệ: Tạm dừng (chờ khách chọn phương án hoặc chờ Manager), Đã hủy / từ chối.

## 9. Mã định danh

`EQ-YYYY-NNNN` đơn hàng · `TR-xxxx` chuyến (nội bộ OPS, nối sang đơn qua `orderId`) · `VH-xxx` xe · `TX-xx` tài xế · `NV-xx` hộ tống · `INC-xxx` sự cố · `EXP-xxx` chi phí tài xế khai.

## 10. Kỹ thuật (tóm tắt, chi tiết ở `AGENTS.md`)

Ứng dụng React + TypeScript (Vite) ở gốc repo, chưa có backend. Bản HTML/CSS/JS cũ đã bỏ (còn trong lịch sử git, trước commit đổi vị thế).
- 2 app build riêng: khách (`index.html`, URL `/`) và nội bộ (`backoffice.html`, URL `/backoffice`). Danh sách trang ở `src/apps/*/routes.tsx`; trang `/sitemap` liệt kê mọi trang của cả 2 app.
- Hằng số nghiệp vụ ở `src/shared/config/`; hàm tính hạn, tính giá, chia chặng ở `src/shared/lib/` (có test).
- Dữ liệu mẫu là một kho dùng chung lưu trong `sessionStorage` (`src/shared/services/`): đơn (`mock/orders*.ts`), nhân sự xử lý đơn, sự cố, lịch sử chuyến, chuyến của Điều phối (`mock/trips.ts`, mã TR nối sang đơn qua `orderId`), đội xe và người đi theo chuyến (`mock/fleet.ts`). Thao tác của vai trò này thì vai trò khác thấy ngay. Sửa dữ liệu mẫu thì tăng `MOCK_VERSION` trong `store.ts`.
- Mã đơn trùng nhau giữa các trang cũ đã được đánh số lại: 1076–1080 (Manager, Điều phối), 1081–1083 (giấy tờ chuyến đi của Kiểm dịch, gốc 1060, 1057, 1055).

## 11. Code đang lệch với PRD (cần sửa)

1. **Cách tính giá:** dự toán ở bước 4 đặt chuyến (`legacy-quote.ts`) dùng giá cố định 25 triệu/ngựa (nội địa) và 120 triệu/ngựa (quốc tế). Mức 120 triệu còn sót từ thời làm hàng không. Dữ liệu đơn mẫu lại tính theo xe và km (ví dụ 65 km = 4,2 triệu), tra cước ở trang chủ tính theo bậc km (`src/shared/lib/pricing.ts`). Chưa có công thức thống nhất.
2. **Chữ trên trang Cổng khách hàng (`PortalPage.tsx`) trái quy tắc:** ghi "thẩm định hồ sơ < 24h" và "báo giá trong vòng 24h" (quy tắc: 5 ngày làm việc); ghi "hủy trước 72 giờ để hoàn 100% phí cọc" (quy tắc: bảng hoàn tiền ở mục 7).
3. **Khách chưa có chỗ nộp lại giấy tờ khi được yêu cầu bổ sung:** Kiểm dịch gửi yêu cầu thì đơn nằm ở "Chờ khách bổ sung", nhưng trang khách (cả bản cũ) không có nút nộp lại, nên đơn không tự quay về Kiểm dịch được.
4. **Báo cáo giấy tờ chuyến đi chưa có bước Manager xử lý:** Kiểm dịch báo cáo (khách chưa gửi bản gốc, cơ quan chậm cấp giấy…) thì Manager chỉ xem được ở trang Phê duyệt, chưa có thao tác quyết định.
5. **Kiểm dịch vẫn xác minh 5 loại giấy lúc đặt đơn:** trang Xác minh hồ sơ và dữ liệu mẫu dùng `requiredDocs` (`config/documents.ts`: thêm xét nghiệm EIA, giấy phép nhập khẩu, giấy sở hữu cho quốc tế), trong khi khách giờ chỉ nộp hộ chiếu + sổ tiêm.
6. **Bảo hiểm còn trong dữ liệu phía nội bộ:** đơn mẫu và báo giá nội bộ còn dòng "Bảo hiểm vận chuyển"; đơn chưa lưu lựa chọn bảo hiểm của khách (mã hợp đồng / miễn trừ) vì bấm gửi ở bước 4 chưa tạo đơn thật.
7. **Đơn chưa lưu cửa khẩu khách chọn:** trường `border` của đơn vẫn là cặp cửa khẩu do hệ thống gán; chưa có chỗ khóa cửa khẩu qua Kiểm dịch và Lập lộ trình.
8. **Phần Manager / Điều phối cho việc của tài xế chưa làm:** Manager chưa có màn hình duyệt chi phí tài xế (khoản chi chỉ ở trạng thái Chờ duyệt); phí chờ tại điểm đón mới ghi số phút chờ, chưa cộng vào hóa đơn khách; quá 4 giờ (điểm đón) hoặc 6 giờ (điểm giao) chưa có thao tác hủy lệnh / đưa ngựa về trại ký gửi.
9. **Điều phối chưa thấy hộ tống đã nhận chuyến hay chưa:** hộ tống bấm Nhận chuyến (lưu `escortAcceptedAt` trên chuyến) nhưng trang Phân công / Giám sát chưa hiển thị; Điều phối cũng chưa bị chặn giao 2 chuyến chạy cùng lúc cho một hộ tống.


## 12. Câu hỏi mở (chưa chốt)

1. **Phụ phí nhiên liệu:**
   - (1) Tách thành dòng riêng, tính % trên cước, chốt % khi khách chấp nhận báo giá
   - (2) Như (1), thêm điều khoản điều chỉnh nếu giá dầu lệch quá ±10%
   - (3) Giá trọn gói có cộng sẵn khoản dự phòng
2. **Công thức giá chuẩn:** tính theo km, theo loại xe, hay theo bảng tuyến cố định?
3. **Khởi hành khi Điều phối chưa nhận giấy tờ:** trang Phân công hiện đang chỉ cảnh báo "Chưa nhận giấy tờ từ kiểm dịch viên", vẫn cho khởi hành nếu khách đã thanh toán. Có chặn khởi hành cho tới khi Kiểm dịch bàn giao giấy không?
