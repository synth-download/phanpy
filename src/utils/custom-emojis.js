import Fuse from 'fuse.js';
import utfData from 'emojibase-data/en/compact.json';
import utfShortcodes from 'emojibase-data/en/shortcodes/github.json'
import utfGroups from 'emojibase-data/meta/groups.json';

import pmem from './pmem';

function remapEmojiData() {
  const remapped = utfData.map(emoji => {
    const shortcodes = utfShortcodes[emoji.hexcode]
    return {
      shortcode: Array.isArray(shortcodes) ? shortcodes[0] : shortcodes,
      unicode: emoji.unicode,
      url: null,
      static_url: null,
      visible_in_picker: true,
      category: emoji.group != undefined ? `--${utfGroups.groups[emoji.group]}--` : null,
      __group: emoji.group
    };
  });
  remapped.sort((a, b) => (a.__group ?? Infinity) - (b.__group ?? Infinity));
  return remapped;
}

const UNICODE_EMOJIS = remapEmojiData();

async function _getCustomEmojis(instance, masto) {
  const emojis = await masto.v1.customEmojis.list();
  const visibleEmojis = emojis.filter((e) => e.visibleInPicker);

  const allEmojis = [...UNICODE_EMOJIS, ...visibleEmojis];

  const searcher = new Fuse(allEmojis, {
    keys: ['shortcode'],
    findAllMatches: true,
  });
  return [allEmojis, searcher];
}

const getCustomEmojis = pmem(_getCustomEmojis, {
  // Limit by time to reduce memory usage
  // Cached by instance
  matchesArg: (cacheKeyArg, keyArg) => cacheKeyArg.instance === keyArg.instance,
  maxAge: 30 * 60 * 1000, // 30 minutes
});

export { getCustomEmojis, _getCustomEmojis };
export default getCustomEmojis;
