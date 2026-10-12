import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, query } from './api';
export const colors = {
  ink: '#282c34',
  muted: '#68707a',
  accent: '#7a352f',
  bg: '#f4f5f7',
  border: '#dbdee5',
};
export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    padding: 18,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  brand: {
    fontSize: 27,
    fontWeight: '700',
    letterSpacing: -1,
    color: colors.ink,
  },
  sub: { fontSize: 11, color: colors.muted, marginTop: 3 },
  body: { padding: 18, paddingBottom: 40, gap: 18 },
  h1: { fontSize: 27, fontWeight: '600', color: colors.ink },
  h2: { fontSize: 19, fontWeight: '600', color: colors.ink },
  text: { fontSize: 15, color: colors.ink, lineHeight: 23 },
  muted: { fontSize: 13, color: colors.muted, lineHeight: 20 },
  overline: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.muted,
    letterSpacing: 1.2,
  },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    gap: 18,
  },
  panel: { borderTopWidth: 3, borderTopColor: '#3d424b' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  between: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  field: { gap: 8, marginBottom: 18 },
  label: { fontSize: 14, fontWeight: '600', color: '#4a505b', lineHeight: 21 },
  input: {
    borderWidth: 1,
    borderColor: '#cdd1da',
    borderRadius: 8,
    paddingHorizontal: 13,
    paddingVertical: 11,
    minHeight: 48,
    backgroundColor: '#fff',
    fontSize: 15,
    color: colors.ink,
  },
  button: {
    minHeight: 46,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  secondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cdd1da',
  },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  error: { color: '#9b3029', fontSize: 14, lineHeight: 21 },
  badge: {
    backgroundColor: '#f4efed',
    color: colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 11,
    fontWeight: '600',
    alignSelf: 'flex-start',
  },
  divider: { height: 1, backgroundColor: colors.border },
  check: {
    width: 24,
    height: 24,
    borderWidth: 1,
    borderColor: '#a1a6af',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chosen: { backgroundColor: colors.accent, borderColor: colors.accent },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: { backgroundColor: '#f4efed', borderBottomColor: colors.accent },
  link: { color: colors.accent, fontSize: 14, fontWeight: '600' },
  disabled: { opacity: 0.45 },
  empty: { paddingVertical: 28, alignItems: 'center', gap: 12 },
  option: { padding: 16, borderBottomWidth: 1, borderColor: colors.border },
  stat: {
    flexGrow: 1,
    flexBasis: '44%',
    padding: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    gap: 10,
  },
  count: { fontSize: 30, color: colors.ink, fontWeight: '600' },
});
export function Button({
  title,
  accessibilityLabel,
  onPress,
  secondary = false,
  disabled = false,
}: {
  title: string;
  accessibilityLabel?: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.button,
        secondary && s.secondary,
        (disabled || pressed) && s.disabled,
      ]}
    >
      <Text style={[s.btnText, secondary && { color: colors.ink }]}>
        {title}
      </Text>
    </Pressable>
  );
}
export function Check({ label, value, onChange, disabled = false }: any) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: Boolean(value), disabled }}
      disabled={disabled}
      onPress={() => onChange(!value)}
      style={[
        s.row,
        { alignItems: 'flex-start', marginVertical: 6 },
        disabled && s.disabled,
      ]}
    >
      <View style={[s.check, value && s.chosen]}>
        <Text style={{ color: '#fff' }}>{value ? '✓' : ''}</Text>
      </View>
      <Text style={[s.text, { flex: 1 }]}>{label}</Text>
    </Pressable>
  );
}
export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={s.empty}>
      <ActivityIndicator color={colors.accent} />
      <Text style={s.muted}>{label}</Text>
    </View>
  );
}
export function ErrorBox({ error, retry }: any) {
  return (
    <View style={s.card}>
      <Text accessibilityRole="alert" style={s.error}>
        {error}
      </Text>
      {retry && <Button title="Try again" onPress={retry} secondary />}
    </View>
  );
}
export function Input({
  label,
  required,
  type = 'text',
  options = [],
  value,
  onChange,
  placeholder,
  helpText,
  disabled = false,
  maxLength,
}: any) {
  if (type === 'select')
    return (
      <Select
        label={label}
        required={required}
        value={value}
        items={options.map((x: string) => ({ _id: x, name: x }))}
        onSelect={(x: any) => onChange(x._id)}
        disabled={disabled}
      />
    );
  if (type === 'checkbox-group') {
    const selected = Array.isArray(value)
      ? value
      : value
      ? String(value).split(', ')
      : [];
    return (
      <View style={s.field}>
        <Text style={s.label}>
          {label}
          {required ? ' *' : ''}
        </Text>
        {options.map((x: string) => (
          <Check
            key={x}
            label={x}
            disabled={disabled}
            value={selected.includes(x)}
            onChange={(checked: boolean) =>
              onChange(
                checked
                  ? x === 'None'
                    ? ['None']
                    : [...selected.filter((v: string) => v !== 'None'), x]
                  : selected.filter((v: string) => v !== x),
              )
            }
          />
        ))}
      </View>
    );
  }
  if (type === 'checkbox')
    return (
      <Check
        label={`${label}${required ? ' *' : ''}`}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
    );
  return (
    <View style={s.field}>
      <Text style={s.label}>
        {label}
        {required && <Text style={{ color: colors.accent }}> *</Text>}
      </Text>
      <TextInput
        accessibilityLabel={label}
        editable={!disabled}
        value={String(value ?? '')}
        onChangeText={onChange}
        placeholder={
          placeholder ||
          (type === 'phone'
            ? '10-digit mobile number'
            : type === 'date'
            ? 'YYYY-MM-DD'
            : undefined)
        }
        placeholderTextColor="#999ea8"
        style={[
          s.input,
          type === 'textarea' && { height: 110, textAlignVertical: 'top' },
          disabled && s.disabled,
        ]}
        multiline={type === 'textarea'}
        keyboardType={
          type === 'phone'
            ? 'phone-pad'
            : type === 'number'
            ? 'numeric'
            : type === 'email'
            ? 'email-address'
            : 'default'
        }
        autoCapitalize={type === 'email' ? 'none' : 'sentences'}
        autoCorrect={type !== 'email'}
        maxLength={
          maxLength ||
          (type === 'textarea' ? 1000 : type === 'phone' ? 16 : 160)
        }
      />
      {(helpText || type === 'phone') && (
        <Text style={s.muted}>{helpText || '10 digits; +91 is optional.'}</Text>
      )}
    </View>
  );
}
const nameOf = (x: any) =>
  x.displayName || x.nameEnglish || x.name || x.code || '';
