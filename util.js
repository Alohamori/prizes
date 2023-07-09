Array.prototype.keep = function(fn) {
  for (let a = this, i = j = 0; i < a.length; ++i)
    if (fn(a[i])) a[j++] = a[i];
  this.length = j;
}

Array.prototype.shuffle = function() {
  for (let a = this, i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
}

Array.prototype.tally = function(fn) {
  let v, res = {};
  for (let e of this) {
    res[v = fn(e)] ||= 0;
    ++res[v];
  }
  return res;
};

if (![].at) {
  Array.prototype.at = function(i) { return this[i < 0 ? this.length + i : i] };
}

Array.prototype.sort_by = function(fn) {
  return this.toSorted((a, b) => fn(a) - fn(b));
};

const groupBy = function(xs, key) {
  return xs.reduce(function(rv, x) {
    (rv[x[key]] ||= []).push(x);
    return rv;
  }, {});
};

const qs = s => document.querySelector(s);
const qsa = s => document.querySelectorAll(s);
const key_image = k => `prizes/s${k.substr(0, 2)}e${k.substr(2, 2)}c${k[4]}.jpg`;
const key_cat = k => cats[k.substr(0, 4)];

const $E = (tag, props = {}, kids = []) =>
  kids.reduce((e, c) => (e.appendChild(c), e),
              Object.assign(document.createElement(tag), props));
