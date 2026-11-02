import clsx from 'clsx';
import { t, getStatusColor } from '@/lib/translations';

/** Badge de estado estándar: color semántico centralizado + texto traducido. */
export default function StatusBadge({
  status,
  label,
  className,
  dot = false,
}: {
  status: string;
  label?: React.ReactNode;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span className={clsx('badge', getStatusColor(status), className)}>
      {dot && <span className="status-dot bg-current opacity-80" />}
      {label ?? t(status)}
    </span>
  );
}