function SelectInner({
  label,
  value,
  items = [],
  endpoint,
  params = {},
  onSelect,
  disabled = false,
  required = false,
  allowUnlisted = false,
}: any) {
  const [open, setOpen] = useState(false),
    [search, setSearch] = useState(''),
    [page, setPage] = useState(1),
    [rows, setRows] = useState<any[]>([]),
    [pages, setPages] = useState(0),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(''),
    [retry, setRetry] = useState(0);
  const scope = query(params);
  useEffect(() => {
    if (!open || !endpoint) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    const timer = setTimeout(
      () =>
        api(
          `/master/${endpoint}?${query({ limit: 100, page, search })}&${scope}`,
          {},
          'GET',
          undefined,
          controller.signal,
        )
          .then(data => {
            setRows(old => (page === 1 ? data.items : [...old, ...data.items]));
            setPages(data.pagination.pages);
          })
          .catch(err => {
            if (!controller.signal.aborted) setError(err.message);
          })
          .finally(() => {
            if (!controller.signal.aborted) setLoading(false);
          }),
      search ? 250 : 0,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, endpoint, scope, search, page, retry]);
  const all = [
    ...items.filter((x: any) =>
      nameOf(x).toLowerCase().includes(search.toLowerCase()),
    ),
    ...rows,
  ];
  return (
    <View style={s.field}>
      <Text style={s.label}>
        {label}
        {required ? ' *' : ''}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Choose ${label}`}
        disabled={disabled}
        onPress={() => {
          setOpen(true);
          setSearch('');
          setPage(1);
          setRows([]);
        }}
        style={[s.input, s.between, disabled && s.disabled]}
      >
        <Text style={[s.text, { flex: 1 }, !value && s.muted]}>
          {value ||
            (disabled
              ? 'Select the parent location first'
              : 'Select an option')}
        </Text>
        <Text style={s.muted}>⌄</Text>
      </Pressable>
      <Modal
        visible={open}
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <SafeAreaView style={s.screen}>
          <View style={s.header}>
            <Text style={[s.h2, { flex: 1 }]}>{label}</Text>
            <Button title="Done" onPress={() => setOpen(false)} secondary />
          </View>
          <View style={{ padding: 16 }}>
            <TextInput
              accessibilityLabel={`Search ${label}`}
              style={s.input}
              placeholder="Search options"
              value={search}
              onChangeText={v => {
                setSearch(v);
                setPage(1);
                setRows([]);
              }}
            />
          </View>
          <FlatList
            keyboardShouldPersistTaps="handled"
            data={all}
            keyExtractor={(x, i) => `${x._id || x.code}-${i}`}
            renderItem={({ item }) => (
              <Pressable
                style={s.option}
                onPress={() => {
                  onSelect(item);
                  setOpen(false);
                }}
              >
                <Text style={s.text}>{nameOf(item)}</Text>
              </Pressable>
            )}
            ListEmptyComponent={
              !loading && !error ? (
                <View style={s.empty}>
                  <Text style={s.muted}>
                    No options available for this selection.
                  </Text>
                </View>
              ) : null
            }
            ListFooterComponent={
              <View style={{ padding: 16, gap: 12 }}>
                {loading && <Loading />}
                {error && (
                  <ErrorBox error={error} retry={() => setRetry(r => r + 1)} />
                )}
                {!loading && !error && page < pages && (
                  <Button
                    title="Load more options"
                    secondary
                    onPress={() => setPage(p => p + 1)}
                  />
                )}
                {allowUnlisted && (
                  <Button
                    title="My location is not listed"
                    secondary
                    onPress={() => {
                      onSelect({ _id: '', nameEnglish: 'Not listed' });
                      setOpen(false);
                    }}
                  />
                )}
              </View>
            }
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}
export function Select(props: any) {
  return (
    <SelectInner
      key={JSON.stringify([props.endpoint, props.params, props.disabled])}
      {...props}
    />
  );
}
