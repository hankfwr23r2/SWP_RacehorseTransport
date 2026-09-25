// ===== Dữ liệu mẫu =====
// Manager là người đầu tiên thấy đơn khách gửi. Tại đây manager:
//  - Tiếp nhận: xác nhận Kiểm dịch viên & Điều phối viên do hệ thống gợi ý (có thể đổi người)
//  - Hoặc từ chối sớm dựa trên THÔNG TIN KHÁCH KHAI (trùng đơn, tự khai không phải ngựa đua, khai mâu thuẫn)
//  - Xử lý các việc chuyển lên từ kiểm dịch (tab "Cần Manager xử lý"):
//      + issue:   kiểm dịch BÁO CÁO VẤN ĐỀ không khắc phục được → Manager chọn phương án gửi khách chọn trong 48 giờ
//      + recheck: khách chọn phương án D (kiểm tra lại) → Manager giao kiểm dịch viên KHÁC
//      + expired: khách không chọn phương án trong 48 giờ → Manager quyết định TỪ CHỐI đơn
//  - Chỉ Manager được từ chối đơn. Kiểm dịch viên không từ chối.
// Phương án cho khách:
//   A. Bỏ ngựa có vấn đề (còn ít nhất 1 ngựa không bị ảnh hưởng)  B. Thay ngựa khác
//   C. Dời ngày khởi hành (chỉ khi bệnh chữa được)                D. Kiểm tra lại (1 lần)
//   E. Hủy đơn miễn phí (luôn có)
// status: new | needs_manager (pending.kind: issue | recheck | expired) | inspecting | routing | rejected

// Giấy tờ khách nộp (giấy chứng nhận kiểm dịch do kiểm dịch viên xin sau khi khách thanh toán)
const DOCS_DOMESTIC = [
    'Hộ chiếu ngựa / Microchip',
    'Giấy chứng nhận tiêm phòng',
    'Giấy tờ chứng minh sở hữu'
];

const DOCS_CROSS_BORDER = [
    'Hộ chiếu ngựa / Microchip',
    'Giấy chứng nhận tiêm phòng',
    'Kết quả xét nghiệm EIA & cúm ngựa',
    'Giấy phép nhập khẩu của nước đến',
    'Giấy tờ chứng minh sở hữu'
];

const CHOICE_HOURS = 48;
const HOUR = 60 * 60 * 1000;
const now = Date.now();

const MIN_LEAD_DAYS = 10;

// load = số đơn đang xử lý, dùng để gợi ý người ít việc nhất
// off = true: đang nghỉ (báo nghỉ ở trang Nhân sự & Điều chuyển), không được gợi ý nhận đơn mới
const inspectors = [
    { name: 'Phạm Văn Hưng', load: 3 },
    { name: 'Nguyễn Thị Thu', load: 2 }
];

const coordinators = [
    { name: 'Trần Minh', load: 4 },
    { name: 'Lê Quang', load: 3, off: true },
    { name: 'Phạm Tâm', load: 2 }
];

