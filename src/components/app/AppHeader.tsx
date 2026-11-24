'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight, CaretDown, List, SignOut, UserCircle, X } from '@phosphor-icons/react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { chatEnabled } from '@/lib/chatFeature';
import type { HeaderAccount } from '@/lib/headerAccount';
import Logo from '../Logo';
import SignOutButton from '../SignOutButton';

type NavItem = {
  label: string;
  href: string;
  /** Unbuilt pages (docs/MVP.md) are listed but not linked */
  ready: boolean;
  /** Under the label in the mobile menu */
  description: string;
  badge?: 'new' | 'soon';
};

// Profil is reached from the account button, not this list
const navItems: NavItem[] = [
  { label: 'Beranda', href: '/', ready: true, description: 'Tren hari ini yang layak ditindaklanjuti brand kamu.' },
  { label: 'Arsip', href: '/arsip', ready: true, description: 'Tren yang kamu simpan, lengkap dengan status dan catatan.', badge: 'new' },
  // Open once chatEnabled (lib/chatFeature); a guest who follows it is sent to /login by the proxy
  {
    label: 'Chat',
    href: '/chat',
    ready: chatEnabled,
    description: 'Tanya Elias lebih lanjut soal tren untuk brand kamu.',
    badge: chatEnabled ? 'new' : 'soon',
  },
];

// The account panel's NAVIGASI list; the same pages as the tabs on /profil (ProfileShell)
const accountItems: Pick<NavItem, 'label' | 'href' | 'ready' | 'badge'>[] = [
  { label: 'Profil', href: '/profil', ready: true, badge: 'new' },
  { label: 'Notifikasi', href: '/profil/notifikasi', ready: true, badge: 'new' },
  { label: 'Lupa Kata Sandi', href: '/profil/kata-sandi', ready: true, badge: 'new' },
];

/** The design's Badge: green "Baru" or grey "Segera Hadir". */
function Badge({ kind }: { kind: 'new' | 'soon' }) {
  return (
    <span
      className={`rounded-2xl px-2.5 py-0.5 font-inter text-sm font-medium whitespace-nowrap ${
        kind === 'new' ? 'bg-green-50 text-success-content' : 'bg-neutral-100 text-neutral-700'
      }`}
    >
      {kind === 'new' ? 'Baru' : 'Segera Hadir'}
    </span>
  );
}

function DesktopNav({ pathname }: { pathname: string }) {
  return navItems.map((item) => {
    const base = 'flex items-center gap-2 font-inter text-md font-semibold';
    if (!item.ready) {
      return (
        <span key={item.href} aria-disabled className={`${base} cursor-default text-disabled-content`}>
          {item.label}
          <span className="rounded-sm bg-neutral-100 px-1.5 font-mono text-[10px] leading-[15px] font-bold">SEGERA</span>
        </span>
      );
    }
    const current = pathname === item.href;
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={current ? 'page' : undefined}
        className={`${base} transition-colors ${current ? 'text-neutral-80' : 'text-neutral-600 hover:text-txt-black'}`}
      >
        {item.label}
      </Link>
    );
  });
}

/** Mobile menu items: label and badge, a line about the page, then "Lihat lebih lanjut". */
function MobileNav({ pathname }: { pathname: string }) {
  return navItems.map((item) => {
    const current = pathname === item.href;
    const body = (
      <>
        <span className="flex items-center gap-2">
          <span className={`font-inter text-md font-semibold ${current ? 'text-txt-black' : 'text-disabled-content'}`}>{item.label}</span>
          {item.badge && <Badge kind={item.badge} />}
        </span>
        <span className="mt-1 font-inter text-sm text-disabled-content">{item.description}</span>
        <span
          className={`mt-3 flex items-center gap-2 font-inter text-sm font-semibold ${item.ready ? 'text-primary' : 'text-disabled-surface'}`}
        >
          Lihat lebih lanjut
          <ArrowRight size={20} aria-hidden className={item.ready ? 'transition-transform group-hover:translate-x-0.5' : ''} />
        </span>
      </>
    );
    return item.ready ? (
      <Link
        key={item.href}
        href={item.href}
        aria-current={current ? 'page' : undefined}
        className="group flex flex-col px-4 py-3 transition-colors hover:bg-neutral-100"
      >
        {body}
      </Link>
    ) : (
      <div key={item.href} aria-disabled className="flex cursor-default flex-col px-4 py-3">
        {body}
      </div>
    );
  });
}

const sectionLabel = 'font-mono text-xs font-medium text-disabled-content uppercase';

