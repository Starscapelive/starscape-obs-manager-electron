// 加密的时候一定要在尾部加一些空格, 解密的时候做处理, 以免出现特殊字符; 不想优化这一块了, 先这样吧

const version = "2.5.5";
// constants
// const b64chars = 'ABCDEFGHIJLKMNOPQRSTUVWXYZabcdefhgijklmnopqrstuvwxyz0123456789+/';
const fromCharCode = String.fromCharCode;
const eq = '='
let b64chars: any = [];
for (let i = 0; i < 64; i++) {
  b64chars.push(fromCharCode(i + 35));
}
b64chars = b64chars.reverse().join('').replace(eq, 'z');
const b64tab = function (bin) {
  const t = {};
  const l = bin.length
  for (let i = 0; i < l; i++) { t[bin.charAt(i)] = i };
  return t;
}(b64chars);
// encoder stuff
const cbUtob = function (c) {
  if (c.length < 2) {
    const cc = c.charCodeAt(0);
    return cc < 0x80 ? c
      : cc < 0x800 ? (fromCharCode(0xc0 | (cc >>> 6))
        + fromCharCode(0x80 | (cc & 0x3f)))
        : (fromCharCode(0xe0 | ((cc >>> 12) & 0x0f))
          + fromCharCode(0x80 | ((cc >>> 6) & 0x3f))
          + fromCharCode(0x80 | (cc & 0x3f)));
  } else {
    const cc = 0x10000
      + (c.charCodeAt(0) - 0xD800) * 0x400
      + (c.charCodeAt(1) - 0xDC00);
    return (fromCharCode(0xf0 | ((cc >>> 18) & 0x07))
      + fromCharCode(0x80 | ((cc >>> 12) & 0x3f))
      + fromCharCode(0x80 | ((cc >>> 6) & 0x3f))
      + fromCharCode(0x80 | (cc & 0x3f)));
  }
};
const reUtob = /[\uD800-\uDBFF][\uDC00-\uDFFFF]|[^\x00-\x7F]/g;
const utob = function (u) {
  return u.replace(reUtob, cbUtob);
};
const cbEncode = function (ccc) {
  const padlen = [0, 2, 1][ccc.length % 3]
  const ord = ccc.charCodeAt(0) << 16
    | ((ccc.length > 1 ? ccc.charCodeAt(1) : 0) << 8)
    | ((ccc.length > 2 ? ccc.charCodeAt(2) : 0))
  const chars = [
    b64chars.charAt(ord >>> 18),
    b64chars.charAt((ord >>> 12) & 63),
    padlen >= 2 ? eq : b64chars.charAt((ord >>> 6) & 63),
    padlen >= 1 ? eq : b64chars.charAt(ord & 63)
  ];
  return chars.join('');
};
const btoa = function (b) {
  return b.replace(/[\s\S]{1,3}/g, cbEncode);
};
const encode = function (u) {
  return btoa(utob(String(u)));
}
// decoder stuff
const reBtou = new RegExp([
  '[\xC0-\xDF][\x80-\xBF]',
  '[\xE0-\xEF][\x80-\xBF]{2}',
  '[\xF0-\xF7][\x80-\xBF]{3}'
].join('|'), 'g');
const cbBtou = function (cccc) {
  switch (cccc.length) {
    case 4:
      const cp = ((0x07 & cccc.charCodeAt(0)) << 18)
        | ((0x3f & cccc.charCodeAt(1)) << 12)
        | ((0x3f & cccc.charCodeAt(2)) << 6)
        | (0x3f & cccc.charCodeAt(3))
      const offset = cp - 0x10000;
      return (fromCharCode((offset >>> 10) + 0xD800)
        + fromCharCode((offset & 0x3FF) + 0xDC00));
    case 3:
      return fromCharCode(
        ((0x0f & cccc.charCodeAt(0)) << 12)
        | ((0x3f & cccc.charCodeAt(1)) << 6)
        | (0x3f & cccc.charCodeAt(2))
      );
    default:
      return fromCharCode(
        ((0x1f & cccc.charCodeAt(0)) << 6)
        | (0x3f & cccc.charCodeAt(1))
      );
  }
};
const btou = function (b) {
  return b.replace(reBtou, cbBtou);
};
const cbDecode = function (cccc) {
  const len = cccc.length
  const padlen = len % 4
  const n = (len > 0 ? b64tab[cccc.charAt(0)] << 18 : 0)
    | (len > 1 ? b64tab[cccc.charAt(1)] << 12 : 0)
    | (len > 2 ? b64tab[cccc.charAt(2)] << 6 : 0)
    | (len > 3 ? b64tab[cccc.charAt(3)] : 0)
  const chars = [
    fromCharCode(n >>> 16),
    fromCharCode((n >>> 8) & 0xff),
    fromCharCode(n & 0xff)
  ];
  chars.length -= [0, 0, 2, 1][padlen];
  return chars.join('');
};
const _atob = function (a) {
  return a.replace(/\S{1,4}/g, cbDecode);
};
const atob = function (a) {
  return _atob(String(a).replace(/[^A-Za-z0-9\+\/]/g, ''));
};
const decode = function (a) { return btou(_atob(a)) }
const exp = {
  version,
  encode,
  decode,
}
// window['jpcode'] = exp
// export Base32
export const Base64 = exp
