/**
 * Builds the Expenity website into website/dist (published to GitHub Pages from the gh-pages branch).
 *
 * Pages, in English (root) and Greek (/el/): home, the Help center generated from docs/*.md and
 * docs/el/*.md (so the website and the docs never drift apart), plus the live app (copied to app/)
 * and a 404 page. Same layout, footer and project list as the other project sites.
 *
 * Run from the repository root: node website/build.mjs
 */
import MarkdownIt from 'markdown-it';
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';

/* ------------------------------------------------------------------ Config */

const SITE = {
	name: 'Expenity',
	url: 'https://expenity.github.io/expenity/',
	base: '/expenity/', // Used only by 404.html, which GitHub Pages serves from any path.
	author: 'George Stathopoulos',
	authorUrl: 'https://george-stathopoulos.github.io/',
	repo: 'https://github.com/expenity/expenity',
};

// Every project site lists the others (and the personal site keeps them all). Keep this list the
// same in each project's website build.
const PROJECTS = [
	{ name: 'Gatehouse', url: 'https://george-stathopoulos.github.io/gatehouse/', text: 'AI governance and cost control for WordPress' },
	{ name: 'Helpdesk Hero', url: 'https://george-stathopoulos.github.io/helpdesk-hero/', text: 'WordPress support with diagnostics and password-free access' },
	{ name: 'Fixpass', url: 'https://george-stathopoulos.github.io/fixpass/', text: 'Spotlight the problem and give support safe, temporary access' },
	{ name: 'SheetPilot', url: 'https://george-stathopoulos.github.io/sheetpilot/', text: 'Turn any spreadsheet into an interactive dashboard, in your browser' },
	{ name: 'Expenity', url: 'https://expenity.github.io/expenity/', text: 'Know where your money goes. English and Greek' },
];

const ROOT = process.cwd();
const OUT = join( ROOT, 'website/dist' );
const SRC = join( ROOT, 'website/src' );
const VERSION = JSON.parse( readFileSync( join( ROOT, 'package.json' ), 'utf8' ) ).version;
// Asset links change on every build, so browsers never keep a stale script or stylesheet.
const ASSET_V = VERSION + '.' + Date.now().toString( 36 );

rmSync( OUT, { recursive: true, force: true } );
mkdirSync( OUT, { recursive: true } );
cpSync( join( SRC, 'assets' ), join( OUT, 'assets' ), { recursive: true } );
writeFileSync( join( OUT, '.nojekyll' ), '' );

