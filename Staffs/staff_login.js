document.getElementById('staffLoginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    var email = document.getElementById('email').value.toLowerCase();

    var roleMap = {
        'manager': '../Manager/manager_dashboard.html',
        'driver': '../Driver/index.html',
        'escort': '../Escort/escort_page.html',
        'ops': '../OPS/OPS-03.html'
    };

    var role = Object.keys(roleMap).find(function(key) {
        return email.includes(key);
    });

    if (role) {
        window.location.href = roleMap[role];
    } else {
        alert('Email không hợp lệ hoặc không thuộc hệ thống nội bộ.');
    }
});
