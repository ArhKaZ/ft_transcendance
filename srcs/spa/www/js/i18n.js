let currentTranslations = {};

export async function loadTranslations(lang = 'en') {
    try {
        const response = await fetch(`/static/locales/${lang}.json`);
        currentTranslations = await response.json();
        applyTranslations();
        localStorage.setItem('preferredLang', lang);
    } catch (error) {
        console.error('Error loading translations:', error);
    }
}

function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        element.textContent = currentTranslations[key] || key;
    });
}


export function initI18n() {
    const savedLang = localStorage.getItem('preferredLang') || 
                     navigator.language.split('-')[0] || 'en';
    loadTranslations(savedLang);
    
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            loadTranslations(btn.dataset.lang);
        });
    });
}