// The app itself is the live demo: the same files, served from app/.
mkdirSync( join( OUT, 'app' ), { recursive: true } );
for ( const f of [ 'index.html', 'icons.js', 'ui.js', 'views.js', 'forms.js', 'photos.js', 'reports.js', 'plan.js', 'insights.js', 'safe-spend.js', 'receipts.js', 'share.js', 'push.js', 'flow.js', 'installation.js', 'themes.js', 'core.js', 'sync.js', 'theme.js', 'app.js', 'enhancements.js', 'dashboard.js', 'productivity.js', 'releases.json', 'i18n.js', 'style.css', 'themes.css', 'favicon.svg', 'manifest.webmanifest', 'sw.js', 'icon-192.png', 'icon-512.png' ] ) cpSync( join( ROOT, f ), join( OUT, 'app', f ) );
cpSync(join(ROOT,'assets','themes'),join(OUT,'app','assets','themes'),{recursive:true});
cpSync(join(ROOT,'installation'),join(OUT,'app','installation'),{recursive:true});
cpSync(join(ROOT,'vendor'),join(OUT,'app','vendor'),{recursive:true});
// Every build gets its own cache name, so the app can tell that a newer version has been published (More, Check for updates).
{ const sw = join( OUT, 'app/sw.js' ); writeFileSync( sw, readFileSync( sw, 'utf8' ).replace( /(const CACHE = 'expenity-v\d+)'/, `$1-${ Date.now().toString( 36 ) }'` ) ); }

// HTML and offline installation use matching versioned JS/CSS URLs.
{ const html=join(OUT,'app/index.html'), sw=join(OUT,'app/sw.js');
 writeFileSync(html,readFileSync(html,'utf8').replace(/((?:src|href)="[^"?]+\.(?:js|css))"/g,'$1?v='+ASSET_V+'"'));
 writeFileSync(sw,readFileSync(sw,'utf8').replace(/(const FILES = \[[^;]+\]);/, '$1.map( f => /\\.(js|css)$/.test(f) ? f + "?v='+ASSET_V+'" : f );'));
}

/* ------------------------------------------------------------------ Images */

// Screenshots (made by dev/screenshots.mjs): docs/images/*.png -> assets/img/*.jpg (1800px, sharp on retina screens).
mkdirSync( join( OUT, 'assets/img' ), { recursive: true } );
const IMG = {};
for ( const f of readdirSync( join( ROOT, 'docs/images' ) ) ) {
	if ( ! f.endsWith( '.png' ) ) continue;
	const name = f.replace( /\.png$/, '' );
	const out = join( OUT, 'assets/img', name + '.jpg' );
	execFileSync( 'sips', [ '-s', 'format', 'jpeg', '-s', 'formatOptions', '82', '-Z', '1800', join( ROOT, 'docs/images', f ), '--out', out ], { stdio: 'ignore' } );
	const dims = execFileSync( 'sips', [ '-g', 'pixelWidth', '-g', 'pixelHeight', out ], { encoding: 'utf8' } );
	IMG[ name ] = { w: Number( /pixelWidth: (\d+)/.exec( dims )[ 1 ] ), h: Number( /pixelHeight: (\d+)/.exec( dims )[ 1 ] ) };
}

function img( name, alt, root ) {
	const d = IMG[ name ];
	if ( ! d ) throw new Error( 'Missing screenshot: ' + name );
	return `<img src="${ root }assets/img/${ name }.jpg" width="${ d.w }" height="${ d.h }" alt="${ alt.replace( /"/g, '&quot;' ) }" loading="lazy" decoding="async">`;
}

/* ------------------------------------------------------------------ Helpers */

const esc = ( s ) => String( s ).replace( /&/g, '&amp;' ).replace( /</g, '&lt;' ).replace( />/g, '&gt;' ).replace( /"/g, '&quot;' );
const slug = ( t ) =>
	t
		.toLowerCase()
		.replace( /<[^>]+>/g, '' )
		.replace( /[^\p{L}\p{N}\s_-]/gu, '' )
		.trim()
		.replace( /\s/g, '-' );

const svg = ( d, size = 22 ) => `<svg width="${ size }" height="${ size }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ d }</svg>`;
const I = {
	sun: svg( '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>', 18 ),
	menu: svg( '<path d="M4 7h16M4 12h16M4 17h16"/>', 20 ),
	open: svg( '<path d="M5 12h14M13 6l6 6-6 6"/>', 18 ),
	play: svg( '<circle cx="12" cy="12" r="9"/><path d="M10 8l6 4-6 4z"/>' ),
	plus: svg( '<path d="M12 5v14M5 12h14"/>' ),
	bell: svg( '<path d="M6 9a6 6 0 0 1 12 0c0 6 2 7 2 7H4s2-1 2-7zM10 20a2 2 0 0 0 4 0"/>' ),
	chart: svg( '<path d="M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-3"/>' ),
	wallet: svg( '<path d="M4 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7zM4 7V6a2 2 0 0 1 2-2h11M16 14h2"/>' ),
	target: svg( '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>' ),
	users: svg( '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3 2.7-5 6-5s6 2 6 5M16 5a3 3 0 0 1 0 6M18 15c2 .6 3 2.3 3 5"/>' ),
	palette: svg( '<path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-1 2-2 0-1.5-1-1.7-1-3 0-1 .8-2 2-2h2a4 4 0 0 0 4-4c0-4-4-7-9-7z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7" r="1"/>' ),
	key: svg( '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/>' ),
	phone: svg( '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>' ),
	shield: svg( '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>' ),
	help: svg( '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5v.01"/>' ),
};

/* ------------------------------------------------------------------ Languages */

const LANGS = {
	en: {
		code: 'en', prefix: '', label: 'EN', other: 'el', switchLabel: 'EL', switchTitle: 'Greek',
		tagline: 'Know where your money goes', titleHome: 'Expenity: know where your money goes',
		descHome: 'Expenity tracks your expenses, income, bills, budgets and goals on every device. Sign in with a passkey, share wallets with family, choose fourteen themes or create your own. Free, open source, in English and Greek.',
		nav: { features: 'Features', how: 'How it works', app: 'Open the app', docs: 'Help center' }, openApp: 'Open app', darkTheme: 'Dark theme', skip: 'Skip to content', menu: 'Menu', homeAria: 'Expenity home',
		about: 'Know where your money goes, on every device. Free and open source.',
		foot: { product: 'Product', help: 'Help', more: 'More projects', trust: 'Trust', allProjects: 'All projects', blog: 'Blog', blogTitle: 'The story behind every project',
			source: 'Source on GitHub', started: 'Getting started', addBills: 'Add expenses and bills', reminders: 'Reminders', privacy: 'Privacy and your data', yourData: 'Your data stays with you', feedback: 'Feedback and ideas', faq: 'FAQ' },
		madeBy: 'Made with', by: 'by', cookies: 'This website uses no cookies. Visits are counted anonymously, with no personal data.',
		docs: { title: 'Help center', hero: 'How can we help?', heroP: 'Guides and answers for Expenity: getting started, adding money, budgets and goals, reports, shared wallets, your account and privacy.', placeholder: 'Search, e.g. “reminders”, “backup”, “Greek”', searchLabel: 'Search the help center',
			browse: 'Browse all guides', home: 'Help center home', popular: 'Popular', stuck: 'Still stuck?', stuckA: 'Check the', stuckB: 'or', stuckC: 'ask on GitHub', prev: 'Previous', next: 'Next', onPage: 'On this page', read: 'Read the guide →', crumbs: 'Help center', pagerAria: 'Previous and next guide', toc: 'On this page' },
		str: { none: [ 'No results for “', '”. Try another word, or browse the guides below.' ], count: ' results', zoom: 'Enlarged screenshot. Press Escape to close.', enlarge: ' (enlarge)' },
		groups: [ { label: 'Start here', pages: [ 'getting-started', 'install-on-your-device', 'add-money' ] }, { label: 'Using Expenity', pages: [ 'wallets-and-currencies', 'budgets-goals-income', 'reports', 'reminders', 'shared-wallets', 'themes-and-look' ] }, { label: 'Reference', pages: [ 'account-and-sync', 'privacy-and-your-data', 'faq' ] } ],
		blurb: {
			'getting-started': 'Create an account, add Expenity to your home screen, set up and add your first expense.', 'install-on-your-device': 'Install Expenity on iPhone, Android or a computer, and use it offline.', 'add-money': 'The + button, the keypad, typing a sentence, bills, repeats and marking paid.',
			'wallets-and-currencies': 'Wallets, transfers, several currencies and exchange rates.', 'budgets-goals-income': 'Limits, saving for something, recurring income and ideas from your own data.', reports: 'Overview, spending, cash flow, trends, forecast, subscriptions and a table.',
			reminders: 'The calendar file that reminds you when the app is closed, and notifications.', 'shared-wallets': 'Share a wallet with family or friends: invites, roles and what is shared.', 'themes-and-look': 'Twelve themes, light and dark, and turning animations off.',
			'account-and-sync': 'Passkeys, recovery codes, your devices, how sync works and deleting your account.', 'privacy-and-your-data': 'What is stored where, backup, restore and delete.', faq: 'Quick answers to the most common questions.',
		},
		popular: [ [ 'getting-started', '', 'Create your account and set up' ], [ 'add-money', '', 'Add an expense in seconds' ], [ 'budgets-goals-income', '', 'Budgets, goals and ideas' ],
			[ 'reports', '', 'Reports and the forecast' ], [ 'shared-wallets', '', 'Share a wallet' ], [ 'privacy-and-your-data', '', 'What is stored where' ] ],
		page404: { h: 'This bill is not on the list', p: 'This page may have moved. Try the help center, or start from the home page.', home: 'Home', docs: 'Help center' },
	},
	el: {
		code: 'el', prefix: 'el/', label: 'ΕΛ', other: 'en', switchLabel: 'ΕΝ', switchTitle: 'Αγγλικά',
		tagline: 'Τα οικονομικά σας, με καθαρό μυαλό', titleHome: 'Expenity: τα οικονομικά σας, με καθαρό μυαλό',
		descHome: 'Το Expenity παρακολουθεί έξοδα, έσοδα, λογαριασμούς, προϋπολογισμούς και στόχους σε κάθε συσκευή. Σύνδεση με passkey, κοινά πορτοφόλια με την οικογένεια, δεκατέσσερα θέματα και δική σας παλέτα. Δωρεάν, ανοιχτού κώδικα, στα ελληνικά και στα αγγλικά.',
		nav: { features: 'Δυνατότητες', how: 'Πώς λειτουργεί', app: 'Ανοίξτε την εφαρμογή', docs: 'Κέντρο βοήθειας' }, openApp: 'Άνοιγμα', darkTheme: 'Σκούρο θέμα', skip: 'Μετάβαση στο περιεχόμενο', menu: 'Μενού', homeAria: 'Expenity, αρχική',
		about: 'Τα οικονομικά σας, με καθαρό μυαλό, σε κάθε συσκευή. Δωρεάν και ανοιχτού κώδικα.',
		foot: { product: 'Προϊόν', help: 'Βοήθεια', more: 'Περισσότερα έργα', trust: 'Εμπιστοσύνη', allProjects: 'Όλα τα έργα', blog: 'Blog', blogTitle: 'Η ιστορία πίσω από κάθε έργο',
			source: 'Κώδικας στο GitHub', started: 'Ξεκινώντας', addBills: 'Προσθήκη εξόδων και λογαριασμών', reminders: 'Υπενθυμίσεις', privacy: 'Ιδιωτικότητα και δεδομένα', yourData: 'Τα δεδομένα σας μένουν σε εσάς', feedback: 'Σχόλια και ιδέες', faq: 'Συχνές ερωτήσεις' },
		madeBy: 'Φτιαγμένο με', by: 'από τον', cookies: 'Αυτός ο ιστότοπος δεν χρησιμοποιεί cookies. Οι επισκέψεις μετριούνται ανώνυμα, χωρίς προσωπικά δεδομένα.',
		docs: { title: 'Κέντρο βοήθειας', hero: 'Πώς μπορούμε να βοηθήσουμε;', heroP: 'Οδηγοί και απαντήσεις για το Expenity: πρώτα βήματα, προσθήκη χρημάτων, προϋπολογισμοί και στόχοι, αναφορές, κοινά πορτοφόλια, λογαριασμός και ιδιωτικότητα.', placeholder: 'Αναζήτηση, π.χ. «υπενθυμίσεις», «αντίγραφο», «ημερολόγιο»', searchLabel: 'Αναζήτηση στο κέντρο βοήθειας',
			browse: 'Όλοι οι οδηγοί', home: 'Κέντρο βοήθειας', popular: 'Δημοφιλή', stuck: 'Χρειάζεστε ακόμα βοήθεια;', stuckA: 'Δείτε τις', stuckB: 'ή', stuckC: 'ρωτήστε στο GitHub', prev: 'Προηγούμενο', next: 'Επόμενο', onPage: 'Σε αυτή τη σελίδα', read: 'Διαβάστε τον οδηγό →', crumbs: 'Κέντρο βοήθειας', pagerAria: 'Προηγούμενος και επόμενος οδηγός', toc: 'Σε αυτή τη σελίδα' },
		str: { none: [ 'Δεν βρέθηκε τίποτα για «', '». Δοκιμάστε άλλη λέξη ή δείτε τους οδηγούς παρακάτω.' ], count: ' αποτελέσματα', zoom: 'Μεγεθυμένο στιγμιότυπο. Πατήστε Escape για κλείσιμο.', enlarge: ' (μεγέθυνση)' },
		groups: [ { label: 'Ξεκινήστε από εδώ', pages: [ 'getting-started', 'install-on-your-device', 'add-money' ] }, { label: 'Χρήση του Expenity', pages: [ 'wallets-and-currencies', 'budgets-goals-income', 'reports', 'reminders', 'shared-wallets', 'themes-and-look' ] }, { label: 'Αναφορά', pages: [ 'account-and-sync', 'privacy-and-your-data', 'faq' ] } ],
		blurb: {
			'getting-started': 'Δημιουργήστε λογαριασμό, προσθέστε το Expenity στην αρχική οθόνη, ρυθμίστε το και προσθέστε το πρώτο σας έξοδο.', 'install-on-your-device': 'Εγκαταστήστε το Expenity σε iPhone, Android ή υπολογιστή και χρησιμοποιήστε το offline.', 'add-money': 'Το κουμπί +, το πληκτρολόγιο, γραφή με πρόταση, λογαριασμοί, επαναλήψεις και σήμανση πληρωμής.',
			'wallets-and-currencies': 'Πορτοφόλια, μεταφορές, πολλά νομίσματα και ισοτιμίες.', 'budgets-goals-income': 'Όρια, αποταμίευση για κάτι, επαναλαμβανόμενα έσοδα και ιδέες από τα δικά σας δεδομένα.', reports: 'Επισκόπηση, έξοδα, ταμειακή ροή, τάσεις, πρόβλεψη, συνδρομές και πίνακας.',
			reminders: 'Το αρχείο ημερολογίου που σας υπενθυμίζει όταν η εφαρμογή είναι κλειστή, και οι ειδοποιήσεις.', 'shared-wallets': 'Μοιραστείτε ένα πορτοφόλι με οικογένεια ή φίλους: προσκλήσεις, ρόλοι και τι μοιράζεται.', 'themes-and-look': 'Δώδεκα θέματα, φωτεινό και σκούρο, και απενεργοποίηση των κινούμενων εφέ.',
			'account-and-sync': 'Passkeys, κωδικοί ανάκτησης, οι συσκευές σας, πώς δουλεύει ο συγχρονισμός και διαγραφή λογαριασμού.', 'privacy-and-your-data': 'Τι αποθηκεύεται πού, αντίγραφο, επαναφορά και διαγραφή.', faq: 'Σύντομες απαντήσεις στις πιο συχνές ερωτήσεις.',
		},
		popular: [ [ 'getting-started', '', 'Φτιάξτε λογαριασμό και ρυθμίστε το' ], [ 'add-money', '', 'Προσθέστε ένα έξοδο σε δευτερόλεπτα' ], [ 'budgets-goals-income', '', 'Προϋπολογισμοί, στόχοι και ιδέες' ],
			[ 'reports', '', 'Αναφορές και πρόβλεψη' ], [ 'shared-wallets', '', 'Μοιραστείτε ένα πορτοφόλι' ], [ 'privacy-and-your-data', '', 'Τι αποθηκεύεται πού' ] ],
		page404: { h: 'Αυτός ο λογαριασμός δεν είναι στη λίστα', p: 'Η σελίδα μπορεί να μετακινήθηκε. Δοκιμάστε το κέντρο βοήθειας ή ξεκινήστε από την αρχική.', home: 'Αρχική', docs: 'Κέντρο βοήθειας' },
	},
};

/* ------------------------------------------------------------------ Layout */

const LOGO_RAW = readFileSync( join( SRC, 'assets/favicon.svg' ), 'utf8' ).replace( '<svg ', '<svg class="logo-mark" width="32" height="32" aria-hidden="true" ' );
function logo( n = 1 ) {
	return `${ LOGO_RAW.replace( /dng/g, 'dng' + n ) }<span class="logo-text">Expen<b>ity</b></span>`;
}

/** root: relative path to the site root; alt: path of this page in the other language, relative to the site root. */
function layout( { lang, title, description, root, current = '', body, canonical = '', alt = '', extraHead = '', home = false } ) {
	const L = LANGS[ lang ];
	const homeHref = root + L.prefix;
	const full = home ? title : `${ title } · ${ SITE.name }`;
	const appHref = root + 'app/' + ( lang === 'el' ? '?lang=el' : '' );
	const nav = [
		{ id: 'features', label: L.nav.features, href: `${ homeHref }#features` }, { id: 'how', label: L.nav.how, href: `${ homeHref }#how` },
		{ id: 'app', label: L.nav.app, href: appHref }, { id: 'docs', label: L.nav.docs, href: `${ homeHref }docs/` },
	];
	const otherL = LANGS[ L.other ];
	return `<!doctype html>
<html lang="${ L.code }">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${ esc( full ) }</title>
<meta name="description" content="${ esc( description ) }">
<meta name="theme-color" content="#0a8f6a">
<link rel="canonical" href="${ SITE.url }${ canonical }">
${ alt ? `<link rel="alternate" hreflang="${ L.code }" href="${ SITE.url }${ canonical }">\n<link rel="alternate" hreflang="${ L.other }" href="${ SITE.url }${ alt }">\n` : '' }<meta property="og:type" content="website">
<meta property="og:site_name" content="${ SITE.name }">
<meta property="og:title" content="${ esc( full ) }">
<meta property="og:description" content="${ esc( description ) }">
<meta property="og:url" content="${ SITE.url }${ canonical }">
<meta property="og:image" content="${ SITE.url }assets/og.jpg">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${ root }assets/favicon.svg" type="image/svg+xml">
<!-- Cloudflare Web Analytics: counts visits anonymously, no cookies --><script type='module' src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "64332b427a604e879f82853393ebdb0d"}'></script><!-- End Cloudflare Web Analytics -->
<link rel="stylesheet" href="${ root }assets/site.css?v=${ ASSET_V }">
<link rel="stylesheet" href="${ root }assets/brand.css?v=${ ASSET_V }">
<link rel="stylesheet" href="${ root }assets/home.css?v=${ ASSET_V }">
<script>try{localStorage.removeItem('hdh-site-theme');var t=sessionStorage.getItem('hdh-site-theme');document.documentElement.dataset.theme=t==='dark'?'dark':'light';}catch(e){document.documentElement.dataset.theme='light';}</script>
${ extraHead }
</head>
<body data-root="${ root }"${ home ? ' class="is-home"' : '' }>
<a class="skip" href="#main">${ L.skip }</a>
<header class="site-head">
	<div class="wrap">
		<a class="brand brand--logo" href="${ homeHref }" aria-label="${ L.homeAria }">${ logo() }</a>
		<nav id="site-nav" class="nav" aria-label="Main">
			${ nav.map( ( n ) => `<a href="${ n.href }"${ current === n.id ? ' aria-current="page"' : '' }>${ n.label }</a>` ).join( '\n\t\t\t' ) }
		</nav>
		<div class="head-actions">
			<a class="lang-switch" href="${ root }${ alt || otherL.prefix }" hreflang="${ L.other }" lang="${ L.other }" title="${ otherL.switchTitle }">${ L.switchLabel }</a>
			<button class="icon-btn" type="button" data-theme-toggle aria-label="${ L.darkTheme }" aria-pressed="false">${ I.sun }</button>
			<a class="btn btn-primary btn-sm" href="${ appHref }">${ I.open } ${ L.openApp }</a>
			<button class="icon-btn menu-btn" type="button" data-menu-toggle aria-controls="site-nav" aria-expanded="false" aria-label="${ L.menu }">${ I.menu }</button>
		</div>
	</div>
</header>
<main id="main">
${ body }
</main>
<footer class="site-foot">
	<div class="wrap">
		<div class="foot-grid">
			<div class="foot-about">
				<a class="brand brand--logo" href="${ homeHref }" aria-label="${ L.homeAria }">${ logo( 2 ) }</a>
				<p>${ L.about }</p>
			</div>
			<div>
				<h2>${ L.foot.product }</h2>
				<ul>
					<li><a href="${ homeHref }#features">${ L.nav.features }</a></li>
					<li><a href="${ homeHref }#how">${ L.nav.how }</a></li>
					<li><a href="${ appHref }">${ L.nav.app }</a></li>
					<li><a href="${ SITE.repo }">${ L.foot.source }</a></li>
				</ul>
			</div>
			<div>
				<h2>${ L.foot.help }</h2>
				<ul>
					<li><a href="${ homeHref }docs/">${ L.docs.title }</a></li>
					<li><a href="${ homeHref }docs/getting-started/">${ L.foot.started }</a></li>
					<li><a href="${ homeHref }docs/reminders/">${ L.foot.reminders }</a></li>
					<li><a href="${ homeHref }docs/faq/">${ L.foot.faq }</a></li>
				</ul>
			</div>
			<div>
				<h2>${ L.foot.more }</h2>
				<ul>
					${ PROJECTS.filter( ( p ) => p.name !== SITE.name ).map( ( p ) => `<li><a href="${ p.url }" title="${ esc( p.text ) }">${ esc( p.name ) }</a></li>` ).join( '' ) }
					<li><a href="${ SITE.authorUrl }#projects">${ L.foot.allProjects }</a></li>
					<li><a href="https://george-stathopoulos.github.io/blog/" title="${ L.foot.blogTitle }">${ L.foot.blog }</a></li>
				</ul>
			</div>
			<div>
				<h2>${ L.foot.trust }</h2>
				<ul>
					<li><a href="${ homeHref }docs/privacy-and-your-data/">${ L.foot.privacy }</a></li>
					<li><a href="${ SITE.repo }/issues">${ L.foot.feedback }</a></li>
				</ul>
			</div>
		</div>
		<div class="foot-bottom">
			<span>${ L.madeBy } <span class="heart" role="img" aria-label="love">♥</span> ${ L.by } <a href="${ SITE.authorUrl }">${ SITE.author }</a></span>
			<span>Expenity ${ VERSION } · ${ L.cookies }</span>
		</div>
	</div>
</footer>
<script src="${ root }assets/site.js?v=${ ASSET_V }" defer></script>
${ home ? `<script src="${ root }assets/home.js?v=${ ASSET_V }" defer></script>` : '' }
</body>
</html>
`;
}

function write( path, html ) {
	const file = join( OUT, path );
	mkdirSync( dirname( file ), { recursive: true } );
	writeFileSync( file, html );
}

/* ------------------------------------------------------------------ Help center (docs), per language */

const ICON = { 'getting-started': I.play, 'add-money': I.plus, 'wallets-and-currencies': I.wallet, 'budgets-goals-income': I.target, reports: I.chart, reminders: I.bell, 'shared-wallets': I.users, 'themes-and-look': I.palette, 'account-and-sync': I.key, 'install-on-your-device': I.phone, 'privacy-and-your-data': I.shield, faq: I.help };
const urls = [ '', 'app/' ];

for ( const L of Object.values( LANGS ) ) {
	const GROUPS = L.groups;
	const ORDER = GROUPS.flatMap( ( g ) => g.pages );
	const docsDir = L.code === 'el' ? 'docs/el' : 'docs'; // where the Markdown lives
	const sitePrefix = L.prefix; // where the pages are published
	const depth = L.code === 'el' ? 1 : 0;
	const rootFor = ( extra ) => '../'.repeat( depth + extra );
	const docs = {};
	const searchIndex = [];

	for ( const name of ORDER ) {
		const md = new MarkdownIt( { html: false, linkify: false, typographer: false } );
		const headings = [];
		const used = {};
		let title = name;
		md.core.ruler.push( 'dn', ( state ) => {
			state.tokens.forEach( ( tok, i ) => {
				if ( tok.type === 'heading_open' ) {
					const text = state.tokens[ i + 1 ].content;
					let id = slug( text );
					used[ id ] = ( used[ id ] || 0 ) + 1;
					if ( used[ id ] > 1 ) id += '-' + ( used[ id ] - 1 );
					tok.attrSet( 'id', id );
					if ( tok.tag === 'h1' ) title = text;
					else headings.push( { level: tok.tag, id, text: text.replace( /[`*]/g, '' ) } );
				}
				( state.tokens[ i ].children || [] ).forEach( ( c ) => {
					if ( c.type === 'image' ) {
						const src = c.attrGet( 'src' );
						const m = /images\/([a-z0-9-]+)\.png$/.exec( src );
						if ( ! m || ! IMG[ m[ 1 ] ] ) throw new Error( `${ docsDir }/${ name }.md: missing image ${ src }` );
						c.attrSet( 'src', `${ rootFor( 2 ) }assets/img/${ m[ 1 ] }.jpg` );
						c.attrSet( 'width', String( IMG[ m[ 1 ] ].w ) );
						c.attrSet( 'height', String( IMG[ m[ 1 ] ].h ) );
						c.attrSet( 'loading', 'lazy' );
						c.attrSet( 'decoding', 'async' );
					}
					if ( c.type === 'link_open' ) {
						// The docs use GitHub-friendly links (other-guide.md#section); on the site they're pages.
						const href = c.attrGet( 'href' );
						const m = /^([a-z0-9-]+)\.md(#.+)?$/i.exec( href );
						if ( m ) c.attrSet( 'href', m[ 1 ] === 'README' ? `../${ m[ 2 ] || '' }` : `../${ m[ 1 ] }/${ m[ 2 ] || '' }` );
						else if ( /^(\.\.\/)?specs\//.test( href ) ) c.attrSet( 'href', `${ SITE.repo }/blob/main/docs/${ href.replace( /^\.\.\//, '' ) }` );
						else if ( /^https?:/.test( href ) ) c.attrSet( 'rel', 'noopener' );
					}
				} );
			} );
		} );
		const src = readFileSync( join( ROOT, docsDir, name + '.md' ), 'utf8' );
		let html = md.render( src );
		html = html
			.replace( /<p>(<img [^>]*alt="([^"]*)"[^>]*>)<\/p>/g, '<figure data-zoom>$1<figcaption>$2</figcaption></figure>' )
			.replace( /<pre>/g, '<pre tabindex="0">' )
			.replace( /<table>/g, '<table tabindex="0">' )
			.replace( /<(h[23]) id="([^"]+)">(.*?)<\/\1>/g, '<$1 id="$2">$3<a class="anchor" href="#$2" aria-label="#">#</a></$1>' );
		docs[ name ] = { title, html, headings, src };

		// Search entries: the page itself and each section.
		const plain = ( s ) => s.replace( /\[([^\]]+)\]\([^)]*\)/g, '$1' ).replace( /!\[[^\]]*\]\([^)]*\)/g, ' ' ).replace( /[`*_>#|]/g, ' ' ).replace( /:?-{3,}:?/g, ' ' ).replace( /\s+/g, ' ' ).trim();
		src.split( /\n(?=#{2,3} )/ ).forEach( ( part, i ) => {
			const m = /^(#{1,3}) (.+)\n/.exec( part.startsWith( '#' ) ? part : '# ' + title + '\n' + part );
			const heading = i === 0 ? '' : m ? m[ 2 ] : '';
			const id = heading ? headings.find( ( h ) => h.text === heading.replace( /[`*]/g, '' ) )?.id || '' : '';
			searchIndex.push( { t: title, s: heading.replace( /[`*]/g, '' ), u: `${ sitePrefix }docs/${ name }/${ id ? '#' + id : '' }`, x: plain( part.replace( /^#{1,3} .+\n/, '' ) ).slice( 0, 600 ) } );
		} );
	}

	// site.js reads the search index from this global (shared with the other project sites). Result links are
	// relative to the site root, so the script is given the root of each page via data-root on <body>.
	const idxFile = L.code === 'el' ? 'assets/search-index-el.js' : 'assets/search-index.js';
	writeFileSync( join( OUT, idxFile ), 'window.HDH_SEARCH=' + JSON.stringify( searchIndex ) + ';' + ( L.code === 'el' ? 'window.HDH_STR=' + JSON.stringify( L.str ) + ';' : '' ) );
	const SEARCH_SCRIPT = ( root ) => `<script src="${ root }${ idxFile }?v=${ ASSET_V }" defer></script>`;

	const searchBox = ( id, placeholder ) => `<div class="search" data-search role="search">
	<label class="sr" for="${ id }">${ L.docs.searchLabel }</label>
	<input id="${ id }" type="search" placeholder="${ esc( placeholder ) }" autocomplete="off" spellcheck="false" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="${ id }-results">
	<ul class="search-results" id="${ id }-results" role="listbox" aria-label="${ L.docs.searchLabel }" hidden></ul>
	<p class="sr" role="status" aria-live="polite"></p>
</div>`;

	const docsNav = ( current ) => `<aside class="docs-nav" aria-label="${ L.docs.title }">
	${ searchBox( 'side-search', L.code === 'el' ? 'Αναζήτηση…' : 'Search help…' ) }
	<details open>
		<summary class="docs-nav-toggle">${ L.docs.browse }</summary>
		<ul><li><a href="../"${ current === '' ? ' aria-current="page"' : '' }>${ L.docs.home }</a></li></ul>
		${ GROUPS.map( ( g ) => `<h2>${ g.label }</h2><ul>${ g.pages.map( ( p ) => `<li><a href="../${ p }/"${ current === p ? ' aria-current="page"' : '' }>${ esc( docs[ p ].title ) }</a></li>` ).join( '' ) }</ul>` ).join( '\n\t\t' ) }
	</details>
</aside>`;

	const altOf = ( path ) => ( L.code === 'en' ? 'el/' + path : path.replace( /^el\//, '' ) );

	ORDER.forEach( ( name, i ) => {
		const d = docs[ name ];
		const prev = ORDER[ i - 1 ];
		const next = ORDER[ i + 1 ];
		const toc = d.headings.filter( ( h ) => h.level === 'h2' );
		const body = `<div class="wrap docs-layout">
${ docsNav( name ) }
<article class="doc">
	<nav class="crumbs" aria-label="Breadcrumb"><a href="../">${ L.docs.crumbs }</a> › ${ esc( d.title ) }</nav>
	${ d.html }
	<div class="help-strip"><p><strong>${ L.docs.stuck }</strong> ${ L.docs.stuckA } <a href="../faq/">FAQ</a>, ${ L.docs.stuckB } <a href="${ SITE.repo }/issues">${ L.docs.stuckC }</a>.</p></div>
	<nav class="pager" aria-label="${ L.docs.pagerAria }">
		${ prev ? `<a class="prev" href="../${ prev }/"><small>${ L.docs.prev }</small>${ esc( docs[ prev ].title ) }</a>` : '' }
		${ next ? `<a class="next" href="../${ next }/"><small>${ L.docs.next }</small>${ esc( docs[ next ].title ) }</a>` : '' }
	</nav>
</article>
${ toc.length > 1 ? `<nav class="on-page" aria-label="${ L.docs.toc }" data-spy><h2>${ L.docs.toc }</h2><ul>${ toc.map( ( h ) => `<li><a href="#${ h.id }">${ esc( h.text ) }</a></li>` ).join( '' ) }</ul></nav>` : '<div></div>' }
</div>`;
		const path = `${ sitePrefix }docs/${ name }/`;
		write( `${ path }index.html`, layout( { lang: L.code, title: d.title, description: L.blurb[ name ], root: rootFor( 2 ), current: 'docs', canonical: path, alt: altOf( path ), body, extraHead: SEARCH_SCRIPT( rootFor( 2 ) ) } ) );
		urls.push( path );
	} );

	// Help center home.
	{
		const body = `<section class="docs-hero">
	<div class="wrap">
		<h1>${ L.docs.hero }</h1>
		<p>${ L.docs.heroP }</p>
		${ searchBox( 'hero-search', L.docs.placeholder ) }
	</div>
</section>
<div class="wrap docs-groups">
	<h2>${ L.docs.popular }</h2>
	<div class="grid-3">
		${ L.popular.map( ( [ p, a, label ] ) => `<a class="card" href="${ p }/${ a ? '#' + a : '' }"><h3>${ esc( label ) }</h3><p>${ esc( docs[ p ].title ) }</p><span class="more">${ L.docs.read }</span></a>` ).join( '\n\t\t' ) }
	</div>
	${ GROUPS.map( ( g ) => `<h2>${ g.label }</h2>
	<div class="grid-3">
		${ g.pages.map( ( p ) => `<a class="card" href="${ p }/"><span class="ic">${ ICON[ p ] }</span><h3>${ esc( docs[ p ].title ) }</h3><p>${ esc( L.blurb[ p ] ) }</p></a>` ).join( '\n\t\t' ) }
	</div>` ).join( '\n\t' ) }
</div>`;
		const path = `${ sitePrefix }docs/`;
		write( `${ path }index.html`, layout( { lang: L.code, title: L.docs.title, description: L.docs.heroP, root: rootFor( 1 ), current: 'docs', canonical: path, alt: altOf( path ), body, extraHead: SEARCH_SCRIPT( rootFor( 1 ) ) } ) );
		urls.push( path );
	}

	// Home.
	{
		const root = rootFor( 0 );
		const file = L.code === 'el' ? 'home-el.html' : 'home.html';
		const body = readFileSync( join( SRC, file ), 'utf8' )
			.replace( /\{\{img:([a-z0-9-]+)\|([^}]+)\}\}/g, ( m, name, alt ) => img( name, alt, root ) )
			.replace( /\{\{root\}\}/g, root )
			.replace( /\{\{repo\}\}/g, SITE.repo )
			.replace( /\{\{version\}\}/g, VERSION );
		write( `${ sitePrefix }index.html`, layout( { lang: L.code, title: L.titleHome, description: L.descHome, root, canonical: sitePrefix, alt: L.code === 'en' ? 'el/' : '', body, home: true } ) );
		if ( L.code === 'el' ) urls.push( 'el/' );
	}
	console.log( `${ L.code }: ${ ORDER.length } help pages, ${ searchIndex.length } search entries` );
}

/* ------------------------------------------------------------------ 404, sitemap, robots */

{
	const L = LANGS.en;
	const body = `<section class="page-head" style="border:0;text-align:center;padding:120px 0"><div class="wrap"><span class="kicker">404</span><h1>${ L.page404.h }</h1><p style="margin:0 auto 28px">${ L.page404.p }</p><div class="cta-row"><a class="btn btn-primary" href="${ SITE.base }">${ L.page404.home }</a><a class="btn btn-ghost" href="${ SITE.base }docs/">${ L.page404.docs }</a></div></div></section>`;
	write( '404.html', layout( { lang: 'en', title: 'Page not found', description: 'Page not found.', root: SITE.base, body } ) );
	write( 'sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${ urls.map( ( u ) => `<url><loc>${ SITE.url }${ u }</loc></url>` ).join( '\n' ) }\n</urlset>\n` );
	write( 'robots.txt', `User-agent: *\nAllow: /\nSitemap: ${ SITE.url }sitemap.xml\n` );
}

console.log( `website/dist built, version ${ VERSION }` );
