const { ESLint } = require('eslint');

describe('React Native text placement', () => {
  const eslint = new ESLint();
  const rawTextErrors = results =>
    results.flatMap(result =>
      result.messages
        .filter(message => message.ruleId === 'react-native/no-raw-text')
        .map(
          message => `${result.filePath}:${message.line} ${message.message}`,
        ),
    );

  test('rejects a loose whitespace string under a View', async () => {
    const results = await eslint.lintText(
      "const Screen = () => <View>{' '}</View>;",
      { filePath: 'src/text-regression.tsx' },
    );
    expect(rawTextErrors(results)).toHaveLength(1);
  });

  test('allows spaces and text within a Text component', async () => {
    const results = await eslint.lintText(
      "const Screen = () => <View><Text>Hello{' '}world</Text></View>;",
      { filePath: 'src/text-regression.tsx' },
    );
    expect(rawTextErrors(results)).toEqual([]);
  });

  test('all app screens are free of raw text, including dropdown and admin branches', async () => {
    const results = await eslint.lintFiles(['App.tsx', 'src/**/*.tsx']);
    expect(rawTextErrors(results)).toEqual([]);
  });
});
