// --- Tema Yönetimi ---
function toggleTheme() {
    const html = document.documentElement;
    const btn = document.getElementById('themeToggleBtn');
    if (html.getAttribute('data-theme') === 'dark') {
        html.setAttribute('data-theme', 'light');
        btn.textContent = '🌙 Koyu Mod';
    } else {
        html.setAttribute('data-theme', 'dark');
        btn.textContent = '☀️ Açık Mod';
    }
}

// --- Çevrimdışı Durumu Kontrolü ---
function updateOnlineStatus() {
    const banner = document.getElementById('offlineBanner');
    if (navigator.onLine) {
        banner.style.display = 'none';
    } else {
        banner.style.display = 'block';
    }
}
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
updateOnlineStatus();

// --- WMO Hava Durumu Kodları Çevirisi ---
function getWeatherConditionText(code) {
    const conditions = {
        0: 'Açık / Güneşli',
        1: 'Çoğunlukla Açık',
        2: 'Parçalı Bulutlu',
        3: 'Kapalı / Bulutlu',
        45: 'Sisli',
        48: 'Kırağı Sisi',
        51: 'Hafif Çisenti',
        53: 'Çisenti',
        55: 'Yoğun Çisenti',
        61: 'Hafif Yağmurlu',
        63: 'Yağmurlu',
        65: 'Şiddetli Yağmur',
        71: 'Hafif Karlı',
        73: 'Karlı',
        75: 'Yoğun Kar',
        95: 'Fırtınalı'
    };
    return conditions[code] || 'Bilinmiyor';
}

// --- Hava Durumuna Göre Arka Plan ve Animasyon Seçimi ---
function updateWeatherThemeAndAnimation(code) {
    const body = document.getElementById('appBody');
    const iconContainer = document.getElementById('weatherIconAnim');

    // Sınıfları sıfırla
    body.className = '';

    let emoji = '☀️';
    let animClass = 'anim-sun';
    let themeClass = 'weather-default';

    if (code === 0 || code === 1) {
        emoji = '☀️';
        animClass = 'anim-sun';
        themeClass = 'weather-sunny';
    } else if (code >= 51 && code <= 65 || code === 95) {
        emoji = code === 95 ? '⛈️' : '🌧️';
        animClass = 'anim-rain';
        themeClass = 'weather-rainy';
    } else if (code >= 2 && code <= 3 || code >= 45) {
        emoji = '☁️';
        animClass = 'anim-cloud';
        themeClass = 'weather-cloudy';
    } else if (code >= 71 && code <= 75) {
        emoji = '❄️';
        animClass = 'anim-rain';
        themeClass = 'weather-rainy';
    } else {
        emoji = '⛅';
        animClass = 'anim-cloud';
        themeClass = 'weather-default';
    }

    body.classList.add(themeClass);
    iconContainer.textContent = emoji;
    iconContainer.className = `weather-icon-anim ${animClass}`;
}

// --- UI Yardımcıları ---
function showError(msg) {
    const box = document.getElementById('errorBox');
    box.textContent = msg;
    box.style.display = 'block';
    document.getElementById('currentWeatherCard').style.display = 'none';
    document.getElementById('forecastCard').style.display = 'none';
}

function hideError() {
    document.getElementById('errorBox').style.display = 'none';
}

function setLoading(isLoading) {
    document.getElementById('loadingBox').style.display = isLoading ? 'block' : 'none';
}

// --- 1. Şehir Adı ile Arama ---
async function searchCity() {
    const query = document.getElementById('cityInput').value.trim();
    if (!query) {
        showError('Lütfen geçerli bir şehir adı giriniz.');
        return;
    }
    hideError();
    setLoading(true);

    try {
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=tr&format=json`);
        const geoData = await geoRes.json();

        if (!geoData.results || geoData.results.length === 0) {
            setLoading(false);
            showError(`"${query}" adında bir şehir bulunamadı. Lütfen kontrol edip tekrar deneyin.`);
            return;
        }

        const location = geoData.results[0];
        await fetchWeatherData(location.latitude, location.longitude, `${location.name}, ${location.country || ''}`);
    } catch (err) {
        setLoading(false);
        showError('Ağ hatası oluştu. Lütfen internet bağlantınızı kontrol edin.');
    }
}

// --- 2. Cihaz Konumu ile Hava Durumu ---
function getLocationWeather() {
    if (!navigator.geolocation) {
        showError('Tarayıcınız konum özelliğini desteklemiyor.');
        return;
    }

    hideError();
    setLoading(true);

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            await fetchWeatherData(lat, lon, 'Bulunduğunuz Konum');
        },
        (error) => {
            setLoading(false);
            showError('Konum izni reddedildi veya alınamadı.');
        },
        { timeout: 10000 }
    );
}

// --- Open-Meteo Hava Durumu Verisi Çekme ---
async function fetchWeatherData(lat, lon, locationName) {
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
        
        const res = await fetch(url);
        const data = await res.json();

        displayWeatherData(data, locationName);
        setLoading(false);
    } catch (err) {
        setLoading(false);
        showError('Hava durumu verileri alınırken bir hata oluştu.');
    }
}

// --- Verileri Ekrana Yansıtma ---
function displayWeatherData(data, locationName) {
    document.getElementById('cityNameDisplay').textContent = locationName;
    const now = new Date();
    document.getElementById('updateTimeDisplay').textContent = `Güncelleme: ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${now.toLocaleDateString()})`;

    // Anlık Değerler
    document.getElementById('currentTemp').textContent = Math.round(data.current.temperature_2m);
    document.getElementById('weatherCondition').textContent = getWeatherConditionText(data.current.weather_code);

    // Arka Planı ve Animasyonu Güncelle
    updateWeatherThemeAndAnimation(data.current.weather_code);

    document.getElementById('humidityDisplay').textContent = `${data.current.relative_humidity_2m}%`;
    document.getElementById('windDisplay').textContent = `${data.current.wind_speed_10m} km/s`;

    // 5 Günlük Tahmin Listesi
    const container = document.getElementById('forecastContainer');
    container.innerHTML = '';

    for (let i = 0; i < 5; i++) {
        const dateStr = data.daily.time[i];
        const dateObj = new Date(dateStr);
        const dayName = i === 0 ? 'Bugün' : dateObj.toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' });
        
        const maxTemp = Math.round(data.daily.temperature_2m_max[i]);
        const minTemp = Math.round(data.daily.temperature_2m_min[i]);
        const code = data.daily.weather_code[i];

        const item = document.createElement('div');
        item.className = 'forecast-item';
        item.innerHTML = `
            <span class="forecast-date">${dayName}</span>
            <span>${getWeatherConditionText(code)}</span>
            <div class="forecast-temps">
                <span class="max-temp">${maxTemp}°</span>
                <span class="min-temp">${minTemp}°</span>
            </div>
        `;
        container.appendChild(item);
    }

    document.getElementById('currentWeatherCard').style.display = 'block';
    document.getElementById('forecastCard').style.display = 'block';
}

window.addEventListener('load', () => {
    fetchWeatherData(41.0082, 28.9784, 'İstanbul');
});