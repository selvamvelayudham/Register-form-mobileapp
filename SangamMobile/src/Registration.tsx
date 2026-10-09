import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { api, download } from './api';
import {
  blank,
  CONTRIBUTIONS,
  display,
  fieldsOf,
  sectionsOf,
  SUPPORT,
  submission,
  titleOf,
  validateSection,
  WORKING,
} from './forms';
import { Button, Check, ErrorBox, Input, Loading, s } from './ui';
import LocationFields from './LocationFields';
import {
  REGISTRATION_COMMUNITY,
  communityDisplayName,
} from './registrationConfig';
const memberOptions: any = {
  relationship: [
    'Self',
    'Spouse',
    'Son',
    'Daughter',
    'Father',
    'Mother',
    'Brother',
    'Sister',
    'Grandparent',
    'Other',
  ],
  gender: ['Female', 'Male', 'Other', 'Prefer not to say'],
  maritalStatus: [
    'Single',
    'Married',
    'Widowed',
    'Separated',
    'Prefer not to say',
  ],
  education: [
    'Not applicable',
    'No formal education',
    'Primary school',
    'Secondary school',
    'Higher secondary',
    'Diploma',
    'Undergraduate',
    'Postgraduate',
    'Doctorate',
    'Other',
  ],
  occupation: [
    'Student',
    'Government employee',
    'Private employee',
    'Salaried employee',
    'Self-employed',
    'Business owner',
    'Daily wage worker',
    'Farmer',
    'Homemaker',
    'Retired',
    'Seeking work',
    'Not employed',
    'Other',
  ],
  skills: [
    'Not specified',
    'Teaching',
    'Technical work',
    'Healthcare',
    'Business',
    'Skilled trades',
    'Driving',
    'Agriculture',
    'Arts and crafts',
    'Sports',
    'Other',
  ],
};
export function RegistrationField({
  field: f,
  values: v,
  change,
  slug,
  disabled = false,
}: any) {
  if (f.type === 'location')
    return (
      <LocationFields
        values={v}
        change={change}
        slug={slug}
        disabled={disabled}
      />
    );
  if (f.key === 'members' || f.type === 'members') {
    const members = v[f.key] || [];
    const update = (i: number, k: string, x: any) =>
      change({
        [f.key]: members.map((m: any, n: number) =>
          n === i
            ? {
                ...m,
                [k]: x,
                ...(k === 'occupation' && !WORKING.includes(x)
                  ? { workLocation: '' }
                  : {}),
              }
            : m,
        ),
      });
    return (
      <View style={{ gap: 16 }}>
        {members.map((m: any, i: number) => (
          <View style={s.card} key={i}>
            <View style={s.between}>
              <Text style={[s.h2, { flex: 1 }]}>
                {String(i + 1).padStart(2, '0')} ·{' '}
                {m.name || `Family member ${i + 1}`}
              </Text>
              {members.length > 1 && (
                <Button
                  title="Remove"
                  secondary
                  disabled={disabled}
                  onPress={() =>
                    Alert.alert(
                      'Remove family member?',
                      m.name || `Member ${i + 1}`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Remove',
                          style: 'destructive',
                          onPress: () =>
                            change({
                              [f.key]: members.filter(
                                (_: any, n: number) => i !== n,
                              ),
                            }),
                        },
                      ],
                    )
                  }
                />
              )}
            </View>
            <Input
              label="Full name"
              required
              value={m.name || m.nameAddress}
              disabled={disabled}
              onChange={(x: string) => update(i, 'name', x)}
            />
            <Input
              label="Relationship to family head"
              type="select"
              options={memberOptions.relationship}
              value={m.relationship}
              disabled={disabled}
              onChange={(x: string) => update(i, 'relationship', x)}
            />
            <Input
              label="Age (years)"
              type="number"
              value={m.age}
              disabled={disabled}
              helpText="Whole number from 0 to 120."
              onChange={(x: string) => update(i, 'age', x)}
            />
            {['gender', 'maritalStatus', 'education', 'occupation'].map(k => (
              <Input
                key={k}
                label={titleOf(k)}
                type="select"
                options={memberOptions[k]}
                disabled={disabled}
                value={m[k]}
                onChange={(x: string) => update(i, k, x)}
              />
            ))}
            {WORKING.includes(m.occupation) && (
              <Input
                label="Place of work / work location"
                required
                value={m.workLocation}
                disabled={disabled}
                onChange={(x: string) => update(i, 'workLocation', x)}
              />
            )}
            <Input
              label="Mobile number (optional)"
              type="phone"
              value={m.phoneNumber}
              disabled={disabled}
              onChange={(x: string) => update(i, 'phoneNumber', x)}
            />
            <Input
              label="Skills and interests"
              type="select"
              options={memberOptions.skills}
              value={m.skills}
              disabled={disabled}
              onChange={(x: string) => update(i, 'skills', x)}
            />
          </View>
        ))}
        <Button
          title="+ Add another family member"
          secondary
          disabled={disabled || members.length >= 100}
          onPress={() =>
            change({
              [f.key]: [...members, { name: '', relationship: '', age: '' }],
            })
          }
        />
      </View>
    );
  }
  if (['support', 'contribution'].includes(f.type)) {
    const support = f.type === 'support',
      flag = support ? 'needed' : 'willing',
      value = v[f.key] || { [flag]: false, categories: [] };
    const update = (patch: any) => change({ [f.key]: { ...value, ...patch } });
    return (
      <View>
        <Input
          label={
            support
              ? 'Does your family need community support?'
              : 'Would you like to contribute to the community?'
          }
          type="select"
          options={['Yes', 'No']}
          value={value[flag] ? 'Yes' : 'No'}
          disabled={disabled}
          onChange={(x: string) =>
            change({
              [f.key]:
                x === 'Yes'
                  ? { ...value, [flag]: true }
                  : {
                      [flag]: false,
                      categories: [],
                      details: '',
                      priority: 'Routine',
                    },
            })
          }
        />
        {value[flag] && (
          <>
            <Input
              label={support ? 'Support categories' : 'Contribution categories'}
              required
              type="checkbox-group"
              options={support ? SUPPORT : CONTRIBUTIONS}
              value={value.categories}
              disabled={disabled}
              onChange={(x: string[]) => update({ categories: x })}
            />
            {support ? (
              <Input
                label="Priority"
                type="select"
                options={['Routine', 'Soon', 'Urgent']}
                value={value.priority || 'Routine'}
                disabled={disabled}
                onChange={(x: string) => update({ priority: x })}
              />
            ) : (
              <>
                <Input
                  label="Skill / resource"
                  type="select"
                  options={[
                    'Teaching',
                    'Healthcare',
                    'Technical work',
                    'Business guidance',
                    'Skilled trades',
                    'Driving',
                    'Food and supplies',
                    'Financial support',
                    'Other',
                  ]}
                  value={value.skills}
                  disabled={disabled}
                  onChange={(x: string) => update({ skills: x })}
                />
                <Input
                  label="Availability"
                  type="select"
                  options={[
                    'Weekdays',
                    'Weekends',
                    'Evenings',
                    'Once a month',
                    'On request',
                  ]}
                  value={value.availability}
                  disabled={disabled}
                  onChange={(x: string) => update({ availability: x })}
                />
              </>
            )}
            <Input
              label={support ? 'Request details' : 'Contribution details'}
              type="textarea"
              required
              value={value.details}
              disabled={disabled}
              onChange={(x: string) => update({ details: x })}
            />
          </>
        )}
        <Text style={s.muted}>
          {support
            ? 'Requests are reviewed by your community team.'
            : 'This records your interest in contributing. No payment is taken through this form.'}
        </Text>
      </View>
    );
  }
  const inputProps = Object.fromEntries(
    Object.entries(f).filter(([key]) => key !== 'key'),
  );
  return (
    <Input
      {...inputProps}
      value={v[f.key]}
      disabled={disabled}
      onChange={(x: any) => change({ [f.key]: x })}
    />
  );
}
export function RecordDetails({ record }: any) {
  const groups: any = {
    'Primary information': [
      'familyHeadName',
      'phoneNumber',
      'alternatePhone',
      'email',
      'familyType',
      'preferredContact',
    ],
    'Residential information': [
      'address',
      'state',
      'district',
      'localBody',
      'taluk',
      'block',
      'villagePanchayat',
      'villagePanchayatNameTamil',
      'villageName',
      'habitation',
      'wardNumber',
      'streetArea',
      'postalCode',
      'postOffice',
    ],
    'Household information': [
      'housingType',
      'familyAnnualIncome',
      'mainOccupation',
      'governmentSchemes',
      'accessibilityNeeds',
      'householdNotes',
    ],
    'Community support': ['support'],
    Contributions: ['contribution'],
    'Additional community information': ['customData'],
  };
  return (
    <View style={{ gap: 18 }}>
      {Object.entries(groups).map(([title, keys]: any) => (
        <View key={title} style={s.card}>
          <Text style={s.h2}>{title}</Text>
          {keys
            .filter((k: string) => record[k] != null && record[k] !== '')
            .map((k: string) => (
              <View key={k}>
                <Text style={s.muted}>{titleOf(k)}</Text>
                <Text selectable style={s.text}>
                  {display(record[k])}
                </Text>
              </View>
            ))}
        </View>
      ))}
      <View style={s.card}>
        <Text style={s.h2}>Family members ({record.members?.length || 0})</Text>
        {(record.members || []).map((m: any, i: number) => (
          <View key={i}>
            <Text style={s.label}>
              {i + 1}. {m.name || m.nameAddress}
            </Text>
            <Text selectable style={s.text}>
              {display(
                Object.fromEntries(
                  Object.entries(m).filter(
                    ([k]) =>
                      ![
                        '_id',
                        'communityId',
                        'serialNumber',
                        'name',
                        'nameAddress',
                      ].includes(k),
                  ),
                ),
              )}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
export default function Registration({
  onAdmin,
  previewForm,
  previewCommunity,
}: any) {
  const slug = previewCommunity?.slug || REGISTRATION_COMMUNITY.slug;
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [retry, setRetry] = useState(0),
    [values, setValues] = useState<any>(blank),
    [step, setStep] = useState(0),
    [busy, setBusy] = useState(false),
    [receipt, setReceipt] = useState<any>(null),
    [saving, setSaving] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const preview = Boolean(previewForm);
  useEffect(() => {
    if (preview) {
      setData({ community: previewCommunity, form: previewForm });
      setLoading(false);
      return;
    }
    const c = new AbortController();
    setLoading(true);
    setError('');
    setData(null);
    api(
      `/communities/public/${encodeURIComponent(slug)}`,
      {},
      'GET',
      undefined,
      c.signal,
    )
      .then(result =>
        setData({
          ...result,
          community: {
            ...result.community,
            name: communityDisplayName(result.community),
          },
        }),
      )
      .catch(err => {
        if (!c.signal.aborted) setError(err.message);
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [slug, retry, preview, previewForm, previewCommunity]);
  const sections = sectionsOf(data?.form),
    section = sections[step];
  const change = useCallback(
    (patch: any) => setValues((old: any) => ({ ...old, ...patch })),
    [],
  );
  const go = (i: number) => {
    setStep(i);
    scroll.current?.scrollTo({ y: 0, animated: true });
  };
  const validate = () => {
    const e = section ? validateSection(section, values) : '';
    if (e) Alert.alert('Check your information', e);
    return !e;
  };
  const submit = async () => {
    if (!validate()) return;
    if (step < sections.length) {
      go(step + 1);
      return;
    }
    for (let i = 0; i < sections.length; i++) {
      const e = validateSection(sections[i], values);
      if (e) {
        go(i);
        Alert.alert('Check your information', e);
        return;
      }
    }
    if (!values.consent) {
      Alert.alert(
        'Consent required',
        'Confirm that your details are accurate before submitting.',
      );
      return;
    }
    if (preview) {
      Alert.alert('Preview only', 'Submissions are disabled in preview.');
      return;
    }
    setBusy(true);
    try {
      const saved = await api(
        '/families',
        {},
        'POST',
        submission(values, data.community, sections),
      );
      setReceipt(saved);
      scroll.current?.scrollTo({ y: 0, animated: true });
    } catch (err: any) {
      Alert.alert('Could not submit', err.message);
    } finally {
      setBusy(false);
    }
  };
  const pdf = async () => {
    setSaving(true);
    try {
      await download(
        `/families/${receipt._id}/receipt`,
        `${data.community.name}-${receipt.familyHeadName}.pdf`,
        { receiptToken: receipt.receiptToken },
      );
    } catch (err: any) {
      Alert.alert('Download failed', err.message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <View style={s.screen}>
      {!preview && (
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.brand}>Sangam</Text>
            <Text style={s.sub}>
              Family Registration Portal · குடும்பப் பதிவு
            </Text>
          </View>
          <Button title="Admin →" secondary onPress={onAdmin} />
        </View>
      )}
      <ScrollView
        ref={scroll}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.body}
      >
        {!preview && (
          <Input
            label="COMMUNITY"
            value={REGISTRATION_COMMUNITY.name}
            disabled
          />
        )}
        {loading ? (
          <Loading label="Retrieving your community form…" />
        ) : error || !sections.length ? (
          <ErrorBox
            error={error || 'No published form is available.'}
            retry={() => setRetry(r => r + 1)}
          />
        ) : receipt ? (
          <>
            <View style={s.card}>
              <Text style={s.badge}>SUBMITTED</Text>
              <Text style={s.h1}>{receipt.familyHeadName}</Text>
              <Text style={s.muted}>
                {data.community.name} · Family registration
              </Text>
              <Text selectable style={s.muted}>
                Reference: {receipt._id}
              </Text>
              <Text style={s.text}>
                Your family record has been received. Download your copy before
                leaving. This receipt is available for 24 hours.
              </Text>
              <Button
                title={saving ? 'Preparing PDF…' : 'Download PDF'}
                disabled={saving}
                onPress={pdf}
              />
            </View>
            <RecordDetails record={receipt} />
            <Button
              title="Register another family"
              secondary
              onPress={() => {
                setReceipt(null);
                setValues(blank());
                go(0);
              }}
            />
          </>
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={s.row}>
                {[...sections, { key: 'review', title: 'Review & submit' }].map(
                  (x, i) => (
                    <Button
                      key={x.key}
                      title={`${String(i + 1).padStart(2, '0')} ${x.title}`}
                      secondary={i !== step}
                      disabled={busy}
                      onPress={() => {
                        if (i <= step || validate()) go(i);
                      }}
                    />
                  ),
                )}
              </View>
            </ScrollView>
            <View style={{ gap: 8 }}>
              <Text style={s.overline}>
                SECTION {String(step + 1).padStart(2, '0')} /{' '}
                {String(sections.length + 1).padStart(2, '0')}{' '}
                {preview ? '· PREVIEW' : ''}
              </Text>
              <Text accessibilityRole="header" style={s.h1}>
                {section?.title || 'Review & submit'}
              </Text>
              <Text style={s.muted}>
                {section?.description ||
                  'Check your information and confirm before submitting your family record.'}
              </Text>
            </View>
            <View style={[s.card, s.panel]}>
              {section ? (
                fieldsOf(section)
                  .filter(
                    (f: any) =>
                      !(
                        fieldsOf(section).some(
                          (x: any) => x.type === 'location',
                        ) &&
                        [
                          'villageName',
                          'taluk',
                          'wardNumber',
                          'postalCode',
                          'postOffice',
                          'state',
                          'stateCode',
                          'settlementType',
                          'localBody',
                        ].includes(f.key)
                      ),
                  )
                  .map((f: any) => (
                    <RegistrationField
                      key={f.key}
                      field={f}
                      values={values}
                      change={change}
                      slug={slug}
                      disabled={busy}
                    />
                  ))
              ) : (
                <>
                  {sections.map((sec: any, i: number) => (
                    <View key={sec.key} style={{ gap: 14 }}>
                      <View style={s.between}>
                        <Text style={[s.h2, { flex: 1 }]}>{sec.title}</Text>
                        <Button
                          title="Edit"
                          secondary
                          disabled={busy}
                          onPress={() => go(i)}
                        />
                      </View>
                      {fieldsOf(sec).map((f: any) => (
                        <View key={f.key}>
                          <Text style={s.muted}>{f.label}</Text>
                          <Text selectable style={s.text}>
                            {f.type === 'location'
                              ? display(
                                  Object.fromEntries(
                                    [
                                      'state',
                                      'district',
                                      'localBody',
                                      'taluk',
                                      'block',
                                      'villagePanchayat',
                                      'villageName',
                                      'habitation',
                                      'wardNumber',
                                      'streetArea',
                                      'postalCode',
                                      'postOffice',
                                    ].map(k => [k, values[k]]),
                                  ),
                                )
                              : display(values[f.key])}
                          </Text>
                        </View>
                      ))}
                      <View style={s.divider} />
                    </View>
                  ))}
                  <Check
                    disabled={busy}
                    value={values.consent}
                    onChange={(x: boolean) => change({ consent: x })}
                    label={`I confirm these details are accurate and agree to share them with ${data.community.name} for registration, community support and contribution follow-up.`}
                  />
                </>
              )}
            </View>
            <View style={s.between}>
              <Button
                title="← Previous"
                secondary
                disabled={step === 0 || busy}
                onPress={() => go(step - 1)}
              />
              <Button
                title={
                  busy
                    ? 'Submitting…'
                    : step === sections.length
                    ? 'Submit family record'
                    : 'Continue →'
                }
                disabled={busy}
                onPress={submit}
              />
            </View>
            <Text style={s.muted}>
              Your information is saved when you submit. Required fields are
              marked with *. Information is visible to authorised community
              administrators.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}
