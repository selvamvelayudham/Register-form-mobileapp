import React, { useState } from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import LocationFields from '../src/LocationFields';
import { blank } from '../src/forms';
import { Input, Select } from '../src/ui';

jest.mock('../src/api', () => ({
  api: jest.fn(),
  query: jest.requireActual('../src/api').query,
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
}));

function Screen({ seed }: any) {
  const [values, setValues] = useState(seed);
  return (
    <LocationFields
      values={values}
      change={(patch: any) => setValues((old: any) => ({ ...old, ...patch }))}
      slug="krishnan-community"
      disabled={false}
    />
  );
}
const input = (tree: ReactTestRenderer, label: string) =>
  tree.root.findAllByType(Input).find(x => x.props.label === label)!;
const select = (tree: ReactTestRenderer, label: string) =>
  tree.root.findAllByType(Select).find(x => x.props.label === label)!;

describe('residential location changes', () => {
  test('locks Tamil Nadu, removes area type, and accepts ward, PIN and post office as text inputs', () => {
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(<Screen seed={{ ...blank(), districtId: 'district' }} />);
    });
    expect(input(tree, 'State').props).toMatchObject({
      value: 'Tamil Nadu',
      disabled: true,
    });
    expect(
      tree.root.findAllByType(Input).some(x => x.props.label === 'Area type'),
    ).toBe(false);
    expect(
      tree.root
        .findAllByType(Select)
        .some(x =>
          ['Ward No.', 'Post Office', 'State'].includes(x.props.label),
        ),
    ).toBe(false);
    act(() => input(tree, 'Ward number').props.onChange('12a'));
    expect(input(tree, 'Ward number').props.value).toBe('12');
    act(() => input(tree, 'PIN code').props.onChange('60a00012'));
    expect(input(tree, 'PIN code').props.value).toBe('600001');
    act(() => input(tree, 'Post office').props.onChange('Chennai GPO'));
    expect(input(tree, 'Post office').props.value).toBe('Chennai GPO');
    act(() => tree.unmount());
  });

  test('changing administrative type clears rural descendants and town selection, with district-scoped city choices', () => {
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(
        <Screen
          seed={{
            ...blank(),
            districtId: 'district',
            blockId: 'block',
            villagePanchayatId: 'panchayat',
            habitationId: 'hamlet',
            villageName: 'Old village',
            wardNumber: '12',
          }}
        />,
      );
    });
    act(() =>
      input(tree, 'Administrative type').props.onChange('Municipality'),
    );
    expect(
      tree.root.findAllByType(Select).some(x => x.props.label === 'Block'),
    ).toBe(false);
    const city = select(tree, 'Municipality — City / town');
    expect(city.props.value).toBe('');
    expect(city.props.params).toMatchObject({
      kind: 'village',
      districtId: 'district',
      blockId: '',
      villagePanchayatId: '',
    });
    expect(input(tree, 'Ward number').props.value).toBe('');
    act(() =>
      city.props.onSelect({ _id: 'city', nameEnglish: 'Example city' }),
    );
    expect(select(tree, 'Municipality — City / town').props.value).toBe(
      'Example city',
    );
    act(() => input(tree, 'Administrative type').props.onChange('Corporation'));
    expect(select(tree, 'Corporation — City / town').props.value).toBe('');
    act(() =>
      select(tree, 'Corporation — City / town').props.onSelect({
        _id: '',
        nameEnglish: 'Not listed',
      }),
    );
    act(() => input(tree, 'City / town name').props.onChange('Missing city'));
    expect(input(tree, 'City / town name').props.value).toBe('Missing city');
    act(() =>
      input(tree, 'Administrative type').props.onChange('Village Panchayat'),
    );
    expect(select(tree, 'Block').props.value).toBe('');
    expect(select(tree, 'Village / Hamlet').props.disabled).toBe(true);
    act(() => tree.unmount());
  });
});
