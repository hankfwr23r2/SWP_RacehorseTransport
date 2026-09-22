/**
 * create_request.js - Module Xử lý Tạo Yêu cầu Vận chuyển Ngựa (CUS)
 * Đồng bộ logic chọn Quốc gia -> Hiển thị kho/điểm đến tương ứng,
 * Tự động phát hiện tuyến Nội địa / Quốc tế,
 * Quản lý thông tin cá thể ngựa, tính phí bảo hiểm và đồng bộ dữ liệu sang Bước 4.
 */

// ==========================================
// 1. DỮ LIỆU ĐIỂM ĐI / ĐIỂM ĐẾN THEO QUỐC GIA
// ==========================================
const COUNTRY_LOCATIONS = {
    'VN': [
        { id: 'KHO-DN', name: 'Kho Đồng Nai — Trang trại Đua ngựa Long Thành', type: 'farm' },
        { id: 'KHO-LA', name: 'Kho Long An — Trang trại Huấn luyện Mỹ Quỳnh (Đức Hòa)', type: 'farm' },
        { id: 'KHO-BD', name: 'Kho Bình Dương — Trung tâm Cưỡi ngựa Đức Hòa', type: 'farm' },
        { id: 'SGN', name: 'Sân bay Quốc tế Tân Sơn Nhất (SGN) — Ga Cargo Động vật sống', type: 'airport' },
        { id: 'HAN', name: 'Sân bay Quốc tế Nội Bài (HAN) — Ga Cargo Quốc tế', type: 'airport' },
        { id: 'DAD', name: 'Sân bay Quốc tế Đà Nẵng (DAD) — Ga Hàng hóa Miền Trung', type: 'airport' },
        { id: 'CLB-SG', name: 'CLB Cưỡi ngựa Sài Gòn (Saigon Pony Club - Q.2, TP.HCM)', type: 'club' }
    ],
    'HK': [
        { id: 'HKG', name: 'Sân bay Quốc tế Chek Lap Kok (HKG) — Kho Hàng không Cargo', type: 'airport' },
        { id: 'SHA-TIN', name: 'Trường đua Sha Tin (Sha Tin Racecourse) — Kho tiếp nhận & Chuồng cách ly', type: 'racecourse' },
        { id: 'HAPPY-VALLEY', name: 'Trường đua Happy Valley (Happy Valley Racecourse) — Trạm trung chuyển', type: 'racecourse' },
        { id: 'CONGHUA', name: 'Trung tâm Huấn luyện Tùng Hóa (Conghua Racecourse - HKJC Depot)', type: 'racecourse' }
    ],
    'JP': [
        { id: 'NRT', name: 'Sân bay Quốc tế Narita (NRT) — Ga Hàng Hóa Chiba (Live Animals)', type: 'airport' },
        { id: 'HND', name: 'Sân bay Quốc tế Haneda (HND) — Ga Cargo Quốc tế Tokyo', type: 'airport' },
        { id: 'KIX', name: 'Sân bay Quốc tế Kansai (KIX) — Khu Vận chuyển Động vật Osaka', type: 'airport' },
        { id: 'JRA-MIHO', name: 'Trung tâm Huấn luyện JRA Miho (Ibaraki) — Trạm cách ly thú y', type: 'quarantine' },
        { id: 'JRA-RITTO', name: 'Trung tâm Huấn luyện JRA Ritto (Shiga) — Trạm tiếp nhận ngựa đua', type: 'quarantine' },
        { id: 'TOKYO-RC', name: 'Trường đua Tokyo (Tokyo Racecourse - Fuchu, Tokyo)', type: 'racecourse' }
    ],
    'SG': [
        { id: 'SIN', name: 'Sân bay Quốc tế Changi (SIN) — Changi Airfreight Live Animals Centre', type: 'airport' },
        { id: 'SG-TURF', name: 'Câu lạc bộ Đua ngựa Singapore (Singapore Turf Club - Kranji)', type: 'racecourse' },
        { id: 'SG-EQUEST', name: 'Trung tâm Cưỡi ngựa Quốc gia Singapore (National Equestrian Centre)', type: 'club' },
        { id: 'SG-BUKIT', name: 'Câu lạc bộ Cưỡi ngựa Bukit Timah Saddle Club', type: 'club' }
    ],
    'AU': [
        { id: 'MEL', name: 'Sân bay Quốc tế Melbourne (MEL) — Live Animal Cargo Terminal', type: 'airport' },
        { id: 'SYD', name: 'Sân bay Quốc tế Sydney Kingsford Smith (SYD) — Ga Hàng Hóa Quốc tế', type: 'airport' },
        { id: 'BNE', name: 'Sân bay Quốc tế Brisbane (BNE) — Ga Cargo Hàng không', type: 'airport' },
        { id: 'FLEMINGTON', name: 'Trường đua Flemington (Flemington Racecourse, Victoria)', type: 'racecourse' },
        { id: 'RANDWICK', name: 'Trường đua Royal Randwick (Sydney, New South Wales)', type: 'racecourse' },
        { id: 'MICKLEHAM', name: 'Trạm Kiểm dịch Động vật Mickleham (Post-Entry Quarantine Facility)', type: 'quarantine' }
    ],
    'NZ': [
        { id: 'AKL', name: 'Sân bay Quốc tế Auckland (AKL) — Auckland Cargo Live Animals Hub', type: 'airport' },
        { id: 'CHC', name: 'Sân bay Quốc tế Christchurch (CHC) — Ga Hàng Hóa Đảo Nam', type: 'airport' },
        { id: 'ELLERSLIE', name: 'Trường đua Ellerslie (Ellerslie Racecourse, Auckland)', type: 'racecourse' },
        { id: 'TRENTHAM', name: 'Trường đua Trentham (Wellington Racing Club)', type: 'racecourse' },
        { id: 'KARAKA', name: 'Tổ hợp Đấu giá & Kiểm dịch Thú y Karaka (Karaka Sales Complex)', type: 'quarantine' }
    ],
    'AE': [
        { id: 'DXB', name: 'Sân bay Quốc tế Dubai (DXB) — Dnata Live Animal Facility', type: 'airport' },
        { id: 'DWC', name: 'Sân bay Quốc tế Al Maktoum (DWC) — Dubai South Aviation Cargo Hub', type: 'airport' },
        { id: 'AUH', name: 'Sân bay Quốc tế Abu Dhabi (AUH) — Ga Hàng hóa Chuyên dụng', type: 'airport' },
        { id: 'MEYDAN', name: 'Trường đua Meydan (Meydan Racecourse Stables, Dubai)', type: 'racecourse' },
        { id: 'DUBAI-POLO', name: 'Câu lạc bộ Polo & Đua ngựa Dubai (Dubai Polo & Equestrian Club)', type: 'club' },
        { id: 'ABU-DHABI-EQ', name: 'Trường đua Abu Dhabi Equestrian Club', type: 'racecourse' }
    ],
    'GB': [
        { id: 'LHR', name: 'Sân bay London Heathrow (LHR) — Heathrow Animal Reception Centre (HARC)', type: 'airport' },
        { id: 'STN', name: 'Sân bay London Stansted (STN) — Ga Cargo Hàng không Chuyên dụng', type: 'airport' },
        { id: 'NEWMARKET', name: 'Trường đua Newmarket (Newmarket Racecourses & Equine Hospital, Suffolk)', type: 'racecourse' },
        { id: 'ASCOT', name: 'Trường đua Ascot (Ascot Racecourse, Berkshire)', type: 'racecourse' },
        { id: 'CHELTENHAM', name: 'Trường đua Cheltenham (Cheltenham Racecourse, Gloucestershire)', type: 'racecourse' },
        { id: 'DONCASTER', name: 'Khu Kiểm dịch Thú y Doncaster Equine Centre', type: 'quarantine' }
    ],
    'FR': [
        { id: 'CDG', name: 'Sân bay Paris Charles de Gaulle (CDG) — Station Animalière Cargo', type: 'airport' },
        { id: 'LONGCHAMP', name: 'Trường đua ParisLongchamp (Hippodrome de ParisLongchamp, Paris)', type: 'racecourse' },
        { id: 'CHANTILLY', name: 'Trung tâm Huấn luyện & Trường đua Chantilly (France Galop, Chantilly)', type: 'racecourse' },
        { id: 'DEAUVILLE', name: 'Trung tâm Huấn luyện Deauville-La Touques (Normandie)', type: 'racecourse' },
        { id: 'PAU-PYRENEES', name: 'Khu Chuồng cách ly Thú y Quốc tế Pau Pyrenees', type: 'quarantine' }
    ]
};

