// --- STATE MANAGEMENT ---
const state = {
    // OpenWeatherMap API Key
    apiKey: '40c8b64682c857825ff71114bdafc02b',
    
    // --- IMPORTANT: ADD YOUR RAPIDAPI KEYS HERE ---
    rapidApiKey: 'f8d10dd414msh484d800160ed75ap1f168bjsnfd62bed87104', 
    rapidApiHost: 'wft-geo-db.p.rapidapi.com',
    // ---------------------------------------------
    
    currentUnit: 'celsius',
    currentWeather: null,
    favorites: [],
    toastTimeout: null, // To manage the toast timer
};

// --- DOM ELEMENTS ---
const elements = {
    searchButton: document.getElementById('search-button'),
    cityInput: document.getElementById('city'),
    searchBar: document.querySelector('.search-bar'),
    weatherContent: document.getElementById('weather-content'),
    errorMessage: document.getElementById('error-message'),
    tempDiv: document.getElementById('temp-div'),
    tempDisplay: document.getElementById('temp-display'),
    weatherInfoDiv: document.getElementById('weather-info'),
    advancedInfoDiv: document.getElementById('advanced-info'),
    weatherIcon: document.getElementById('weather-icon'),
    hourlyHeading: document.getElementById('hourly-heading'),
    hourlyForecastDiv: document.getElementById('hourly-forecast'),
    backgroundOverlay: document.getElementById('background-overlay'),
    celsiusBtn: document.getElementById('celsius'),
    fahrenheitBtn: document.getElementById('fahrenheit'),
    darkToggleBtn: document.getElementById('dark-toggle'),
    backgroundToggleBtn: document.getElementById('background-toggle'),
    currentLocationBtn: document.getElementById('current-location'),
    saveFavoriteBtn: document.getElementById('save-favorite'),
    feelsLikeDiv: document.getElementById('feels-like-div'),
    dailyHeading: document.getElementById('daily-heading'),
    dailyForecastDiv: document.getElementById('daily-forecast'),
    favoritesContainer: document.getElementById('favorites-container'),
    favoritesButton: document.getElementById('favorites-button'),
    favoritesList: document.getElementById('favorites-list'),
    toast: document.getElementById('toast'),
    citySuggestions: document.getElementById('city-suggestions'),
};

const weatherBackgrounds = {
    "clear sky": "https://images.unsplash.com/photo-1601297183305-6df142704ea2?q=80&w=1548&auto=format=fit=crop", "few clouds": "https://images.unsplash.com/photo-1678038069651-c2fd8f978fc9?q=80&w=1542&auto=format=fit=crop", "scattered clouds": "https://plus.unsplash.com/premium_photo-1661897016268-b77ad5186d02?q=80&w=1510&auto=format=fit=crop", "broken clouds": "https://images.unsplash.com/photo-1541696492-425113529369", "overcast clouds": "https://images.unsplash.com/photo-1513698187898-10610df2c470?q=80&w=1762&auto=format=fit=crop", "moderate rain": "https://images.unsplash.com/photo-1620385019253-b051a26048ce?q=80&w=774&auto=format=fit=crop", "light rain": "https://images.unsplash.com/photo-1646277586472-6d5600854899?q=80&w=1142&auto=format=fit=crop", "heavy rain": "https://images.unsplash.com/photo-1582757557082-ad7fd9f7507?q=80&w=774&auto=format=fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", "drizzle": "https://plus.unsplash.com/premium_photo-1675359389319-1ceefb06b9b5?q=80&w=870&auto=format=fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", "rain": "https://images.unsplash.com/photo-1437624155766-b64bf17eb2ce?q=80&w=1740&auto=format=fit=crop", "thunderstorm": "https://images.unsplash.com/photo-1429552077091-836152271555?q=80&w=770&auto=format=fit=crop", "snow": "https://images.unsplash.com/photo-1457269449834-928af64c684d?q=80&w=1548&auto=format=fit=crop", "mist": "https://images.unsplash.com/photo-1603794052293-650dbdeef72c?q=80&w=1624&auto=format=fit=crop"
};

// --- UTILITY & LOADER FUNCTIONS ---
const kelvinToCelsius = k => Math.round(k - 273.15);
const kelvinToFahrenheit = k => Math.round((k - 273.15) * 9 / 5 + 32);
const showLoader = () => { elements.searchButton.classList.add('loading'); elements.searchButton.disabled = true; };
const hideLoader = () => { elements.searchButton.classList.remove('loading'); elements.searchButton.disabled = false; };
const formatTime = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

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
    
    return {
        current: weatherData,
        forecast: forecastData.list,
        airPollution: airPollutionData.list[0],
    };
}

