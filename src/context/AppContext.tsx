// ============================================================================
// AppContext — the app's single source of truth for:
//  - storage readiness (IndexedDB init + first-run demo seeding)
//  - the currently active worker / shift (spec §6, §7)
//  - cached lists of workers/wristbands/measurements, refreshed on demand
//
// Screens read from here rather than talking to StorageService directly in
// more than one place, so a future backend swap only touches this file plus
// services/storage.
// ============================================================================

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { storageService } from '../services/storage';
import { seedDemoData } from '../data/seedDemoData';
import type { Measurement, Shift, Worker, Wristband } from '../types';

interface AppContextValue {
  ready: boolean;
  workers: Worker[];
  wristbands: Wristband[];
  measurements: Measurement[];
  shifts: Shift[];
  activeWorkerId: string | null;
  setActiveWorkerId: (id: string | null) => void;
  activeWorker: Worker | null;
  activeShift: Shift | null;
  refreshWorkers: () => Promise<void>;
  refreshWristbands: () => Promise<void>;
  refreshMeasurements: () => Promise<void>;
  refreshShifts: () => Promise<void>;
  refreshAll: () => Promise<void>;
  startShift: (workerId: string, wristbandId: string, label: string) => Promise<void>;
  endShift: (shiftId: string) => Promise<void>;
  seedError: string | null;
  reloadDemoData: () => Promise<void>;
  /** Single-use enforcement (spec §2): call only after a measurement is
   *  successfully committed to storage — never on QR scan alone. */
  markWristbandUsed: (wristbandId: string, measurementId: string) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

const ACTIVE_WORKER_KEY = 'h2s-dosimeter:active-worker-id';

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [ready, setReady] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);
  const [allWorkersState, setWorkers] = useState<Worker[]>([]);
  const [wristbands, setWristbands] = useState<Wristband[]>([]);
  const [allMeasurements, setMeasurements] = useState<Measurement[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [activeWorkerId, setActiveWorkerIdState] = useState<string | null>(null);

  const refreshWorkers = useCallback(async () => {
    setWorkers(await storageService.listWorkers());
  }, []);
  const refreshWristbands = useCallback(async () => {
    setWristbands(await storageService.listWristbands());
  }, []);
  const refreshMeasurements = useCallback(async () => {
    setMeasurements(await storageService.listMeasurements());
  }, []);
  const refreshShifts = useCallback(async () => {
    setShifts(await storageService.listShifts());
  }, []);
  const refreshAll = useCallback(async () => {
    await Promise.all([refreshWorkers(), refreshWristbands(), refreshMeasurements(), refreshShifts()]);
  }, [refreshWorkers, refreshWristbands, refreshMeasurements, refreshShifts]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await storageService.init();
      } catch (e) {
        setSeedError(`Local database unavailable: ${e instanceof Error ? e.message : String(e)}`);
      }
      const errs = await seedDemoData();
      if (errs.length) setSeedError(errs.join('; '));
      if (cancelled) return;
      await refreshAll();
      const storedActive = localStorage.getItem(ACTIVE_WORKER_KEY);
      const allWorkers = await storageService.listWorkers();
      if (storedActive && allWorkers.some((w) => w.id === storedActive)) {
        setActiveWorkerIdState(storedActive);
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setActiveWorkerId = useCallback((id: string | null) => {
    setActiveWorkerIdState(id);
    if (id) localStorage.setItem(ACTIVE_WORKER_KEY, id);
    else localStorage.removeItem(ACTIVE_WORKER_KEY);
  }, []);

  // Workers only ever see their own record and history.
  const ownId = session?.role === 'worker' ? session.workerId : null;
  const workers = useMemo(() => (ownId ? allWorkersState.filter((w) => w.id === ownId) : allWorkersState), [allWorkersState, ownId]);
  const measurements = useMemo(() => (ownId ? allMeasurements.filter((m) => m.workerId === ownId) : allMeasurements), [allMeasurements, ownId]);

  const activeWorker = useMemo(
    () => workers.find((w) => w.id === activeWorkerId) ?? null,
    [workers, activeWorkerId]
  );
  const activeShift = useMemo(
    () => shifts.find((s) => s.workerId === activeWorkerId && s.status === 'active') ?? null,
    [shifts, activeWorkerId]
  );

  const startShift = useCallback(
    async (workerId: string, wristbandId: string, label: string) => {
      const shift: Shift = {
        id: `SHIFT-${Date.now()}`,
        workerId,
        wristbandId,
        label,
        startedAt: Date.now(),
        endedAt: null,
        status: 'active',
        isDemo: false,
      };
      await storageService.putShift(shift);
      await refreshShifts();
    },
    [refreshShifts]
  );

  const endShift = useCallback(
    async (shiftId: string) => {
      const shift = shifts.find((s) => s.id === shiftId);
      if (!shift) return;
      await storageService.putShift({ ...shift, status: 'ended', endedAt: Date.now() });
      await refreshShifts();
    },
    [shifts, refreshShifts]
  );

  const reloadDemoData = useCallback(async () => {
    const errs = await seedDemoData(true);
    setSeedError(errs.length ? errs.join('; ') : null);
    await refreshAll();
  }, [refreshAll]);

  const markWristbandUsed = useCallback(
    async (wristbandId: string, measurementId: string) => {
      const wb = await storageService.getWristband(wristbandId);
      if (!wb || wb.usedAt) return; // already used, or unknown — never overwrite
      await storageService.putWristband({ ...wb, usedAt: Date.now(), usedByMeasurementId: measurementId });
      await refreshWristbands();
    },
    [refreshWristbands]
  );

  const value: AppContextValue = {
    seedError,
    reloadDemoData,
    ready,
    workers,
    wristbands,
    measurements,
    shifts,
    activeWorkerId,
    setActiveWorkerId,
    activeWorker,
    activeShift,
    refreshWorkers,
    refreshWristbands,
    refreshMeasurements,
    refreshShifts,
    refreshAll,
    startShift,
    endShift,
    markWristbandUsed,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within an AppProvider');
  return ctx;
}