// ==========================================
// 2. HÀM TẠO VÀ ĐỔ DỮ LIỆU ĐIỂM ĐẾN / KHO
// ==========================================

/**
 * Đổ danh sách kho/sân bay vào thẻ <select> dựa trên quốc gia đã chọn
 * @param {string} selectId - ID của thẻ select vị trí (origin_location hoặc dest_location)
 * @param {string} countryCode - Mã quốc gia (VN, HK, JP, ...)
 * @param {string} selectedId - ID vị trí mặc định muốn chọn
 */
function populateLocations(selectId, countryCode, selectedId = null) {
    const selectElem = document.getElementById(selectId);
    if (!selectElem) return;

    selectElem.innerHTML = '';
    const locations = COUNTRY_LOCATIONS[countryCode] || [];

    if (locations.length === 0) {
        const defaultOpt = document.createElement('option');
        defaultOpt.value = '';
        defaultOpt.textContent = '— Không có dữ liệu kho/sân bay —';
        selectElem.appendChild(defaultOpt);
        return;
    }

    const placeholderOpt = document.createElement('option');
    placeholderOpt.value = '';
    placeholderOpt.textContent = selectId === 'origin_location' ? '— Chọn điểm xuất phát —' : '— Chọn điểm đến nhận ngựa —';
    selectElem.appendChild(placeholderOpt);

    let isSelectedApplied = false;
    locations.forEach(loc => {
        const opt = document.createElement('option');
        opt.value = loc.id;
        opt.textContent = loc.name;
        if (selectedId && loc.id === selectedId) {
            opt.selected = true;
            isSelectedApplied = true;
        }
        selectElem.appendChild(opt);
    });

    // Nếu chưa chọn mục nào, chọn mục đầu tiên hợp lệ
    if (!isSelectedApplied && locations.length > 0) {
        selectElem.selectedIndex = 1;
    }
}

