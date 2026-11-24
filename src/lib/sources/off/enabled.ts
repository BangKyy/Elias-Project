/**
 * Open Food Facts on Food & Beverage cards and in the legal attribution. Off
 * until the legal checklist in docs/MVP.md passes (ODbL share-alike,
 * commercial use). Server only.
 */
export const offEnabled = () => process.env.SOURCE_OFF_ENABLED === 'true';