async function getCitySuggestions(query) {
    if (!query || state.rapidApiKey === 'YOUR_RAPIDAPI_KEY_HERE') return [];
    const url = `https://wft-geo-db.p.rapidapi.com/v1/geo/cities?minPopulation=10000&namePrefix=${query}`;
    const options = {
        method: 'GET',
        headers: {
            'x-rapidapi-key': state.rapidApiKey,
            'x-rapidapi-host': state.rapidApiHost
        }
    };
    try {
        const response = await fetch(url, options);
        const result = await response.json();
        return result.data || [];
    } catch (error) {
        console.error("Failed to fetch city suggestions:", error);
        return [];
    }
}

// --- UI FEEDBACK ---
function showToast(message) {
    clearTimeout(state.toastTimeout);
    elements.toast.textContent = message;
    elements.toast.classList.add('show');
    state.toastTimeout = setTimeout(() => {
        elements.toast.classList.remove('show');
    }, 3000);
}

// --- Error Handling Function ---
function displayError(message) {
    elements.weatherContent.classList.remove('visible');
    elements.errorMessage.textContent = `Error: ${message}`;
    elements.errorMessage.classList.add('visible');
}

// --- CORE LOGIC ---
window.getWeather = async (city = null) => {
    const searchCity = city || elements.cityInput.value.trim();
    if (!searchCity) return;
    elements.citySuggestions.innerHTML = '';
    if (state.apiKey === 'YOUR_API_KEY_HERE' || state.apiKey === '') {
        displayError('Please set your API key in script.js');
        return;
    }
    showLoader();
    try {
        const weatherData = await fetchWeatherData(null, null, searchCity);
        state.currentWeather = { name: weatherData.current.name, ...weatherData };
        renderAll();
    } catch (error) {
        displayError(error.message);
    } finally {
        hideLoader();
    }
};

async function getWeatherByLocation(lat, lon) {
    if (state.apiKey === 'YOUR_API_KEY_HERE' || state.apiKey === '') {
        displayError('Please set your API key in script.js');
        return;
    }
    showLoader();
    try {
        const weatherData = await fetchWeatherData(lat, lon);
        state.currentWeather = { name: weatherData.current.name, ...weatherData };
        renderAll();
    } catch (error) {
        displayError('Could not fetch weather for your location.');
    } finally {
        hideLoader();
    }
}

// --- RENDERING ---
function renderAll() {
    if (!state.currentWeather) return;
    elements.errorMessage.classList.remove('visible');
    elements.weatherContent.classList.add('visible');
    const allAnimatedElements = document.querySelectorAll('.fade-in, .slide-in-up');
    allAnimatedElements.forEach(el => {
        el.classList.remove('fade-in', 'slide-in-up');
        void el.offsetWidth;
    });
    displayWeather();
    displayHourlyForecast();
    displayDailyForecast();
    updateBackground();
    updateFavoriteButton();
    renderFavoritesDropdown();
    const elementsToFade = [elements.weatherIcon, elements.tempDisplay, elements.feelsLikeDiv, elements.weatherInfoDiv, elements.advancedInfoDiv];
    elementsToFade.forEach(el => el.classList.add('fade-in'));
    const elementsToSlide = [elements.hourlyHeading, elements.hourlyForecastDiv, elements.dailyHeading, elements.dailyForecastDiv];
    elementsToSlide.forEach(el => el.classList.add('slide-in-up'));
}

function displayWeather() {
    const { name, current } = state.currentWeather;
    const tempK = current.main.temp;
    const feelsLikeK = current.main.feels_like;
    const unitSymbol = state.currentUnit === 'celsius' ? '°C' : '°F';
    const temperature = state.currentUnit === 'celsius' ? kelvinToCelsius(tempK) : kelvinToFahrenheit(tempK);
    const feelsLikeTemp = state.currentUnit === 'celsius' ? kelvinToCelsius(feelsLikeK) : kelvinToFahrenheit(feelsLikeK);

    elements.tempDiv.innerHTML = `<p>${temperature}${unitSymbol}</p>`;
    elements.feelsLikeDiv.innerHTML = `<p>Feels like ${feelsLikeTemp}${unitSymbol}</p>`;
    elements.weatherInfoDiv.innerHTML = `<p>${name}</p><p>${current.weather[0].description}</p>`;
    
    const iconCode = current.weather[0].icon;
    elements.weatherIcon.src = `icons/${iconCode}.png`;
    elements.weatherIcon.alt = current.weather[0].description;
    
    displayAdvancedInfo();
}

function getAQIDescription(aqi) {
    switch (aqi) {
        case 1: return 'Good';
        case 2: return 'Fair';
        case 3: return 'Moderate';
        case 4: return 'Poor';
        case 5: return 'Very Poor';
        default: return 'Unknown';
    }
}

