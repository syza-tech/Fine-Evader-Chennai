// Initialize the map
const map = L.map('map').setView([13.0827, 80.2707], 13); // Default location: Chennai

// Add a dark tile layer (background map with black/grey aesthetic)
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors © CARTO'
}).addTo(map);

// Create the custom icon for traffic police
const trafficPoliceIcon = L.icon({
    iconUrl: '/icons/traffic-police.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
});

// Initialize the search provider
const provider = new GeoSearch.OpenStreetMapProvider();

// Initialize markers array
let markers = [];

// Add search functionality
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');

async function handleSearch() {
    const query = searchInput.value;
    if (!query) return;

    try {
        const results = await provider.search({ query });
        if (results.length > 0) {
            const { x: lng, y: lat } = results[0];
            map.setView([lat, lng], 15);
            // Optional: Add a temporary marker at the searched location
            L.marker([lat, lng])
                .addTo(map)
                .bindPopup('Searched Location')
                .openPopup();
        } else {
            alert('Location not found');
        }
    } catch (error) {
        console.error('Search failed:', error);
        alert('Search failed. Please try again.');
    }
}

// Add event listeners for search
searchButton.addEventListener('click', handleSearch);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleSearch();
    }
});

// Fetch and display existing markers
fetch('/api/markers')
    .then(response => response.json())
    .then(data => {
        markers = data.map(markerData => {
            return addMarkerToMap(markerData);
        });
    })
    .catch(err => console.error('Failed to fetch markers:', err));

// Utility to add a marker to the map
function addMarkerToMap(markerData) {
    const marker = L.marker([markerData.lat, markerData.lng], { icon: trafficPoliceIcon }).addTo(map);
    marker.bindPopup(
        `<div class="popup-content">
            <p><strong>Note:</strong> ${markerData.note || "No note"}</p>
            <button onclick="editMarker(${markerData.id})">Edit</button>
            <button onclick="deleteMarker(${markerData.id})">Delete</button>
        </div>`
    );    

    // Attach the marker ID to the marker object for later reference
    marker._id = markerData.id;

    // Store the marker object in the global markers array
    return { id: markerData.id, marker }; 
}

// Click to add a marker
map.on('click', function (e) {
    const note = prompt("Add a note for this marker:");
    if (!note) return; // Exit if no note is provided

    const newMarker = { lat: e.latlng.lat, lng: e.latlng.lng, note };

    // Send the marker to the server
    fetch('/api/markers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMarker)
    })
        .then(response => response.json())
        .then(savedMarker => {
            const addedMarker = addMarkerToMap(savedMarker);
            markers.push(addedMarker);
        })
        .catch(err => console.error('Failed to add marker:', err));
});

// Edit a marker
function editMarker(id) {
    const newNote = prompt("Edit the note for this marker:");
    if (!newNote) return;

    fetch(`/api/markers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: newNote })
    })
        .then(response => {
            if (!response.ok) throw new Error("Failed to edit marker");
            return response.json();
        })
        .then(data => {
            if (data.success) {
                const markerData = markers.find(m => m.id === id);
                if (markerData) {
                    const updatedPopupContent = 
                        `<div class="popup-content">
                            <p><strong>Note:</strong> ${newNote}</p>
                            <button onclick="editMarker(${id})">Edit</button>
                            <button onclick="deleteMarker(${id})">Delete</button>
                        </div>`;
                    markerData.marker.setPopupContent(updatedPopupContent);
                }
            } else {
                alert("Failed to update the marker.");
            }
        })
        .catch(err => console.error('Failed to edit marker:', err));
}

// Delete a marker
function deleteMarker(id) {
    fetch(`/api/markers/${id}`, {
        method: 'DELETE'
    })
        .then(response => {
            if (!response.ok) throw new Error("Failed to delete marker");
            return response.json();
        })
        .then(data => {
            if (data.success) {
                const markerData = markers.find(m => m.id === id);
                if (markerData) {
                    markers = markers.filter(m => m.id !== id);
                    map.removeLayer(markerData.marker);
                }
            } else {
                alert("Failed to delete the marker.");
            }
        })
        .catch(err => console.error('Failed to delete marker:', err));
}
