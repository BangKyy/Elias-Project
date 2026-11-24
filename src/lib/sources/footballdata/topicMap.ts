// Curated map from Sports trend words to football-data.org competitions
// (docs/MVP.md, football-data.org). Competition level only: team names in the
// API often differ from what Indonesian audiences say, so teams are never
// matched. Only the 12 free-plan competitions, none of them Indonesian: a
// trend about Liga 1 or the national team gets no line. No imports:
// scripts/football.test.mjs runs this file directly.
//
// Words are matched whole. Deliberately absent: a bare "euro" (the currency),
// a bare "championship" (any sport's), and "serie a" for Brazil (Italy's).

export type FootballTopic = {
  /** Trend tags or words that select this competition, lowercase */
  match: string[];
  /** How the competition is named in the line */
  name: string;
};

export const FOOTBALL_TOPICS = {
  CL: { match: ['liga champions', 'champions league', 'ucl'], name: 'Liga Champions' },
  PL: { match: ['liga inggris', 'premier league', 'epl'], name: 'Liga Inggris' },
  ELC: { match: ['efl championship', 'championship inggris'], name: 'Championship Inggris' },
  BL1: { match: ['bundesliga', 'liga jerman'], name: 'Bundesliga' },
  SA: { match: ['serie a', 'liga italia'], name: 'Serie A' },
  PD: { match: ['la liga', 'laliga', 'liga spanyol'], name: 'La Liga' },
  FL1: { match: ['ligue 1', 'liga prancis'], name: 'Ligue 1' },
  DED: { match: ['eredivisie', 'liga belanda'], name: 'Eredivisie' },
  PPL: { match: ['liga portugal', 'primeira liga'], name: 'Liga Portugal' },
  BSA: { match: ['liga brasil', 'brasileirao', 'brasileirão'], name: 'Liga Brasil' },
  WC: { match: ['piala dunia', 'world cup'], name: 'Piala Dunia' },
  EC: { match: ['piala eropa', 'kejuaraan eropa', 'euro 2028'], name: 'Piala Eropa' },
} satisfies Record<string, FootballTopic>;

export type CompetitionCode = keyof typeof FOOTBALL_TOPICS;
