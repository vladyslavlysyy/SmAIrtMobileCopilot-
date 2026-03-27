'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import AppLayout from '@/components/ui/AppLayout';
import { api, type Charger } from '@/lib/api';
import {
  buildInitialState,
  getSimulatedPositions,
  simulateStep,
  type SimulatorState,
  type TechnicianTrack,
} from '@/lib/realtime-tech-simulator';

const RealTimeMapCanvas = dynamic(() => import('./components/RealTimeMapCanvas'), {
  ssr: false,
  loading: () => (
    <div className="rounded-2xl border border-mobility-border bg-white/90 p-6 text-sm text-mobility-primary">
      Carregant mapa en temps real...
    </div>
  ),
});

export default function RealTimeMapDashboardPage() {
  const [tracks, setTracks] = useState<TechnicianTrack[]>([]);
  const [positions, setPositions] = useState<ReturnType<typeof getSimulatedPositions>>([]);
  const [chargers, setChargers] = useState<Charger[]>([]);
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [speedKmh, setSpeedKmh] = useState(38);
  const statesRef = useRef<SimulatorState[]>([]);
  const initialStatesRef = useRef<SimulatorState[]>([]);
  const timerRef = useRef<number | null>(null);

  const clearTicker = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startTicker = (kmh: number) => {
    clearTicker();
    timerRef.current = window.setInterval(() => {
      statesRef.current = simulateStep(statesRef.current, 1.8, kmh);
      setPositions(getSimulatedPositions(statesRef.current));
    }, 1800);
  };

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      setLoading(true);
      try {
        const [techs, visits, chargerList] = await Promise.all([
          api.getTechnicians(),
          api.getVisits(),
          api.getChargers(),
        ]);

        if (cancelled) return;

        const tracksFromApi: TechnicianTrack[] = techs
          .map((tech) => {
            const path = visits
              .filter((v) => v.technician_id === tech.id)
              .filter(
                (v): v is typeof v & { latitude: number; longitude: number } =>
                  typeof v.latitude === 'number' && typeof v.longitude === 'number'
              )
              .sort((a, b) => (a.route_order ?? Number.MAX_SAFE_INTEGER) - (b.route_order ?? Number.MAX_SAFE_INTEGER))
              .map((v) => ({ latitude: v.latitude, longitude: v.longitude }));

            return {
              technicianId: tech.id,
              technicianName: tech.name,
              path,
              speedFactor: 0.85 + ((tech.id % 7) * 0.07),
            };
          })
          .filter((t) => t.path.length >= 2);

        const fallbackPoints = chargerList
          .filter(
            (c): c is Charger & { latitude: number; longitude: number } =>
              typeof c.latitude === 'number' && typeof c.longitude === 'number'
          )
          .map((c) => ({ latitude: c.latitude, longitude: c.longitude }));

        const tracksWithFallback: TechnicianTrack[] =
          tracksFromApi.length > 0
            ? tracksFromApi
            : techs.slice(0, Math.max(1, Math.min(3, techs.length))).map((tech, idx) => {
                const basePath = fallbackPoints.length >= 2
                  ? fallbackPoints.slice(0, Math.min(4, fallbackPoints.length))
                  : [
                      { latitude: 41.1189 + idx * 0.008, longitude: 1.2445 + idx * 0.008 },
                      { latitude: 41.1289 + idx * 0.008, longitude: 1.2545 + idx * 0.008 },
                    ];
                return {
                  technicianId: tech.id,
                  technicianName: tech.name,
                  path: basePath,
                  speedFactor: 0.9 + ((tech.id % 5) * 0.08),
                };
              });

        setTracks(tracksWithFallback);
        setChargers(chargerList);

        const initialStates = buildInitialState(tracksWithFallback);
        statesRef.current = initialStates;
        initialStatesRef.current = initialStates;
        setPositions(getSimulatedPositions(initialStates));

        if (!paused) {
          startTicker(speedKmh);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
      clearTicker();
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    if (paused) {
      clearTicker();
      return;
    }
    startTicker(speedKmh);

    return () => {
      clearTicker();
    };
  }, [paused, speedKmh, loading]);

  const handleResetSimulation = () => {
    statesRef.current = initialStatesRef.current.map((s) => ({ ...s }));
    setPositions(getSimulatedPositions(statesRef.current));
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-mobility-background px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-4">
          <div className="rounded-2xl border border-mobility-border bg-white/90 p-5">
            <h1 className="text-xl font-semibold text-mobility-primary sm:text-2xl">
              Mapa en temps real
            </h1>
            <p className="mt-1 text-sm text-mobility-secondary">
              Seguiment de tecnics i carregadors amb una simulacio d&apos;estat en viu.
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setPaused((v) => !v)}
                className="rounded-lg bg-mobility-accent px-3 py-1.5 text-xs font-semibold text-white"
              >
                {paused ? 'Reprendre' : 'Pausar'}
              </button>
              <button
                type="button"
                onClick={handleResetSimulation}
                className="rounded-lg border border-mobility-border bg-white px-3 py-1.5 text-xs font-semibold text-mobility-primary"
              >
                Reiniciar simulacio
              </button>

              <label className="ml-1 flex items-center gap-2 text-xs text-mobility-secondary">
                Velocitat
                <input
                  type="range"
                  min={12}
                  max={120}
                  step={2}
                  value={speedKmh}
                  onChange={(e) => setSpeedKmh(Number(e.target.value))}
                />
                <span className="font-semibold text-mobility-primary">{speedKmh} km/h</span>
              </label>
            </div>
          </div>
          <RealTimeMapCanvas
            tracks={tracks}
            positions={positions}
            loading={loading}
            chargers={chargers}
          />
        </div>
      </div>
    </AppLayout>
  );
}
