import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { api } from './api';
import { Button, Check, ErrorBox, Input, Loading, s } from './ui';
import Registration from './Registration';
const essential = ['familyHeadName', 'district', 'villageName', 'members'];
export default function FormEditor({ community, token }: any) {
  const [sections, setSections] = useState<any[]>([]),
    [config, setConfig] = useState<any>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [retry, setRetry] = useState(0),
    [step, setStep] = useState(0),
    [preview, setPreview] = useState(false);
  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    api(
      `/communities/${community._id}/forms`,
      { token, communityId: community._id },
      'GET',
      undefined,
      ctrl.signal,
    )
      .then(data => {
        const version =
          [...data.versions]
            .filter(
              (v: any) =>
                v.status === 'DRAFT' && v.version > data.activeVersion,
            )
            .sort((a: any, b: any) => b.version - a.version)[0] ||
          data.versions.find((v: any) => v.version === data.activeVersion);
        if (!version?.sections?.length)
          throw new Error('The form configuration is unavailable.');
        setConfig(data);
        setSections(version.sections);
        setError('');
        setStep(0);
      })
      .catch(err => {
        if (!ctrl.signal.aborted) setError(err.message);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [community._id, token, retry]);
  const section = sections[step];
  const updateSection = (patch: any) =>
    setSections(old =>
      old.map((sec, i) => (i === step ? { ...sec, ...patch } : sec)),
    );
  const updateField = (i: number, patch: any) =>
    updateSection({
      fields: section.fields.map((f: any, n: number) =>
        n === i ? { ...f, ...patch } : f,
      ),
    });
  const save = async (publish: boolean) => {
    setBusy(true);
    try {
      const saved = await api(
        `/communities/${community._id}/forms/drafts`,
        { token, communityId: community._id },
        'POST',
        { sections },
      );
      if (publish) {
        const draft = [...saved.versions]
          .filter((v: any) => v.status === 'DRAFT')
          .sort((a: any, b: any) => b.version - a.version)[0];
        await api(
          `/communities/${community._id}/forms/${draft._id}/publish`,
          { token, communityId: community._id },
          'POST',
        );
        setRetry(r => r + 1);
      } else setConfig(saved);
      Alert.alert(
        publish ? 'Published' : 'Draft saved',
        publish
          ? 'The website and mobile registration now use the published form.'
          : 'The published registration form is unchanged.',
      );
    } catch (err: any) {
      Alert.alert('Could not save', err.message);
    } finally {
      setBusy(false);
    }
  };
  if (loading) return <Loading label="Loading registration form…" />;
  if (error)
    return <ErrorBox error={error} retry={() => setRetry(r => r + 1)} />;
  if (preview)
    return (
      <View style={{ flex: 1 }}>
        <Button
          title="← Return to editing"
          secondary
          onPress={() => setPreview(false)}
        />
        <Registration previewForm={{ sections }} previewCommunity={community} />
      </View>
    );
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={s.body}
    >
      <Text style={s.overline}>
        FORM CONFIGURATION · PUBLISHED VERSION {config?.activeVersion}
      </Text>
      <Text style={s.h1}>Registration form</Text>
      <Text style={s.muted}>
        {community.name} · Changes affect this community’s website and mobile
        form when published.
      </Text>
      <View style={s.row}>
        <Button
          title="Preview changes"
          secondary
          disabled={busy}
          onPress={() => setPreview(true)}
        />
        <Button
          title="Save draft"
          secondary
          disabled={busy}
          onPress={() => save(false)}
        />
        <Button
          title={busy ? 'Saving…' : 'Save & publish'}
          disabled={busy}
          onPress={() =>
            Alert.alert(
              'Publish form changes?',
              'New registrations on the website and app will use this version.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Publish', onPress: () => save(true) },
              ],
            )
          }
        />
      </View>
      <Input
        label="Section"
        type="select"
        options={sections.map((sec, i) => `${i + 1}. ${sec.title}`)}
        value={`${step + 1}. ${section?.title}`}
        disabled={busy}
        onChange={(x: string) => setStep(Number(x.split('.')[0]) - 1)}
      />
      {section && (
        <>
          <View style={s.card}>
            <Input
              label="Section title"
              value={section.title}
              maxLength={120}
              disabled={busy}
              onChange={(x: string) => updateSection({ title: x })}
            />
            <Input
              label="Description"
              type="textarea"
              value={section.description}
              maxLength={300}
              disabled={busy}
              onChange={(x: string) => updateSection({ description: x })}
            />
            <Check
              label="Show this section"
              value={section.enabled !== false}
              disabled={
                busy ||
                section.fields.some((f: any) => essential.includes(f.key))
              }
              onChange={(x: boolean) => updateSection({ enabled: x })}
            />
          </View>
          {section.fields.map((f: any, i: number) => (
            <View key={f.key} style={s.card}>
              <Text style={s.overline}>
                QUESTION {i + 1} · {f.key}
              </Text>
              <Input
                label="Question label"
                value={f.label}
                maxLength={120}
                disabled={busy}
                onChange={(x: string) => updateField(i, { label: x })}
              />
              {!['members', 'location', 'support', 'contribution'].includes(
                f.type,
              ) && (
                <Input
                  label="Answer format"
                  type="select"
                  options={[
                    'text',
                    'textarea',
                    'phone',
                    'email',
                    'number',
                    'date',
                    'select',
                    'checkbox',
                    'checkbox-group',
                  ]}
                  value={f.type}
                  disabled={busy}
                  onChange={(x: string) => updateField(i, { type: x })}
                />
              )}
              {['select', 'checkbox-group'].includes(f.type) && (
                <Input
                  label="Choices (one per line)"
                  type="textarea"
                  value={(f.options || []).join('\n')}
                  disabled={busy}
                  onChange={(x: string) =>
                    updateField(i, { options: x.split('\n') })
                  }
                />
              )}
              <Check
                label="Required"
                value={f.required}
                disabled={busy || essential.includes(f.key)}
                onChange={(x: boolean) => updateField(i, { required: x })}
              />
              <Check
                label="Show this question"
                value={f.visible !== false}
                disabled={busy || essential.includes(f.key)}
                onChange={(x: boolean) => updateField(i, { visible: x })}
              />
              <Input
                label="Help text (optional)"
                value={f.helpText}
                maxLength={300}
                disabled={busy}
                onChange={(x: string) => updateField(i, { helpText: x })}
              />
              <Button
                title="Remove question"
                secondary
                disabled={busy || essential.includes(f.key)}
                onPress={() =>
                  updateSection({
                    fields: section.fields.filter(
                      (_: any, n: number) => n !== i,
                    ),
                  })
                }
              />
            </View>
          ))}
          <Button
            title="+ Add question"
            secondary
            disabled={busy}
            onPress={() =>
              updateSection({
                fields: [
                  ...section.fields,
                  {
                    key: `custom_${Date.now()}`,
                    label: 'New question',
                    type: 'text',
                    required: false,
                    visible: true,
                    order:
                      Math.max(
                        0,
                        ...section.fields.map((f: any) => f.order || 0),
                      ) + 1,
                    options: [],
                  },
                ],
              })
            }
          />
        </>
      )}
      <Button
        title="+ Add section"
        secondary
        disabled={busy}
        onPress={() => {
          setSections(old => [
            ...old,
            {
              key: `section_${Date.now()}`,
              title: 'Additional information',
              description: '',
              order: old.length + 1,
              enabled: true,
              fields: [],
            },
          ]);
          setStep(sections.length);
        }}
      />
    </ScrollView>
  );
}
