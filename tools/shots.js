/* The pictures of the app on this site, taken from the real app.

     node tools/shots.js <path to Hplay/index.html>

   Opens the app in Chromium (Playwright), gives it the site's own twenty demo tracks and
   their sleeves as a library, and photographs the screens the pages use into img/app/.
   Nothing here is a mock-up: when the app's look changes, run this again and the site
   follows. Needs Playwright and Pillow-free: the JPEGs are written by Chromium itself.

   Two kinds of picture come out:
     phone-*.jpg    the whole player, 390 x 844 at twice the pixels
     scr-*.jpg      only the screen of the player, cut out of the same capture            */
'use strict';
const path = require('path'), fs = require('fs');
const { pathToFileURL } = require('url');
const { chromium } = require('playwright');

const SITE = path.resolve(__dirname, '..');
const APP = path.resolve(process.argv[2] || '../Hplay/index.html');
const OUT = path.join(SITE, 'img', 'app');

// the demo tracks, read off the home page so the two can never disagree
function tracks(){
  const html = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8');
  const out = []; let album = '';
  const re = /<h3>([^<]+)<\/h3>|data-title="([^"]+)" data-artist="([^"]+)" data-art="([^"]+)"/g;
  let m;
  while((m = re.exec(html))){
    if(m[1]) album = m[1];
    else out.push({ title:m[2].replace(/&amp;/g,'&'), artist:m[3].replace(/&amp;/g,'&'), album,
      art:'data:image/jpeg;base64,' + fs.readFileSync(path.join(SITE, m[4])).toString('base64') });
  }
  return out;
}

(async () => {
  fs.mkdirSync(OUT, { recursive:true });
  const songs = tracks();
  if(songs.length !== 20) throw new Error('expected the twenty demo tracks, found ' + songs.length);
  const browser = await chromium.launch(process.env.CHROME ? { executablePath:process.env.CHROME } : {});
  const ctx = await browser.newContext({ viewport:{ width:390, height:844 }, deviceScaleFactor:2 });
  await ctx.route('https://**', r => r.abort());
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.goto(pathToFileURL(APP).href); await page.waitForTimeout(2000);
  await page.evaluate(songs => {
    try{ endTour(); }catch(e){}
    const sr = 8000, n = sr*200, b = new ArrayBuffer(44+n*2), v = new DataView(b);
    const w = (o,t) => [...t].forEach((c,i)=>v.setUint8(o+i,c.charCodeAt(0)));
    w(0,'RIFF'); v.setUint32(4,36+n*2,true); w(8,'WAVE'); w(12,'fmt '); v.setUint32(16,16,true); v.setUint16(20,1,true);
    v.setUint16(22,1,true); v.setUint32(24,sr,true); v.setUint32(28,sr*2,true); v.setUint16(32,2,true); v.setUint16(34,16,true);
    w(36,'data'); v.setUint32(40,n*2,true);
    const url = URL.createObjectURL(new Blob([b], {type:'audio/wav'}));
    songs.forEach((s, i) => lib.push({ id:9000+i, title:s.title, artist:s.artist, album:s.album, art:s.art, url, dur:150+i*7 }));
    // some listening, so Statistics has something to say
    const st = appStats; st.firstUse = Date.now()-120*864e5; st.opens = 212; st.playCount = 1480; st.playMs = 1480*170e3;
    st.skips = 190; st.finished = 1210; st.wheelTurns = 40211; st.songPlays = {}; st.artistPlays = {};
    songs.forEach((s, i) => { st.songPlays[s.title] = 160-i*7; st.artistPlays[s.artist] = 170-i*7; });
    window.__play = i => { playlist = lib.map(s => s.id); pIdx = i; playCurrent(); };
  }, songs);

  // where the screen sits inside the player, measured rather than assumed
  const box = async () => page.evaluate(() => { const r = document.getElementById('screen').getBoundingClientRect(); return { x:r.x, y:r.y, width:r.width, height:r.height }; });
  const shot = async (name, setup, wait = 900, kinds = 'ps') => {
    await page.evaluate(new Function(setup));
    await page.waitForTimeout(wait);
    if(kinds.includes('p')) await page.screenshot({ path:path.join(OUT, 'phone-' + name + '.jpg'), type:'jpeg', quality:82 });
    if(kinds.includes('s')){
      const b = await box(), pad = 9;
      await page.screenshot({ path:path.join(OUT, 'scr-' + name + '.jpg'), type:'jpeg', quality:84,
        clip:{ x:b.x-pad, y:b.y-pad, width:b.width+2*pad, height:b.height+2*pad } });
    }
    console.log('  ' + name);
  };
  const T = (theme, mode, extra) => `applyTheme(${JSON.stringify(theme)}); custom.screenMode=${JSON.stringify(mode)}; ${extra||''} applyCustom();`;
  const go = sc => `stack.length = 1; ${sc ? `stack.push(${JSON.stringify(sc)});` : ''} render();`;
  // a record is photographed a minute in: it takes a second to roll in and the arm to come down
  const MID = ` try{ audio.currentTime = 70; }catch(e){} render();`;
  const COVER = "custom.coverStyle='Cover';", VINYL = "custom.coverStyle='Vinyl';";

  await shot('np-cover',   T('Hplay','Dark',COVER) + `__play(6);` + go({type:'np'}) + MID, 1600);
  await shot('np-vinyl',   T('Hplay','Dark',VINYL) + `__play(4);` + go({type:'np'}) + MID, 3000);
  await shot('menu',       T('Hplay','Dark',VINYL) + go(null), 2600);
  await shot('songs',      T('Hplay','Dark',COVER) + go({type:'songs', sel:3, top:0}), 900);
  await shot('albums',     go({type:'albums', sel:1, top:0}), 900, 's');
  await shot('quick',      go({type:'np'}) + `openSleep();`, 1200, 's');
  await shot('stats',      go({type:'stats', sel:0, top:0}), 900, 's');
  await shot('changelog',  go({type:'changelog', sel:0, top:0}), 900, 's');
  await shot('apps',       go({type:'apps', sel:0, top:0}), 900, 's');
  await shot('clock',      go({type:'clock'}), 900, 's');
  await shot('colors',     go({type:'colors', sel:0, top:0}), 900, 's');
  for(const [name, mode] of [['light','Light'],['dark','Dark'],['hicon','High Contrast'],['night','Night'],['paper','Paper']])
    await shot('mode-' + name, T('Hplay', mode, COVER) + `__play(10);` + go({type:'np'}) + MID, 1500, 's');
  // the other bodies, for the fan of colours
  for(const [theme, i] of [['Blue',0],['Red',11],['Purple',2],['Silver',8],['Black',13],['Green',5]])
    await shot('body-' + theme.toLowerCase(), T(theme,'Dark',VINYL) + `__play(${i});` + go({type:'np'}) + MID, 3000, 'p');
  await shot('tour',       T('Hplay','Dark',COVER) + go(null) + `startTour();`, 1800, 'p');
  await ctx.close(); await browser.close();
  if(errs.length) throw new Error('the app threw while being photographed: ' + errs.join('; '));
  console.log('Done: ' + OUT);
})().catch(e => { console.error(e.message); process.exit(1); });
