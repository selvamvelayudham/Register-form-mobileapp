import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { Alert, TextInput } from 'react-native';
import Registration from '../src/Registration';
import { api } from '../src/api';
import { REGISTRATION_COMMUNITY } from '../src/registrationConfig';
import { Button, Check, Input, Select } from '../src/ui';

jest.mock('../src/api', () => ({
  ...jest.requireActual('../src/api'),
  api: jest.fn(),
  download: jest.fn(),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
}));
const mockApi = api as jest.Mock;
const community = {
  _id: 'community-id',
  name: 'Example Community',
  slug: REGISTRATION_COMMUNITY.slug,
};
const form = {
  sections: [
    {
      key: 'primary',
      title: 'Primary information',
      order: 1,
      fields: [
        {
          key: 'familyHeadName',
          label: 'Family head',
          type: 'text',
          required: true,
          order: 1,
        },
        {
          key: 'phoneNumber',
          label: 'Mobile number',
          type: 'phone',
          required: true,
          order: 2,
        },
      ],
    },
  ],
};
function press(tree: ReactTestRenderer, title: string) {
  const button = tree.root
    .findAllByType(Button)
    .find(x => x.props.title === title);
  if (!button) throw new Error(`Missing button ${title}`);
  button.props.onPress();
}
describe('native registration screens', () => {
  beforeEach(() => {
    mockApi.mockReset();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockApi.mockImplementation(async (path: string) =>
      path === '/communities/public'
        ? [community]
        : path.startsWith('/communities/public/')
        ? { community, form }
        : path === '/families'
        ? {
            _id: 'record-id',
            familyHeadName: 'Example',
            receiptToken: 'receipt',
            members: [],
          }
        : {},
    );
  });
  afterEach(() => jest.restoreAllMocks());
  test('loads backend form and blocks incomplete required answers', async () => {
    let tree!: ReactTestRenderer;
    await act(async () => {
      tree = create(<Registration onAdmin={() => {}} />);
    });
    expect(mockApi).toHaveBeenCalledWith(
      `/communities/public/${REGISTRATION_COMMUNITY.slug}`,
      {},
      'GET',
      undefined,
      expect.anything(),
    );
    const selector = tree.root
      .findAllByType(Input)
      .find(x => x.props.label === 'COMMUNITY');
    expect(selector?.props.value).toBe('Krishavaha');
    expect(selector?.props.disabled).toBe(true);
    expect(tree.root.findAllByType(Select)).toHaveLength(0);
    act(() => press(tree, 'Continue →'));
    expect(Alert.alert).toHaveBeenCalledWith(
      'Check your information',
      'Complete Family head.',
    );
    expect(mockApi.mock.calls.some(([path]) => path === '/families')).toBe(
      false,
    );
    act(() => tree.unmount());
  });
  test('reviews, requires consent, submits with existing backend scope and shows receipt', async () => {
    let tree!: ReactTestRenderer;
    await act(async () => {
      tree = create(<Registration onAdmin={() => {}} />);
    });
    act(() => {
      tree.root
        .findAllByType(TextInput)
        .find(x => x.props.accessibilityLabel === 'Family head')!
        .props.onChangeText('Example');
      tree.root
        .findAllByType(TextInput)
        .find(x => x.props.accessibilityLabel === 'Mobile number')!
        .props.onChangeText('9876543210');
    });
    act(() => press(tree, 'Continue →'));
    act(() => press(tree, 'Submit family record'));
    expect(Alert.alert).toHaveBeenCalledWith(
      'Consent required',
      expect.any(String),
    );
    act(() => tree.root.findAllByType(Check)[0].props.onChange(true));
    await act(async () => press(tree, 'Submit family record'));
    const call = mockApi.mock.calls.find(([path]) => path === '/families');
    expect(call?.[2]).toBe('POST');
    expect(call?.[3]).toMatchObject({
      familyHeadName: 'Example',
      phoneNumber: '9876543210',
      consent: true,
      communityId: 'community-id',
      communitySlug: REGISTRATION_COMMUNITY.slug,
    });
    expect(JSON.stringify(tree.toJSON())).toContain('SUBMITTED');
    expect(JSON.stringify(tree.toJSON())).toContain('Download PDF');
    act(() => tree.unmount());
  });
});