/**
 * Cập nhật danh sách điểm đón khi đổi Quốc gia Xuất phát
 */
function updateOriginLocations(selectedLocationId = null) {
    const originCountry = document.getElementById('origin_country')?.value || 'VN';
    populateLocations('origin_location', originCountry, selectedLocationId);
    detectTransportType();
}

/**
 * Cập nhật danh sách điểm giao khi đổi Quốc gia Đến
 */
function updateDestLocations(selectedLocationId = null) {
    const destCountry = document.getElementById('dest_country')?.value || 'HK';
    populateLocations('dest_location', destCountry, selectedLocationId);
    detectTransportType();
}

/**
 * Tự động phát hiện phương thức Vận chuyển (Nội địa vs Quốc tế)
 */
function detectTransportType() {
    const originCountry = document.getElementById('origin_country')?.value;
    const destCountry = document.getElementById('dest_country')?.value;
    const badge = document.getElementById('route-badge-container');

    if (!badge || !originCountry || !destCountry) return;

    if (originCountry === destCountry && originCountry === 'VN') {
        badge.className = 'alert-box alert-info';
        badge.innerHTML = `
            <i class="fa-solid fa-truck" style="color: #1d4ed8; font-size: 1.3rem; margin-top: 2px;"></i>
            <div>
                <strong style="color: #1e40af;">Vận chuyển Nội địa:</strong> Tuyến đường bộ nội địa sử dụng đội xe tải chuyên dụng có điều hòa ổn nhiệt, đệm sàn chống sốc khí nén, hệ thống camera giám sát trực tiếp 24/7 và bác sĩ thú y theo dõi suốt hành trình.
            </div>
        `;
    } else {
        const originName = getCountryName(originCountry);
        const destName = getCountryName(destCountry);
        badge.className = 'alert-box alert-warning';
        badge.innerHTML = `
            <i class="fa-solid fa-plane-departure text-orange" style="font-size: 1.3rem; margin-top: 2px;"></i>
            <div>
                <strong style="color: #9a3412;">Vận chuyển Quốc tế (${originName} &rarr; ${destName}):</strong> Tuyến đường yêu cầu kiểm dịch xuất/nhập cảnh thú y chuẩn OIE, vận chuyển bằng chuyên cơ Air Cargo khoang áp suất ổn định và trung chuyển bằng xe tải chuyên dụng hai đầu.
            </div>
        `;
    }
}

