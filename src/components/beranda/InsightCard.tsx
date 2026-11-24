import { Barcode, BookOpenText, Clock, LockSimple } from '@phosphor-icons/react/dist/ssr';
import { archetypeDirections } from '@/lib/archetypes';
import { creativeRoleLabels, type CreativeRole } from '@/lib/creativeRoles';
import { formatDate } from '@/lib/dates';
import type { BrandContext } from '@/lib/elias/types';
import { cardSources, sources, type Evidence, type Insight } from '@/lib/insights/types';
import MotionText from '../motion/MotionText';
import ScrollReveal from '../motion/ScrollReveal';
import EliasTrendCard from './EliasTrendCard';
import EvidenceSection from './EvidenceSection';
import SaveButton from './SaveButton';
import AskEliasLink from '../chat/AskEliasLink';
import { chatEnabled } from '@/lib/chatFeature';
import SourceChip, { leadFigure } from './SourceChip';
import VerdictTab from './VerdictTab';

/** Who the card is written for. Null renders the generic guest card (BR-4). */
export type Flavour = { role: CreativeRole; archetype: string | null; brand: BrandContext } | null;

const sectionLabel = 'font-mono text-xs text-disabled-content uppercase';
const tag = 'flex h-[27px] items-center bg-primary-tint px-3 font-mono text-xs font-medium text-primary uppercase';

const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * "Jeyma Monica Official · 206.679 views · baru masuk chart sejak 12 Nov" as a
 * chip: the channel or outlet on top, each figure on its own line. A source
 * with no figures shows its title instead.
 */
function EvidenceChip({ item }: { item: Evidence }) {
  const [label, ...facts] = item.detail.split(' · ');
  const lines = facts.length
    ? facts.map((fact) => leadFigure(capitalise(fact.replace(/\bviews\b/g, 'penonton'))))
    : [item.title];
  return <SourceChip href={item.url} label={label || item.title} lines={lines} title={item.title} className="w-full" />;
}

/**
 * The archetype only changes the recommended output, never Elias's voice or
 * the insight itself (V4). A skip stays a skip whatever the archetype.
 */
function ArchetypeBlock({ insight, archetype }: { insight: Insight; archetype: string }) {
  const entry = archetypeDirections[archetype];
  if (!entry) return null;
  return (
    <section data-reveal className="flex flex-col gap-1.5" aria-label={`Archetype ${entry.name}`}>
      <h3 className={sectionLabel}>
        Archetype brand <strong className="font-bold">{entry.name}</strong>
      </h3>
      <p className="text-md">
        {insight.verdict === 'skip' ? (
          <>
            Rekomendasi tetap <strong>lewati</strong>. Insight-nya sama seperti brand lain.
          </>
        ) : (
          `${capitalise(entry.direction)} Insight-nya sama seperti brand lain.`
        )}
      </p>
    </section>
  );
}

