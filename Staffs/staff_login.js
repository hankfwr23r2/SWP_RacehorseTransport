document.getElementById('staffLoginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    var email = document.getElementById('email').value.toLowerCase();

    var roleMap = {
        'manager': '../Manager/manager_dashboard.html',
        'driver': '../Driver/index.html',
        'escort': '../Escort/escort_page.html',
        'specialist': '../Specialist/CUS2_Policy_List.html',
        'ops': '../Fleet And Route/OPS-05.html',
        'fleet': '../Fleet And Route/OPS-05.html',
        'route': '../Fleet And Route/OPS-05.html',
        'coordinator': '../Fleet And Route/OPS-05.html'
    };

    var role = Object.keys(roleMap).find(function(key) {
        return email.includes(key);
    });

    if (role) {
        window.location.href = roleMap[role];
    } else {
        alert('Email không hợp lệ hoặc không thuộc hệ thống nội bộ. (Gợi ý: email cần chứa manager, driver, escort, ops hoặc specialist)');
    }
});
