/**
 * Weather Dashboard
 * Real-time weather data from OpenWeatherMap API
 */

const API_KEY = '5ba7b9e5e8f8a4d5c1c5b4e5d5c5b4e5'; // Free tier API key
const BASE_URL = 'https://api.openweathermap.org/data/2.5';
const GEO_URL = 'https://api.openweathermap.org/geo/1.0';

let currentUnit = 'metric';
let currentCity = null;
let favorites = JSON.parse(localStorage.getItem('weatherFavorites')) || [];
let favorites_location = JSON.parse(localStorage.getItem('weatherFavoritesLocation')) || [];

// DOM Elements
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const geoBtn = document.getElementById('geoBtn');
const suggestionsDiv = document.getElementById('suggestions');
const currentWeatherDiv = document.getElementById('currentWeather');
const errorMsg = document.getElementById('errorMsg');
const unitRadios = document.querySelectorAll('input[name="tempUnit"]');
const favBtn = document.getElementById('favBtn');
const shareBtn = document.getElementById('shareBtn');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initLoader();
    setupEventListeners();
    displayFavorites();
});

function initLoader() {
    setTimeout(() => {
        document.getElementById('loader').classList.add('hidden');
    }, 1500);
}

function setupEventListeners() {
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    searchInput.addEventListener('input', handleSearchInput);
    geoBtn.addEventListener('click', handleGeolocation);
    unitRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentUnit = e.target.value;
            if (currentCity) {
                fetchWeather(currentCity.lat, currentCity.lon, currentCity.name);
            }
        });
    });
    favBtn.addEventListener('click', toggleFavorite);
    shareBtn.addEventListener('click', shareWeather);

    // Close suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (e.target !== searchInput) {
            suggestionsDiv.style.display = 'none';
        }
    });
}

async function handleSearchInput(e) {
    const value = e.target.value.trim();
    if (value.length < 2) {
        suggestionsDiv.style.display = 'none';
        return;
    }

    try {
        const response = await fetch(
            `${GEO_URL}/direct?q=${encodeURIComponent(value)}&limit=5&appid=${API_KEY}`
        );
        const cities = await response.json();

        if (cities.length > 0) {
            suggestionsDiv.innerHTML = cities
                .map(city => `
                    <div class="suggestion-item" onclick="selectCity(${city.lat}, ${city.lon}, '${city.name}', '${city.country}')">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${city.name}, ${city.country}</span>
                    </div>
                `)
                .join('');
            suggestionsDiv.style.display = 'block';
        } else {
            suggestionsDiv.style.display = 'none';
        }
    } catch (error) {
        console.error('Error fetching suggestions:', error);
    }
}

function selectCity(lat, lon, name, country) {
    currentCity = { lat, lon, name, country };
    searchInput.value = `${name}, ${country}`;
    suggestionsDiv.style.display = 'none';
    fetchWeather(lat, lon, name, country);
}

async function handleSearch() {
    const city = searchInput.value.trim();
    if (!city) {
        showError('Please enter a city name');
        return;
    }

    try {
        const response = await fetch(
            `${GEO_URL}/direct?q=${encodeURIComponent(city)}&limit=1&appid=${API_KEY}`
        );
        const cities = await response.json();

        if (cities.length === 0) {
            showError('City not found. Please try again.');
            return;
        }

        const { lat, lon, name, country } = cities[0];
        selectCity(lat, lon, name, country);
    } catch (error) {
        showError('Error searching for city');
        console.error(error);
    }
}

function handleGeolocation() {
    if (!navigator.geolocation) {
        showError('Geolocation is not supported by your browser');
        return;
    }

    geoBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            fetchWeatherByCoords(latitude, longitude);
            geoBtn.innerHTML = '<i class="fas fa-map-marker-alt"></i>';
        },
        (error) => {
            showError('Unable to access your location');
            geoBtn.innerHTML = '<i class="fas fa-map-marker-alt"></i>';
            console.error(error);
        }
    );
}