function getCountryName(code) {
    const map = {
        'VN': 'Việt Nam',
        'HK': 'Hồng Kông (SAR)',
        'JP': 'Nhật Bản',
        'SG': 'Singapore',
        'AU': 'Úc',
        'NZ': 'New Zealand',
        'AE': 'UAE (Dubai)',
        'GB': 'Vương quốc Anh',
        'FR': 'Pháp'
    };
    return map[code] || code;
}

// ==========================================
// 3. QUẢN LÝ DỮ LIỆU & STORAGE GIỮA CÁC BƯỚC
// ==========================================

const STORAGE_KEY = 'SWP_RACEHORSE_TRANSPORT_REQUEST';

function getStoredRequest() {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : getDefaultRequestData();
    } catch (e) {
        return getDefaultRequestData();
    }
}

function saveRequestData(partialData) {
    try {
        const current = getStoredRequest();
        const merged = { ...current, ...partialData };
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        return merged;
    } catch (e) {
        console.warn('Cannot save to sessionStorage', e);
    }
}

function getDefaultRequestData() {
    return {
        // Bước 1
        originCountry: 'VN',
        originLocation: 'KHO-DN',
        originLocationName: 'Kho Đồng Nai — Trang trại Đua ngựa Long Thành',
        destCountry: 'HK',
        destLocation: 'HKG',
        destLocationName: 'Sân bay Quốc tế Chek Lap Kok (HKG) — Kho Hàng không Cargo',
        isInternational: true,
        departureDate: '2026-11-15',
        quantity: 1,
        urgency: 'standard',
        // Bước 2
        horses: [
            {
                id: 1,
                name: 'Storm Runner',
                microchip: '#VN-985211',
                breed: 'Thoroughbred (Thuần chủng Anh)',
                gender: 'Thiến (Gelding)',
                age: 5,
                weight: 520,
                color: 'Nâu đỏ (Bay)',
                marks: 'Sao trắng trán, tất trắng chân sau'
            }
        ],
        // Bước 3
        hasDisease: 'no',
        hasMedication: 'no',
        diseaseDetail: '',
        needIsolation: 'no',
        feeding: 'yes',
        foodType: 'hay',
        foodTypeName: 'Cỏ khô Timothy Hay cao cấp',
        stallType: 'standard',
        stallTypeName: 'Khoang Tiêu chuẩn (1.2m × 2.4m)',
        waterSupplement: 'electrolyte',
        waterSupplementName: 'Nước khoáng tinh khiết + Bổ sung điện giải',
        insurance: 'basic',
        insuranceName: 'Gói Cơ bản (2% giá trị khai báo)',
        horseValue: 2000000000,
        specialCare: ''
    };
}

// ==========================================
// 4. KHỞI TẠO BƯỚC 1 (Tuyến đường)
// ==========================================
function initStep1() {
    const originCountrySelect = document.getElementById('origin_country');
    const destCountrySelect = document.getElementById('dest_country');
    const form = document.querySelector('form[action="create_request_step2.html"]');

    if (!originCountrySelect || !destCountrySelect) return;

    const data = getStoredRequest();

    // Set initial values
    if (data.originCountry) originCountrySelect.value = data.originCountry;
    if (data.destCountry) destCountrySelect.value = data.destCountry;
    if (data.departureDate && document.getElementById('date')) {
        document.getElementById('date').value = data.departureDate;
    }
    if (data.quantity && document.getElementById('quantity')) {
        document.getElementById('quantity').value = data.quantity;
    }
    if (data.urgency && document.getElementById('urgency')) {
        document.getElementById('urgency').value = data.urgency;
    }

    // Populate initial dropdowns
    updateOriginLocations(data.originLocation);
    updateDestLocations(data.destLocation);

    // Form submit listener
    if (form) {
        form.addEventListener('submit', function (e) {
            const originLocElem = document.getElementById('origin_location');
            const destLocElem = document.getElementById('dest_location');
            const originLocText = originLocElem?.options[originLocElem.selectedIndex]?.text || '';
            const destLocText = destLocElem?.options[destLocElem.selectedIndex]?.text || '';

            saveRequestData({
                originCountry: originCountrySelect.value,
                originLocation: originLocElem?.value,
                originLocationName: originLocText,
                destCountry: destCountrySelect.value,
                destLocation: destLocElem?.value,
                destLocationName: destLocText,
                isInternational: originCountrySelect.value !== destCountrySelect.value,
                departureDate: document.getElementById('date')?.value || '2026-11-15',
                quantity: parseInt(document.getElementById('quantity')?.value, 10) || 1,
                urgency: document.getElementById('urgency')?.value || 'standard'
            });
        });
    }
}

