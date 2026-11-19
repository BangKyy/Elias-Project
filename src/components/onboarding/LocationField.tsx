'use client';

import { useState } from 'react';
import { CircleNotch, GpsFix, Info, MapPin } from '@phosphor-icons/react';
import { LocateError, locateUser } from '@/lib/locateUser';
import { TextField } from '../auth/fields';

type LocationFieldProps = {
  location: string;
  onLocation: (location: string) => void;
  localFocus: boolean;
  onLocalFocus: (localFocus: boolean) => void;
  /** A failed lookup's message, or null when a new lookup starts */
  onError: (message: string | null) => void;
  /** True while the browser is being asked for a position */
  onLocatingChange?: (locating: boolean) => void;
};

/**
 * Location with the "Izinkan akses lokasi" switch (local focus): turning it on
 * fills the location from the browser. Shared by onboarding and /profil.
 */
export default function LocationField({
  location,
  onLocation,
  localFocus,
  onLocalFocus,
  onError,
  onLocatingChange,
}: LocationFieldProps) {
  const [locating, setLocating] = useState(false);

  function setBusy(busy: boolean) {
    setLocating(busy);
    onLocatingChange?.(busy);
  }

  async function detectLocation() {
    setBusy(true);
    onError(null);
    try {
      onLocation(await locateUser());
      onLocalFocus(true);
    } catch (error) {
      onError(error instanceof LocateError ? error.message : 'Gagal mengambil lokasi. Isi lokasi secara manual.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      <TextField
        icon={MapPin}
        label="Lokasi"
        name="location"
        autoComplete="address-level2"
        rounded="xl"
        value={location}
        onChange={onLocation}
        hint={
          <>
            {/* Mobile shows an info icon before this hint */}
            <Info size={14} className="mt-0.5 shrink-0 md:hidden" aria-hidden />
            Masukkan lokasi secara manual tanpa mengizinkan akses lokasi pada browser.
          </>
        }
        action={
          <button
            type="button"
            aria-label="Izinkan akses lokasi: isi lokasi otomatis dari browser"
            title="Izinkan akses lokasi"
            onClick={detectLocation}
            disabled={locating}
            className="flex shrink-0 rounded text-disabled-content transition-colors hover:text-primary disabled:cursor-wait"
          >
            {locating ? (
              <CircleNotch size={18} weight="light" className="animate-spin" />
            ) : (
              <GpsFix size={18} weight={localFocus ? 'fill' : 'light'} className={localFocus ? 'text-primary' : ''} />
            )}
          </button>
        }
      />
      <label data-animate="form-item" className="flex cursor-pointer items-start gap-2">
        <span className="flex pt-0.5">
          <input
            type="checkbox"
            checked={localFocus}
            disabled={locating}
            // Same as the button in the location field; unchecking keeps the filled location
            onChange={(e) => (e.target.checked ? detectLocation() : onLocalFocus(false))}
            className="checkbox size-4 shrink-0 cursor-pointer appearance-none rounded border border-primary-subtle bg-white checked:border-primary checked:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="font-inter text-sm font-medium text-ink-50">Izinkan akses lokasi</span>
          <span className="text-xs text-ink-30">Lokasi terisi otomatis dari browser kamu.</span>
        </span>
      </label>
    </div>
  );
}