const orders = [
    {
        id: 'EQ-2026-1052', customer: 'Trang trại Tây Ninh Stud', submitted: '24/09/2026 08:15', depart: '08/10/2026',
        from: 'Trang trại Tây Ninh Stud (Tây Ninh, VN)', to: 'Trường đua Phnom Penh Royal Turf (Phnom Penh, KH)',
        routeShort: 'Tây Ninh → Phnom Penh (KH)', border: 'Mộc Bài – Bavet', distance: '180 km', duration: '~5 giờ',
        horses: [
            { name: 'Bà Đen', breed: 'Thoroughbred', sex: 'Cái', chip: 'VN-610118' },
            { name: 'Vàm Cỏ', breed: 'Thoroughbred', sex: 'Đực', chip: 'VN-610125' }
        ],
        customerNote: 'Ngựa Vàm Cỏ nhạy cảm tiếng ồn, đề nghị xếp ngăn cuối xe.',
        hold: '1 xe chuyên dụng 2 ngăn',
        priceItems: [['Cước vận chuyển đường bộ', 12500000], ['Phí kiểm dịch & thủ tục xuất cảnh', 6500000], ['Chăm sóc ngựa dọc đường', 1200000], ['Bảo hiểm vận chuyển', 1300000]],
        status: 'new'
    },
    {
        id: 'EQ-2026-1051', customer: 'CLB Ngựa Hà Thành', submitted: '24/09/2026 07:40', depart: '10/10/2026',
        from: 'Trường đua Thiên Mã (Sóc Sơn, Hà Nội, VN)', to: 'Trường đua Sông Hàn (Đà Nẵng, VN)',
        routeShort: 'Hà Nội → Đà Nẵng', border: null, distance: '770 km', duration: '2 ngày',
        horses: [
            { name: 'Thăng Long', breed: 'Thoroughbred', sex: 'Đực', chip: 'VN-118830' },
            { name: 'Hồ Gươm', breed: 'Arabian', sex: 'Cái', chip: 'VN-118847' },
            { name: 'Long Biên', breed: 'Anglo-Arab', sex: 'Thiến', chip: 'VN-118852' }
        ],
        customerNote: '',
        hold: '1 xe chuyên dụng 4 ngăn',
        priceItems: [['Cước vận chuyển đường bộ', 27000000], ['Phí kiểm dịch nội địa', 2500000], ['Chăm sóc ngựa dọc đường', 3800000], ['Bảo hiểm vận chuyển', 2700000]],
        status: 'new'
    },
    {
        id: 'EQ-2026-1050', customer: 'Luang Prabang Racing', submitted: '23/09/2026 21:05', depart: '12/10/2026',
        from: 'Trường đua Luang Prabang (Luang Prabang, LA)', to: 'Trường đua Thiên Mã (Sóc Sơn, Hà Nội, VN)',
        routeShort: 'Luang Prabang (LA) → Hà Nội', border: 'Sop Hun – Tây Trang', distance: '620 km', duration: '2 ngày',
        horses: [
            { name: 'Mount Phousi', breed: 'Arabian', sex: 'Đực', chip: 'LA-305512' }
        ],
        customerNote: 'Đường đèo nhiều, đề nghị có điểm nghỉ cho ngựa giữa chặng.',
        hold: '1 xe chuyên dụng 2 ngăn',
        priceItems: [['Cước vận chuyển đường bộ', 19000000], ['Phí kiểm dịch & thủ tục nhập cảnh', 5500000], ['Chăm sóc ngựa dọc đường', 2000000], ['Bảo hiểm vận chuyển', 1500000]],
        status: 'new'
    },
    {
        id: 'EQ-2026-1049', customer: 'CLB Ngựa đua Long Thành', submitted: '23/09/2026 16:30', depart: '06/10/2026',
        from: 'Trang trại Long Thành (Đồng Nai, VN)', to: 'Trường đua Phnom Penh Royal Turf (Phnom Penh, KH)',
        routeShort: 'Đồng Nai → Phnom Penh (KH)', border: 'Mộc Bài – Bavet', distance: '290 km', duration: '~7 giờ',
        horses: [
            { name: 'Storm Runner', breed: 'Thoroughbred', sex: 'Thiến', chip: 'VN-985211' },
            { name: 'Bạch Phong', breed: 'Arabian', sex: 'Cái', chip: 'VN-985347' }
        ],
        customerNote: '',
        hold: '1 xe chuyên dụng 4 ngăn',
        warning: 'Có thể trùng đơn EQ-2026-1042: cùng khách hàng, cùng 2 ngựa (chip VN-985211, VN-985347), cùng ngày khởi hành 06/10/2026.',
        priceItems: [['Cước vận chuyển đường bộ', 17000000], ['Phí kiểm dịch & thủ tục xuất cảnh', 6500000], ['Chăm sóc ngựa dọc đường', 1500000], ['Bảo hiểm vận chuyển', 1500000]],
        status: 'new'
    },
    {
        id: 'EQ-2026-1048', customer: 'Đại Nam Racing', submitted: '23/09/2026 10:20', depart: '05/10/2026',
        from: 'Trường đua Đại Nam (Bình Dương, VN)', to: 'Trang trại Mekong (Cần Thơ, VN)',
        routeShort: 'Bình Dương → Cần Thơ', border: null, distance: '190 km', duration: '~4.5 giờ',
        horses: [
            { name: 'Hỏa Tiễn', breed: 'Thoroughbred', sex: 'Đực', chip: 'VN-420017' },
            { name: 'Ngân Hà', breed: 'Thoroughbred', sex: 'Cái', chip: 'VN-420023' }
        ],
        customerNote: '',
        hold: '1 xe chuyên dụng 2 ngăn',
        priceItems: [['Cước vận chuyển đường bộ', 8000000], ['Phí kiểm dịch nội địa', 1500000], ['Chăm sóc ngựa dọc đường', 700000], ['Bảo hiểm vận chuyển', 800000]],
        status: 'new'
    },
    {
        id: 'EQ-2026-1047', customer: 'Royal Cambodia Stables', submitted: '22/09/2026 09:10', depart: '04/10/2026',
        from: 'Trường đua Phnom Penh Royal Turf (Phnom Penh, KH)', to: 'Trường đua Phú Thọ (TP.HCM, VN)',
        routeShort: 'Phnom Penh (KH) → TP.HCM', border: 'Bavet – Mộc Bài', distance: '230 km', duration: '~6 giờ',
        horses: [
            { name: 'Tonle Sap', breed: 'Thoroughbred', sex: 'Đực', chip: 'KH-220417' }
        ],
        customerNote: '',
        hold: '1 xe chuyên dụng 2 ngăn',
        priceItems: [['Cước vận chuyển đường bộ', 9500000], ['Phí kiểm dịch & thủ tục nhập cảnh', 6000000], ['Chăm sóc ngựa dọc đường', 800000], ['Bảo hiểm vận chuyển', 900000]],
        status: 'inspecting', acceptedAt: '22/09/2026 10:05', inspector: 'Phạm Văn Hưng', coordinator: 'Lê Quang',
        waitingChoice: { options: ['replace_horse', 'recheck', 'cancel'], sentAt: now - 5 * HOUR }
    },
    {
        id: 'EQ-2026-1046', customer: 'Savan Horse Club', submitted: '21/09/2026 15:45', depart: '03/10/2026',
        from: 'Trường đua Savannakhet (Savannakhet, LA)', to: 'Trường đua Sông Hàn (Đà Nẵng, VN)',
        routeShort: 'Savannakhet (LA) → Đà Nẵng', border: 'Densavanh – Lao Bảo', distance: '500 km', duration: '~11 giờ',
        horses: [
            { name: 'Mekong Wind', breed: 'Arabian', sex: 'Cái', chip: 'LA-118903' },
            { name: 'Sepon', breed: 'Thoroughbred', sex: 'Đực', chip: 'LA-118917' }
        ],
        customerNote: '',
        hold: '1 xe chuyên dụng 2 ngăn',
        priceItems: [['Cước vận chuyển đường bộ', 16000000], ['Phí kiểm dịch & thủ tục nhập cảnh', 8500000], ['Chăm sóc ngựa dọc đường', 2200000], ['Bảo hiểm vận chuyển', 1800000]],
        status: 'inspecting', acceptedAt: '21/09/2026 17:20', inspector: 'Nguyễn Thị Thu', coordinator: 'Trần Minh', waitingCustomer: true
    },
    {
        id: 'EQ-2026-1045', customer: 'CLB Ngựa Phú Thọ', submitted: '20/09/2026 11:00', depart: '02/10/2026',
        from: 'Trường đua Phú Thọ (TP.HCM, VN)', to: 'Trường đua Angkor (Siem Reap, KH)',
        routeShort: 'TP.HCM → Siem Reap (KH)', border: 'Mộc Bài – Bavet', distance: '550 km', duration: '2 ngày',
        horses: [
            { name: 'Xích Thố', breed: 'Thoroughbred', sex: 'Đực', chip: 'VN-503311' },
            { name: 'Ô Vân', breed: 'Thoroughbred', sex: 'Cái', chip: 'VN-503328' },
            { name: 'Tuyết Sơn', breed: 'Arabian', sex: 'Cái', chip: 'VN-503340' }
        ],
        customerNote: '',
        hold: '1 xe chuyên dụng 4 ngăn',
        priceItems: [['Cước vận chuyển đường bộ', 28000000], ['Phí kiểm dịch & thủ tục xuất cảnh', 9500000], ['Chăm sóc ngựa dọc đường', 3500000], ['Bảo hiểm vận chuyển', 3000000]],
        status: 'routing', acceptedAt: '20/09/2026 13:30', inspector: 'Phạm Văn Hưng', coordinator: 'Phạm Tâm'
    },
    {
        id: 'EQ-2026-1044', customer: 'Trường đua Thiên Mã', submitted: '19/09/2026 14:25', depart: '01/10/2026',
        from: 'Trường đua Thiên Mã (Sóc Sơn, Hà Nội, VN)', to: 'Vientiane Turf Club (Viêng Chăn, LA)',
        routeShort: 'Hà Nội → Viêng Chăn (LA)', border: 'Cầu Treo – Nam Phao', distance: '730 km', duration: '2 ngày',
        horses: [
            { name: 'Kim Ô', breed: 'Anglo-Arab', sex: 'Thiến', chip: 'VN-771089' }
        ],
        customerNote: '',
        hold: '1 xe chuyên dụng 2 ngăn',
        priceItems: [['Cước vận chuyển đường bộ', 21000000], ['Phí kiểm dịch & thủ tục xuất cảnh', 4500000], ['Chăm sóc ngựa dọc đường', 1800000], ['Bảo hiểm vận chuyển', 1200000]],
        status: 'routing', acceptedAt: '19/09/2026 16:00', inspector: 'Nguyễn Thị Thu', coordinator: 'Lê Quang'
    },
    {
        id: 'EQ-2026-1043', customer: 'HKD Du lịch Ngựa Bình Định', submitted: '18/09/2026 08:50', depart: '30/09/2026',
        from: 'Quy Nhơn (Bình Định, VN)', to: 'Trường đua Sông Hàn (Đà Nẵng, VN)',
        routeShort: 'Quy Nhơn → Đà Nẵng', border: null, distance: '320 km', duration: '~7 giờ',
        horses: [
            { name: 'Ngựa kéo số 1', breed: 'Ngựa nội (kéo xe)', sex: 'Đực', chip: 'VN-077001' },
            { name: 'Ngựa kéo số 2', breed: 'Ngựa nội (kéo xe)', sex: 'Cái', chip: 'VN-077002' }
        ],
        customerNote: '',
        hold: '1 xe chuyên dụng 2 ngăn',
        priceItems: [['Cước vận chuyển đường bộ', 11000000], ['Phí kiểm dịch nội địa', 1500000], ['Chăm sóc ngựa dọc đường', 900000], ['Bảo hiểm vận chuyển', 800000]],
        status: 'rejected', rejectedStep: 0, rejectedAt: now - 6 * 24 * HOUR, rejectType: 'Ngựa không thuộc diện vận chuyển',
        note: 'Hệ thống chỉ nhận vận chuyển ngựa đua. 2 ngựa khai báo là ngựa kéo xe du lịch.'
    },
    {
        // Kiểm dịch báo cáo vấn đề không khắc phục được → Manager chọn phương án
        id: 'EQ-2026-1072', customer: 'Mekong Stud', submitted: '22/09/2026 15:10', depart: '07/10/2026',
        from: 'Trang trại Mekong (Cần Thơ, VN)', to: 'Trường đua Phnom Penh Royal Turf (Phnom Penh, KH)',
        routeShort: 'Cần Thơ → Phnom Penh (KH)', border: 'Tịnh Biên – Phnom Den', distance: '250 km', duration: '~6 giờ',
        horses: [{ name: 'Cửu Long', breed: 'Thoroughbred', sex: 'Đực', chip: 'VN-812004' }],
        customerNote: '', hold: '1 xe chuyên dụng 2 ngăn',
        priceItems: [['Cước vận chuyển đường bộ', 12000000], ['Phí kiểm dịch & thủ tục xuất cảnh', 4500000], ['Chăm sóc ngựa dọc đường', 1300000], ['Bảo hiểm vận chuyển', 1200000]],
        status: 'needs_manager', acceptedAt: '22/09/2026 16:00', inspector: 'Nguyễn Thị Thu', coordinator: 'Phạm Tâm',
        pending: {
            kind: 'issue', at: now - 2 * HOUR,
            report: {
                inspector: 'Nguyễn Thị Thu', horses: ['Cửu Long'], type: 'Xét nghiệm dương tính bệnh truyền nhiễm', disease: 'Cúm ngựa', curable: true,
                note: 'Cửu Long dương tính cúm ngựa. Cần điều trị khoảng 2–3 tuần rồi xét nghiệm lại.',
                evidence: ['Cửu Long · Kết quả xét nghiệm EIA & cúm ngựa']
            }
        }
    },
    {
        // Khách chọn phương án D (kiểm tra lại) → Manager giao kiểm dịch viên khác
        id: 'EQ-2026-1070', customer: 'Trường đua Thiên Mã', submitted: '21/09/2026 10:30', depart: '09/10/2026',
        from: 'Trường đua Thiên Mã (Sóc Sơn, Hà Nội, VN)', to: 'Vientiane Turf Club (Viêng Chăn, LA)',
        routeShort: 'Hà Nội → Viêng Chăn (LA)', border: 'Cầu Treo – Nam Phao', distance: '730 km', duration: '2 ngày',
        horses: [{ name: 'Phi Vân', breed: 'Anglo-Arab', sex: 'Cái', chip: 'VN-771120' }],
        customerNote: '', hold: '1 xe chuyên dụng 2 ngăn',
        priceItems: [['Cước vận chuyển đường bộ', 21000000], ['Phí kiểm dịch & thủ tục xuất cảnh', 4500000], ['Chăm sóc ngựa dọc đường', 1800000], ['Bảo hiểm vận chuyển', 1200000]],
        status: 'needs_manager', acceptedAt: '21/09/2026 11:00', inspector: 'Nguyễn Thị Thu', coordinator: 'Trần Minh',
        pending: {
            kind: 'recheck', at: now - 1 * HOUR,
            report: {
                inspector: 'Nguyễn Thị Thu', horses: ['Phi Vân'], type: 'Xét nghiệm dương tính bệnh truyền nhiễm', disease: 'EIA', curable: false,
                note: 'Phiếu xét nghiệm của Phi Vân ghi EIA dương tính.',
                evidence: ['Phi Vân · Kết quả xét nghiệm EIA & cúm ngựa']
            },
            customerReason: 'Phiếu xét nghiệm cũ bị nhầm mẫu. Trại đã xét nghiệm lại tại phòng xét nghiệm khác, kết quả âm tính.',
            customerFiles: ['Xet_nghiem_lai_Phi_Van.pdf']
        }
    },
    {
        // Khách không chọn phương án trong 48 giờ → Manager quyết định từ chối
        id: 'EQ-2026-1075', customer: 'CLB Ngựa Hà Thành', submitted: '19/09/2026 08:20', depart: '06/10/2026',
        from: 'Trường đua Thiên Mã (Sóc Sơn, Hà Nội, VN)', to: 'Trường đua Sông Hàn (Đà Nẵng, VN)',
        routeShort: 'Hà Nội → Đà Nẵng', border: null, distance: '770 km', duration: '2 ngày',
        horses: [
            { name: 'Thăng Long', breed: 'Thoroughbred', sex: 'Đực', chip: 'VN-118830' },
            { name: 'Hồ Gươm', breed: 'Arabian', sex: 'Cái', chip: 'VN-118847' }
        ],
        customerNote: '', hold: '1 xe chuyên dụng 2 ngăn',
        priceItems: [['Cước vận chuyển đường bộ', 18000000], ['Phí kiểm dịch nội địa', 1800000], ['Chăm sóc ngựa dọc đường', 2600000], ['Bảo hiểm vận chuyển', 1800000]],
        status: 'needs_manager', acceptedAt: '19/09/2026 09:00', inspector: 'Phạm Văn Hưng', coordinator: 'Phạm Tâm',
        pending: {
            kind: 'expired', at: now - 50 * HOUR,
            report: {
                inspector: 'Phạm Văn Hưng', horses: ['Thăng Long'], type: 'Đã yêu cầu bổ sung nhưng giấy tờ vẫn không đạt', disease: '', curable: null,
                note: 'Đã yêu cầu bổ sung 2 lần, giấy tiêm phòng của Thăng Long vẫn thiếu mũi cúm ngựa bắt buộc.',
                evidence: ['Thăng Long · Giấy chứng nhận tiêm phòng']
            },
            offer: { options: ['remove_horse', 'replace_horse', 'recheck', 'cancel'], sentAt: now - 50 * HOUR }
        }
    },
    {
        // Đã từ chối: khách không chọn phương án trong 48 giờ
        id: 'EQ-2026-1069', customer: 'HKD Du lịch Ngựa Quy Nhơn', submitted: '17/09/2026 09:40', depart: '02/10/2026',
        from: 'Quy Nhơn (Bình Định, VN)', to: 'Trường đua Sông Hàn (Đà Nẵng, VN)',
        routeShort: 'Quy Nhơn → Đà Nẵng', border: null, distance: '320 km', duration: '~7 giờ',
        horses: [{ name: 'Ngựa kéo số 3', breed: 'Thoroughbred (khách khai)', sex: 'Đực', chip: 'VN-077003' }],
        customerNote: '', hold: '1 xe chuyên dụng 2 ngăn',
        priceItems: [['Cước vận chuyển đường bộ', 6500000], ['Phí kiểm dịch nội địa', 900000], ['Chăm sóc ngựa dọc đường', 500000], ['Bảo hiểm vận chuyển', 500000]],
        status: 'rejected', rejectedStep: 1, inspector: 'Phạm Văn Hưng', rejectedAt: now - 3 * 24 * HOUR,
        rejectType: 'Khách không chọn phương án trong 48 giờ',
        note: 'Đã gửi phương án thay ngựa / kiểm tra lại / hủy đơn, khách không phản hồi.',
        report: {
            inspector: 'Phạm Văn Hưng', horses: ['Ngựa kéo số 3'], type: 'Đã yêu cầu bổ sung nhưng giấy tờ vẫn không đạt',
            note: 'Khách không cung cấp được giấy tờ chứng minh là ngựa đua; hộ chiếu ghi ngựa kéo xe du lịch.'
        }
    }
];

