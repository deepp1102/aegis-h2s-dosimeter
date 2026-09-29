import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { storageService } from '../services/storage';
import { useAppContext } from '../context/AppContext';
import type { Measurement } from '../types';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { ResultView } from '../components/result/ResultView';
import { formatDateTime } from '../utils/format';

export function MeasurementDetailPage() {
  const { measurementId } = useParams();
  const navigate = useNavigate();
  const { refreshMeasurements } = useAppContext();
  const [measurement, setMeasurement] = useState<Measurement | null | undefined>(undefined);

  useEffect(() => {
    if (!measurementId) return;
    storageService.getMeasurement(measurementId).then(setMeasurement);
  }, [measurementId]);

  if (measurement === undefined) {
    return <p className="text-sm text-ink-500">Loading…</p>;
  }
  if (measurement === null) {
    return (
      <Card className="text-center text-sm text-ink-500">
        Record not found.
        <div className="mt-3">
          <Button variant="secondary" onClick={() => navigate('/history')}>
            Back to history
          </Button>
        </div>
      </Card>
    );
  }

  const handleDelete = async () => {
    await storageService.deleteMeasurement(measurement.id);
    await refreshMeasurements();
    navigate('/history');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/history')} className="flex items-center gap-1.5 text-xs font-semibold text-ink-500">
          <ArrowLeft size={14} /> Back to history
        </button>
        <button onClick={handleDelete} className="flex items-center gap-1.5 text-xs font-semibold text-red-500">
          <Trash2 size={13} /> Delete
        </button>
      </div>

      <p className="text-xs text-ink-400">Recorded {formatDateTime(measurement.timestamp)} · {measurement.wristbandId ?? '—'}</p>

      <ResultView measurement={measurement} onRetake={() => navigate('/scan')} />
    </div>
  );
}
