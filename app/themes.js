/**
 * Expenity themes: the list, the picker with live previews, and switching. The colors and shapes themselves are in
 * themes.css; the default (Emerald) is in style.css. theme.js applies the saved choice before the first paint.
 */
( function () {
	'use strict';
	const EX = window.EX, UI = window.UI, EXA = window.EXA;
	const { t, esc } = EX;
	const root = document.documentElement;
 const S=EX.state;
 Object.assign(EX.I18N.langs.en,{customTitle:'My custom theme',customTemplates:'Theme templates',customPaletteTitle:'Choose a starting palette',customPaletteHint:'Pick a palette, then adjust every colour below. Changes stay in the preview until you save.',customApply:'Use my theme',customActive:'Currently active',customEditSaved:'Edit my theme',customCreate:'Create my theme',custom_icons:'Icons',customHex:'Hex colour',customInvalid:'Enter a six-digit hex colour, for example #89BAFF.',customIconContrast:'Choose an icon colour with stronger contrast against the page and cards.',customLive:'Live preview',customPreviewExpense:'Coffee',customPreviewGoal:'Savings goal',customPreset_0:'Ocean',customPreset_1:'Amber',customPreset_2:'Rose',customPreset_3:'Mint',customPreset_4:'Paper',customPreset_5:'Violet'});
 Object.assign(EX.I18N.langs.el,{customTitle:'Το δικό μου θέμα',customTemplates:'Έτοιμα θέματα',customPaletteTitle:'Επιλέξτε αρχική παλέτα',customPaletteHint:'Επιλέξτε παλέτα και προσαρμόστε κάθε χρώμα παρακάτω. Οι αλλαγές φαίνονται μόνο στην προεπισκόπηση μέχρι να τις αποθηκεύσετε.',customApply:'Χρήση του θέματός μου',customActive:'Ενεργό θέμα',customEditSaved:'Επεξεργασία του θέματός μου',customCreate:'Δημιουργία του θέματός μου',custom_icons:'Εικονίδια',customHex:'Δεκαεξαδικό χρώμα',customInvalid:'Γράψτε εξαψήφιο δεκαεξαδικό χρώμα, π.χ. #89BAFF.',customIconContrast:'Επιλέξτε χρώμα εικονιδίων με μεγαλύτερη αντίθεση στο φόντο και στις κάρτες.',customLive:'Ζωντανή προεπισκόπηση',customPreviewExpense:'Καφές',customPreviewGoal:'Στόχος αποταμίευσης',customPreset_0:'Ωκεανός',customPreset_1:'Κεχριμπάρι',customPreset_2:'Ροζ',customPreset_3:'Μέντα',customPreset_4:'Χαρτί',customPreset_5:'Βιολετί'});

 Object.assign(EX.I18N.langs.en,{theme_mario:'Mario · Pixel adventure',themeD_mario:'Drifting pixel clouds, golden coins and a bright blue sky.',theme_bricks:'Brick party',themeD_bricks:'Colourful building bricks, floating studs and playful shapes.',theme_minnie:'Minnie · Bow atelier',themeD_minnie:'Painted rose, floating bows and delicate polka dots.'});
 Object.assign(EX.I18N.langs.el,{theme_mario:'Mario · Περιπέτεια σε πίξελ',themeD_mario:'Σύννεφα σε πίξελ, χρυσά νομίσματα και γαλάζιος ουρανός.',theme_bricks:'Πάρτι με τουβλάκια',themeD_bricks:'Πολύχρωμα τουβλάκια, ανάλαφρη κίνηση και παιχνιδιάρικα σχήματα.',theme_minnie:'Minnie · Ατελιέ φιόγκων',themeD_minnie:'Ζωγραφιστό ροζ, αιωρούμενοι φιόγκοι και διακριτικά πουά.'});
	// swatch: page color, card color, accent, text. mode: the theme also has a light and a dark version.
	const THEMES = [
		{ id: 'emerald', mode: true, sw: [ '#eef6f3', '#ffffff', '#0a8f6a', '#0f1f1a' ] },
		{ id: 'minimal', mode: true, sw: [ '#fafafa', '#ffffff', '#111111', '#111111' ] },
		{ id: 'paper', sw: [ '#f4ecd8', '#fffdf3', '#2f4b9a', '#2b2a40' ] },
		{ id: 'ledger', sw: [ '#e9eedd', '#fafcf2', '#1f5d3a', '#1c2a1c' ] },
		{ id: 'terminal', sw: [ '#030803', '#071307', '#36ff6d', '#36ff6d' ] },
		{ id: 'synthwave', sw: [ '#120726', '#1f0f45', '#ff3ea5', '#2de2e6' ] },
		{ id: 'amberwave', sw: [ '#120c07', '#24160d', '#ffbd59', '#fff2d6' ] },
		{ id: 'ion', sw: [ '#04131d', '#092735', '#61eeff', '#dcfbff' ] },
		{ id: 'mario', sw: [ '#dcf3ff', '#fffdf2', '#c52b32', '#172b49' ] },
		{ id: 'bricks', sw: [ '#fff5d8', '#ffffff', '#164bb2', '#182d4b' ] },
		{ id: 'minnie', sw: [ '#fff0f3', '#fffafd', '#a7194c', '#35202d' ] },
		{ id: 'custom', sw: [ '#101724', '#1c283b', '#89baff', '#eef4ff' ] },
		{ id: 'blueprint', sw: [ '#0d3b82', '#11449a', '#ffffff', '#f0f7ff' ] },
		{ id: 'candy', sw: [ '#fff1f8', '#ffffff', '#ff6fb0', '#4a2a5c' ] },
		{ id: 'oled', sw: [ '#000000', '#0a0a0a', '#19e6a3', '#ffffff' ] },
		{ id: 'glass', sw: [ '#c9d6ff', '#ffffff', '#5757d9', '#1d2142' ] },
		{ id: 'sunset', sw: [ '#fff3e8', '#fffaf5', '#f0572d', '#4a1f10' ] },
		{ id: 'chalk', sw: [ '#1f3a30', '#274a3d', '#ffd86b', '#f3f0e4' ] },
	];
	EXA.THEMES = THEMES;
	const store = ( k, v ) => { try { if ( v == null ) localStorage.removeItem( k ); else localStorage.setItem( k, v ); } catch ( e ) { /* ignore */ } };
	EXA.skin = () => root.dataset.skin || 'emerald';
	EXA.setSkin = ( id ) => {
		if ( ! THEMES.some( ( x ) => x.id === id ) ) return;
		if ( id === 'emerald' ) delete root.dataset.skin; else root.dataset.skin = id;
		store( 'expenity.skin', id === 'emerald' ? null : id );
		EXA.applyCustomTheme(); EXA.updateTrails();
		const m = document.querySelector( 'meta[name=theme-color]' );
		if ( m ) m.content = id === 'custom' ? EXA.customPalette().accent : THEMES.find( ( x ) => x.id === id ).sw[ 2 ];
	};
	EXA.setMode = ( v ) => {
		if ( v === 'auto' ) delete root.dataset.theme; else root.dataset.theme = v;
		store( 'expenity.theme', v === 'auto' ? null : v );
	};
	EXA.setMotion = ( v ) => {
		const d = EX.state().device; d.motion = v; EX.persist();
		if ( v === 'auto' ) delete root.dataset.motion; else root.dataset.motion = v;
		store( 'expenity.motion', v === 'auto' ? null : v );
		EXA.updateTrails();
	};
	const card = ( th, cur ) => {
		const palette = th.id === 'custom' ? EXA.customPalette() : null;
		const [ bg, sf, ac, ink ] = palette ? [ palette.bg, palette.surface, palette.accent, palette.ink ] : th.sw;
		return `<button type="button" class="theme-card${ th.id === cur ? ' on' : '' }" data-skin-set="${ th.id }" role="radio" aria-checked="${ th.id === cur }">
			<span class="tc-prev" aria-hidden="true" style="background:${ bg }"><i style="background:${ sf };border-color:${ ink }33"><b style="background:${ ac }"></b><u style="background:${ ink }"></u><u style="background:${ ink };width:42%"></u></i></span>
			<span class="tc-name">${UI.icon(({mario:'device-gamepad-2',bricks:'category-2',minnie:'heart'})[th.id]||'palette',16)} ${ esc( t( 'theme_' + th.id ) ) }</span><small>${ esc( t( 'themeD_' + th.id ) ) }</small></button>`;
	};
	/** The picker: theme cards, then light/dark chips for themes that have both. */
	EXA.themePicker = () => {
		const cur = EXA.skin(), th = THEMES.find( ( x ) => x.id === cur ) || THEMES[ 0 ];
		const mode = root.dataset.theme || 'auto';
		const mc = ( v, label, ic ) => `<button type="button" class="chip big${ mode === v ? ' on' : '' }" data-mode-set="${ v }">${ UI.icon( ic, 20 ) } ${ esc( label ) }</button>`;
		return `${EXA.customThemeSection()}<h3>${esc(t('customTemplates'))}</h3><div class="theme-grid" role="radiogroup" aria-label="${ esc( t( 'themesTitle' ) ) }">${ THEMES.filter(x=>x.id!=='custom').map( ( x ) => card( x, cur ) ).join( '' ) }</div>

			${ th.mode ? `<div class="lbl pad0">${ esc( t( 'themeLabel' ) ) }</div><div class="chips wrap">${ mc( 'auto', t( 'themeAuto' ), 'device-mobile' ) }${ mc( 'light', t( 'themeLight' ), 'sun' ) }${ mc( 'dark', t( 'themeDark' ), 'moon' ) }</div>` : '' }`;
	};

	const defaults = { bg: '#101724', surface: '#1c283b', accent: '#89baff', ink: '#eef4ff', round: '1', font: 'sans', trails: false, icons:'#89baff' };
	const keys = [ 'bg', 'surface', 'accent', 'ink', 'icons' ];
	EXA.customPalette = () => {
		let raw = {}; try { raw = JSON.parse( localStorage.getItem( 'expenity.custom' ) || '{}' ) || {}; } catch ( e ) { /* default */ }
		const p = { ...defaults };
		keys.forEach( k => { if ( /^#[0-9a-f]{6}$/i.test( raw[k] ) ) p[k] = raw[k]; } );
		if ( [ '0.3', '1', '1.5' ].includes( raw.round ) ) p.round = raw.round;
		if ( [ 'sans', 'serif', 'mono' ].includes( raw.font ) ) p.font = raw.font;
		p.trails = raw.trails === true;if(!/^#[0-9a-f]{6}$/i.test(raw.icons||''))p.icons=p.accent;return p;
	};
	const lum = c => { const v = c.slice( 1 ).match( /../g ).map( x => parseInt( x, 16 ) / 255 ).map( n => n <= .04045 ? n / 12.92 : ( ( n + .055 ) / 1.055 ) ** 2.4 ); return .2126*v[0]+.7152*v[1]+.0722*v[2]; };
	const contrast = ( a, b ) => ( Math.max( lum(a), lum(b) ) + .05 ) / ( Math.min( lum(a), lum(b) ) + .05 );
	const foreground = bg => contrast( bg, '#ffffff' ) >= contrast( bg, '#000000' ) ? '#ffffff' : '#000000';
	EXA.applyCustomTheme = () => {
		let el = document.getElementById( 'customPalette' ); if ( ! el ) { el = document.createElement( 'style' ); el.id = 'customPalette'; document.head.appendChild( el ); }
		const p = EXA.customPalette();
		el.textContent = `:root[data-skin="custom"]{--bg:${p.bg};--bg-img:none;--surface:${p.surface};--ink:${p.ink};--ink-2:${p.ink};--muted:${p.ink};--line:${p.ink}33;--card-line:${p.ink}33;--accent:${p.accent};--accent-2:${p.accent};--accent-ink:${foreground(p.accent)};--accent-soft:color-mix(in srgb,${p.accent} 14%,${p.surface});--custom-icon:${p.icons};--brand:${p.accent};--brand-ink:${foreground(p.accent)};--fab-bg:${p.accent};--hero-bg:${p.accent};--hero-ink:${foreground(p.accent)};--rk:${p.round};--font-head:${p.font === 'mono' ? 'var(--mono)' : p.font === 'serif' ? 'var(--serif)' : 'var(--font)'};--trail:${p.accent};color-scheme:${lum(p.bg)<.18?'dark':'light'}}:root[data-skin="custom"] .ab-btn .i,:root[data-skin="custom"] .tab.on .i,:root[data-skin="custom"] .rail-item .i{color:var(--custom-icon)}`;
	};

 const palettes=[
  {bg:'#101724',surface:'#1c283b',accent:'#89baff',ink:'#eef4ff',icons:'#89baff'},
  {bg:'#120c07',surface:'#24160d',accent:'#ffbd59',ink:'#fff2d6',icons:'#ffbd59'},
  {bg:'#21101d',surface:'#35192e',accent:'#ff9acc',ink:'#fff0f8',icons:'#ffb4d8'},
  {bg:'#eef8f4',surface:'#ffffff',accent:'#07694f',ink:'#102e25',icons:'#07694f'},
  {bg:'#f4ecd8',surface:'#fffdf3',accent:'#2f4b9a',ink:'#2b2a40',icons:'#2f4b9a'},
  {bg:'#130d25',surface:'#24173d',accent:'#ceb0ff',ink:'#f5eeff',icons:'#ceb0ff'}
 ];
 EXA.customThemeSection=()=>{
  const p=EXA.customPalette(),active=EXA.skin()==='custom';let saved=false;try{saved=!!localStorage.getItem('expenity.custom');}catch(e){}
  return `<section class="custom-theme-section" aria-label="${esc(t('customTitle'))}"><div class="custom-theme-heading">${UI.ci('palette','purple',42)}<div><h3>${esc(t('customTitle'))}</h3><p>${esc(t('customHelp'))}</p></div></div><div class="custom-theme-swatches" aria-hidden="true">${keys.map(k=>`<i style="background:${p[k]}"></i>`).join('')}</div><div class="btn-row"><button type="button" class="btn btn-primary" data-custom-edit>${UI.icon('pencil',20)} ${esc(t(saved?'customEditSaved':'customCreate'))}</button><button type="button" class="btn btn-ghost" data-skin-set="custom"${active?' disabled':''}>${UI.icon(active?'check':'palette',20)} ${esc(t(active?'customActive':'customApply'))}</button></div></section>`;
 };
 const hex=value=>/^#[0-9a-f]{6}$/i.test(value);
 function editCustom() {
  const p=EXA.customPalette(),iconFor={bg:'sun',surface:'wallet',accent:'palette',ink:'notes',icons:'palette'};
  UI.openSheet(`<div class="sheet-head"><button type="button" class="ab-btn" data-close aria-label="${esc(t('close'))}">${UI.icon('x',24)}</button><h2 id="sheetTitle">${UI.icon('palette',22)} ${esc(t('customTitle'))}</h2></div><form id="customThemeForm" class="sheet-pad"><p class="muted">${esc(t('customPaletteHint'))}</p><h3>${esc(t('customPaletteTitle'))}</h3><div class="custom-start-palettes" role="group" aria-label="${esc(t('customPaletteTitle'))}">${palettes.map((v,i)=>`<button type="button" class="palette-option" data-palette-preset="${i}" aria-label="${esc(t('customPreset_'+i))}"><span aria-hidden="true">${['bg','surface','accent','ink'].map(k=>`<i style="background:${v[k]}"></i>`).join('')}</span><b>${esc(t('customPreset_'+i))}</b></button>`).join('')}</div><div class="custom-colour-controls">${keys.map(k=>`<div class="custom-colour-row"><label for="palette-${k}">${UI.icon(iconFor[k],20)} ${esc(t('custom_'+k))}</label><input id="palette-${k}" type="color" name="${k}" value="${p[k]}" aria-label="${esc(t('custom_'+k))}"><input type="text" inputmode="text" data-palette-hex="${k}" value="${p[k].toUpperCase()}" maxlength="7" spellcheck="false" autocomplete="off" aria-label="${esc(t('custom_'+k)+' · '+t('customHex'))}"></div>`).join('')}</div><div class="grid2"><label class="f"><span>${UI.icon('palette',18)} ${esc(t('customRound'))}</span><select name="round">${['0.3','1','1.5'].map((x,i)=>`<option value="${x}"${p.round===x?' selected':''}>${esc(t(['customSquare','customSoft','customRounder'][i]))}</option>`).join('')}</select></label><label class="f"><span>${UI.icon('notes',18)} ${esc(t('customFont'))}</span><select name="font">${['sans','serif','mono'].map(x=>`<option value="${x}"${p.font===x?' selected':''}>${esc(t('customFont_'+x))}</option>`).join('')}</select></label></div><label class="f chk"><input name="trails" type="checkbox"${p.trails?' checked':''}><span>${esc(t('customTrails'))}</span></label><h3>${esc(t('customLive'))}</h3><div id="palettePreview"><div class="palette-preview-nav">${UI.icon('wallet',24)} ${UI.icon('arrows-sort',24)} ${UI.icon('target',24)} ${UI.icon('chart-pie',24)}</div><div class="palette-preview-card"><small>${esc(t('customPreview'))}</small><b>${esc(EX.money(1234,S().settings.currency))}</b><span class="palette-preview-add" aria-hidden="true">${UI.icon('plus',22)}</span></div><div class="palette-preview-row">${UI.icon('coffee',22)}<span>${esc(t('customPreviewExpense'))}</span><strong>−${esc(EX.money(4,S().settings.currency))}</strong></div><div class="palette-preview-row">${UI.icon('target',22)}<span>${esc(t('customPreviewGoal'))}</span></div></div><p id="paletteError" class="err" role="alert" hidden></p><div class="btn-row sticky-actions"><button type="button" class="btn btn-ghost" data-close>${esc(t('cancel'))}</button><button type="submit" class="btn btn-primary">${UI.icon('check',20)} ${esc(t('saveTx'))}</button></div></form>`,{tall:true,cls:'custom-theme-editor'});
  const f=document.getElementById('customThemeForm'),preview=document.getElementById('palettePreview'),error=document.getElementById('paletteError');
  const read=()=>Object.fromEntries([...keys,'round','font'].map(k=>[k,f.elements[k].value]).concat([['trails',f.elements.trails.checked]]));
  const paint=()=>{
   const v=read(),invalid=keys.some(k=>!hex(f.querySelector(`[data-palette-hex="${k}"]`).value));
   const lowText=contrast(v.ink,v.surface)<4.5||contrast(v.ink,v.bg)<4.5,lowIcon=contrast(v.icons,v.surface)<3||contrast(v.icons,v.bg)<3;
   error.textContent=t(invalid?'customInvalid':lowText?'customContrast':'customIconContrast');error.hidden=!invalid&&!lowText&&!lowIcon;f.querySelector('[type=submit]').disabled=!error.hidden;
   preview.style.cssText=`--preview-bg:${v.bg};--preview-surface:${v.surface};--preview-ink:${v.ink};--preview-accent:${v.accent};--preview-icon:${v.icons};--preview-on-accent:${foreground(v.accent)};--preview-round:${Number(v.round)*16}px;font-family:${v.font==='mono'?'var(--mono)':v.font==='serif'?'var(--serif)':'var(--font)'}`;
   f.querySelectorAll('[data-palette-preset]').forEach(b=>{const v0=palettes[Number(b.dataset.palettePreset)],on=keys.every(k=>v[k].toLowerCase()===v0[k]);b.setAttribute('aria-pressed',String(on));});
  };
  f.addEventListener('input',e=>{const k=e.target.dataset.paletteHex;if(k&&hex(e.target.value))f.elements[k].value=e.target.value;else if(e.target.type==='color'){f.querySelector(`[data-palette-hex="${e.target.name}"]`).value=e.target.value.toUpperCase();}paint();});
  f.addEventListener('change',paint);
  f.addEventListener('click',e=>{const b=e.target.closest('[data-palette-preset]');if(!b)return;const v=palettes[Number(b.dataset.palettePreset)];keys.forEach(k=>{f.elements[k].value=v[k];f.querySelector(`[data-palette-hex="${k}"]`).value=v[k].toUpperCase();});paint();});
  f.addEventListener('submit',e=>{e.preventDefault();e.stopPropagation();paint();if(!error.hidden)return;const v=read();store('expenity.custom',JSON.stringify(v));EXA.setSkin('custom');UI.closeSheet();if(EXA.flow.active())EXA.flow.show(true);else EXA.render();});
  paint();
 }


 // Decorative scenery only. Character artwork will be integrated with the balance card.
 let funScene,funSkin;
 EXA.updateFunThemes=on=>{
  const skin=EXA.skin(),active=['mario','bricks','minnie'].includes(skin);
  if(!active){funScene?.remove();funScene=null;funSkin=null;delete root.dataset.funMotion;root.style.removeProperty('--theme-cameo');root.style.removeProperty('--theme-friend');return;}
  root.dataset.funMotion=on?'on':'still';
  if(funSkin!==skin||!funScene){funScene?.remove();funSkin=skin;funScene=document.createElement('div');funScene.className='fun-scene '+skin+'-scene';funScene.setAttribute('aria-hidden','true');
   const kinds=skin==='mario'?['cloud','cloud','cloud','hill','hill','coin','coin','coin','block','block']:skin==='bricks'?Array(3).fill('brick'):Array.from({length:13},(_,i)=>i%3===0?'bow':i%3===1?'confetti':'petal');
   kinds.forEach((kind,i)=>{const el=document.createElement('i');el.className='fun-'+kind;el.style.setProperty('--n',i);el.style.setProperty('--x',((i*29+7)%94)+'%');el.style.setProperty('--y',((i*19+8)%88)+'%');el.style.setProperty('--delay',(-i*1.7)+'s');el.style.setProperty('--turn',((i%2?-1:1)*(6+i%4*4))+'deg');funScene.append(el);});document.body.prepend(funScene);
  }
 };

	let trails;
	EXA.updateTrails = () => {
		const m=root.dataset.motion, on=!document.hidden&&(m==='full'||(m!=='off'&&m!=='reduced'&&!matchMedia('(prefers-reduced-motion: reduce)').matches));
		EXA.updateFunThemes(on);
		const enabled=['synthwave','amberwave','ion'].includes(EXA.skin())||(EXA.skin()==='custom'&&EXA.customPalette().trails);
		if(!enabled){if(trails)trails.remove();trails=null;return;}
		if(!trails){trails=document.createElement('div');trails.className='neon-trails';trails.setAttribute('aria-hidden','true');for(let i=0;i<22;i++){const dot=document.createElement('i');dot.style.left=(Math.random()*100)+'%';dot.style.setProperty('--duration',(7+Math.random()*12)+'s');dot.style.setProperty('--delay',(-Math.random()*20)+'s');dot.style.setProperty('--length',(15+Math.random()*45)+'px');trails.appendChild(dot);}document.body.prepend(trails);}
		trails.hidden=!on;
	};
	document.addEventListener('click',e=>{if(e.target.closest('[data-custom-edit]'))editCustom();});
	document.addEventListener('visibilitychange',()=>EXA.updateTrails());
	matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',()=>EXA.updateTrails());
	EXA.applyCustomTheme(); EXA.updateTrails();
}() );
