// Kelimelerin farklı yazımlarını da yakalamak için (örn: salak, salaak)
// basit bir regex dönüşümü yapıyoruz.
const createRegex = (word: string) => {
  const pattern = word.replace(/a/gi, '[aâ]').replace(/i/gi, '[iıî]').replace(/u/gi, '[uüû]').replace(/o/gi, '[oöô]').replace(/c/gi, '[cç]').replace(/s/gi, '[sş]').replace(/g/gi, '[gğ]');
  return new RegExp(`\\b${pattern}\\b`, 'i');
};

const profanityList: string[] = [
  'amk', 'aptal', 'salak', 'oç', 'göt', 'sik', 'sikerim', 'yarak', 'yarrak', 'aq',
  // Buraya istediğin kadar küfür, argo veya yasaklı kelime ekleyebilirsin
];

const profanityRegexList = profanityList.map(createRegex);

export const containsProfanity = (text: string): boolean => {
  return profanityRegexList.some(regex => regex.test(text));
};