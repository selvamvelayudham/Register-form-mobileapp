import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import { api } from './api';
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
    const t = setTimeout(
      () =>
        api(
          `/master/pincodes?search=${pin}&limit=100`,
          {},
          'GET',
          undefined,
          ctrl.signal,
        )
          .then(data => {
            const x = data.items.find((r: any) => r.code === pin);
            change({ pincodeId: x?._id || '' });
          })
          .catch(() => {}),
      250,
    );
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [pin, change]);
  const local = (kind: string) => ({
    kind,
    communitySlug: slug,
    districtId: v.districtId,
    blockId: kind === 'taluk' ? undefined : v.blockId,
    villagePanchayatId: kind === 'taluk' ? undefined : v.villagePanchayatId,
    habitationId: kind === 'street' ? v.habitationId : undefined,
  });
  const rural = v.settlementType !== 'Urban';
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
      <Select
        label="State"
        endpoint="states"
        value={v.state}
        required
        disabled={disabled}
        onSelect={(x: any) =>
          change({
            ...reset(children),
            stateCode: x.code,
            state: x.nameEnglish,
            locationMissing: [],
          })
        }
      />
      <Select
        label="District"
        endpoint="districts"
        params={{ stateCode: v.stateCode }}
        value={v.district}
        required
        disabled={disabled || !v.stateCode}
        onSelect={(x: any) =>
          choose('districtId', 'district', x, children.slice(2))
        }
      />
      <Input
        label="Area type"
        type="select"
        options={['Rural', 'Urban']}
        value={v.settlementType || 'Rural'}
        disabled={disabled}
        onChange={(x: string) =>
          change({
            ...reset(children.slice(5)),
            settlementType: x,
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
        <Input
          label="Town / city"
          required
          value={v.villageName}
          disabled={disabled}
          onChange={(x: string) =>
            change({
              villageName: x,
              villageManual: true,
              villageChoiceId: '',
              villageSameAsPanchayat: false,
              villageSameAsHabitation: false,
            })
          }
        />
      )}
      <Select
        label="Ward No."
        endpoint="location-choices"
        params={local('ward')}
        value={v.wardNumber}
        disabled={disabled || !v.districtId}
        items={[{ _id: 'na', nameEnglish: 'Not applicable' }]}
        allowUnlisted
        onSelect={(x: any) =>
          change({
            wardChoiceId: x._id === 'na' ? '' : x._id,
            wardNumber: x.nameEnglish,
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
      <Select
        label="Post Office"
        endpoint="post-offices"
        params={{ pincodeId: v.pincodeId }}
        value={v.postOffice}
        disabled={disabled || !v.pincodeId}
        onSelect={(x: any) => choose('postOfficeId', 'postOffice', x)}
      />
      <Text style={s.muted}>
        Each list follows the location selected above it. Post offices appear
        when the PIN code is found in the directory.
      </Text>
    </View>
  );
}
