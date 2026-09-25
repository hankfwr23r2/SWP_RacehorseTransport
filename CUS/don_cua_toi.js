// ===== Quy tắc =====
// - Khách thấy yêu cầu thanh toán khi manager đã duyệt đơn.
// - Hạn thanh toán = thời điểm duyệt + PAYMENT_HOURS giờ; thanh toán 100% tổng giá trị đơn.
// - Quá hạn chưa thanh toán: đơn tự hủy, chỗ xe giữ tạm được nhả.
// - Hạn thẩm định cam kết với khách = mốc SỚM HƠN của:
//     (1) 17:00 ngày làm việc thứ APPRAISAL_WORKING_DAYS sau ngày gửi đơn
//         (kiểm dịch 2 ngày + lập lộ trình 2 ngày + duyệt 1 ngày)
//     (2) 17:00 của (ngày khởi hành − APPRAISAL_CAP_DAYS); rơi vào ngày nghỉ thì lùi về ngày làm việc trước
//         (để còn 2 ngày thanh toán + 2 ngày chuẩn bị)
// - Quá hạn thẩm định (công ty chịu trách nhiệm, không đẩy rủi ro sang khách):
//     + Chỗ xe đã giữ từ lúc đặt đơn, ngày khởi hành KHÔNG đổi.
//     + Đơn chuyển sang "Ưu tiên": Quản lý trực tiếp xử lý, cam kết mới = 17:00 ngày làm việc kế tiếp sau hạn cũ.
//     + Khách vẫn được hủy miễn phí nếu không muốn chờ (phương án phụ).
// - Hạn thanh toán = mốc SỚM HƠN của (duyệt + PAYMENT_HOURS giờ) và 17:00 của (khởi hành − PAYMENT_CAP_DAYS ngày),
//   để đơn duyệt muộn vẫn còn thời gian chuẩn bị.
// - Hồ sơ có vấn đề không khắc phục được (do kiểm dịch báo cáo): Manager gửi phương án, khách chọn trong CHOICE_HOURS giờ:
//     A. Bỏ ngựa có vấn đề (báo giá lại)  B. Thay ngựa khác  C. Dời ngày khởi hành (bệnh chữa được)
//     D. Kiểm tra lại (kiểm dịch viên khác)  E. Hủy đơn miễn phí
//   Quá hạn không chọn: Manager quyết định (có thể từ chối đơn).
// - Chỉ Manager từ chối đơn; đơn bị từ chối ghi rõ ở bước nào.
const CHOICE_HOURS = 48;
const MIN_LEAD_DAYS = 10;
const PAYMENT_HOURS = 48;
const PAYMENT_CAP_DAYS = 2;
const APPRAISAL_WORKING_DAYS = 5;
const APPRAISAL_CAP_DAYS = 4;
const PRIORITY_WORKING_DAYS = 1;
const HOTLINE = '1900 6868';
const WORK_END_HOUR = 17;
const HOLIDAYS = ['2026-01-01', '2026-04-30', '2026-05-01', '2026-09-02', '2027-01-01'];
const ORIGINALS_DUE_DAYS = 3;  // khách gửi bản gốc giấy tờ trước 17:00 ngày khởi hành − 3
const OFFICE_ADDRESS = 'Văn phòng Vận chuyển Ngựa, 120 Xô Viết Nghệ Tĩnh, TP.HCM';
const URGENT_HOURS = 12; // còn ít hơn số giờ này thì cảnh báo đỏ
const HOUR = 60 * 60 * 1000;

// Chính sách hoàn tiền hiển thị cho khách (tính theo số ngày trước ngày khởi hành)
const REFUND_POLICY = [
    ['Công ty hủy chuyến', '100%'],
    ['Ngựa không đạt kiểm tra sức khỏe tại chỗ ngày lấy ngựa', '100% trừ phí kiểm dịch đã phát sinh'],
    ['Khách hủy trước khởi hành từ 7 ngày trở lên', '90%'],
    ['Khách hủy trước khởi hành 3 – 6 ngày', '50%'],
    ['Khách hủy trước khởi hành dưới 3 ngày', 'Không hoàn']
];

const BANK = { name: 'Vietcombank', account: '0071 000 123 456', owner: 'CONG TY TNHH EQUINEZ LOGISTICS' };

// Các bước khách nhìn thấy (các bước nội bộ tiếp nhận, kiểm dịch, lập lộ trình, duyệt gộp thành "Chờ thẩm định")
const STEPS = ['Gửi đơn', 'Chờ thẩm định', 'Thanh toán', 'Vận chuyển', 'Nghiệm thu'];

// ===== Ngày làm việc =====
const pad = n => String(n).padStart(2, '0');
const dayKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const isWorkingDay = d => d.getDay() !== 0 && d.getDay() !== 6 && !HOLIDAYS.includes(dayKey(d));

function startOfDay(t) {
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    return d;
}

function atHour(day, hour) {
    const d = new Date(day);
    d.setHours(hour, 0, 0, 0);
    return d.getTime();
}

// Dịch n ngày làm việc (n > 0 tiến, n < 0 lùi), trả về 00:00 của ngày đó
function addWorkingDays(t, n) {
    const d = startOfDay(t);
    const step = n > 0 ? 1 : -1;
    let left = Math.abs(n);
    while (left > 0) {
        d.setDate(d.getDate() + step);
        if (isWorkingDay(d)) left--;
    }
    return d;
}

