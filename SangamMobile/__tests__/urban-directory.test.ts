import { districtKey, urbanChoices } from '../src/urbanLocalBodies';
import directory from '../src/data/urbanLocalBodies.json';

test('urban lists contain the correct Erode local bodies for each administrative type', () => {
  expect(
    urbanChoices('Erode', 'Town Panchayat').map(x => x.nameEnglish),
  ).toContain('Anthiyur');
  expect(
    urbanChoices('Erode', 'Municipality').map(x => x.nameEnglish),
  ).toContain('Bhavani');
  expect(urbanChoices('Erode', 'Corporation').map(x => x.nameEnglish)).toEqual([
    'Erode',
  ]);
  expect(
    urbanChoices('Erode', 'Town Panchayat').map(x => x.nameEnglish),
  ).not.toContain('Bhavani');
  expect(
    urbanChoices('Madurai', 'Corporation').map(x => x.nameEnglish),
  ).not.toContain('Erode');
});
test('district spelling aliases match live API names and unknown districts fail closed', () => {
  expect(districtKey('Villupuram')).toBe(districtKey('Viluppuram'));
  expect(urbanChoices('Kanyakumari', 'Corporation')).toEqual(
    urbanChoices('Kanniyakumari', 'Corporation'),
  );
  expect(urbanChoices('Unknown', 'Municipality')).toEqual([]);
  expect(urbanChoices('Erode', 'Village Panchayat')).toEqual([]);
});
test('all 650 snapshot records retain their LGD identity, classification and district mapping', () => {
  expect(directory).toHaveLength(650);
  expect(new Set(directory.map(x => x[0])).size).toBe(650);
  for (const row of directory) {
    expect([4, 5, 7]).toContain(row[1]);
    expect((row[2] as string[]).length).toBeGreaterThan(0);
    expect(row[3]).toBeTruthy();
  }
});
