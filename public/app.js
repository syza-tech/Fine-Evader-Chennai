// Initialize map (same look & center)
const map = L.map('map').setView([13.0827, 80.2707], 13);

// Dark Carto tiles (keeps your original map color)
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  maxZoom: 19,
  attribution: '© OpenStreetMap contributors © CARTO'
}).addTo(map);

// Custom icon (make sure file is at public/icons/traffic-police.png)
const trafficPoliceIcon = L.icon({
  iconUrl: '/icons/traffic-police.png',
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36]
});

// Global markers array to track marker objects
let markers = []; // { id, marker }

// Load existing markers from server
fetch('/api/markers')
  .then(r => r.json())
  .then(data => {
    data.forEach(m => {
      const item = addMarkerToMap(m);
      markers.push(item);
    });
  })
  .catch(err => console.error('Failed to load markers', err));

// Utility: build popup HTML for a marker
function popupHtml(marker) {
  // note textarea (editable above marker), Save and Delete color-coded buttons
  return `
    <div class="popup-content">
      <textarea id="note-${marker.id}" class="popup-textarea">${escapeHtml(marker.note || '')}</textarea>
      <div class="popup-buttons">
        <button class="save-btn" onclick="saveNote(${marker.id})">Save</button>
        <button class="delete-btn" onclick="deleteMarker(${marker.id})">Delete</button>
      </div>
    </div>
  `;
}

// Escape HTML to avoid injection in popup
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Add marker object to map and return { id, marker }
function addMarkerToMap(m) {
  const marker = L.marker([m.lat, m.lng], { icon: trafficPoliceIcon }).addTo(map);
  marker.bindPopup(popupHtml(m), { minWidth: 220 });
  marker._markerId = m.id;
  return { id: m.id, marker };
}

// Click to add a marker (keeps your original behaviour: prompt then save)
map.on('click', function(e) {
  const note = prompt('Add a note for this marker:');
  if (!note) return;
  const payload = { lat: e.latlng.lat, lng: e.latlng.lng, note };

  fetch('/api/markers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
    .then(r => r.json())
    .then(saved => {
      const item = addMarkerToMap(saved);
      markers.push(item);
    })
    .catch(err => console.error('Failed to add marker', err));
});

// Save note (PUT)
window.saveNote = function(id) {
  const ta = document.getElementById(`note-${id}`);
  if (!ta) return alert('Unable to find note field.');
  const newNote = ta.value;

  fetch(`/api/markers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ note: newNote })
  })
    .then(resp => {
      if (!resp.ok) throw new Error('Failed to save');
      // update textarea stays as is; optionally give a tiny confirmation
      ta.style.border = '1px solid #4caf50';
      setTimeout(() => ta.style.border = '', 700);
    })
    .catch(err => {
      console.error(err);
      alert('Failed to save note.');
    });
};

// Delete marker (DELETE)
window.deleteMarker = function(id) {
  if (!confirm('Delete this marker?')) return;
  fetch(`/api/markers/${id}`, { method: 'DELETE' })
    .then(resp => {
      if (!resp.ok) throw new Error('Failed to delete');
      // remove from map and local array
      const found = markers.find(x => x.id === id);
      if (found) {
        map.removeLayer(found.marker);
        markers = markers.filter(x => x.id !== id);
      } else {
        // fallback: try to remove by scanning markers on map
        map.eachLayer(layer => {
          if (layer instanceof L.Marker && layer._markerId === id) map.removeLayer(layer);
        });
      }
    })
    .catch(err => {
      console.error(err);
      alert('Failed to delete marker.');
    });
};

// ========== SEARCH (Nominatim) ==========
// Small search input (Enter to search) - behavior like Google Maps search (address -> zoom)
const searchInput = document.getElementById('search-input');
if (searchInput) {
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const q = searchInput.value.trim();
      if (!q) return;
      // Nominatim query (rate-limited, no API key)
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`)
        .then(r => r.json())
        .then(results => {
          if (!results || results.length === 0) return alert('Location not found');
          const place = results[0];
          const lat = parseFloat(place.lat), lon = parseFloat(place.lon);
          map.setView([lat, lon], 16);
        })
        .catch(err => {
          console.error('Search error', err);
          alert('Search failed');
        });
    }
  });
}

// ========== LOCATE ME ==========
const locateBtn = document.getElementById('locate-btn');
if (locateBtn) {
  locateBtn.addEventListener('click', () => {
    map.locate({ setView: true, maxZoom: 16 });
  });

  // optional: show a marker when location found
  map.on('locationfound', e => {
    // small temporary circle to show position
    const radius = e.accuracy || 50;
    L.circle(e.latlng, { radius, color: '#4caf50', fillOpacity: 0.2 }).addTo(map).bindPopup('You are here').openPopup();
  });

  map.on('locationerror', e => {
    alert('Unable to locate you: ' + e.message);
  });
}
