import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  AppState,
  FlatList,
  ScrollView,
  Share,
  Text,
  View,
} from 'react-native';
import { api, download, query } from './api';
import { Button, ErrorBox, Input, Loading, Select, s } from './ui';
import { RecordDetails } from './Registration';
import FormEditor from './FormEditor';
const reportRoles = [
  'SUPER_ADMIN',
  'COMMUNITY_ADMIN',
  'COMMUNITY_MANAGER',
  'VIEWER',
];
const editorRoles = ['SUPER_ADMIN', 'COMMUNITY_ADMIN'];
export default function Admin({ session, onLogout, onRegister }: any) {
  const { token, admin } = session;
  const [communities, setCommunities] = useState<any[]>([]),
    [community, setCommunity] = useState<any>({
      _id: '',
      name: 'All communities',
    }),
    [mode, setMode] = useState('overview'),
    [records, setRecords] = useState<any[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [search, setSearch] = useState(''),
    [district, setDistrict] = useState(''),
    [status, setStatus] = useState(''),
    [selected, setSelected] = useState<any>(null),
    [busy, setBusy] = useState(false);
  const load = useCallback(
    async (silent = false, signal?: AbortSignal) => {
      if (!silent) setLoading(true);
      try {
        const data = await api(
          `/families?${query({ communityId: community._id })}`,
          { token, communityId: community._id },
          'GET',
          undefined,
          signal,
        );
        if (!signal?.aborted) {
          setRecords(data);
          setError('');
        }
      } catch (err: any) {
        if (!signal?.aborted) setError(err.message);
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [community._id, token],
  );
  useEffect(() => {
    const c = new AbortController();
    api('/communities', { token }, 'GET', undefined, c.signal)
      .then(setCommunities)
      .catch(err => {
        if (!c.signal.aborted) setError(err.message);
      });
    return () => c.abort();
  }, [token]);
  useEffect(() => {
    const c = new AbortController();
    setRecords([]);
    setSelected(null);
    setSearch('');
    setDistrict('');
    setStatus('');
    load(false, c.signal);
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') load(true, c.signal);
    }, 10000);
    return () => {
      c.abort();
      clearInterval(timer);
    };
  }, [load]);
  const filtered = records.filter(
    r =>
      (!district || r.district === district) &&
      (!status || r.status === status) &&
      (mode !== 'requests' || r.support?.needed) &&
      (mode !== 'contributions' || r.contribution?.willing) &&
      [
        r.familyHeadName,
        r.phoneNumber,
        r.district,
        r.block,
        r.villageName,
        r.habitation,
        ...(r.members || []).map((m: any) => m.name || m.nameAddress),
      ]
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const open = async (r: any) => {
    setBusy(true);
    try {
      setSelected(
        await api(`/families/${r._id}`, { token, communityId: r.communityId }),
      );
      setMode('families');
    } catch (err: any) {
      Alert.alert('Could not open record', err.message);
    } finally {
      setBusy(false);
    }
  };
  const verify = async () => {
    setBusy(true);
    try {
      const updated = await api(
        `/families/${selected._id}/verification`,
        { token, communityId: selected.communityId },
        'PATCH',
        { status: 'VERIFIED' },
      );
      setSelected(updated);
      load(true);
    } catch (err: any) {
      Alert.alert('Verification failed', err.message);
    } finally {
      setBusy(false);
    }
  };
  const pdf = async () => {
    setBusy(true);
    try {
      await download(
        `/families/${selected._id}/pdf`,
        `${selected.familyHeadName}.pdf`,
        { token, communityId: selected.communityId },
      );
    } catch (err: any) {
      Alert.alert('Download failed', err.message);
    } finally {
      setBusy(false);
    }
  };
  const nav = [
    ['overview', 'Overview'],
    ['families', 'Family register'],
    ['requests', 'Help requests'],
    ['contributions', 'Contributions'],
    ...(reportRoles.includes(admin.role) ? [['reports', 'Reports']] : []),
    ...(editorRoles.includes(admin.role)
      ? [['form', 'Registration form']]
      : []),
  ];
  return (
    <View style={s.screen}>
      <View style={s.header}>
        <View>
          <Text style={s.brand}>Sangam</Text>
          <Text style={s.sub}>
            {admin.username} · {admin.role.replace(/_/g, ' ')}
          </Text>
        </View>
        <Button title="Log out" secondary onPress={onLogout} />
      </View>
      <View style={{ paddingHorizontal: 18, paddingTop: 12 }}>
        <Select
          label="COMMUNITY FILTER"
          value={community.name}
          items={[{ _id: '', name: 'All communities' }, ...communities]}
          onSelect={setCommunity}
        />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ maxHeight: 60, flexGrow: 0 }}
      >
        <View style={s.row}>
          {nav.map(([k, t]) => (
            <Button
              key={k}
              title={t}
              secondary={mode !== k}
              onPress={() => {
                setMode(k);
                setSelected(null);
              }}
            />
          ))}
        </View>
      </ScrollView>
      {mode === 'form' ? (
        community._id ? (
          <FormEditor key={community._id} community={community} token={token} />
        ) : (
          <View style={s.body}>
            <ErrorBox error="Select a community above to edit its registration form." />
          </View>
        )
      ) : mode === 'reports' ? (
        <Reports token={token} open={open} />
      ) : selected ? (
        <ScrollView contentContainerStyle={s.body}>
          <Button
            title="← Back to register"
            secondary
            onPress={() => setSelected(null)}
          />
          <Text style={s.h1}>{selected.familyHeadName}</Text>
          <Text style={s.badge}>{selected.status}</Text>
          <Text selectable style={s.muted}>
            Reference: {selected._id}
          </Text>
          <Button
            title={busy ? 'Please wait…' : 'Download family PDF'}
            disabled={busy}
            onPress={pdf}
          />
          {[
            'SUPER_ADMIN',
            'COMMUNITY_ADMIN',
            'COMMUNITY_MANAGER',
            'VERIFIER',
          ].includes(admin.role) &&
            selected.status === 'PENDING' && (
              <Button title="Verify family" disabled={busy} onPress={verify} />
            )}
          <RecordDetails record={selected} />
        </ScrollView>
      ) : (
        <FlatList
          contentContainerStyle={s.body}
          data={mode === 'overview' ? filtered.slice(0, 8) : filtered}
          keyExtractor={r => r._id}
          keyboardShouldPersistTaps="handled"
          refreshing={loading}
          onRefresh={() => load()}
          ListHeaderComponent={
            <View style={{ gap: 18 }}>
              <Text style={s.overline}>COMMUNITY REGISTER</Text>
              <Text style={s.h1}>{nav.find(([k]) => k === mode)?.[1]}</Text>
              {mode === 'overview' && (
                <>
                  <View style={s.row}>
                    {[
                      ['Families registered', records.length],
                      [
                        'Family members',
                        records.reduce(
                          (n, r) => n + (r.members?.length || 0),
                          0,
                        ),
                      ],
                      [
                        'Help requested',
                        records.filter(r => r.support?.needed).length,
                      ],
                      [
                        'Ready to contribute',
                        records.filter(r => r.contribution?.willing).length,
                      ],
                    ].map(([t, n]) => (
                      <View style={s.stat} key={t}>
                        <Text style={s.muted}>{t}</Text>
                        <Text style={s.count}>{n}</Text>
                      </View>
                    ))}
                  </View>
                  {community.slug && (
                    <Button
                      title="Share registration link"
                      secondary
                      onPress={() =>
                        Share.share({
                          message: `${community.name}: https://shreeswayam.tech/register/${community.slug}`,
                        }).catch(() => {})
                      }
                    />
                  )}
                </>
              )}
              <Button
                title="+ Register a family"
                onPress={() =>
                  onRegister(community.slug || 'krishnan-community')
                }
              />
              <View style={s.card}>
                <Input
                  label="Search name, phone or place"
                  value={search}
                  onChange={setSearch}
                />
                <Input
                  label="District"
                  type="select"
                  options={[
                    'All districts',
                    ...[...new Set(records.map(r => r.district))]
                      .filter(Boolean)
                      .sort(),
                  ]}
                  value={district || 'All districts'}
                  onChange={(x: string) =>
                    setDistrict(x === 'All districts' ? '' : x)
                  }
                />
                <Input
                  label="Status"
                  type="select"
                  options={[
                    'All statuses',
                    'PENDING',
                    'VERIFIED',
                    'REJECTED',
                    'ACTIVE',
                  ]}
                  value={status || 'All statuses'}
                  onChange={(x: string) =>
                    setStatus(x === 'All statuses' ? '' : x)
                  }
                />
                <Button
                  title="Clear filters"
                  secondary
                  onPress={() => {
                    setSearch('');
                    setDistrict('');
                    setStatus('');
                  }}
                />
              </View>
              {error && <ErrorBox error={error} retry={() => load()} />}
              <Text style={s.muted}>
                {filtered.length} family records · refreshes every 10 seconds
              </Text>
              {loading && <Loading />}
            </View>
          }
          ListEmptyComponent={
            !loading && !error ? (
              <View style={s.empty}>
                <Text style={s.h2}>No family records match.</Text>
                <Text style={s.muted}>
                  Check the community, district and search filters.
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item: r }) => (
            <View style={s.card}>
              <View style={s.between}>
                <Text style={[s.h2, { flex: 1 }]}>{r.familyHeadName}</Text>
                <Text style={s.badge}>{r.status}</Text>
              </View>
              <Text style={s.muted}>
                {r.communityName} · {r.members?.length || 0} members
              </Text>
              <Text style={s.text}>{r.phoneNumber}</Text>
              <Text style={s.muted}>
                {[r.villageName, r.block, r.district]
                  .filter(Boolean)
                  .join(', ')}
              </Text>
              {mode === 'requests' && (
                <Text style={s.text}>
                  {r.support?.categories?.join(', ')} · {r.support?.priority}
                  {'\n'}
                  {r.support?.details}
                </Text>
              )}
              {mode === 'contributions' && (
                <Text style={s.text}>
                  {r.contribution?.categories?.join(', ')}
                  {'\n'}
                  {r.contribution?.details}
                </Text>
              )}
              <Button
                title="Open record →"
                secondary
                disabled={busy}
                onPress={() => open(r)}
              />
            </View>
          )}
        />
      )}
    </View>
  );
}
function Reports({ token, open }: any) {
  const empty = {
    district: '',
    communityId: '',
    status: '',
    from: '',
    to: '',
    search: '',
  };
  const [filters, setFilters] = useState(empty),
    [applied, setApplied] = useState(empty),
    [page, setPage] = useState(1),
    [data, setData] = useState<any>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [retry, setRetry] = useState(0),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const c = new AbortController();
    setLoading(true);
    api(
      `/admin/reports?${query({ ...applied, page })}`,
      { token },
      'GET',
      undefined,
      c.signal,
    )
      .then(x => {
        setData(x);
        setError('');
      })
      .catch(err => {
        if (!c.signal.aborted) setError(err.message);
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [token, applied, page, retry]);
  const update = (k: string, x: string) =>
    setFilters(old => ({ ...old, [k]: x }));
  const exportCsv = async (kind: string) => {
    setBusy(true);
    try {
      await download(
        `/admin/reports/export?${query({ ...applied, kind })}`,
        `Sangam-${kind}.csv`,
        { token },
      );
    } catch (err: any) {
      Alert.alert('Export failed', err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <ScrollView
      contentContainerStyle={s.body}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={s.h1}>District & community reports</Text>
      <View style={s.card}>
        <Input
          label="District"
          type="select"
          options={['All districts', ...(data?.districts || [])]}
          value={filters.district || 'All districts'}
          onChange={(x: string) =>
            update('district', x === 'All districts' ? '' : x)
          }
        />
        <Select
          label="Community"
          items={[
            { _id: '', name: 'All accessible communities' },
            ...(data?.communities || []),
          ]}
          value={
            data?.communities?.find((x: any) => x._id === filters.communityId)
              ?.name || 'All accessible communities'
          }
          onSelect={(x: any) => update('communityId', x._id)}
        />
        <Input
          label="Status"
          type="select"
          options={[
            'All statuses',
            'PENDING',
            'VERIFIED',
            'REJECTED',
            'ACTIVE',
          ]}
          value={filters.status || 'All statuses'}
          onChange={(x: string) =>
            update('status', x === 'All statuses' ? '' : x)
          }
        />
        {[
          ['from', 'From date'],
          ['to', 'To date'],
          ['search', 'Name / phone / village'],
        ].map(([k, label]) => (
          <Input
            key={k}
            label={label}
            type={k === 'search' ? 'text' : 'date'}
            value={(filters as any)[k]}
            onChange={(x: string) => update(k, x)}
          />
        ))}
        <Button
          title="Apply filters"
          disabled={loading}
          onPress={() => {
            if (filters.from && filters.to && filters.to < filters.from) {
              Alert.alert('Check dates', 'To date must be after From date.');
              return;
            }
            setPage(1);
            setApplied({ ...filters });
          }}
        />
        <Button
          title="Clear filters"
          secondary
          onPress={() => {
            setFilters(empty);
            setApplied({ ...empty });
            setPage(1);
          }}
        />
      </View>
      {error && <ErrorBox error={error} retry={() => setRetry(r => r + 1)} />}
      {loading ? (
        <Loading label="Loading reports…" />
      ) : (
        !error &&
        data && (
          <>
            <View style={s.row}>
              {Object.entries(data.totals).map(([k, v]: any) => (
                <View style={s.stat} key={k}>
                  <Text style={s.muted}>{k}</Text>
                  <Text style={s.count}>{v}</Text>
                </View>
              ))}
            </View>
            <Text style={s.h2}>District and community totals</Text>
            {data.summary.map((r: any) => (
              <View style={s.card} key={`${r.district}-${r.communityId}`}>
                <Text style={s.h2}>{r.district}</Text>
                <Text style={s.text}>{r.community}</Text>
                <Text style={s.muted}>
                  {r.families} families · {r.members} members
                </Text>
              </View>
            ))}
            {['summary', 'families', 'members'].map(kind => (
              <Button
                key={kind}
                title={`Download ${kind} CSV`}
                secondary
                disabled={busy}
                onPress={() => exportCsv(kind)}
              />
            ))}
            <Text style={s.h2}>
              Registered families ({data.pagination.total})
            </Text>
            {data.records.map((r: any) => (
              <View key={r._id} style={s.card}>
                <Text style={s.h2}>{r.familyHeadName}</Text>
                <Text style={s.muted}>
                  {r.community} · {r.district} · {r.status}
                </Text>
                <Text style={s.text}>{r.phoneNumber}</Text>
                <Button title="Open record" secondary onPress={() => open(r)} />
              </View>
            ))}
            {!data.records.length && (
              <Text style={s.muted}>No registrations match these filters.</Text>
            )}
            <View style={s.between}>
              <Button
                title="Previous"
                secondary
                disabled={page <= 1}
                onPress={() => setPage(p => p - 1)}
              />
              <Text style={s.muted}>
                {page} / {Math.max(1, data.pagination.pages)}
              </Text>
              <Button
                title="Next"
                secondary
                disabled={page >= data.pagination.pages}
                onPress={() => setPage(p => p + 1)}
              />
            </View>
          </>
        )
      )}
    </ScrollView>
  );
}
