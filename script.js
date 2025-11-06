// --- STATE MANAGEMENT ---
const state = {
    // IMPORTANT: Replace this with your own free API key from OpenWeatherMap
    apiKey: '40c8b64682c857825ff71114bdafc02b',
    currentUnit: 'celsius',
    currentWeather: null,
    favorites: [],
};

// --- DOM ELEMENTS ---
const elements = {
    loader: document.getElementById('loader'),
    cityInput: document.getElementById('city'),
    tempDiv: document.getElementById('temp-div'),
    weatherInfoDiv: document.getElementById('weather-info'),
    advancedInfoDiv: document.getElementById('advanced-info'),
    weatherIcon: document.getElementById('weather-icon'),
    hourlyHeading: document.getElementById('hourly-heading'),
    hourlyForecastDiv: document.getElementById('hourly-forecast'),
    backgroundOverlay: document.getElementById('background-overlay'),
    celsiusBtn: document.getElementById('celsius'),
    fahrenheitBtn: document.getElementById('fahrenheit'),
    darkToggleBtn: document.getElementById('dark-toggle'),
    currentLocationBtn: document.getElementById('current-location'),
    saveFavoriteBtn: document.getElementById('save-favorite'),
    favoritesDropdown: document.getElementById('favorites-dropdown'),
};

const weatherBackgrounds = {
    "clear sky": "https://images.unsplash.com/photo-1601297183305-6df142704ea2?q=80&w=1548&auto=format=fit=crop", "few clouds": "https://images.unsplash.com/photo-1678038069651-c2fd8f978fc9?q=80&w=1542&auto=format=fit=crop", "scattered clouds": "https://plus.unsplash.com/premium_photo-1661897016268-b77ad5186d02?q=80&w=1510&auto=format=fit=crop", "broken clouds": "https://images.unsplash.com/photo-1541696492-425113529369", "overcast clouds": "https://images.unsplash.com/photo-1513698187898-10610df2c470?q=80&w=1762&auto=format=fit=crop", "moderate rain": "https://images.unsplash.com/photo-1620385019253-b051a26048ce?q=80&w=774&auto=format=fit=crop", "light rain": "https://images.unsplash.com/photo-1646277586472-6d5600854899?q=80&w=1142&auto=format=fit=crop", "heavy rain": "https://images.unsplash.com/photo-1582757557082-ad7fd9f7507?q=80&w=774&auto=format=fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", "drizzle": "https://plus.unsplash.com/premium_photo-1675359389319-1ceefb06b9b5?q=80&w=870&auto=format=fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", "rain": "https://images.unsplash.com/photo-1437624155766-b64bf17eb2ce?q=80&w=1740&auto=format=fit=crop", "thunderstorm": "https://images.unsplash.com/photo-1429552077091-836152271555?q=80&w=770&auto=format=fit=crop", "snow": "https://images.unsplash.com/photo-1457269449834-928af64c684d?q=80&w=1548&auto=format=fit=crop", "mist": "https://images.unsplash.com/photo-1603794052293-650dbdeef72c?q=80&w=1624&auto=format=fit=crop"
};

// --- UTILITY FUNCTIONS ---
const kelvinToCelsius = k => Math.round(k - 273.15);
const kelvinToFahrenheit = k => Math.round((k - 273.15) * 9 / 5 + 32);
const showLoader = () => elements.loader.style.display = 'block';
const hideLoader = () => elements.loader.style.display = 'none';

