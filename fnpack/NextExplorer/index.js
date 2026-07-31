import { createI18n } from 'vue-i18n';

const localeModules = import.meta.glob('./locales/*.json', { eager: true });

const messages = Object.fromEntries(
  Object.entries(localeModules).map(([path, mod]) => {
    const match = path.match(/\.\/locales\/(.*)\.json$/);
    if (!match) return [path, mod?.default ?? mod];
    return [match[1], mod?.default ?? mod];
  })
);

const preferredLocaleOrder = [
  'de',
  'en',
  'es',
  'fr',
  'hi',
  'it',
  'ko',
  'pl',
  'ro',
  'ru',
  'sv',
  'zh-CN',
  'zh-TW',
];

export const supportedLocaleOptions = [
  ...preferredLocaleOrder.filter((code) => Object.prototype.hasOwnProperty.call(messages, code)),
  ...Object.keys(messages)
    .filter((code) => !preferredLocaleOrder.includes(code))
    .sort(),
].map((code) => ({ code }));

export const supportedLocales = supportedLocaleOptions.map(({ code }) => code);

function detectLocale(supportedLocales) {
  try {
    const saved = localStorage.getItem('locale');
    if (saved && supportedLocales.includes(saved)) return saved;
  } catch (_) {
    // Ignore localStorage errors (e.g., in private browsing mode)
  }

  const prefs =
    typeof navigator !== 'undefined' &&
    Array.isArray(navigator.languages) &&
    navigator.languages.length
      ? navigator.languages
      : [typeof navigator !== 'undefined' ? navigator.language : 'en'];

  // 规范化：转小写、去空
  const normalized = prefs
    .filter(Boolean)
    .map((l) => l.toLowerCase().trim())
    .filter(Boolean);

  // 构建大小写不敏感映射：小写代码 -> 原始代码
  const localeMap = Object.fromEntries(
    supportedLocales.map((code) => [code.toLowerCase(), code])
  );

  // 构建基础语言到首选变体的映射（按 preferredLocaleOrder 排序）
  const baseMap = {};
  for (const code of supportedLocales) {
    const base = code.split('-')[0].toLowerCase();
    if (!baseMap[base]) baseMap[base] = [];
    baseMap[base].push(code);
  }
  // 对每个基础语言，按 preferredLocaleOrder 排序
  for (const base in baseMap) {
    baseMap[base].sort((a, b) => {
      const idxA = preferredLocaleOrder.indexOf(a);
      const idxB = preferredLocaleOrder.indexOf(b);
      if (idxA === -1 && idxB === -1) return a.localeCompare(b);
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });
  }

  // 按浏览器语言优先级遍历
  for (const p of normalized) {
    // 1. 完整匹配（不区分大小写）
    if (localeMap[p]) return localeMap[p];

    // 2. 基础语言匹配（如 'zh'）
    const base = p.split('-')[0];
    if (baseMap[base] && baseMap[base].length > 0) {
      // 返回该基础语言的首选变体（按 preferredLocaleOrder 排序后第一个）
      return baseMap[base][0];
    }
  }

  // 所有匹配失败，默认使用简体中文
  return 'en';
}

const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: detectLocale(supportedLocales),
  fallbackLocale: 'en',
  messages,
});

export default i18n;
