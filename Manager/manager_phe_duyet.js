// ===== Dữ liệu mẫu =====
// Đơn đến trang này khi Kiểm dịch đã xác minh giấy tờ và Điều phối viên đã lập lộ trình.
// services: dịch vụ khách chọn khi đặt đơn [tên dịch vụ, lựa chọn, thành tiền]; tổng = giá đã báo khách.
// status: pending (chờ duyệt) | approved (chờ thanh toán) | rejected | paid (đã thanh toán, kiểm dịch viên chuẩn bị giấy tờ)
// papers (đơn đã thanh toán): khách gửi bản gốc trước 17:00 ngày khởi hành − 3; kiểm dịch viên làm thủ tục với cơ quan
// chức năng, cập nhật giấy đã cấp (kèm bản scan) và bàn giao cho Điều phối viên trước 12:00 ngày khởi hành − 2.

// Giấy tờ khách nộp, khớp trang Kiểm dịch (giấy chứng nhận kiểm dịch do kiểm dịch viên xin sau khi khách thanh toán)
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

const orders = [
    {
        id: 'EQ-2026-1042', customer: 'CLB Ngựa đua Long Thành', submitted: '22/09/2026', depart: '06/10/2026',
        from: 'Trang trại Long Thành (Đồng Nai, VN)', to: 'Trường đua Phnom Penh Royal Turf (Phnom Penh, KH)',
        routeShort: 'Đồng Nai → Phnom Penh (KH)', border: 'Mộc Bài – Bavet', distance: '290 km', duration: '~7 giờ',
        horses: [
            { name: 'Storm Runner', breed: 'Thoroughbred', sex: 'Thiến', chip: 'VN-985211' },
            { name: 'Bạch Phong', breed: 'Arabian', sex: 'Cái', chip: 'VN-985347' }
        ],
        inspector: 'Phạm Văn Hưng', inspectNote: 'Giấy tờ đầy đủ, tiêm phòng còn hạn đến 12/2026. Sẽ kiểm tra sức khỏe tại chỗ ngày 06/10.',
        coordinator: 'Trần Minh', vehicle: '51C-123.45 (xe chuyên dụng 4 ngăn)', driver: 'Nguyễn Văn Hùng', grooms: 'Võ Thị Lan',
        stops: ['Trang trại Long Thành (Đồng Nai) — nhận ngựa', 'Cửa khẩu Mộc Bài (Tây Ninh) — thông quan', 'Cửa khẩu Bavet (Svay Rieng) — kiểm tra thú y', 'Trường đua Phnom Penh Royal Turf — giao ngựa'],
        services: [
            ['Vận chuyển đường bộ', 'Xe chuyên dụng 4 ngăn · khoang tiêu chuẩn · 290 km', 17000000],
            ['Kiểm dịch & thủ tục xuất cảnh', 'Trọn gói: xét nghiệm, chứng nhận, thông quan Mộc Bài – Bavet', 6500000],
            ['Chăm sóc dọc đường', 'NV chăm sóc đi kèm · cỏ khô Timothy · nước điện giải', 1500000],
            ['Bảo hiểm vận chuyển', 'Gói cơ bản', 1500000]
        ],
        status: 'pending'
    },
    {
        id: 'EQ-2026-1041', customer: 'Trường đua Thiên Mã', submitted: '21/09/2026', depart: '08/10/2026',
        from: 'Trường đua Thiên Mã (Sóc Sơn, Hà Nội, VN)', to: 'Vientiane Turf Club (Viêng Chăn, LA)',
        routeShort: 'Hà Nội → Viêng Chăn (LA)', border: 'Cầu Treo – Nam Phao', distance: '730 km', duration: '2 ngày',
        horses: [
            { name: 'Hắc Long', breed: 'Thoroughbred', sex: 'Đực', chip: 'VN-771020' },
            { name: 'Thiên Lý', breed: 'Thoroughbred', sex: 'Cái', chip: 'VN-771034' },
            { name: 'Kim Ô', breed: 'Anglo-Arab', sex: 'Thiến', chip: 'VN-771089' }
        ],
        inspector: 'Nguyễn Thị Thu', inspectNote: 'Đã đối chiếu microchip 3/3 con. Giấy phép nhập khẩu phía Lào hợp lệ.',
        coordinator: 'Lê Quang', vehicle: '29H-456.78 (xe chuyên dụng 4 ngăn)', driver: 'Trần Quốc Bảo', grooms: 'Đỗ Văn Nam',
        stops: ['Trường đua Thiên Mã (Hà Nội) — nhận ngựa', 'Trạm nghỉ Vinh (Nghệ An) — nghỉ đêm', 'Cửa khẩu Cầu Treo (Hà Tĩnh) — thông quan', 'Cửa khẩu Nam Phao (Bolikhamxay) — kiểm tra thú y', 'Vientiane Turf Club — giao ngựa'],
        services: [
            ['Vận chuyển đường bộ', 'Xe chuyên dụng 4 ngăn · khoang tiêu chuẩn · 730 km', 30000000],
            ['Kiểm dịch & thủ tục xuất cảnh', 'Trọn gói: xét nghiệm, chứng nhận, thông quan Cầu Treo – Nam Phao', 9500000],
            ['Chăm sóc dọc đường', 'NV chăm sóc đi kèm · cỏ khô Timothy · nước điện giải', 3500000],
            ['Bảo hiểm vận chuyển', 'Gói cơ bản', 3000000]
        ],
        status: 'pending'
    },
    {
        id: 'EQ-2026-1040', customer: 'Trang trại Sông Hàn', submitted: '20/09/2026', depart: '05/10/2026',
        from: 'Trường đua Sông Hàn (Đà Nẵng, VN)', to: 'Trường đua Savannakhet (Savannakhet, LA)',
        routeShort: 'Đà Nẵng → Savannakhet (LA)', border: 'Lao Bảo – Densavanh', distance: '500 km', duration: '~11 giờ',
        horses: [
            { name: 'Phong Vân', breed: 'Arabian', sex: 'Đực', chip: 'VN-640552' }
        ],
        inspector: 'Phạm Văn Hưng', inspectNote: 'Giấy tờ hợp lệ.',
        coordinator: 'Phạm Tâm', vehicle: '43C-222.11 (xe chuyên dụng 2 ngăn)', driver: 'Lê Minh Tuấn', grooms: 'Huỳnh Thị Mai',
        stops: ['Trường đua Sông Hàn (Đà Nẵng) — nhận ngựa', 'Cửa khẩu Lao Bảo (Quảng Trị) — thông quan', 'Cửa khẩu Densavanh (Savannakhet) — kiểm tra thú y', 'Trường đua Savannakhet — giao ngựa'],
        services: [
            ['Vận chuyển đường bộ', 'Xe chuyên dụng 2 ngăn · khoang tiêu chuẩn · 500 km', 14000000],
            ['Kiểm dịch & thủ tục xuất cảnh', 'Trọn gói: xét nghiệm, chứng nhận, thông quan Lao Bảo – Densavanh', 4800000],
            ['Chăm sóc dọc đường', 'NV chăm sóc đi kèm · cỏ khô Timothy · nước điện giải', 1800000],
            ['Bảo hiểm vận chuyển', 'Gói cơ bản', 1200000]
        ],
        status: 'pending'
    },
    {
        id: 'EQ-2026-1039', customer: 'CLB Ngựa Phú Thọ', submitted: '19/09/2026', depart: '07/10/2026',
        from: 'Trường đua Phú Thọ (TP.HCM, VN)', to: 'Trường đua Sông Hàn (Đà Nẵng, VN)',
        routeShort: 'TP.HCM → Đà Nẵng', border: null, distance: '960 km', duration: '2 ngày',
        horses: [
            { name: 'Xích Thố', breed: 'Thoroughbred', sex: 'Đực', chip: 'VN-503311' },
            { name: 'Ô Vân', breed: 'Thoroughbred', sex: 'Cái', chip: 'VN-503328' },
            { name: 'Tuyết Sơn', breed: 'Arabian', sex: 'Cái', chip: 'VN-503340' },
            { name: 'Lôi Điện', breed: 'Anglo-Arab', sex: 'Thiến', chip: 'VN-503356' }
        ],
        inspector: 'Nguyễn Thị Thu', inspectNote: 'Vận chuyển nội địa, giấy tờ đầy đủ.',
        coordinator: 'Trần Minh', vehicle: '51C-888.99 (xe chuyên dụng 4 ngăn)', driver: 'Phạm Đức Anh', grooms: 'Võ Thị Lan, Đỗ Văn Nam',
        stops: ['Trường đua Phú Thọ (TP.HCM) — nhận ngựa', 'Trạm nghỉ Tuy Hòa (Phú Yên) — nghỉ đêm', 'Trường đua Sông Hàn (Đà Nẵng) — giao ngựa'],
        services: [
            ['Vận chuyển đường bộ', 'Xe chuyên dụng 4 ngăn · khoang tiêu chuẩn · 960 km', 33000000],
            ['Kiểm dịch vận chuyển nội địa', 'Cấp giấy chứng nhận kiểm dịch cho 4 ngựa', 3000000],
            ['Chăm sóc dọc đường', 'NV chăm sóc đi kèm · cỏ khô Timothy · nước điện giải', 5000000],
            ['Bảo hiểm vận chuyển', 'Gói cơ bản', 3000000]
        ],
        status: 'pending'
    },
    {
        id: 'EQ-2026-1038', customer: 'Đại Nam Racing', submitted: '18/09/2026', depart: '03/10/2026',
        from: 'Trường đua Đại Nam (Bình Dương, VN)', to: 'Trường đua Phú Thọ (TP.HCM, VN)',
        routeShort: 'Bình Dương → TP.HCM', border: null, distance: '40 km', duration: '~1.5 giờ',
        horses: [
            { name: 'Hỏa Tiễn', breed: 'Thoroughbred', sex: 'Đực', chip: 'VN-420017' },
            { name: 'Ngân Hà', breed: 'Thoroughbred', sex: 'Cái', chip: 'VN-420023' }
        ],
        inspector: 'Phạm Văn Hưng', inspectNote: 'Giấy tờ hợp lệ.',
        coordinator: 'Phạm Tâm', vehicle: '61C-345.67 (xe chuyên dụng 2 ngăn)', driver: 'Võ Thanh Sơn', grooms: 'Huỳnh Thị Mai',
        stops: ['Trường đua Đại Nam (Bình Dương) — nhận ngựa', 'Trường đua Phú Thọ (TP.HCM) — giao ngựa'],
        services: [
            ['Vận chuyển đường bộ', 'Xe chuyên dụng 2 ngăn · khoang tiêu chuẩn · 40 km', 3500000],
            ['Kiểm dịch vận chuyển nội địa', 'Cấp giấy chứng nhận kiểm dịch cho 2 ngựa', 1000000],
            ['Chăm sóc dọc đường', 'NV chăm sóc đi kèm · cỏ khô Timothy · nước điện giải', 300000],
            ['Bảo hiểm vận chuyển', 'Gói cơ bản', 400000]
        ],
        status: 'pending'
    },
    {
        id: 'EQ-2026-1037', customer: 'Angkor Equestrian', submitted: '18/09/2026', depart: '09/10/2026',
        from: 'Trường đua Angkor (Siem Reap, KH)', to: 'Trường đua Phú Thọ (TP.HCM, VN)',
        routeShort: 'Siem Reap (KH) → TP.HCM', border: 'Bavet – Mộc Bài', distance: '550 km', duration: '2 ngày',
        horses: [
            { name: 'Apsara', breed: 'Arabian', sex: 'Cái', chip: 'KH-118204' },
            { name: 'Bayon', breed: 'Thoroughbred', sex: 'Đực', chip: 'KH-118219' }
        ],
        inspector: 'Nguyễn Thị Thu', inspectNote: 'Ngựa nhập khẩu vào Việt Nam phải cách ly 2 ngày tại cửa khẩu Mộc Bài theo yêu cầu thú y. Đã cộng chi phí cách ly.',
        coordinator: 'Lê Quang', vehicle: '51C-123.45 (xe chuyên dụng 4 ngăn)', driver: 'Nguyễn Văn Hùng', grooms: 'Đỗ Văn Nam',
        stops: ['Trường đua Angkor (Siem Reap) — nhận ngựa', 'Cửa khẩu Bavet (Svay Rieng) — thông quan', 'Khu cách ly Mộc Bài (Tây Ninh) — cách ly 2 ngày', 'Trường đua Phú Thọ (TP.HCM) — giao ngựa'],
        services: [
            ['Vận chuyển đường bộ', 'Xe chuyên dụng 4 ngăn · khoang tiêu chuẩn · 550 km', 18000000],
            ['Kiểm dịch & thủ tục nhập cảnh', 'Trọn gói: xét nghiệm, chứng nhận, thông quan Bavet – Mộc Bài', 8000000],
            ['Chăm sóc dọc đường', 'NV chăm sóc đi kèm · cỏ khô Timothy · nước điện giải', 2500000],
            ['Bảo hiểm vận chuyển', 'Gói cơ bản', 2000000]
        ],
        status: 'pending'
    },
    {
        id: 'EQ-2026-1036', customer: 'Trang trại Ba Vì', submitted: '16/09/2026', depart: '02/10/2026',
        from: 'Trang trại Ba Vì (Hà Nội, VN)', to: 'Trường đua Thiên Mã (Sóc Sơn, Hà Nội, VN)',
        routeShort: 'Ba Vì → Sóc Sơn (Hà Nội)', border: null, distance: '80 km', duration: '~2 giờ',
        horses: [
            { name: 'Tản Viên', breed: 'Thoroughbred', sex: 'Đực', chip: 'VN-330145' },
            { name: 'Sơn Tinh', breed: 'Thoroughbred', sex: 'Thiến', chip: 'VN-330152' },
            { name: 'Mỵ Nương', breed: 'Arabian', sex: 'Cái', chip: 'VN-330168' }
        ],
        inspector: 'Phạm Văn Hưng', inspectNote: 'Giấy tờ hợp lệ.',
        coordinator: 'Trần Minh', vehicle: '29H-456.78 (xe chuyên dụng 4 ngăn)', driver: 'Trần Quốc Bảo', grooms: 'Đỗ Văn Nam',
        stops: ['Trang trại Ba Vì — nhận ngựa', 'Trường đua Thiên Mã (Sóc Sơn) — giao ngựa'],
        services: [
            ['Vận chuyển đường bộ', 'Xe chuyên dụng 4 ngăn · khoang tiêu chuẩn · 80 km', 5000000],
            ['Kiểm dịch vận chuyển nội địa', 'Cấp giấy chứng nhận kiểm dịch cho 3 ngựa', 1200000],
            ['Chăm sóc dọc đường', 'NV chăm sóc đi kèm · cỏ khô Timothy · nước điện giải', 600000],
            ['Bảo hiểm vận chuyển', 'Gói cơ bản', 700000]
        ],
        status: 'pending'
    },
    {
        id: 'EQ-2026-1035', customer: 'Vientiane Turf Club', submitted: '14/09/2026', depart: '30/09/2026',
        from: 'Vientiane Turf Club (Viêng Chăn, LA)', to: 'Trường đua Thiên Mã (Sóc Sơn, Hà Nội, VN)',
        routeShort: 'Viêng Chăn (LA) → Hà Nội', border: 'Nam Phao – Cầu Treo', distance: '730 km', duration: '2 ngày',
        horses: [
            { name: 'Mekong Star', breed: 'Thoroughbred', sex: 'Đực', chip: 'LA-207731' },
            { name: 'Champa', breed: 'Arabian', sex: 'Cái', chip: 'LA-207748' }
        ],
        inspector: 'Nguyễn Thị Thu', inspectNote: 'Giấy tờ hợp lệ.',
        coordinator: 'Lê Quang', vehicle: '29H-456.78 (xe chuyên dụng 4 ngăn)', driver: 'Trần Quốc Bảo', grooms: 'Đỗ Văn Nam',
        stops: ['Vientiane Turf Club — nhận ngựa', 'Cửa khẩu Nam Phao (Bolikhamxay) — thông quan', 'Cửa khẩu Cầu Treo (Hà Tĩnh) — kiểm tra thú y', 'Trạm nghỉ Vinh (Nghệ An) — nghỉ đêm', 'Trường đua Thiên Mã (Hà Nội) — giao ngựa'],
        services: [
            ['Vận chuyển đường bộ', 'Xe chuyên dụng 4 ngăn · khoang tiêu chuẩn · 730 km', 26000000],
            ['Kiểm dịch & thủ tục nhập cảnh', 'Trọn gói: xét nghiệm, chứng nhận, thông quan Nam Phao – Cầu Treo', 8000000],
            ['Chăm sóc dọc đường', 'NV chăm sóc đi kèm · cỏ khô Timothy · nước điện giải', 3500000],
            ['Bảo hiểm vận chuyển', 'Gói cơ bản', 2500000]
        ],
        status: 'approved', paymentDeadline: '25/09/2026 10:30'
    },
    {
        id: 'EQ-2026-1034', customer: 'Mekong Stud', submitted: '12/09/2026', depart: '28/09/2026',
        from: 'Trang trại Mekong (Cần Thơ, VN)', to: 'Trường đua Phnom Penh Royal Turf (Phnom Penh, KH)',
        routeShort: 'Cần Thơ → Phnom Penh (KH)', border: 'Tịnh Biên – Phnom Den', distance: '250 km', duration: '~6 giờ',
        horses: [
            { name: 'Cửu Long', breed: 'Thoroughbred', sex: 'Đực', chip: 'VN-812004' }
        ],
        inspector: 'Phạm Văn Hưng', inspectNote: 'Giấy tờ hợp lệ.',
        coordinator: 'Phạm Tâm', vehicle: '65C-101.22 (xe chuyên dụng 2 ngăn)', driver: 'Đặng Hoài Phúc', grooms: 'Huỳnh Thị Mai',
        stops: ['Trang trại Mekong (Cần Thơ) — nhận ngựa', 'Cửa khẩu Tịnh Biên (An Giang) — thông quan', 'Cửa khẩu Phnom Den (Takeo) — kiểm tra thú y', 'Trường đua Phnom Penh Royal Turf — giao ngựa'],
        services: [
            ['Vận chuyển đường bộ', 'Xe chuyên dụng 2 ngăn · khoang tiêu chuẩn · 250 km', 12000000],
            ['Kiểm dịch & thủ tục xuất cảnh', 'Trọn gói: xét nghiệm, chứng nhận, thông quan Tịnh Biên – Phnom Den', 4500000],
            ['Chăm sóc dọc đường', 'NV chăm sóc đi kèm · cỏ khô Timothy · nước điện giải', 1300000],
            ['Bảo hiểm vận chuyển', 'Gói cơ bản', 1200000]
        ],
        status: 'approved', paymentDeadline: '26/09/2026 16:00'
    },
    {
        id: 'EQ-2026-1033', customer: 'CLB Ngựa Sài Gòn', submitted: '10/09/2026', depart: '25/09/2026',
        from: 'Trường đua Phú Thọ (TP.HCM, VN)', to: 'Trường đua Savannakhet (Savannakhet, LA)',
        routeShort: 'TP.HCM → Savannakhet (LA)', border: 'Lao Bảo – Densavanh', distance: '1,100 km', duration: '3 ngày',
        horses: [
            { name: 'Sài Gòn Express', breed: 'Thoroughbred', sex: 'Đực', chip: 'VN-290071' },
            { name: 'Bến Thành', breed: 'Arabian', sex: 'Cái', chip: 'VN-290085' }
        ],
        inspector: 'Nguyễn Thị Thu', inspectNote: 'Giấy tờ hợp lệ.',
        coordinator: 'Trần Minh', vehicle: '51C-888.99 (xe chuyên dụng 4 ngăn)', driver: 'Phạm Đức Anh', grooms: 'Võ Thị Lan',
        stops: ['Trường đua Phú Thọ (TP.HCM) — nhận ngựa', 'Trạm nghỉ Quy Nhơn (Bình Định) — nghỉ đêm', 'Cửa khẩu Lao Bảo (Quảng Trị) — thông quan', 'Cửa khẩu Densavanh (Savannakhet) — kiểm tra thú y', 'Trường đua Savannakhet — giao ngựa'],
        services: [
            ['Vận chuyển đường bộ', 'Xe chuyên dụng 4 ngăn · khoang tiêu chuẩn · 1,100 km', 36000000],
            ['Kiểm dịch & thủ tục xuất cảnh', 'Trọn gói: xét nghiệm, chứng nhận, thông quan Lao Bảo – Densavanh', 9000000],
            ['Chăm sóc dọc đường', 'NV chăm sóc đi kèm · cỏ khô Timothy · nước điện giải', 4000000],
            ['Bảo hiểm vận chuyển', 'Gói cơ bản', 3000000]
        ],
        status: 'rejected', rejectType: 'Tuyến đường hoặc cửa khẩu không khả thi',
        note: 'Cửa khẩu Densavanh tạm dừng thông quan động vật sống do dịch cúm ngựa tại Savannakhet (thông báo ngày 15/09/2026).'
    }
];

