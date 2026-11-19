'use client';

import { archetypeDirections } from '@/lib/archetypes';
import { brandCategoryLabels, isBrandCategory } from '@/lib/brandCategories';
import { creativeRoleLabels, type CreativeRole } from '@/lib/creativeRoles';
import { formatDate } from '@/lib/dates';
import type { AccountInfo, ProfileRecord } from '@/lib/profile';
import MotionText from '../motion/MotionText';
import { DeleteAccountSection, EmailSection, PasswordSection } from './AccountSections';
import { BrandSection, PersonalSection, PreferencesSection } from './ProfileDetailsSections';

const sections = [
  { id: 'data-diri', label: 'Data Diri' },
  { id: 'brand', label: 'Brand' },
  { id: 'preferensi', label: 'Tujuan & Notifikasi' },
  { id: 'email', label: 'Email' },
  { id: 'kata-sandi', label: 'Kata Sandi' },
  { id: 'hapus-akun', label: 'Hapus Akun' },
];

/** /profil: read the profile at a glance, then edit it block by block. */
export default function ProfileView({ account, profile }: { account: AccountInfo; profile: ProfileRecord }) {
  const role = creativeRoleLabels[profile.role as CreativeRole];
  const archetype = profile.archetype ? archetypeDirections[profile.archetype]?.name : null;
  const category = isBrandCategory(profile.category) ? brandCategoryLabels[profile.category] : null;
  const summary = [role, archetype && `The ${archetype}`, category].filter(Boolean) as string[];
  // formatDate takes a calendar date; the signup timestamp is UTC, the app reads WIB days
  const joined = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date(account.createdAt));

  return (
    <div data-animate="page-item" className="flex flex-col gap-8 pb-10 md:gap-10">
      <section className="flex flex-col gap-3">
        <p className="font-mono text-xs font-bold tracking-wide text-gray-600 uppercase">Profil</p>
        <MotionText
          as="h1"
          effect="scramble"
          delay={0.2}
          text={profile.name ?? 'Profil kamu'}
          className="max-w-4xl text-2xl font-bold break-words md:text-display-sm laptop:text-display-md"
        />
        {summary.length > 0 && (
          <ul aria-label="Ringkasan profil" className="flex flex-wrap gap-2.5">
            {summary.map((item) => (
              <li key={item} className="border border-primary px-3 py-1.5 font-mono text-xs font-bold text-primary uppercase">
                {item}
              </li>
            ))}
          </ul>
        )}
        <p className="text-sm text-gray-600">
          {account.email} · Bergabung sejak <time dateTime={joined}>{formatDate(joined)}</time>
        </p>
      </section>

      <nav aria-label="Bagian profil" className="flex flex-wrap gap-x-5 gap-y-2">
        {sections.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="text-sm font-semibold text-gray-600 transition-colors hover:text-txt-black"
          >
            {section.label}
          </a>
        ))}
      </nav>

      <div className="flex flex-col">
        <PersonalSection userId={account.userId} profile={profile} />
        <BrandSection userId={account.userId} profile={profile} />
        <PreferencesSection userId={account.userId} profile={profile} />
        <EmailSection account={account} />
        <PasswordSection account={account} />
        <DeleteAccountSection account={account} />
      </div>
    </div>
  );
}
