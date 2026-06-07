/**
 * Reverse geocode using Nominatim (OpenStreetMap).
 * Returns { address, city } or null on failure.
 *
 * Respects Nominatim's usage policy: max 1 req/sec.
 * https://operations.osmfoundation.org/policies/nominatim/
 */

let lastCallTime = 0;

/**
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<{address: string, city: string} | null>}
 */
export async function reverseGeocode(lat, lng) {
  // Throttle: ensure at least 1.1s between calls
  const now = Date.now();
  const sinceLast = now - lastCallTime;
  if (sinceLast < 1100) {
    await new Promise((r) => setTimeout(r, 1100 - sinceLast));
  }
  lastCallTime = Date.now();

  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=id`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Jelantahin/1.0 (dashboard-umkm-listing)',
        'Accept-Language': 'id',
      },
    });

    if (!res.ok) return null;

    const data = await res.json();

    if (!data || data.error) return null;

    const address = data.display_name || '';
    const addrDetails = data.address || {};

    // Extract city-like field — try several levels
    const city =
      addrDetails.city ||
      addrDetails.town ||
      addrDetails.village ||
      addrDetails.county ||
      addrDetails.state ||
      '';

    return { address, city };
  } catch {
    return null;
  }
}