function displayAdvancedInfo() {
    const { humidity } = state.currentWeather.current.main;
    const windSpeed = state.currentWeather.current.wind.speed;
    const aqi = state.currentWeather.airPollution.main.aqi;
    const { sunrise, sunset } = state.currentWeather.current.sys;

    elements.advancedInfoDiv.innerHTML = `
        <div class="info-item"><span>Humidity</span><span>${humidity}%</span></div>
        <div class="info-item"><span>Wind</span><span>${windSpeed} m/s</span></div>
        <div class="info-item"><span>AQI</span><span>${getAQIDescription(aqi)}</span></div>
        <div class="info-item"><span>Sunrise</span><span>${formatTime(sunrise)}</span></div>
        <div class="info-item"><span>Sunset</span><span>${formatTime(sunset)}</span></div>
    `;
}

function displayHourlyForecast() {
    elements.hourlyHeading.textContent = 'Hourly Forecast';
    elements.hourlyForecastDiv.innerHTML = '';
    const next24Hours = state.currentWeather.forecast.slice(0, 8);
    next24Hours.forEach(item => {
        const dateTime = new Date(item.dt * 1000);
        let hour = dateTime.getHours();
        const ampm = hour >= 12 ? 'PM' : 'AM';
        hour = hour % 12;
        hour = hour ? hour : 12;
        const formattedTime = `${hour} ${ampm}`;

        const tempK = item.main.temp;
        const temperature = state.currentUnit === 'celsius' ? kelvinToCelsius(tempK) : kelvinToFahrenheit(tempK);
        const unitSymbol = state.currentUnit === 'celsius' ? '°C' : '°F';
        const iconCode = item.weather[0].icon;
        const pop = Math.round(item.pop * 100);

        elements.hourlyForecastDiv.innerHTML += `
            <div class="hourly-item">
                <span>${formattedTime}</span>
                <img src="icons/${iconCode}.png" alt="${item.weather[0].description}">
                <span>${temperature}${unitSymbol}</span>
                <span class="rain-chance">💧 ${pop}%</span>
            </div>`;
    });
}

function displayDailyForecast() {
    elements.dailyHeading.textContent = '5-Day Forecast';
    elements.dailyForecastDiv.innerHTML = '';
    const forecastList = state.currentWeather.forecast;

    const dailyData = {};
    forecastList.forEach(item => {
        const date = new Date(item.dt * 1000).toISOString().split('T')[0];
        if (!dailyData[date]) {
            dailyData[date] = { temps: [], icons: [], pops: [] };
        }
        dailyData[date].temps.push(item.main.temp);
        dailyData[date].icons.push(item.weather[0].icon);
        dailyData[date].pops.push(item.pop);
    });

    const today = new Date().toISOString().split('T')[0];
    delete dailyData[today];
    const nextFiveDays = Object.entries(dailyData).slice(0, 5);

    nextFiveDays.forEach(([date, data]) => {
        const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
        const highK = Math.max(...data.temps);
        const lowK = Math.min(...data.temps);
        const iconCode = data.icons.sort((a, b) => data.icons.filter(v => v === a).length - data.icons.filter(v => v === b).length).pop();
        const avgPop = Math.round((data.pops.reduce((a, b) => a + b, 0) / data.pops.length) * 100);
        const unitSymbol = state.currentUnit === 'celsius' ? '°C' : '°F';
        const highTemp = state.currentUnit === 'celsius' ? kelvinToCelsius(highK) : kelvinToFahrenheit(highK);
        const lowTemp = state.currentUnit === 'celsius' ? kelvinToCelsius(lowK) : kelvinToFahrenheit(lowK);
        
        elements.dailyForecastDiv.innerHTML += `
            <div class="daily-item">
                <span class="day-name">${dayName}</span>
                <img src="icons/${iconCode}.png" alt="Weather icon">
                <span class="rain-chance">💧 ${avgPop}%</span>
                <span class="temp-range">${highTemp}${unitSymbol} / ${lowTemp}${unitSymbol}</span>
            </div>
        `;
    });
}

function updateBackground() {
    if (!state.currentWeather) return;
    const description = state.currentWeather.current.weather[0].description.toLowerCase();
    let backgroundUrl = weatherBackgrounds[description];
    if (!backgroundUrl) {
        const fallbackKey = Object.keys(weatherBackgrounds).find(key => description.includes(key));
        backgroundUrl = weatherBackgrounds[fallbackKey || "clear sky"];
    }
    if (backgroundUrl) {
        const img = new Image();
        img.src = backgroundUrl;
        img.onload = () => {
            elements.backgroundOverlay.style.backgroundImage = `url(${backgroundUrl})`;
        };
    }
}

// --- FAVORITES ---
function loadFavorites() {
    const favs = localStorage.getItem('weatherAppFavorites');
    if (favs) {
        state.favorites = JSON.parse(favs);
    }
    renderFavoritesDropdown();
}

function saveFavorites() {
    localStorage.setItem('weatherAppFavorites', JSON.stringify(state.favorites));
}