function KeluarButton() {
  return (
    <SignOutButton className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary px-5 py-4 text-md font-medium text-primary transition hover:bg-primary-tint disabled:opacity-50">
      <SignOut size={24} aria-hidden />
      Keluar
    </SignOutButton>
  );
}

/** Divider and footer shared by both panels. */
function PanelFooter({ children }: { children: ReactNode }) {
  return (
    <>
      <div aria-hidden className="h-0.5 shrink-0 bg-neutral-50" />
      <div className="flex flex-col gap-3 px-4 py-6">{children}</div>
    </>
  );
}

/**
 * The account panel under the name button (desktop) or profile button
 * (mobile): persona, email and join date, account links, then Keluar.
 * Without `account` (the cycle loading screen) only the links and Keluar show.
 */
function AccountPanel({ account, pathname }: { account: HeaderAccount | null; pathname: string }) {
  return (
    <>
      <div className="flex flex-col gap-3.5 pt-6">
        {account && (
          <>
            {account.persona.length > 0 && (
              <>
                <section aria-label="Persona" className="flex flex-col gap-2 px-4">
                  <p className={sectionLabel}>Persona</p>
                  <ul className="flex flex-wrap gap-2.5">
                    {account.persona.map((label) => (
                      <li key={label} className="border border-primary px-3 py-1.5 font-mono text-xs font-bold text-primary uppercase">
                        {label}
                      </li>
                    ))}
                  </ul>
                </section>
                <div aria-hidden className="h-px bg-neutral-200" />
              </>
            )}
            <section aria-label="Email" className="flex flex-col gap-2 px-4">
              <p className={sectionLabel}>Email</p>
              <div className="flex flex-col gap-0.5">
                <p className="truncate text-sm text-disabled-content">{account.email}</p>
                <p className="text-xs text-gray-300">Bergabung sejak {account.joinedOn}</p>
              </div>
            </section>
            <div aria-hidden className="h-px bg-neutral-200" />
          </>
        )}
        <div className="flex flex-col gap-2">
          <p className={`${sectionLabel} px-4`}>Navigasi</p>
          {accountItems.map((item) => {
            const body = (
              <>
                {item.label}
                {item.badge && <Badge kind={item.badge} />}
              </>
            );
            const base = 'flex items-center gap-2 px-4 py-3 font-inter text-md font-semibold';
            return item.ready ? (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? 'page' : undefined}
                className={`${base} text-disabled-content transition-colors hover:bg-neutral-100 hover:text-txt-black`}
              >
                {body}
              </Link>
            ) : (
              <div key={item.href} aria-disabled className={`${base} cursor-default text-disabled-content`}>
                {body}
              </div>
            );
          })}
        </div>
      </div>
      <PanelFooter>
        <KeluarButton />
      </PanelFooter>
    </>
  );
}

// Past this many pixels the page runs under the header, so it needs its own surface
const SCROLLED_PX = 8;

const iconButton = 'flex items-center justify-center rounded-md p-3 transition';
const panel = 'flex flex-col overflow-hidden bg-bg-white shadow-menu';

/**
 * Header for the app pages, from the design's Dropdown header navigation.
 * Guests get Daftar/Masuk. Signed in, the name button (desktop) or profile
 * button (mobile) opens the account panel, the only place Keluar lives. Below laptop
 * width the links move into a menu that drops over the page. `account` is
 * null for guests. Transparent over the top of the page, so a backdrop shows
 * through; white with a soft shadow once the page scrolls under it.
 */
