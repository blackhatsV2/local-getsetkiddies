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

  const trackButtons = document.querySelectorAll(".trackBtn");
  const mapDiv = document.getElementById("map");
  const addressEl = document.getElementById("address");
  const coordsEl = document.getElementById("coords");
  const lastSeenEl = document.getElementById("lastSeen");
  const scanBtn = document.getElementById("scanBtn");
  const table = document.getElementById("childrenTable");


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


  document.querySelectorAll("tr[data-child-id]").forEach(async (row) => {
    const childId = row.getAttribute("data-child-id");
    const locationCell = row.querySelector(".last-location");

    try {
      const res = await fetch(`/api/locations/${childId}`);
      const data = await res.json();

      if (data.message === "no records yet") {
        locationCell.textContent = "No records yet";
      } else {
        const readable = data.readable_address || "Unknown";
        const formatted = data.date_time ? new Date(data.date_time).toLocaleString("en-US") : "";
        locationCell.innerHTML = `${readable}<br><small>${formatted}</small>`;
      }
    } catch (err) {
      console.error("Error fetching location for table:", err);
      locationCell.textContent = "Error loading";
    }
  });


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
        map.setView([0, 0], 2);
        addressEl.innerHTML = `<b>No records yet for ${activeChildName}.</b>`;
        coordsEl.textContent = "";
        lastSeenEl.textContent = "";
        scanBtn.style.display = "inline-block";

        // ensure the map is brought into view and re-rendered even when there are no records
        const mapContainerEl = document.getElementById("mapContainer");
        if (mapContainerEl) {
          mapContainerEl.scrollIntoView({ behavior: "smooth", block: "start" });
          setTimeout(() => {
            try { map.invalidateSize(); } catch (err) { /* ignore */ }
          }, 450);
        }
        return;
      }


      const coordsArray = [];
      const totalPoints = historyData.length;

      historyData.forEach((loc, index) => {
        const { latitude, longitude, readable_address, date_time } = loc;
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

        pastMarker.bindPopup(`
          <b>${activeChildName}</b><br>
          ${readable_address}<br>
          ${formatFullDateTime(date_time)}
        `);

        window.historyMarkers.push(pastMarker);
      });


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
      const { latitude, longitude, readable_address, date_time } = lastLocation;

      addressEl.innerHTML = `<p>Last known location of <b>${activeChildName}</b> is at <b><i>${readable_address}.</i></b></p>`;
      coordsEl.textContent = `Latitude: ${latitude}, Longitude: ${longitude}`;
      lastSeenEl.innerHTML = `Last seen on <b>${formatFullDateTime(date_time)}</b>.<br><br>Please click the button for a recent update of the location.`;

      scanBtn.style.display = "inline-block";
    });
  });


  scanBtn.addEventListener("click", async () => {
    if (!activeChildId) return alert("Please select a child first.");

    const originalText = scanBtn.innerHTML;
    scanBtn.innerHTML = `<span class="loading-spinner"></span> Syncing with GPS...`;
    scanBtn.disabled = true;

    try {
      // Fetch the latest location from the DB (populated by Serial Bridge)
      const res = await fetch(`/api/locations/${activeChildId}`);
      const data = await res.json();

      if (data.message === "no records yet") {
        alert("No GPS data received yet from the module. Please ensure the Serial Bridge is running.");
      } else {
        const { latitude, longitude, readable_address, date_time } = data;
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
          .bindPopup(`<b>GPS Update for ${activeChildName}</b><br>${readable_address}<br>${formattedNow}`)
          .openPopup();

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
      alert("Error syncing with GPS data.");
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