// ==========================================
// 5. KHỞI TẠO BƯỚC 2 (Thông tin Ngựa)
// ==========================================
function initStep2() {
    const form = document.querySelector('form[action="create_request_step3.html"]');
    if (!form) return;

    const data = getStoredRequest();

    // Check if horse quantity > 1, auto-show horse 2
    if (data.quantity > 1 || (data.horses && data.horses.length > 1)) {
        toggleHorse2(true);
    }

    form.addEventListener('submit', function (e) {
        const breedSelect = document.getElementById('breed_1');
        const genderSelect = document.getElementById('gender_1');
        const colorSelect = document.getElementById('color_1');

        const horse1 = {
            id: 1,
            name: document.getElementById('horse_name_1')?.value || 'Storm Runner',
            microchip: document.getElementById('microchip_1')?.value || '#VN-985211',
            breed: breedSelect ? breedSelect.options[breedSelect.selectedIndex].text : 'Thoroughbred',
            gender: genderSelect ? genderSelect.options[genderSelect.selectedIndex].text : 'Thiến (Gelding)',
            age: parseInt(document.getElementById('age_1')?.value, 10) || 5,
            weight: parseInt(document.getElementById('weight_1')?.value, 10) || 520,
            color: colorSelect ? colorSelect.options[colorSelect.selectedIndex].text : 'Nâu đỏ (Bay)',
            marks: document.getElementById('marks_1')?.value || ''
        };

        const horses = [horse1];

        // Horse 2 check
        const horse2Section = document.getElementById('horse-2-section');
        if (horse2Section && horse2Section.style.display !== 'none') {
            const breed2 = document.getElementById('breed_2');
            const gender2 = document.getElementById('gender_2');
            const color2 = document.getElementById('color_2');
            const horse2 = {
                id: 2,
                name: document.getElementById('horse_name_2')?.value || 'Thunder Bolt',
                microchip: document.getElementById('microchip_2')?.value || '#VN-985212',
                breed: breed2 ? breed2.options[breed2.selectedIndex].text : 'Thoroughbred',
                gender: gender2 ? gender2.options[gender2.selectedIndex].text : 'Đực (Stallion)',
                age: parseInt(document.getElementById('age_2')?.value, 10) || 4,
                weight: parseInt(document.getElementById('weight_2')?.value, 10) || 490,
                color: color2 ? color2.options[color2.selectedIndex].text : 'Hạt dẻ (Chestnut)',
                marks: ''
            };
            horses.push(horse2);
        }

        saveRequestData({
            horses: horses,
            quantity: horses.length
        });
    });
}

function toggleHorse2(show) {
    const section = document.getElementById('horse-2-section');
    const btn = document.getElementById('btn-add-horse');
    if (!section) return;

    if (show) {
        section.style.display = 'block';
        if (btn) btn.style.display = 'none';
    } else {
        section.style.display = 'none';
        if (btn) btn.style.display = 'flex';
    }
}

// ==========================================
// 6. KHỞI TẠO BƯỚC 3 (Dịch vụ & Y tế)
// ==========================================
function initStep3() {
    const form = document.querySelector('form[action="create_request_step4.html"]');
    if (!form) return;

    // Trigger initial calculation
    calculateInsurance();

    form.addEventListener('submit', function (e) {
        const foodTypeSelect = document.getElementById('food_type');
        const stallTypeSelect = document.getElementById('stall_type');
        const waterSelect = document.getElementById('water_supplement');
        const insuranceSelect = document.getElementById('insurance');
        const horseValStr = document.getElementById('horse_value')?.value.replace(/\D/g, '') || '2000000000';

        saveRequestData({
            hasDisease: document.getElementById('has_disease')?.value || 'no',
            hasMedication: document.getElementById('has_medication')?.value || 'no',
            diseaseDetail: document.getElementById('disease_detail')?.value || '',
            needIsolation: document.getElementById('need_isolation')?.value || 'no',
            feeding: document.getElementById('feeding')?.value || 'yes',
            foodType: foodTypeSelect?.value || 'hay',
            foodTypeName: foodTypeSelect ? foodTypeSelect.options[foodTypeSelect.selectedIndex].text : 'Cỏ khô Timothy Hay',
            stallType: stallTypeSelect?.value || 'standard',
            stallTypeName: stallTypeSelect ? stallTypeSelect.options[stallTypeSelect.selectedIndex].text : 'Khoang Tiêu chuẩn (1.2m × 2.4m)',
            waterSupplement: waterSelect?.value || 'normal',
            waterSupplementName: waterSelect ? waterSelect.options[waterSelect.selectedIndex].text : 'Nước sạch tiêu chuẩn',
            insurance: insuranceSelect?.value || 'basic',
            insuranceName: insuranceSelect ? insuranceSelect.options[insuranceSelect.selectedIndex].text : 'Gói Cơ bản (2%)',
            horseValue: parseInt(horseValStr, 10) || 2000000000,
            specialCare: document.getElementById('special_care')?.value || ''
        });
    });
}

