import type { SelectOption } from '@/components/auth/fields';
import { archetypeDirections } from './archetypes';
import { creativeRoleLabels } from './creativeRoles';

// Choices shared by sign-up, onboarding and /profil, so an answer picked in
// one is always a valid answer in the others.

// Must match profiles_account_type_check
export const accountTypeOptions: SelectOption[] = [
  { value: 'personal', label: 'Personal' },
  { value: 'freelancer', label: 'Freelancer' },
  { value: 'brand', label: 'Brand / Bisnis' },
  { value: 'agency', label: 'Agency' },
  { value: 'studio', label: 'Studio' },
  { value: 'organization', label: 'Organisasi / Komunitas' },
];

// The PRD's seven creative roles: Elias tailors every recommendation to the one picked
export const roleOptions: SelectOption[] = Object.entries(creativeRoleLabels).map(([value, label]) => ({ value, label }));

// All twelve, each with its description inline in the picker (PR-4)
export const archetypeOptions: SelectOption[] = Object.entries(archetypeDirections).map(([value, { name, description }]) => ({
  value,
  label: `The ${name}`,
  description,
}));

export const goalOptions = [
  'Meningkatkan kesadaran brand',
  'Mendorong penjualan langsung',
  'Membangun audiens/komunitas lokal',
  'Memposisikan ulang brand',
  'Meluncurkan produk atau kampanye baru',
  'Meningkatkan engangement baru',
];

// TODO: confirm the delivery times for the morning email
export const notificationTimeOptions: SelectOption[] = ['05:00', '06:00', '07:00', '08:00', '09:00'].map((time) => ({
  value: time,
  label: `${time} WIB`,
}));

/** Label for a saved option value, or null when it isn't one of the options. */
export function optionLabel(options: SelectOption[], value: string | null | undefined): string | null {
  return options.find((option) => option.value === value)?.label ?? null;
}
