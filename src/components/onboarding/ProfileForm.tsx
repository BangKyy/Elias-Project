'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Briefcase, CaretLeft, IdentificationBadge, MaskHappy, SquaresFour, Target } from '@phosphor-icons/react';
import { createClient } from '@/lib/supabase/client';
import { errorMessage } from '@/lib/supabase/errors';
import { brandCategoryOptions } from '@/lib/brandCategories';
import { archetypeOptions as archetypes, roleOptions as roles } from '@/lib/profileOptions';
import { targetMarkets } from '@/lib/targetMarkets';
import { DropdownField, TextField, type FormStatus } from '../auth/fields';
import SignOutButton from '../SignOutButton';
import LocationField from './LocationField';
import OnboardingForm from './OnboardingForm';

/** Answers saved earlier, so returning users don't start from blank fields. */
export type ProfileAnswers = {
  name: string | null;
  role: string | null;
  category: string | null;
  target_market: string | null;
  archetype: string | null;
  location: string | null;
  local_focus: boolean;
};

export default function ProfileForm({ initial }: { initial: ProfileAnswers | null }) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? '');
  // Roles saved outside the list (old job titles, free text) start blank
  const [role, setRole] = useState(roles.find((r) => r.value === initial?.role)?.value ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [targetMarket, setTargetMarket] = useState(initial?.target_market ?? '');
  const [archetype, setArchetype] = useState(initial?.archetype ?? '');
  const [location, setLocation] = useState(initial?.location ?? '');
  const [localFocus, setLocalFocus] = useState(initial?.local_focus ?? false);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<FormStatus>(null);

  // Local focus now fills the location itself, so a location is always required
  const canSubmit =
    name.trim() !== '' &&
    role !== '' &&
    category !== '' &&
    targetMarket !== '' &&
    archetype !== '' &&
    location.trim() !== '' &&
    !locating &&
    !submitting;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setStatus(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSubmitting(false);
      setStatus({ tone: 'error', text: 'Sesi kamu telah berakhir. Silakan masuk lagi.' });
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        name: name.trim(),
        role,
        category,
        target_market: targetMarket,
        archetype,
        location: location.trim() || null,
        local_focus: localFocus,
      })
      .eq('id', user.id)
      .select('id')
      .single();
    setSubmitting(false);

    if (error) {
      setStatus({ tone: 'error', text: errorMessage(error) });
      return;
    }
    router.push('/onboarding/goals');
  }

  return (
    <OnboardingForm
      step={1}
      back={
        // The account already exists, so going back to signup means leaving this session
        <div data-animate="form-item">
          <SignOutButton
            redirectTo="/signup"
            className="group flex w-fit items-center gap-1.5 text-lg text-txt-black disabled:opacity-50 md:gap-2.5 md:text-xl"
          >
            <CaretLeft size={28} className="text-stone transition-transform group-hover:-translate-x-0.5" />
            Kembali ke tahap sebelumnya
          </SignOutButton>
        </div>
      }
      title="Lengkapi Profil"
      subtitle="Profilmu menentukan persona Elias"
      canSubmit={canSubmit}
      submitting={submitting}
      status={status}
      onSubmit={handleSubmit}
    >
      <TextField
        icon={IdentificationBadge}
        label="Nama"
        name="name"
        autoComplete="name"
        rounded="xl"
        value={name}
        onChange={setName}
        hint="Masukkan nama kamu dengan benar."
      />
      <DropdownField
        icon={Briefcase}
        label="Peran"
        name="role"
        options={roles}
        value={role}
        onChange={setRole}
        hint="Peran kamu saat ini."
        sheetTitle="Pilih Peranmu"
      />
      <DropdownField
        icon={SquaresFour}
        label="Kategori"
        name="category"
        options={brandCategoryOptions}
        value={category}
        onChange={setCategory}
        hint="Kategori industri brand kamu."
        sheetTitle="Pilih Kategorimu"
      />
      <DropdownField
        icon={Target}
        label="Target Market"
        name="targetMarket"
        options={targetMarkets}
        value={targetMarket}
        onChange={setTargetMarket}
        hint="Audiens utama yang ingin dijangkau brand kamu."
        sheetTitle="Pilih Target Market"
      />
      <DropdownField
        icon={MaskHappy}
        label="Archetype Brand"
        name="archetype"
        options={archetypes}
        value={archetype}
        onChange={setArchetype}
        hint="Masukkan karakter yang sesuai denganmu."
        sheetTitle="Pilih Archetype Brand"
      />

      <LocationField
        location={location}
        onLocation={setLocation}
        localFocus={localFocus}
        onLocalFocus={setLocalFocus}
        onError={(text) => setStatus(text ? { tone: 'error', text } : null)}
        onLocatingChange={setLocating}
      />
    </OnboardingForm>
  );
}