// ===== Tiện ích =====
const sum = items => items.reduce((total, item) => total + item[1], 0);
const formatVND = n => n.toLocaleString('en-US') + ' VND';

function parseDate(text) {
    const [d, m, y] = text.split(' ')[0].split('/').map(Number);
    return new Date(y, m - 1, d);
}

function nowText() {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

// Phương án cho khách; eligible trả về lý do KHÔNG áp dụng được (chuỗi rỗng = áp dụng được)
const OPTIONS = {
    remove_horse: { code: 'A', label: 'Bỏ ngựa có vấn đề, chở các con còn lại', why: o => o.horses.length > o.pending.report.horses.length ? '' : 'Đơn không còn ngựa nào khác ngoài ngựa có vấn đề' },
    replace_horse: { code: 'B', label: 'Thay bằng ngựa khác', why: () => '' },
    postpone: { code: 'C', label: 'Dời ngày khởi hành để điều trị và xét nghiệm lại', why: o => o.pending.report.curable ? '' : 'Chỉ áp dụng khi bệnh chữa được' },
    recheck: { code: 'D', label: 'Kiểm tra lại (kiểm dịch viên khác)', why: o => o.rechecked ? 'Đơn đã được kiểm tra lại 1 lần' : '' },
    cancel: { code: 'E', label: 'Hủy đơn miễn phí', why: () => '', mandatory: true }
};
const optionText = (keys, custom = []) => [
    ...keys.map(k => `${OPTIONS[k].code}. ${OPTIONS[k].label}`),
    ...custom.map(c => `${c.code}. ${c.label}`)
].join(' · ');
// Phương án do Manager tự thêm được đánh mã tiếp sau E
const customCode = i => String.fromCharCode('F'.charCodeAt(0) + i);

function formatTs(t) {
    const d = new Date(t);
    const pad = n => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Người đang ít việc nhất
function suggest(staff) {
    return staff.reduce((best, s) => (s.load < best.load ? s : best));
}

// ===== Bảng =====
let currentTab = 'new';
let activeOrder = null;

function assigneeText(order) {
    if (order.status === 'new') return '<span class="text-muted">Chưa phân công</span>';
    if (order.status === 'needs_manager') return {
        issue: '<span class="badge badge-warning">Chọn phương án gửi khách</span>',
        recheck: '<span class="badge badge-warning">Giao kiểm tra lại</span>',
        expired: '<span class="badge badge-danger">Khách quá hạn chọn</span>'
    }[order.pending.kind];
    if (order.status === 'inspecting') {
        const sub = order.waitingChoice
            ? `Chờ khách chọn phương án · còn ${Math.max(0, Math.ceil((order.waitingChoice.sentAt + CHOICE_HOURS * HOUR - Date.now()) / HOUR))} giờ`
            : order.review ? 'Kiểm tra lại' : order.waitingCustomer ? 'Chờ khách bổ sung' : '';
        return `<i class="fa-solid fa-user-doctor text-muted"></i> ${order.inspector}${sub ? `<div class="route-border">${sub}</div>` : ''}`;
    }
    if (order.status === 'routing') return `<i class="fa-solid fa-route text-muted"></i> ${order.coordinator}`;
    return `<span class="text-muted">Manager · bước ${order.rejectedStep === 0 ? 'Tiếp nhận' : 'Kiểm dịch'}</span>`;
}

function renderTable() {
    const tbody = document.getElementById('order-table-body');
    tbody.innerHTML = orders.map((order, index) => {
        const button = order.status === 'new' || order.status === 'needs_manager'
            ? `<button class="btn btn-orange btn-sm" onclick="openModal(${index})">${order.status === 'new' ? 'Tiếp nhận' : 'Xử lý'}</button>`
            : `<button class="btn btn-light btn-sm" onclick="openModal(${index})"><i class="fa-solid fa-eye"></i> Xem</button>`;
        return `
            <tr data-status="${order.status}">
                <td class="font-semibold nowrap" style="color: #ea580c;">${order.id}${order.warning ? ' <i class="fa-solid fa-triangle-exclamation text-amber" title="Có cảnh báo"></i>' : ''}</td>
                <td class="text-muted">${order.customer}</td>
                <td>${order.routeShort}${order.border ? '<div class="route-border"><i class="fa-solid fa-flag"></i> ' + order.border + '</div>' : ''}</td>
                <td class="text-muted">${order.horses.length}</td>
                <td class="text-muted nowrap">${order.submitted.split(' ')[0]}<div class="route-border">${order.submitted.split(' ')[1]}</div></td>
                <td class="text-muted">${order.depart}</td>
                <td class="text-right font-semibold nowrap">${formatVND(sum(order.priceItems))}</td>
                <td>${assigneeText(order)}</td>
                <td class="text-right nowrap">${button}</td>
            </tr>`;
    }).join('');
    updateCounts();
    paginateTable();
}

function switchTab(tab) {
    currentTab = tab;
    currentPage = 1;

    document.querySelectorAll('.status-tab').forEach(t => {
        t.classList.toggle('active-tab', t.getAttribute('data-tab') === tab);
    });

    paginateTable();
}

function updateCounts() {
    ['new', 'needs_manager', 'inspecting', 'routing', 'rejected'].forEach(status => {
        document.getElementById('count-' + status).textContent = orders.filter(o => o.status === status).length;
    });
}

// ===== Modal =====
// Nội dung banner cho đơn đã bị từ chối: ai từ chối, ở bước nào, căn cứ, tình trạng khiếu nại
function rejectedBannerHtml(order) {
    const step = order.rejectedStep === 0 ? 'bước Tiếp nhận' : 'bước Kiểm dịch';
    const report = order.report ? `<br>Báo cáo kiểm dịch (${order.report.inspector}): ${order.report.type} — ${order.report.note}` : '';
    return `<b>Manager từ chối</b> ở ${step} lúc ${formatTs(order.rejectedAt)} — <b>${order.rejectType}</b>: ${order.note}${report}`;
}

function infoItem(label, value) {
    return `<div class="info-item"><span class="info-label">${label}</span><span class="info-value">${value}</span></div>`;
}

function renderStepper(order) {
    const steps = ['Tiếp nhận', 'Kiểm dịch', 'Lập lộ trình', 'Phê duyệt'];
    const status = order.status;
    const current = { new: 0, needs_manager: 1, inspecting: 1, routing: 2 }[status];
    const rejectedStep = order.rejectedStep || 0;
    return steps.map((label, i) => {
        let cls = 'step';
        if (status === 'rejected') cls += i < rejectedStep ? ' step-done' : i === rejectedStep ? ' step-rejected' : '';
        else if (i < current) cls += ' step-done';
        else if (i === current) cls += ' step-current';
        const icon = cls.includes('done') ? '<i class="fa-solid fa-check"></i>' : cls.includes('rejected') ? '<i class="fa-solid fa-xmark"></i>' : i + 1;
        return `<div class="${cls}"><span class="step-dot">${icon}</span><span class="step-label">${label}</span></div>`;
    }).join('<div class="step-line"></div>');
}

const available = staff => staff.filter(s => !s.off);

function staffSelect(id, allStaff, roleLabel) {
    const staff = available(allStaff);
    if (!staff.length) {
        return `<div class="status-banner banner-danger"><i class="fa-solid fa-user-slash"></i><span>Không còn ${roleLabel} nào đang làm việc.</span></div>`;
    }
    const best = suggest(staff);
    const options = [...staff].sort((a, b) => a.load - b.load).map(s =>
        `<option value="${s.name}" ${s === best ? 'selected' : ''}>${s.name} — ${s.load} đơn đang xử lý${s === best ? ' (gợi ý)' : ''}</option>`
    ).join('');
    return `<select id="${id}" class="action-input">${options}</select>`;
}

function openModal(index) {
    const order = orders[index];
    activeOrder = order;
    const docs = order.border ? DOCS_CROSS_BORDER : DOCS_DOMESTIC;

    document.getElementById('m-order-id').textContent = order.id;
    document.getElementById('m-order-sub').textContent = `${order.customer} · Gửi lúc ${order.submitted}`;
    document.getElementById('m-stepper').innerHTML = renderStepper(order);

    // Trạng thái đơn đã xử lý
    const banner = document.getElementById('m-status-banner');
    const banners = {
        inspecting: ['banner-info', 'fa-hourglass-half', order.waitingChoice
            ? `Đã gửi phương án cho khách lúc ${formatTs(order.waitingChoice.sentAt)}: ${optionText(order.waitingChoice.options, order.waitingChoice.custom)}. Hạn khách chọn: <b>${formatTs(order.waitingChoice.sentAt + CHOICE_HOURS * HOUR)}</b>.`
            : order.review
                ? `Đang kiểm tra lại theo yêu cầu của khách. Kiểm dịch viên <b>${order.inspector}</b> xác minh lại từ đầu.`
                : order.waitingCustomer
                    ? `Kiểm dịch viên <b>${order.inspector}</b> đã yêu cầu khách bổ sung giấy tờ. Đơn đang chờ phía khách, đồng hồ xử lý của kiểm dịch tạm dừng.`
                    : `Đã tiếp nhận lúc ${order.acceptedAt}. Đang chờ Kiểm dịch viên <b>${order.inspector}</b> xác minh hồ sơ.`],
        routing: ['banner-info', 'fa-hourglass-half', `Hồ sơ đã được kiểm dịch xác nhận hợp lệ. Đang chờ Điều phối viên <b>${order.coordinator}</b> lập lộ trình.`],
        rejected: order.status === 'rejected' ? ['banner-danger', 'fa-circle-xmark', rejectedBannerHtml(order)] : null
    };
    if (banners[order.status]) {
        const [cls, icon, html] = banners[order.status];
        banner.className = 'status-banner ' + cls;
        banner.innerHTML = `<i class="fa-solid ${icon}"></i><span>${html}</span>`;
        banner.style.display = 'flex';
    } else {
        banner.style.display = 'none';
    }

    // 1. Thông tin chuyến
    document.getElementById('m-trip').innerHTML =
        infoItem('Điểm đi', order.from) +
        infoItem('Điểm đến', order.to) +
        infoItem('Loại tuyến', order.border ? 'Xuyên quốc gia (đường bộ)' : 'Nội địa (đường bộ)') +
        infoItem('Cửa khẩu', order.border || '—') +
        infoItem('Quãng đường / Thời gian', `${order.distance} · ${order.duration}`) +
        infoItem('Ngày khởi hành', order.depart) +
        infoItem('Số ngựa', order.horses.length + ' con');

    // 2. Ngựa & hồ sơ
    document.getElementById('m-horses').innerHTML = order.horses.map((h, i) => `
        <details class="horse-item" ${i === 0 ? 'open' : ''}>
            <summary>
                <span><b>${h.name}</b> · ${h.breed} · ${h.sex}</span>
                <span class="text-muted">Chip ${h.chip} · Đã nộp ${docs.length}/${docs.length} giấy tờ</span>
            </summary>
            <ul class="doc-list doc-list-submitted">
                ${docs.map(d => `<li><i class="fa-solid fa-file-lines"></i> ${d}</li>`).join('')}
            </ul>
        </details>`).join('');
    const noteBox = document.getElementById('m-customer-note');
    noteBox.style.display = order.customerNote ? 'block' : 'none';
    noteBox.innerHTML = `<i class="fa-solid fa-comment-dots"></i> Yêu cầu của khách: ${order.customerNote}`;

    // 3. Báo giá đã gửi khách
    document.getElementById('m-quote').innerHTML = `
        <ul class="cost-items quote-items">
            ${order.priceItems.map(item => `<li><span>${item[0]}</span><span>${formatVND(item[1])}</span></li>`).join('')}
        </ul>
        <div class="profit-row"><span>Tổng giá đã báo khách</span><span>${formatVND(sum(order.priceItems))}</span></div>`;

    // 4. Kiểm tra tự động
    const leadDays = Math.round((parseDate(order.depart) - parseDate(order.submitted)) / 86400000);
    const checks = [
        [leadDays >= MIN_LEAD_DAYS, `Khởi hành sau ${leadDays} ngày kể từ ngày đặt (tối thiểu ${MIN_LEAD_DAYS} ngày)`],
        [true, 'Tuyến nằm trong vùng phục vụ (Việt Nam – Lào – Campuchia)'],
        [true, `Còn năng lực vận chuyển — đã giữ chỗ tạm ${order.hold}`],
        [true, `Khách đã nộp đủ hồ sơ cho ${order.horses.length} ngựa`]
    ];
    let checksHtml = checks.map(([ok, text]) =>
        `<li class="${ok ? 'check-ok' : 'check-warn'}"><i class="fa-solid ${ok ? 'fa-circle-check' : 'fa-triangle-exclamation'}"></i> ${text}</li>`
    ).join('');
    if (order.warning) {
        checksHtml += `<li class="check-warn"><i class="fa-solid fa-triangle-exclamation"></i> ${order.warning}</li>`;
    }
    document.getElementById('m-checks').innerHTML = checksHtml;

    // 5. Phân công
    const assign = document.getElementById('m-assign');
    if (order.status === 'new') {
        assign.innerHTML = `
            <div class="assign-grid">
                <div>
                    <label class="action-label"><i class="fa-solid fa-user-doctor"></i> Kiểm dịch viên</label>
                    ${staffSelect('assign-inspector', inspectors, 'kiểm dịch viên')}
                </div>
                <div>
                    <label class="action-label"><i class="fa-solid fa-route"></i> Điều phối viên</label>
                    ${staffSelect('assign-coordinator', coordinators, 'điều phối viên')}
                </div>
            </div>
            <p class="action-hint"><i class="fa-solid fa-circle-info"></i> Hệ thống gợi ý người đang ít việc nhất. Điều phối viên bắt đầu lập lộ trình sau khi Kiểm dịch viên xác nhận hồ sơ hợp lệ.</p>`;
    } else if (order.status === 'rejected' && order.rejectedStep === 0) {
        assign.innerHTML = '<p class="text-muted" style="font-size: 0.85rem;">Đơn bị từ chối ở bước Tiếp nhận, không phân công.</p>';
    } else {
        assign.innerHTML = `<div class="info-grid">${infoItem('Kiểm dịch viên', order.inspector)}${infoItem('Điều phối viên', order.coordinator)}</div>`;
    }

    // Khóa tiếp nhận khi một vai trò không còn ai đang làm việc (vẫn cho từ chối sớm)
    const canAccept = available(inspectors).length > 0 && available(coordinators).length > 0;
    const acceptBtn = document.getElementById('btn-accept');
    acceptBtn.disabled = !canAccept;
    acceptBtn.title = canAccept ? '' : 'Không đủ nhân sự để tiếp nhận. Xem trang Nhân sự.';
    if (order.status === 'new' && !canAccept) {
        assign.innerHTML += '<p class="action-hint"><i class="fa-solid fa-lock"></i> Nút tiếp nhận bị khóa cho đến khi có nhân sự đi làm lại (xem trang <a href="manager_phan_cong.html">Nhân sự</a>). Đơn giữ nguyên ở tab "Đơn mới".</p>';
    }

    renderManagerAction(order);

    hideRejectBox();
    document.getElementById('decision-buttons').style.display = order.status === 'new' ? 'flex' : 'none';
    document.getElementById('intakeModal').style.display = 'flex';
    document.querySelector('.approval-modal').scrollTop = 0;
}

function closeModal() {
    document.getElementById('intakeModal').style.display = 'none';
    hideRejectBox();
    activeOrder = null;
}

// ===== Việc Manager xử lý =====
function reportBanner(r) {
    return `
        <div class="status-banner banner-warning"><i class="fa-solid fa-user-doctor"></i><span>
            <b>Báo cáo của kiểm dịch viên ${r.inspector}</b> — ${r.type}${r.disease ? ` (<b>${r.disease}</b>, ${r.curable ? 'chữa được' : 'không chữa được'})` : ''}<br>
            Ngựa bị ảnh hưởng: <b>${r.horses.join(', ')}</b>. ${r.note}<br>
            Căn cứ: ${r.evidence.join('; ')}
        </span></div>`;
}

function renderManagerAction(order) {
    const box = document.getElementById('m-manager-action');
    if (order.status !== 'needs_manager') {
        box.style.display = 'none';
        box.innerHTML = '';
        return;
    }
    const p = order.pending;
    let html = reportBanner(p.report);

    if (p.kind === 'issue') {
        const r = p.report;
        const defaultMessage = `Hồ sơ của ngựa ${r.horses.join(', ')} có vấn đề không thể khắc phục bằng bổ sung giấy tờ: ${r.type.toLowerCase()}${r.disease ? ` (${r.disease})` : ''}. Vui lòng chọn một trong các phương án dưới đây trong ${CHOICE_HOURS} giờ.`;
        html += `
            <div id="mgr-box" class="action-box action-box-neutral">
                <div class="action-label">Phương án gửi khách chọn <span class="required">*</span></div>
                ${Object.entries(OPTIONS).map(([key, opt]) => {
                    const why = opt.why(order);
                    return `<label class="option-line ${why ? 'option-off' : ''}">
                        <input type="checkbox" class="mgr-option" value="${key}" ${why ? 'disabled' : 'checked'} ${opt.mandatory ? 'disabled' : ''}>
                        <span><b>${opt.code}.</b> ${opt.label}${opt.mandatory ? ' <span class="text-muted">(luôn có)</span>' : ''}${why ? `<div class="option-why"><i class="fa-solid fa-lock"></i> ${why}</div>` : ''}</span>
                    </label>`;
                }).join('')}
                <div id="mgr-custom-list"></div>
                <button type="button" class="btn btn-light btn-sm" onclick="addCustomOption()"><i class="fa-solid fa-plus"></i> Thêm phương án khác</button>
                <label class="action-label" style="margin-top: 10px;">Nội dung gửi khách <span class="required">*</span></label>
                <textarea id="mgr-message" class="action-input" rows="3">${defaultMessage}</textarea>
                <p class="action-hint"><i class="fa-solid fa-circle-info"></i> Khách có ${CHOICE_HOURS} giờ để chọn. Quá hạn không chọn, đơn chuyển lại đây để Manager quyết định từ chối.</p>
                <div class="action-box-buttons"><button class="btn btn-orange" onclick="sendOffer()"><i class="fa-solid fa-paper-plane"></i> Gửi phương án cho khách</button></div>
            </div>`;
    } else if (p.kind === 'recheck') {
        const candidates = available(inspectors).filter(s => s.name !== p.report.inspector).sort((a, b) => a.load - b.load);
        html += `
            <div class="status-banner banner-info"><i class="fa-solid fa-comment-dots"></i><span>
                <b>Khách chọn phương án D – Kiểm tra lại</b> lúc ${formatTs(p.at)}: "${p.customerReason}"<br>
                ${p.customerFiles.map(f => `<i class="fa-solid fa-file-pdf"></i> ${f}`).join(' · ')}
            </span></div>
            <div id="mgr-box" class="action-box action-box-neutral">
                ${candidates.length ? `
                    <label class="action-label">Giao kiểm tra lại cho <span class="required">*</span></label>
                    <select id="mgr-reviewer" class="action-input">
                        ${candidates.map((s, i) => `<option value="${s.name}">${s.name} — ${s.load} đơn đang xử lý${i === 0 ? ' (gợi ý)' : ''}</option>`).join('')}
                    </select>
                    <p class="action-hint"><i class="fa-solid fa-circle-info"></i> Chỉ hiện kiểm dịch viên đang làm việc, khác người đã báo cáo (${p.report.inspector}). Người kiểm tra lại xác minh từ đầu. Mỗi đơn chỉ được kiểm tra lại 1 lần.</p>
                    <div class="action-box-buttons"><button class="btn btn-orange" onclick="assignRecheck()"><i class="fa-solid fa-magnifying-glass"></i> Giao kiểm tra lại</button></div>`
                : `<div class="status-banner banner-danger"><i class="fa-solid fa-user-slash"></i><span>Không còn kiểm dịch viên nào khác ${p.report.inspector} đang làm việc. Xem trang <a href="manager_phan_cong.html">Nhân sự</a>.</span></div>`}
            </div>`;
    } else {
        html += `
            <div class="status-banner banner-danger"><i class="fa-solid fa-clock"></i><span>
                Đã gửi phương án lúc ${formatTs(p.offer.sentAt)}: ${optionText(p.offer.options, p.offer.custom)}.<br>
                <b>Khách không chọn phương án</b> trước hạn ${formatTs(p.offer.sentAt + CHOICE_HOURS * HOUR)}.
            </span></div>
            <div id="mgr-box" class="action-box action-box-danger">
                <div class="action-label">Quyết định từ chối đơn</div>
                <p class="action-hint" style="margin-top: 0;">Lý do: <b>Khách không chọn phương án trong ${CHOICE_HOURS} giờ</b>. Khách chưa thanh toán nên không phát sinh hoàn tiền.</p>
                <label class="action-label" style="margin-top: 10px;">Ghi chú gửi khách <span class="required">*</span></label>
                <textarea id="mgr-message" class="action-input" rows="2" placeholder="Nhập nội dung gửi khách..."></textarea>
                <div class="action-box-buttons"><button class="btn btn-red" onclick="rejectExpired()"><i class="fa-solid fa-ban"></i> Từ chối đơn</button></div>
            </div>`;
    }
    box.innerHTML = html;
    box.style.display = 'block';
}

function requireMessage() {
    const message = document.getElementById('mgr-message');
    if (message.value.trim()) return message.value.trim();
    message.classList.add('input-error');
    message.focus();
    return null;
}

function addCustomOption() {
    const list = document.getElementById('mgr-custom-list');
    const item = document.createElement('div');
    item.className = 'custom-option';
    item.innerHTML = `
        <div class="custom-option-head">
            <b class="custom-code"></b>
            <button type="button" class="custom-remove" onclick="removeCustomOption(this)" aria-label="Xóa phương án"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <input class="action-input custom-label" placeholder="Tên phương án *" oninput="this.classList.remove('input-error')">
        <textarea class="action-input custom-detail" rows="2" placeholder="Mô tả cho khách: điều gì xảy ra với đơn, ngày khởi hành, chi phí, khách cần cung cấp gì *" oninput="this.classList.remove('input-error')"></textarea>`;
    list.appendChild(item);
    renumberCustomOptions();
    item.querySelector('.custom-label').focus();
}

function removeCustomOption(button) {
    button.closest('.custom-option').remove();
    renumberCustomOptions();
}

function renumberCustomOptions() {
    document.querySelectorAll('.custom-option .custom-code').forEach((el, i) => { el.textContent = `${customCode(i)}. Phương án khác`; });
}

// Đọc các phương án tự thêm; ô trống thì báo lỗi và trả về null
function readCustomOptions() {
    const custom = [];
    for (const [i, item] of [...document.querySelectorAll('.custom-option')].entries()) {
        const label = item.querySelector('.custom-label');
        const detail = item.querySelector('.custom-detail');
        for (const input of [label, detail]) {
            if (!input.value.trim()) {
                input.classList.add('input-error');
                input.focus();
                return null;
            }
        }
        custom.push({ code: customCode(i), label: label.value.trim(), detail: detail.value.trim() });
    }
    return custom;
}

function sendOffer() {
    const custom = readCustomOptions();
    if (!custom) return;
    const message = requireMessage();
    if (!message) return;
    const options = [...document.querySelectorAll('.mgr-option')].filter(cb => cb.checked).map(cb => cb.value);
    Object.assign(activeOrder, {
        status: 'inspecting', waitingChoice: { options, custom, sentAt: Date.now(), message }, report: activeOrder.pending.report
    });
    delete activeOrder.pending;
    showToast(`Đã gửi ${options.length + custom.length} phương án cho khách của đơn ${activeOrder.id}`, 'success');
    closeModal();
    renderTable();
}

function assignRecheck() {
    const reviewer = document.getElementById('mgr-reviewer').value;
    inspectors.find(s => s.name === reviewer).load++;
    Object.assign(activeOrder, { status: 'inspecting', inspector: reviewer, review: true, rechecked: true, waitingCustomer: false });
    delete activeOrder.pending;
    showToast(`Đã giao ${activeOrder.id} cho ${reviewer} kiểm tra lại`, 'success');
    closeModal();
    renderTable();
}

function rejectExpired() {
    const message = requireMessage();
    if (!message) return;
    Object.assign(activeOrder, {
        status: 'rejected', rejectedStep: 1, rejectedAt: Date.now(),
        rejectType: `Khách không chọn phương án trong ${CHOICE_HOURS} giờ`, note: message, report: activeOrder.pending.report
    });
    delete activeOrder.pending;
    showToast(`Đã từ chối đơn ${activeOrder.id}`, 'error');
    closeModal();
    renderTable();
}

// ===== Hành động =====
function showRejectBox() {
    const box = document.getElementById('reject-box');
    box.style.display = 'block';
    box.style.animation = 'slideDown 0.3s ease';
    document.getElementById('decision-buttons').style.display = 'none';
    document.getElementById('reject-note').focus();
}

function hideRejectBox() {
    const input = document.getElementById('reject-note');
    document.getElementById('reject-box').style.display = 'none';
    input.value = '';
    input.classList.remove('input-error');
    if (activeOrder && activeOrder.status === 'new') {
        document.getElementById('decision-buttons').style.display = 'flex';
    }
}

function confirmReject() {
    const box = document.getElementById('reject-box');
    const input = document.getElementById('reject-note');
    if (!input.value.trim()) {
        box.style.animation = 'none';
        box.offsetHeight;
        box.style.animation = 'shake 0.4s ease';
        input.classList.add('input-error');
        input.focus();
        return;
    }
    activeOrder.status = 'rejected';
    activeOrder.rejectedStep = 0;
    activeOrder.rejectedAt = Date.now();
    activeOrder.rejectType = document.getElementById('reject-type').value;
    activeOrder.note = input.value.trim();
    showToast('Đã từ chối sớm đơn ' + activeOrder.id + ' và thông báo cho khách hàng', 'error');
    closeModal();
    renderTable();
}

function acceptOrder() {
    const inspectorName = document.getElementById('assign-inspector').value;
    const coordinatorName = document.getElementById('assign-coordinator').value;
    inspectors.find(s => s.name === inspectorName).load++;
    coordinators.find(s => s.name === coordinatorName).load++;

    activeOrder.status = 'inspecting';
    activeOrder.inspector = inspectorName;
    activeOrder.coordinator = coordinatorName;
    activeOrder.acceptedAt = nowText();
    showToast(`Đã tiếp nhận ${activeOrder.id}. Đã giao Kiểm dịch viên ${inspectorName} xác minh hồ sơ`, 'success');
    closeModal();
    renderTable();
}

// ===== Phân trang & Tìm kiếm =====
const ROWS_PER_PAGE = 10;
let currentPage = 1;

function paginateTable() {
    const allRows = document.querySelectorAll('.data-table tbody tr');
    const filteredRows = [];

    allRows.forEach(row => {
        if (row.getAttribute('data-status') !== currentTab) {
            row.style.display = 'none';
            return;
        }
        if (searchQuery) {
            const text = row.textContent.toLowerCase();
            if (!text.includes(searchQuery)) {
                row.style.display = 'none';
                return;
            }
        }
        filteredRows.push(row);
        row.style.display = '';
    });

    const totalRows = filteredRows.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / ROWS_PER_PAGE));

    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * ROWS_PER_PAGE;
    const end = start + ROWS_PER_PAGE;

    filteredRows.forEach((row, i) => {
        row.style.display = (i >= start && i < end) ? '' : 'none';
    });

    const info = document.getElementById('pagination-info');
    if (totalRows === 0) {
        info.textContent = 'Không có đơn hàng nào';
    } else {
        info.textContent = `Hiển thị ${start + 1}-${Math.min(end, totalRows)} của ${totalRows} Đơn hàng`;
    }

    renderPaginationButtons(totalPages);
}