// ===== Dữ liệu mẫu (ngày tính tương đối so với hôm nay) =====
// status: processing | choose_option (cần khách chọn phương án) | rechecking (đang kiểm tra lại) | awaiting_payment | paid
//         | in_transit | delivered (chờ nghiệm thu) | completed | rejected | cancelled
// choose_option: offer { issue, affected: [tên ngựa], options: [...], custom: [{ code, label, detail }] (Manager tự thêm), sentAt, requoteServices (cho phương án A) }
// rejected: rejectedStep 0 = bước Tiếp nhận, 1 = bước Thẩm định hồ sơ; rejectedAt; reason
// trip (khi đang vận chuyển): checkpoints [{ label, time, state: done | current | next }], health [...], contacts
const now = Date.now();
const today = startOfDay(now);
const daysFromToday = (k, hour = 0) => { const d = new Date(today); d.setDate(d.getDate() + k); d.setHours(hour); return d.getTime(); };
const workdaysAgo = (k, hour = 9) => atHour(addWorkingDays(isWorkingDay(today) ? today : addWorkingDays(today, -1), -k), hour);
const orders = [
    {
        id: 'EQ-2026-1064', submittedAt: daysFromToday(-2, 9), departAt: daysFromToday(15),
        from: 'Trang trại Long Thành (Đồng Nai, VN)', to: 'Trường đua Đại Nam (Bình Dương, VN)',
        routeShort: 'Đồng Nai → Bình Dương', border: null, distance: '65 km', duration: '~2 giờ',
        horses: ['Hắc Phong (Thoroughbred, Đực)'],
        vehicle: 'Xe chuyên dụng 2 ngăn', stops: ['Trang trại Long Thành — nhận ngựa', 'Trường đua Đại Nam — giao ngựa'],
        services: [
            ['Vận chuyển đường bộ', 'Xe chuyên dụng 2 ngăn · khoang tiêu chuẩn · 65 km', 4200000],
            ['Kiểm dịch vận chuyển nội địa', 'Cấp giấy chứng nhận kiểm dịch cho 1 ngựa', 900000],
            ['Chăm sóc dọc đường', 'NV chăm sóc đi kèm · nước điện giải', 400000],
            ['Bảo hiểm vận chuyển', 'Gói cơ bản', 500000]
        ],
        status: 'awaiting_payment', approvedAt: now - 43 * HOUR
    },
    {
        id: 'EQ-2026-1042', submittedAt: daysFromToday(-2, 9), departAt: daysFromToday(12),
        from: 'Trang trại Long Thành (Đồng Nai, VN)', to: 'Trường đua Phnom Penh Royal Turf (Phnom Penh, KH)',
        routeShort: 'Đồng Nai → Phnom Penh (KH)', border: 'Mộc Bài – Bavet', distance: '290 km', duration: '~7 giờ',
        horses: ['Storm Runner (Thoroughbred, Thiến)', 'Bạch Phong (Arabian, Cái)'],
        vehicle: 'Xe chuyên dụng 4 ngăn',
        stops: ['Trang trại Long Thành (Đồng Nai) — nhận ngựa', 'Cửa khẩu Mộc Bài (Tây Ninh) — thông quan', 'Cửa khẩu Bavet (Svay Rieng) — kiểm tra thú y', 'Trường đua Phnom Penh Royal Turf — giao ngựa'],
        services: [
            ['Vận chuyển đường bộ', 'Xe chuyên dụng 4 ngăn · khoang tiêu chuẩn · 290 km', 17000000],
            ['Kiểm dịch & thủ tục xuất cảnh', 'Trọn gói: xét nghiệm, chứng nhận, thông quan Mộc Bài – Bavet', 6500000],
            ['Chăm sóc dọc đường', 'NV chăm sóc đi kèm · cỏ khô Timothy · nước điện giải', 1500000],
            ['Bảo hiểm vận chuyển', 'Gói cơ bản', 1500000]
        ],
        status: 'awaiting_payment', approvedAt: now - 3 * HOUR
    },
    {
        id: 'EQ-2026-1063', submittedAt: daysFromToday(0, 9), departAt: daysFromToday(18),
        from: 'Trang trại Long Thành (Đồng Nai, VN)', to: 'Trường đua Phú Thọ (TP.HCM, VN)',
        routeShort: 'Đồng Nai → TP.HCM', border: null, distance: '60 km', duration: '~2 giờ',
        horses: ['Storm Runner (Thoroughbred, Thiến)', 'Kim Lân (Thoroughbred, Đực)'],
        services: [
            ['Vận chuyển đường bộ', 'Xe chuyên dụng 2 ngăn · khoang tiêu chuẩn · 60 km', 5000000],
            ['Kiểm dịch vận chuyển nội địa', 'Cấp giấy chứng nhận kiểm dịch cho 2 ngựa', 1500000],
            ['Chăm sóc dọc đường', 'NV chăm sóc đi kèm · nước điện giải', 600000],
            ['Bảo hiểm vận chuyển', 'Gói cơ bản', 900000]
        ],
        status: 'processing'
    },
    {
        id: 'EQ-2026-1055', submittedAt: workdaysAgo(APPRAISAL_WORKING_DAYS + 1), departAt: daysFromToday(12),
        from: 'Trang trại Long Thành (Đồng Nai, VN)', to: 'Vientiane Turf Club (Viêng Chăn, LA)',
        routeShort: 'Đồng Nai → Viêng Chăn (LA)', border: 'Lao Bảo – Densavanh', distance: '1,250 km', duration: '3 ngày',
        horses: ['Kim Lân (Thoroughbred, Đực)'],
        services: [
            ['Vận chuyển đường bộ', 'Xe chuyên dụng 2 ngăn · khoang tiêu chuẩn · 1,250 km', 32000000],
            ['Kiểm dịch & thủ tục xuất cảnh', 'Trọn gói: xét nghiệm, chứng nhận, thông quan Lao Bảo – Densavanh', 4800000],
            ['Chăm sóc dọc đường', 'NV chăm sóc đi kèm · cỏ khô Timothy · nước điện giải', 2400000],
            ['Bảo hiểm vận chuyển', 'Gói cơ bản', 1500000]
        ],
        status: 'processing'
    },
    {
        id: 'EQ-2026-1028', submittedAt: daysFromToday(-15, 9), departAt: daysFromToday(0),
        from: 'Trang trại Long Thành (Đồng Nai, VN)', to: 'Trường đua Phnom Penh Royal Turf (Phnom Penh, KH)',
        routeShort: 'Đồng Nai → Phnom Penh (KH)', border: 'Mộc Bài – Bavet', distance: '290 km', duration: '~7 giờ',
        horses: ['Kim Lân (Thoroughbred, Đực)'],
        vehicle: 'Xe chuyên dụng 2 ngăn',
        stops: ['Trang trại Long Thành — nhận ngựa', 'Cửa khẩu Mộc Bài — thông quan', 'Cửa khẩu Bavet — kiểm tra thú y', 'Trường đua Phnom Penh Royal Turf — giao ngựa'],
        services: [
            ['Vận chuyển đường bộ', 'Xe chuyên dụng 2 ngăn · khoang tiêu chuẩn · 290 km', 11000000],
            ['Kiểm dịch & thủ tục xuất cảnh', 'Trọn gói: xét nghiệm, chứng nhận, thông quan Mộc Bài – Bavet', 3200000],
            ['Chăm sóc dọc đường', 'NV chăm sóc đi kèm · cỏ khô Timothy · nước điện giải', 800000],
            ['Bảo hiểm vận chuyển', 'Gói cơ bản', 1000000]
        ],
        status: 'in_transit', approvedAt: daysFromToday(-8, 10), paidAt: daysFromToday(-7, 15),
        papers: {
            originals: { 'Kim Lân': { passport: daysFromToday(-5, 10), vaccine: daysFromToday(-5, 10), lab: daysFromToday(-5, 10), import_permit: daysFromToday(-4, 14), ownership: daysFromToday(-5, 10) } },
            procedures: {
                quarantine_border: { number: 'KD-XK-2026/0391', agency: 'Cơ quan Thú y vùng VI', issuedAt: daysFromToday(-3), validUntil: daysFromToday(7), file: 'GCN_kiem_dich_XK_EQ-2026-1028.pdf' },
                customs: { number: '305112398410', agency: 'Chi cục Hải quan cửa khẩu Mộc Bài', issuedAt: daysFromToday(-2), file: 'To_khai_HQ_EQ-2026-1028.pdf' }
            },
            handedAt: daysFromToday(-2, 11)
        },
        trip: {
            plate: '51C-123.45', eta: now + 3 * HOUR, updatedAt: now - 10 * 60000,
            contacts: [['Tài xế', 'Nguyễn Văn Hùng', '0908 111 222'], ['NV chăm sóc', 'Võ Thị Lan', '0908 333 444']],
            checkpoints: [
                { label: 'Kiểm tra sức khỏe tại chỗ — Đạt', place: 'Trang trại Long Thành', time: now - 6 * HOUR, state: 'done' },
                { label: 'Nhận ngựa lên xe, khởi hành', place: 'Trang trại Long Thành', time: now - 5.5 * HOUR, state: 'done' },
                { label: 'Dừng nghỉ, cho ngựa uống nước', place: 'Trạm dừng Trảng Bàng (Tây Ninh)', time: now - 3 * HOUR, state: 'done' },
                { label: 'Thông quan xuất cảnh', place: 'Cửa khẩu Mộc Bài (VN)', time: now - 1.5 * HOUR, state: 'done' },
                { label: 'Kiểm tra thú y nhập cảnh', place: 'Cửa khẩu Bavet (KH)', time: now - 0.5 * HOUR, state: 'current' },
                { label: 'Giao ngựa', place: 'Trường đua Phnom Penh Royal Turf', time: now + 3 * HOUR, state: 'next' }
            ],
            health: [
                { time: now - 40 * 60000, temp: '37.8°C', heart: '36 bpm', note: 'Ăn uống bình thường, đứng vững trong khoang' },
                { time: now - 3 * HOUR, temp: '37.6°C', heart: '38 bpm', note: 'Đã uống 8 lít nước tại trạm dừng' },
                { time: now - 6 * HOUR, temp: '37.5°C', heart: '34 bpm', note: 'Kiểm tra trước khi lên xe: đạt' }
            ]
        }
    },
    {
        id: 'EQ-2026-1019', submittedAt: daysFromToday(-16, 9), departAt: daysFromToday(0),
        from: 'Trang trại Long Thành (Đồng Nai, VN)', to: 'Trường đua Đại Nam (Bình Dương, VN)',
        routeShort: 'Đồng Nai → Bình Dương', border: null, distance: '65 km', duration: '~2 giờ',
        horses: ['Storm Runner (Thoroughbred, Thiến)'],
        vehicle: 'Xe chuyên dụng 2 ngăn',
        stops: ['Trang trại Long Thành — nhận ngựa', 'Trường đua Đại Nam — giao ngựa'],
        services: [
            ['Vận chuyển đường bộ', 'Xe chuyên dụng 2 ngăn · khoang tiêu chuẩn · 65 km', 3900000],
            ['Kiểm dịch vận chuyển nội địa', 'Cấp giấy chứng nhận kiểm dịch cho 1 ngựa', 900000],
            ['Chăm sóc dọc đường', 'NV chăm sóc đi kèm · nước điện giải', 400000],
            ['Bảo hiểm vận chuyển', 'Gói cơ bản', 400000]
        ],
        status: 'delivered', approvedAt: daysFromToday(-8, 10), paidAt: now - 6 * 24 * HOUR, deliveredAt: now - 3 * HOUR
    },
    {
        id: 'EQ-2026-1030', submittedAt: daysFromToday(-12, 9), departAt: daysFromToday(6),
        from: 'Trang trại Long Thành (Đồng Nai, VN)', to: 'Trường đua Sông Hàn (Đà Nẵng, VN)',
        routeShort: 'Đồng Nai → Đà Nẵng', border: null, distance: '930 km', duration: '2 ngày',
        horses: ['Bạch Phong (Arabian, Cái)'],
        vehicle: 'Xe chuyên dụng 2 ngăn',
        stops: ['Trang trại Long Thành — nhận ngựa', 'Trạm nghỉ Tuy Hòa (Phú Yên) — nghỉ đêm', 'Trường đua Sông Hàn (Đà Nẵng) — giao ngựa'],
        services: [
            ['Vận chuyển đường bộ', 'Xe chuyên dụng 2 ngăn · khoang tiêu chuẩn · 930 km', 21000000],
            ['Kiểm dịch vận chuyển nội địa', 'Cấp giấy chứng nhận kiểm dịch cho 1 ngựa', 900000],
            ['Chăm sóc dọc đường', 'NV chăm sóc đi kèm · cỏ khô Timothy · nước điện giải', 2400000],
            ['Bảo hiểm vận chuyển', 'Gói cơ bản', 1200000]
        ],
        status: 'paid', approvedAt: now - 9 * 24 * HOUR, paidAt: now - 8 * 24 * HOUR,
        papers: {
            originals: { 'Bạch Phong': { passport: daysFromToday(-2, 10), vaccine: daysFromToday(-2, 10), ownership: null } },
            procedures: {}
        }
    },
    {
        id: 'EQ-2026-1021', submittedAt: daysFromToday(-22, 9), departAt: daysFromToday(-6),
        from: 'Trang trại Long Thành (Đồng Nai, VN)', to: 'Trường đua Phú Thọ (TP.HCM, VN)',
        routeShort: 'Đồng Nai → TP.HCM', border: null, distance: '60 km', duration: '~2 giờ',
        horses: ['Storm Runner (Thoroughbred, Thiến)'],
        vehicle: 'Xe chuyên dụng 2 ngăn',
        stops: ['Trang trại Long Thành — nhận ngựa', 'Trường đua Phú Thọ — giao ngựa'],
        services: [
            ['Vận chuyển đường bộ', 'Xe chuyên dụng 2 ngăn · khoang tiêu chuẩn · 60 km', 3800000],
            ['Kiểm dịch vận chuyển nội địa', 'Cấp giấy chứng nhận kiểm dịch cho 1 ngựa', 900000],
            ['Bảo hiểm vận chuyển', 'Gói cơ bản', 400000]
        ],
        status: 'completed', approvedAt: now - 20 * 24 * HOUR, paidAt: now - 19 * 24 * HOUR
    },
    {
        id: 'EQ-2026-1049', submittedAt: daysFromToday(-1, 9), departAt: daysFromToday(12),
        from: 'Trang trại Long Thành (Đồng Nai, VN)', to: 'Trường đua Phnom Penh Royal Turf (Phnom Penh, KH)',
        routeShort: 'Đồng Nai → Phnom Penh (KH)', border: 'Mộc Bài – Bavet', distance: '290 km', duration: '~7 giờ',
        horses: ['Storm Runner (Thoroughbred, Thiến)', 'Bạch Phong (Arabian, Cái)'],
        services: [
            ['Vận chuyển đường bộ', 'Xe chuyên dụng 4 ngăn · khoang tiêu chuẩn · 290 km', 17000000],
            ['Kiểm dịch & thủ tục xuất cảnh', 'Trọn gói: xét nghiệm, chứng nhận, thông quan Mộc Bài – Bavet', 6500000],
            ['Chăm sóc dọc đường', 'NV chăm sóc đi kèm · cỏ khô Timothy · nước điện giải', 1500000],
            ['Bảo hiểm vận chuyển', 'Gói cơ bản', 1500000]
        ],
        status: 'rejected', rejectedStep: 0, rejectedAt: daysFromToday(-1, 11),
        reason: 'Đơn trùng lặp: trùng với đơn EQ-2026-1042 (cùng 2 ngựa, cùng ngày khởi hành).'
    },
    {
        id: 'EQ-2026-1074', submittedAt: daysFromToday(-3, 9), departAt: daysFromToday(14),
        from: 'Trang trại Long Thành (Đồng Nai, VN)', to: 'Trường đua Angkor (Siem Reap, KH)',
        routeShort: 'Đồng Nai → Siem Reap (KH)', border: 'Mộc Bài – Bavet', distance: '560 km', duration: '2 ngày',
        horses: ['Hắc Phong (Thoroughbred, Đực)', 'Kim Lân (Thoroughbred, Đực)'],
        services: [
            ['Vận chuyển đường bộ', 'Xe chuyên dụng 2 ngăn · khoang tiêu chuẩn · 560 km', 18000000],
            ['Kiểm dịch & thủ tục xuất cảnh', 'Trọn gói cho 2 ngựa: xét nghiệm, chứng nhận, thông quan Mộc Bài – Bavet', 7600000],
            ['Chăm sóc dọc đường', 'NV chăm sóc đi kèm · cỏ khô Timothy · nước điện giải', 2000000],
            ['Bảo hiểm vận chuyển', 'Gói cơ bản', 1600000]
        ],
        status: 'choose_option',
        offer: {
            issue: 'Kết quả xét nghiệm của ngựa Hắc Phong dương tính bệnh thiếu máu truyền nhiễm (EIA). Đây là bệnh không chữa được nên ngựa không thể vận chuyển.',
            affected: ['Hắc Phong'],
            options: ['remove_horse', 'replace_horse', 'recheck', 'cancel'],
            custom: [{
                code: 'F', label: 'Bỏ Hắc Phong, chuyển Kim Lân sang xe 1 ngăn',
                detail: 'Bỏ Hắc Phong khỏi đơn và chở Kim Lân bằng xe chuyên dụng 1 ngăn. Xe 1 ngăn chỉ còn trống từ 2 ngày sau ngày khởi hành hiện tại nên ngày khởi hành dời thêm 2 ngày. Giá mới 17,300,000 ₫. Bạn không cần cung cấp thêm giấy tờ.'
            }],
            sentAt: now - 6 * HOUR,
            requoteServices: [
                ['Vận chuyển đường bộ', 'Xe chuyên dụng 2 ngăn · khoang tiêu chuẩn · 560 km', 15000000],
                ['Kiểm dịch & thủ tục xuất cảnh', 'Trọn gói cho 1 ngựa: xét nghiệm, chứng nhận, thông quan Mộc Bài – Bavet', 3800000],
                ['Chăm sóc dọc đường', 'NV chăm sóc đi kèm · cỏ khô Timothy · nước điện giải', 1000000],
                ['Bảo hiểm vận chuyển', 'Gói cơ bản', 800000]
            ]
        }
    },
    {
        id: 'EQ-2026-1025', submittedAt: daysFromToday(-19, 9), departAt: daysFromToday(-4),
        from: 'Trang trại Long Thành (Đồng Nai, VN)', to: 'Trường đua Angkor (Siem Reap, KH)',
        routeShort: 'Đồng Nai → Siem Reap (KH)', border: 'Mộc Bài – Bavet', distance: '560 km', duration: '2 ngày',
        horses: ['Kim Lân (Thoroughbred, Đực)'],
        vehicle: 'Xe chuyên dụng 2 ngăn',
        stops: ['Trang trại Long Thành — nhận ngựa', 'Cửa khẩu Mộc Bài — thông quan', 'Trường đua Angkor — giao ngựa'],
        services: [
            ['Vận chuyển đường bộ', 'Xe chuyên dụng 2 ngăn · khoang tiêu chuẩn · 560 km', 15000000],
            ['Kiểm dịch & thủ tục xuất cảnh', 'Trọn gói: xét nghiệm, chứng nhận, thông quan Mộc Bài – Bavet', 4800000],
            ['Bảo hiểm vận chuyển', 'Gói cơ bản', 1000000]
        ],
        status: 'awaiting_payment', approvedAt: now - 10 * 24 * HOUR
    }
];

