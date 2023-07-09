const defaults = {
  series: '010203040506070809101112131415',
  points: '543210',
  specials: true,
  giveaways: false,
  wait_right: 500,
  wait_wrong: 1500,
};
let key, keys, score, attempts, timer, final;
let blocking = false, progress = {}, settings = defaults;
let first_time = true;

const scoreup = () => {
  qs('#score').innerText = score;
  qs('#attempts').innerText = `/${attempts}`;
};

const populate_ui = key => {
  scoreup();
  qsa('.seat').forEach(e => e.innerText = '');
  const sid = key.substr(0, 2) * 1;
  const series = sid > 0 ? `Series ${sid}` : specials.at(sid);
  qs('#prize').style.backgroundImage = `url(${key_image(key)})`;
  qs('#series').innerText = series;
  qs('#category').innerText = `the ${key_cat(key)}`;

  if (keys.length) new Image().src = key_image(keys.at(-1)); // preload next prize

  const y = sid + (sid < 0 ? 20 : -1);
  qsa('.seat').forEach((e, i) => e.style.backgroundPosition = `${i * 25}% ${y * 5.265}%`);
};

const next = () => {
  key = keys.pop();
  if (!key) return finish();

  populate_ui(key);
  blocking = false;
};

const good = $E('div', {className: 'mark good', innerText: '✔'});
const bad = $E('div', {className: 'mark bad', innerText: '✗'});

const handle = guess => {
  if (!settings.wait_right && qsa('.mark').length) return next();
  if (blocking) return;
  blocking = true;

  const seats = qsa('.seat');
  const right = seats[key[4] - 1];
  right.appendChild(good);
  if (guess == right) score++;
  else guess.appendChild(bad);
  attempts++;
  progress[key] = (guess == right) * 1;

  if (keys.length == 0) {
    final = {key, guess: Array.from(seats).indexOf(guess), right: key[4] - 1};
    return finish();
  }

  const wait = settings[`wait_${guess == right ? 'right' : 'wrong'}`];
  if (wait != null) timer = setTimeout(next, wait);
};

const init = () => {
  keys = alive.concat(settings.giveaways ? dead : []);
  keys.keep(k => settings.points.indexOf(k[5]) > -1);
  const enabled = settings.series.match(/\d\d/g) || ['x'];
  const rx = new RegExp(`^(${settings.specials ? '-|' : ''}${enabled.join('|')})`);
  keys.keep(k => rx.test(k));

  score = attempts = 0;
  for (const [k, v] of Object.entries(progress))
    if (keys.includes(k)) { attempts++; score += v; }

  scoreup();
  qs('#total').innerText = `/${keys.length}`;

  keys.keep(k => !(k in progress));
  if (keys.length == 0) return finish();

  let i;
  keys.shuffle();
  if (first_time) {
    i = keys.indexOf('010155');
    keys.splice(i, 1);
    keys.push('010155');
  }
  first_time = false;

  i = keys.indexOf(key);
  if (i > -1) keys.splice(i, 1);
  else next();
};

const gen_report = () => {
  const series_totals = alive.tally(k => k.substr(0, 2));
  let scores = {};
  for (const [k, v] of Object.entries(progress)) {
    const cid = k.substr(0, 2) + k[4];
    scores[cid] ||= [0, 0];
    scores[cid][1]++;
    scores[cid][0] += v;
  }
  let res = [];
  for (const [cid, score] of Object.entries(scores)) {
    const total = alive.filter(k => k.substr(0, 2) + k[4] == cid).length;
    const sid = cid.substr(0, 2);
    res.push({sid, seat: cid[2], right: score[0], tries: score[1], total});
  }

  const groups = groupBy(res, 'sid');
  const sidn = n => n < 0 ? 21 + n * 1 : n * 1;
  const keys = Object.keys(groups).sort_by(sidn);
  const perc = (n, d) => Math.round(n * 100 / d);
  const summ = (a, b, c, d, e) => `${a}/${b}/${c} (${perc(a, b)}%${d || ''}, ${perc(b, c)}%${e || ''})`;

  let fr = ft = 0, pieces = ['<meta charset="UTF-8" />'];
  for (let k of keys) {
    const sname = k < 0 ? specials.at(k) : `Series ${k * 1}`;
    let sr = st = 0;
    pieces.push(`<b><u>${sname}</u></b>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`);
    groups[k].forEach(e => { sr += e.right; st += e.tries; });
    fr += sr; ft += st;
    pieces.push(`${summ(sr, st, series_totals[k])}<br>`);
    groups[k].sort_by(c => c.seat).forEach(c => {
      pieces.push(`<b>${casts[sidn(k) - 1][c.seat - 1]}</b> ${summ(c.right, c.tries, c.total)}<br>`);
    });
    pieces.push('<br>');
  }
  pieces.splice(1, 0, `<b><i>Total</i></b> ${summ(fr, ft, alive.length, ' correct', ' complete')}<br><br>`);
  const url = URL.createObjectURL(new Blob(pieces, {type: 'text/html'}));
  window.open(url, '_blank');
};

