import { Card } from '@/components/ui/Card';

export function WorkspacePlaceholder({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <Card className="p-6">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-2 text-sm text-slate-600">{text}</div>
      <div className="mt-6 h-40 rounded-xl border border-dashed border-slate-200 bg-slate-50" />
    </Card>
  );
}