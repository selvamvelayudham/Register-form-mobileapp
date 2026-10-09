import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import { api, query } from './api';
import {
  ADMINISTRATIVE_TYPES,
  REGISTRATION_STATE,
  isRuralAdministration,
} from './registrationConfig';
import { Input, Select, s } from './ui';
const children = [
  'districtId',
  'district',
  'talukChoiceId',
  'talukCode',
  'taluk',
  'blockId',
  'block',
  'villagePanchayatId',
  'villagePanchayat',
  'villagePanchayatNameTamil',
  'villageChoiceId',
  'villageName',
  'villageSameAsPanchayat',
  'habitationId',
  'habitation',
  'wardNumber',
  'wardChoiceId',
  'streetChoiceId',
  'streetArea',
  'postalCode',
  'pincodeId',
  'postOfficeId',
  'postOffice',
  'villageSameAsHabitation',
  'villageManual',
];
const reset = (keys: string[]) =>
  Object.fromEntries(
    keys.map(k => [
      k,
      [
        'villageSameAsPanchayat',
        'villageSameAsHabitation',
        'villageManual',
      ].includes(k)
        ? false
        : '',
    ]),
  );
export default function LocationFields({
  values: v,
  change,
  slug,
  disabled,
}: any) {
  const pin = v.postalCode || '';
  useEffect(() => {
    if (!/^[1-9]\d{5}$/.test(pin)) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const data = await api(
          `/master/pincodes?search=${pin}&limit=100`,
          {},
          'GET',
          undefined,
          ctrl.signal,
        );
        if (ctrl.signal.aborted) return;
        const entry = data.items.find((r: any) => r.code === pin);
        change({ pincodeId: entry?._id || '', postOfficeId: '' });
        if (!entry || !v.postOffice?.trim()) return;
        const offices = await api(
          `/master/post-offices?${query({
            pincodeId: entry._id,
            search: v.postOffice.trim(),
            limit: 100,
          })}`,
          {},
          'GET',
          undefined,
          ctrl.signal,
        );
        if (ctrl.signal.aborted) return;
        const office = offices.items.find(
          (r: any) =>
            (r.nameEnglish || r.name || '').trim().toLowerCase() ===
            v.postOffice.trim().toLowerCase(),
        );
        if (office) change({ postOfficeId: office._id });
      } catch {
        // Typed values remain editable if the directory is unavailable.
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [pin, v.postOffice, change]);
  const local = (kind: string) => ({
    kind,
    communitySlug: slug,
    districtId: v.districtId,
    blockId: kind === 'taluk' ? undefined : v.blockId,
    villagePanchayatId: kind === 'taluk' ? undefined : v.villagePanchayatId,
    habitationId: kind === 'street' ? v.habitationId : undefined,
  });
  const administrativeType = v.localBody || 'Village Panchayat';
  const rural = isRuralAdministration(administrativeType);
  const choose = (id: string, key: string, x: any, clear: string[] = []) =>
    change({
      [id]: x._id,
      [key]: x.nameEnglish || x.displayName || x.name || x.code,
      ...reset(clear),
      ...(clear.length
        ? {
            locationMissing: (v.locationMissing || []).filter(
              (k: string) => k === 'taluk' && !clear.includes('taluk'),
            ),
          }
        : {}),
    });
  const missing = (kind: string, x: any) =>
    (v.locationMissing || [])
      .filter((k: string) => k !== kind)
      .concat(x._id ? [] : [kind]);
  return (
    <View>
      <Text style={[s.h2, { marginBottom: 18 }]}>Residential location</Text>
      <Input label="State" value={REGISTRATION_STATE.name} required disabled />
      <Select
        label="District"
        endpoint="districts"
        params={{ stateCode: REGISTRATION_STATE.code }}
        value={v.district}
        required
        disabled={disabled}
        onSelect={(x: any) =>
          choose('districtId', 'district', x, children.slice(2))
        }
      />
      <Input
        label="Administrative type"
        type="select"
        options={ADMINISTRATIVE_TYPES}
        required
        value={administrativeType}
        disabled={disabled}
        onChange={(x: string) =>
          change({
            ...reset(children.slice(5)),
            localBody: x,
            settlementType: isRuralAdministration(x) ? 'Rural' : 'Urban',
            locationMissing: (v.locationMissing || []).filter(
              (k: string) => k === 'taluk',
            ),
          })
        }
      />
      <Select
        label="Taluk / Tehsil / Mandal"
        endpoint="location-choices"
        params={local('taluk')}
        value={v.taluk}
        disabled={disabled || !v.districtId}
        allowUnlisted
        onSelect={(x: any) =>
          change({
            talukChoiceId: x.talukCode ? '' : x._id,
            talukCode: x.talukCode || '',
            taluk: x.nameEnglish,
            locationMissing: missing('taluk', x),
          })
        }
      />
      {rural && (
        <>
          <Select
            label="Block"
            endpoint="blocks"
            params={{ districtId: v.districtId }}
            value={v.block}
            required
            disabled={disabled || !v.districtId}
            onSelect={(x: any) =>
              choose('blockId', 'block', x, children.slice(7))
            }
          />
          <Select
            label="Gram Panchayat / Village Panchayat"
            endpoint="village-panchayats"
            params={{ blockId: v.blockId }}
            value={v.villagePanchayat}
            required
            disabled={disabled || !v.blockId}
            onSelect={(x: any) =>
              change({
                ...reset(children.slice(10)),
                villagePanchayatId: x._id,
                villagePanchayat: x.nameEnglish,
                villagePanchayatNameTamil: x.nameEnglish,
                locationMissing: (v.locationMissing || []).filter(
                  (k: string) => k === 'taluk',
                ),
              })
            }
          />
          <Select
            label="Village / Hamlet"
            endpoint="location-choices"
            params={local('village')}
            value={v.villageName}
            required
            disabled={disabled || !v.villagePanchayatId}
            items={
              v.villagePanchayat
                ? [
                    {
                      _id: 'same-as-panchayat',
                      nameEnglish: `${v.villagePanchayat} (same as panchayat)`,
                    },
                  ]
                : []
            }
            onSelect={(x: any) =>
              change({
                ...reset([
                  'habitationId',
                  'habitation',
                  'streetChoiceId',
                  'streetArea',
                  'wardNumber',
                  'wardChoiceId',
                  'postalCode',
                  'pincodeId',
                  'postOfficeId',
                  'postOffice',
                ]),
                habitationId: x.masterHabitationId || '',
                habitation: x.masterHabitationId ? x.nameEnglish : '',
                villageSameAsHabitation: Boolean(x.masterHabitationId),
                villageChoiceId:
                  x.masterHabitationId || x._id === 'same-as-panchayat'
                    ? ''
                    : x._id,
                villageSameAsPanchayat: x._id === 'same-as-panchayat',
                villageName:
                  x._id === 'same-as-panchayat'
                    ? v.villagePanchayat
                    : x.nameEnglish,
                locationMissing: (v.locationMissing || []).filter(
                  (k: string) => k === 'taluk',
                ),
              })
            }
          />
          <Select
            label="Habitation / Hamlet"
            endpoint="habitations"
            params={{ villagePanchayatId: v.villagePanchayatId }}
            value={v.habitation}
            required
            disabled={disabled || !v.villagePanchayatId || !v.villageName}
            onSelect={(x: any) => {
              choose('habitationId', 'habitation', x, [
                'streetChoiceId',
                'streetArea',
                'wardChoiceId',
                'wardNumber',
                'postalCode',
                'pincodeId',
                'postOfficeId',
                'postOffice',
              ]);
              if (v.villageSameAsHabitation)
                change({ villageName: x.nameEnglish });
            }}
          />
        </>
      )}
      {!rural && (
        <>
          <Select
            label={`${administrativeType} — City / town`}
            endpoint="location-choices"
            params={local('village')}
            value={v.villageManual ? 'Not listed' : v.villageName}
            required
            disabled={disabled || !v.districtId}
            allowUnlisted
            onSelect={(x: any) =>
              change({
                ...reset(children.slice(10)),
                villageChoiceId: x._id || '',
                villageName: x._id ? x.nameEnglish : '',
                villageManual: !x._id,
                locationMissing: (v.locationMissing || []).filter(
                  (k: string) => k === 'taluk',
                ),
              })
            }
          />
          {v.villageManual && (
            <Input
              label="City / town name"
              required
              maxLength={120}
              value={v.villageName}
              disabled={disabled || !v.districtId}
              onChange={(x: string) =>
                change({
                  villageName: x,
                  villageChoiceId: '',
                  villageManual: true,
                })
              }
            />
          )}
        </>
      )}
      <Input
        label="Ward number"
        value={v.wardNumber}
        type="number"
        maxLength={3}
        disabled={disabled || !v.districtId}
        helpText="Optional. Enter a ward number from 1 to 999."
        onChange={(x: string) =>
          change({
            wardNumber: x.replace(/\D/g, '').slice(0, 3),
            wardChoiceId: '',
          })
        }
      />
      <Select
        label="Street / Area"
        endpoint="location-choices"
        params={local('street')}
        value={v.streetArea}
        disabled={disabled || !v.villageName}
        allowUnlisted
        onSelect={(x: any) =>
          change({
            streetChoiceId: x._id,
            streetArea: x.nameEnglish,
            locationMissing: missing('street', x),
          })
        }
      />
      <Input
        label="PIN code"
        required
        type="number"
        maxLength={6}
        value={pin}
        disabled={disabled}
        helpText="Enter your 6-digit PIN code."
        onChange={(x: string) =>
          change({
            postalCode: x.replace(/\D/g, '').slice(0, 6),
            pincodeId: '',
            postOfficeId: '',
            postOffice: '',
          })
        }
      />
      <Input
        label="Post office"
        helpText="Enter the directory name for this PIN code, or leave blank."
        value={v.postOffice}
        maxLength={160}
        disabled={disabled}
        onChange={(x: string) => change({ postOffice: x, postOfficeId: '' })}
      />
      <Text style={s.muted}>
        Village lists follow your block and panchayat. City / town choices
        follow your district. Choose “My location is not listed” to enter a
        missing city.
      </Text>
    </View>
  );
}
