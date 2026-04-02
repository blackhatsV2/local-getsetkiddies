document.addEventListener("DOMContentLoaded", () => {
  const map = L.map("map").setView([0, 0], 2);
  let circle, marker;
  let activeChildId = null;
  let activeChildName = "";

  
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap",
  }).addTo(map);

  const geoNameInput = document.getElementById("geoName");
  const radiusInput = document.getElementById("radius");
  const saveBtn = document.getElementById("saveGeofence");
  const infoEl = document.getElementById("geoInfo");

 
  async function getReadableAddress(lat, lng) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await res.json();
      return data.display_name || "Address not found";
    } catch (err) {
      console.error("Error fetching address:", err);
      return "Unknown location";
    }
  }

  
  async function loadAddresses() {
  const rows = [...document.querySelectorAll("#childrenTable tr[data-child-id]")];

  await Promise.all(rows.map(async (row) => {
    const lat = parseFloat(row.dataset.lat);
    const lng = parseFloat(row.dataset.lng);
    const cell = row.querySelector(".location-cell");

    if (!isNaN(lat) && !isNaN(lng)) {
      const address = await getReadableAddress(lat, lng);
      cell.textContent = address;
    }
  }));
}

  loadAddresses();

  document.querySelectorAll(".setGeoBtn").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeChildId = btn.dataset.childId;
      activeChildName = btn.dataset.childName;

      const lat = parseFloat(btn.dataset.lat);
      const lng = parseFloat(btn.dataset.lng);

      // If no last-known location, inform parent then offer to go to Track Child
      if (isNaN(lat) || isNaN(lng)) {
        alert("No location record for this child.");
        const go = confirm(
          "This child has no recorded location. Proceed to Track Child page to 'Show on Map' and 'Scan for Current Location'?\n\nPress Proceed to go, or Cancel to stay."
        );
        if (go) {
          
          window.location.href = `/track-child?child_id=${encodeURIComponent(activeChildId)}`;
        }
        return;
      }

      if (marker) map.removeLayer(marker);
      if (circle) map.removeLayer(circle);

      
      if (!isNaN(lat) && !isNaN(lng)) {
        map.setView([lat, lng], 15);
        marker = L.marker([lat, lng]).addTo(map);
        infoEl.innerHTML = `
          <h1><b>Setting Geofence for: ${activeChildName}</b></h1><br>
          Last known location: ${lat.toFixed(5)}, ${lng.toFixed(5)}.
          <br><h4>Click the map to adjust center.</h4>
        `;

        
        const mapContainer = document.getElementById("map");
        if (mapContainer) {
          mapContainer.scrollIntoView({ behavior: "smooth", block: "start" });
          setTimeout(() => { try { map.invalidateSize(); } catch (e) {} }, 300);
        }
      } else {
        map.setView([10.3157, 123.8854], 13);
        infoEl.innerHTML = `<b>Setting geofence for ${activeChildName}</b><br><h3>No last known location — click on the map to choose center.</h3>`;
      }

      saveBtn.disabled = true;
    });
  });

  
  map.on("click", (e) => {
    if (!activeChildId) {
      alert("Please select a child first.");
      return;
    }

    const { lat, lng } = e.latlng;
    const radius = parseInt(radiusInput.value) || 100;

    if (marker) map.removeLayer(marker);
    if (circle) map.removeLayer(circle);

    marker = L.marker([lat, lng]).addTo(map);
    circle = L.circle([lat, lng], {
      radius,
      color: "blue",
      fillColor: "#3f8efc",
      fillOpacity: 0.3,
    }).addTo(map);

    saveBtn.disabled = false;
    infoEl.innerHTML = `
      <b>Geofence Center:</b> ${lat.toFixed(5)}, ${lng.toFixed(5)}<br>
      <b>Radius:</b> ${radius} meters<br>
      <b>Child:</b> ${activeChildName}
    `;
  });

 
  saveBtn.addEventListener("click", async () => {
    if (!activeChildId || !marker) {
      alert("Please set a geofence first.");
      return;
    }

    const name = geoNameInput.value.trim() || "Unnamed Zone";
    const radius = parseInt(radiusInput.value) || 100;
    const { lat, lng } = marker.getLatLng();

    try {
      const res = await fetch("/api/geofences/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          child_id: activeChildId,
          name,
          latitude: lat,
          longitude: lng,
          radius,
        }),
      });

      const result = await res.json();
      if (res.ok) {
        
        const proceed = confirm(`Geofence '${name}' saved for ${activeChildName}.\n\nGo to Geofence Overview now? Click cancel to stay on this page.`);
        if (proceed) {
          window.location.href = "/geofence-view";
        } else {
          
          if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
          window.location.href = window.location.pathname + window.location.search;
        }
      } else {
        alert(result.error || "Failed to save geofence");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving geofence");
    }
  });
});


const urlParams = new URLSearchParams(window.location.search);
const selectedChildId = urlParams.get("child_id");

if (selectedChildId) {
  const btn = document.querySelector(`.setGeoBtn[data-child-id="${selectedChildId}"]`);
  if (btn) btn.click();
}

