// Custom Alert System
window.customAlert = function(message, icon = '⚠️') {
    const overlay = document.getElementById('customAlert');
    const messageEl = document.getElementById('alertMessage');
    const iconEl = document.getElementById('alertIcon');
    const btn = document.getElementById('alertBtn');

    messageEl.textContent = message;
    iconEl.textContent = icon;

    overlay.classList.add('active');

    const closeAlert = () => {
        overlay.classList.remove('active');
        btn.removeEventListener('click', closeAlert);
        overlay.removeEventListener('click', handleOverlayClick);
    };

    const handleOverlayClick = (e) => {
        if (e.target === overlay) {
            closeAlert();
        }
    };

    btn.addEventListener('click', closeAlert);
    overlay.addEventListener('click', handleOverlayClick);
};

// Override native alert
window.alert = window.customAlert;