async function fetchWeatherByCoords(lat, lon) {
    try {
        const response = await fetch(
            `${GEO_URL}/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`
        );
        const cities = await response.json();
        if (cities.length > 0) {
            const { name, country } = cities[0];
            currentCity = { lat, lon, name, country };
            searchInput.value = `${name}, ${country}`;
            fetchWeather(lat, lon, name, country);
        }
    } catch (error) {
        showError('Error getting location name');
        console.error(error);
    }
}

async function fetchWeather(lat, lon, cityName, country = '') {
    try {
        const unitParam = currentUnit === 'metric' ? 'metric' : 'imperial';
        
        // Fetch current weather
        const weatherResponse = await fetch(
            `${BASE_URL}/weather?lat=${lat}&lon=${lon}&units=${unitParam}&appid=${API_KEY}`
        );
        const weatherData = await weatherResponse.json();

        // Fetch forecast
        const forecastResponse = await fetch(
            `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=${unitParam}&appid=${API_KEY}`
        );
        const forecastData = await forecastResponse.json();

        // Fetch air quality
        const aqResponse = await fetch(
            `${BASE_URL}/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`
        );
        const aqData = await aqResponse.json();

        // Fetch UV Index
        const uvResponse = await fetch(
            `${BASE_URL}/uvi?lat=${lat}&lon=${lon}&appid=${API_KEY}`
        );
        const uvData = await uvResponse.json();

        // Update UI
        displayCurrentWeather(weatherData, uvData);
        displayHourlyForecast(forecastData);
        displayDailyForecast(forecastData);
        displayAirQuality(aqData);
        updateFavButton();
        clearError();
    } catch (error) {
        showError('Error fetching weather data');
        console.error(error);
    }
}

function displayCurrentWeather(data, uvData) {
    const { name, sys, main, weather, wind, visibility, clouds } = data;
    const tempUnit = currentUnit === 'metric' ? '°C' : '°F';
    const speedUnit = currentUnit === 'metric' ? 'm/s' : 'mph';
    const visibilityUnit = currentUnit === 'metric' ? 'km' : 'mi';

    // Update location
    document.getElementById('currentLocation').textContent = `${name}, ${sys.country}`;
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    // Update weather info
    document.getElementById('currentTemp').textContent = `${Math.round(main.temp)}${tempUnit}`;
    document.getElementById('weatherDesc').textContent = weather[0].main;
    document.getElementById('feelsLike').textContent = `Feels like ${Math.round(main.feels_like)}${tempUnit}`;
    document.getElementById('weatherIcon').src = `https://openweathermap.org/img/wn/${weather[0].icon}@4x.png`;

    // Update details
    document.getElementById('humidity').textContent = `${main.humidity}%`;
    document.getElementById('windSpeed').textContent = `${wind.speed} ${speedUnit}`;
    document.getElementById('visibility').textContent = `${(visibility / 1000).toFixed(1)} ${visibilityUnit}`;
    document.getElementById('pressure').textContent = `${main.pressure} hPa`;
    document.getElementById('uvIndex').textContent = `${Math.round(uvData.value)}`;
    document.getElementById('dewPoint').textContent = `${Math.round(main.temp - (100 - main.humidity) / 5)}${tempUnit}`;

    currentWeatherDiv.style.display = 'block';
}

function displayHourlyForecast(data) {
    const hourlySection = document.getElementById('hourlySection');
    const hourlyContainer = document.getElementById('hourlyForecast');
    const next24Hours = data.list.slice(0, 8); // 24 hours in 3-hour intervals
    const tempUnit = currentUnit === 'metric' ? '°C' : '°F';

    hourlyContainer.innerHTML = next24Hours
        .map(hour => {
            const date = new Date(hour.dt * 1000);
            const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            return `
                <div class="hourly-card">
                    <div class="hourly-time">${time}</div>
                    <img src="https://openweathermap.org/img/wn/${hour.weather[0].icon}@2x.png" alt="" class="hourly-icon">
                    <div class="hourly-temp">${Math.round(hour.main.temp)}${tempUnit}</div>
                    <div class="hourly-condition">${hour.weather[0].main}</div>
                </div>
            `;
        })
        .join('');

    hourlySection.style.display = 'block';
}