// Giấy do cơ quan chức năng cấp (kiểm dịch viên làm thủ tục, khớp trang Chuẩn bị giấy tờ chuyến đi)
const PROCEDURES_DOMESTIC = ['Giấy chứng nhận kiểm dịch động vật vận chuyển ra khỏi tỉnh'];
const PROCEDURES_CROSS_BORDER = ['Giấy chứng nhận kiểm dịch động vật xuất/nhập khẩu', 'Tờ khai hải quan (điện tử)'];

// Bản gốc giấy tờ của khách: mọi giấy đã nhận lúc receivedAt, trừ các giấy trong missing { tên ngựa: [giấy] }
function originalsOf(order, receivedAt, missing = {}) {
    const docs = order.border ? DOCS_CROSS_BORDER : DOCS_DOMESTIC;
    return order.horses.map(h => ({ horse: h.name, docs: docs.map(d => [d, (missing[h.name] || []).includes(d) ? null : receivedAt]) }));
}

function paidOrder(o) {
    o.papers.originals = originalsOf(o, o.papers.receivedAt, o.papers.missing);
    return o;
}

orders.push(
    paidOrder({
        id: 'EQ-2026-1058', customer: 'Trang trại Tây Ninh Stud', submitted: '10/09/2026', depart: '30/09/2026', paidAt: '20/09/2026 10:00',
        from: 'Trang trại Tây Ninh Stud (Tây Ninh, VN)', to: 'Trường đua Phnom Penh Royal Turf (Phnom Penh, KH)',
        routeShort: 'Tây Ninh → Phnom Penh (KH)', border: 'Mộc Bài – Bavet', distance: '230 km', duration: '~6 giờ',
        horses: [
            { name: 'Bà Đen', breed: 'Thoroughbred', sex: 'Cái', chip: 'VN-610118' },
            { name: 'Vàm Cỏ', breed: 'Thoroughbred', sex: 'Đực', chip: 'VN-610125' }
        ],
        inspector: 'Phạm Văn Hưng', inspectNote: 'Giấy tờ hợp lệ.',
        coordinator: 'Phạm Tâm', vehicle: '70C-045.18 (xe chuyên dụng 2 ngăn)', driver: 'Lê Văn Tài', grooms: 'Huỳnh Thị Mai',
        stops: ['Trang trại Tây Ninh Stud — nhận ngựa', 'Cửa khẩu Mộc Bài (Tây Ninh) — thông quan', 'Cửa khẩu Bavet (Svay Rieng) — kiểm tra thú y', 'Trường đua Phnom Penh Royal Turf — giao ngựa'],
        services: [
            ['Vận chuyển đường bộ', 'Xe chuyên dụng 2 ngăn · khoang tiêu chuẩn · 230 km', 12500000],
            ['Kiểm dịch & thủ tục xuất cảnh', 'Trọn gói cho 2 ngựa: xét nghiệm, chứng nhận, thông quan Mộc Bài – Bavet', 7000000],
            ['Chăm sóc dọc đường', 'NV chăm sóc đi kèm · nước điện giải', 1600000],
            ['Bảo hiểm vận chuyển', 'Gói cơ bản', 1600000]
        ],
        status: 'paid',
        papers: {
            originalsDue: '27/09/2026 17:00', handoverDue: '28/09/2026 12:00', receivedAt: '21/09/2026 10:00',
            missing: { 'Vàm Cỏ': ['Kết quả xét nghiệm EIA & cúm ngựa', 'Giấy phép nhập khẩu của nước đến', 'Giấy tờ chứng minh sở hữu'] },
            procedures: {
                'Giấy chứng nhận kiểm dịch động vật xuất/nhập khẩu': { number: 'KD-XK-2026/0412', agency: 'Cơ quan Thú y vùng VI', issued: '23/09/2026', validUntil: '06/10/2026' }
            }
        }
    }),
    paidOrder({
        id: 'EQ-2026-1050', customer: 'Hoàng Gia Stud', submitted: '05/09/2026', depart: '25/09/2026', paidAt: '15/09/2026 14:00',
        from: 'Trường đua Thiên Mã (Sóc Sơn, Hà Nội, VN)', to: 'Trường đua Luang Prabang (Luang Prabang, LA)',
        routeShort: 'Hà Nội → Luang Prabang (LA)', border: 'Tây Trang – Sop Hun', distance: '620 km', duration: '2 ngày',
        horses: [
            { name: 'Ngọc Hoàng', breed: 'Arabian', sex: 'Đực', chip: 'VN-902214' }
        ],
        inspector: 'Phạm Văn Hưng', inspectNote: 'Giấy tờ hợp lệ.',
        coordinator: 'Phạm Tâm', vehicle: '29C-310.77 (xe chuyên dụng 2 ngăn)', driver: 'Trịnh Văn Long', grooms: 'Đỗ Thị Hạnh',
        stops: ['Trường đua Thiên Mã (Sóc Sơn) — nhận ngựa', 'Trạm nghỉ Điện Biên — nghỉ đêm', 'Cửa khẩu Tây Trang (Điện Biên) — thông quan', 'Cửa khẩu Sop Hun (Phongsaly) — kiểm tra thú y', 'Trường đua Luang Prabang — giao ngựa'],
        services: [
            ['Vận chuyển đường bộ', 'Xe chuyên dụng 2 ngăn · khoang tiêu chuẩn · 620 km', 19000000],
            ['Kiểm dịch & thủ tục xuất cảnh', 'Trọn gói: xét nghiệm, chứng nhận, thông quan Tây Trang – Sop Hun', 4200000],
            ['Chăm sóc dọc đường', 'NV chăm sóc đi kèm · cỏ khô Timothy · nước điện giải', 1800000],
            ['Bảo hiểm vận chuyển', 'Gói cơ bản', 1100000]
        ],
        status: 'paid',
        papers: {
            originalsDue: '22/09/2026 17:00', handoverDue: '23/09/2026 12:00', receivedAt: '18/09/2026 09:30', handedAt: '23/09/2026 10:00',
            procedures: {
                'Giấy chứng nhận kiểm dịch động vật xuất/nhập khẩu': { number: 'KD-XK-2026/0397', agency: 'Cơ quan Thú y vùng I', issued: '21/09/2026', validUntil: '03/10/2026' },
                'Tờ khai hải quan (điện tử)': { number: '305112402267', agency: 'Chi cục Hải quan cửa khẩu Tây Trang', issued: '22/09/2026' }
            }
        }
    }),
    paidOrder({
        id: 'EQ-2026-1052', customer: 'Trang trại Long Thành', submitted: '08/09/2026', depart: '27/09/2026', paidAt: '16/09/2026 16:00',
        from: 'Trang trại Long Thành (Đồng Nai, VN)', to: 'Trường đua Angkor (Siem Reap, KH)',
        routeShort: 'Đồng Nai → Siem Reap (KH)', border: 'Mộc Bài – Bavet', distance: '560 km', duration: '2 ngày',
        horses: [
            { name: 'Kim Lân', breed: 'Thoroughbred', sex: 'Đực', chip: 'VN-215530' }
        ],
        inspector: 'Phạm Văn Hưng', inspectNote: 'Giấy tờ hợp lệ.',
        coordinator: 'Trần Minh', vehicle: '60C-222.10 (xe chuyên dụng 2 ngăn)', driver: 'Nguyễn Văn Hùng', grooms: 'Võ Thị Lan',
        stops: ['Trang trại Long Thành — nhận ngựa', 'Cửa khẩu Mộc Bài (Tây Ninh) — thông quan', 'Cửa khẩu Bavet (Svay Rieng) — kiểm tra thú y', 'Trường đua Angkor — giao ngựa'],
        services: [
            ['Vận chuyển đường bộ', 'Xe chuyên dụng 2 ngăn · khoang tiêu chuẩn · 560 km', 15000000],
            ['Kiểm dịch & thủ tục xuất cảnh', 'Trọn gói: xét nghiệm, chứng nhận, thông quan Mộc Bài – Bavet', 3800000],
            ['Chăm sóc dọc đường', 'NV chăm sóc đi kèm · cỏ khô Timothy · nước điện giải', 1000000],
            ['Bảo hiểm vận chuyển', 'Gói cơ bản', 800000]
        ],
        status: 'paid',
        papers: {
            originalsDue: '24/09/2026 17:00', handoverDue: '25/09/2026 12:00', receivedAt: '19/09/2026 15:00',
            missing: { 'Kim Lân': ['Giấy phép nhập khẩu của nước đến', 'Giấy tờ chứng minh sở hữu'] },
            procedures: {
                'Giấy chứng nhận kiểm dịch động vật xuất/nhập khẩu': { number: 'KD-XK-2026/0409', agency: 'Cơ quan Thú y vùng VI', issued: '23/09/2026', validUntil: '07/10/2026' }
            },
            report: {
                at: '24/09/2026 08:00', type: 'Khách chưa gửi bản gốc đúng hạn',
                items: ['Kim Lân · Giấy phép nhập khẩu của nước đến', 'Kim Lân · Giấy tờ chứng minh sở hữu', 'Tờ khai hải quan (điện tử)'],
                note: 'Đã gọi khách 2 lần, khách hẹn gửi nhưng chưa nhận được. Chưa khai hải quan được vì thiếu bản gốc giấy phép nhập khẩu.'
            }
        }
    })
);

