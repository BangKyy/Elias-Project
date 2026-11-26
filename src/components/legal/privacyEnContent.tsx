import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  LEGAL_CONTACT_EMAIL,
  LEGAL_EFFECTIVE_DATE,
  LEGAL_INSTAGRAM_URL,
  LEGAL_OPERATOR,
  LEGAL_OPERATOR_DESCRIPTION,
  PINTEREST_INTEGRATION_LIVE,
} from '@/lib/legal';
import { List, P } from './LegalPage';

// The English privacy policy at /en/privacy, for the Pinterest Developer
// application. The only English copy in the app (LN-1): every English string
// of that page lives here, and nothing in the app links to it. /privasi stays
// the primary policy; keep the two in step and share LEGAL_EFFECTIVE_DATE.
// Sections 5 and 6 follow PINTEREST_INTEGRATION_LIVE (BR-5).

export const privacyEnTitle = 'Elias Privacy Policy';

const email = (
  <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="font-semibold break-all text-primary underline-offset-2 hover:underline">
    {LEGAL_CONTACT_EMAIL}
  </a>
);

const instagram = (
  <a href={LEGAL_INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="font-semibold break-all text-primary underline-offset-2 hover:underline">
    {LEGAL_INSTAGRAM_URL}
  </a>
);

const sections: { id: string; title: string; content: ReactNode }[] = [
  {
    id: 'summary',
    title: 'Summary',
    content: (
      <P>
        Elias reads public trend and news signals and recommends content ideas suited to your brand and role. To do that we collect the
        account and profile details you give us. We do not collect payment data, run analytics or advertising trackers, or sell your data.
        You can change your profile or delete your account at any time.
      </P>
    ),
  },
  {
    id: 'operator',
    title: 'Who manages your data',
    content: (
      <>
        <P>
          Elias is developed and operated by {LEGAL_OPERATOR}, {LEGAL_OPERATOR_DESCRIPTION.en} (Instagram: {instagram}).
        </P>
        <P>Contact for privacy questions: {email}</P>
      </>
    ),
  },
  {
    id: 'data',
    title: 'Data we collect',
    content: (
      <>
        <List>
          <li>
            <strong>Account:</strong> email address, password (stored only as a hash by Supabase Auth), and account creation time.
          </li>
          <li>
            <strong>Profile and brand:</strong> name, account type, role, brand category, target market, archetype, location, local focus,
            brand goals, morning email time, Always On preference, how you heard about Elias, and onboarding and profile-update timestamps.
          </li>
          <li>
            <strong>Location:</strong> a location you type, or a place name derived from the browser location button. We do not store
            coordinates.
          </li>
          <li>
            <strong>AI usage logs:</strong> request type, account (if any), and time. We do not log the content of requests. Analysis results
            are cached temporarily.
          </li>
          <li>
            <strong>Chat:</strong> your messages, Elias&rsquo;s replies, the related trend text, the model name, and any feedback you give on
            replies.
          </li>
          <li>
            <strong>Stored only in your browser:</strong> your Archive and some temporary data. These are not sent to our servers.
          </li>
        </List>
        <P>We do not collect payment data, analytics data, advertising identifiers, or your age.</P>
      </>
    ),
  },
  {
    id: 'use',
    title: 'How we use your data',
    content: (
      <List>
        <li>To create and secure your account.</li>
        <li>To tailor trend recommendations to your brand, role, and location.</li>
        <li>To answer your questions in Chat.</li>
        <li>To operate and protect the service, for example by limiting daily AI usage.</li>
        <li>To send the morning email you opt into. This feature is not active yet.</li>
      </List>
    ),
  },
  {
    id: 'sharing',
    title: 'Who we share data with',
    content: (
      <>
        <P>
          <strong>Service providers:</strong>
        </P>
        <List>
          <li>Supabase: database and authentication emails.</li>
          <li>
            OpenRouter: AI requests, including Chat content. Some model providers reached through OpenRouter may log or use request content,
            including for training, under their own terms.
          </li>
          <li>BigDataCloud: only when you use the location button.</li>
        </List>
        <P>
          <strong>Public data sources we read for trends</strong> (we send no personal data to them): Google Trends, YouTube, GDELT, Google
          News, newsdata.io, news publishers, Wikipedia, GitHub, PubMed (Health &amp; Wellness), football-data.org, Open Food Facts, and
          {PINTEREST_INTEGRATION_LIVE ? ' the Pinterest Trends API' : ', once its integration is live, the Pinterest Trends API'} (see section
          6).
        </P>
        <P>We do not sell your personal data.</P>
      </>
    ),
  },
  {
    id: 'pinterest',
    title: 'Pinterest Trends API',
    content: (
      <>
        <P>
          {PINTEREST_INTEGRATION_LIVE
            ? 'Elias uses the Pinterest Trends API as one source of trend signals. This section explains exactly what the integration involves.'
            : 'Elias is integrating the Pinterest Trends API as one source of trend signals. Until that integration is live, Elias reads no data from Pinterest. This section explains exactly what the integration involves.'}
        </P>
        <List>
          <li>
            <strong>What we read:</strong> top trending search keywords for a region, optionally filtered by interest category, with growth
            percentages and relative search volume. This is aggregated trend information, not personal data.
          </li>
          <li>
            <strong>What we do not do:</strong> we do not read, create, edit, or delete any Pins or boards. We do not post on behalf of anyone.
            We do not access Pinterest user profiles or content. Elias users are never asked to connect or sign in with a Pinterest account.
          </li>
          <li>
            <strong>Authentication:</strong> Elias accesses the API with its own app credentials through Pinterest&rsquo;s OAuth 2.0 flow.
            Credentials and tokens are kept on the server side only.
          </li>
          <li>
            <strong>Storage:</strong> we do not store raw responses from the Pinterest API and we do not build historical datasets from it.
            Trend information is used to produce the current day&rsquo;s recommendations.
          </li>
          <li>
            <strong>No affiliation:</strong> Elias is not affiliated with, sponsored by, or endorsed by Pinterest. Pinterest is a trademark of
            Pinterest, Inc.
          </li>
        </List>
      </>
    ),
  },
  {
    id: 'retention',
    title: 'How long we keep data',
    content: (
      <List>
        <li>Account and profile: until you delete your account.</li>
        <li>AI request logs: 30 days.</li>
        <li>Chat conversations: 30 days after the last message, or sooner if you delete them.</li>
        <li>Temporary analysis results: until midnight Western Indonesia Time (WIB).</li>
        <li>Archive: in your browser until you delete it or clear your browser data.</li>
      </List>
    ),
  },
  {
    id: 'deletion',
    title: 'Deleting your account',
    content: <P>You can delete your account from the Profile page. Deleting it ends processing of your account and profile data.</P>,
  },
  {
    id: 'rights',
    title: 'Your rights',
    content: (
      <>
        <P>Under Indonesia&rsquo;s Personal Data Protection Law (UU PDP, Law No. 27 of 2022) you can:</P>
        <List>
          <li>ask how your data is processed;</li>
          <li>update or correct your data, on the Profile page;</li>
          <li>access your personal data and get a copy;</li>
          <li>end processing and have your data deleted;</li>
          <li>withdraw consent.</li>
        </List>
        <P>For other requests, email {email} from your account address.</P>
      </>
    ),
  },
  {
    id: 'security',
    title: 'Security',
    content: (
      <P>
        We use reasonable technical and organisational measures to protect your data, including hashed password storage through Supabase
        Auth and encrypted connections (HTTPS). No online service can guarantee absolute security.
      </P>
    ),
  },
  {
    id: 'cookies',
    title: 'Cookies',
    content: (
      <P>
        Elias uses only strictly necessary cookies and browser storage, with no analytics, advertising, or third-party tracking. See the
        Cookie Policy (Indonesian) at{' '}
        <Link href="/cookies" className="font-semibold text-primary hover:underline">
          /cookies
        </Link>
        .
      </P>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    content: (
      <P>
        We may update this policy. The &ldquo;Last updated&rdquo; date shows the latest version. If a change significantly affects how we
        use your data, we will tell you in the app.
      </P>
    ),
  },
  {
    id: 'contact',
    title: 'Contact',
    content: (
      <P>
        {LEGAL_OPERATOR}, Yogyakarta, Indonesia
        <br />
        Email: {email}
        <br />
        Instagram: {instagram}
      </P>
    ),
  },
];

/** The page body: title, date and the 13 numbered sections, in the legal pages' style. */
export function PrivacyEn() {
  return (
    <div lang="en" data-animate="page-item" className="flex max-w-3xl flex-col gap-8 pb-10 md:gap-10">
      <header className="flex flex-col gap-3">
        <p className="font-mono text-xs font-bold tracking-wide text-gray-600 uppercase">Legal</p>
        <h1 className="text-2xl font-bold md:text-display-sm laptop:text-display-md">{privacyEnTitle}</h1>
        <p className="font-mono text-xs text-disabled-content uppercase">Last updated: {LEGAL_EFFECTIVE_DATE}</p>
      </header>
      <div className="flex flex-col">
        {sections.map((section, i) => (
          <section
            key={section.id}
            id={section.id}
            aria-labelledby={`${section.id}-title`}
            className="flex scroll-mt-28 flex-col gap-4 border-t border-disabled-surface py-8 first:border-t-0 first:pt-0"
          >
            <h2 id={`${section.id}-title`} className="flex items-baseline gap-3 text-xl font-bold">
              <span className="font-mono text-sm text-primary">{String(i + 1).padStart(2, '0')}</span>
              {section.title}
            </h2>
            {section.content}
          </section>
        ))}
      </div>
    </div>
  );
}
