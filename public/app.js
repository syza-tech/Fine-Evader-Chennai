// Initialize the map
const map = L.map('map').setView([13.0827, 80.2707], 13); // Default location: Chennai

// Add a dark tile layer (background map with black/grey aesthetic)
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors © CARTO'
}).addTo(map);

// Create the custom icon for traffic police
const trafficPoliceIcon = L.icon({
    iconUrl: '/icons/traffic-police.png', // Correct path for public access
    iconSize: [32, 32],  // Size of the icon (adjust as needed)
    iconAnchor: [16, 32], // Position of the marker (centered)
    popupAnchor: [0, -32] // Position of the popup above the marker
});

// Store markers globally as L.marker objects
let markers = []; 

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
            <button onclick="editMarker(${markerData.id})"><i class="fas fa-edit"></i> Edit</button>
            <button onclick="deleteMarker(${markerData.id})"><i class="fas fa-trash"></i> Delete</button>
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
            const addedMarker = addMarkerToMap(savedMarker); // Add the new marker to the map
            markers.push(addedMarker); // Save the new marker locally
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
                // Find the marker object from the array and update it directly on the map
                const markerData = markers.find(m => m.id === id);
                if (markerData) {
                    // Update the note on the popup
                    const updatedPopupContent = 
                        `<div class="popup-content">
                            <p><strong>Note:</strong> ${newNote}</p>
                            <button onclick="editMarker(${id})">Edit</button>
                            <button onclick="deleteMarker(${id})">Delete</button>
                        </div>`;
                    markerData.marker.setPopupContent(updatedPopupContent); // Update popup content
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
                // Remove the marker from the map and the markers array
                const markerData = markers.find(m => m.id === id);
                if (markerData) {
                    markers = markers.filter(m => m.id !== id); // Remove from the markers array
                    map.removeLayer(markerData.marker); // Remove the marker from the map
                }
            } else {
                alert("Failed to delete the marker.");
            }
        })
        .catch(err => console.error('Failed to delete marker:', err));
}
