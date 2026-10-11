import {
  ADMINISTRATIVE_TYPES,
  REGISTRATION_STATE,
  isRuralAdministration,
} from './registrationConfig';
export const WORKING = [
  'Government employee',
  'Private employee',
  'Salaried employee',
  'Self-employed',
  'Farmer',
  'Business owner',
  'Daily wage worker',
];
export const SUPPORT = [
  'Education',
  'Healthcare',
  'Employment',
  'Marriage arrangement',
  'Food & essentials',
  'Housing',
  'Elder care',
  'Disability support',
  'Other',
];
export const CONTRIBUTIONS = [
  'Volunteer time',
  'Teaching & mentoring',
  'Professional skills',
  'Job opportunities',
  'Marriage arrangement',
  'Food & supplies',
  'Financial support',
  'Other',
];
export const blank = () => ({
  state: REGISTRATION_STATE.name,
  stateCode: REGISTRATION_STATE.code,
  localBody: 'Village Panchayat',
  settlementType: 'Rural',
  members: [{ name: '', relationship: 'Self', age: '' }],
  support: { needed: false, categories: [], priority: 'Routine', details: '' },
  contribution: { willing: false, categories: [], details: '' },
  pitagaiName: '',
  consent: false,
});
export const fieldsOf = (section: any) =>
  (section?.fields || [])
    .filter(
      (f: any) =>
        f.visible !== false &&
        ![
          'taluk',
          'talukCode',
          'talukChoiceId',
          'streetArea',
          'streetChoiceId',
        ].includes(f.key),
    )
    .sort((a: any, b: any) => a.order - b.order);
export const sectionsOf = (form: any) =>
  (form?.sections || [])
    .filter((s: any) => s.enabled !== false)
    .sort((a: any, b: any) => a.order - b.order);
export const validPhone = (v: any) =>
  !v || /^(?:\+?91(?: |-)?)?[6-9][0-9]{9}$/.test(String(v).trim());
export function fieldError(f: any, v: any): string {
  const value = v[f.key];
  if (f.type === 'location') {
    if (v.localBody && !ADMINISTRATIVE_TYPES.includes(v.localBody))
      return 'Select a valid administrative type.';
    if (v.wardNumber && !/^[1-9]\d{0,2}$/.test(v.wardNumber))
      return 'Enter a ward number from 1 to 999, or leave it blank.';
    if (
      f.required &&
      !(
        v.stateCode &&
        v.districtId &&
        v.villageName &&
        /^[1-9]\d{5}$/.test(v.postalCode || '') &&
        ((v.localBody
          ? !isRuralAdministration(v.localBody)
          : v.settlementType === 'Urban') ||
          (v.blockId && v.villagePanchayatId && v.habitationId))
      )
    )
      return 'Complete your district, city / village, required location lists and 6-digit PIN code.';
    return '';
  }
  if (f.key === 'members' || f.type === 'members') {
    if (!value?.length) return 'Add at least one family member.';
    for (let i = 0; i < value.length; i++) {
      const m = value[i];
      if (!(m.name || m.nameAddress)?.trim())
        return `Enter the name of member ${i + 1}.`;
      if (
        m.age !== '' &&
        m.age != null &&
        (!Number.isInteger(Number(m.age)) ||
          Number(m.age) < 0 ||
          Number(m.age) > 120)
      )
        return `Member ${i + 1}: age must be a whole number from 0 to 120.`;
      if (!validPhone(m.phoneNumber))
        return `Member ${i + 1}: enter a valid Indian mobile number.`;
      if (WORKING.includes(m.occupation) && !m.workLocation?.trim())
        return `Enter the work location for member ${i + 1}.`;
    }
    return '';
  }
  if (['support', 'contribution'].includes(f.type)) {
    if (
      value?.[f.type === 'support' ? 'needed' : 'willing'] &&
      (!value.categories?.length || !value.details?.trim())
    )
      return 'Choose at least one category and enter the details.';
    return '';
  }
  if (
    f.required &&
    (f.type === 'checkbox'
      ? value !== true
      : Array.isArray(value)
      ? !value.length
      : !String(value ?? '').trim())
  )
    return `Complete ${f.label}.`;
  if (f.type === 'phone' && !validPhone(value))
    return `${f.label}: enter a 10-digit Indian mobile number beginning with 6–9. +91 is optional.`;
  if (f.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
    return 'Enter a valid email address.';
  if (
    f.type === 'number' &&
    value !== '' &&
    value != null &&
    (!Number.isInteger(Number(value)) || Number(value) < 0)
  )
    return `${f.label}: enter a non-negative whole number.`;
  if (
    f.type === 'date' &&
    value &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isFinite(Date.parse(value)) ||
      new Date(value).toISOString().slice(0, 10) !== value)
  )
    return `${f.label}: enter a date as YYYY-MM-DD.`;
  return '';
}
export function validateSection(section: any, values: any) {
  for (const f of fieldsOf(section)) {
    const err = fieldError(f, values);
    if (err) return err;
  }
  return '';
}
export function submission(values: any, community: any, sections: any[]) {
  const hasLocation = sections.some(s =>
    fieldsOf(s).some((f: any) => f.type === 'location'),
  );
  const hasPidagaiField = sections.some(s =>
    fieldsOf(s).some((f: any) => f.key === 'pitagaiName'),
  );
  const result = {
    ...values,
    // The live form does not yet publish pitagaiName. Preserve the entered
    // value in its accepted address field as well, including PDF receipts.
    ...(!hasPidagaiField && values.pitagaiName?.trim()
      ? {
          address: `${
            values.address || ''
          }\nPidagai: ${values.pitagaiName.trim()}`.trim(),
        }
      : {}),
    ...(hasLocation
      ? {
          state: REGISTRATION_STATE.name,
          stateCode: REGISTRATION_STATE.code,
          settlementType: isRuralAdministration(
            values.localBody || 'Village Panchayat',
          )
            ? 'Rural'
            : 'Urban',
        }
      : {}),
    communitySlug: community.slug,
    communityId: community._id,
  };
  for (const key of [
    'taluk',
    'talukCode',
    'talukChoiceId',
    'streetArea',
    'streetChoiceId',
  ])
    delete result[key];
  result.locationMissing = (result.locationMissing || []).filter(
    (key: string) => !['taluk', 'street'].includes(key),
  );
  delete result.postOffice;
  delete result.postOfficeId;
  delete result.postOfficeSourceKey;
  if (
    !sections.some(s => fieldsOf(s).some((f: any) => f.type === 'location'))
  ) {
    delete result.state;
    delete result.stateCode;
    delete result.settlementType;
    delete result.localBody;
  }
  return result;
}
export const titleOf = (s: string) =>
  s
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/^./, c => c.toUpperCase());
export const display = (v: any): string =>
  v == null || v === ''
    ? 'Not provided'
    : typeof v === 'boolean'
    ? v
      ? 'Yes'
      : 'No'
    : Array.isArray(v)
    ? v.map(display).join(', ') || 'None'
    : typeof v === 'object'
    ? Object.entries(v)
        .filter(([k]) => k !== '_id')
        .map(([k, x]) => `${titleOf(k)}: ${display(x)}`)
        .join('\n')
    : String(v);