// --- API CALLS ---
async function fetchWeatherData(lat, lon, cityName = null) {
    const weatherUrl = cityName ? `https://api.openweathermap.org/data/2.5/weather?q=${cityName}&appid=${state.apiKey}` : `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${state.apiKey}`;
    const forecastUrl = cityName ? `https://api.openweathermap.org/data/2.5/forecast?q=${cityName}&appid=${state.apiKey}` : `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${state.apiKey}`;
    const weatherResponse = await fetch(weatherUrl);
    const weatherData = await weatherResponse.json();
    if (weatherData.cod !== 200) throw new Error(weatherData.message || 'Failed to fetch current weather.');
    const { lat: resLat, lon: resLon } = weatherData.coord;
    const airPollutionUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${resLat}&lon=${resLon}&appid=${state.apiKey}`;
    const [forecastResponse, airPollutionResponse] = await Promise.all([fetch(forecastUrl), fetch(airPollutionUrl)]);
    if (!forecastResponse.ok || !airPollutionResponse.ok) throw new Error('Failed to fetch supplementary weather data.');
    const forecastData = await forecastResponse.json();
    const airPollutionData = await airPollutionResponse.json();
    return { current: weatherData, forecast: forecastData.list, airPollution: airPollutionData.list[0], };
}

// --- CORE LOGIC ---
// Expose getWeather to the global scope so inline onclick works
window.getWeather = async (city = null) => {
    city = city || elements.cityInput.value.trim();
    if (!city) { alert('Please enter a city'); return; }
    if (state.apiKey === 'YOUR_API_KEY_HERE') { alert('Please replace "YOUR_API_KEY_HERE" with your API key.'); return; }
    showLoader();
    try {
        const weatherData = await fetchWeatherData(null, null, city);
        state.currentWeather = { name: weatherData.current.name, ...weatherData, };
        renderAll();
    } catch (error) { alert(error.message); } finally { hideLoader(); }
};

async function getWeatherByLocation(lat, lon) {
    if (state.apiKey === 'YOUR_API_KEY_HERE') { alert('Please replace "YOUR_API_KEY_HERE" with your API key.'); return; }
    showLoader();
    try {
        const weatherData = await fetchWeatherData(lat, lon);
        state.currentWeather = { name: weatherData.current.name, ...weatherData, };
        renderAll();
    } catch (error) { alert('Could not fetch weather for your location.'); } finally { hideLoader(); }
}

// --- RENDERING ---
function renderAll() {
    if (!state.currentWeather) return;
    displayWeather();
    displayHourlyForecast();
    updateBackground();
    updateFavoriteButton();
}

function displayWeather() {
    const { name, current } = state.currentWeather;
    const tempK = current.main.temp;
    const temperature = state.currentUnit === 'celsius' ? kelvinToCelsius(tempK) : kelvinToFahrenheit(tempK);
    const unitSymbol = state.currentUnit === 'celsius' ? '°C' : '°F';
    elements.tempDiv.innerHTML = `<p>${temperature}${unitSymbol}</p>`;
    elements.weatherInfoDiv.innerHTML = `<p>${name}</p><p>${current.weather[0].description}</p>`;
    const iconCode = current.weather[0].icon;
    elements.weatherIcon.src = `icons/${iconCode}.png`;
    elements.weatherIcon.alt = current.weather[0].description;
    elements.weatherIcon.style.display = 'block';
    displayAdvancedInfo();
}

function getAQIDescription(aqi) {
    switch (aqi) {
        case 1: return 'Good'; case 2: return 'Fair'; case 3: return 'Moderate';
        case 4: return 'Poor'; case 5: return 'Very Poor'; default: return 'Unknown';
    }
}

function displayAdvancedInfo() {
    const { humidity } = state.currentWeather.current.main;
    const windSpeed = state.currentWeather.current.wind.speed;
    const aqi = state.currentWeather.airPollution.main.aqi;
    elements.advancedInfoDiv.innerHTML = `
        <div class="info-item"><span>Humidity</span><span>${humidity}%</span></div>
        <div class="info-item"><span>Wind</span><span>${windSpeed} m/s</span></div>
        <div class="info-item"><span>AQI</span><span>${getAQIDescription(aqi)}</span></div>`;
}

function displayHourlyForecast() {
    elements.hourlyHeading.textContent = 'Hourly Forecast';
    elements.hourlyForecastDiv.innerHTML = '';
    const next24Hours = state.currentWeather.forecast.slice(0, 8);
    next24Hours.forEach(item => {
        const dateTime = new Date(item.dt * 1000);
        const hour = dateTime.getHours().toString().padStart(2, '0');
        const tempK = item.main.temp;
        const temperature = state.currentUnit === 'celsius' ? kelvinToCelsius(tempK) : kelvinToFahrenheit(tempK);
        const unitSymbol = state.currentUnit === 'celsius' ? '°C' : '°F';
        const iconCode = item.weather[0].icon;
        elements.hourlyForecastDiv.innerHTML += `
            <div class="hourly-item">
                <span>${hour}:00</span>
                <img src="icons/${iconCode}.png" alt="${item.weather[0].description}">
                <span>${temperature}${unitSymbol}</span>
            </div>`;
    });
}

function updateBackground() {
    const description = state.currentWeather.current.weather[0].description.toLowerCase();
    let backgroundUrl = weatherBackgrounds[description];
    if (!backgroundUrl) {
        const fallbackKey = Object.keys(weatherBackgrounds).find(key => description.includes(key));
        backgroundUrl = weatherBackgrounds[fallbackKey || "clear sky"];
    }
    if (backgroundUrl) {
        const img = new Image();
        img.src = backgroundUrl;
        img.onload = () => { elements.backgroundOverlay.style.backgroundImage = `url(${backgroundUrl})`; };
    }
}

// --- FAVORITES ---
function loadFavorites() {
    const favs = localStorage.getItem('weatherAppFavorites');
    if (favs) { state.favorites = JSON.parse(favs); }
    renderFavoritesDropdown();
}

function saveFavorites() { localStorage.setItem('weatherAppFavorites', JSON.stringify(state.favorites)); }

function toggleFavorite() {
    if (!state.currentWeather) return;
    const currentCity = state.currentWeather.name;
    const index = state.favorites.indexOf(currentCity);
    if (index > -1) { state.favorites.splice(index, 1); } else { state.favorites.push(currentCity); }
    saveFavorites();
    renderAll();
    renderFavoritesDropdown();
}

function renderFavoritesDropdown() {
    elements.favoritesDropdown.innerHTML = '<option disabled selected>Favorites</option>';
    state.favorites.forEach(city => {
        const option = document.createElement('option');
        option.value = city;
        option.textContent = city;
        elements.favoritesDropdown.appendChild(option);
    });
}

function updateFavoriteButton() {
    if (!state.currentWeather) return;
    if (state.favorites.includes(state.currentWeather.name)) {
        elements.saveFavoriteBtn.classList.add('saved');
        elements.saveFavoriteBtn.title = "Remove from Favorites";
    } else {
        elements.saveFavoriteBtn.classList.remove('saved');
        elements.saveFavoriteBtn.title = "Save to Favorites";
    }
}

// --- EVENT LISTENERS ---
function setupEventListeners() {
    elements.darkToggleBtn.addEventListener("click", () => {
        const isDarkMode = document.body.classList.toggle("dark-mode");
        elements.darkToggleBtn.textContent = isDarkMode ? "Light Mode" : "Dark Mode";
    });
    elements.cityInput.addEventListener('keyup', e => e.key === 'Enter' && window.getWeather());
    elements.celsiusBtn.addEventListener('click', () => {
        if (state.currentUnit === 'celsius') return;
        state.currentUnit = 'celsius';
        elements.celsiusBtn.classList.add('active');
        elements.fahrenheitBtn.classList.remove('active');
        renderAll();
    });
    elements.fahrenheitBtn.addEventListener('click', () => {
        if (state.currentUnit === 'fahrenheit') return;
        state.currentUnit = 'fahrenheit';
        elements.fahrenheitBtn.classList.add('active');
        elements.celsiusBtn.classList.remove('active');
        renderAll();
    });
    elements.currentLocationBtn.addEventListener('click', () => {
        if (!navigator.geolocation) { alert("Geolocation is not supported by your browser."); return; }
        navigator.geolocation.getCurrentPosition(
            pos => getWeatherByLocation(pos.coords.latitude, pos.coords.longitude),
            () => alert("Unable to retrieve your location.")
        );
    });
    elements.saveFavoriteBtn.addEventListener('click', toggleFavorite);
    elements.favoritesDropdown.addEventListener('change', (e) => { window.getWeather(e.target.value); });
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    loadFavorites();
    setupEventListeners();
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            pos => getWeatherByLocation(pos.coords.latitude, pos.coords.longitude),
            () => console.log("Geolocation permission denied or failed. User can search manually.")
        );
    }
});