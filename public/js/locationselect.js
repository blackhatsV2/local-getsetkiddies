document.addEventListener("DOMContentLoaded", () => {
  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function formatFullDateTime(dateString) {
    const optionsDate = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
    const optionsTime = { hour: "numeric", minute: "2-digit", hour12: true };
    const date = new Date(dateString);
    const formattedDate = date.toLocaleDateString("en-US", optionsDate);
    const formattedTime = date.toLocaleTimeString("en-US", optionsTime);
    return `${formattedDate} – ${formattedTime}`;
  }

  function createDetailedLabel(type, childName, dateTime, address, isLatest) {
    const formattedDate = dateTime ? new Date(dateTime).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    }) : "N/A";

    return `
      <div class="label-wrapper">
        <b>${type}</b>
        <div class="label-child">${childName}</div>
        <div class="label-time">${formattedDate}</div>
        <div class="label-address">${address || "Location pending..."}</div>
      </div>
    `;
  }

  async function getReadableAddress(lat, lng) {
    try {
      const res = await fetch(`/api/locations/reverse-geocode?lat=${lat}&lng=${lng}`);
      const data = await res.json();
      return data.address || `${parseFloat(lat).toFixed(5)}, ${parseFloat(lng).toFixed(5)}`;
    } catch (err) {
      console.error("Error fetching address:", err);
      // Fallback to coordinates on failure
      return `${parseFloat(lat).toFixed(5)}, ${parseFloat(lng).toFixed(5)}`;
    }
  }

  async function saveLocation(childId, lat, lng, source = "Browser") {
    try {
      const res = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          child_id: childId,
          latitude: lat,
          longitude: lng,
          source: source
        })
      });
      return await res.json();
    } catch (err) {
      console.error("Error saving location:", err);
      return { error: err.message };
    }
  }

  const trackButtons = document.querySelectorAll(".trackBtn");
  const mapDiv = document.getElementById("map");
  const addressEl = document.getElementById("address");
  const coordsEl = document.getElementById("coords");
  const lastSeenEl = document.getElementById("lastSeen");
  const scanBtn = document.getElementById("scanBtn");
  const table = document.getElementById("childrenTable");
  let activeChildId = null;
  let activeChildName = "";

  let map = L.map(mapDiv).setView([0, 0], 2);

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
  }).addTo(map);


  window.pathLine = null;
  window.historyMarkers = [];
  window.currentFence = null;
  window.currentTraceLine = null;
  window.currentMarker = null;


  (async function loadTableLocations() {
    const locationRows = document.querySelectorAll("tr[data-child-id]");
    for (const row of locationRows) {
      const childId = row.getAttribute("data-child-id");
      const locationCell = row.querySelector(".last-location");

      try {
        const res = await fetch(`/api/locations/${childId}`);
        const data = await res.json();

        if (data.message === "no records yet") {
          locationCell.textContent = "No records yet";
        } else {
          let readable = data.readable_address || "Unknown";
          
          // Only call the geocoding proxy if we don't have a valid address stored
          if (!readable || readable === "Fetching..." || readable === "Unknown location" || readable === "Unknown") {
            readable = await getReadableAddress(data.latitude, data.longitude);
            // Delay after Nominatim call to respect rate limits
            await new Promise(r => setTimeout(r, 1100));
          }
          
          const formatted = data.date_time ? new Date(data.date_time).toLocaleString("en-US") : "";
          locationCell.innerHTML = `${readable}<br><small>${formatted}</small>`;
        }
      } catch (err) {
        console.error("Error fetching location for table:", err);
        locationCell.textContent = "Error loading";
      }
    }
  })();


  document.querySelectorAll("tr[data-child-id]").forEach(async (row) => {
    const childId = row.getAttribute("data-child-id");
    const statusCell = row.querySelector(".geoStatus");

    try {
      const [geoRes, locRes] = await Promise.all([
        fetch(`/api/geofences/${childId}`),
        fetch(`/api/locations/${childId}`)
      ]);

      const geofenceData = await geoRes.json();
      const locationData = await locRes.json();

      if (!Array.isArray(geofenceData) || geofenceData.length === 0) {
        statusCell.innerHTML = `<span style="color:gray;">No geofence set</span>`;
        return;
      }

      if (locationData.message === "no records yet") {
        statusCell.innerHTML = `<span style="color:gray;">No location data</span>`;
        return;
      }


      const g = geofenceData[0];
      const dist = calculateDistance(
        locationData.latitude,
        locationData.longitude,
        g.latitude,
        g.longitude
      );

      const inside = dist <= g.radius;
      statusCell.innerHTML = inside
        ? `<span style="color:green;">Inside geofence</span>`
        : `<span style="color:red;">Outside (${dist.toFixed(1)} m)</span>`;
    } catch (err) {
      console.error("Error checking geofence:", err);
      statusCell.textContent = "Error";
    }
  });


  function clearPreviousLayers() {
    if (window.historyMarkers && window.historyMarkers.length) {
      window.historyMarkers.forEach(m => {
        try { map.removeLayer(m); } catch (e) { }
      });
      window.historyMarkers = [];
    }


    if (window.pathLine) {
      try { map.removeLayer(window.pathLine); } catch (e) { }
      window.pathLine = null;
    }


    if (window.currentFence) {
      try { map.removeLayer(window.currentFence); } catch (e) { }
      window.currentFence = null;
    }


    if (window.currentTraceLine) {
      try { map.removeLayer(window.currentTraceLine); } catch (e) { }
      window.currentTraceLine = null;
    }


    if (window.currentMarker) {
      try { map.removeLayer(window.currentMarker); } catch (e) { }
      window.currentMarker = null;
    }
  }


  trackButtons.forEach((btn) => {
    btn.addEventListener("click", async () => {

      clearPreviousLayers();

      scanBtn.style.display = "none";
      const btnChildId = btn.getAttribute("data-child-id");
      activeChildId = btnChildId;
      activeChildName = btn.getAttribute("data-child-name");

      // Set active child on server for the hardware bridge
      fetch("/api/children/set-active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ child_id: btnChildId })
      }).catch(err => console.error("Error setting active child:", err));

      const historyRes = await fetch(`/api/locations/history/${activeChildId}`);
      const historyData = await historyRes.json();


      const geofenceRes = await fetch(`/api/geofences/${activeChildId}`);
      const geofenceData = await geofenceRes.json();

      if (historyData.message === "no records yet") {
        // Notify user about Arduino unavailability
        showAlert(`Arduino modules for ${activeChildName} is not available. Using browser geolocation as fallback.`);

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            // Save to database
            await saveLocation(activeChildId, lat, lng, "Browser Fallback");

            // Set map to current browser location
            map.setView([lat, lng], 15);

            const readable = await getReadableAddress(lat, lng);

            addressEl.innerHTML = `<p>Showing <b>browser location</b> for <b>${activeChildName}</b> at <b><i>${readable}.</i></b></p>`;
            coordsEl.textContent = `Latitude: ${lat}, Longitude: ${lng}`;
            lastSeenEl.innerHTML = `This is your current browser location (saved to database).`;

            // Clear markers and add new marker for browser location
            if (window.currentMarker) map.removeLayer(window.currentMarker);
            window.currentMarker = L.marker([lat, lng], {
              icon: L.icon({
                iconUrl: "https://maps.gstatic.com/mapfiles/ms2/micons/red-dot.png",
                iconSize: [32, 32],
                iconAnchor: [16, 32],
                popupAnchor: [0, -30]
              })
            }).addTo(map)
              .bindPopup(createDetailedLabel("LATEST LOCATION", activeChildName, new Date(), readable, true), {
                className: 'map-label-popup latest',
                closeButton: true,
                autoClose: false,
                closeOnClick: false
              });

            window.currentMarker.openPopup();

            // Update table cell
            const row = table.querySelector(`tr[data-child-id="${activeChildId}"]`);
            if (row) {
              const locationCell = row.querySelector(".last-location");
              if (locationCell) locationCell.textContent = readable;
            }

            // Refresh map view
            const mapContainerEl = document.getElementById("mapContainer");
            if (mapContainerEl) {
              mapContainerEl.scrollIntoView({ behavior: "smooth", block: "start" });
              setTimeout(() => {
                try { map.invalidateSize(); } catch (err) { /* ignore */ }
              }, 450);
            }
          }, (error) => {
            console.error("Geolocation error:", error);
            showAlert("Could not retrieve browser location. Please ensure location permissions are granted.");
            map.setView([0, 0], 2);
            addressEl.innerHTML = `<b>No records yet for ${activeChildName}.</b>`;
          });
        } else {
          showAlert("Geolocation is not supported by your browser.");
          map.setView([0, 0], 2);
          addressEl.innerHTML = `<b>No records yet for ${activeChildName}.</b>`;
        }

        scanBtn.style.display = "inline-block";
        return;
      }


      const coordsArray = [];
      const totalPoints = historyData.length;

      for (let index = 0; index < totalPoints; index++) {
        const loc = historyData[index];
        let { latitude, longitude, readable_address, date_time } = loc;

        if (!readable_address || readable_address === "Fetching..." || readable_address === "Unknown location") {
          readable_address = await getReadableAddress(latitude, longitude);
        }

        coordsArray.push([latitude, longitude]);

        const isLast = index === totalPoints - 1;
        const markerIconUrl = isLast
          ? "https://maps.gstatic.com/mapfiles/ms2/micons/red-dot.png"
          : "https://maps.gstatic.com/mapfiles/ms2/micons/blue-dot.png";

        const pastMarker = L.marker([latitude, longitude], {
          icon: L.icon({
            iconUrl: markerIconUrl,
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -30]
          })
        }).addTo(map);

        if (isLast) {
          pastMarker.bindPopup(createDetailedLabel("LATEST LOCATION", activeChildName, date_time, readable_address, true), {
            className: 'map-label-popup latest',
            closeButton: true,
            autoClose: false,
            closeOnClick: false
          });
          pastMarker.openPopup();
        } else {
          // Past locations only show label on click via Popup
          pastMarker.bindPopup(createDetailedLabel("PAST LOCATION", activeChildName, date_time, readable_address, false), {
            className: 'map-label-popup',
            closeButton: true
          });
        }

        window.historyMarkers.push(pastMarker);
      }


      window.pathLine = L.polyline(coordsArray, {
        color: "blue",
        weight: 3,
        opacity: 0.7
      }).addTo(map);


      let boundsGroup = L.featureGroup([window.pathLine]);


      if (Array.isArray(geofenceData) && geofenceData.length > 0) {
        const g = geofenceData[0];
        const fenceLat = g.latitude;
        const fenceLng = g.longitude;
        const radius = g.radius;


        window.currentFence = L.circle([fenceLat, fenceLng], {
          radius,
          color: "blue",
          fillColor: "#3f8efc",
          fillOpacity: 0.3,
        }).addTo(map).bindPopup(`<b>${g.name}</b><br>Radius: ${radius} m`);

        boundsGroup.addLayer(window.currentFence);


        if (historyData.length > 0) {
          const lastLoc = historyData[historyData.length - 1];

          const dist = calculateDistance(
            lastLoc.latitude,
            lastLoc.longitude,
            fenceLat,
            fenceLng
          );

          const inside = dist <= radius;


          const statusCell = document.querySelector(`.geoStatus[data-child-id="${activeChildId}"]`);
          if (statusCell) {
            statusCell.innerHTML = inside
              ? `<span style="color:green;">Inside geofence</span>`
              : `<span style="color:red;">Outside (${dist.toFixed(1)} m)</span>`;
          }


          window.currentTraceLine = L.polyline(
            [
              [lastLoc.latitude, lastLoc.longitude],
              [fenceLat, fenceLng]
            ],
            {
              color: inside ? "green" : "red",
              weight: 2,
              dashArray: inside ? "3 6" : "5 5"
            }
          ).addTo(map).bindPopup(`${inside ? "Inside zone" : "Outside zone"}<br>Distance: ${dist.toFixed(1)} m`);

          boundsGroup.addLayer(window.currentTraceLine);
        }
      }


      try {
        const bounds = boundsGroup.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [30, 30] });
        } else {
          const lastLocation = historyData[historyData.length - 1];
          map.setView([lastLocation.latitude, lastLocation.longitude], 15);
        }
      } catch (e) {
        console.error("Error fitting bounds:", e);
      }

      // scroll map into view and ensure Leaflet redraws after layout change
      const mapContainerEl = document.getElementById("mapContainer");
      if (mapContainerEl) {
        mapContainerEl.scrollIntoView({ behavior: "smooth", block: "start" });
        // allow scroll/paint then tell Leaflet to recalculate size so map displays correctly
        setTimeout(() => {
          try { map.invalidateSize(); } catch (err) { /* ignore */ }
        }, 450);
      }

      const lastLocation = historyData[historyData.length - 1];
      let { latitude, longitude, readable_address, date_time } = lastLocation;

      if (!readable_address || readable_address === "Fetching..." || readable_address === "Unknown location") {
        readable_address = await getReadableAddress(latitude, longitude);
      }

      addressEl.innerHTML = `<p>Last known location of <b>${activeChildName}</b> is at <b><i>${readable_address}.</i></b></p>`;
      coordsEl.textContent = `Latitude: ${latitude}, Longitude: ${longitude}`;
      lastSeenEl.innerHTML = `Last seen on <b>${formatFullDateTime(date_time)}</b>.<br><br>Please click the button for a recent update of the location.`;

      scanBtn.style.display = "inline-block";
    });
  });


  scanBtn.addEventListener("click", async () => {
    if (!activeChildId) return showAlert("Please select a child first.");

    const originalText = scanBtn.innerHTML;
    scanBtn.innerHTML = `<span class="loading-spinner"></span> Syncing with GPS...`;
    scanBtn.disabled = true;

    try {
      // Fetch the latest location from the DB (populated by Serial Bridge)
      const res = await fetch(`/api/locations/${activeChildId}`);
      const data = await res.json();

      if (data.message === "no records yet") {
        // Fallback to browser geolocation if Arduino has no data
        showAlert(`No GPS data received yet from the module. Using browser geolocation as fallback.`);
        
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            // Save to database
            await saveLocation(activeChildId, lat, lng, "Sync Fallback");

            const readable = await getReadableAddress(lat, lng);
            const formattedNow = new Date().toLocaleString("en-US");

            // Update Map
            if (window.currentMarker) map.removeLayer(window.currentMarker);
            window.currentMarker = L.marker([lat, lng], {
              icon: L.icon({
                iconUrl: "https://maps.gstatic.com/mapfiles/ms2/micons/red-dot.png",
                iconSize: [32, 32],
                iconAnchor: [16, 32],
                popupAnchor: [0, -30],
              }),
            }).addTo(map)
              .bindPopup(createDetailedLabel("LATEST LOCATION", activeChildName, new Date(), readable, true), {
                className: 'map-label-popup latest',
                closeButton: true,
                autoClose: false,
                closeOnClick: false
              });
            
            window.currentMarker.openPopup();

            map.setView([lat, lng], 15);

            // Update Text
            addressEl.innerHTML = `<b>Current Location (Browser Fallback):</b> ${readable}`;
            coordsEl.textContent = `Lat: ${lat}, Lng: ${lng}`;
            lastSeenEl.innerHTML = `Last Sync: <b>${formattedNow}</b>.`;

            // Update Table
            const row = table.querySelector(`tr[data-child-id="${activeChildId}"]`);
            if (row) row.querySelector(".last-location").textContent = readable;
          }, (err) => {
            console.error("Geolocation error:", err);
            showAlert("Could not retrieve GPS from module or browser. Please ensure the module is active or browser location is enabled.");
          });
        } else {
          showAlert("No GPS data from module and geolocation not supported by browser.");
        }
      } else {
        let { latitude, longitude, readable_address, date_time } = data;
        
        if (!readable_address || readable_address === "Fetching..." || readable_address === "Unknown location") {
          readable_address = await getReadableAddress(latitude, longitude);
        }

        const formattedNow = formatFullDateTime(date_time);

        // Update Map
        if (window.currentMarker) map.removeLayer(window.currentMarker);
        window.currentMarker = L.marker([latitude, longitude], {
          icon: L.icon({
            iconUrl: "https://maps.gstatic.com/mapfiles/ms2/micons/red-dot.png",
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -30],
          }),
        }).addTo(map)
          .bindPopup(createDetailedLabel("LATEST LOCATION", activeChildName, date_time, readable_address, true), {
            className: 'map-label-popup latest',
            closeButton: true,
            autoClose: false,
            closeOnClick: false
          });
        
        window.currentMarker.openPopup();

        map.setView([latitude, longitude], 15);

        // Update Text
        addressEl.innerHTML = `<b>Current GPS Location:</b> ${readable_address}`;
        coordsEl.textContent = `Lat: ${latitude}, Lng: ${longitude}`;
        lastSeenEl.innerHTML = `Last Sync: <b>${formattedNow}</b>.`;

        // Update Table
        const row = table.querySelector(`tr[data-child-id="${activeChildId}"]`);
        if (row) row.querySelector(".last-location").textContent = readable_address;
      }
    } catch (err) {
      console.error(err);
      showAlert("Error syncing with GPS data.");
    } finally {
      scanBtn.innerHTML = originalText;
      scanBtn.disabled = false;
    }
  });


  // If ?child_id=... is present, auto-click the corresponding Show on Map button
  (function autoOpenFromQuery() {
    try {
      const params = new URLSearchParams(window.location.search);
      const pre = params.get("child_id");
      if (!pre) return;
      // small delay to ensure all handlers are attached
      setTimeout(() => {
        const btn = document.querySelector(`.trackBtn[data-child-id="${pre}"]`);
        if (btn) btn.click();
      }, 250);
    } catch (e) { /* ignore */ }
  })();

});
