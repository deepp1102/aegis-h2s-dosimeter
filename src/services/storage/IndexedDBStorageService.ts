// ============================================================================
// IndexedDB-backed StorageService implementation (spec §21).
// ============================================================================

import { openDB, type DBSchema, type IDBPDatabase, type IDBPTransaction } from 'idb';
import type {
  CalibrationSample,
  Measurement,
  ModelMetadata,
  Shift,
  Worker,
  Wristband,
} from '../../types';
import type { StorageService } from './StorageService';

const DB_NAME = 'h2s-dosimeter';
const DB_VERSION = 2; // v2: repairs stores left behind by older/mismatched schemas

interface H2SDBSchema extends DBSchema {
  workers: { key: string; value: Worker };
  shifts: { key: string; value: Shift; indexes: { workerId: string } };
  wristbands: { key: string; value: Wristband };
  measurements: { key: string; value: Measurement; indexes: { workerId: string; timestamp: number } };
  calibrationSamples: { key: string; value: CalibrationSample };
  modelMetadata: { key: string; value: ModelMetadata };
}

// ----------------------------------------------------------------------------
// Backward-compatible read-time defaults (spec §7): records written by an
// older build of this app won't have the newer optional fields. Rather than
// bump the DB schema/version, default them on the way out so every caller
// can rely on the fields being present without a migration step.
// ----------------------------------------------------------------------------
function normaliseWristband(wb: Wristband): Wristband {
  return { usedAt: null, usedByMeasurementId: null, ...wb };
}
function normaliseMeasurement(m: Measurement): Measurement {
  return {
    ...m,
    rejectionCode: m.rejectionCode ?? null,
    captureMethod: m.captureMethod ?? (m.isDemo ? 'demo' : 'camera'),
    alignmentMethod: m.alignmentMethod ?? (m.isDemo ? 'demo' : 'manual'),
    imageWidth: m.imageWidth ?? 0,
    imageHeight: m.imageHeight ?? 0,
    wristbandQrVerified: m.wristbandQrVerified ?? false,
  };
}

export class IndexedDBStorageService implements StorageService {
  private db: IDBPDatabase<H2SDBSchema> | null = null;