function displayDailyForecast(data) {
    const dailySection = document.getElementById('dailySection');
    const dailyContainer = document.getElementById('dailyForecast');
    const tempUnit = currentUnit === 'metric' ? '°C' : '°F';
    const speedUnit = currentUnit === 'metric' ? 'm/s' : 'mph';

    // Group by day
    const dailyData = {};
    data.list.forEach(hour => {
        const date = new Date(hour.dt * 1000);
        const dayKey = date.toLocaleDateString();
        if (!dailyData[dayKey]) {
            dailyData[dayKey] = [];
        }
        dailyData[dayKey].push(hour);
    });

    const days = Object.entries(dailyData).slice(0, 5);
    dailyContainer.innerHTML = days
        .map(([date, hourList]) => {
            const temps = hourList.map(h => h.main.temp);
            const maxTemp = Math.round(Math.max(...temps));
            const minTemp = Math.round(Math.min(...temps));
            const avgHumidity = Math.round(
                hourList.reduce((sum, h) => sum + h.main.humidity, 0) / hourList.length
            );
            const maxWind = Math.round(Math.max(...hourList.map(h => h.wind.speed)));
            const rainProb = Math.round(
                hourList[0].pop ? hourList[0].pop * 100 : 0
            );
            const mainWeather = hourList[Math.floor(hourList.length / 2)]; // Midday weather

            return `
                <div class="daily-card">
                    <div class="daily-date">${new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                    <img src="https://openweathermap.org/img/wn/${mainWeather.weather[0].icon}@2x.png" alt="" class="daily-icon">
                    <div class="daily-temps">
                        <span class="temp-max">${maxTemp}°</span>
                        <span class="temp-min">${minTemp}°</span>
                    </div>
                    <div class="daily-condition">${mainWeather.weather[0].main}</div>
                    <div class="daily-extra">
                        <div class="extra-item">
                            <div class="extra-label">💧</div>
                            <div class="extra-value">${avgHumidity}%</div>
                        </div>
                        <div class="extra-item">
                            <div class="extra-label">💨</div>
                            <div class="extra-value">${maxWind}${speedUnit}</div>
                        </div>
                        <div class="extra-item">
                            <div class="extra-label">🌧️</div>
                            <div class="extra-value">${rainProb}%</div>
                        </div>
                    </div>
                </div>
            `;
        })
        .join('');

    dailySection.style.display = 'block';
}

function displayAirQuality(data) {
    const aqSection = document.getElementById('airQualitySection');
    const aqIndex = document.getElementById('aqIndex');
    const aqLabel = document.getElementById('aqLabel');
    const aqDetails = document.getElementById('aqDetails');

    const aqi = data.list[0].main.aqi;
    const components = data.list[0].components;

    const aqiLabels = ['Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'];
    const aqiColors = ['#00cc88', '#ffaa00', '#ff6b6b', '#ff3333', '#990000'];

    aqIndex.textContent = aqi;
    aqIndex.style.color = aqiColors[aqi - 1];
    aqLabel.textContent = aqiLabels[aqi - 1];
    aqLabel.style.color = aqiColors[aqi - 1];

    aqDetails.innerHTML = `
        <div class="aq-pollutant">
            <div class="pollutant-name">PM2.5</div>
            <div class="pollutant-value">${(components.pm2_5 || 0).toFixed(1)} µg/m³</div>
        </div>
        <div class="aq-pollutant">
            <div class="pollutant-name">PM10</div>
            <div class="pollutant-value">${(components.pm10 || 0).toFixed(1)} µg/m³</div>
        </div>
        <div class="aq-pollutant">
            <div class="pollutant-name">NO₂</div>
            <div class="pollutant-value">${(components.no2 || 0).toFixed(1)} µg/m³</div>
        </div>
        <div class="aq-pollutant">
            <div class="pollutant-name">O₃</div>
            <div class="pollutant-value">${(components.o3 || 0).toFixed(1)} µg/m³</div>
        </div>
    `;

    aqSection.style.display = 'block';
}

