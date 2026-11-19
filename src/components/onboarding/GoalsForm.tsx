'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarStar } from '@phosphor-icons/react';
import { DEFAULT_ALWAYS_ON, isAlwaysOn, type AlwaysOn } from '@/lib/alwaysOn';
import { goalOptions as goals, notificationTimeOptions as notificationTimes } from '@/lib/profileOptions';
import { createClient } from '@/lib/supabase/client';
import { errorMessage } from '@/lib/supabase/errors';
import { DropdownField, type FormStatus } from '../auth/fields';
import BackLink from './BackLink';
import OnboardingForm from './OnboardingForm';
import { AlwaysOnPicker, GoalsPicker } from './PreferencePickers';

export type GoalsAnswers = {
  goals: string[];
  notification_time: string | null;
  always_on: string | null;
};

export default function GoalsForm({ initial }: { initial: GoalsAnswers | null }) {
  const router = useRouter();
  // Kept in selection order: the first pick is the top priority
  const [selectedGoals, setSelectedGoals] = useState<string[]>(initial?.goals.filter((goal) => goals.includes(goal)) ?? []);
  // Postgres returns time as HH:MM:SS
  const [notificationTime, setNotificationTime] = useState(initial?.notification_time?.slice(0, 5) ?? '');
  const savedAlwaysOn = initial?.always_on;
  const [alwaysOn, setAlwaysOn] = useState<AlwaysOn>(isAlwaysOn(savedAlwaysOn) ? savedAlwaysOn : DEFAULT_ALWAYS_ON);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<FormStatus>(null);

  const canSubmit = selectedGoals.length > 0 && notificationTime !== '' && !submitting;

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
      .update({ goals: selectedGoals, notification_time: notificationTime, always_on: alwaysOn })
      .eq('id', user.id)
      .select('id')
      .single();
    if (error) {
      setSubmitting(false);
      setStatus({ tone: 'error', text: errorMessage(error) });
      return;
    }
    // Stays disabled while the survey loads
    router.push('/onboarding/survey');
  }

  return (
    <OnboardingForm
      step={2}
      back={<BackLink href="/onboarding/profile" />}
      title="Tujuan & Preferensi"
      subtitle="Tujuan & preferensimu menentukan persona Elias"
      canSubmit={canSubmit}
      submitting={submitting}
      status={status}
      onSubmit={handleSubmit}
    >
      <GoalsPicker selected={selectedGoals} onChange={setSelectedGoals} />

      <DropdownField
        icon={CalendarStar}
        label="Aktifkan Notifikasi"
        name="notificationTime"
        options={notificationTimes}
        value={notificationTime}
        onChange={setNotificationTime}
        hint="Pilih jam kamu ingin menerima email pagi dari Elias."
        // Confirms the choice in the user's terms once a time is picked
        selectedHint={(time) => `Email dari Elias tiba setiap pagi pukul ${time.label}.`}
        sheetTitle="Pilih Waktu Notifikasi"
      />

      <AlwaysOnPicker value={alwaysOn} onChange={setAlwaysOn} />
    </OnboardingForm>
  );
}