  private async open(): Promise<IDBPDatabase<H2SDBSchema>> {
    let conn: IDBPDatabase<H2SDBSchema> | undefined;
    conn = await openDB<H2SDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(typedDb, _old, _new, typedTx) {
        const db = typedDb as unknown as IDBPDatabase;
        const tx = typedTx as unknown as IDBPTransaction<unknown, string[], 'versionchange'>;
        // [store, keyPath, indexes]. A store with the wrong keyPath or missing
        // indexes (left by an older build) is dropped and recreated.
        const spec: [string, string, string[]][] = [
          ['workers', 'id', []],
          ['shifts', 'id', ['workerId']],
          ['wristbands', 'id', []],
          ['measurements', 'id', ['workerId', 'timestamp']],
          ['calibrationSamples', 'id', []],
          ['modelMetadata', 'version', []],
        ];
        for (const [name, keyPath, indexes] of spec) {
          if (db.objectStoreNames.contains(name)) {
            const st = tx.objectStore(name);
            const ok = st.keyPath === keyPath && indexes.every((i) => st.indexNames.contains(i));
            if (ok) continue;
            db.deleteObjectStore(name);
          }
          const store = db.createObjectStore(name, { keyPath });
          for (const i of indexes) store.createIndex(i, i);
        }
      },
      blocking() {
        // Another tab needs to upgrade: release our connection.
        conn?.close();
      },
    });
    return conn;
  }

  async init(): Promise<void> {
    if (this.db) return;
    try {
      this.db = await this.open();
    } catch (err) {
      // Corrupted / unusable database: delete it once and start clean.
      console.warn('IndexedDB open failed, resetting local database', err);
      await new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase(DB_NAME);
        req.onsuccess = req.onerror = req.onblocked = () => resolve();
      });
      this.db = await this.open();
    }
  }

  private get database(): IDBPDatabase<H2SDBSchema> {
    if (!this.db) throw new Error('StorageService.init() must be awaited before use.');
    return this.db;
  }

  // ---- Workers -------------------------------------------------------
  async listWorkers(): Promise<Worker[]> {
    return this.database.getAll('workers');
  }
  async getWorker(id: string): Promise<Worker | null> {
    return (await this.database.get('workers', id)) ?? null;
  }
  async putWorker(worker: Worker): Promise<void> {
    await this.database.put('workers', worker);
  }
  async deleteWorker(id: string): Promise<void> {
    await this.database.delete('workers', id);
  }

  // ---- Shifts ----------------------------------------------------------
  async listShifts(workerId?: string): Promise<Shift[]> {
    if (workerId) return this.database.getAllFromIndex('shifts', 'workerId', workerId);
    return this.database.getAll('shifts');
  }
  async getActiveShift(workerId: string): Promise<Shift | null> {
    const shifts = await this.listShifts(workerId);
    return shifts.find((s) => s.status === 'active') ?? null;
  }
  async putShift(shift: Shift): Promise<void> {
    await this.database.put('shifts', shift);
  }

  // ---- Wristbands --------------------------------------------------------
  async listWristbands(): Promise<Wristband[]> {
    return (await this.database.getAll('wristbands')).map(normaliseWristband);
  }
  async getWristband(id: string): Promise<Wristband | null> {
    const wb = await this.database.get('wristbands', id);
    return wb ? normaliseWristband(wb) : null;
  }
  async putWristband(wristband: Wristband): Promise<void> {
    await this.database.put('wristbands', wristband);
  }

  // ---- Measurements --------------------------------------------------------
  async listMeasurements(): Promise<Measurement[]> {
    const all = await this.database.getAll('measurements');
    return all.map(normaliseMeasurement).sort((a, b) => b.timestamp - a.timestamp);
  }
  async getMeasurement(id: string): Promise<Measurement | null> {
    const m = await this.database.get('measurements', id);
    return m ? normaliseMeasurement(m) : null;
  }
  async putMeasurement(measurement: Measurement): Promise<void> {
    await this.database.put('measurements', measurement);
  }
  async deleteMeasurement(id: string): Promise<void> {
    await this.database.delete('measurements', id);
  }

  // ---- Calibration --------------------------------------------------------
  async listCalibrationSamples(): Promise<CalibrationSample[]> {
    const all = await this.database.getAll('calibrationSamples');
    return all.sort((a, b) => b.createdAt - a.createdAt);
  }
  async putCalibrationSample(sample: CalibrationSample): Promise<void> {
    await this.database.put('calibrationSamples', sample);
  }
  async deleteCalibrationSample(id: string): Promise<void> {
    await this.database.delete('calibrationSamples', id);
  }

  // ---- Model metadata --------------------------------------------------------
  async getActiveModelMetadata(): Promise<ModelMetadata | null> {
    const all = await this.database.getAll('modelMetadata');
    if (all.length === 0) return null;
    return all.sort((a, b) => b.activatedAt - a.activatedAt)[0];
  }
  async putModelMetadata(meta: ModelMetadata): Promise<void> {
    await this.database.put('modelMetadata', meta);
  }

  // ---- Bulk --------------------------------------------------------
  async wipeAllData(): Promise<void> {
    const db = this.database;
    const tx = db.transaction(
      ['workers', 'shifts', 'wristbands', 'measurements', 'calibrationSamples', 'modelMetadata'],
      'readwrite'
    );
    await Promise.all([
      tx.objectStore('workers').clear(),
      tx.objectStore('shifts').clear(),
      tx.objectStore('wristbands').clear(),
      tx.objectStore('measurements').clear(),
      tx.objectStore('calibrationSamples').clear(),
      tx.objectStore('modelMetadata').clear(),
      tx.done,
    ]);
  }

  async exportAllJSON(): Promise<Record<string, unknown>> {
    const [workers, shifts, wristbands, measurements, calibrationSamples, modelMetadata] = await Promise.all([
      this.listWorkers(),
      this.listShifts(),
      this.listWristbands(),
      this.listMeasurements(),
      this.listCalibrationSamples(),
      this.getActiveModelMetadata(),
    ]);
    return {
      exportedAt: new Date().toISOString(),
      app: 'Aegis H\u2082S prototype',
      dataOrigin: 'local-device-indexeddb',
      workers,
      shifts,
      wristbands,
      measurements,
      calibrationSamples,
      modelMetadata,
    };
  }
}

export const storageService: StorageService = new IndexedDBStorageService();
