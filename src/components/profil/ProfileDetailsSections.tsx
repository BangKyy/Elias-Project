'use client';

import { useState } from 'react';
import { Briefcase, CalendarStar, IdentificationBadge, MaskHappy, SquaresFour, Target, Users } from '@phosphor-icons/react';
import { DEFAULT_ALWAYS_ON, isAlwaysOn, type AlwaysOn } from '@/lib/alwaysOn';
import { brandCategoryOptions } from '@/lib/brandCategories';
import type { ProfileRecord } from '@/lib/profile';
import {
  accountTypeOptions,
  archetypeOptions,
  goalOptions,
  notificationTimeOptions,
  roleOptions,
} from '@/lib/profileOptions';
import { targetMarkets } from '@/lib/targetMarkets';
import { DropdownField, TextField } from '../auth/fields';
import LocationField from '../onboarding/LocationField';
import { AlwaysOnPicker, GoalsPicker } from '../onboarding/PreferencePickers';
import ProfileSection, { SectionForm, useProfileForm } from './ProfileSection';

// Saved values outside today's options (old answers) start blank, like onboarding
const known = (options: { value: string }[], value: string | null) =>
  options.some((option) => option.value === value) ? (value as string) : '';

type SectionProps = { userId: string; profile: ProfileRecord };

/** Personal layer (PR-1): who is using Elias. */
export function PersonalSection({ userId, profile }: SectionProps) {
  const form = useProfileForm(
    { table: 'profiles', id: userId },
    {
      name: profile.name ?? '',
      role: known(roleOptions, profile.role),
      accountType: known(accountTypeOptions, profile.account_type),
    },
    ({ name, role, accountType }) => ({ name: name.trim(), role, account_type: accountType || null }),
  );
  const { values, set } = form;

  return (
    <ProfileSection
      id="data-diri"
      title="Data Diri"
      description={
        <>
          Peran menentukan <strong>so what</strong> di setiap tren di Beranda dan analisis Elias.
        </>
      }
    >
      <SectionForm
        dirty={form.dirty}
        canSave={values.name.trim() !== '' && values.role !== ''}
        saving={form.saving}
        status={form.status}
        onSubmit={form.save}
        onReset={form.reset}
      >
        <TextField
          icon={IdentificationBadge}
          label="Nama"
          name="name"
          autoComplete="name"
          rounded="xl"
          value={values.name}
          onChange={(name) => set('name', name)}
          hint="Nama tidak boleh kosong."
        />
        <DropdownField
          icon={Briefcase}
          label="Peran"
          name="role"
          options={roleOptions}
          value={values.role}
          onChange={(role) => set('role', role)}
          hint="Peran kamu saat ini."
          sheetTitle="Pilih Peranmu"
        />
        <DropdownField
          icon={Users}
          label="Tipe Akun"
          name="accountType"
          options={accountTypeOptions}
          value={values.accountType}
          onChange={(accountType) => set('accountType', accountType)}
          hint="Cara kamu memakai Elias."
          sheetTitle="Pilih Tipe Akun"
        />
      </SectionForm>
    </ProfileSection>
  );
}

