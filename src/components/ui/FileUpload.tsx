'use client';

import React from 'react';

type Props = {
  label: string;
  accept?: string;
  disabled?: boolean;
  file: File | null;
  onFile: (file: File | null) => void;
  error?: string;
  hint?: string;
};

function bytesToHuman(n: number) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v = v / 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/**
 * UX-friendly single-file input:
 * - Big clickable area
 * - Shows chosen file name + size
 * - "Remove" resets input so the same file can be selected again
 */
export function FileUpload({ label, accept, disabled, file, onFile, error, hint }: Props) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [nonce, setNonce] = React.useState(0);

  // When file is cleared from outside, bump nonce to force <input> remount,
  // so user can pick the same file again.
  React.useEffect(() => {
    if (!file) setNonce(x => x + 1);
  }, [file]);

  const openPicker = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>

      <div
        role="button"
        tabIndex={0}
        onClick={openPicker}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') openPicker();
        }}
        className={[
          'mt-1 rounded-2xl border bg-white px-4 py-3 transition',
          disabled ? 'cursor-not-allowed border-slate-200 bg-slate-50' : 'cursor-pointer border-slate-200 hover:border-slate-300',
          error ? 'border-red-200' : '',
        ].join(' ')}
      >
        <input
          key={nonce}
          ref={inputRef}
          type="file"
          accept={accept}
          disabled={disabled}
          className="hidden"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onFile(e.target.files?.[0] ?? null)}
        />

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {file ? (
              <div className="truncate text-sm text-slate-900">
                <span className="font-medium">{file.name}</span>{' '}
                <span className="text-slate-400">({bytesToHuman(file.size)})</span>
              </div>
            ) : (
              <div className="text-sm text-slate-600">Choose file</div>
            )}

            {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
            {error ? <div className="mt-2 text-xs text-red-600">{error}</div> : null}
          </div>

          {file ? (
            <button
              type="button"
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                onFile(null);
              }}
              className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 hover:border-slate-300 disabled:opacity-50"
            >
              Remove
            </button>
          ) : (
            <div className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
              Browse
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