function toggleFavorite() {
    if (!state.currentWeather) return;
    const currentCity = state.currentWeather.name;
    const index = state.favorites.indexOf(currentCity);
    if (index > -1) {
        state.favorites.splice(index, 1);
        showToast(`Removed ${currentCity} from favorites`);
    } else {
        state.favorites.push(currentCity);
        showToast(`Added ${currentCity} to favorites`);
    }
    saveFavorites();
    updateFavoriteButton();
    renderFavoritesDropdown();
}

function deleteFavorite(cityToDelete, e) {
    e.stopPropagation();
    state.favorites = state.favorites.filter(city => city !== cityToDelete);
    saveFavorites();
    renderFavoritesDropdown();
    updateFavoriteButton();
    showToast(`Removed ${cityToDelete} from favorites`);
}

function renderFavoritesDropdown() {
    elements.favoritesList.innerHTML = '';
    if (state.favorites.length === 0) {
        elements.favoritesList.innerHTML = `<div class="favorites-empty">No favorites yet.</div>`;
        return;
    }
    state.favorites.forEach(city => {
        const item = document.createElement('div');
        item.className = 'favorite-item';
        item.innerHTML = `
            <span>${city}</span>
            <button class="delete-favorite" title="Remove ${city}">&times;</button>
        `;
        item.addEventListener('click', () => {
            getWeather(city);
            elements.favoritesList.classList.remove('open');
            elements.favoritesButton.classList.remove('open');
        });
        item.querySelector('.delete-favorite').addEventListener('click', (e) => deleteFavorite(city, e));
        elements.favoritesList.appendChild(item);
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

// --- DEBOUNCE UTILITY ---
function debounce(func, delay) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}

// --- EVENT LISTENERS ---
function setupEventListeners() {
    elements.darkToggleBtn.addEventListener("click", () => {
        const isDarkMode = document.body.classList.toggle("dark-mode");
        elements.darkToggleBtn.textContent = isDarkMode ? "Light Mode" : "Dark Mode";
    });

    elements.backgroundToggleBtn.addEventListener("click", () => {
        document.body.classList.toggle("photo-background-active");
    });

    elements.cityInput.addEventListener('keyup', e => {
        if (e.key === 'Enter') {
            getWeather();
        }
    });

    elements.celsiusBtn.addEventListener('click', () => {
        if (state.currentUnit === 'celsius') return;
        state.currentUnit = 'celsius';
        elements.celsiusBtn.classList.add('active');
        elements.fahrenheitBtn.classList.remove('active');
        if (state.currentWeather) renderAll();
    });

    elements.fahrenheitBtn.addEventListener('click', () => {
        if (state.currentUnit === 'fahrenheit') return;
        state.currentUnit = 'fahrenheit';
        elements.fahrenheitBtn.classList.add('active');
        elements.celsiusBtn.classList.remove('active');
        if (state.currentWeather) renderAll();
    });

    elements.currentLocationBtn.addEventListener('click', () => {
        if (!navigator.geolocation) {
            displayError("Geolocation is not supported by your browser.");
            return;
        }
        navigator.geolocation.getCurrentPosition(
            pos => getWeatherByLocation(pos.coords.latitude, pos.coords.longitude),
            () => displayError("Unable to retrieve your location.")
        );
    });

    elements.saveFavoriteBtn.addEventListener('click', toggleFavorite);

    elements.favoritesButton.addEventListener('click', (e) => {
        e.stopPropagation();
        elements.favoritesList.classList.toggle('open');
        elements.favoritesButton.classList.toggle('open');
    });

    const handleCityInput = async (e) => {
        const query = e.target.value;
        if (query.length < 3) {
            elements.citySuggestions.innerHTML = '';
            return;
        }
        const suggestions = await getCitySuggestions(query);
        elements.citySuggestions.innerHTML = '';
        suggestions.forEach(city => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.textContent = `${city.city}, ${city.countryCode}`;
            item.addEventListener('click', () => {
                elements.cityInput.value = city.city;
                elements.citySuggestions.innerHTML = '';
                getWeather();
            });
            elements.citySuggestions.appendChild(item);
        });
    };

    elements.cityInput.addEventListener('input', debounce(handleCityInput, 300));

    document.addEventListener('click', (e) => {
        if (!elements.favoritesContainer.contains(e.target)) {
            elements.favoritesList.classList.remove('open');
            elements.favoritesButton.classList.remove('open');
        }
        if (!elements.searchBar.contains(e.target)) {
            elements.citySuggestions.innerHTML = '';
        }
    });
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    loadFavorites();
    setupEventListeners();
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            pos => getWeatherByLocation(pos.coords.latitude, pos.coords.longitude),
            () => {
                console.log("Geolocation permission denied or failed. User can search manually.");
            }
        );
    }
});