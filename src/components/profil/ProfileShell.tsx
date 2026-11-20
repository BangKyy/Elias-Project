'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { archetypeDirections } from '@/lib/archetypes';
import { brandCategoryLabels, isBrandCategory } from '@/lib/brandCategories';
import { creativeRoleLabels, type CreativeRole } from '@/lib/creativeRoles';
import { formatDate } from '@/lib/dates';
import type { AccountInfo, ProfileRecord } from '@/lib/profile';
import MotionText from '../motion/MotionText';

// The same three pages as NAVIGASI in the header's account panel
export const profilePages = [
  { href: '/profil', label: 'Profil' },
  { href: '/profil/notifikasi', label: 'Notifikasi' },
  { href: '/profil/kata-sandi', label: 'Lupa Kata Sandi' },
];

/**
 * Frame for the account pages: who you are at a glance, then tabs to
 * Profil, Notifikasi and Lupa Kata Sandi. Each page keeps only its own
 * sections, so none of them is a long scroll.
 */
export default function ProfileShell({
  account,
  profile,
  children,
}: {
  account: AccountInfo;
  profile: ProfileRecord;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const role = creativeRoleLabels[profile.role as CreativeRole];
  const archetype = profile.archetype ? archetypeDirections[profile.archetype]?.name : null;
  const category = isBrandCategory(profile.category) ? brandCategoryLabels[profile.category] : null;
  const summary = [role, archetype && `The ${archetype}`, category].filter(Boolean) as string[];
  // formatDate takes a calendar date; the signup timestamp is UTC, the app reads WIB days
  const joined = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date(account.createdAt));

  return (
    <div data-animate="page-item" className="flex flex-col gap-8 pb-10 md:gap-10">
      <section className="flex flex-col gap-3">
        <p className="font-mono text-xs font-bold tracking-wide text-gray-600 uppercase">Akun</p>
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

      <div className="flex flex-col">
        {/* Scrolls sideways on narrow phones rather than wrapping under itself */}
        <nav aria-label="Halaman akun" className="-mb-px flex gap-6 overflow-x-auto [scrollbar-width:none]">
          {profilePages.map((page) => {
            const current = pathname === page.href;
            return (
              <Link
                key={page.href}
                href={page.href}
                aria-current={current ? 'page' : undefined}
                className={`shrink-0 border-b-2 pb-3 text-md font-semibold whitespace-nowrap transition-colors ${
                  current ? 'border-primary text-txt-black' : 'border-transparent text-gray-600 hover:text-txt-black'
                }`}
              >
                {page.label}
              </Link>
            );
          })}
        </nav>
        {/* The first section's top border is the tabs' baseline */}
        <div className="flex flex-col">{children}</div>
      </div>
    </div>
  );
}