export default function AppHeader({ signedIn, account = null }: { signedIn: boolean; account?: HeaderAccount | null }) {
  const pathname = usePathname();
  // The nav menu (mobile) or the account panel, one at a time
  const [open, setOpen] = useState<'menu' | 'account' | null>(null);
  const menuOpen = open === 'menu';
  const accountOpen = open === 'account';
  const menuRef = useRef<HTMLElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > SCROLLED_PX);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);
  // An open panel needs a surface to hang from, scrolled or not
  const solid = scrolled || open !== null;

  // A link followed from either panel closes it
  useEffect(() => setOpen(null), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
    // The account panel also closes on a click anywhere outside its buttons and itself
    const onPointer = (e: PointerEvent) => {
      if (open === 'account' && !(e.target as Element).closest('[data-account]')) setOpen(null);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  useGSAP(
    () => {
      const target = menuOpen ? menuRef.current : accountOpen ? accountRef.current : null;
      if (!target) return;
      gsap.fromTo(target, { height: 0, autoAlpha: 0 }, { height: 'auto', autoAlpha: 1, duration: 0.35, ease: 'power2.out' });
    },
    { dependencies: [open] },
  );

  const toggleAccount = () => setOpen(accountOpen ? null : 'account');

  return (
    <header
      data-animate="header"
      className={`sticky top-0 z-10 w-full border-b transition-[background-color,box-shadow,border-color] duration-300 ease-out ${
        solid ? 'border-neutral-100 bg-bg-white shadow-header' : 'border-transparent bg-transparent'
      }`}
    >
      <div className="flex h-[72px] items-center justify-between pr-3 pl-4 md:pr-[22px] md:pl-[30px] laptop:h-20 laptop:px-[82px]">
        <div className="flex items-center gap-8">
          <Link href="/" aria-label="Elias beranda">
            <Logo priority />
          </Link>
          <nav aria-label="Navigasi utama" className="hidden items-center gap-5 laptop:flex">
            <DesktopNav pathname={pathname} />
          </nav>
        </div>

        {signedIn ? (
          <button
            type="button"
            data-account
            aria-expanded={accountOpen}
            aria-controls="app-account-panel"
            onClick={toggleAccount}
            className="hidden max-w-[260px] items-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-semibold text-bg-white transition hover:bg-ember laptop:flex"
          >
            <UserCircle size={20} aria-hidden className="shrink-0" />
            <span className="truncate">{account?.name ?? 'Akun'}</span>
            <CaretDown size={20} aria-hidden className={`shrink-0 transition-transform duration-300 ${accountOpen ? 'rotate-180' : ''}`} />
          </button>
        ) : (
          <div className="hidden items-center gap-6 laptop:flex">
            <Link
              href="/signup"
              className="rounded-md px-4 py-3 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-txt-black"
            >
              Daftar
            </Link>
            <Link href="/login" className="rounded-md bg-primary px-4 py-3 text-sm font-medium text-bg-white transition hover:bg-ember">
              Masuk
            </Link>
          </div>
        )}

        <div className="flex items-center gap-2.5 laptop:hidden">
          {signedIn && (
            <button
              type="button"
              data-account
              aria-label="Akun"
              aria-expanded={accountOpen}
              aria-controls="app-account-panel"
              onClick={toggleAccount}
              className={`${iconButton} bg-primary text-bg-white hover:bg-ember`}
            >
              <UserCircle size={20} aria-hidden />
            </button>
          )}
          <button
            type="button"
            aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'}
            aria-expanded={menuOpen}
            aria-controls="app-mobile-menu"
            onClick={() => setOpen(menuOpen ? null : 'menu')}
            className={
              signedIn
                ? `${iconButton} border border-txt-black text-txt-black hover:bg-neutral-100`
                : 'flex items-center justify-center rounded-lg p-2 transition-colors hover:bg-neutral-100'
            }
          >
            {signedIn ? (
              menuOpen ? <X size={20} aria-hidden /> : <List size={20} aria-hidden />
            ) : menuOpen ? (
              <X size={24} aria-hidden className="text-neutral-700" />
            ) : (
              <Image src="/images/menu.svg" alt="" width={24} height={24} />
            )}
          </button>
        </div>
      </div>

      {/* Full width under the header on mobile; a 375px panel under the name button on laptop */}
      {accountOpen && (
        <div
          id="app-account-panel"
          ref={accountRef}
          data-account
          className={`${panel} absolute inset-x-0 top-full laptop:inset-x-auto laptop:top-[calc(100%-6px)] laptop:right-[82px] laptop:w-[375px]`}
        >
          <AccountPanel account={account} pathname={pathname} />
        </div>
      )}

      {menuOpen && (
        <nav id="app-mobile-menu" ref={menuRef} aria-label="Navigasi utama" className={`${panel} absolute inset-x-0 top-full laptop:hidden`}>
          <div className={`flex flex-col gap-2 pt-6 ${signedIn ? 'pb-6' : ''}`}>
            <MobileNav pathname={pathname} />
          </div>
          {/* Signed in, Keluar is only in the account panel under the profile button */}
          {!signedIn && (
            <PanelFooter>
              <Link
                href="/signup"
                className="flex w-full items-center justify-center rounded-lg bg-primary px-5 py-4 text-md font-semibold text-bg-white transition hover:bg-ember"
              >
                Daftar
              </Link>
              <Link
                href="/login"
                className="flex w-full items-center justify-center rounded-lg border border-primary px-5 py-4 text-md font-medium text-primary transition hover:bg-primary-tint"
              >
                Masuk
              </Link>
            </PanelFooter>
          )}
        </nav>
      )}
    </header>
  );
}
