import React, { useEffect, useState } from 'react';
import {
  Alert,
  AppState,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { api, sessionStore } from './src/api';
import { Button, Input, Loading, s } from './src/ui';
import Registration from './src/Registration';
import Admin from './src/Admin';
export default function App() {
  const [screen, setScreen] = useState('register'),
    [session, setSession] = useState<any>(null),
    [restoring, setRestoring] = useState(true),
    [username, setUsername] = useState('Adminshree'),
    [password, setPassword] = useState(''),
    [busy, setBusy] = useState(false);
  const logout = () => {
    sessionStore.clear().catch(() => {});
    setSession(null);
    setPassword('');
    setScreen('login');
  };
  useEffect(() => {
    let alive = true;
    sessionStore
      .read()
      .then(async (raw: string | null) => {
        if (!raw) return;
        const saved = JSON.parse(raw);
        if (!saved.token || saved.expiresAt <= Date.now()) {
          await sessionStore.clear();
          return;
        }
        const admin = await api('/admin/me', { token: saved.token });
        if (alive) setSession({ ...saved, admin });
      })
      .catch(() => sessionStore.clear().catch(() => {}))
      .finally(() => {
        if (alive) setRestoring(false);
      });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (!session) return;
    const expire = () => {
      if (session.expiresAt <= Date.now()) {
        logout();
        Alert.alert('Session expired', 'Please sign in again.');
      }
    };
    const timer = setTimeout(
      expire,
      Math.max(0, session.expiresAt - Date.now()),
    );
    const sub = AppState.addEventListener('change', x => {
      if (x === 'active') expire();
    });
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, [session]);
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen === 'register') return false;
      if (screen === 'admin') {
        Alert.alert('Leave workspace?', 'Return to family registration?', [
          { text: 'Stay', style: 'cancel' },
          { text: 'Return', onPress: () => setScreen('register') },
        ]);
      } else setScreen('register');
      return true;
    });
    return () => sub.remove();
  }, [screen]);
  const login = async () => {
    if (!username.trim() || !password) {
      Alert.alert('Sign in', 'Enter your username and password.');
      return;
    }
    setBusy(true);
    try {
      const result = await api('/admin/login', {}, 'POST', {
        username: username.trim(),
        password,
      });
      let expiry = Date.now() + 3600000;
      try {
        const payload = JSON.parse(
          (globalThis as any).atob(
            result.token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'),
          ),
        );
        if (payload.exp) expiry = Math.min(expiry, payload.exp * 1000);
      } catch {}
      const saved = {
        token: result.token,
        admin: result.admin,
        expiresAt: expiry,
      };
      await sessionStore.save(saved);
      setSession(saved);
      setPassword('');
      setScreen('admin');
    } catch (err: any) {
      Alert.alert('Sign in failed', err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <SafeAreaProvider>
      <SafeAreaView style={s.screen}>
        <StatusBar barStyle="dark-content" />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {restoring ? (
            <Loading label="Preparing Sangam…" />
          ) : screen === 'register' ? (
            <Registration
              onAdmin={() => setScreen(session ? 'admin' : 'login')}
            />
          ) : screen === 'admin' && session ? (
            <Admin
              session={session}
              onLogout={logout}
              onRegister={() => {
                setScreen('register');
              }}
            />
          ) : (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={[
                s.body,
                { flexGrow: 1, justifyContent: 'center' },
              ]}
            >
              <Text style={s.brand}>Sangam</Text>
              <Text style={s.overline}>COMMUNITY RECORDS</Text>
              <View style={[s.card, s.panel]}>
                <Text style={s.h1}>Admin sign in</Text>
                <Text style={s.muted}>
                  Sign in to manage your community’s family records.
                </Text>
                <Input
                  label="Username"
                  value={username}
                  disabled={busy}
                  onChange={setUsername}
                />
                <View style={s.field}>
                  <Text style={s.label}>Password</Text>
                  <Password value={password} change={setPassword} busy={busy} />
                </View>
                <Button
                  title={busy ? 'Signing in…' : 'Sign in →'}
                  disabled={busy}
                  onPress={login}
                />
                <Button
                  title="← Family registration"
                  secondary
                  disabled={busy}
                  onPress={() => setScreen('register')}
                />
              </View>
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
import { TextInput } from 'react-native';
function Password({ value, change, busy }: any) {
  const [show, setShow] = useState(false);
  return (
    <View style={s.row}>
      <TextInput
        accessibilityLabel="Password"
        style={[s.input, { flex: 1 }]}
        value={value}
        onChangeText={change}
        secureTextEntry={!show}
        editable={!busy}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Button
        title={show ? 'Hide' : 'Show'}
        secondary
        disabled={busy}
        onPress={() => setShow(!show)}
      />
    </View>
  );
}
