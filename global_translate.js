// ===== Global Translate JS ===== //

function initTranslate() {
    // 1. Inject HTML elements if they don't exist
    if (!document.getElementById("google_translate_element")) {
        const gtDiv = document.createElement("div");
        gtDiv.id = "google_translate_element";
        gtDiv.style.display = "none";
        document.body.appendChild(gtDiv);
    }

    if (!document.getElementById("custom-lang-toggle")) {
        const btn = document.createElement("button");
        btn.id = "custom-lang-toggle";
        btn.className = "custom-lang-toggle-btn lang-vi";
        btn.innerText = "Switch to EN";
        document.body.appendChild(btn);
    }

    // 2. Load Google Translate Script
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    document.head.appendChild(script);

    // 3. Setup Button Event Listener
    const toggleBtn = document.getElementById("custom-lang-toggle");
    
    // Check initial state from cookie
    const currentLang = getCookie("googtrans") || "";
    if (currentLang.includes("/vi/en") || currentLang.includes("/auto/en")) {
        toggleBtn.className = "custom-lang-toggle-btn lang-en";
        toggleBtn.innerText = "Chuyển sang VI";
    }

    toggleBtn.addEventListener("click", function() {
        const isEnglish = toggleBtn.classList.contains("lang-en");
        
        if (isEnglish) {
            // Switch back to Vietnamese (Original)
            doGTranslate('vi|vi');
            toggleBtn.className = "custom-lang-toggle-btn lang-vi";
            toggleBtn.innerText = "Switch to EN";
            // Clear translation cookie to completely reset
            setCookie("googtrans", "", -1);
            setCookie("googtrans", "", -1, ".equinezlogistics.com"); // Adjust domain if needed
            location.reload(); // Reload to restore original Vietnamese DOM
        } else {
            // Switch to English
            doGTranslate('vi|en');
            toggleBtn.className = "custom-lang-toggle-btn lang-en";
            toggleBtn.innerText = "Chuyển sang VI";
        }
    });
}

// Wait for DOM to load or execute immediately if already loaded
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTranslate);
} else {
    initTranslate();
}

// Google Translate Initialization
function googleTranslateElementInit() {
    new google.translate.TranslateElement({
        pageLanguage: 'vi',
        includedLanguages: 'en,vi',
        autoDisplay: false
    }, 'google_translate_element');
}

// Custom trigger for Google Translate
function doGTranslate(langPair) {
    if (langPair.value) langPair = langPair.value;
    if (langPair == '') return;
    
    const lang = langPair.split('|')[1];
    
    // Set cookie for automatic translation on page load
    setCookie("googtrans", `/vi/${lang}`, 1);
    
    // Trigger Google Translate change event
    const teCombo = document.querySelector('select.goog-te-combo');
    if (teCombo) {
        teCombo.value = lang;
        teCombo.dispatchEvent(new Event('change'));
    }
}

// Utility: Cookie Setter
function setCookie(name, value, days, domain) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    let cookieStr = name + "=" + (value || "") + expires + "; path=/";
    if (domain) cookieStr += "; domain=" + domain;
    document.cookie = cookieStr;
}

// Utility: Cookie Getter
function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for(let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}
