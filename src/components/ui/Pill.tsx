export function Pill({
  children,
  variant = 'neutral',
}: {
  children: React.ReactNode;
  variant?: 'neutral' | 'on' | 'off' | 'locked' | 'success' | 'info' | 'warning' | 'default' | 'success';
}) {
  const cls =
    variant === 'on'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : variant === 'off'
      ? 'bg-slate-50 text-slate-600 border-slate-200'
      : variant === 'locked'
      ? 'bg-slate-100 text-slate-500 border-slate-200'
      : 'bg-slate-50 text-slate-700 border-slate-200';

  return (
    <span
      className={[
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium',
        cls,
      ].join(' ')}
    >
      {children}
    </span>
  );
}