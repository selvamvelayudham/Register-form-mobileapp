import directory from './data/urbanLocalBodies.json';

// LGD snapshot 9 October 2026: type 4 corporation, 5 municipality, 7 town panchayat.
const types: Record<string, number> = {
  Corporation: 4,
  Municipality: 5,
  'Town Panchayat': 7,
};
const aliases: Record<string, string> = {
  chengalpat: 'chengalpattu',
  kanchipuram: 'kancheepuram',
  kanyakumari: 'kanniyakumari',
  nilgiris: 'thenilgiris',
  thiruvannamalai: 'tiruvannamalai',
  tiruvallur: 'thiruvallur',
  tiruvarur: 'thiruvarur',
  thirupathur: 'tirupathur',
  tirupattur: 'tirupathur',
  tiruppathur: 'tirupathur',
  thiruchirappalli: 'tiruchirappalli',
  tiruchirapalli: 'tiruchirappalli',
  trichy: 'tiruchirappalli',
  thoothukudi: 'thoothukkudi',
  tuticorin: 'thoothukkudi',
  villupuram: 'viluppuram',
  sivagangai: 'sivaganga',
};
export function districtKey(name: string) {
  const key = (name || '')
    .toLowerCase()
    .replace(/district$/i, '')
    .replace(/[^a-z]/g, '');
  return aliases[key] || key;
}
export function urbanChoices(district: string, administrativeType: string) {
  if (!district || !types[administrativeType]) return [];
  return directory
    .filter(
      (row: any) =>
        row[1] === types[administrativeType] &&
        row[2].some(
          (name: string) => districtKey(name) === districtKey(district),
        ),
    )
    .map((row: any) => ({
      _id: `lgd:${row[0]}`,
      nameEnglish: row[3],
      lgdCode: row[0],
    }));
}
