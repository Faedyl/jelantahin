<script>
  import { onMount, onDestroy } from 'svelte';

  /**
   * Map component — two modes:
   * 1. Display mode (default): shows markers with popups
   * 2. Picker mode: click/drag to drop a pin, reports lat/lng via bind:latitude / bind:longitude
   */
  let {
    // Display mode
    markers = [], height = '400px', zoom = 12, center = null,
    // Picker mode
    pickerMode = false, latitude = $bindable(null), longitude = $bindable(null),
  } = $props();

  let mapEl = $state(null);
  let map = $state(null);
  let markerGroup = $state(null);
  let pickerMarker = $state(null);

  const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const attribution = '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  onMount(async () => {
    const L = (await import('leaflet')).default;
    await import('leaflet/dist/leaflet.css');

    // Fix default marker icon path issue (webpack/vite bundling)
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    if (!mapEl) return;

    const hasInitialCoords = latitude != null && longitude != null;
    const defaultCenter = center || (hasInitialCoords ? [latitude, longitude] : [-0.5022, 117.1536]);
    const defaultZoom = hasInitialCoords ? 15 : zoom;

    map = L.map(mapEl, {
      center: defaultCenter,
      zoom: defaultZoom,
      scrollWheelZoom: true,
    });

    L.tileLayer(tileUrl, { attribution }).addTo(map);

    // ─── Picker Mode ───────────────────────────────────────
    if (pickerMode) {
      map.on('click', (e) => {
        setPin(e.latlng.lat, e.latlng.lng);
      });

      // If initial coords provided, show marker
      if (hasInitialCoords) {
        placePickerMarker(latitude, longitude);
      }
    }

    // ─── Display Mode ──────────────────────────────────────
    if (!pickerMode && markers.length > 0) {
      renderMarkers(markers);
    }
  });

  onDestroy(() => {
    map?.remove();
  });

  function setPin(lat, lng) {
    latitude = lat;
    longitude = lng;
    placePickerMarker(lat, lng);
  }

  function placePickerMarker(lat, lng) {
    const L = window.L;
    if (!map || !L) return;

    if (pickerMarker) map.removeLayer(pickerMarker);

    pickerMarker = L.marker([lat, lng], { draggable: true }).addTo(map);
    pickerMarker.on('dragend', () => {
      const pos = pickerMarker.getLatLng();
      latitude = pos.lat;
      longitude = pos.lng;
    });
  }

  function renderMarkers(items) {
    const L = window.L;
    if (!map || !L) return;

    if (markerGroup) map.removeLayer(markerGroup);

    markerGroup = L.featureGroup().addTo(map);
    items.forEach((m) => {
      const marker = L.marker([m.lat, m.lng]);
      if (m.popup) marker.bindPopup(m.popup);
      marker.addTo(markerGroup);
    });

    if (items.length > 1) {
      map.fitBounds(markerGroup.getBounds().pad(0.1));
    }
  }

  // Re-render markers when the array changes (display mode)
  $effect(() => {
    if (!map || pickerMode) return;
    const items = markers;
    if (items.length > 0) {
      renderMarkers(items);
    }
  });
</script>

<div class="map-wrapper" style="height: {height};">
  {#if pickerMode}
    <div class="text-xs text-stone-500 mb-1">
      Klik peta untuk menandai lokasi penjemputan
      {#if latitude != null}
        — ✅ Lokasi ditandai
      {/if}
    </div>
  {/if}
  <div bind:this={mapEl} class="map-container rounded-xl border border-stone-200" style="height: 100%;"></div>
</div>

<style>
  .map-wrapper {
    width: 100%;
  }
  .map-container {
    z-index: 1;
  }
  :global(.leaflet-popup-content) {
    font-size: 13px;
    line-height: 1.4;
  }
  :global(.leaflet-popup-content-wrapper) {
    border-radius: 10px;
  }
  :global(.leaflet-container) {
    font-family: inherit;
  }
</style>
