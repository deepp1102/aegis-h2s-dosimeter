import { useAppContext } from '../context/AppContext';
import { Card, CardHeader } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { storageService } from '../services/storage';
import { LIFECYCLE_LABEL, wristbandLifecycle } from '../utils/wristbandLifecycle';
import { BAND_ID_PRIVACY_NOTE } from '../data/constants';

export function WristbandsPage() {
  const { wristbands, workers, shifts, refreshAll } = useAppContext();

  const assign = async (wbId: string, workerId: string) => {
    const wb = wristbands.find((w) => w.id === wbId);
    const worker = workers.find((w) => w.id === workerId);
    if (!wb || !worker) return;
    await storageService.putWristband({ ...wb, status: 'assigned', assignedWorkerId: worker.id });
    await storageService.putWorker({ ...worker, wristbandId: wb.id, updatedAt: Date.now() });
    await refreshAll();
  };
  const release = async (wbId: string) => {
    const wb = wristbands.find((w) => w.id === wbId);
    if (!wb) return;
    const worker = workers.find((w) => w.id === wb.assignedWorkerId);
    if (worker) await storageService.putWorker({ ...worker, wristbandId: null, updatedAt: Date.now() });
    await storageService.putWristband({ ...wb, status: 'available', assignedWorkerId: null });
    await refreshAll();
  };
  const retire = async (wbId: string) => {
    const wb = wristbands.find((w) => w.id === wbId);
    if (!wb) return;
    await release(wbId);
    await storageService.putWristband({ ...wb, status: 'retired', assignedWorkerId: null });
    await refreshAll();
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-ink-900">Wristband Lifecycle</h1>
        <p className="text-xs text-ink-500">Available → Assigned → Active → Expiring Soon → Expired → Retired</p>
        <p className="mt-1 text-[11px] text-ink-400">{BAND_ID_PRIVACY_NOTE}</p>
      </div>
      {wristbands.map((wb) => {
        const state = wristbandLifecycle(wb, shifts);
        const owner = workers.find((w) => w.id === wb.assignedWorkerId);
        const locked = state === 'retired';
        return (
          <Card key={wb.id}>
            <CardHeader
              title={wb.id}
              subtitle={`Batch ${wb.batch} · expires ${new Date(wb.expiresAt).toLocaleDateString()}`}
              action={
                <span className="rounded-full bg-ink-100 px-2.5 py-1 text-xs font-semibold text-ink-800">
                  {LIFECYCLE_LABEL[state]}
                </span>
              }
            />
            <p className="mb-1 text-xs text-ink-500">Worker: {owner ? `${owner.name} (${owner.id})` : 'Unassigned'}</p>
            {wb.usedAt && (
              <p className="mb-3 text-[11px] text-ink-400">
                Used {new Date(wb.usedAt).toLocaleString()}
                {wb.usedByMeasurementId ? ` · ${wb.usedByMeasurementId}` : ''} — single-use, cannot be measured again.
              </p>
            )}
            {!wb.usedAt && <div className="mb-3" />}
            <div className="flex flex-wrap items-center gap-2">
              {!owner && !locked && state !== 'expired' && (
                <select
                  aria-label={`Assign ${wb.id} to worker`}
                  className="min-h-11 rounded-lg border border-ink-200 px-2 text-sm"
                  defaultValue=""
                  onChange={(e) => e.target.value && assign(wb.id, e.target.value)}
                >
                  <option value="" disabled>Assign to worker…</option>
                  {workers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              )}
              {owner && !locked && <Button size="sm" onClick={() => release(wb.id)}>Unassign</Button>}
              {!locked && <Button size="sm" variant="danger" onClick={() => retire(wb.id)}>Retire</Button>}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