/** Brand layer (PR-1): what Elias weighs every trend against. */
export function BrandSection({ profile }: SectionProps) {
  const form = useProfileForm(
    { table: 'brand_profiles', id: profile.brandId },
    {
      category: profile.category ?? '',
      targetMarket: profile.target_market ?? '',
      archetype: known(archetypeOptions, profile.archetype),
      location: profile.location ?? '',
      localFocus: profile.local_focus,
    },
    ({ category, targetMarket, archetype, location, localFocus }) => ({
      category,
      target_market: targetMarket,
      archetype,
      location: location.trim(),
      local_focus: localFocus,
    }),
  );
  const { values, set, setStatus } = form;
  const [locating, setLocating] = useState(false);

  return (
    <ProfileSection
      id="brand"
      title="Brand"
      description="Kategori, target market, archetype, dan lokasi menentukan tren mana yang muncul untukmu dan aksi yang Elias sarankan."
    >
      <SectionForm
        dirty={form.dirty}
        canSave={
          values.category !== '' &&
          values.targetMarket !== '' &&
          values.archetype !== '' &&
          values.location.trim() !== '' &&
          !locating
        }
        saving={form.saving}
        status={form.status}
        onSubmit={form.save}
        onReset={form.reset}
      >
        <DropdownField
          icon={SquaresFour}
          label="Kategori"
          name="category"
          options={brandCategoryOptions}
          value={values.category}
          onChange={(category) => set('category', category)}
          hint="Kategori industri brand kamu."
          sheetTitle="Pilih Kategorimu"
        />
        <DropdownField
          icon={Target}
          label="Target Market"
          name="targetMarket"
          options={targetMarkets}
          value={values.targetMarket}
          onChange={(targetMarket) => set('targetMarket', targetMarket)}
          hint="Audiens utama yang ingin dijangkau brand kamu."
          sheetTitle="Pilih Target Market"
        />
        <DropdownField
          icon={MaskHappy}
          label="Archetype Brand"
          name="archetype"
          options={archetypeOptions}
          value={values.archetype}
          onChange={(archetype) => set('archetype', archetype)}
          hint="Karakter yang sesuai dengan brand kamu."
          sheetTitle="Pilih Archetype Brand"
        />
        <LocationField
          location={values.location}
          onLocation={(location) => set('location', location)}
          localFocus={values.localFocus}
          onLocalFocus={(localFocus) => set('localFocus', localFocus)}
          onError={(text) => setStatus(text ? { tone: 'error', text } : null)}
          onLocatingChange={setLocating}
        />
      </SectionForm>
    </ProfileSection>
  );
}

/** Goals (PR-2): they steer what Elias recommends. */
export function GoalsSection({ profile }: SectionProps) {
  const form = useProfileForm(
    { table: 'brand_profiles', id: profile.brandId },
    { goals: profile.goals.filter((goal) => goalOptions.includes(goal)) },
    ({ goals }) => ({ goals }),
  );
  const { values, set } = form;

  return (
    <ProfileSection id="tujuan" title="Tujuan" description="Tujuan utama mengarahkan rekomendasi Elias untuk brand kamu.">
      <SectionForm
        dirty={form.dirty}
        canSave={values.goals.length > 0}
        saving={form.saving}
        status={form.status}
        onSubmit={form.save}
        onReset={form.reset}
      >
        <GoalsPicker selected={values.goals} onChange={(goals) => set('goals', goals)} />
      </SectionForm>
    </ProfileSection>
  );
}

/** The morning email time and Always On (PR-5), on /profil/notifikasi. */
export function NotificationSection({ userId, profile }: SectionProps) {
  const form = useProfileForm(
    { table: 'profiles', id: userId },
    {
      // Postgres returns time as HH:MM:SS
      notificationTime: known(notificationTimeOptions, profile.notification_time?.slice(0, 5) ?? null),
      alwaysOn: (isAlwaysOn(profile.always_on) ? profile.always_on : DEFAULT_ALWAYS_ON) as AlwaysOn,
    },
    ({ notificationTime, alwaysOn }) => ({ notification_time: notificationTime, always_on: alwaysOn }),
  );
  const { values, set } = form;

  return (
    <ProfileSection
      id="email-pagi"
      title="Email Pagi"
      description="Jam dan Always On mengatur kapan email pagi dari Elias dikirim."
    >
      <SectionForm
        dirty={form.dirty}
        canSave={values.notificationTime !== ''}
        saving={form.saving}
        status={form.status}
        onSubmit={form.save}
        onReset={form.reset}
      >
        <DropdownField
          icon={CalendarStar}
          label="Jam Email Pagi"
          name="notificationTime"
          options={notificationTimeOptions}
          value={values.notificationTime}
          onChange={(time) => set('notificationTime', time)}
          hint="Pilih jam kamu ingin menerima email pagi dari Elias."
          selectedHint={(time) => `Email dari Elias tiba setiap pagi pukul ${time.label}.`}
          sheetTitle="Pilih Waktu Notifikasi"
        />
        <AlwaysOnPicker value={values.alwaysOn} onChange={(alwaysOn) => set('alwaysOn', alwaysOn)} />
      </SectionForm>
    </ProfileSection>
  );
}