// ===== Tiện ích =====
const formatVND = n => n.toLocaleString('en-US') + ' ₫';
const formatTime = t => { const d = new Date(t); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const orderTotal = order => order.services.reduce((total, svc) => total + svc[2], 0);
const formatDate = t => formatTime(t).split(' ')[0];

function lastWorkingDayBefore(t, days) {
    const d = new Date(t);
    d.setDate(d.getDate() - days);
    while (!isWorkingDay(d)) d.setDate(d.getDate() - 1);
    return d;
}

function paymentDeadline(order) {
    return Math.min(order.approvedAt + PAYMENT_HOURS * HOUR, atHour(lastWorkingDayBefore(order.departAt, PAYMENT_CAP_DAYS), WORK_END_HOUR));
}

function appraisalDeadline(order) {
    const byWorkingDays = atHour(addWorkingDays(order.submittedAt, APPRAISAL_WORKING_DAYS), WORK_END_HOUR);
    return Math.min(byWorkingDays, atHour(lastWorkingDayBefore(order.departAt, APPRAISAL_CAP_DAYS), WORK_END_HOUR));
}

// Cam kết mới khi đơn quá hạn và chuyển sang ưu tiên
const priorityDeadline = order => atHour(addWorkingDays(appraisalDeadline(order), PRIORITY_WORKING_DAYS), WORK_END_HOUR);

const isAppraisalOverdue = order => order.status === 'processing' && Date.now() > appraisalDeadline(order);

const choiceDeadline = order => order.offer.sentAt + CHOICE_HOURS * HOUR;
const choiceExpired = order => order.status === 'choose_option' && Date.now() > choiceDeadline(order);

function timeLeftUntil(t) {
    const ms = Math.max(0, t - Date.now());
    return `${Math.floor(ms / HOUR)} giờ ${pad(Math.floor((ms % HOUR) / 60000))} phút`;
}

function timeLeft(order) {
    const ms = paymentDeadline(order) - Date.now();
    const hours = Math.floor(ms / HOUR);
    const minutes = Math.floor((ms % HOUR) / 60000);
    return { ms, text: `${hours} giờ ${pad(minutes)} phút`, urgent: ms < URGENT_HOURS * HOUR };
}

// Quá hạn thanh toán → tự hủy
function expireOverdue() {
    orders.forEach(order => {
        if (order.status === 'awaiting_payment' && Date.now() > paymentDeadline(order)) {
            order.status = 'cancelled';
            order.reason = `Quá hạn thanh toán (hạn ${formatTime(paymentDeadline(order))}).`;
        }
    });
}

// Bước hiện tại trên thanh tiến trình
function currentStep(order) {
    switch (order.status) {
        case 'processing': return 1;
        case 'choose_option': return 1;
        case 'rechecking': return 1;
        case 'awaiting_payment': return 2;
        case 'paid': return 3;
        case 'in_transit': return 3;
        case 'delivered': return 4;
        case 'completed': return STEPS.length;
        case 'rejected': return 1;
        case 'cancelled': return order.approvedAt ? 2 : 1;
    }
}

function statusBadge(order) {
    switch (order.status) {
        case 'processing': return isAppraisalOverdue(order)
            ? `<span class="badge badge-danger"><i class="fa-solid fa-bolt"></i> Đang xử lý ưu tiên · trước ${formatTime(priorityDeadline(order))}</span>`
            : `<span class="badge badge-info"><i class="fa-solid fa-hourglass-half"></i> Chờ thẩm định · trước ${formatTime(appraisalDeadline(order))}</span>`;
        case 'awaiting_payment': {
            const left = timeLeft(order);
            return `<span class="badge ${left.urgent ? 'badge-danger' : 'badge-warning'}"><i class="fa-regular fa-clock"></i> Chờ thanh toán · còn ${left.text}</span>`;
        }
        case 'paid': return '<span class="badge badge-success"><i class="fa-solid fa-check"></i> Đã thanh toán · chờ khởi hành</span>';
        case 'in_transit': return `<span class="badge badge-info"><i class="fa-solid fa-truck-moving"></i> Đang vận chuyển · dự kiến giao ${formatTime(order.trip.eta)}</span>`;
        case 'delivered': return '<span class="badge badge-warning"><i class="fa-solid fa-clipboard-check"></i> Đã giao · chờ bạn nghiệm thu</span>';
        case 'completed': return '<span class="badge badge-success"><i class="fa-solid fa-flag-checkered"></i> Hoàn thành</span>';
        case 'rejected': return '<span class="badge badge-muted"><i class="fa-solid fa-xmark"></i> Bị từ chối</span>';
        case 'choose_option': return choiceExpired(order)
            ? '<span class="badge badge-muted"><i class="fa-solid fa-clock"></i> Quá hạn phản hồi</span>'
            : `<span class="badge badge-danger"><i class="fa-solid fa-circle-exclamation"></i> Chờ bạn phản hồi · còn ${timeLeftUntil(choiceDeadline(order))}</span>`;
        case 'rechecking': return '<span class="badge badge-info"><i class="fa-solid fa-magnifying-glass"></i> Đang kiểm tra lại</span>';
        case 'cancelled': return '<span class="badge badge-muted"><i class="fa-solid fa-ban"></i> Đã hủy</span>';
    }
}

// ===== Danh sách =====
const TABS = [
    ['all', 'Tất cả', () => true],
    ['processing', 'Chờ thẩm định', o => ['processing', 'choose_option', 'rechecking'].includes(o.status)],
    ['awaiting_payment', 'Chờ thanh toán', o => o.status === 'awaiting_payment'],
    ['paid', 'Đã thanh toán', o => o.status === 'paid'],
    ['in_transit', 'Đang vận chuyển', o => o.status === 'in_transit'],
    ['delivered', 'Chờ nghiệm thu', o => o.status === 'delivered'],
    ['closed', 'Đã đóng', o => ['completed', 'rejected', 'cancelled'].includes(o.status)]
];
let currentTab = 'all';

function renderList() {
    expireOverdue();
    document.getElementById('payment-hours').textContent = PAYMENT_HOURS;

    const waiting = orders.filter(o => o.status === 'awaiting_payment');
    const choosing = orders.filter(o => o.status === 'choose_option' && !choiceExpired(o));
    document.getElementById('payment-alert').innerHTML = (choosing.length
        ? `<div class="alert-box alert-danger"><i class="fa-solid fa-circle-exclamation" style="margin-top: 3px;"></i><div>
            Bạn có <strong>${choosing.length} đơn cần phản hồi</strong> do hồ sơ ngựa có vấn đề (${choosing.map(o => o.id).join(', ')}).
            Hạn gần nhất: <strong>${formatTime(Math.min(...choosing.map(choiceDeadline)))}</strong>.
           </div></div>`
        : '') + (waiting.length
        ? `<div class="alert-box alert-warning"><i class="fa-solid fa-credit-card" style="margin-top: 3px;"></i><div>
            Bạn có <strong>${waiting.length} đơn đã được duyệt</strong> đang chờ thanh toán.
            Hạn gần nhất: <strong>${formatTime(Math.min(...waiting.map(paymentDeadline)))}</strong>. Quá hạn đơn sẽ tự hủy.
           </div></div>`
        : '');

    document.getElementById('order-tabs').innerHTML = TABS.map(([key, label, match]) =>
        `<button class="order-tab ${key === currentTab ? 'active' : ''}" onclick="switchTab('${key}')">${label} (${orders.filter(match).length})</button>`
    ).join('');

    const match = TABS.find(t => t[0] === currentTab)[2];
    const list = orders.filter(match);
    document.getElementById('order-list').innerHTML = list.length
        ? list.map(order => `
            <tr>
                <td class="font-semibold text-orange nowrap">${order.id}</td>
                <td>${order.routeShort}${order.border ? `<div class="sub-text"><i class="fa-solid fa-flag"></i> ${order.border}</div>` : ''}</td>
                <td class="nowrap">${formatDate(order.departAt)}</td>
                <td class="text-right font-semibold nowrap">${formatVND(orderTotal(order))}</td>
                <td>${statusBadge(order)}</td>
                <td class="text-right nowrap">${order.status === 'awaiting_payment'
                    ? `<button class="btn btn-primary" onclick="showDetail('${order.id}')"><i class="fa-solid fa-credit-card"></i> Thanh toán</button>`
                    : order.status === 'delivered'
                        ? `<a class="btn btn-primary" href="acceptance.html?id=${order.id}"><i class="fa-solid fa-clipboard-check"></i> Nghiệm thu</a>`
                        : `<button class="btn btn-light-outline" onclick="showDetail('${order.id}')"><i class="fa-solid fa-eye"></i> Xem</button>`}</td>
            </tr>`).join('')
        : '<tr><td colspan="6" class="text-center text-muted" style="padding: 24px;">Không có đơn nào</td></tr>';
}

function switchTab(key) {
    currentTab = key;
    renderList();
}

function showList() {
    document.getElementById('detail-view').style.display = 'none';
    document.getElementById('list-view').style.display = 'block';
    renderList();
    window.scrollTo(0, 0);
}

// ===== Chi tiết =====
let activeOrder = null;

function infoRow(label, value) {
    return `<div class="info-row"><span class="label">${label}</span><span class="value">${value}</span></div>`;
}

function showDetail(orderId) {
    expireOverdue();
    const order = orders.find(o => o.id === orderId);
    activeOrder = order;

    document.getElementById('d-crumb').textContent = order.id;
    document.getElementById('d-title').textContent = `Đơn ${order.id}`;
    document.getElementById('d-badge').innerHTML = statusBadge(order);

    // Thanh tiến trình
    const step = currentStep(order);
    document.getElementById('d-stepper').innerHTML = STEPS.map((label, i) => {
        let cls = 'step';
        let icon = i + 1;
        if ((order.status === 'rejected' || order.status === 'cancelled') && i === step) {
            cls += ' failed';
            icon = '<i class="fa-solid fa-xmark"></i>';
        } else if (i < step) {
            cls += ' completed';
            icon = '<i class="fa-solid fa-check"></i>';
        } else if (i === step) {
            cls += ' active';
        }
        return `<div class="${cls}"><div class="step-number">${icon}</div><div class="step-label">${label}</div></div>`;
    }).join('');

    // Thông báo theo trạng thái
    const banners = {
        processing: isAppraisalOverdue(order)
            ? ['alert-warning', 'fa-bolt', `<strong>Đơn đang được Quản lý xử lý ưu tiên</strong> vì chưa kịp thẩm định trong hạn ${formatTime(appraisalDeadline(order))}.
                <ul class="priority-list">
                    <li><i class="fa-solid fa-truck"></i> Chỗ xe cho ngày khởi hành <strong>${formatDate(order.departAt)}</strong> vẫn được giữ, ngày khởi hành không đổi.</li>
                    <li><i class="fa-regular fa-clock"></i> Cam kết có kết quả trước <strong>${formatTime(priorityDeadline(order))}</strong>${Date.now() > priorityDeadline(order) ? ' — Quản lý phụ trách sẽ gọi trực tiếp cho bạn' : ''}.</li>
                    <li><i class="fa-solid fa-headset"></i> Nếu có thắc mắc hoặc cần hỗ trợ về đơn, vui lòng liên hệ hotline <strong>${HOTLINE}</strong>.</li>
                </ul>`]
            : ['alert-info', 'fa-hourglass-half', `Đơn đang được thẩm định: xác minh hồ sơ thú y và lập kế hoạch vận chuyển. Kết quả trước <strong>${formatTime(appraisalDeadline(order))}</strong>. Khi đơn được duyệt, bạn có ${PAYMENT_HOURS} giờ để thanh toán.${order.note ? `<br>${order.note}` : ''}`],
        rejected: ['alert-danger', 'fa-circle-xmark', rejectedHtml(order)],
        choose_option: order.offer ? (choiceExpired(order)
            ? ['alert-warning', 'fa-clock', `<strong>Đã quá hạn phản hồi</strong> (hạn ${formatTime(choiceDeadline(order))}). Quản lý sẽ xem xét và liên hệ với bạn. Cần hỗ trợ, gọi hotline <strong>${HOTLINE}</strong>.`]
            : ['alert-warning', 'fa-circle-exclamation', `<strong>Cần phản hồi của bạn.</strong> Hồ sơ có vấn đề không thể khắc phục bằng bổ sung giấy tờ.
                Vui lòng chọn phương án xử lý bên dưới trước <strong>${formatTime(choiceDeadline(order))}</strong>. Quá hạn không phản hồi, Quản lý có thể từ chối đơn.`]) : null,
        rechecking: ['alert-info', 'fa-magnifying-glass', `<strong>Bạn đã yêu cầu kiểm tra lại lúc ${formatTime(order.recheckAt || Date.now())}.</strong> Một kiểm dịch viên khác đang xem lại hồ sơ từ đầu. Ngày khởi hành ${formatDate(order.departAt)} vẫn giữ nguyên.`],
        cancelled: ['alert-danger', 'fa-ban', `<strong>Đơn đã hủy.</strong> ${order.reason}`],
        paid: order.papers && missingOriginals(order).length
            ? ['alert-warning', 'fa-envelope-open-text', `<strong>Vui lòng gửi bản gốc ${missingOriginals(order).length} giấy tờ trước ${formatTime(originalsDue(order))}</strong>: ${missingOriginals(order).join('; ')}.<br>
                Gửi chuyển phát hoặc mang trực tiếp đến ${OFFICE_ADDRESS}. Qua cửa khẩu và trạm kiểm dịch chỉ chấp nhận bản gốc. Chưa có đủ bản gốc, chuyến đi có thể không khởi hành được.`]
            : null
    };
    const banner = banners[order.status];
    document.getElementById('d-banner').innerHTML = banner
        ? `<div class="alert-box ${banner[0]}"><i class="fa-solid ${banner[1]}" style="margin-top: 3px;"></i><div>${banner[2]}</div></div>`
        : '';

    // Thông tin đơn
    document.getElementById('d-info').innerHTML =
        infoRow('Gửi đơn lúc', formatTime(order.submittedAt)) +
        infoRow('Điểm đi', order.from) +
        infoRow('Điểm đến', order.to) +
        infoRow('Loại tuyến', order.border ? `Xuyên quốc gia · cửa khẩu ${order.border}` : 'Nội địa') +
        infoRow('Quãng đường / Thời gian', `${order.distance} · ${order.duration}`) +
        infoRow('Ngày khởi hành', `<span class="text-orange">${formatDate(order.departAt)}</span>`) +
        infoRow(`Ngựa (${order.horses.length})`, order.horses.join('<br>'));

    // Kết quả thẩm định: chỉ có khi đơn đã được duyệt
    const approved = ['awaiting_payment', 'paid', 'in_transit', 'delivered', 'completed'].includes(order.status) || (order.status === 'cancelled' && order.approvedAt);
    document.getElementById('d-plan-card').style.display = approved ? 'block' : 'none';
    if (approved) {
        document.getElementById('d-plan').innerHTML = `
            <ul class="plan-checks">
                <li><i class="fa-solid fa-circle-check"></i> Hồ sơ ngựa hợp lệ — đã được kiểm dịch viên xác nhận</li>
                <li><i class="fa-solid fa-circle-check"></i> Đã lập kế hoạch vận chuyển — ${order.vehicle}</li>
                <li><i class="fa-solid fa-circle-check"></i> Đơn được duyệt lúc ${formatTime(order.approvedAt)}</li>
            </ul>
            <div class="sub-title">Lộ trình dự kiến</div>
            <ol class="plan-stops">${order.stops.map(s => `<li>${s}</li>`).join('')}</ol>`;
    }

    // Giấy tờ chuyến đi (sau khi thanh toán)
    document.getElementById('d-papers-card').style.display = order.papers ? 'block' : 'none';
    if (order.papers) {
        document.getElementById('d-papers-sub').textContent = order.papers.handedAt
            ? `Đã bàn giao cho đội vận chuyển lúc ${formatTime(order.papers.handedAt)}`
            : `Hạn gửi bản gốc: ${formatTime(originalsDue(order))}`;
        document.getElementById('d-papers').innerHTML = papersHtml(order);
    }

    // Hành trình & sức khỏe (chỉ khi đang vận chuyển)
    const inTransit = order.status === 'in_transit';
    document.getElementById('d-trip-card').style.display = inTransit ? 'block' : 'none';
    document.getElementById('d-health-card').style.display = inTransit ? 'block' : 'none';
    if (inTransit) {
        const trip = order.trip;
        document.getElementById('d-trip-updated').textContent = `Cập nhật lúc ${formatTime(trip.updatedAt)}`;
        document.getElementById('d-trip').innerHTML = `
            <ol class="trip-timeline">
                ${trip.checkpoints.map(c => `
                    <li class="trip-point ${c.state}">
                        <div class="trip-dot">${c.state === 'done' ? '<i class="fa-solid fa-check"></i>' : c.state === 'current' ? '<i class="fa-solid fa-truck-moving"></i>' : ''}</div>
                        <div class="trip-text">
                            <div class="trip-label">${c.label}${c.state === 'current' ? ' <span class="badge badge-info">Đang ở đây</span>' : ''}</div>
                            <div class="sub-text">${c.place} · ${c.state === 'next' ? 'dự kiến ' : ''}${formatTime(c.time)}</div>
                        </div>
                    </li>`).join('')}
            </ol>`;
        document.getElementById('d-health').innerHTML = `
            <table class="data-table">
                <thead><tr><th>Thời điểm</th><th>Thân nhiệt</th><th>Nhịp tim</th><th>Ghi chú của NV chăm sóc</th></tr></thead>
                <tbody>${trip.health.map(h => `<tr><td class="nowrap">${formatTime(h.time)}</td><td>${h.temp}</td><td>${h.heart}</td><td class="text-muted">${h.note}</td></tr>`).join('')}</tbody>
            </table>`;
    }

    // Dịch vụ đã chọn
    document.getElementById('d-services').innerHTML = `
        <table class="data-table">
            <thead><tr><th>Dịch vụ</th><th>Lựa chọn</th><th class="text-right">Thành tiền</th></tr></thead>
            <tbody>${order.services.map(svc => `<tr><td class="font-semibold">${svc[0]}</td><td class="text-muted">${svc[1]}</td><td class="text-right nowrap">${formatVND(svc[2])}</td></tr>`).join('')}</tbody>
            <tfoot><tr class="total-row"><td colspan="2">TỔNG GIÁ TRỊ ĐƠN</td><td class="text-right nowrap">${formatVND(orderTotal(order))}</td></tr></tfoot>
        </table>`;

    const choosing = order.status === 'choose_option' && !choiceExpired(order);
    const choiceCard = document.getElementById('d-choice-card');
    choiceCard.style.display = choosing ? 'block' : 'none';
    choiceCard.innerHTML = choosing ? choicePanel(order) : '';

    document.getElementById('d-side').innerHTML = sidePanel(order);
    document.getElementById('list-view').style.display = 'none';
    document.getElementById('detail-view').style.display = 'block';
    window.scrollTo(0, 0);
}

function policyCard() {
    return `
        <div class="card">
            <div class="card-header"><h3><i class="fa-solid fa-shield-halved text-orange"></i> Cam kết &amp; hoàn tiền</h3></div>
            <div class="card-body">
                <ul class="plan-checks">
                    <li><i class="fa-solid fa-file-signature"></i> Hợp đồng điện tử và hóa đơn gửi qua email ngay sau khi thanh toán</li>
                    <li><i class="fa-solid fa-umbrella"></i> Ngựa được bảo hiểm theo gói đã chọn trong suốt hành trình</li>
                    <li><i class="fa-solid fa-location-dot"></i> Theo dõi hành trình và sức khỏe ngựa ngay trong mục Đơn của tôi</li>
                </ul>
                <table class="policy-table">
                    <thead><tr><th>Trường hợp</th><th class="text-right">Hoàn tiền</th></tr></thead>
                    <tbody>${REFUND_POLICY.map(([c, r]) => `<tr><td>${c}</td><td class="text-right font-semibold">${r}</td></tr>`).join('')}</tbody>
                </table>
            </div>
        </div>`;
}

function sidePanel(order) {
    const total = formatVND(orderTotal(order));
    if (order.status === 'awaiting_payment') {
        const left = timeLeft(order);
        return `
            <div class="card pay-card">
                <div class="card-header"><h3><i class="fa-solid fa-credit-card text-orange"></i> Thanh toán</h3></div>
                <div class="card-body">
                    ${infoRow('Tổng giá trị đơn', total)}
                    <div class="payment-total">Cần thanh toán: <span class="text-orange">${total}</span></div>
                    <div class="deadline-box ${left.urgent ? 'urgent' : ''}">
                        <div><i class="fa-regular fa-clock"></i> Còn <strong>${left.text}</strong></div>
                        <div class="deadline-sub">Hạn thanh toán: ${formatTime(paymentDeadline(order))}</div>
                    </div>
                    <button class="btn btn-primary btn-full" onclick="openPay()"><i class="fa-solid fa-credit-card"></i> Thanh toán ngay</button>
                    <p class="side-hint">Quá hạn chưa thanh toán, đơn sẽ tự hủy.</p>
                </div>
            </div>
            ${policyCard()}`;
    }
    if (order.status === 'paid') {
        return `
            <div class="card">
                <div class="card-header"><h3><i class="fa-solid fa-circle-check" style="color: #059669;"></i> Đã thanh toán</h3></div>
                <div class="card-body">
                    ${infoRow('Số tiền', total)}
                    ${infoRow('Thanh toán lúc', formatTime(order.paidAt))}
                    <div class="sub-title">Bước tiếp theo</div>
                    <ol class="plan-stops">
                        <li>Hợp đồng điện tử và hóa đơn đã gửi qua email</li>
                        ${order.papers ? `<li>Gửi bản gốc giấy tờ của ngựa trước ${formatTime(originalsDue(order))} (xem mục Giấy tờ chuyến đi)</li>` : ''}
                        <li>Ngày ${formatDate(order.departAt)}: kiểm dịch viên kiểm tra sức khỏe ngựa tại chỗ trước khi lên xe</li>
                        <li>Khởi hành; theo dõi hành trình ngay trên trang này</li>
                    </ol>
                </div>
            </div>
            ${policyCard()}`;
    }
    if (order.status === 'delivered') {
        return `
            <div class="card">
                <div class="card-header"><h3><i class="fa-solid fa-clipboard-check text-orange"></i> Chờ nghiệm thu</h3></div>
                <div class="card-body">
                    ${infoRow('Giao ngựa lúc', formatTime(order.deliveredAt))}
                    ${infoRow('Đã thanh toán', total)}
                    <a href="acceptance.html?id=${order.id}" class="btn btn-primary btn-full" style="margin-top: 12px;"><i class="fa-solid fa-clipboard-check"></i> Nghiệm thu ngay</a>
                </div>
            </div>`;
    }
    if (order.status === 'completed') {
        return `
            <div class="card">
                <div class="card-header"><h3><i class="fa-solid fa-flag-checkered" style="color: #059669;"></i> Hoàn thành</h3></div>
                <div class="card-body">
                    ${infoRow('Đã thanh toán', total)}
                    ${infoRow('Thanh toán lúc', formatTime(order.paidAt))}
                    <a href="acceptance.html?id=${order.id}" class="btn btn-primary btn-full" style="margin-top: 12px;"><i class="fa-solid fa-clipboard-check"></i> Xem biên bản nghiệm thu</a>
                </div>
            </div>`;
    }
    if (order.status === 'in_transit') {
        const trip = order.trip;
        const current = trip.checkpoints.find(c => c.state === 'current');
        const done = trip.checkpoints.filter(c => c.state === 'done').length;
        const percent = Math.round(done / (trip.checkpoints.length - 1) * 100);
        return `
            <div class="card">
                <div class="card-header"><h3><i class="fa-solid fa-truck-moving text-orange"></i> Vị trí hiện tại</h3></div>
                <div class="card-body">
                    <div class="trip-now">${current.place}</div>
                    <div class="sub-text">${current.label}</div>
                    <div class="trip-progress"><div style="width: ${percent}%;"></div></div>
                    ${infoRow('Đã qua', `${done}/${trip.checkpoints.length - 1} điểm`)}
                    ${infoRow('Dự kiến giao ngựa', formatTime(trip.eta))}
                    ${infoRow('Xe', `${order.vehicle} · ${trip.plate}`)}
                    <div class="sub-title">Liên hệ trên xe</div>
                    ${trip.contacts.map(([role, name, phone]) => infoRow(`${role}: ${name}`, `<a href="tel:${phone.replace(/\s/g, '')}" class="text-orange"><i class="fa-solid fa-phone"></i> ${phone}</a>`)).join('')}
                    ${infoRow('Hotline công ty', `<span class="text-orange">${HOTLINE}</span>`)}
                </div>
            </div>
            ${policyCard()}`;
    }
    if (order.status === 'processing') {
        const overdue = isAppraisalOverdue(order);
        return `
            <div class="card">
                <div class="card-header"><h3><i class="fa-solid fa-circle-info text-orange"></i> Thanh toán</h3></div>
                <div class="card-body">
                    ${infoRow('Tổng giá trị đơn', total)}
                    ${infoRow(overdue ? 'Cam kết kết quả (ưu tiên)' : 'Hạn thẩm định', formatTime(overdue ? priorityDeadline(order) : appraisalDeadline(order)))}
                    <p class="side-hint">Chưa cần thanh toán. Bạn sẽ nhận yêu cầu thanh toán 100% khi đơn được duyệt.</p>
                    ${overdue ? `
                        <a href="tel:${HOTLINE.replace(/\s/g, '')}" class="btn btn-light-outline btn-full" style="margin-top: 12px;"><i class="fa-solid fa-headset"></i> Liên hệ hỗ trợ: ${HOTLINE}</a>
                        <button class="btn-link-muted" onclick="cancelOverdue()">Không muốn chờ? Hủy đơn miễn phí</button>` : ''}
                </div>
            </div>
            ${policyCard()}`;
    }
    if (order.status === 'rechecking' || order.status === 'choose_option') {
        return `
            <div class="card">
                <div class="card-body">
                    ${infoRow('Tổng giá trị đơn', total)}
                    <p class="side-hint">Chưa cần thanh toán. Bạn sẽ nhận yêu cầu thanh toán 100% khi đơn được duyệt.</p>
                    <a href="tel:${HOTLINE.replace(/\s/g, '')}" class="btn btn-light-outline btn-full" style="margin-top: 12px;"><i class="fa-solid fa-headset"></i> Liên hệ hỗ trợ: ${HOTLINE}</a>
                </div>
            </div>`;
    }
    return `
        <div class="card">
            <div class="card-body">
                ${infoRow('Tổng giá trị đơn', total)}
                <p class="side-hint">Đơn đã đóng, không phát sinh thanh toán.</p>
                <a href="create_request.html" class="btn btn-primary btn-full" style="margin-top: 12px;"><i class="fa-solid fa-paper-plane"></i> Đặt chuyến mới</a>
            </div>
        </div>`;
}

// Nhập/chọn lại thì bỏ viền đỏ báo lỗi
['input', 'change'].forEach(type => document.addEventListener(type, e => {
    e.target.classList.remove('input-error');
    const list = e.target.closest('#option-list');
    if (list) list.classList.remove('input-error');
}));

// ===== Giấy tờ chuyến đi =====
// Khách gửi bản gốc giấy tờ đã nộp scan lúc đặt đơn; kiểm dịch viên của công ty làm thủ tục với cơ quan chức năng
// và tải bản scan giấy được cấp lên. Khách xem được mọi bản scan.
const DOC_LABEL = {
    passport: 'Hộ chiếu ngựa / Microchip',
    vaccine: 'Giấy chứng nhận tiêm phòng',
    lab: 'Kết quả xét nghiệm EIA & cúm ngựa',
    import_permit: 'Giấy phép nhập khẩu của nước đến',
    ownership: 'Giấy tờ chứng minh sở hữu'
};
const FILE_PREFIX = { passport: 'Ho_chieu', vaccine: 'Tiem_phong', lab: 'Xet_nghiem', import_permit: 'Giay_phep_NK', ownership: 'So_huu' };
const PROCEDURES = {
    quarantine_domestic: { label: 'Giấy chứng nhận kiểm dịch động vật vận chuyển ra khỏi tỉnh', numberLabel: 'Số giấy' },
    quarantine_border: { label: 'Giấy chứng nhận kiểm dịch động vật xuất/nhập khẩu', numberLabel: 'Số giấy' },
    customs: { label: 'Tờ khai hải quan (điện tử)', numberLabel: 'Số tờ khai' }
};
const proceduresOf = order => order.border ? ['quarantine_border', 'customs'] : ['quarantine_domestic'];
const originalsDue = order => atHour(new Date(order.departAt - ORIGINALS_DUE_DAYS * 24 * HOUR), WORK_END_HOUR);

function missingOriginals(order) {
    return Object.entries(order.papers.originals).flatMap(([horse, docs]) =>
        Object.entries(docs).filter(([, receivedAt]) => !receivedAt).map(([key]) => `${DOC_LABEL[key]} (${horse})`));
}

function papersHtml(order) {
    const { originals, procedures } = order.papers;
    const scanButton = (file, title) => `<button class="btn-link-scan" onclick="openDoc('${file}', '${title}')"><i class="fa-regular fa-file-pdf"></i> Bản scan</button>`;
    const procedureRows = proceduresOf(order).map(key => {
        const p = procedures[key];
        return `<tr>
            <td class="font-semibold">${PROCEDURES[key].label}</td>
            <td>${p ? `${PROCEDURES[key].numberLabel} <strong>${p.number}</strong><div class="sub-text">${p.agency} · cấp ${formatDate(p.issuedAt)}${p.validUntil ? ` · hiệu lực đến ${formatDate(p.validUntil)}` : ''}</div>` : '<span class="badge badge-muted">Đang làm thủ tục</span>'}</td>
            <td class="text-right">${p ? scanButton(p.file, PROCEDURES[key].label) : ''}</td>
        </tr>`;
    }).join('');
    const originalRows = Object.entries(originals).map(([horse, docs]) => `
        <tr class="papers-group"><td colspan="3">${horse}</td></tr>
        ${Object.entries(docs).map(([key, receivedAt]) => `<tr>
            <td>${DOC_LABEL[key]}</td>
            <td>${receivedAt ? `<span class="badge badge-success">Đã nhận bản gốc</span><div class="sub-text">${formatTime(receivedAt)}</div>` : '<span class="badge badge-warning">Chưa nhận bản gốc</span>'}</td>
            <td class="text-right">${scanButton(`${FILE_PREFIX[key]}_${horse.replace(/\s+/g, '_')}.pdf`, `${DOC_LABEL[key]} · ${horse}`)}</td>
        </tr>`).join('')}`).join('');
    return `
        <table class="data-table papers-table">
            <thead><tr><th colspan="3">Giấy do cơ quan chức năng cấp · công ty làm thủ tục</th></tr></thead>
            <tbody>${procedureRows}</tbody>
            <thead><tr><th colspan="3">Giấy tờ của bạn · cần gửi bản gốc</th></tr></thead>
            <tbody>${originalRows}</tbody>
        </table>
        <p class="side-hint papers-note">Bản gốc đi cùng ngựa trên xe và được trả lại khi giao ngựa.</p>`;
}

function openDoc(file, title) {
    document.getElementById('doc-title').textContent = title;
    document.getElementById('doc-body').innerHTML = `<div class="doc-preview"><i class="fa-regular fa-file-pdf"></i><div>${file}</div><div class="sub-text">Bản xem trước tài liệu</div></div>`;
    document.getElementById('docModal').style.display = 'flex';
}

function closeDoc() {
    document.getElementById('docModal').style.display = 'none';
}

// ===== Từ chối =====
function rejectedHtml(order) {
    const step = order.rejectedStep === 0 ? 'bước Tiếp nhận' : 'bước Thẩm định hồ sơ';
    return `<strong>Đơn bị từ chối ở ${step}</strong> lúc ${formatTime(order.rejectedAt)}. ${order.reason} Bạn chưa thanh toán nên không phát sinh chi phí.`;
}

// ===== Chọn phương án =====
const OPTIONS = {
    remove_horse: 'Bỏ ngựa có vấn đề, chở các con còn lại',
    replace_horse: 'Thay bằng ngựa khác',
    postpone: 'Dời ngày khởi hành để điều trị và xét nghiệm lại',
    recheck: 'Yêu cầu kiểm tra lại hồ sơ',
    cancel: 'Hủy đơn'
};

const remainingHorses = order => order.horses.filter(h => !order.offer.affected.some(name => h.startsWith(name)));
const minDepartDate = () => dayKey(new Date(today.getTime() + MIN_LEAD_DAYS * 24 * HOUR));
// Phương án Manager tự thêm có key dạng custom-F, đặt trước "Hủy đơn" để hủy luôn ở cuối
const optionKeys = order => [
    ...order.offer.options.filter(k => k !== 'cancel'),
    ...(order.offer.custom || []).map(c => `custom-${c.code}`),
    'cancel'
];
const customOption = (order, key) => (order.offer.custom || []).find(c => `custom-${c.code}` === key);
const optionLabel = (order, key) => OPTIONS[key] || customOption(order, key).label;
const requoteTotal = order => order.offer.requoteServices.reduce((t, svc) => t + svc[2], 0);

// Ảnh hưởng của từng phương án: [ngày khởi hành, chi phí, bạn cần cung cấp]
function optionImpact(order, key) {
    const depart = formatDate(order.departAt);
    switch (key) {
        case 'remove_horse': return [`Giữ nguyên ${depart}`,
            `${formatVND(requoteTotal(order))}<div class="sub-text">giảm ${formatVND(orderTotal(order) - requoteTotal(order))}</div>`, 'Không'];
        case 'replace_horse': return [`Giữ nguyên ${depart}<div class="sub-text">nếu kịp xác minh ngựa mới</div>`, 'Không đổi', 'Tên, microchip, giấy tờ ngựa mới'];
        case 'postpone': return [`Ngày mới, từ ${formatDate(new Date(minDepartDate()).getTime())}`, 'Không đổi', 'Ngày mới; kết quả xét nghiệm sau điều trị'];
        case 'recheck': return [`Giữ nguyên ${depart}`, 'Không phát sinh', 'Lý do; tài liệu (nếu có)'];
        case 'cancel': return ['Không thực hiện', 'Miễn phí', 'Không'];
        default: return ['Xem mô tả', 'Xem mô tả', 'Xem mô tả'];
    }
}

// Thông tin bổ sung hiện khi chọn phương án
function optionDetail(order, key) {
    const affected = order.offer.affected.join(', ');
    switch (key) {
        case 'remove_horse': return `
            <p class="option-desc">Đơn tiếp tục thẩm định với: <strong>${remainingHorses(order).join(', ')}</strong>. Bảng giá mới:</p>
            <table class="requote-table">
                ${order.offer.requoteServices.map(svc => `<tr><td>${svc[0]}</td><td class="text-right nowrap">${formatVND(svc[2])}</td></tr>`).join('')}
                <tr class="requote-total"><td>Tổng mới</td><td class="text-right nowrap">${formatVND(requoteTotal(order))}</td></tr>
            </table>`;
        case 'replace_horse': return `
            <p class="option-desc">Khai ngựa thay cho ${affected}. Kiểm dịch viên sẽ xác minh giấy tờ của ngựa mới trước khi duyệt đơn.</p>
            <div class="option-fields">
                <div><label class="form-label-sm" for="opt-horse-name">Tên ngựa mới *</label><input id="opt-horse-name" class="form-control"></div>
                <div><label class="form-label-sm" for="opt-horse-chip">Số microchip *</label><input id="opt-horse-chip" class="form-control"></div>
                <div class="field-full"><label class="form-label-sm" for="opt-horse-files">Giấy tờ của ngựa mới *</label><input id="opt-horse-files" type="file" class="form-control" multiple></div>
            </div>`;
        case 'postpone': return `
            <p class="option-desc">Điều trị cho ${affected}, sau đó nộp kết quả xét nghiệm lại để kiểm dịch viên xác minh.</p>
            <div class="option-fields">
                <div><label class="form-label-sm" for="opt-date">Ngày khởi hành mới * (từ ${formatDate(new Date(minDepartDate()).getTime())})</label><input id="opt-date" type="date" class="form-control" min="${minDepartDate()}"></div>
            </div>`;
        case 'recheck': return `
            <p class="option-desc">Một kiểm dịch viên khác sẽ xem lại toàn bộ hồ sơ từ đầu. Mỗi đơn chỉ được kiểm tra lại một lần.</p>
            <div class="option-fields">
                <div class="field-full"><label class="form-label-sm" for="opt-reason">Lý do bạn cho rằng kết luận chưa đúng *</label><textarea id="opt-reason" class="form-control" rows="2"></textarea></div>
                <div class="field-full"><label class="form-label-sm" for="opt-files">Tài liệu bổ sung (không bắt buộc)</label><input id="opt-files" type="file" class="form-control" multiple></div>
            </div>`;
        case 'cancel': return '<p class="option-desc">Đơn chuyển sang Đã hủy. Bạn chưa thanh toán nên không phát sinh chi phí.</p>';
        default: return `<p class="option-desc">Phương án do Quản lý đề xuất riêng cho đơn này:</p><p class="custom-detail">${customOption(order, key).detail}</p>`;
    }
}

function choicePanel(order) {
    const offer = order.offer;
    return `
        <div class="card-header">
            <h3><i class="fa-solid fa-file-circle-exclamation text-orange"></i> Phản hồi sự cố hồ sơ</h3>
            <span class="sub-text">Gửi lúc ${formatTime(offer.sentAt)}</span>
        </div>
        <div class="card-body">
            <div class="issue-summary">
                <div><span class="issue-label">Ngựa bị ảnh hưởng</span><strong>${offer.affected.join(', ')}</strong></div>
                <div><span class="issue-label">Hạn phản hồi</span><strong>${formatTime(choiceDeadline(order))}</strong><div class="sub-text">còn ${timeLeftUntil(choiceDeadline(order))}</div></div>
                <div class="issue-full"><span class="issue-label">Kết luận kiểm dịch</span>${offer.issue}</div>
            </div>
            <h4 class="option-heading">Phương án xử lý</h4>
            <div class="table-responsive">
                <table class="data-table option-table" id="option-list">
                    <thead><tr><th>Phương án</th><th>Ngày khởi hành</th><th>Chi phí</th><th>Bạn cần cung cấp</th></tr></thead>
                    <tbody>
                        ${optionKeys(order).map(key => {
                            const [depart, cost, need] = optionImpact(order, key);
                            return `
                                <tr class="option-row" data-key="${key}" onclick="selectOption('${key}')">
                                    <td><label class="option-name"><input type="radio" name="opt" value="${key}"> ${optionLabel(order, key)}</label></td>
                                    <td>${depart}</td><td class="nowrap">${cost}</td><td>${need}</td>
                                </tr>
                                <tr class="option-extra" data-key="${key}" style="display: none;"><td colspan="4">${optionDetail(order, key)}</td></tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
            <div class="choice-actions">
                <span class="sub-text">Sau khi gửi, bạn không thể đổi phương án. Cần tư vấn, gọi <strong>${HOTLINE}</strong>.</span>
                <button class="btn btn-primary" onclick="reviewChoice()">Gửi phản hồi</button>
            </div>
        </div>`;
}

function selectOption(key) {
    document.querySelector(`input[name="opt"][value="${key}"]`).checked = true;
    document.getElementById('option-list').classList.remove('input-error');
    document.querySelectorAll('.option-row').forEach(row => row.classList.toggle('selected', row.dataset.key === key));
    document.querySelectorAll('.option-extra').forEach(row => { row.style.display = row.dataset.key === key ? 'table-row' : 'none'; });
}

function markInvalid(el) {
    el.classList.add('input-error');
    el.focus();
    return null;
}

// Kiểm tra dữ liệu của phương án đã chọn; trả về { key, data } hoặc null
function readChoice() {
    const picked = document.querySelector('input[name="opt"]:checked');
    if (!picked) {
        document.getElementById('option-list').classList.add('input-error');
        showToast('Vui lòng chọn một phương án');
        return null;
    }
    const key = picked.value;
    if (key === 'replace_horse') {
        const name = document.getElementById('opt-horse-name');
        const chip = document.getElementById('opt-horse-chip');
        const files = document.getElementById('opt-horse-files');
        if (!name.value.trim()) return markInvalid(name);
        if (!chip.value.trim()) return markInvalid(chip);
        if (!files.files.length) return markInvalid(files);
        return { key, data: { name: name.value.trim(), chip: chip.value.trim(), files: files.files.length } };
    }
    if (key === 'postpone') {
        const date = document.getElementById('opt-date');
        if (!date.value || date.value < minDepartDate()) return markInvalid(date);
        return { key, data: { date: date.value } };
    }
    if (key === 'recheck') {
        const reason = document.getElementById('opt-reason');
        if (!reason.value.trim()) return markInvalid(reason);
        return { key, data: { reason: reason.value.trim(), files: document.getElementById('opt-files').files.length } };
    }
    return { key, data: {} };
}

let pendingChoice = null;

function reviewChoice() {
    pendingChoice = readChoice();
    if (!pendingChoice) return;
    const order = activeOrder;
    const { key, data } = pendingChoice;
    const effects = {
        remove_horse: `Bỏ ${order.offer.affected.join(', ')} khỏi đơn. Đơn tiếp tục thẩm định với ${remainingHorses(order).join(', ')}, giá mới ${formatVND(requoteTotal(order))}.`,
        replace_horse: `Thay ${order.offer.affected.join(', ')} bằng ${data.name} (microchip ${data.chip}), kèm ${data.files} tệp giấy tờ. Kiểm dịch viên sẽ xác minh ngựa mới.`,
        postpone: `Dời ngày khởi hành từ ${formatDate(order.departAt)} sang ${formatDate(new Date(data.date).getTime())}. Bạn cần nộp kết quả xét nghiệm lại sau khi điều trị.`,
        recheck: 'Một kiểm dịch viên khác sẽ xem lại hồ sơ từ đầu. Nếu vấn đề vẫn còn, bạn sẽ nhận lại các phương án còn lại (trừ kiểm tra lại).',
        cancel: 'Đơn chuyển sang Đã hủy, không phát sinh chi phí. Không thể khôi phục; muốn vận chuyển lại cần đặt đơn mới.'
    };
    document.getElementById('ch-title').textContent = `Xác nhận phản hồi · ${order.id}`;
    document.getElementById('ch-body').innerHTML = `
        <p class="cancel-lead">Phương án: <strong>${optionLabel(order, key)}</strong></p>
        <ul class="cancel-effects"><li><i class="fa-solid fa-circle-info" style="color: #1d4ed8;"></i> <span>${effects[key] || `${customOption(order, key).detail} Quản lý sẽ thực hiện theo mô tả này và cập nhật đơn.`}</span></li></ul>`;
    document.getElementById('ch-confirm').className = key === 'cancel' ? 'btn btn-danger-solid' : 'btn btn-primary';
    document.getElementById('choiceModal').style.display = 'flex';
}

function closeChoice() {
    document.getElementById('choiceModal').style.display = 'none';
}

function applyChoice() {
    const order = activeOrder;
    const { key, data } = pendingChoice;
    const affected = order.offer.affected.join(', ');
    if (key === 'remove_horse') {
        order.horses = remainingHorses(order);
        order.services = order.offer.requoteServices;
        order.note = `Đã bỏ ${affected} khỏi đơn, giá đã cập nhật.`;
        order.status = 'processing';
    } else if (key === 'replace_horse') {
        order.horses = [...remainingHorses(order), `${data.name} (khai mới, microchip ${data.chip})`];
        order.note = `Đã thay ${affected} bằng ${data.name}. Kiểm dịch viên đang xác minh giấy tờ ngựa mới.`;
        order.status = 'processing';
    } else if (key === 'postpone') {
        order.departAt = new Date(data.date).setHours(0, 0, 0, 0);
        order.note = `Đã dời ngày khởi hành. Vui lòng nộp kết quả xét nghiệm lại của ${affected} sau khi điều trị.`;
        order.status = 'processing';
    } else if (key === 'recheck') {
        order.status = 'rechecking';
        order.recheckAt = Date.now();
    } else if (customOption(order, key)) {
        order.note = `Bạn đã chọn phương án "${customOption(order, key).label}". Quản lý đang cập nhật đơn theo phương án này.`;
        order.status = 'processing';
    } else {
        order.status = 'cancelled';
        order.reason = `Bạn đã hủy đơn lúc ${formatTime(Date.now())} theo phương án xử lý hồ sơ. Không phát sinh chi phí.`;
    }
    delete order.offer;
    closeChoice();
    showToast(`Đã ghi nhận phản hồi cho đơn ${order.id}`);
    showDetail(order.id);
}

// Khách hủy đơn quá hạn thẩm định
function cancelOverdue() {
    const order = activeOrder;
    document.getElementById('c-order').textContent = order.id;
    document.getElementById('c-body').innerHTML = `
        <p class="cancel-lead">Đơn đang được xử lý ưu tiên, cam kết có kết quả trước <strong>${formatTime(priorityDeadline(order))}</strong>. Nếu hủy:</p>
        <ul class="cancel-effects">
            <li><i class="fa-solid fa-circle-check"></i> <span><strong>Không mất phí</strong> — bạn chưa thanh toán cho đơn này.</span></li>
            <li><i class="fa-solid fa-circle-xmark"></i> <span>Đơn chuyển sang <strong>Đã hủy</strong>, chuyến ngày <strong>${formatDate(order.departAt)}</strong> sẽ không được thực hiện.</span></li>
            <li><i class="fa-solid fa-circle-xmark"></i> <span>Không thể khôi phục. Muốn vận chuyển lại, bạn cần đặt đơn mới.</span></li>
        </ul>`;
    document.getElementById('cancelModal').style.display = 'flex';
}

function closeCancel() {
    document.getElementById('cancelModal').style.display = 'none';
}

function confirmCancel() {
    activeOrder.status = 'cancelled';
    activeOrder.reason = `Bạn đã hủy đơn lúc ${formatTime(Date.now())} do quá hạn thẩm định (hạn ${formatTime(appraisalDeadline(activeOrder))}). Không phát sinh chi phí.`;
    closeCancel();
    showToast(`Đã hủy đơn ${activeOrder.id}. Không phát sinh chi phí.`);
    showDetail(activeOrder.id);
}

// ===== Thanh toán =====
function openPay() {
    const order = activeOrder;
    document.getElementById('p-order').textContent = order.id;
    document.getElementById('p-body').innerHTML = `
        <div class="pay-amount">
            <span>Số tiền cần thanh toán</span>
            <strong>${formatVND(orderTotal(order))}</strong>
            <span class="deadline-sub">Hạn: ${formatTime(paymentDeadline(order))}</span>
        </div>
        <div class="pay-methods">
            <label class="pay-method"><input type="radio" name="pay-method" value="bank" checked onchange="renderPayMethod()"> <i class="fa-solid fa-building-columns"></i> Chuyển khoản ngân hàng</label>
            <label class="pay-method"><input type="radio" name="pay-method" value="qr" onchange="renderPayMethod()"> <i class="fa-solid fa-qrcode"></i> Quét mã QR</label>
        </div>
        <div id="pay-method-body"></div>`;
    renderPayMethod();
    document.getElementById('payModal').style.display = 'flex';
}

function renderPayMethod() {
    const method = document.querySelector('input[name="pay-method"]:checked').value;
    const order = activeOrder;
    document.getElementById('pay-method-body').innerHTML = method === 'bank'
        ? `<div class="bank-box">
            ${infoRow('Ngân hàng', BANK.name)}
            ${infoRow('Số tài khoản', BANK.account)}
            ${infoRow('Chủ tài khoản', BANK.owner)}
            ${infoRow('Số tiền', formatVND(orderTotal(order)))}
            ${infoRow('Nội dung chuyển khoản', `<span class="text-orange">${order.id}</span>`)}
            <p class="side-hint">Ghi đúng nội dung chuyển khoản là mã đơn để hệ thống tự đối soát.</p>
           </div>`
        : `<div class="qr-box">
            <div class="qr-placeholder"><i class="fa-solid fa-qrcode"></i></div>
            <p class="side-hint">Mở ứng dụng ngân hàng và quét mã. Số tiền và nội dung <strong>${order.id}</strong> đã được điền sẵn.</p>
           </div>`;
}

function closePay() {
    document.getElementById('payModal').style.display = 'none';
}

function confirmPay() {
    activeOrder.status = 'paid';
    activeOrder.paidAt = Date.now();
    closePay();
    showToast(`Đã ghi nhận thanh toán đơn ${activeOrder.id}. Hợp đồng điện tử đã gửi qua email.`);
    showDetail(activeOrder.id);
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-success';
    toast.innerHTML = `<i class="fa-solid fa-check"></i> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

renderList();
