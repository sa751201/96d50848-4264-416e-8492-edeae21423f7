let Place;
let nearbyRestaurants = [];
const ROULETTE_DURATION = 5000; // 5 seconds

const pickBtn = document.getElementById('pick-btn');
const rouletteContainer = document.getElementById('roulette-container');
const rouletteText = document.getElementById('roulette-text');
const resultCard = document.getElementById('result-card');
const restaurantNameEl = document.getElementById('restaurant-name');
const restaurantImageEl = document.getElementById('restaurant-image');
const restaurantLinkEl = document.getElementById('restaurant-link');
const statusMsg = document.getElementById('status-message');

async function init() {
    // Load the Places library
    const { Place: PlaceClass } = await google.maps.importLibrary("places");
    Place = PlaceClass;
    console.log("Places Library (New) loaded.");
}

// Start initialization
init();

pickBtn.addEventListener('click', async () => {
    pickBtn.disabled = true;
    statusMsg.innerText = "正在取得位置...";
    
    // Reset UI
    resultCard.classList.add('hidden');
    rouletteContainer.classList.add('hidden');

    try {
        const position = await getCurrentPosition();
        const { latitude, longitude } = position.coords;
        const center = { lat: latitude, lng: longitude };

        statusMsg.innerText = "正在尋找附近餐廳...";
        
        // Use the New Places API: searchNearby
        const request = {
            fields: ["displayName", "location", "id"],
            locationRestriction: {
                center: center,
                radius: 500,
            },
            includedPrimaryTypes: ["restaurant"],
            maxResultCount: 20,
        };

        const { places } = await Place.searchNearby(request);
        nearbyRestaurants = places;

        if (!nearbyRestaurants || nearbyRestaurants.length === 0) {
            statusMsg.innerText = "附近找不到餐廳，請稍後再試。";
            pickBtn.disabled = false;
            return;
        }

        startRoulette();
    } catch (error) {
        console.error("Error during search:", error);
        statusMsg.innerText = "發生錯誤，或定位權限未開啟。";
        pickBtn.disabled = false;
    }
});

function getCurrentPosition() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Geolocation not supported"));
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 10000
        });
    });
}

function startRoulette() {
    statusMsg.innerText = "";
    rouletteContainer.classList.remove('hidden');
    
    let startTime = Date.now();
    let intervalId = setInterval(() => {
        const randomIndex = Math.floor(Math.random() * nearbyRestaurants.length);
        const name = nearbyRestaurants[randomIndex].displayName;
        rouletteText.innerText = typeof name === 'object' ? name.text : name;

        if (Date.now() - startTime > ROULETTE_DURATION) {
            clearInterval(intervalId);
            const winner = nearbyRestaurants[Math.floor(Math.random() * nearbyRestaurants.length)];
            showWinner(winner);
        }
    }, 1000 / 10); // 10 updates per second
}

async function showWinner(restaurant) {
    rouletteContainer.classList.add('hidden');
    
    try {
        // Fetch detailed fields for the winner
        await restaurant.fetchFields({
            fields: ["displayName", "photos", "googleMapsURI"]
        });

        const name = restaurant.displayName;
        restaurantNameEl.innerText = typeof name === 'object' ? name.text : name;
        
        if (restaurant.photos && restaurant.photos.length > 0) {
            // Get the first photo's URL
            const photoUrl = restaurant.photos[0].getURI({ maxWidth: 800 });
            restaurantImageEl.src = photoUrl;
        } else {
            restaurantImageEl.src = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
        }

        restaurantLinkEl.href = restaurant.googleMapsURI;
        resultCard.classList.remove('hidden');
        pickBtn.disabled = false;
        
        resultCard.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error("Error fetching details:", error);
        // Fallback
        const fallbackName = typeof restaurant.displayName === 'object' ? restaurant.displayName.text : restaurant.displayName;
        restaurantNameEl.innerText = fallbackName;
        restaurantLinkEl.href = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(fallbackName);
        resultCard.classList.remove('hidden');
        pickBtn.disabled = false;
    }
}
