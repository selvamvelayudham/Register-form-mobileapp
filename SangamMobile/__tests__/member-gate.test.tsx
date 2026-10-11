import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { TextInput } from 'react-native';
import MemberGate from '../src/MemberGate';
import { Button } from '../src/ui';
import * as auth from '../src/memberAuth';
jest.mock('../src/memberAuth', () => ({
  ...jest.requireActual('../src/memberAuth'),
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
