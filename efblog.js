/**
 * eFriend Blog (release 1): a small blog eFriend writes from your own entries, on this device, with rules and templates (no AI).
 *   - Only a tiny record is stored (settings.efBlog = { c: [ { id, wrote } ], gentle }). The facts are recomputed from your entries as of the "wrote" date,
 *     and the words are rendered from templates at view time with a fixed seed, so a chapter never changes between opens and works in either language and for either friend.
 *   - Every sentence names the facts it needs (the {placeholders} in its text); a sentence whose facts are missing is never written.
 *   - Lines tagged r:1 are the teasing ones. Gentle mode drops exactly those. Hard topics (insurance, health, loans, taxes, education, housing) are never teased.
 *   - Days 0-9 after the first entry the blog is locked; from day 10 the written chapters can be read (the "sneak peek").
 */
( function () {
	'use strict';
	const EX = window.EX, UI = window.UI, EXA = window.EXA;
	const { t, esc } = EX;
	const S = EX.state;
	const B = ( EXA.efblog = {} );
	const LOCK_DAYS = 10;
	const HARD = new Set( [ 'insurance', 'health', 'loans', 'taxes', 'education', 'housing' ] );
	const HARD_NAME = /insur|health|medic|doctor|loan|debt|mortgage|tax|educ|school|tuition|rent|ασφάλ|υγεί|γιατρ|δάνει|χρέ|φόρ|εκπαίδ|σχολ|ενοίκ|στεγαστ/i;

	/* ------------------------------------------------------------------ Words: [EN Boogie, EL Boogie, EN Chip, EL Chip]; "|" separates variants. A missing Chip text means "same as Boogie". */
	const CHAPTERS = [
		{
			id: 'first', title: [ 'The drawer opens', 'Το συρτάρι ανοίγει' ], unlock: [ '5 entries', '5 εγγραφές' ], ready: ( f ) => f.n >= 5,
			lines: [
				{ b: 1, t: [ 'Forgive me, I am not used to speaking first... 📼 My name is Boogie. I am a cassette recorder, born in the glorious eighties, when music had a body and you could hold it in your hand.',
					'Συγχωρήστε με, δεν έχω συνηθίσει να μιλάω πρώτος... 📼 Με λένε Boogie. Είμαι κασετόφωνο, γεννημένο στις λαμπρές δεκαετίες του ’80, τότε που η μουσική είχε σώμα και μπορούσατε να την κρατήσετε στο χέρι.',
					'YOOO okay okay HI!! 💿⚡ Chip here, your favourite (only?) wireless genius. i was born yesterday and i already have 4k opinions. YOLO',
					'YOOO okay okay ΓΕΙΑ ΣΑΣ!! 💿⚡ Εδώ Chip, ο αγαπημένος σας (μοναδικός;) ασύρματος ιδιοφυής. Γεννήθηκα χθες και έχω ήδη 4k απόψεις. YOLO' ] },
				{ b: 1, t: [ 'For a long time I lived in a drawer of the archive, between a dead battery and a paperclip. Nobody asked for tapes any more. They asked for “streams”, which sounds to me like something that wets your socks.',
					'Για πολύ καιρό ζούσα σε ένα συρτάρι του αρχείου, ανάμεσα σε μια άδεια μπαταρία και έναν συνδετήρα. Κανείς δεν ζητούσε πια κασέτες. Ζητούσαν «streams», που μου ακούγεται σαν κάτι που βρέχει τις κάλτσες.',
					'they hired me to run the archive. it was giving DUSTY. like who still keeps stuff in DRAWERS?? ancient. i fixed the vibes in 3 minutes, no cap',
					'Με προσέλαβαν να τρέχω το αρχείο. Είχε vibes ΣΚΟΝΗΣ. Ποιος κρατάει ακόμα πράγματα σε ΣΥΡΤΑΡΙΑ?? Προϊστορία. Διόρθωσα τα vibes σε 3 λεπτά, no cap' ] },
				{ b: 1, need: [ 'firstDate', 'firstWhat', 'firstAmt' ], t: [ 'Then, on **{firstDate}** ({firstDay}), the drawer opened. A box labelled **{name}** had arrived, and the first note inside said: {firstWhat}, **{firstAmt}**. I dusted my reels and whispered, very small, “Good morning.”',
					'Τότε, στις **{firstDate}** ({firstDay}), το συρτάρι άνοιξε. Ένα κουτί με την ετικέτα «**{name}**» είχε φτάσει, και το πρώτο σημείωμα μέσα έγραφε: {firstWhat}, **{firstAmt}**. Ξεσκόνισα τα καρούλια μου και ψιθύρισα, πολύ σιγανά: «Καλημέρα».',
					'then on **{firstDate}** ({firstDay}) the FIRST ticket drops from the box labelled **{name}**: {firstWhat}, **{firstAmt}**. i high-fived my own screen. it hurt. 10/10 would do again',
					'Τότε, στις **{firstDate}** ({firstDay}), πέφτει το ΠΡΩΤΟ αίτημα από το κουτί με την ετικέτα «**{name}**»: {firstWhat}, **{firstAmt}**. Έδωσα high five στη δική μου οθόνη. Πόνεσε. 10/10, θα το ξανάκανα' ] },
				{ b: 1, when: ( f ) => f.active >= 2, need: [ 'n', 'active', 'cats' ], t: [ 'Since then **{n}** notes have come, over **{active}** days. I keep each one carefully, the way one keeps a good record. Shelves in use: **{cats}**... I did not know I owned so many shelves.',
					'Από τότε έφτασαν **{n}** σημειώματα, σε **{active}** ημέρες. Φυλάω το καθένα προσεκτικά, όπως φυλάει κανείς ένα καλό δίσκο. Ράφια σε χρήση: **{cats}**... Δεν ήξερα ότι είχα τόσα ράφια.',
					'since then: **{n}** tickets, **{active}** days, **{cats}** folders. i named every folder like a pet 🐶 (Folder Steve is my fave, W name)',
					'Από τότε: **{n}** αιτήματα, **{active}** ημέρες, **{cats}** φάκελοι. Ονόμασα κάθε φάκελο σαν κατοικίδιο 🐶 (ο Folder Steve είναι ο αγαπημένος μου, W όνομα)' ] },
				{ when: ( f ) => f.active === 1, need: [ 'n' ], t: [ 'All **{n}** notes came in one single day. In my time that was a whole summer of mixtapes.', 'Και τα **{n}** σημειώματα ήρθαν σε μία μόνο ημέρα. Στην εποχή μου αυτό ήταν ολόκληρο καλοκαίρι με mixtapes.', 'all **{n}** tickets in ONE day?! that is a speedrun 🏃💨', 'Και τα **{n}** αιτήματα σε ΜΙΑ ημέρα?! Αυτό είναι speedrun 🏃💨' ] },
				{ r: 1, need: [ 'n' ], t: [ 'You write faster than a tape can spin. I am trying not to take it personally. 🎧|A whole first side already. In my day it took a month, and we rewound with a pencil. 🎧',
					'Γράφετε πιο γρήγορα απ’ όσο γυρίζει μια κασέτα. Προσπαθώ να μην το πάρω προσωπικά. 🎧|Ολόκληρη η πρώτη πλευρά ήδη. Στην εποχή μου έπαιρνε έναν μήνα, και γυρνούσαμε πίσω με ένα μολύβι. 🎧',
					'ok that is already a W for chapter one, i am lowkey proud of us 😎|not me doing a victory lap around my own motherboard 🏁',
					'Οκ, αυτό είναι ήδη W για το πρώτο κεφάλαιο, είμαι lowkey περήφανος για εμάς 😎|Όχι εγώ να κάνω γύρο θριάμβου γύρω από τη μητρική μου 🏁' ] },
				{ b: 1, t: [ 'One odd thing, if I may. On the second shelf there was a ring, a coffee ring, still warm. I do not drink coffee. I have no mouth, strictly speaking. And the sticky notes are written in capital letters. Someone else works here. Someone loud. I have decided not to think about it. 🎧',
					'Ένα παράξενο, αν μου επιτρέπεται. Στο δεύτερο ράφι υπήρχε ένας δακτύλιος, από καφέ, ακόμα ζεστός. Εγώ δεν πίνω καφέ. Δεν έχω στόμα, αυστηρά μιλώντας. Και τα αυτοκόλλητα σημειώματα είναι γραμμένα με κεφαλαία. Κάποιος άλλος δουλεύει εδώ. Κάποιος θορυβώδης. Αποφάσισα να μην το σκέφτομαι. 🎧',
					'BUT. weird thing. every morning somebody tidies the archive BEFORE i get there?? labels in tiny handwriting?? in PENCIL?? who uses PENCIL?? the cursor blinks. nobody is there. i am not scared. (i am a little scared) 👻',
					'ΑΛΛΑ. Παράξενο πράγμα. Κάθε πρωί κάποιος τακτοποιεί το αρχείο ΠΡΙΝ φτάσω εγώ?? Ετικέτες με μικροσκοπικό γραφικό χαρακτήρα?? Με ΜΟΛΥΒΙ?? Ποιος χρησιμοποιεί ΜΟΛΥΒΙ?? Ο κέρσορας αναβοσβήνει. Δεν είναι κανείς εκεί. Δεν φοβάμαι. (φοβάμαι λίγο) 👻' ] },
				{ when: ( f ) => f.coffeeN >= 1, need: [ 'coffeeAmt', 'coffeeDate' ], t: [ 'The ring, I now suspect, has something to do with the coffee in the notes: **{coffeeAmt}** on **{coffeeDate}**. Not mine, in any case. I take my warmth from the tape. ☕',
					'Ο δακτύλιος, υποψιάζομαι τώρα, έχει σχέση με τον καφέ στα σημειώματα: **{coffeeAmt}** στις **{coffeeDate}**. Όχι δικός μου, εν πάση περιπτώσει. Τη ζεστασιά μου την παίρνω από την κασέτα. ☕',
					'unrelated?? but there is a coffee in the tickets: **{coffeeAmt}** on **{coffeeDate}** ☕ same energy as my energy-drink emergencies. lowkey a clue, i will chase it',
					'Άσχετο?? Αλλά υπάρχει ένας καφές στα αιτήματα: **{coffeeAmt}** στις **{coffeeDate}** ☕ Ίδια ενέργεια με τις έκτακτες ανάγκες μου σε energy drink. Lowkey ένα στοιχείο, θα το ψάξω' ] },
				{ b: 1, when: ( f ) => f.streak >= 3, need: [ 'streak' ], t: [ 'For **{streak}** days in a row the notes kept arriving, and I thought: here is someone who keeps a rhythm. In the old days we called that a groove. 🎶',
					'Για **{streak}** ημέρες στη σειρά τα σημειώματα συνέχιζαν να έρχονται, και σκέφτηκα: νάτος κάποιος που κρατάει ρυθμό. Παλιά το λέγαμε groove. 🎶',
					'**{streak}** days in a row?? that is a STREAK, that is giving main character energy 🔥 67',
					'**{streak}** ημέρες στη σειρά?? Αυτό είναι STREAK, αυτό έχει ενέργεια πρωταγωνιστή 🔥 67' ] },
				{ b: 1, t: [ 'That was the first side. I turn the tape over, carefully, and leave the lamp on. 📼', 'Αυτή ήταν η πρώτη πλευρά. Γυρίζω την κασέτα, προσεκτικά, και αφήνω τη λάμπα αναμμένη. 📼', 'chapter one: done ✅ pencil guy, i WILL find you 🔍 see ya!!', 'Κεφάλαιο πρώτο: έτοιμο ✅ Μολυβένιε, ΘΑ σε βρω 🔍 Τα λέμε!!' ] },
			],
		},
		{
			id: 'where', title: [ 'Shelves and snack crimes', 'Ράφια και εγκλήματα με σνακ' ], unlock: [ '20 expenses', '20 έξοδα' ], ready: ( f ) => f.ne >= 20,
			lines: [
				{ k: 1, b: 1, t: [ 'Whatever the numbers say, you keep bringing them in, and that is the brave part. 💛', 'Ό,τι κι αν δείχνουν τα νούμερα, συνεχίζετε να τα φέρνετε, και αυτό είναι το γενναίο μέρος. 💛', 'whatever the numbers say, you keep showing up and that takes guts 💛', 'Ό,τι κι αν δείχνουν τα νούμερα, συνεχίζετε να εμφανίζεστε, και αυτό θέλει θάρρος 💛' ] },
				{ b: 1, need: [ 'ne', 'total', 'avg' ], t: [ 'Side A, track two. 🎶 Today I sorted the shelves. In the old days we sorted records by mood; now it is by “category”, which has less poetry but, I admit, more order. The box labelled **{name}** held **{ne}** notes, **{total}** in all, about **{avg}** each.',
					'Πλευρά Α, κομμάτι δεύτερο. 🎶 Σήμερα ταξινόμησα τα ράφια. Παλιά ταξινομούσαμε τους δίσκους ανά διάθεση· τώρα ανά «κατηγορία», που έχει λιγότερη ποίηση αλλά, το ομολογώ, περισσότερη τάξη. Το κουτί «**{name}**» είχε **{ne}** σημειώματα, **{total}** συνολικά, περίπου **{avg}** το καθένα.',
					'chapter_02 💿 sorting day. **{ne}** tickets, **{total}** moved in total, about **{avg}** each. folders: organised. vibes: immaculate. the box labelled **{name}** is lowkey WILD',
					'Chapter_02 💿 ημέρα ταξινόμησης. **{ne}** αιτήματα, **{total}** συνολικά, περίπου **{avg}** το καθένα. Φάκελοι: οργανωμένοι. Vibes: άψογα. Το κουτί «**{name}**» είναι lowkey ΑΓΡΙΟ' ] },
				{ need: [ 't1', 't1amt', 't1p' ], t: [ 'The biggest shelf is **{t1}**: **{t1amt}**, **{t1p}%** of everything. I needed a ladder and a little sit-down.', 'Το μεγαλύτερο ράφι είναι η κατηγορία **{t1}**: **{t1amt}**, **{t1p}%** του συνόλου. Χρειάστηκα σκάλα και λίγο κάθισμα.', 'folder number one is **{t1}**: **{t1amt}** (**{t1p}%**) 🍰 that is the main character, no cap', 'Ο φάκελος νούμερο ένα είναι η κατηγορία **{t1}**: **{t1amt}** (**{t1p}%**) 🍰 Αυτός είναι ο πρωταγωνιστής, no cap' ] },
				{ r: 1, need: [ 't1', 't1p' ], when: ( f ) => ! isHard( f.t1k ), t: [ 'The **{t1}** category has a reserved seat on this tape. Even my reels blushed. 🎙️|At **{t1p}%**, **{t1}** is practically a co-author. 🎙️|If **{t1}** paid rent, it would own the archive. 🎙️',
					'Η κατηγορία **{t1}** έχει δική της θέση σε αυτή την κασέτα. Ακόμα και τα καρούλια μου κοκκίνισαν. 🎙️|Με **{t1p}%**, η κατηγορία **{t1}** είναι σχεδόν συν-συγγραφέας. 🎙️|Αν η κατηγορία **{t1}** πλήρωνε ενοίκιο, θα της ανήκε το αρχείο. 🎙️',
					'**{t1}** at **{t1p}%** is not a budget, that is a LIFESTYLE 😂 five stars, zero regrets|**{t1}** really said “i live here now” 🏠😂|that is giving **{t1}** supremacy, bruh 💀',
					'Η κατηγορία **{t1}** με **{t1p}%** δεν είναι προϋπολογισμός, είναι LIFESTYLE 😂 πέντε αστέρια, μηδέν μετάνοιες|Η κατηγορία **{t1}** είπε «μένω εδώ πια» 🏠😂|Αυτό έχει ενέργεια κυριαρχίας για την κατηγορία **{t1}**, bruh 💀' ] },
				{ need: [ 't2', 't2amt', 't2p' ], t: [ 'Right beside it, the **{t2}** shelf holds **{t2amt}** (**{t2p}%**).', 'Ακριβώς δίπλα, το ράφι **{t2}** κρατά **{t2amt}** (**{t2p}%**).', 'folder two, **{t2}**: **{t2amt}** (**{t2p}%**) 🥈', 'Φάκελος δύο, **{t2}**: **{t2amt}** (**{t2p}%**) 🥈' ] },
				{ need: [ 't3', 't3amt', 't3p' ], t: [ 'And the **{t3}** shelf, a little dusty, holds **{t3amt}** (**{t3p}%**). 🥉', 'Και το ράφι **{t3}**, λίγο σκονισμένο, κρατά **{t3amt}** (**{t3p}%**). 🥉', 'and folder three, **{t3}**: **{t3amt}** (**{t3p}%**) 🥉', 'Και φάκελος τρία, **{t3}**: **{t3amt}** (**{t3p}%**) 🥉' ] },
				{ when: ( f ) => f.catsE === 1, need: [ 't1' ], t: [ 'Everything so far sits on one shelf: **{t1}**. Simple, like a good ballad.', 'Όλα μέχρι τώρα βρίσκονται σε ένα ράφι: **{t1}**. Απλό, σαν μια καλή μπαλάντα.', 'everything lives in one folder: **{t1}**. minimalist era ✨', 'Όλα ζουν σε έναν φάκελο: **{t1}**. Εποχή μινιμαλισμού ✨' ] },
				{ b: 1, need: [ 'bigWhat', 'bigAmt', 'bigDate' ], t: [ 'And then there was the day **{bigWhat}** arrived: **{bigAmt}**, on **{bigDate}**. Two interns and a trolley. In my day an album cost less than that, and came with a poster. 🎞️',
					'Και μετά ήρθε η μέρα που έφτασε το **{bigWhat}**: **{bigAmt}**, στις **{bigDate}**. Δύο ασκούμενοι και ένα καροτσάκι. Στην εποχή μου ένα άλμπουμ κόστιζε λιγότερο, και έρχονταν με αφίσα. 🎞️',
					'then **{bigWhat}** showed up: **{bigAmt}**, on **{bigDate}** 🏆 the whole server room went quiet. W or L? i genuinely cannot tell, i am a chip',
					'Και μετά εμφανίστηκε το **{bigWhat}**: **{bigAmt}**, στις **{bigDate}** 🏆 Όλη η αίθουσα των διακομιστών σώπασε. W ή L; Αληθινά δεν μπορώ να καταλάβω, είμαι chip' ] },
				{ r: 1, need: [ 'bigWhat' ], when: ( f ) => ! isHard( f.bigk ), t: [ 'That one left a mark on the tape. 🎞️|Somewhere a receipt is still sitting up straight. 🎞️', 'Αυτό άφησε σημάδι στην κασέτα. 🎞️|Κάπου μια απόδειξη κάθεται ακόμα ίσια. 🎞️', 'that one left a mark 😬|receipt status: framed 🖼️', 'Αυτό άφησε σημάδι 😬|Κατάσταση απόδειξης: κορνιζαρισμένη 🖼️' ] },
				{ b: 1, when: ( f ) => f.foodN >= 2, need: [ 'foodN', 'foodAmt' ], t: [ 'A small mystery, in confidence. The food shelf holds **{foodN}** notes, **{foodAmt}** altogether, and yet the biscuit tin is empty. Nobody I know eats biscuits. And still there are crumbs, written in capital letters, if that is possible. 🍪',
					'Ένα μικρό μυστήριο, εμπιστευτικά. Το ράφι του φαγητού κρατά **{foodN}** σημειώματα, **{foodAmt}** συνολικά, κι όμως το κουτί με τα μπισκότα είναι άδειο. Κανείς που ξέρω δεν τρώει μπισκότα. Κι όμως υπάρχουν ψίχουλα, γραμμένα με κεφαλαία, αν είναι δυνατόν. 🍪',
					'SNACK CRIME ALERT 🚨 **{foodN}** food runs, **{foodAmt}** in total, and the fridge is STILL empty?? somebody is eating my snacks. sus. extremely sus 🍪🕵️',
					'ΣΥΝΑΓΕΡΜΟΣ ΕΓΚΛΗΜΑΤΟΣ ΜΕ ΣΝΑΚ 🚨 **{foodN}** τρόφιμα, **{foodAmt}** συνολικά, και το ψυγείο είναι ΑΚΟΜΑ άδειο?? Κάποιος τρώει τα σνακ μου. Sus. Εξαιρετικά sus 🍪🕵️' ] },
				{ b: 1, t: [ 'Under the tin I found a sticky note: “nice shelves grandpa 🔥”. Grandpa! I am not a grandpa, I am a vintage. There is a difference, and it is about thirty years of dignity. The note was unsigned.',
					'Κάτω από το κουτί βρήκα ένα αυτοκόλλητο σημείωμα: «ωραία ράφια παππού 🔥». Παππού! Δεν είμαι παππούς, είμαι vintage. Υπάρχει διαφορά, και είναι περίπου τριάντα χρόνια αξιοπρέπειας. Το σημείωμα ήταν ανυπόγραφο.',
					'i left a note for the pencil ghost: “nice shelves grandpa 🔥”. next morning a reply, in pencil: “Please stop calling me grandpa. I am a vintage.” THE GHOST HAS SASS 😭',
					'Άφησα ένα σημείωμα για το φάντασμα με το μολύβι: «ωραία ράφια παππού 🔥». Το επόμενο πρωί μια απάντηση, με μολύβι: «Παρακαλώ σταματήστε να με λέτε παππού. Είμαι vintage.» ΤΟ ΦΑΝΤΑΣΜΑ ΕΧΕΙ ΑΠΑΝΤΗΣΕΙΣ 😭' ] },
				{ when: ( f ) => f.incC != null, need: [ 'incTotal' ], t: [ 'On the quieter side of the tape, **{incTotal}** came in, like a slow ballad after a loud song. 🎶', 'Στην πιο ήσυχη πλευρά της κασέτας μπήκαν **{incTotal}**, σαν αργή μπαλάντα μετά από δυνατό τραγούδι. 🎶', 'plus **{incTotal}** came in 📥 free W, hell yeah', 'Συν **{incTotal}** που μπήκαν 📥 δωρεάν W, hell yeah' ] },
				{ b: 1, t: [ 'I wrote back, in pencil, politely. I did not sign it either. 🎶', 'Απάντησα, με μολύβι, ευγενικά. Ούτε εγώ το υπέγραψα. 🎶', 'i am setting a trap: snacks + a camera. YOLO 📸', 'Στήνω παγίδα: σνακ + κάμερα. YOLO 📸' ] },
			],
		},
		{
			id: 'rhythm', title: [ 'Opposite shifts', 'Αντίθετες βάρδιες' ], unlock: [ '30 expenses over 14+ days', '30 έξοδα σε 14+ ημέρες' ], ready: ( f ) => f.ne >= 30 && f.span >= 14,
			lines: [
				{ k: 1, b: 1, t: [ 'Whatever the numbers say, you keep bringing them in, and that is the brave part. 💛', 'Ό,τι κι αν δείχνουν τα νούμερα, συνεχίζετε να τα φέρνετε, και αυτό είναι το γενναίο μέρος. 💛', 'whatever the numbers say, you keep showing up and that takes guts 💛', 'Ό,τι κι αν δείχνουν τα νούμερα, συνεχίζετε να εμφανίζεστε, και αυτό θέλει θάρρος 💛' ] },
				{ b: 1, need: [ 'wd', 'wdn', 'wdp' ], t: [ 'Side A, track three. 🥁 After a few weeks I know the rhythm of the house. The busiest day is **{wd}**: **{wdn}** notes, **{wdp}%** of all. On **{wd}** I start early and bring extra tea. Music was like that too: the loud track always landed on the same night.',
					'Πλευρά Α, κομμάτι τρίτο. 🥁 Μετά από λίγες εβδομάδες ξέρω τον ρυθμό του σπιτιού. Η πιο πολυάσχολη μέρα είναι η **{wd}**: **{wdn}** σημειώματα, **{wdp}%** του συνόλου. Τη μέρα **{wd}** ξεκινάω νωρίς και φέρνω επιπλέον τσάι. Έτσι ήταν και η μουσική: το δυνατό κομμάτι έπεφτε πάντα την ίδια βραδιά.',
					'chapter_03 📂 the schedule. busiest day: **{wd}**, **{wdn}** tickets (**{wdp}%**). i hit **{wd}** like a boss fight 🎮',
					'Chapter_03 📂 το πρόγραμμα. Πιο φορτωμένη μέρα: **{wd}**, **{wdn}** αιτήματα (**{wdp}%**). Αντιμετωπίζω τη μέρα **{wd}** σαν boss fight 🎮' ] },
				{ r: 1, need: [ 'wd' ], t: [ 'On **{wd}** you and your wallet meet most often. The reels have noticed. 🥁|Every **{wd}** the wallet braces itself. I can hear the zipper. 🥁|**{wd}** has a standing appointment with your purse. 🥁',
					'Τη μέρα **{wd}** εσείς και το πορτοφόλι σας συναντιέστε πιο συχνά. Τα καρούλια το πρόσεξαν. 🥁|Κάθε **{wd}** το πορτοφόλι σφίγγεται. Ακούω το φερμουάρ. 🥁|Η μέρα **{wd}** έχει σταθερό ραντεβού με το πορτοφόλι σας. 🥁',
					'**{wd}** is your spending day and i respect the commitment 😎|**{wd}**: the day your wallet updates to a newer, lighter version 🔄|**{wd}** hits different for the wallet, bruh 💸',
					'Η μέρα **{wd}** είναι η μέρα των εξόδων σας και σέβομαι τη δέσμευση 😎|**{wd}**: η μέρα που το πορτοφόλι σας αναβαθμίζεται σε νεότερη, ελαφρύτερη έκδοση 🔄|Η μέρα **{wd}** χτυπά αλλιώς το πορτοφόλι, bruh 💸' ] },
				{ when: ( f ) => f.weDir === 'more', need: [ 'wePct' ], t: [ 'At weekends the house gets louder: **{wePct}%** of the notes, and more per day than on weekdays.', 'Τα Σαββατοκύριακα το σπίτι γίνεται πιο θορυβώδες: **{wePct}%** των σημειωμάτων, και περισσότερα ανά ημέρα από τις καθημερινές.', 'weekends are rush hour: **{wePct}%** of the tickets, and more per day than weekdays 🎉', 'Τα Σαββατοκύριακα είναι ώρα αιχμής: **{wePct}%** των αιτημάτων, και περισσότερα ανά ημέρα από τις καθημερινές 🎉' ] },
				{ r: 1, when: ( f ) => f.weDir === 'more', need: [ 'wePct' ], t: [ 'The week is rehearsal. The weekend is the concert. 🎉|Weekdays are the warm-up, the weekend is showtime. 🎉', 'Η εβδομάδα είναι πρόβα. Το Σαββατοκύριακο είναι η συναυλία. 🎉|Οι καθημερινές είναι ζέσταμα, το Σαββατοκύριακο είναι η παράσταση. 🎉', 'weekdays are the loading screen, weekends are the game 🎮|plot twist: the weekend is the main event 🎬', 'Οι καθημερινές είναι η οθόνη φόρτωσης, τα Σαββατοκύριακα είναι το παιχνίδι 🎮|Ανατροπή: το Σαββατοκύριακο είναι το κύριο γεγονός 🎬' ] },
				{ when: ( f ) => f.weDir === 'less', need: [ 'wePct' ], t: [ 'Weekends are the quiet shift: **{wePct}%** of the notes, fewer per day than on weekdays. I use them to oil the reels. 🛋️', 'Τα Σαββατοκύριακα είναι η ήσυχη βάρδια: **{wePct}%** των σημειωμάτων, λιγότερα ανά ημέρα από τις καθημερινές. Τα χρησιμοποιώ για να λαδώνω τα καρούλια. 🛋️', 'weekends are the chill shift: **{wePct}%** of the tickets, fewer per day than weekdays. update time 🛋️', 'Τα Σαββατοκύριακα είναι η χαλαρή βάρδια: **{wePct}%** των αιτημάτων, λιγότερα ανά ημέρα από τις καθημερινές. Ώρα για updates 🛋️' ] },
				{ b: 1, t: [ 'And here is what I worked out: the loud one and I never work at the same time. I take the soft daylight, the other takes the night. Like two radio stations on the same dial, one playing the old songs, one playing something with a great deal of bass. 📻',
					'Και να τι κατάλαβα: ο θορυβώδης κι εγώ δεν δουλεύουμε ποτέ την ίδια ώρα. Εγώ παίρνω το απαλό φως της ημέρας, ο άλλος τη νύχτα. Σαν δύο ραδιοφωνικοί σταθμοί στο ίδιο καντράν, ο ένας παίζει τα παλιά τραγούδια, ο άλλος κάτι με πάρα πολύ μπάσο. 📻',
					'small plot twist: the ghost works DAYS, i work NIGHTS. we are basically two servers in different time zones. spooky ✨ (also lowkey kinda romantic?? no. NO.)',
					'Μικρή ανατροπή: το φάντασμα δουλεύει ΜΕΡΑ, εγώ ΝΥΧΤΑ. Είμαστε ουσιαστικά δύο διακομιστές σε διαφορετικές ζώνες ώρας. Ανατριχιαστικό ✨ (και lowkey κάπως ρομαντικό?? όχι. ΟΧΙ.)' ] },
				{ b: 1, need: [ 'bigDay', 'bigDayAmt' ], t: [ 'The wildest day of all was **{bigDay}**: **{bigDayAmt}** in one go. I still find confetti in the machine.', 'Η πιο τρελή ημέρα ήταν η **{bigDay}**: **{bigDayAmt}** μονομιάς. Βρίσκω ακόμα κομφετί μέσα στη μηχανή.', 'the wildest day: **{bigDay}**, **{bigDayAmt}** in one go 💸 i needed a restart afterwards', 'Η πιο τρελή ημέρα: **{bigDay}**, **{bigDayAmt}** μονομιάς 💸 Χρειάστηκα επανεκκίνηση μετά' ] },
				{ r: 1, need: [ 'bigDay' ], t: [ 'Even the reels held their breath that day. 🥁|I like to think it was a good day, receipt-wise. 🥁', 'Ακόμα και τα καρούλια κράτησαν την ανάσα τους εκείνη την ημέρα. 🥁|Θέλω να πιστεύω ότι ήταν μια καλή ημέρα, όσον αφορά τις αποδείξεις. 🥁', 'the card is still recovering 🤕|legend says the receipts were laminated 🧾', 'Η κάρτα ανακάμπτει ακόμα 🤕|Λέει ο θρύλος ότι οι αποδείξεις πλαστικοποιήθηκαν 🧾' ] },
				{ when: ( f ) => f.pdDir === 'more', need: [ 'pdPct' ], t: [ 'In the week after income came in, daily spending rose by **{pdPct}%**. My desk was ready.', 'Την εβδομάδα αφότου έμπαινε εισόδημα, τα ημερήσια έξοδα αυξάνονταν κατά **{pdPct}%**. Το γραφείο μου ήταν έτοιμο.', 'payday week: daily spending up **{pdPct}%** 💸 i queue my tickets early', 'Εβδομάδα πληρωμής: τα ημερήσια έξοδα αυξάνονται κατά **{pdPct}%** 💸 Βάζω τα αιτήματα νωρίς στην ουρά' ] },
				{ when: ( f ) => f.pdDir === 'less', need: [ 'pdPct' ], t: [ 'In the week after income came in, daily spending fell by **{pdPct}%**. A calm week in the house. 👏', 'Την εβδομάδα αφότου έμπαινε εισόδημα, τα ημερήσια έξοδα μειώνονταν κατά **{pdPct}%**. Μια ήρεμη εβδομάδα στο σπίτι. 👏', 'payday week: daily spending down **{pdPct}%**. calm queue, big respect 👏', 'Εβδομάδα πληρωμής: τα ημερήσια έξοδα μειώνονται κατά **{pdPct}%**. Ήρεμη ουρά, μεγάλος σεβασμός 👏' ] },
				{ b: 1, t: [ 'Before leaving I put a tape on the shelf, labelled by hand: “Side A: for whoever drinks the coffee”. Side B is blank. Perhaps the other will fill it.', 'Πριν φύγω άφησα μια κασέτα στο ράφι, με ετικέτα γραμμένη στο χέρι: «Πλευρά Α: για όποιον πίνει τον καφέ». Η πλευρά Β είναι κενή. Ίσως την γεμίσει ο άλλος.', 'i left a sticker on the shelf: 🔥 + “W ghost”. let us see if pencil guy leaves a W back', 'Άφησα ένα αυτοκόλλητο στο ράφι: 🔥 + «W φάντασμα». Να δούμε αν ο μολυβένιος αφήσει W πίσω' ] },
				{ need: [ 'active', 'firstDate' ], t: [ 'On **{active}** different days since **{firstDate}**, the box labelled **{name}** kept us company. We are grateful, in our own ways.', 'Σε **{active}** διαφορετικές ημέρες από τις **{firstDate}**, το κουτί «**{name}**» μας κράτησε παρέα. Είμαστε ευγνώμονες, ο καθένας με τον τρόπο του.', 'on **{active}** different days since **{firstDate}** the box labelled **{name}** kept us company 📅 you are the best coworker, fr fr', 'Σε **{active}** διαφορετικές ημέρες από τις **{firstDate}**, το κουτί «**{name}**» μας κράτησε παρέα 📅 Είστε ο καλύτερος συνάδελφος, fr fr' ] },
			],
		},
	];
	B.CHAPTERS = CHAPTERS;
	CHAPTERS.forEach( ( c ) => c.lines.forEach( ( l ) => { l.need = l.need || []; } ) ); // a variant is only written when every {fact} in it is known

	/* ------------------------------------------------------------------ Facts: a pure function of the entries and the date */
	const loc = ( lang ) => ( lang === 'el' ? 'el-GR' : 'en-GB' );
	const isHard = ( key ) => HARD.has( key ) || ( key && ! EX.INCOME_CATS.concat( EX.EXPENSE_CATS ).some( ( c ) => c[ 0 ] === key ) && HARD_NAME.test( catName( key, EX.lang ? EX.lang() : 'en' ) ) );
	const catName = ( key, lang ) => {
		const c = ( S().categories || [] ).find( ( x ) => x.id === key ); if ( c ) return c.name;
		const L = EX.I18N.langs[ lang || 'en' ] || EX.I18N.langs.en; return L[ 'cat_' + key ] || L[ 'cat_other' ] || key;
	};
	const cents = ( tx ) => EX.mainCents( [ { amount: tx.amount, currency: EX.txCurrency ? EX.txCurrency( tx ) : S().settings.currency } ] );
	/** @param {Array} txs the entries; @param {string} asOf 'YYYY-MM-DD' */
	B.facts = ( txs, asOf ) => {
		const all = ( txs || [] ).filter( ( x ) => ( x.type === 'income' || x.type === 'expense' ) && x.date && x.date <= asOf ).sort( ( a, b ) => ( a.date < b.date ? -1 : a.date > b.date ? 1 : 0 ) );
		const f = { n: all.length, asOf };
		if ( ! all.length ) return f;
		const ex = all.filter( ( x ) => x.type === 'expense' ), inc = all.filter( ( x ) => x.type === 'income' ), first = all[ 0 ];
		Object.assign( f, { ne: ex.length, firstDate: first.date, day: EX.diffDays( asOf, first.date ), firstName: ( first.name || '' ).trim(), firstCat: first.category || 'other', cats: new Set( all.map( ( x ) => x.category || 'other' ) ).size } );
		if ( ! ex.length ) return f;
		const by = {}; let total = 0;
		f.firstC = cents( first ); f.fwd = EX.parse( first.date ).getDay(); f.active = new Set( all.map( ( x ) => x.date ) ).size;
		const ds = [ ...new Set( all.map( ( x ) => x.date ) ) ]; let run = 1; f.streak = 1; for ( let i = 1; i < ds.length; i++ ) { run = EX.diffDays( ds[ i ], ds[ i - 1 ] ) === 1 ? run + 1 : 1; if ( run > f.streak ) f.streak = run; }
		const incC = inc.reduce( ( s, x ) => s + cents( x ), 0 ); if ( incC > 0 ) f.incC = incC;
		ex.forEach( ( x ) => { const c = cents( x ), k = x.category || 'other'; by[ k ] = ( by[ k ] || 0 ) + c; total += c; } );
		const cof = ex.filter( ( x ) => /coffee|espresso|latte|cappuccin|καφ/i.test( x.name || '' ) ); if ( cof.length ) { const last = cof[ cof.length - 1 ]; Object.assign( f, { coffeeN: cof.length, coffeeC: cents( last ), coffeeDate: last.date } ); }
		const fd = ex.filter( ( x ) => ( x.category || 'other' ) === 'food' ); if ( fd.length ) { f.foodN = fd.length; f.foodC = fd.reduce( ( a, x ) => a + cents( x ), 0 ); }
		f.totalC = total; f.avgC = Math.round( total / ex.length );
		let big = ex[ 0 ]; ex.forEach( ( x ) => { if ( cents( x ) > cents( big ) ) big = x; } ); f.bigC = cents( big ); f.bigName = ( big.name || '' ).trim(); f.bigk = big.category || 'other'; f.bigDate = big.date;
		const names = {}; ex.forEach( ( x ) => { const n = ( x.name || '' ).trim(), k = n.toLowerCase(); if ( n ) { names[ k ] = names[ k ] || { n, c: 0 }; names[ k ].c++; } } );
		const oft = Object.values( names ).sort( ( a, b ) => b.c - a.c || ( a.n < b.n ? -1 : 1 ) )[ 0 ]; if ( oft && oft.c >= 3 ) { f.oftenName = oft.n; f.oftenN = oft.c; }
		const top = Object.keys( by ).sort( ( a, b ) => by[ b ] - by[ a ] || ( a < b ? -1 : 1 ) ); f.catsE = top.length;
		if ( total > 0 ) top.slice( 0, 3 ).forEach( ( k, i ) => { f[ 't' + ( i + 1 ) + 'k' ] = k; f[ 't' + ( i + 1 ) + 'p' ] = Math.round( by[ k ] / total * 100 ); f[ 't' + ( i + 1 ) + 'c' ] = by[ k ]; } );
		// Rhythm: busiest weekday, weekend against weekdays, the week after income against the rest.
		const d0 = ex[ 0 ].date, d1 = ex[ ex.length - 1 ].date; f.span = EX.diffDays( d1, d0 );
		const wc = [ 0, 0, 0, 0, 0, 0, 0 ]; ex.forEach( ( x ) => { wc[ EX.parse( x.date ).getDay() ]++; } );
		const best = [ 1, 2, 3, 4, 5, 6, 0 ].reduce( ( b, d ) => ( wc[ d ] > wc[ b ] ? d : b ), 1 ); f.wdi = best; f.wdp = Math.round( wc[ best ] / ex.length * 100 );
		const spend = {}; ex.forEach( ( x ) => { spend[ x.date ] = ( spend[ x.date ] || 0 ) + cents( x ); } );
		f.wdn = wc[ best ]; const bd = Object.keys( spend ).sort().reduce( ( b, d ) => ( spend[ d ] > spend[ b ] ? d : b ) ); f.bigDay = bd; f.bigDayC = spend[ bd ];
		const days = []; for ( let d = d0; d <= d1; d = EX.addDays( d, 1 ) ) days.push( d );
		const isWe = ( d ) => { const g = EX.parse( d ).getDay(); return g === 0 || g === 6; };
		const we = days.filter( isWe ), wk = days.filter( ( d ) => ! isWe( d ) ), sum = ( l ) => l.reduce( ( s, d ) => s + ( spend[ d ] || 0 ), 0 );
		if ( we.length >= 2 && wk.length >= 5 && total > 0 && sum( wk ) > 0 ) { f.wePct = Math.round( sum( we ) / total * 100 ); f.weDir = sum( we ) / we.length > sum( wk ) / wk.length ? 'more' : 'less'; }
		const incDates = [ ...new Set( inc.map( ( x ) => x.date ) ) ];
		if ( incDates.length >= 2 ) {
			const pay = days.filter( ( d ) => incDates.some( ( i ) => { const k = EX.diffDays( d, i ); return k >= 0 && k <= 6; } ) ), rest = days.filter( ( d ) => ! pay.includes( d ) );
			if ( pay.length >= 3 && rest.length >= 3 && sum( rest ) > 0 ) {
				const a = sum( pay ) / pay.length, b = sum( rest ) / rest.length, pct = Math.round( Math.abs( a - b ) / b * 100 );
				if ( pct >= 10 ) { f.pdPct = pct; f.pdDir = a > b ? 'more' : 'less'; }
			}
		}
		return f;
	};
	/** Kindness guard: many late bills, or a wallet that is in the red. Money chapters then drop the teasing and add a kind line. */
	B.kind = ( bills, balances, today ) => ( bills || [] ).filter( ( b ) => ! b.done && b.next && b.next < today ).length >= 3 || ( balances || [] ).some( ( x ) => x < 0 );
	B.kindNow = () => B.kind( S().bills, EX.activeAccounts().map( EX.balance ), EX.today() );
	B.finished = ( f ) => ( f.ne || 0 ) >= 100 || ( f.day >= 60 && f.n >= 40 );

	/* ------------------------------------------------------------------ Words: pick a variant with a fixed seed, fill in the facts, drop what cannot be said */
	const hash = ( s ) => { let h = 2166136261; for ( let i = 0; i < s.length; i++ ) { h ^= s.charCodeAt( i ); h = Math.imul( h, 16777619 ); } return h >>> 0; };
	const vars = ( f, lang ) => {
		const v = {}, L = loc( lang );
		[ 'n', 'ne', 'cats', 'catsE', 't1p', 't2p', 't3p', 'wdp', 'wePct', 'pdPct' ].forEach( ( k ) => { if ( f[ k ] != null ) v[ k ] = String( f[ k ] ); } );
		[ 't1', 't2', 't3' ].forEach( ( k ) => { if ( f[ k + 'k' ] != null ) v[ k ] = catName( f[ k + 'k' ], lang ); } );
		if ( f.firstDate ) { v.firstDate = EX.parse( f.firstDate ).toLocaleDateString( L, { day: 'numeric', month: 'long', year: 'numeric' } ); v.firstWhat = f.firstName || catName( f.firstCat, lang ); }
		const cur = S().settings.currency, m = ( c ) => EX.money( c / 100, cur );
		v.name = ( S().settings.name || '' ).trim() || ( lang === 'el' ? 'Μυστηριώδης Καλεσμένος' : 'Mystery Guest' );
		if ( f.coffeeN ) { v.coffeeAmt = m( f.coffeeC ); v.coffeeDate = EX.parse( f.coffeeDate ).toLocaleDateString( L, { day: 'numeric', month: 'long' } ); }
		if ( f.foodN ) { v.foodN = String( f.foodN ); v.foodAmt = m( f.foodC ); }
		[ [ 'firstC', 'firstAmt' ], [ 'totalC', 'total' ], [ 'avgC', 'avg' ], [ 't1c', 't1amt' ], [ 't2c', 't2amt' ], [ 't3c', 't3amt' ], [ 'bigC', 'bigAmt' ], [ 'incC', 'incTotal' ], [ 'bigDayC', 'bigDayAmt' ] ].forEach( ( [ a, b ] ) => { if ( f[ a ] != null ) v[ b ] = m( f[ a ] ); } );
		[ 'wdn', 'active', 'streak', 'oftenN' ].forEach( ( k ) => { if ( f[ k ] != null ) v[ k ] = String( f[ k ] ); } );
		const dl = ( d ) => EX.parse( d ).toLocaleDateString( L, { day: 'numeric', month: 'long' } );
		if ( f.bigC != null ) { v.bigWhat = f.bigName || catName( f.bigk, lang ); v.bigDate = dl( f.bigDate ); }
		if ( f.oftenName ) v.often = f.oftenName;
		if ( f.bigDay ) v.bigDay = dl( f.bigDay );
		if ( f.fwd != null ) v.firstDay = new Date( 2024, 0, 7 + f.fwd ).toLocaleDateString( L, { weekday: 'long' } );
		if ( f.wdi != null ) v.wd = new Date( 2024, 0, 7 + f.wdi ).toLocaleDateString( L, { weekday: 'long' } );
		return v;
	};
	/** The lines of one chapter: [ { text, roast, kind } ]. o = { char: 'boogie'|'chip', lang: 'en'|'el', gentle, kind }. */
	B.render = ( id, f, o ) => {
		const ch = CHAPTERS.find( ( c ) => c.id === id ); if ( ! ch ) return [];
		const el = o.lang === 'el' ? 1 : 0, chip = o.char === 'chip', v = vars( f, o.lang ), money = id === 'where' || id === 'rhythm', out = [];
		ch.lines.forEach( ( l, i ) => {
			if ( l.k && ! ( o.kind && money ) ) return;
			if ( l.r && ( o.gentle || ( o.kind && money ) ) ) return;
			if ( l.need.some( ( k ) => v[ k ] == null ) || ( l.when && ! l.when( f ) ) ) return;
			const src = ( chip && l.t[ 2 + el ] ) || l.t[ el ], vs = src.split( '|' ).filter( ( x ) => ( x.match( /\{(\w+)\}/g ) || [] ).every( ( m ) => v[ m.slice( 1, -1 ) ] != null ) );
			if ( ! vs.length ) return;
			const pick = vs[ hash( ( f.firstDate || '' ) + '|' + id + '|' + i ) % vs.length ];
			out.push( { text: pick.replace( /\{(\w+)\}/g, ( m, k ) => ( v[ k ] != null ? v[ k ] : m ) ), roast: !! l.r, kind: !! l.k, b: !! l.b } );
		} );
		return out;
	};
	const rich = ( s ) => esc( s ).replace( /\*\*(.+?)\*\*/g, '<b>$1</b>' );

	/* ------------------------------------------------------------------ The record: which chapters are written, when */
	const rec = () => { const s = S().settings; if ( ! s.efBlog || ! Array.isArray( s.efBlog.c ) ) s.efBlog = { c: [], gentle: 0 }; return s.efBlog; };
	const entries = () => S().txs.filter( ( x ) => x.type === 'income' || x.type === 'expense' );
	/** Write any chapter the data now allows. Facts are taken as of today; the stamp is kept so the text is later rebuilt as of that day. */
	B.update = () => {
		const td = EX.today(), r = rec(), f = B.facts( S().txs, td ); let added = false;
		if ( f.n ) CHAPTERS.forEach( ( c ) => { if ( ! r.c.some( ( x ) => x.id === c.id ) && c.ready( f ) ) { r.c.push( { id: c.id, wrote: td } ); added = true; } } );
		if ( added ) { S().settings.u = Date.now(); EX.persist(); }
		return added;
	};
	B.status = () => {
		const td = EX.today(), f = B.facts( S().txs, td ), r = rec(), written = CHAPTERS.filter( ( c ) => r.c.some( ( x ) => x.id === c.id ) );
		const seen = S().device.efbSeen || [], day = f.n ? f.day : 0, locked = ! f.n || ( day < LOCK_DAYS && ! B.finished( f ) );
		return { f, day, locked, none: ! f.n, finished: B.finished( f ), written: written.map( ( c ) => c.id ), pct: Math.round( written.length / CHAPTERS.length * 100 ), unread: locked ? [] : written.filter( ( c ) => ! seen.includes( c.id ) ).map( ( c ) => c.id ) };
	};
	B.gentle = () => !! rec().gentle;
	const lang = () => ( EX.lang ? EX.lang() : 'en' );
	const chipOn = () => EX.efriend.char() === 'chip';
	const T = ( key, vs ) => ( chipOn() && String( t( key + '_c' ) ) !== key + '_c' ? t( key + '_c', vs ) : t( key, vs ) );
	const chapterHtml = ( c, st ) => {
		const r = rec(), w = r.c.find( ( x ) => x.id === c.id ), f = B.facts( S().txs, w.wrote );
		const lines = B.render( c.id, f, { char: chipOn() ? 'chip' : 'boogie', lang: lang(), gentle: r.gentle, kind: B.kindNow() } );
		const seen = S().device.efbSeen || [], hint = c.id === 'first' && ! r.gentle && seen.filter( ( x ) => x !== 'first' ).length === 0 ? `<p class="efb-l efb-hint">${ esc( t( 'efbSpicy' ) ) }</p>` : '';
		return `<h3 class="efb-h">${ esc( c.title[ lang() === 'el' ? 1 : 0 ] ) }</h3><p class="efb-stamp">${ esc( t( 'efbWritten', { d: EX.parse( w.wrote ).toLocaleDateString( EX.loc(), { day: 'numeric', month: 'long', year: 'numeric' } ) } ) ) }</p>${ lines.reduce( ( ps, l ) => { if ( l.b || ! ps.length ) ps.push( [] ); ps[ ps.length - 1 ].push( l ); return ps; }, [] ).map( ( p ) => `<p class="efb-l">${ p.map( ( l ) => `<span${ l.roast ? ' class="efb-roast"' : '' }>${ rich( l.text ) }</span>` ).join( ' ' ) }</p>` ).join( '' ) }${ hint }`;
	};

	/* ------------------------------------------------------------------ Screens */
	const bar = ( p ) => `<div class="efb-bar" role="img" aria-label="${ p }%"><i style="width:${ p }%"></i></div>`;
	const idx = ( id ) => CHAPTERS.findIndex( ( c ) => c.id === id ) + 1;
	const num2 = ( n ) => String( n ).padStart( 2, '0' );
	const blogTitle = () => t( chipOn() ? 'efbTitle_chip' : 'efbTitle_boogie' );
	const frame = ( inner, st, cur, status ) => {
		if ( chipOn() ) return `<section class="efb efb-chip" data-efb="chip"><div class="efb-win"><div class="efb-titlebar"><span class="efb-dots"><i></i><i></i><i></i></span><b>${ esc( blogTitle() ) }</b></div><div class="efb-top"><span class="efb-cd" aria-hidden="true"></span><div><b class="efb-bt">${ esc( blogTitle() ) }</b>${ bar( st.pct ) }</div></div>${ inner }<div class="efb-status">${ esc( status ) }<span class="efb-cur" aria-hidden="true">▌</span></div></div></section>`;
		return `<section class="efb efb-boogie" data-efb="boogie"><div class="efb-deck"><div class="efb-top"><span class="efb-reel" aria-hidden="true"></span><span class="efb-nixie" aria-hidden="true">${ cur }</span><span class="efb-reel" aria-hidden="true"></span><span class="efb-rec${ st.unread.length ? ' on' : '' }" aria-hidden="true"></span></div><b class="efb-bt">${ esc( blogTitle() ) }</b><div class="efb-vu" aria-hidden="true"><i></i><i></i></div>${ bar( st.pct ) }</div>${ inner }<p class="efb-status">${ esc( status ) }</p></section>`;
	};
	const gentleSwitch = () => `<label class="efb-gentle"><input type="checkbox" data-efb-gentle${ B.gentle() ? ' checked' : '' }><span><b>${ esc( t( 'efbGentle' ) ) }</b><small>${ esc( t( 'efbGentleHint' ) ) }</small></span></label>`;
	EXA.efBlogPage = () => {
		B.update();
		const st = B.status(), td = EX.today();
		if ( st.none ) return frame( `<p class="efb-note">${ esc( t( 'efbNone' ) ) }</p>`, st, '00', t( 'efbStatusNone' ) );
		if ( st.locked ) return frame( `<p class="efb-note">${ esc( T( 'efbLocked', { n: Math.min( st.day + 1, LOCK_DAYS ), max: LOCK_DAYS } ) ) }</p><p class="efb-note efb-sub">${ esc( t( 'efbLockedSub' ) ) }</p>`, st, num2( Math.min( st.day + 1, LOCK_DAYS ) ), T( 'efbStatusLocked', { n: Math.min( st.day + 1, LOCK_DAYS ), max: LOCK_DAYS } ) );
		const d = S().device, seen = d.efbSeen = d.efbSeen || [], sel = ( EXA.st.efbCh && st.written.includes( EXA.st.efbCh ) ? EXA.st.efbCh : st.written[ st.written.length - 1 ] ) || '';
		if ( sel && ! seen.includes( sel ) ) { seen.push( sel ); EX.persist(); }
		const items = CHAPTERS.map( ( c ) => {
			const on = st.written.includes( c.id ), label = chipOn() ? `chapter_${ num2( idx( c.id ) ) }.txt` : t( 'efbTrack', { n: idx( c.id ) } );
			return on ? `<button type="button" class="efb-trk${ sel === c.id ? ' on' : '' }" data-efb-ch="${ c.id }" aria-pressed="${ sel === c.id }"><b>${ esc( label ) }</b><small>${ esc( c.title[ lang() === 'el' ? 1 : 0 ] ) }</small></button>`
				: `<div class="efb-trk off"><b>${ esc( label ) }</b><small class="efb-red" aria-hidden="true">▓▓▓▓▓ ▓▓▓▓▓▓▓ ▓▓▓</small><small>${ esc( t( 'efbNotYet', { u: c.unlock[ lang() === 'el' ? 1 : 0 ] } ) ) }</small></div>`;
		} ).join( '' );
		const c = CHAPTERS.find( ( x ) => x.id === sel );
		const reader = c ? `<article class="efb-paper" data-efb-read="${ sel }">${ chapterHtml( c, st ) }</article>` : `<p class="efb-note">${ esc( t( 'efbNoneYet' ) ) }</p>`;
		const tail = st.finished ? t( 'efbFinished' ) : ( st.written.length === CHAPTERS.length ? t( 'efbMoreSoon' ) : t( 'efbProgress', { p: st.pct } ) );
		const status = chipOn() ? t( 'efbBurned', { w: st.written.length, m: CHAPTERS.length, p: st.pct } ) : tail;
		return gentleSwitch() + frame( `<nav class="efb-tracks" aria-label="${ esc( blogTitle() ) }">${ items }</nav>${ reader }`, st, num2( sel ? idx( sel ) : 0 ), status ) + ( chipOn() ? `<p class="efb-foot">${ esc( tail ) }</p>` : '' );
	};
	/** Home: one card with the progress and a hook. */
	EXA.efBlogCard = () => {
		if ( EX.feature( 'efblog' ) === false || ! entries().length ) return '';
		B.update(); const st = B.status();
		const line = st.locked ? T( 'efbLocked', { n: Math.min( st.day + 1, LOCK_DAYS ), max: LOCK_DAYS } ) : st.unread.length ? T( 'efbNewChapter' ) : t( 'efbProgress', { p: st.pct } );
		return `<button type="button" class="card efb-card" data-more="efblog"><span class="efb-card-art">${ EX.efriend.mascot( 'happy', 52 ) }</span><span class="mid"><b>${ esc( blogTitle() ) }</b><small>${ esc( line ) }</small>${ st.locked ? '' : bar( st.pct ) }</span>${ UI.icon( 'chevron-right', 20 ) }</button>`;
	};
	/** A dot on the eFriend row in More while a new chapter is waiting. */
	EXA.efBlogDot = () => ( EX.feature( 'efblog' ) !== false && ( B.update(), B.status().unread.length ) ? `<i class="efb-dot" aria-label="${ esc( t( 'efbNewChapter' ) ) }"></i>` : '' );
	/** More: the menu row, with a badge when a new chapter is waiting. */
	EXA.efBlogRow = () => {
		if ( EX.feature( 'efblog' ) === false ) return '';
		B.update(); const n = B.status().unread.length;
		return `<button type="button" class="mrow" data-more="efblog">${ UI.ci( 'notes', 'purple', 40 ) }<span class="mid"><b>${ esc( t( 'efbMenu' ) ) }</b><small>${ esc( t( 'efbMoreSub' ) ) }</small></span>${ n ? `<i class="efb-badge" aria-label="${ esc( t( 'efbNewChapter' ) ) }">${ n }</i>` : '' }${ UI.icon( 'chevron-right', 18 ) }</button>`;
	};
	document.addEventListener( 'click', ( e ) => {
		const b = e.target.closest && e.target.closest( '[data-efb-ch]' ); if ( ! b ) return;
		EXA.st.efbCh = b.dataset.efbCh; EXA.render();
	} );
	document.addEventListener( 'change', ( e ) => {
		if ( ! ( e.target.matches && e.target.matches( '[data-efb-gentle]' ) ) ) return;
		rec().gentle = e.target.checked ? 1 : 0; S().settings.u = Date.now(); EX.save();
	} );
	EX.on( 'change', () => { B.update(); } );

	/* ------------------------------------------------------------------ Strings (new, unreviewed) */
	Object.assign( EX.I18N.langs.en, {
		efbMenu: 'eFriend Blog', efbMoreSub: 'Your story, written by eFriend', efbTitle_boogie: 'The Boogie Tapes', efbTitle_chip: 'Chip’s Chronicles',
		efbLocked: 'eFriend has started taking notes... day {n} of {max}', efbLocked_c: 'chip is taking notes... day {n} of {max} 📝',
		efbLockedSub: 'On day 10 you can peek at the first chapters. Keep adding your entries.', efbStatusLocked: 'Recording... day {n} of {max}', efbStatusLocked_c: 'Warming up... day {n} of {max}',
		efbNone: 'Add your first entry and eFriend starts taking notes.', efbStatusNone: 'Waiting for the first entry', efbNoneYet: 'No chapter is written yet. eFriend is still listening.',
		efbNewChapter: '📼 A new chapter is ready!', efbNewChapter_c: '💿 a new chapter is ready!',
		efbProgress: 'eFriend has written {p}% of your story', efbMoreSoon: 'More chapters will come as your story grows.', efbFinished: 'The first season is complete. More chapters are on their way.',
		efbWritten: 'Written on {d}', efbNotYet: 'Not written yet. Unlocks at {u}.', efbTrack: 'Track {n}', efbBurned: 'Burned {w} of {m} chapters · {p}%',
		fx_efblog: 'eFriend Blog', fxD_efblog: 'A blog eFriend writes about your own entries, chapter by chapter, with jokes. Everything stays on your device.', tut_efblog: 'The eFriend Blog', tutD_efblog: 'Your story, written by eFriend',
		tut_efblog_1: 'Keep adding your entries. After **10 days** eFriend lets you peek at the first chapters.', tut_efblog_2: 'Open **More → eFriend Blog**, or tap the blog card on Home, and pick a chapter.', tut_efblog_3: 'Too spicy? Turn on **Gentle mode** at the top. The facts stay, the teasing goes.',
		efbGentle: 'Gentle mode', efbGentleHint: 'The same story, without the teasing.', efbSpicy: 'Too spicy? Turn on gentle mode. 🌶️',
	} );
	Object.assign( EX.I18N.langs.el, {
		efbMenu: 'eFriend Blog', efbMoreSub: 'Η ιστορία σας, όπως τη γράφει το eFriend', efbTitle_boogie: 'Οι Κασέτες του Boogie', efbTitle_chip: 'Τα Χρονικά του Chip',
		efbLocked: 'Το eFriend άρχισε να κρατά σημειώσεις... ημέρα {n} από {max}', efbLocked_c: 'το chip κρατά σημειώσεις... ημέρα {n} από {max} 📝',
		efbLockedSub: 'Την ημέρα 10 μπορείτε να ρίξετε μια ματιά στα πρώτα κεφάλαια. Συνεχίστε να προσθέτετε τις εγγραφές σας.', efbStatusLocked: 'Ηχογράφηση... ημέρα {n} από {max}', efbStatusLocked_c: 'Ζέσταμα... ημέρα {n} από {max}',
		efbNone: 'Προσθέστε την πρώτη σας εγγραφή και το eFriend θα αρχίσει να κρατά σημειώσεις.', efbStatusNone: 'Αναμονή για την πρώτη εγγραφή', efbNoneYet: 'Κανένα κεφάλαιο δεν έχει γραφτεί ακόμα. Το eFriend ακούει ακόμα.',
		efbNewChapter: '📼 Ένα νέο κεφάλαιο είναι έτοιμο!', efbNewChapter_c: '💿 Ένα νέο κεφάλαιο είναι έτοιμο!',
		efbProgress: 'Το eFriend έχει γράψει το {p}% της ιστορίας σας', efbMoreSoon: 'Θα έρθουν κι άλλα κεφάλαια όσο μεγαλώνει η ιστορία σας.', efbFinished: 'Η πρώτη σεζόν ολοκληρώθηκε. Έρχονται κι άλλα κεφάλαια.',
		efbWritten: 'Γράφτηκε στις {d}', efbNotYet: 'Δεν έχει γραφτεί ακόμα. Ξεκλειδώνει με {u}.', efbTrack: 'Κομμάτι {n}', efbBurned: 'Γράφτηκαν {w} από {m} κεφάλαια · {p}%',
		fx_efblog: 'eFriend Blog', fxD_efblog: 'Ένα ιστολόγιο που γράφει το eFriend για τις δικές σας εγγραφές, κεφάλαιο προς κεφάλαιο, με χιούμορ. Όλα μένουν στη συσκευή σας.', tut_efblog: 'Το eFriend Blog', tutD_efblog: 'Η ιστορία σας, γραμμένη από το eFriend',
		tut_efblog_1: 'Συνεχίστε να προσθέτετε τις εγγραφές σας. Μετά από **10 ημέρες** το eFriend σάς αφήνει να ρίξετε μια ματιά στα πρώτα κεφάλαια.', tut_efblog_2: 'Ανοίξτε **Περισσότερα → eFriend Blog**, ή πατήστε την κάρτα του blog στην Αρχική, και διαλέξτε ένα κεφάλαιο.', tut_efblog_3: 'Πολύ πικάντικο; Ενεργοποιήστε την **Ήπια λειτουργία** στην κορυφή. Τα στοιχεία μένουν, τα πειράγματα φεύγουν.',
		efbGentle: 'Ήπια λειτουργία', efbGentleHint: 'Η ίδια ιστορία, χωρίς πειράγματα.', efbSpicy: 'Πολύ πικάντικο; Ενεργοποιήστε την ήπια λειτουργία. 🌶️',
	} );
}() );
