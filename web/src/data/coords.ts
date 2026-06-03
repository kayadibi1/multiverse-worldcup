// Approximate geo-coordinates [lat, lon] for placing each nation's pillar on the globe.
export const COORDS: Record<string, [number, number]> = {
  MEX: [19, -99], KOR: [37, 127], RSA: [-26, 28], CZE: [50, 14], CAN: [45, -75],
  SUI: [47, 8], QAT: [25, 51], BIH: [44, 18], BRA: [-15, -48], MAR: [34, -6],
  SCO: [56, -4], HAI: [18, -72], USA: [39, -98], PAR: [-25, -57], AUS: [-35, 149],
  TUR: [39, 33], GER: [52, 13], ECU: [-0.2, -78], CIV: [6, -5], CUW: [12, -69],
  NED: [52, 5], JPN: [36, 140], TUN: [34, 9], SWE: [59, 18], BEL: [50, 4],
  IRN: [35, 51], EGY: [30, 31], NZL: [-41, 175], ESP: [40, -3], URU: [-34, -56],
  KSA: [24, 47], CPV: [15, -24], FRA: [48, 2], SEN: [14, -17], NOR: [60, 11],
  IRQ: [33, 44], ARG: [-34, -58], AUT: [48, 16], ALG: [28, 3], JOR: [31, 36],
  POR: [39, -9], COL: [4, -74], UZB: [41, 69], COD: [-4, 15], ENG: [51, 0],
  CRO: [45, 16], PAN: [9, -79], GHA: [8, -1],
}

// lat/lon (deg) -> point on a sphere of radius R (three.js Y-up).
export function latLonToVec3(lat: number, lon: number, R: number): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)
  return [
    -R * Math.sin(phi) * Math.cos(theta),
    R * Math.cos(phi),
    R * Math.sin(phi) * Math.sin(theta),
  ]
}
