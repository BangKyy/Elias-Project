'use client';

import { useId } from 'react';
import { Star } from '@phosphor-icons/react';
import { alwaysOnOptions, type AlwaysOn } from '@/lib/alwaysOn';
import { goalOptions } from '@/lib/profileOptions';

/**
 * Goals multi-select with exactly one primary (PR-2). `selected` keeps
 * selection order and selected[0] is the primary, so promoting a goal moves it
 * to the front. Shared by onboarding and /profil.
 */
export function GoalsPicker({ selected, onChange }: { selected: string[]; onChange: (goals: string[]) => void }) {
  const hintId = useId();

  function toggleGoal(goal: string) {
    onChange(selected.includes(goal) ? selected.filter((g) => g !== goal) : [...selected, goal]);
  }

  function makePrimary(goal: string) {
    onChange([goal, ...selected.filter((g) => g !== goal)]);
  }

  return (
    <fieldset className="flex flex-col gap-1" aria-describedby={hintId}>
      <legend data-animate="form-item" className="mb-1 text-xs font-medium text-disabled-content">
        Tujuan
      </legend>
      {/* Tiles instead of checkbox rows: a star marks the top priority, a checkbox the rest */}
      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
        {goalOptions.map((goal) => {
          const rank = selected.indexOf(goal);
          const checked = rank !== -1;
          const top = rank === 0;
          return (
            <label
              key={goal}
              data-animate="form-item"
              className={`relative block cursor-pointer rounded-xl border py-3.5 pr-11 pl-4 transition-colors has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-primary ${
                top
                  ? 'border-primary bg-primary-surface/40'
                  : checked
                    ? 'border-primary-border'
                    : 'border-disabled-surface hover:border-disabled-content'
              }`}
            >
              {/* Stays the real control on the top pick too, just hidden behind the star */}
              <input
                type="checkbox"
                name="goals"
                value={goal}
                checked={checked}
                onChange={() => toggleGoal(goal)}
                className={
                  top
                    ? 'sr-only'
                    : 'checkbox absolute top-4 right-4 size-4 cursor-pointer appearance-none rounded border border-disabled-content bg-white outline-none checked:border-primary checked:bg-primary'
                }
              />
              {top && <Star size={20} weight="fill" aria-hidden className="absolute top-3.5 right-3.5 text-primary" />}
              {/* Deselecting the top priority promotes the next pick */}
              {top && <span className="block text-xs font-medium text-primary">Prioritas utama</span>}
              <span className={`block text-sm md:text-md ${checked ? 'text-txt-black' : 'text-disabled-content'}`}>{goal}</span>
              {checked && !top && (
                <button
                  type="button"
                  // Keeps the click from reaching the label, which would uncheck the goal
                  onClick={(event) => {
                    event.preventDefault();
                    makePrimary(goal);
                  }}
                  className="mt-1 flex items-center gap-1 text-xs font-medium text-disabled-content transition-colors hover:text-primary focus-visible:text-primary focus-visible:outline-none"
                >
                  <Star size={12} aria-hidden />
                  Jadikan prioritas utama
                </button>
              )}
            </label>
          );
        })}
      </div>
      <p id={hintId} data-animate="form-item" className="text-xs text-disabled-content">
        Pilih satu atau lebih. Hanya <strong>satu yang menjadi prioritas utama</strong>, ditandai bintang.
      </p>
    </fieldset>
  );
}

/** "Always On" (PR-5): one answer, preselected to the default by the caller. */
export function AlwaysOnPicker({ value, onChange }: { value: AlwaysOn; onChange: (value: AlwaysOn) => void }) {
  return (
    <fieldset className="flex flex-col gap-1">
      <legend data-animate="form-item" className="mb-1 text-xs font-medium text-disabled-content">
        Always On
      </legend>
      {/* Same tiles as the survey step */}
      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
        {alwaysOnOptions.map((option) => {
          const checked = value === option.value;
          return (
            <label
              key={option.value}
              data-animate="form-item"
              className={`relative block cursor-pointer rounded-xl border py-3.5 pr-11 pl-4 transition-colors has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-primary ${
                checked ? 'border-primary bg-primary-surface/40' : 'border-disabled-surface hover:border-disabled-content'
              }`}
            >
              <input
                type="radio"
                name="alwaysOn"
                value={option.value}
                checked={checked}
                onChange={() => onChange(option.value)}
                className="absolute top-4 right-4 size-4 cursor-pointer appearance-none rounded-full border border-disabled-content bg-white outline-none checked:border-primary checked:bg-primary checked:shadow-[inset_0_0_0_3px_white]"
              />
              <span className={`block text-sm md:text-md ${checked ? 'text-txt-black' : 'text-disabled-content'}`}>
                {option.label}
              </span>
              <span className="block text-xs text-disabled-content">{option.description}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
