// Forwards Fire TV remote key presses (D-pad, select, media keys) from
// MainActivity to JS via react-native-keyevent, so spatial navigation can
// react to them. Back still reaches the system so BackHandler works.
const { withMainActivity } = require('expo/config-plugins');
const { mergeContents } = require('@expo/config-plugins/build/utils/generateCode');

const IMPORTS = ['import android.view.KeyEvent', 'import com.github.kevinejohn.keyevent.KeyEventModule'];

const BODY = [
  'override fun onKeyDown(keyCode: Int, event: KeyEvent): Boolean {',
  '  if (keyCode == KeyEvent.KEYCODE_BACK) return super.onKeyDown(keyCode, event)',
  '  KeyEventModule.getInstance().onKeyDownEvent(keyCode, event)',
  '  super.onKeyDown(keyCode, event)',
  '  return true',
  '}',
  '',
  'override fun onKeyUp(keyCode: Int, event: KeyEvent): Boolean {',
  '  if (keyCode == KeyEvent.KEYCODE_BACK) return super.onKeyUp(keyCode, event)',
  '  KeyEventModule.getInstance().onKeyUpEvent(keyCode, event)',
  '  super.onKeyUp(keyCode, event)',
  '  return true',
  '}',
];

function withKeyEvent(config) {
  return withMainActivity(config, (cfg) => {
    let src = cfg.modResults.contents;
    src = mergeContents({
      tag: 'storyloom-keyevent-import',
      src,
      newSrc: IMPORTS.join('\n'),
      anchor: /^import /m,
      offset: 0,
      comment: '//',
    }).contents;
    src = mergeContents({
      tag: 'storyloom-keyevent-body',
      src,
      newSrc: BODY.join('\n'),
      anchor: /class MainActivity/,
      offset: 1,
      comment: '//',
    }).contents;
    cfg.modResults.contents = src;
    return cfg;
  });
}

module.exports = withKeyEvent;