export default function InsightCard({ insight, flavour }: { insight: Insight; flavour: Flavour }) {
  return (
    <ScrollReveal>
      <article className="relative flex flex-col gap-6 rounded-xl bg-bg-white px-5 pt-16 pb-5 shadow-card md:px-8 md:pt-[72px] md:pb-8">
        <div data-reveal className="absolute top-5 -left-2 flex max-w-[calc(100%+0.5rem)] items-start gap-2.5">
          <VerdictTab verdict={insight.verdict} />
          <ul aria-label="Sumber dan kategori" className="flex min-w-0 flex-wrap gap-[5px]">
            {cardSources(insight).map((source) => (
              <li key={source} className={tag}>
                {sources[source].label}
              </li>
            ))}
            <li className={tag}>{insight.category}</li>
          </ul>
        </div>

        <MotionText as="h2" effect="fill" text={insight.signal} className="text-xl font-semibold md:text-2xl" />

        <div className="flex flex-col gap-3">
          <section data-reveal className="flex flex-col gap-1.5" aria-label="Mengapa penting">
            <h3 className={sectionLabel}>Mengapa topik ini penting untuk brand kamu?</h3>
            <p className="text-md">{insight.whyItMatters}</p>
            {insight.lifecycle && (
              <p className="flex items-center gap-1.5 text-sm text-neutral-700">
                <Clock size={16} aria-hidden className="shrink-0 text-gray-600" />
                {insight.lifecycle}
              </p>
            )}
            {flavour && insight.offContext && (
              <p className="flex items-start gap-1.5 text-sm text-neutral-700">
                <Barcode size={16} aria-hidden className="mt-0.5 shrink-0 text-gray-600" />
                {insight.offContext.line}
              </p>
            )}
            {flavour && insight.pubmedContext && (
              <p className="flex items-start gap-1.5 text-sm text-neutral-700">
                <BookOpenText size={16} aria-hidden className="mt-0.5 shrink-0 text-gray-600" />
                {insight.pubmedContext.line}
              </p>
            )}
          </section>

          {insight.evidence && insight.evidence.length > 0 && (
            <EvidenceSection labelClassName={sectionLabel}>
              {/* Equal columns, as many as fit at 10.5rem (three in a laptop card); every chip in a row takes the tallest one's height */}
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,10.5rem),1fr))] gap-2.5">
                {insight.evidence.map((item) => (
                  <li key={item.url} className="flex min-w-0">
                    <EvidenceChip item={item} />
                  </li>
                ))}
              </ul>
              {/* ODbL attribution, only where an Open Food Facts line is shown: OFF is never a claimed source (BR-5) */}
              {flavour && insight.offContext && (
                <p className="mt-2.5 text-xs text-gray-600">
                  Berisi data dari{' '}
                  <a href="https://world.openfoodfacts.org" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">
                    Open Food Facts
                  </a>
                  , tersedia di bawah{' '}
                  <a
                    href="https://opendatacommons.org/licenses/odbl/1-0/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-primary"
                  >
                    Open Database License
                  </a>
                  .
                </p>
              )}
              {/* NLM attribution, only where a PubMed line is shown; no endorsement implied (BR-5) */}
              {flavour && insight.pubmedContext && (
                <p className="mt-2.5 text-xs text-gray-600">
                  Dari{' '}
                  <a href="https://pubmed.ncbi.nlm.nih.gov/" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">
                    MEDLINE®/PubMed®
                  </a>
                  , basis data National Library of Medicine AS.
                </p>
              )}
            </EvidenceSection>
          )}

          <div data-reveal className="my-1 h-px bg-disabled-surface" />

          {flavour ? (
            <>
              <section data-reveal className="flex flex-col gap-1.5" aria-label={`Rekomendasi untuk ${creativeRoleLabels[flavour.role]}`}>
                <h3 className={sectionLabel}>
                  Untuk kamu sebagai <strong className="font-bold">{creativeRoleLabels[flavour.role]}</strong>
                </h3>
                <p className="text-md">{insight.recommendations[flavour.role]}</p>
              </section>
              {flavour.archetype && <ArchetypeBlock insight={insight} archetype={flavour.archetype} />}
            </>
          ) : (
            <p data-reveal className="flex items-start gap-2 text-sm text-gray-600">
              <LockSimple size={18} aria-hidden className="mt-px shrink-0" />
              Rekomendasi per peran dan archetype muncul setelah <strong>profil brand dibuat</strong>.
            </p>
          )}
        </div>

        {flavour && (
          <div data-reveal>
            <EliasTrendCard insight={insight} brandContext={flavour.brand} userRole={flavour.role} />
          </div>
        )}

        <div data-reveal className="mt-auto flex flex-wrap items-center justify-between gap-2.5">
          <p className="text-xs text-disabled-content">
            Teramati <time dateTime={insight.observedOn}>{formatDate(insight.observedOn, { year: undefined })}</time>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {/* Chat is for signed-in users only (MVP 7): flavour is null for guests */}
            {flavour && chatEnabled && <AskEliasLink insightId={insight.id} />}
            <SaveButton insight={insight} />
          </div>
        </div>
      </article>
    </ScrollReveal>
  );
}