// ===== Tính toán =====
const formatVND = n => n.toLocaleString('en-US') + ' VND';

const orderTotal = order => order.services.reduce((total, svc) => total + svc[2], 0);

const proceduresOf = order => order.border ? PROCEDURES_CROSS_BORDER : PROCEDURES_DOMESTIC;

function papersProgress(order) {
    const { originals, procedures } = order.papers;
    const docs = originals.flatMap(o => o.docs);
    const total = docs.length + proceduresOf(order).length;
    const done = docs.filter(d => d[1]).length + proceduresOf(order).filter(p => procedures[p]).length;
    return { done, total };
}

function papersBadge(order) {
    const papers = order.papers;
    if (papers.handedAt) return '<span class="badge badge-success"><i class="fa-solid fa-handshake"></i> Đã bàn giao Điều phối</span>';
    if (papers.report) return '<span class="badge badge-danger"><i class="fa-solid fa-flag"></i> Kiểm dịch báo cáo</span>';
    const p = papersProgress(order);
    return `<span class="badge badge-blue">Đủ ${p.done}/${p.total} giấy</span>`;
}

// ===== Bảng =====
let currentTab = 'pending';
let activeOrder = null;

function renderTable() {
    const tbody = document.getElementById('order-table-body');
    tbody.innerHTML = orders.map((order, index) => {
        const isPending = order.status === 'pending';
        const button = isPending
            ? `<button class="btn btn-orange btn-sm" onclick="openModal(${index})">Xem & Duyệt</button>`
            : `<button class="btn btn-light btn-sm" onclick="openModal(${index})"><i class="fa-solid fa-eye"></i> Xem</button>`;
        return `
            <tr data-status="${order.status}">
                <td class="font-semibold nowrap" style="color: #ea580c;">${order.id}${order.status === 'paid' ? `<div class="paid-badge">${papersBadge(order)}</div>` : ''}</td>
                <td class="text-muted">${order.customer}</td>
                <td>${order.routeShort}${order.border ? '<div class="route-border"><i class="fa-solid fa-flag"></i> ' + order.border + '</div>' : ''}</td>
                <td class="text-muted">${order.horses.length}</td>
                <td class="text-muted">${order.depart}</td>
                <td class="text-right font-semibold nowrap">${formatVND(orderTotal(order))}</td>
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
    ['pending', 'approved', 'rejected', 'paid'].forEach(status => {
        document.getElementById('count-' + status).textContent = orders.filter(o => o.status === status).length;
    });
}

// ===== Modal =====
function renderStepper(order) {
    const steps = ['Tiếp nhận', 'Kiểm dịch', 'Lập lộ trình', 'Phê duyệt'];
    const current = ['approved', 'paid'].includes(order.status) ? steps.length : 3;
    return steps.map((label, i) => {
        let cls = 'step';
        if (order.status === 'rejected' && i === 3) cls += ' step-rejected';
        else if (i < current) cls += ' step-done';
        else if (i === current) cls += ' step-current';
        const icon = cls.includes('done') ? '<i class="fa-solid fa-check"></i>' : cls.includes('rejected') ? '<i class="fa-solid fa-xmark"></i>' : i + 1;
        return `<div class="${cls}"><span class="step-dot">${icon}</span><span class="step-label">${label}</span></div>`;
    }).join('<div class="step-line"></div>');
}

function infoItem(label, value) {
    return `<div class="info-item"><span class="info-label">${label}</span><span class="info-value">${value}</span></div>`;
}

function openModal(index) {
    const order = orders[index];
    activeOrder = order;
    const docs = order.border ? DOCS_CROSS_BORDER : DOCS_DOMESTIC;

    document.getElementById('m-order-id').textContent = order.id;
    document.getElementById('m-order-sub').textContent = `${order.customer} · Gửi ngày ${order.submitted}`;
    document.getElementById('m-stepper').innerHTML = renderStepper(order);

    // Trạng thái đơn đã xử lý
    const banner = document.getElementById('m-status-banner');
    if (order.status === 'pending') {
        banner.style.display = 'none';
    } else {
        const banners = {
            approved: ['banner-success', 'fa-circle-check', `Đã phê duyệt. Chờ khách hàng thanh toán 100% trước <b>${order.paymentDeadline}</b>.`],
            rejected: ['banner-danger', 'fa-circle-xmark', `Từ chối — <b>${order.rejectType}</b>: ${order.note}`],
            paid: order.papers && order.papers.report
                ? ['banner-danger', 'fa-flag', `<b>Kiểm dịch viên ${order.inspector} báo cáo lúc ${order.papers.report.at}</b> — ${order.papers.report.type}.<br>Giấy liên quan: ${order.papers.report.items.join('; ')}.<br>Ghi chú: ${order.papers.report.note}`]
                : ['banner-success', 'fa-circle-check', `Khách đã thanh toán 100% lúc <b>${order.paidAt}</b>. ${order.papers && order.papers.handedAt ? `Giấy tờ đã bàn giao cho Điều phối viên lúc <b>${order.papers.handedAt}</b>.` : `Kiểm dịch viên đang chuẩn bị giấy tờ, hạn bàn giao <b>${order.papers.handoverDue}</b>.`}`]
        };
        const [cls, icon, html] = banners[order.status];
        banner.className = 'status-banner ' + cls;
        banner.innerHTML = `<i class="fa-solid ${icon}"></i><span>${html}</span>`;
        banner.style.display = 'flex';
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

    // 2. Kiểm dịch
    document.getElementById('m-inspect-badge').innerHTML = '<span class="badge badge-success"><i class="fa-solid fa-check"></i> Hợp lệ</span>';
    document.getElementById('m-inspector').innerHTML = `<i class="fa-solid fa-user-doctor"></i> Kiểm dịch viên: <b>${order.inspector}</b>`;
    document.getElementById('m-horses').innerHTML = order.horses.map((h, i) => `
        <details class="horse-item" ${i === 0 ? 'open' : ''}>
            <summary>
                <span><b>${h.name}</b> · ${h.breed} · ${h.sex}</span>
                <span class="text-muted">Chip ${h.chip} · <span class="text-green">${docs.length}/${docs.length} giấy tờ</span></span>
            </summary>
            <ul class="doc-list">
                ${docs.map(d => `<li><i class="fa-solid fa-circle-check"></i> ${d}</li>`).join('')}
            </ul>
        </details>`).join('');
    document.getElementById('m-inspect-note').innerHTML = `<i class="fa-solid fa-comment-dots"></i> ${order.inspectNote}`;

    const files = order.horses.map(h => ({ name: `Ho_so_${h.name.replace(/\s+/g, '_')}.pdf`, size: '1.2 MB', icon: 'fa-file-pdf', color: '#dc2626' }));
    document.getElementById('m-files').innerHTML = files.map(file => `
        <div class="file-item">
            <div class="file-name"><i class="fa-solid ${file.icon}" style="color: ${file.color};"></i><div><div>${file.name}</div><div class="text-muted file-size">${file.size}</div></div></div>
            <div class="file-actions">
                <button class="btn-file"><i class="fa-solid fa-eye"></i> Xem</button>
                <button class="btn-file btn-file-blue"><i class="fa-solid fa-download"></i> Tải xuống</button>
            </div>
        </div>`).join('');

    // 3. Lộ trình
    document.getElementById('m-coordinator').innerHTML = `<i class="fa-solid fa-route"></i> Điều phối viên: <b>${order.coordinator}</b>`;
    document.getElementById('m-vehicle').innerHTML =
        infoItem('Xe', order.vehicle) +
        infoItem('Tài xế (gán theo xe)', order.driver) +
        infoItem('NV chăm sóc', order.grooms);
    document.getElementById('m-stops').innerHTML = order.stops.map(s => `<li>${s}</li>`).join('');

    // 4. Dịch vụ khách chọn
    document.getElementById('m-services').innerHTML = `
        <table class="service-table">
            <thead><tr><th>Dịch vụ</th><th>Lựa chọn của khách</th><th class="text-right">Thành tiền</th></tr></thead>
            <tbody>
                ${order.services.map(svc => `<tr><td class="font-semibold">${svc[0]}</td><td class="text-muted">${svc[1]}</td><td class="text-right nowrap">${formatVND(svc[2])}</td></tr>`).join('')}
            </tbody>
            <tfoot><tr><td colspan="2">Tổng giá trị đơn</td><td class="text-right nowrap">${formatVND(orderTotal(order))}</td></tr></tfoot>
        </table>
        ${order.status === 'pending' ? '<div class="payment-note"><i class="fa-solid fa-credit-card"></i> Sau khi duyệt: khách hàng thanh toán 100% tổng giá trị đơn trong 48 giờ, quá hạn đơn tự hủy.</div>' : ''}`;

    // 5. Giấy tờ chuyến đi (đơn đã thanh toán)
    const papersSection = document.getElementById('m-papers-section');
    papersSection.style.display = order.papers ? 'block' : 'none';
    if (order.papers) renderPapers(order);

    hideRejectBox();
    document.getElementById('decision-buttons').style.display = order.status === 'pending' ? 'flex' : 'none';
    document.getElementById('approvalModal').style.display = 'flex';
    document.querySelector('.approval-modal').scrollTop = 0;
}

function renderPapers(order) {
    const { originals, procedures, originalsDue, handoverDue } = order.papers;
    const scan = '<button class="btn-file"><i class="fa-solid fa-eye"></i> Bản scan</button>';
    document.getElementById('m-papers-badge').innerHTML = papersBadge(order);
    document.getElementById('m-papers-by').innerHTML = `<i class="fa-solid fa-user-doctor"></i> Kiểm dịch viên: <b>${order.inspector}</b> · Khách gửi bản gốc trước <b>${originalsDue}</b> · Bàn giao Điều phối trước <b>${handoverDue}</b>`;
    document.getElementById('m-papers').innerHTML = `
        <table class="service-table papers-table">
            <thead><tr><th>Giấy do cơ quan chức năng cấp</th><th>Thông tin</th><th></th></tr></thead>
            <tbody>
                ${proceduresOf(order).map(label => {
                    const p = procedures[label];
                    return `<tr><td class="font-semibold">${label}</td>
                        <td>${p ? `Số <b>${p.number}</b><div class="text-muted">${p.agency} · cấp ${p.issued}${p.validUntil ? ` · hiệu lực đến ${p.validUntil}` : ''}</div>` : '<span class="badge badge-muted">Chưa có</span>'}</td>
                        <td class="text-right">${p ? scan : ''}</td></tr>`;
                }).join('')}
            </tbody>
            <thead><tr><th>Bản gốc giấy tờ của khách</th><th>Trạng thái</th><th></th></tr></thead>
            <tbody>
                ${originals.map(o => o.docs.map(([doc, receivedAt]) => `<tr>
                    <td>${o.horse} · ${doc}</td>
                    <td>${receivedAt ? `<span class="text-green"><i class="fa-solid fa-circle-check"></i> Đã nhận ${receivedAt}</span>` : '<span class="badge badge-warning">Chưa nhận</span>'}</td>
                    <td class="text-right">${scan}</td></tr>`).join('')).join('')}
            </tbody>
        </table>`;
}

function closeModal() {
    document.getElementById('approvalModal').style.display = 'none';
    hideRejectBox();
    activeOrder = null;
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
    if (activeOrder && activeOrder.status === 'pending') {
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
    activeOrder.rejectType = document.getElementById('reject-type').value;
    activeOrder.note = input.value.trim();
    showToast('Đã từ chối đơn hàng ' + activeOrder.id, 'error');
    closeModal();
    renderTable();
}

function approveOrder() {
    const deadline = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const pad = n => String(n).padStart(2, '0');
    activeOrder.status = 'approved';
    activeOrder.paymentDeadline = `${pad(deadline.getDate())}/${pad(deadline.getMonth() + 1)}/${deadline.getFullYear()} ${pad(deadline.getHours())}:${pad(deadline.getMinutes())}`;
    showToast(`Đã phê duyệt ${activeOrder.id}. Đã gửi yêu cầu thanh toán 100% cho khách hàng (hạn 48 giờ)`, 'success');
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
