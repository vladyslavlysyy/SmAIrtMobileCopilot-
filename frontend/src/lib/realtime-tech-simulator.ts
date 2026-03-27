export interface RoutePoint {
  latitude: number;
  longitude: number;
}

export interface TechnicianTrack {
  technicianId: number;
  technicianName: string;
  path: RoutePoint[];
  speedFactor: number;
}

export interface SimulatorState {
  technicianId: number;
  technicianName: string;
  path: RoutePoint[];
  speedFactor: number;
  segmentIndex: number;
  progress: number;
}

export interface SimulatedPosition {
  technicianId: number;
  technicianName: string;
  latitude: number;
  longitude: number;
  segmentIndex: number;
  progress: number;
}

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}

function haversineKm(a: RoutePoint, b: RoutePoint): number {
  const r = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const aa =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * r * Math.asin(Math.sqrt(aa));
}

function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

function normalizePath(path: RoutePoint[]): RoutePoint[] {
  if (path.length <= 1) return path;
  const first = path[0];
  const last = path[path.length - 1];

  // Close the loop to keep the simulation continuously moving.
  if (first.latitude === last.latitude && first.longitude === last.longitude) {
    return path;
  }
  return [...path, first];
}

export function buildInitialState(tracks: TechnicianTrack[]): SimulatorState[] {
  return tracks
    .filter((t) => t.path.length >= 2)
    .map((t) => ({
      technicianId: t.technicianId,
      technicianName: t.technicianName,
      path: normalizePath(t.path),
      speedFactor: t.speedFactor > 0 ? t.speedFactor : 1,
      segmentIndex: 0,
      progress: 0,
    }));
}

export function simulateStep(
  states: SimulatorState[],
  deltaSeconds: number,
  speedKmh: number
): SimulatorState[] {
  if (deltaSeconds <= 0 || speedKmh <= 0) return states;

  const kmPerSecond = speedKmh / 3600;

  return states.map((state) => {
    const path = state.path;
    if (path.length < 2) return state;

    let segmentIndex = state.segmentIndex;
    let progress = state.progress;
    let remainingKm = kmPerSecond * deltaSeconds * state.speedFactor;

    while (remainingKm > 0) {
      const from = path[segmentIndex];
      const to = path[(segmentIndex + 1) % path.length];
      const segmentKm = Math.max(haversineKm(from, to), 0.001);
      const leftInSegmentKm = (1 - progress) * segmentKm;

      if (remainingKm < leftInSegmentKm) {
        progress += remainingKm / segmentKm;
        remainingKm = 0;
      } else {
        remainingKm -= leftInSegmentKm;
        progress = 0;
        segmentIndex = (segmentIndex + 1) % path.length;
      }
    }

    return {
      ...state,
      segmentIndex,
      progress,
    };
  });
}

export function getSimulatedPositions(states: SimulatorState[]): SimulatedPosition[] {
  return states.map((state) => {
    const from = state.path[state.segmentIndex];
    const to = state.path[(state.segmentIndex + 1) % state.path.length];

    return {
      technicianId: state.technicianId,
      technicianName: state.technicianName,
      latitude: lerp(from.latitude, to.latitude, state.progress),
      longitude: lerp(from.longitude, to.longitude, state.progress),
      segmentIndex: state.segmentIndex,
      progress: state.progress,
    };
  });
}
