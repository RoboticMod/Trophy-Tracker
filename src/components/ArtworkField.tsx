import React, { useRef, useState } from 'react';
import { ImageUp, Loader2, RotateCcw, Upload } from 'lucide-react';
import { fileToArtworkDataUrl } from '../lib/image';
import { Button, TextInput } from './ui';
import { cn } from '../lib/cn';

interface ArtworkFieldProps {
  label: string;
  /** One line under the label, for what this picture is actually for. */
  hint?: string;
  value?: string;
  onChange: (next: string | undefined) => void;
  /** The frame the preview is drawn in — a poster is tall, a banner is wide. */
  aspect: 'portrait' | 'wide';
  /** Drawn behind a transparent logo, so it is visible against the panel. */
  checkered?: boolean;
  maxDimension?: number;
  maxBytes?: number;
}

/**
 * One piece of a game's artwork: drop a file on it, pick one, or paste a URL.
 *
 * Covers arrive from a catalog that has one picture per game and no say in
 * which. Anyone who cares what their library looks like ends up wanting a
 * particular poster for a particular game, which is exactly what Steam's own
 * artwork picker is for — so this works the same way, and accepts a link as
 * well for the case where the picture is already on the web.
 *
 * An uploaded file is downscaled and inlined rather than stored anywhere: this
 * app has no file storage, the row is the only place a game's data lives, and
 * a handful of full-size covers would exhaust the offline cache for the whole
 * library. A URL costs nothing, so it stays the better option of the two.
 */
export const ArtworkField: React.FC<ArtworkFieldProps> = ({
  label,
  hint,
  value,
  onChange,
  aspect,
  checkered = false,
  maxDimension,
  maxBytes,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      onChange(await fileToArtworkDataUrl(file, { maxDimension, maxBytes }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not use that image.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="eyebrow text-gray-700">{label}</span>
        {value ? (
          <button
            type="button"
            onClick={() => {
              onChange(undefined);
              setError(null);
            }}
            className="flex items-center gap-1 rounded-sm text-50 text-gray-600 hover:text-gray-900"
          >
            <RotateCcw size={11} />
            Reset
          </button>
        ) : null}
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void accept(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          'relative flex items-center justify-center overflow-hidden rounded-md border border-dashed transition-colors',
          aspect === 'portrait' ? 'aspect-[2/3] w-28' : 'aspect-[16/9] w-full max-w-64',
          dragging
            ? 'border-accent-700 bg-accent-700/16'
            : 'border-gray-400/60 bg-black/25 hover:border-gray-400',
        )}
      >
        {/* A soft chequer, so a transparent logo is visible against a panel
            that is nearly the same darkness as the logo's own ink. */}
        {checkered && (
          <div
            aria-hidden
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                'linear-gradient(45deg, var(--color-gray-300) 25%, transparent 25%, transparent 75%, var(--color-gray-300) 75%), linear-gradient(45deg, var(--color-gray-300) 25%, transparent 25%, transparent 75%, var(--color-gray-300) 75%)',
              backgroundSize: '12px 12px',
              backgroundPosition: '0 0, 6px 6px',
            }}
          />
        )}

        {value ? (
          <img
            src={value}
            alt=""
            className={cn(
              'relative h-full w-full',
              // A logo is a shape on nothing and must not be cropped; a cover
              // is a picture and should fill its frame.
              checkered ? 'object-contain p-2' : 'object-cover',
            )}
          />
        ) : (
          <span className="relative flex flex-col items-center gap-1 px-2 text-center text-50 text-gray-600">
            <ImageUp size={18} />
            Drop an image
          </span>
        )}

        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-25/70">
            <Loader2 size={18} className="animate-spin text-gray-900" />
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <TextInput
          value={value?.startsWith('data:') ? '' : (value ?? '')}
          placeholder={value?.startsWith('data:') ? 'Uploaded image' : 'https://…'}
          onChange={(e) => onChange(e.target.value.trim() || undefined)}
          aria-label={`${label} URL`}
          className="h-8 text-75"
        />
        <Button
          type="button"
          size="s"
          variant="secondary"
          buttonStyle="outline"
          onClick={() => inputRef.current?.click()}
        >
          <Upload size={13} />
          <span>Upload</span>
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            void accept(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>

      {error ? <p className="text-50 text-negative-900">{error}</p> : null}
      {!error && hint ? <p className="text-50 text-gray-600">{hint}</p> : null}
    </div>
  );
};