function toggleFavorite() {
    if (!currentCity) return;

    const isFavorite = favorites_location.some(
        fav => fav.lat === currentCity.lat && fav.lon === currentCity.lon
    );

    if (isFavorite) {
        favorites_location = favorites_location.filter(
            fav => !(fav.lat === currentCity.lat && fav.lon === currentCity.lon)
        );
        favBtn.innerHTML = '<i class="far fa-heart"></i>';
    } else {
        favorites_location.push(currentCity);
        favBtn.innerHTML = '<i class="fas fa-heart"></i>';
    }

    localStorage.setItem('weatherFavoritesLocation', JSON.stringify(favorites_location));
    displayFavorites();
}

function updateFavButton() {
    if (!currentCity) return;
    const isFavorite = favorites_location.some(
        fav => fav.lat === currentCity.lat && fav.lon === currentCity.lon
    );
    favBtn.innerHTML = isFavorite ? '<i class="fas fa-heart"></i>' : '<i class="far fa-heart"></i>';
}

function shareWeather() {
    if (!currentCity) return;

    const temp = document.getElementById('currentTemp').textContent;
    const desc = document.getElementById('weatherDesc').textContent;
    const text = `Current weather in ${currentCity.name}: ${temp}, ${desc}`;

    if (navigator.share) {
        navigator.share({
            title: 'Weather Update',
            text: text
        });
    } else {
        // Fallback: Copy to clipboard
        navigator.clipboard.writeText(text);
        showNotification('Weather info copied to clipboard!');
    }
}

function displayFavorites() {
    const favSection = document.getElementById('favoritesSection');
    const favList = document.getElementById('favoritesList');

    if (favorites_location.length === 0) {
        favSection.style.display = 'none';
        return;
    }

    favList.innerHTML = favorites_location
        .map(fav => `
            <div class="favorite-card" onclick="selectCity(${fav.lat}, ${fav.lon}, '${fav.name}', '${fav.country}')">
                <button class="favorite-remove" onclick="removeFavorite(${fav.lat}, ${fav.lon}, event)">
                    <i class="fas fa-times"></i>
                </button>
                <div class="favorite-location">${fav.name}</div>
                <div class="favorite-temp">Loading...</div>
                <div class="favorite-condition">Check weather</div>
            </div>
        `)
        .join('');

    favSection.style.display = 'block';

    // Load weather for each favorite
    favorites_location.forEach(fav => {
        fetchFavoriteForecast(fav);
    });
}

async function fetchFavoriteForecast(fav) {
    try {
        const unitParam = currentUnit === 'metric' ? 'metric' : 'imperial';
        const response = await fetch(
            `${BASE_URL}/weather?lat=${fav.lat}&lon=${fav.lon}&units=${unitParam}&appid=${API_KEY}`
        );
        const data = await response.json();
        const tempUnit = currentUnit === 'metric' ? '°C' : '°F';
        const card = document.querySelector(`[onclick="selectCity(${fav.lat}, ${fav.lon}, '${fav.name}', '${fav.country}')"]`);
        if (card) {
            card.querySelector('.favorite-temp').textContent = `${Math.round(data.main.temp)}${tempUnit}`;
            card.querySelector('.favorite-condition').textContent = data.weather[0].main;
        }
    } catch (error) {
        console.error('Error fetching favorite forecast:', error);
    }
}

function removeFavorite(lat, lon, event) {
    event.stopPropagation();
    favorites_location = favorites_location.filter(
        fav => !(fav.lat === lat && fav.lon === lon)
    );
    localStorage.setItem('weatherFavoritesLocation', JSON.stringify(favorites_location));
    displayFavorites();
    if (currentCity && currentCity.lat === lat && currentCity.lon === lon) {
        updateFavButton();
    }
}

function showError(message) {
    errorMsg.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    errorMsg.style.display = 'block';
}

function clearError() {
    errorMsg.style.display = 'none';
}

function showNotification(message) {
    const notif = document.createElement('div');
    notif.className = 'notification';
    notif.textContent = message;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 3000);
}
