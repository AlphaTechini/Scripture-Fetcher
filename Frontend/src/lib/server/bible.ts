const BOOK_ABBREVIATIONS: Record<string, string> = {
	genesis: 'GEN', exodus: 'EXO', leviticus: 'LEV', numbers: 'NUM',
	deuteronomy: 'DEU', joshua: 'JOS', judges: 'JDG', ruth: 'RUT',
	'1 samuel': '1SA', '2 samuel': '2SA', '1 kings': '1KI', '2 kings': '2KI',
	'1 chronicles': '1CH', '2 chronicles': '2CH', ezra: 'EZR', nehemiah: 'NEH',
	esther: 'EST', job: 'JOB', psalms: 'PSA', proverbs: 'PRO',
	ecclesiastes: 'ECC', 'song of solomon': 'SNG', isaiah: 'ISA', jeremiah: 'JER',
	lamentations: 'LAM', ezekiel: 'EZK', daniel: 'DAN', hosea: 'HOS',
	joel: 'JOL', amos: 'AMO', obadiah: 'OBA', jonah: 'JON', micah: 'MIC',
	nahum: 'NAM', habakkuk: 'HAB', zephaniah: 'ZEP', haggai: 'HAG',
	zechariah: 'ZEC', malachi: 'MAL', matthew: 'MAT', mark: 'MRK',
	luke: 'LUK', john: 'JHN', acts: 'ACT', romans: 'ROM',
	'1 corinthians': '1CO', '2 corinthians': '2CO', galatians: 'GAL',
	ephesians: 'EPH', philippians: 'PHP', colossians: 'COL',
	'1 thessalonians': '1TH', '2 thessalonians': '2TH', '1 timothy': '1TI',
	'2 timothy': '2TI', titus: 'TIT', philemon: 'PHM', hebrews: 'HEB',
	james: 'JAS', '1 peter': '1PE', '2 peter': '2PE', '1 john': '1JN',
	'2 john': '2JN', '3 john': '3JN', jude: 'JUD', revelation: 'REV'
};

const BOOK_NAME_TO_FULL: Record<string, string> = {
	gen: 'genesis', exo: 'exodus', lev: 'leviticus', num: 'numbers',
	deut: 'deuteronomy', josh: 'joshua', judg: 'judges', rut: 'ruth',
	'1 sam': '1 samuel', '2 sam': '2 samuel', '1 ki': '1 kings', '2 ki': '2 kings',
	'1 chr': '1 chronicles', '2 chr': '2 chronicles', ezr: 'ezra', neh: 'nehemiah',
	est: 'esther', ps: 'psalms', psalm: 'psalms', psalms: 'psalms',
	prov: 'proverbs', eccl: 'ecclesiastes',
	song: 'song of solomon', isa: 'isaiah', jer: 'jeremiah', lam: 'lamentations',
	ezek: 'ezekiel', dan: 'daniel', hos: 'hosea', jol: 'joel', amos: 'amos',
	obad: 'obadiah', jon: 'jonah', mic: 'micah', nah: 'nahum', hab: 'habakkuk',
	zeph: 'zephaniah', hag: 'haggai', zech: 'zechariah', mal: 'malachi',
	matt: 'matthew', mk: 'mark', lk: 'luke', jn: 'john', acts: 'acts',
	rom: 'romans', '1 cor': '1 corinthians', '2 cor': '2 corinthians',
	gal: 'galatians', eph: 'ephesians', phil: 'philippians', col: 'colossians',
	'1 thess': '1 thessalonians', '2 thess': '2 thessalonians',
	'1 tim': '1 timothy', '2 tim': '2 timothy', tit: 'titus', phlm: 'philemon',
	heb: 'hebrews', jas: 'james', '1 pet': '1 peter', '2 pet': '2 peter',
	'1 jn': '1 john', '2 jn': '2 john', '3 jn': '3 john', rev: 'revelation'
};

export function parseReference(reference: string): { book: string; chapter: string; verses?: string } | null {
	const normalized = reference.toLowerCase().trim();
	const match = normalized.match(/^([1-3]?\s*[a-z]+?)\s+(\d+)(?::(\d+(?:-\d+)?))?$/);
	if (!match) return null;

	let bookName = match[1].replace(/\s+/g, ' ').trim();
	if (BOOK_NAME_TO_FULL[bookName]) {
		bookName = BOOK_NAME_TO_FULL[bookName];
	}

	const bookCode = BOOK_ABBREVIATIONS[bookName];
	if (!bookCode) return null;

	return {
		book: bookCode,
		chapter: match[2],
		verses: match[3] || undefined
	};
}

export function buildSearchQuery(reference: string): string {
	return `Bible passage ${reference} KJV text`;
}
