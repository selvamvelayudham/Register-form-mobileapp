module.exports = {
  preset: 'react-native',
  // Cold React Native component imports can exceed Jest's five-second default.
  testTimeout: 15000,
};