const finish = () => {
  blocking = true;
  populate_ui(final.key);
  const seats = qsa('.seat');
  seats[final.right].appendChild(good);
  if (final.guess != final.right)
    seats[final.guess].appendChild(bad);
  const rem = alive.filter(k => !(k in progress)).length;
  qs('#alert').innerHTML = `
  <p>That's all, folks.</p>
  <p>You've gone through all the prizes specified by your filters.</p>
  <p>You can adjust your settings if you'd like to give the other <b>${rem}</b> non-freebies a try.</p>
  <p>It's not very pretty, but you can <a href="javascript: gen_report()">generate a report</a> of your progress if you'd like.</p>
  <p>Otherwise, press anywhere to dismiss this window.</p>`;
  show_modal();
}

const handle_advance = () => {
  qsa('input[type=number]').forEach(e => e.disabled = !qs('#box-advance').checked);
};

const handle_next = () => {
  if (qsa('.mark').length == 0) keys.unshift(key);
  clearTimeout(timer);
  next();
};

window.addEventListener('DOMContentLoaded', () => {
  qsa('button, label').forEach(e => e.classList.add('tap'));
  if (matchMedia('(hover: hover').matches) qs('#act').innerText = 'click';

  const [cast, sb, pb] = ['#cast', '#series-box', '#points-box'].map(i => qs(i));

  for (let i = 0; i < 5; ++i) {
    const seat = $E('div', {className: 'seat tap'});
    seat.addEventListener('click', () => handle(seat));
    cast.appendChild(seat);
  }

  if (key = localStorage.wpiia_data) {
    ({settings, progress, final} = JSON.parse(key));
    first_time = false;
    hide_modal();
  }
  else show_modal();

  const enabled = (settings.series.match(/\d\d/g) || []).map(m => m - 1);

  for (let i = 0; i < 15; ++i) {
    const cl = `series tap ${enabled.includes(i) ? '' : 'disabled'}`;
    const series = $E('div', {className: cl, innerText: `Series ${i + 1}`});
    series.addEventListener('click', () => series.classList.toggle('disabled'));
    series.style.backgroundPosition = `0 ${i * 5.265 + (i < 5)}%`;
    sb.appendChild(series);
  }

  for (let i = 5; i >= 0; --i) {
    const cb = $E('label', {}, [
      $E('input', {type: 'checkbox', checked: settings.points.indexOf(i) > -1}),
      $E('span', {innerText: ` ${i} `})
    ]);
    pb.appendChild(cb);
  }

  qs('#box-specials').checked = settings.specials;
  qs('#box-giveaways').checked = settings.giveaways;
  if (settings.wait_right != null) {
    qs('#box-advance').checked = true;
    qs('#num-right').value = settings.wait_right / 1000;
    qs('#num-wrong').value = settings.wait_wrong / 1000;
  }
  handle_advance();
  init();
});

const save_settings = reset => {
  const new_settings = {
    series: Array.from(qsa('.series')).map((e, i) => e.classList.length < 3 ? String(i + 1).padStart(2, '0') : '').join(''),
    points: Array.from(qsa('#points-box input')).map((e, i) => e.checked ? 5 - i : '').join(''),
    specials: qs('#box-specials').checked,
    giveaways: qs('#box-giveaways').checked,
    wait_right: qs('#box-advance').checked ? parseFloat(qs('#num-right').value) * 1000 : null,
    wait_wrong: qs('#box-advance').checked ? parseFloat(qs('#num-wrong').value) * 1000 : null
  };
  settings = new_settings;
  if (reset) progress = {};
  toggle_settings();
  init();
};

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState == 'hidden')
    localStorage.wpiia_data = JSON.stringify({settings, progress, final});
});

document.onkeyup = e => {
  if (e.key > '0' && e.key < '6')
    qsa('.seat')[e.key - 1].click();
}

if (screen.orientation) {
  screen.orientation.onchange = e => {
    if ((e.target.angle / 90) % 2)
      document.documentElement.requestFullscreen();
    else
      document.exitFullscreen();
  };
}

const hide_modal = () => qs('#modal').style.display = 'none';
const show_modal = () => qs('#modal').style.display = 'flex';
const toggle_settings = () => qs('#settings').classList.toggle('active');
const toggle_series = n => qsa('.series').forEach(e => e.classList[['add', 'remove'][n]]('disabled'));
const toggle_points = n => qsa('#points-box input').forEach(e => e.checked = n);
