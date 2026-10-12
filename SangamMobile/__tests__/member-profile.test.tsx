import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import MemberProfile, { ProfileButton } from '../src/MemberProfile';
import { Button } from '../src/ui';
const member = {
  projectId: 'test-cloud-project',
  uid: 'member-1',
  email: 'member@example.com',
  displayName: 'Example Member',
  signInMethod: 'Google',
  token: 'private-token',
  refreshToken: 'private-refresh',
  expiresAt: 0,
};
test('profile shows account details, keeps tokens private, and delegates logout', async () => {
  const logout = jest.fn().mockResolvedValue(undefined);
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(
      <MemberProfile
        member={member}
        visible
        onClose={() => {}}
        onAdmin={() => {}}
        onLogout={logout}
      />,
    );
  });
  const content = JSON.stringify(tree.toJSON());
  expect(content).toContain('Example Member');
  expect(content).toContain('member@example.com');
  expect(content).toContain('Google');
  expect(content).not.toContain('private-token');
  expect(content).not.toContain('private-refresh');
  await act(async () =>
    tree.root
      .findAllByType(Button)
      .find(button => button.props.title === 'Logout')!
      .props.onPress(),
  );
  expect(logout).toHaveBeenCalledTimes(1);
  act(() => tree.unmount());
});
test('profile button uses initials and a clear accessible label', async () => {
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(
      <ProfileButton member={member} disabled={false} onPress={() => {}} />,
    );
  });
  expect(JSON.stringify(tree.toJSON())).toContain('Open profile');
  expect(JSON.stringify(tree.toJSON())).toContain('EM');
  act(() => tree.unmount());
});
