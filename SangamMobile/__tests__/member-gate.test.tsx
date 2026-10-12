import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { TextInput } from 'react-native';
import MemberGate from '../src/MemberGate';
import { Button } from '../src/ui';
import * as auth from '../src/memberAuth';
jest.mock('../src/memberAuth', () => ({
  ...jest.requireActual('../src/memberAuth'),
  initializeAuth: jest.fn().mockResolvedValue({
    apiKey: 'native-api-key',
    projectId: 'test-cloud-project',
    appVersion: '1.5',
  }),
  emailSignIn: jest.fn(),
  googleSignIn: jest.fn(),
  memberSessionKey: jest.fn(() => 'cloud-member:test-cloud-project'),
  memberStore: {
    read: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockResolvedValue(null),
    clear: jest.fn().mockResolvedValue(null),
    flush: jest.fn().mockResolvedValue(null),
  },
}));
jest.mock('../src/Registration', () => () => <></>);
function press(tree: ReactTestRenderer, title: string) {
  tree.root
    .findAllByType(Button)
    .find(x => x.props.title === title)!
    .props.onPress();
}
test('requires authentication and offers email registration, login and Google', async () => {
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(<MemberGate onAdmin={() => {}} />);
  });
  expect(auth.initializeAuth).toHaveBeenCalled();
  expect(JSON.stringify(tree.toJSON())).toContain('1.5');
  expect(auth.memberStore.clear).toHaveBeenCalledWith('member');
  expect(auth.memberStore.read).toHaveBeenCalledWith(
    'cloud-member:test-cloud-project',
  );
  expect(JSON.stringify(tree.toJSON())).toContain('Welcome back');
  expect(JSON.stringify(tree.toJSON())).toContain('Sign in with Google');
  act(() => press(tree, 'Register'));
  expect(JSON.stringify(tree.toJSON())).toContain('Create your account');
  expect(
    tree.root.findAllByType(TextInput).map(x => x.props.accessibilityLabel),
  ).toContain('Confirm password');
  act(() => press(tree, 'Create account'));
  expect(auth.emailSignIn).not.toHaveBeenCalled();
  act(() => tree.unmount());
});

test('email account creation returns to Login without saving an authenticated session', async () => {
  jest.clearAllMocks();
  (auth.emailSignIn as jest.Mock).mockResolvedValue({
    uid: 'new-member',
    email: 'new@example.com',
    displayName: 'New Member',
  });
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(<MemberGate onAdmin={() => {}} />);
  });
  act(() => press(tree, 'Register'));
  act(() => {
    const fields = tree.root.findAllByType(TextInput);
    for (const [label, value] of [
      ['Full name', 'New Member'],
      ['Email address', 'new@example.com'],
      ['Password', 'Password123'],
      ['Confirm password', 'Password123'],
    ])
      fields
        .find(field => field.props.accessibilityLabel === label)!
        .props.onChangeText(value);
  });
  await act(async () => press(tree, 'Create account'));
  expect(auth.emailSignIn).toHaveBeenCalledWith(
    'new@example.com',
    'Password123',
    true,
    'New Member',
  );
  expect(auth.memberStore.save).not.toHaveBeenCalled();
  expect(JSON.stringify(tree.toJSON())).toContain(
    'Account created. Please log in to continue.',
  );
  expect(JSON.stringify(tree.toJSON())).toContain('Welcome back');
  expect(
    tree.root
      .findAllByType(TextInput)
      .find(field => field.props.accessibilityLabel === 'Password')!.props
      .value,
  ).toBe('');
  act(() =>
    tree.root
      .findAllByType(TextInput)
      .find(field => field.props.accessibilityLabel === 'Password')!
      .props.onChangeText('Password123'),
  );
  await act(async () =>
    tree.root
      .findAllByType(Button)
      .find(
        button => button.props.accessibilityLabel === 'Log in to your account',
      )!
      .props.onPress(),
  );
  expect(auth.memberStore.save).toHaveBeenCalledWith(
    'cloud-member:test-cloud-project',
    expect.objectContaining({ uid: 'new-member' }),
  );
  act(() => tree.unmount());
});
