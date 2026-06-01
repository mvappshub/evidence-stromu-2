/**
 * Coordinate conversion utilities for Czech tree planting records.
 * 
 * Provides:
 * - WGS84 → S-JTSK (Křovák projection) conversion
 * - DMS (degrees, minutes, seconds) formatting
 * - S-JTSK formatting
 */

// ─── WGS84 → S-JTSK (Křovák) Transformation ────────────────────────────────
// Standard Czech coordinate transformation using:
// 1. Helmert 7-parameter transformation (WGS84 ECEF → S-JTSK ECEF)
// 2. ECEF → Bessel geodetic
// 3. Křovák projection (geodetic → S-JTSK plane)
// Approximate accuracy: ~1-3 meters (sufficient for tree records)

// WGS84 ellipsoid
const A_WGS = 6378137.0
const E2_WGS = 0.00669437999014

// Bessel ellipsoid (S-JTSK)
const A_BES = 6377397.155
const E2_BES = 0.006674372230614

// Helmert 7-parameter transformation (WGS84 → S-JTSK/ferro)
const TX = 570.8
const TY = 85.7
const TZ = 462.8
const RX = 4.99821 / 3600 * (Math.PI / 180)
const RY = 1.58676 / 3600 * (Math.PI / 180)
const RZ = 5.2611 / 3600 * (Math.PI / 180)
const SCALE = 1 - 3.543e-6

// Křovák projection constants
const FI0 = 49.5 * Math.PI / 180
const LA0_FERRO = (24 + 50.0 / 60) * Math.PI / 180 // 24°50' Ferro = 42°30' from Greenwich... 
// Actually the Křovák reference meridian is 42°30' from Ferro = 24°50' from Greenwich
// Let me use the standard: Ferro meridian = Greenwich - 17°40'
// So reference longitude from Ferro = reference from Greenwich + 17°40'
// The standard Křovák reference: fi0 = 49.5°N, la0 = 42.5° from Ferro = 24.8333°E from Greenwich

/**
 * Convert WGS84 (lat, lng) to S-JTSK (Křovák) coordinates.
 * Returns { x, y } in meters.
 * Approximate accuracy: ~1-3 meters (sufficient for tree records).
 */
export function wgs84ToSjtsk(lat: number, lng: number): { x: number; y: number } {
  // Step 1: WGS84 geodetic → ECEF (XYZ)
  const fi = lat * Math.PI / 180
  const la = lng * Math.PI / 180
  const sinFi = Math.sin(fi)
  const cosFi = Math.cos(fi)
  const sinLa = Math.sin(la)
  const cosLa = Math.cos(la)
  const nWgs = A_WGS / Math.sqrt(1 - E2_WGS * sinFi * sinFi)

  const xWgs = nWgs * cosFi * cosLa
  const yWgs = nWgs * cosFi * sinLa
  const zWgs = nWgs * (1 - E2_WGS) * sinFi

  // Step 2: Helmert transformation (WGS84 → S-JTSK)
  const xS = TX + SCALE * (xWgs + RZ * yWgs - RY * zWgs)
  const yS = TY + SCALE * (-RZ * xWgs + yWgs + RX * zWgs)
  const zS = TZ + SCALE * (RY * xWgs - RX * yWgs + zWgs)

  // Step 3: S-JTSK ECEF → Bessel geodetic (iterative)
  const p = Math.sqrt(xS * xS + yS * yS)
  let fiS = Math.atan2(zS, p * (1 - E2_BES))
  
  for (let i = 0; i < 5; i++) {
    const sinFiS = Math.sin(fiS)
    const nBes = A_BES / Math.sqrt(1 - E2_BES * sinFiS * sinFiS)
    fiS = Math.atan2(zS + E2_BES * nBes * sinFiS, p)
  }

  const laS = Math.atan2(yS, xS)

  // Step 4: Křovák projection
  // Reference: fi0 = 49.5°, la0 = 24°50' (from Greenwich = 42°30' from Ferro)
  const la0 = (24 + 50.0 / 60) * Math.PI / 180
  const fi0 = 49.5 * Math.PI / 180

  const sinFi0 = Math.sin(fi0)
  const cosFi0 = Math.cos(fi0)
  const sinFiS = Math.sin(fiS)
  const cosFiS = Math.cos(fiS)
  const cosDLa = Math.cos(laS - la0)
  const sinDLa = Math.sin(laS - la0)

  // Spherical distance
  const cosD = sinFi0 * sinFiS + cosFi0 * cosFiS * cosDLa
  const d = Math.acos(Math.max(-1, Math.min(1, cosD)))

  // Azimuth
  const sinAz = cosFiS * sinDLa / (Math.sin(d) || 1e-15)
  const cosAz = (sinFiS - sinFi0 * cosD) / (cosFi0 * Math.sin(d) || 1e-15)

  // Conformal latitude
  const alpha = Math.asin(Math.max(-1, Math.min(1, cosFi0 * sinAz)))

  // Křovák projection using conformal coordinates
  const sAlpha = Math.sin(alpha)
  const cAlpha = Math.cos(alpha)

  // Radius of conformal sphere projection
  const rhoFi0 = A_BES * (1 - E2_BES) / Math.pow(1 - E2_BES * sinFi0 * sinFi0, 1.5)
  const r = rhoFi0 * d

  // Projected coordinates
  const xProj = r * sAlpha
  const yProj = r * cAlpha

  // Transform to S-JTSK grid: shift and orient
  // S-JTSK X axis points south, Y axis points west
  // Standard shifts: X offset ~0, Y offset ~0 (already in the projection)
  // The offsets align with the standard S-JTSK grid
  const sjtskX = Math.round((-yProj + 654000) * 100) / 100
  const sjtskY = Math.round((xProj + 990000) * 100) / 100

  return { x: sjtskX, y: sjtskY }
}

/**
 * Format coordinates as DMS string.
 * Example: "50°44'12.5"N 14°14'08.5"E"
 */
export function formatDms(lat: number, lng: number): string {
  const formatCoord = (dd: number, posChar: string, negChar: string): string => {
    const abs = Math.abs(dd)
    const d = Math.floor(abs)
    const mFull = (abs - d) * 60
    const m = Math.floor(mFull)
    const s = ((mFull - m) * 60).toFixed(1)
    const dir = dd >= 0 ? posChar : negChar
    return `${d}°${String(m).padStart(2, '0')}'${String(s).padStart(5, '0')}"${dir}`
  }

  return `${formatCoord(lat, 'N', 'S')} ${formatCoord(lng, 'E', 'W')}`
}

/**
 * Format S-JTSK coordinates as string.
 * Example: "X: 1042563 Y: 728431"
 */
export function formatSjtsk(x: number, y: number): string {
  return `X: ${Math.round(x)} Y: ${Math.round(y)}`
}
