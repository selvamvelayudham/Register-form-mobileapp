import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeModules } from 'react-native';
import {
  AuthError,
  initializeAuth,
  emailSignIn,
  googleSignIn,
  memberStore,
  memberSessionKey,
  MemberSession,
  resetPassword,
  restoreMember,
  validateCredentials,
} from './memberAuth';
import { Button, ErrorBox, Input, Loading, s } from './ui';
import Registration from './Registration';
import { accountStyles as a } from './MemberProfile';
import { REGISTRATION_COMMUNITY } from './registrationConfig';

export default function MemberGate({ onAdmin }: { onAdmin: () => void }) {
  const [member, setMember] = useState<MemberSession | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [name, setName] = useState('');
  const [notice, setNotice] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [appVersion, setAppVersion] = useState('');
  const [restoreRetry, setRestoreRetry] = useState(0);
  useEffect(() => {
    let alive = true;
    setRestoring(true);
    setError('');
    initializeAuth()
      .then(info => {
        if (alive) setAppVersion(info.appVersion);
        return memberStore.clear('member');
      })
      .then(() => memberStore.read(memberSessionKey()))
      .then(async saved => {
        if (!saved) return;
        const restored = await restoreMember(saved);
        if (restored) {
          await memberStore.save(memberSessionKey(), restored);
          if (alive) setMember(restored);
        }
      })
      .catch(async err => {
        // Keep the saved refresh token on temporary network failure.
        if (err instanceof AuthError)
          await memberStore.clear(memberSessionKey()).catch(() => {});
        if (alive) setError(err.message);
      })
      .finally(() => {
        if (alive) setRestoring(false);
      });
    return () => {
      alive = false;
    };
  }, [restoreRetry]);
  async function run(action: () => Promise<MemberSession>, newAccount = false) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const next = await action();
      if (!newAccount) await memberStore.save(memberSessionKey(), next);
      setPassword('');
      setConfirm('');
      setShow(false);
      if (newAccount) {
        setRegistering(false);
        setName('');
        setEmail(next.email);
        setNotice('Account created. Please log in to continue.');
      } else setMember(next);
    } catch (err: any) {
      if (err.code !== 'GOOGLE_CANCELLED') setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  const logout = async () => {
    try {
      await memberStore.flush();
      await memberStore.clear(memberSessionKey());
      setMember(null);
      setRegistering(false);
      setPassword('');
      setConfirm('');
      setShow(false);
      setNotice('');
      setError('');
      NativeModules.SangamDevice.googleSignOut().catch(() => {});
    } catch {
      Alert.alert(
        'Could not sign out',
        'Your latest changes could not be saved. Please try again.',
      );
    }
  };
  if (restoring) return <Loading label="Restoring your account…" />;
  if (member)
    return (
      <Registration
        key={member.uid}
        member={member}
        onLogout={logout}
        onAdmin={onAdmin}
      />
    );
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        s.body,
        a.authBody,
        { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
      ]}
    >
      <View style={{ width: '100%', maxWidth: 480, gap: 20 }}>
        <View style={a.brandBlock}>
          <View style={a.brandMark}>
            <Text style={a.brandLetter}>S</Text>
          </View>
          <Text style={[s.brand, a.brandTitle]}>Sangam</Text>
          <Text style={s.overline}>
            {REGISTRATION_COMMUNITY.name.toUpperCase()} COMMUNITY
          </Text>
          <Text style={s.muted}>
            Your family. Your community. One place to stay connected.
          </Text>
        </View>
        <View style={[s.card, a.authCard]}>
          <View style={{ gap: 8 }}>
            <Text accessibilityRole="header" style={s.h1}>
              {registering ? 'Create your account' : 'Welcome back'}
            </Text>
            <Text style={s.muted}>
              {registering
                ? 'Create an account to start your family registration.'
                : 'Log in to continue your family registration. Your progress is saved on this phone.'}
            </Text>
          </View>
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Button
                title="Log in"
                disabled={busy}
                secondary={registering}
                onPress={() => {
                  setRegistering(false);
                  setError('');
                  setConfirm('');
                  setPassword('');
                  setShow(false);
                }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                title="Register"
                disabled={busy}
                secondary={!registering}
                onPress={() => {
                  setRegistering(true);
                  setPassword('');
                  setShow(false);
                  setNotice('');
                  setError('');
                }}
              />
            </View>
          </View>
          {notice ? (
            <View style={a.success}>
              <Text accessibilityLiveRegion="polite" style={a.successText}>
                {notice}
              </Text>
            </View>
          ) : null}
          {error ? (
            <ErrorBox error={error} retry={() => setRestoreRetry(r => r + 1)} />
          ) : null}
          <View>
            {registering ? (
              <Input
                label="Full name"
                value={name}
                disabled={busy}
                onChange={setName}
                placeholder="Your full name"
                maxLength={100}
              />
            ) : null}
            <Input
              label="Email address"
              type="email"
              value={email}
              disabled={busy}
              onChange={setEmail}
              placeholder="you@gmail.com"
              maxLength={254}
            />
            <View style={s.field}>
              <View style={s.between}>
                <Text style={s.label}>Password</Text>
                <Pressable
                  disabled={busy}
                  accessibilityRole="button"
                  onPress={() => setShow(!show)}
                >
                  <Text style={s.link}>{show ? 'Hide' : 'Show'}</Text>
                </Pressable>
              </View>
              <TextInput
                accessibilityLabel="Password"
                style={s.input}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!show}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!busy}
                textContentType={registering ? 'newPassword' : 'password'}
                autoComplete={registering ? 'new-password' : 'current-password'}
              />
              {registering ? (
                <Text style={s.muted}>Use at least 8 characters.</Text>
              ) : null}
            </View>
            {registering ? (
              <View style={s.field}>
                <Text style={s.label}>Confirm password</Text>
                <TextInput
                  accessibilityLabel="Confirm password"
                  style={s.input}
                  value={confirm}
                  onChangeText={setConfirm}
                  secureTextEntry={!show}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!busy}
                  textContentType="newPassword"
                  autoComplete="new-password"
                />
              </View>
            ) : null}
          </View>
          <Button
            accessibilityLabel={
              registering ? 'Create account' : 'Log in to your account'
            }
            title={
              busy ? 'Please wait…' : registering ? 'Create account' : 'Log in'
            }
            disabled={busy}
            onPress={() => {
              const problem = validateCredentials(
                email,
                password,
                registering,
                confirm,
              );
              if (registering && !name.trim()) {
                setError('Enter your full name.');
                return;
              }
              if (problem) {
                setError(problem);
                return;
              }
              run(
                () => emailSignIn(email, password, registering, name),
                registering,
              );
            }}
          />
          {!registering ? (
            <Button
              title="Forgot password?"
              secondary
              disabled={busy}
              onPress={async () => {
                setBusy(true);
                setError('');
                try {
                  await resetPassword(email);
                  Alert.alert(
                    'Check your email',
                    'If an account exists, a password reset link has been sent.',
                  );
                } catch (err: any) {
                  setError(err.message);
                } finally {
                  setBusy(false);
                }
              }}
            />
          ) : null}
          <View style={s.row}>
            <View style={[s.divider, { flex: 1 }]} />
            <Text style={s.muted}>or</Text>
            <View style={[s.divider, { flex: 1 }]} />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign in with Google"
            accessibilityState={{ disabled: busy }}
            disabled={busy}
            onPress={() => run(googleSignIn)}
            style={({ pressed }) => [
              s.button,
              s.secondary,
              (busy || pressed) && s.disabled,
            ]}
          >
            <View style={s.row}>
              <Image
                source={{
                  uri: 'https://developers.google.com/identity/images/g-logo.png',
                }}
                style={{ width: 20, height: 20 }}
                resizeMode="contain"
                accessible={false}
              />
              <Text style={[s.btnText, { color: '#1f1f1f' }]}>
                Sign in with Google
              </Text>
            </View>
          </Pressable>
        </View>
        <Button
          title="Admin sign in"
          secondary
          disabled={busy}
          onPress={onAdmin}
        />
        {appVersion ? (
          <Text style={[s.muted, { textAlign: 'center' }]}>
            Version {appVersion}
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );
}