function calculateInsurance() {
    const typeElem = document.getElementById('insurance');
    const valElem = document.getElementById('horse_value');
    const display = document.getElementById('insurance_display');
    if (!typeElem || !valElem || !display) return;

    const type = typeElem.value;
    const valStr = valElem.value.replace(/,/g, '').replace(/\D/g, '');
    const val = parseFloat(valStr) || 0;

    let rate = 0;
    if (type === 'basic') rate = 0.02;
    else if (type === 'premium') rate = 0.035;
    else if (type === 'full') rate = 0.05;

    if (rate === 0) {
        display.innerHTML = '<i class="fa-solid fa-info-circle" style="margin-right: 8px;"></i> 0 VND (Không đăng ký gói bảo hiểm)';
        display.style.color = '#64748b';
        display.style.background = '#f1f5f9';
        display.style.borderColor = '#cbd5e1';
    } else {
        const fee = val * rate;
        display.innerHTML = `<i class="fa-solid fa-calculator" style="margin-right: 8px; color: #059669;"></i> ${fee.toLocaleString('vi-VN')} VND (${(rate * 100).toFixed(1)}% × ${val.toLocaleString('vi-VN')} VND)`;
        display.style.color = '#059669';
        display.style.background = '#ecfdf5';
        display.style.borderColor = '#a7f3d0';
    }
}

// ==========================================
// 7. KHỞI TẠO BƯỚC 4 (Xác nhận & Bảng Dự toán)
// ==========================================
function initStep4() {
    const data = getStoredRequest();

    // Điểm xuất phát & đến
    const originCountryName = getCountryName(data.originCountry);
    const destCountryName = getCountryName(data.destCountry);
    const isDomestic = data.originCountry === data.destCountry && data.originCountry === 'VN';

    // Cập nhật thẻ tóm tắt 1: Tuyến đường
    const routeReviewGrid = document.querySelector('.card:nth-of-type(1) .review-grid');
    if (routeReviewGrid) {
        routeReviewGrid.innerHTML = `
            <div class="review-item">
                <div class="review-label">Quốc gia Xuất phát</div>
                <div class="review-value">${data.originCountry === 'VN' ? '🇻🇳' : '🌐'} ${originCountryName}</div>
            </div>
            <div class="review-item">
                <div class="review-label">Kho / Điểm xuất phát</div>
                <div class="review-value font-semibold">${data.originLocationName || data.originLocation}</div>
            </div>
            <div class="review-item">
                <div class="review-label">Quốc gia Đích đến</div>
                <div class="review-value">${data.destCountry === 'VN' ? '🇻🇳' : '🌐'} ${destCountryName}</div>
            </div>
            <div class="review-item">
                <div class="review-label">Sân bay / Điểm đến nhận ngựa</div>
                <div class="review-value font-semibold">${data.destLocationName || data.destLocation}</div>
            </div>
            <div class="review-item">
                <div class="review-label">Phương thức vận chuyển</div>
                <div class="review-value">${isDomestic ? 'Nội địa — Đội xe tải chuyên dụng kiểm soát nhiệt độ & chống sốc' : 'Quốc tế — Air Cargo chuyên dụng + Trucking 2 đầu'}</div>
            </div>
            <div class="review-item">
                <div class="review-label">Ngày khởi hành dự kiến</div>
                <div class="review-value">${formatDateVN(data.departureDate)} (${data.urgency === 'urgent' ? 'Hỏa tốc' : data.urgency === 'priority' ? 'Ưu tiên' : 'Tiêu chuẩn'})</div>
            </div>
        `;
    }

    // Cập nhật thẻ tóm tắt 2: Ngựa
    const horseReviewGrid = document.querySelector('.card:nth-of-type(2) .review-grid');
    if (horseReviewGrid && data.horses && data.horses.length > 0) {
        let html = '';
        data.horses.forEach((h, idx) => {
            html += `
                <div class="review-item">
                    <div class="review-label">Tên cá thể ngựa #${h.id}</div>
                    <div class="review-value font-bold">${h.name}</div>
                </div>
                <div class="review-item">
                    <div class="review-label">Mã Vi chip Microchip ID</div>
                    <div class="review-value font-bold text-orange">${h.microchip}</div>
                </div>
                <div class="review-item">
                    <div class="review-label">Giống ngựa / Giới tính</div>
                    <div class="review-value">${h.breed} | ${h.gender}</div>
                </div>
                <div class="review-item">
                    <div class="review-label">Độ tuổi / Thể trọng</div>
                    <div class="review-value">${h.age} tuổi | ${h.weight} kg</div>
                </div>
                <div class="review-item">
                    <div class="review-label">Màu lông & Đặc điểm</div>
                    <div class="review-value">${h.color}${h.marks ? ' — ' + h.marks : ''}</div>
                </div>
                <div class="review-item">
                    <div class="review-label">Hình ảnh nhận dạng</div>
                    <div class="review-value"><span class="badge badge-success"><i class="fa-solid fa-circle-check"></i> Đã đính kèm ảnh</span></div>
                </div>
            `;
        });
        horseReviewGrid.innerHTML = html;
    }

    // Cập nhật bảng chi phí động
    recalculateStep4Quotation(data);
}

