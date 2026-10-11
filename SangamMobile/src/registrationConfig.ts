// Change these settings when preparing an app for another community.
export const REGISTRATION_COMMUNITY = {
  slug: 'krishnan-community',
  name: 'Krishnavaha',
};
export const REGISTRATION_STATE = { code: 'TN', name: 'Tamil Nadu' };
export const ADMINISTRATIVE_TYPES = [
  'Village Panchayat',
  'Town Panchayat',
  'Municipality',
  'Corporation',
];
export const isRuralAdministration = (type: string) =>
  type === 'Village Panchayat';
export const communityDisplayName = (community: any) =>
  community?.slug === REGISTRATION_COMMUNITY.slug
    ? REGISTRATION_COMMUNITY.name
    : community?.name;
