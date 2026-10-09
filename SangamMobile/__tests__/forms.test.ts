import { blank, fieldError, submission, validateSection } from '../src/forms';

describe('registration validation and backend payload', () => {
  test('validates contact information before continuing', () => {
    const section = {
      fields: [
        {
          key: 'familyHeadName',
          label: 'Family head',
          type: 'text',
          required: true,
        },
        { key: 'phoneNumber', label: 'Mobile', type: 'phone', required: true },
      ],
    };
    expect(
      validateSection(section, { familyHeadName: '', phoneNumber: '123' }),
    ).toMatch('Family head');
    expect(
      validateSection(section, {
        familyHeadName: 'Example',
        phoneNumber: '123',
      }),
    ).toMatch('10-digit');
    expect(
      validateSection(section, {
        familyHeadName: 'Example',
        phoneNumber: '+91 9876543210',
      }),
    ).toBe('');
  });
  test('rural location requires all parent IDs while urban needs a town and PIN', () => {
    const f = { key: 'district', type: 'location', required: true };
    const v = {
      ...blank(),
      districtId: 'district',
      villageName: 'Example',
      postalCode: '600001',
    };
    expect(fieldError(f, v)).toMatch('district');
    expect(
      fieldError(f, {
        ...v,
        blockId: 'block',
        villagePanchayatId: 'panchayat',
        habitationId: 'hamlet',
      }),
    ).toBe('');
    expect(fieldError(f, { ...v, settlementType: 'Urban' })).toBe('');
    expect(
      fieldError(f, { ...v, settlementType: 'Urban', postalCode: '000000' }),
    ).not.toBe('');
  });
  test('validates all family members, ages, phones, and conditional work location', () => {
    const f = { key: 'members', type: 'members' };
    expect(fieldError(f, { members: [{ name: 'One', age: '121' }] })).toMatch(
      '120',
    );
    expect(
      fieldError(f, {
        members: [{ name: 'One', age: '30', occupation: 'Private employee' }],
      }),
    ).toMatch('work location');
    expect(
      fieldError(f, {
        members: [
          {
            name: 'One',
            age: '30',
            occupation: 'Private employee',
            workLocation: 'Chennai',
          },
        ],
      }),
    ).toBe('');
  });
  test('support and contributions require a category and details only when enabled', () => {
    expect(
      fieldError(
        { key: 'support', type: 'support' },
        { support: { needed: false } },
      ),
    ).toBe('');
    expect(
      fieldError(
        { key: 'support', type: 'support' },
        { support: { needed: true, categories: [], details: 'Help' } },
      ),
    ).toMatch('category');
    expect(
      fieldError(
        { key: 'contribution', type: 'contribution' },
        {
          contribution: {
            willing: true,
            categories: ['Volunteer time'],
            details: 'Weekends',
          },
        },
      ),
    ).toBe('');
  });
  test('handles dynamic required fields, multi-select, hidden fields and invalid dates', () => {
    const section = {
      fields: [
        { key: 'hidden', label: 'Hidden', required: true, visible: false },
        {
          key: 'custom',
          label: 'Benefits',
          type: 'checkbox-group',
          required: true,
        },
      ],
    };
    expect(validateSection(section, { custom: [] })).toMatch('Benefits');
    expect(validateSection(section, { custom: ['Pension'] })).toBe('');
    expect(
      fieldError(
        { key: 'date', label: 'Date', type: 'date' },
        { date: '2026-99-99' },
      ),
    ).toMatch('YYYY-MM-DD');
  });
  test('includes community scope and omits location defaults when no location field exists', () => {
    const community = { _id: 'id', slug: 'example' };
    const result = submission(blank(), community, []);
    expect(result.communityId).toBe('id');
    expect(result.communitySlug).toBe('example');
    expect(result.stateCode).toBeUndefined();
    expect(
      submission(blank(), community, [{ fields: [{ type: 'location' }] }])
        .stateCode,
    ).toBe('TN');
  });
});