function recalculateStep4Quotation(data) {
    const isDomestic = data.originCountry === data.destCountry && data.originCountry === 'VN';
    const quantity = data.horses ? data.horses.length : (data.quantity || 1);

    // Tính toán cước phí
    let baseFreight = isDomestic ? 25000000 * quantity : 120000000 * quantity;
    let quarantineFee = isDomestic ? 3000000 * quantity : 15000000 * quantity;
    let feedFee = 500000 * 3 * quantity; // 3 ngày
    let stallFee = data.stallType === 'vip' ? 12000000 * quantity : 0;
    
    // Bảo hiểm
    let insuranceRate = 0;
    if (data.insurance === 'basic') insuranceRate = 0.02;
    else if (data.insurance === 'premium') insuranceRate = 0.035;
    else if (data.insurance === 'full') insuranceRate = 0.05;
    let insuranceFee = (data.horseValue || 2000000000) * insuranceRate;

    let escortFee = 8500000;
    if (data.needIsolation === 'yes') baseFreight += 10000000;

    const totalCost = baseFreight + quarantineFee + feedFee + stallFee + insuranceFee + escortFee;
    const depositCost = totalCost * 0.5;

    // Tìm bảng và cập nhật
    const tbody = document.querySelector('.data-table tbody');
    const tfoot = document.querySelector('.data-table tfoot');

    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td>
                    <div class="font-semibold">${isDomestic ? 'Cước vận chuyển Nội địa đường bộ chuyên dụng' : 'Cước vận chuyển Quốc tế Đa phương thức'}</div>
                    <div class="text-muted" style="font-size: 0.8rem;">${data.originLocationName} &rarr; ${data.destLocationName}</div>
                </td>
                <td class="text-right font-semibold">${(baseFreight / quantity).toLocaleString('vi-VN')} ₫</td>
                <td class="text-center">${quantity} Cá thể</td>
                <td class="text-right font-bold">${baseFreight.toLocaleString('vi-VN')} ₫</td>
            </tr>
            <tr>
                <td>
                    <div class="font-semibold">${isDomestic ? 'Phí Kiểm dịch Thú y Thú cưng / Gia súc liên tỉnh' : 'Phí Kiểm dịch Thú y Quốc tế & Thủ tục Hải quan OIE'}</div>
                    <div class="text-muted" style="font-size: 0.8rem;">Chứng nhận an toàn sinh học và kiểm tra cửa khẩu</div>
                </td>
                <td class="text-right font-semibold">${(quarantineFee / quantity).toLocaleString('vi-VN')} ₫</td>
                <td class="text-center">${quantity} Đơn</td>
                <td class="text-right font-bold">${quarantineFee.toLocaleString('vi-VN')} ₫</td>
            </tr>
            <tr>
                <td>
                    <div class="font-semibold">Khẩu phần dinh dưỡng (${data.foodTypeName || 'Cỏ khô Timothy Hay'})</div>
                    <div class="text-muted" style="font-size: 0.8rem;">Dự phòng 3 ngày hành trình và thời gian trung chuyển</div>
                </td>
                <td class="text-right font-semibold">500,000 ₫/ngày</td>
                <td class="text-center">${3 * quantity} Khẩu phần</td>
                <td class="text-right font-bold">${feedFee.toLocaleString('vi-VN')} ₫</td>
            </tr>
            <tr>
                <td>
                    <div class="font-semibold">Quy cách khoang vận chuyển: ${data.stallTypeName || 'Khoang Tiêu chuẩn'}</div>
                    <div class="text-muted" style="font-size: 0.8rem;">Sàn đệm cao su giảm chấn, thông khí đa chiều</div>
                </td>
                <td class="text-right font-semibold">${stallFee > 0 ? (stallFee / quantity).toLocaleString('vi-VN') + ' ₫' : '—'}</td>
                <td class="text-center">${quantity} Khoang</td>
                <td class="text-right font-bold" style="${stallFee > 0 ? '' : 'color: #059669;'}">${stallFee > 0 ? stallFee.toLocaleString('vi-VN') + ' ₫' : 'Đã bao gồm'}</td>
            </tr>
            <tr>
                <td>
                    <div class="font-semibold">Bảo hiểm vận chuyển (${data.insuranceName || 'Gói Cơ bản'})</div>
                    <div class="text-muted" style="font-size: 0.8rem;">Giá trị ngựa khai báo: ${(data.horseValue || 2000000000).toLocaleString('vi-VN')} ₫</div>
                </td>
                <td class="text-right font-semibold">${(insuranceRate * 100).toFixed(1)}% giá trị</td>
                <td class="text-center">1 Hợp đồng</td>
                <td class="text-right font-bold">${insuranceFee.toLocaleString('vi-VN')} ₫</td>
            </tr>
            <tr>
                <td>
                    <div class="font-semibold">Chuyên viên Hộ tống & Giám sát Y tế Sức khỏe 24/7 (Escort)</div>
                    <div class="text-muted" style="font-size: 0.8rem;">Theo dõi sinh trắc, nhịp tim và báo cáo GPS theo thời gian thực</div>
                </td>
                <td class="text-right font-semibold">${escortFee.toLocaleString('vi-VN')} ₫</td>
                <td class="text-center">1 Chuyên viên</td>
                <td class="text-right font-bold">${escortFee.toLocaleString('vi-VN')} ₫</td>
            </tr>
        `;
    }

    if (tfoot) {
        tfoot.innerHTML = `
            <tr style="background: #0f172a; color: white;">
                <td colspan="3" style="padding: 14px 16px; font-weight: 700; font-size: 1rem;">
                    TỔNG CHI PHÍ DỰ TOÁN TỰ ĐỘNG
                </td>
                <td class="text-right" style="padding: 14px 16px; font-weight: 800; font-size: 1.2rem; color: #fb923c;">
                    ${totalCost.toLocaleString('vi-VN')} VND
                </td>
            </tr>
            <tr style="background: #1e293b; color: #cbd5e1;">
                <td colspan="3" style="padding: 10px 16px; font-size: 0.85rem;">
                    Tiền đặt cọc giữ chỗ & thẩm định lịch bay (50%)
                </td>
                <td class="text-right font-bold" style="padding: 10px 16px; font-size: 0.95rem; color: #fbbf24;">
                    ${depositCost.toLocaleString('vi-VN')} VND
                </td>
            </tr>
        `;
    }
}

function formatDateVN(dateStr) {
    if (!dateStr) return '15/11/2026';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
}

// ==========================================
// 8. TỰ ĐỘNG KHỞI CHẠY KHI TẢI TRANG
// ==========================================
document.addEventListener('DOMContentLoaded', function () {
    const path = window.location.pathname;

    if (path.includes('create_request_step2.html')) {
        initStep2();
    } else if (path.includes('create_request_step3.html')) {
        initStep3();
    } else if (path.includes('create_request_step4.html')) {
        initStep4();
    } else if (path.includes('create_request.html')) {
        initStep1();
    }
});
