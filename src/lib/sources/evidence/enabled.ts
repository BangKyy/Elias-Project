/**
 * PubMed on Health & Wellness cards and in the legal attribution. Off until
 * the checklist in docs/MVP.md passes (NLM terms, BPOM health-claim rules,
 * NCBI registration). Server only.
 */
export const pubmedEnabled = () => process.env.SOURCE_PUBMED_ENABLED === 'true';
