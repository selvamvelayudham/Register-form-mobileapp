import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MemberSession } from './memberAuth';
import { Button, colors, s } from './ui';
import { REGISTRATION_COMMUNITY } from './registrationConfig';

function initials(member: MemberSession) {
  const name = member.displayName?.trim();
  return name
    ? name
        .split(/\s+/)
        .slice(0, 2)
        .map(word => word[0])
        .join('')
        .toUpperCase()
    : (member.email[0] || 'S').toUpperCase();
}
export function ProfileButton({
  member,
  onPress,
  disabled,
}: {
  member: MemberSession;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open profile"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [accountStyles.avatar, pressed && s.disabled]}
    >
      <Text style={accountStyles.initials}>{initials(member)}</Text>
    </Pressable>
  );
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={accountStyles.detail}>
      <Text style={s.muted}>{label}</Text>
      <Text selectable style={s.text}>
        {value}
      </Text>
    </View>
  );
}
export default function MemberProfile({
  member,
  visible,
  onClose,
  onLogout,
  onAdmin,
}: {
  member: MemberSession;
  visible: boolean;
  onClose: () => void;
  onLogout: () => Promise<void>;
  onAdmin: () => void;
}) {
  const [loggingOut, setLoggingOut] = useState(false);
  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={() => {
        if (!loggingOut) onClose();
      }}
    >
      <SafeAreaView style={s.screen}>
        <View style={s.header}>
          <Text accessibilityRole="header" style={s.h2}>
            Profile
          </Text>
          <Button
            title="Close profile"
            secondary
            disabled={loggingOut}
            onPress={onClose}
          />
        </View>
        <ScrollView contentContainerStyle={accountStyles.profileBody}>
          <View style={accountStyles.identity}>
            <View style={[accountStyles.avatar, accountStyles.largeAvatar]}>
              <Text style={accountStyles.largeInitials}>
                {initials(member)}
              </Text>
            </View>
            <Text style={[s.h1, accountStyles.center]}>
              {member.displayName || 'Sangam member'}
            </Text>
            <Text selectable style={[s.text, accountStyles.center]}>
              {member.email}
            </Text>
            <Text style={s.badge}>MEMBER ACCOUNT</Text>
          </View>
          <View style={[s.card, accountStyles.details]}>
            <Text style={s.h2}>Account details</Text>
            <Detail
              label="Full name"
              value={member.displayName || 'Not provided'}
            />
            <Detail label="Email address" value={member.email} />
            <Detail label="Community" value={REGISTRATION_COMMUNITY.name} />
            <Detail
              label="Sign-in method"
              value={member.signInMethod || 'Member account'}
            />
            <Detail label="Account ID" value={member.uid} />
          </View>
          <Text style={s.muted}>
            Your family registration progress is saved on this phone. Log in
            with this account to continue where you left off.
          </Text>
          <Button
            title="Admin sign in"
            secondary
            disabled={loggingOut}
            onPress={onAdmin}
          />
          <Button
            title={loggingOut ? 'Logging out…' : 'Logout'}
            disabled={loggingOut}
            onPress={async () => {
              setLoggingOut(true);
              try {
                await onLogout();
              } finally {
                setLoggingOut(false);
              }
            }}
          />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
export const accountStyles = StyleSheet.create({
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f5e9e5',
    borderWidth: 1,
    borderColor: '#e7c9c2',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  initials: { color: colors.accent, fontSize: 17, fontWeight: '700' },
  largeAvatar: { width: 88, height: 88, borderRadius: 44 },
  largeInitials: { color: colors.accent, fontSize: 30, fontWeight: '700' },
  profileBody: {
    padding: 24,
    paddingBottom: 40,
    gap: 22,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  identity: { alignItems: 'center', gap: 12, paddingVertical: 12 },
  center: { textAlign: 'center' },
  details: { borderRadius: 20, gap: 0 },
  detail: {
    paddingVertical: 14,
    gap: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  authBody: { backgroundColor: '#faf7f5', paddingVertical: 32 },
  brandBlock: { gap: 8, alignItems: 'center', paddingBottom: 8 },
  brandMark: {
    backgroundColor: colors.accent,
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  brandLetter: { color: '#fff', fontSize: 29, fontWeight: '700' },
  brandTitle: { color: colors.accent, fontSize: 32 },
  authCard: { padding: 22, borderRadius: 24, gap: 20, borderColor: '#e8ddd8' },
  success: { padding: 14, backgroundColor: '#edf6ef', borderRadius: 12 },
  successText: { color: '#245f37', fontSize: 14, lineHeight: 21 },
});
