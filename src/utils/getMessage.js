import fs from 'fs';
import path from 'path';

const loadLocale = (lang = 'en') => {
  const filePath = path.resolve('src/locales', `${lang}.json`);
  const data = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(data);
};

export const getMessage = (key, lang = 'en') => {
  const messages = loadLocale(lang);
  return messages[key] || key;
};
