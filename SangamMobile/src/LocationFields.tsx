import React from 'react';
import { Text, View } from 'react-native';
import {
  ADMINISTRATIVE_TYPES,
  REGISTRATION_STATE,
  isRuralAdministration,
} from './registrationConfig';
import { Input, Select, s } from './ui';
import { urbanChoices } from './urbanLocalBodies';
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
  'urbanLocalBodyCode',
  'urbanManualEntry',
];
const reset = (keys: string[]) =>
  Object.fromEntries(
    keys.map(k => [
      k,
      [
        'villageSameAsPanchayat',
        'villageSameAsHabitation',
        'villageManual',
        'urbanManualEntry',
      ].includes(k)
        ? false
        : '',
    ]),
  );
export default function LocationFields({
  values: v,
  change,
  disabled,
}: any) {
  const pin = v.postalCode || '';
  const administrativeType = v.localBody || 'Village Panchayat';
  const rural = isRuralAdministration(administrativeType);
  const choose = (id: string, key: string, x: any, clear: string[] = []) =>
    change({
      [id]: x._id,
      [key]: x.nameEnglish || x.displayName || x.name || x.code,
      ...reset(clear),
      ...(clear.length
        ? {
            locationMissing: [],
          }
        : {}),
    });
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
            locationMissing: [],
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
                locationMissing: [],
              })
            }
          />
          <Select
            label="Village"
            endpoint="habitations"
            params={{ villagePanchayatId: v.villagePanchayatId }}
            value={v.villageName}
            required
            disabled={disabled || !v.villagePanchayatId}
            onSelect={(x: any) =>
              change({
                ...reset(children.slice(10)),
                villageName: x.nameEnglish,
                habitationId: x._id,
                habitation: x.nameEnglish,
                villageSameAsHabitation: true,
                locationMissing: [],
              })
            }
          />
        </>
      )}
      {!rural && (
        <>
          <Select
            label={`${administrativeType} — City / town`}
            items={urbanChoices(v.district, administrativeType)}
            value={v.urbanManualEntry ? 'Not listed' : v.villageName}
            required
            disabled={disabled || !v.districtId}
            allowUnlisted
            onSelect={(x: any) =>
              change({
                ...reset(children.slice(10)),
                villageChoiceId: '',
                urbanLocalBodyCode: x.lgdCode || '',
                villageName: x._id ? x.nameEnglish : '',
                villageManual: true,
                urbanManualEntry: !x._id,
                locationMissing: [],
              })
            }
          />
          {v.urbanManualEntry && (
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
      <Text style={s.muted}>
        Village lists follow your block and panchayat. City / town choices
        follow your district and administrative type. Choose “My location is not
        listed” to enter a missing city.
      </Text>
    </View>
  );
}
