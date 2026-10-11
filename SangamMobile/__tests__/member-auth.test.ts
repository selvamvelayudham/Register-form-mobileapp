import { NativeModules } from 'react-native';
import {
  draftKey,
  emailSignIn,
  googleSignIn,
  memberStore,
  memberSessionKey,
  restoreMember,
  validateCredentials,
} from '../src/memberAuth';
import { restoreDraft } from '../src/drafts';
const fetchMock = jest.fn();
const result = {
  localId: 'member-1',
  email: 'person@gmail.com',
  idToken: 'verified-cloud-token',
  refreshToken: 'refresh',
  expiresIn: '3600',
};
beforeEach(() => {
  jest.clearAllMocks();
  globalThis.fetch = fetchMock;
  NativeModules.SangamDevice = {
    googleCloudProjectId: 'test-cloud-project',
    googleCloudApiKey: 'test-public-api-key',
    googleSignIn: jest.fn().mockResolvedValue('google-token'),
    saveSecure: jest.fn().mockResolvedValue(null),
    readSecure: jest.fn().mockResolvedValue(null),
  };
  fetchMock.mockResolvedValue({ ok: true, json: async () => result });
});
test('registration validates email, password length and confirmation', () => {
  expect(
    validateCredentials('person@gmail.com', '12345678', true, 'different'),
  ).toContain('match');
  expect(
    validateCredentials('person@gmail.com', 'short', true, 'short'),
  ).toContain('8');
  expect(validateCredentials('bad email', '12345678', false)).toContain(
    'email',
  );
  expect(validateCredentials('person@gmail.com', 'short', false)).toBe('');
});
test('email signup uses Google Cloud Identity Platform and never persists a password', async () => {
  const account = await emailSignIn(' Person@Gmail.com ', 'my-password', true);
  expect(fetchMock.mock.calls[0][0]).toContain('accounts:signUp');
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
    email: 'person@gmail.com',
    password: 'my-password',
  });
  await memberStore.save(memberSessionKey(), account);
  expect(NativeModules.SangamDevice.saveSecure.mock.calls[0][1]).not.toContain(
    'my-password',
  );
});
test('Google credentials must be verified by Identity Platform', async () => {
  expect((await googleSignIn()).token).toBe('verified-cloud-token');
  expect(fetchMock.mock.calls[0][0]).toContain('accounts:signInWithIdp');
  expect(JSON.parse(fetchMock.mock.calls[0][1].body).postBody).toBe(
    'id_token=google-token&providerId=google.com',
  );
});
test('invalid credentials cannot create a session', async () => {
  fetchMock.mockResolvedValue({
    ok: false,
    json: async () => ({ error: { message: 'INVALID_LOGIN_CREDENTIALS' } }),
  });
  await expect(emailSignIn('person@gmail.com', 'wrong', false)).rejects.toThrow(
    'Check your email',
  );
});
test('restoration rejects a refreshed token for a different identity', async () => {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      id_token: 'fresh',
      refresh_token: 'new-refresh',
      expires_in: '3600',
    }),
  });
  fetchMock.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ users: [{ localId: 'different' }] }),
  });
  await expect(
    restoreMember({
      projectId: 'test-cloud-project',
      uid: 'member-1',
      email: 'person@gmail.com',
      token: 'old',
      refreshToken: 'refresh',
      expiresAt: 0,
    }),
  ).rejects.toThrow('log in again');
});
test('drafts are account scoped, clamp the section, clear consent and remove retired fields', () => {
  expect(draftKey('first', 'community')).not.toBe(
    draftKey('second', 'community'),
  );
  const restored = restoreDraft(
    {
      version: 1,
      step: 999,
      values: {
        familyHeadName: 'Example',
        consent: true,
        taluk: 'Old',
        streetArea: 'Old',
      },
    },
    4,
  )!;
  expect(restored.step).toBe(4);
  expect(restored.values.familyHeadName).toBe('Example');
  expect(restored.values.consent).toBe(false);
  expect(restored.values.taluk).toBeUndefined();
  expect(restored.values.streetArea).toBeUndefined();
});
test('completed submissions restore receipts rather than unfinished form details', () => {
  const receipt = { _id: 'record-id' };
  const saved = {
    version: 1,
    values: { familyHeadName: 'Example' },
    step: 4,
    receipt,
    receiptExpiresAt: Date.now() + 60000,
  };
  expect(restoreDraft(saved, 4)?.receipt).toEqual(receipt);
  expect(restoreDraft(saved, 4)?.values.familyHeadName).toBeUndefined();
  expect(
    restoreDraft({ ...saved, receiptExpiresAt: 0 }, 4)?.receipt,
  ).toBeNull();
});

test('does not use the removed legacy API key as a fallback', async () => {
  NativeModules.SangamDevice = {
    firebaseApiKey: 'legacy-key',
    googleCloudProjectId: 'test-cloud-project',
  };
  await expect(
    emailSignIn('person@gmail.com', 'my-password', false),
  ).rejects.toThrow('temporarily unavailable');
  expect(fetchMock).not.toHaveBeenCalled();
});
test('sessions and drafts cannot cross Google Cloud projects', async () => {
  const previousKey = draftKey('same-member', 'same-community');
  NativeModules.SangamDevice.googleCloudProjectId = 'other-cloud-project';
  expect(draftKey('same-member', 'same-community')).not.toBe(previousKey);
  expect(memberSessionKey()).toBe('cloud-member:other-cloud-project');
  await expect(
    restoreMember({
      uid: 'same-member',
      email: 'person@gmail.com',
      token: 'old',
      refreshToken: 'old-refresh',
      expiresAt: 0,
      projectId: 'test-cloud-project',
    }),
  ).rejects.toThrow('log in again');
  expect(fetchMock).not.toHaveBeenCalled();
});