function renderPaginationButtons(totalPages) {
    const container = document.getElementById('pagination-buttons');
    container.innerHTML = '';

    const btnStyle = 'padding: 6px 12px; border: 1px solid #cbd5e1; border-radius: 4px; background: white; cursor: pointer; color: #64748b; font-family: Inter;';
    const activeStyle = 'padding: 6px 12px; border: none; border-radius: 4px; background: #ea580c; color: white; font-weight: 600; cursor: pointer; font-family: Inter;';

    const prevBtn = document.createElement('button');
    prevBtn.textContent = 'Trang trước';
    prevBtn.style.cssText = btnStyle;
    prevBtn.disabled = currentPage === 1;
    if (prevBtn.disabled) prevBtn.style.opacity = '0.5';
    prevBtn.onclick = () => { currentPage--; paginateTable(); };
    container.appendChild(prevBtn);

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        btn.style.cssText = (i === currentPage) ? activeStyle : btnStyle;
        btn.onclick = () => { currentPage = i; paginateTable(); };
        container.appendChild(btn);
    }

    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Trang sau';
    nextBtn.style.cssText = btnStyle;
    nextBtn.disabled = currentPage === totalPages;
    if (nextBtn.disabled) nextBtn.style.opacity = '0.5';
    nextBtn.onclick = () => { currentPage++; paginateTable(); };
    container.appendChild(nextBtn);
}

let searchQuery = '';

function searchTable() {
    searchQuery = document.getElementById('search-input').value.trim().toLowerCase();
    currentPage = 1;
    paginateTable();
}

function showToast(message, type) {
    const toast = document.createElement('div');
    const colors = { success: '#16a34a', error: '#dc2626' };
    const icons = { success: '✓', error: '✕' };
    toast.innerHTML = '<span style="margin-right: 8px; font-weight: bold;">' + icons[type] + '</span>' + message;
    toast.style.cssText = 'position: fixed; top: 24px; right: 24px; background: ' + colors[type] + '; color: white; padding: 14px 20px; border-radius: 8px; font-family: Inter; font-size: 0.9rem; font-weight: 500; z-index: 10000; box-shadow: 0 4px 12px rgba(0,0,0,0.15); animation: slideIn 0.3s ease, fadeOut 0.4s ease 2.6s forwards;';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

renderTable();
