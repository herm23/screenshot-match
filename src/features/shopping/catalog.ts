// Catalogo condiviso tra l'app e scripts/update-catalog.ts: niente alias "@/" qui,
// così lo script lo può importare direttamente con Node.

export type ListCategoryId = 'alimentari' | 'casa' | 'elettronica' | 'faidate';
export type StoreType = 'supermercato' | 'drogheria' | 'elettronica' | 'faidate';
export type Size = { amount: number; dim: 'l' | 'kg' | 'pz' };

export type ListCategory = { id: ListCategoryId; label: string; storeLabel: string; sellers: StoreType[] };
export type Chain = { id: string; name: string; type: StoreType; domain: string; color: string; factor: number; match: RegExp };
export type Product = {
  id: string; label: string; list: ListCategoryId; sub: string; keywords: string[];
  size: Size; unitLabel: string; price: number;
  // Abbinamento con i prodotti reali di Open Prices (nome del prodotto)
  op?: RegExp; exclude?: RegExp;
};

export const LIST_CATEGORIES: ListCategory[] = [
  { id: 'alimentari', label: 'Alimentari', storeLabel: 'Supermercato', sellers: ['supermercato'] },
  { id: 'casa', label: 'Casa e persona', storeLabel: 'Supermercato o drogheria', sellers: ['supermercato', 'drogheria'] },
  { id: 'elettronica', label: 'Elettronica', storeLabel: 'Negozio di elettronica', sellers: ['elettronica'] },
  { id: 'faidate', label: 'Fai da te', storeLabel: 'Ferramenta e bricolage', sellers: ['faidate'] },
];

// factor = livello medio dei prezzi della catena, usato solo per le stime
export const CHAINS: Chain[] = [
  { id: 'esselunga', name: 'Esselunga', type: 'supermercato', domain: 'esselunga.it', color: '#0a62a9', factor: 1.06, match: /esselunga/i },
  { id: 'conad', name: 'Conad', type: 'supermercato', domain: 'conad.it', color: '#e3000f', factor: 1.0, match: /conad/i },
  { id: 'coop', name: 'Coop', type: 'supermercato', domain: 'www.e-coop.it', color: '#e30613', factor: 1.02, match: /\bcoop\b|ipercoop|unicoop|coop[ée]?rativ/i },
  { id: 'carrefour', name: 'Carrefour', type: 'supermercato', domain: 'carrefour.it', color: '#1e5bc6', factor: 1.03, match: /carrefour/i },
  { id: 'pam', name: 'Pam', type: 'supermercato', domain: 'pampanorama.it', color: '#e2001a', factor: 1.04, match: /\bpam\b|panorama/i },
  { id: 'deco', name: 'Decò', type: 'supermercato', domain: 'supermercatideco.it', color: '#d7151e', factor: 0.99, match: /\bdec[oò]\b/i },
  { id: 'despar', name: 'Despar', type: 'supermercato', domain: 'www.despar.it', color: '#00843d', factor: 1.03, match: /\b(de|euro|inter)?spar\b/i },
  { id: 'lidl', name: 'Lidl', type: 'supermercato', domain: 'lidl.it', color: '#0050aa', factor: 0.86, match: /lidl/i },
  { id: 'eurospin', name: 'Eurospin', type: 'supermercato', domain: 'eurospin.it', color: '#003a80', factor: 0.84, match: /eurospin/i },
  { id: 'md', name: 'MD', type: 'supermercato', domain: 'mdspa.it', color: '#e30613', factor: 0.85, match: /^md\b|md discount/i },
  { id: 'aldi', name: 'Aldi', type: 'supermercato', domain: 'aldi.it', color: '#00005f', factor: 0.86, match: /\baldi\b/i },
  { id: 'penny', name: 'Penny', type: 'supermercato', domain: 'penny.it', color: '#cd1316', factor: 0.88, match: /penny/i },
  { id: 'tigota', name: 'Tigotà', type: 'drogheria', domain: 'tigota.it', color: '#e6007e', factor: 0.95, match: /tigot/i },
  { id: 'acquaesapone', name: 'Acqua & Sapone', type: 'drogheria', domain: 'acquaesapone.it', color: '#0072bc', factor: 0.93, match: /acqua\s*(&|e)\s*sapone/i },
  { id: 'mediaworld', name: 'MediaWorld', type: 'elettronica', domain: 'mediaworld.it', color: '#df0000', factor: 1.0, match: /media\s?world/i },
  { id: 'unieuro', name: 'Unieuro', type: 'elettronica', domain: 'unieuro.it', color: '#f39200', factor: 0.98, match: /unieuro/i },
  { id: 'euronics', name: 'Euronics', type: 'elettronica', domain: 'euronics.it', color: '#003da5', factor: 1.02, match: /euronics/i },
  { id: 'leroymerlin', name: 'Leroy Merlin', type: 'faidate', domain: 'leroymerlin.it', color: '#78be20', factor: 1.0, match: /leroy\s?merlin/i },
  { id: 'bricoio', name: 'Brico io', type: 'faidate', domain: 'bricoio.it', color: '#e30613', factor: 1.04, match: /bric[oò]\s?io/i },
  { id: 'obi', name: 'OBI', type: 'faidate', domain: 'obi-italia.it', color: '#ff7e21', factor: 0.98, match: /\bobi\b/i },
  { id: 'bricocenter', name: 'Bricocenter', type: 'faidate', domain: 'bricocenter.it', color: '#f6b400', factor: 1.02, match: /bricocenter/i },
];

const g = (amount: number) => ({ amount: amount / 1000, dim: 'kg' as const });
const ml = (amount: number) => ({ amount: amount / 1000, dim: 'l' as const });
const pz = (amount = 1) => ({ amount, dim: 'pz' as const });

export const PRODUCTS: Product[] = [
  // Alimentari
  { id: 'latte', label: 'Latte', list: 'alimentari', sub: 'Latticini', keywords: ['latte'], size: ml(1000), unitLabel: '1 l', price: 1.39, op: /^latte\b/, exclude: /cocco|soia|mandorl|avena|riso|cioccolat|condensat|polvere|crema/ },
  { id: 'bevanda-vegetale', label: 'Bevanda vegetale', list: 'alimentari', sub: 'Latticini', keywords: ['bevanda vegetale', 'latte di soia', 'latte di mandorla', "latte d'avena", 'latte di avena'], size: ml(1000), unitLabel: '1 l', price: 1.89, op: /^(bevanda|drink|barista)\b|^soia (con|bevanda)/, exclude: /burger/ },
  { id: 'pane', label: 'Pane', list: 'alimentari', sub: 'Panetteria', keywords: ['pane', 'pagnotta', 'baguette', 'panini', 'pancarrè', 'pan carrè'], size: g(500), unitLabel: '500 g', price: 1.8, op: /^(pane\b|pan bauletto|pain\b|pan ?carr|panini|baguette|pagnotta|piadin)/ },
  { id: 'uova', label: 'Uova', list: 'alimentari', sub: 'Uova', keywords: ['uova', 'uovo'], size: pz(6), unitLabel: '6 uova', price: 2.1, op: /\buova\b/ },
  { id: 'pasta', label: 'Pasta', list: 'alimentari', sub: 'Dispensa', keywords: ['pasta', 'spaghetti', 'penne', 'fusilli', 'rigatoni', 'maccheroni', 'linguine', 'tagliatelle', 'ditalini', 'farfalle'], size: g(500), unitLabel: '500 g', price: 0.99, op: /^(pasta|spaghett|penne|fusill|rigaton|maccheron|linguin|tagliatell|ditalin|farfall|mezze|orecchiett|paccheri|tortiglion|integrale (farfalle|penne|spaghetti|fusilli))/, exclude: /ripien|sugo|pront|insalata|sfoglia|frolla/ },
  { id: 'riso', label: 'Riso', list: 'alimentari', sub: 'Dispensa', keywords: ['riso'], size: g(1000), unitLabel: '1 kg', price: 2.29, op: /^riso\b/, exclude: /latte|gallett|soffiat|bevanda/ },
  { id: 'passata', label: 'Passata di pomodoro', list: 'alimentari', sub: 'Dispensa', keywords: ['passata', 'sugo', 'polpa', 'pelati', 'salsa di pomodoro'], size: g(700), unitLabel: '700 g', price: 1.15, op: /^(passata|polpa di pomodor|pelati|sugo|salsa di pomodor)|passata/, exclude: /pronta/ },
  { id: 'legumi', label: 'Legumi', list: 'alimentari', sub: 'Dispensa', keywords: ['ceci', 'lenticchie', 'fagioli', 'piselli', 'legumi'], size: g(400), unitLabel: '400 g', price: 0.99, op: /^(ceci|lenticch|fagiol|pisell|legumi)/ },
  { id: 'tonno', label: 'Tonno', list: 'alimentari', sub: 'Dispensa', keywords: ['tonno'], size: pz(3), unitLabel: '3 × 80 g', price: 3.4, op: /^(tonno|filetti di tonno|trancetti di tonno)/ },
  { id: 'olio', label: 'Olio extravergine', list: 'alimentari', sub: 'Dispensa', keywords: ['olio'], size: ml(1000), unitLabel: '1 l', price: 8.9, op: /^olio\b/, exclude: /tonno|sott.?olio|all.?olio|in olio/ },
  { id: 'zucchero', label: 'Zucchero', list: 'alimentari', sub: 'Dispensa', keywords: ['zucchero'], size: g(1000), unitLabel: '1 kg', price: 1.19, op: /^zucchero/ },
  { id: 'farina', label: 'Farina', list: 'alimentari', sub: 'Dispensa', keywords: ['farina'], size: g(1000), unitLabel: '1 kg', price: 0.95, op: /^farina/ },
  { id: 'caffe', label: 'Caffè', list: 'alimentari', sub: 'Colazione', keywords: ['caffè', 'caffe', 'cialde', 'capsule'], size: g(250), unitLabel: '250 g', price: 3.59, op: /^(caff[eè]|espresso|cialde|capsule|nescaf)/, exclude: /latte|bevanda|gelat|biscott|yog/ },
  { id: 'biscotti', label: 'Biscotti', list: 'alimentari', sub: 'Colazione', keywords: ['biscott', 'frollini', 'crackers', 'wafer'], size: g(500), unitLabel: '500 g', price: 2.49, op: /^(biscott|frollin|cracker|wafer|fette biscottate)/ },
  { id: 'cereali', label: 'Cereali', list: 'alimentari', sub: 'Colazione', keywords: ['cereali', 'muesli', 'corn flakes', 'fiocchi', 'granola'], size: g(375), unitLabel: '375 g', price: 2.79, op: /^(cereal|muesli|corn ?flakes|fiocchi d.?avena|granola|kinder cereali)/ },
  { id: 'marmellata', label: 'Marmellata', list: 'alimentari', sub: 'Colazione', keywords: ['marmellat', 'confettur'], size: g(340), unitLabel: '340 g', price: 2.29, op: /^(marmellat|confettur)/ },
  { id: 'crema-spalmabile', label: 'Crema spalmabile', list: 'alimentari', sub: 'Colazione', keywords: ['nutella', 'crema spalmabile', 'nocciolata', 'crema al cacao'], size: g(400), unitLabel: '400 g', price: 3.99, op: /^(nutella|nocciolata|crema spalmabile|crema al cacao|crema di nocciol)/, exclude: /biscuit|b-ready/ },
  { id: 'mozzarella', label: 'Mozzarella', list: 'alimentari', sub: 'Latticini', keywords: ['mozzarell'], size: g(125), unitLabel: '125 g', price: 0.89, op: /mozzarell/ },
  { id: 'formaggio', label: 'Formaggio', list: 'alimentari', sub: 'Latticini', keywords: ['parmigian', 'grana', 'formaggio', 'pecorino', 'stracchino', 'ricotta'], size: g(200), unitLabel: '200 g', price: 4.2, op: /^(parmigian|grana\b|grana padano|formaggi|pecorin|stracchin|ricotta|asiago|gorgonzol|feta)/ },
  { id: 'yogurt', label: 'Yogurt', list: 'alimentari', sub: 'Latticini', keywords: ['yogurt', 'yoghurt'], size: g(250), unitLabel: '2 × 125 g', price: 1.25, op: /^(yog|alpiy)|\byogurt\b/, exclude: /salsa/ },
  { id: 'burro', label: 'Burro', list: 'alimentari', sub: 'Latticini', keywords: ['burro'], size: g(250), unitLabel: '250 g', price: 2.35, op: /^burro\b/ },
  { id: 'panna', label: 'Panna', list: 'alimentari', sub: 'Latticini', keywords: ['panna'], size: ml(200), unitLabel: '200 ml', price: 1.29, op: /^(panna|cremosa da montare)/ },
  { id: 'prosciutto', label: 'Affettati', list: 'alimentari', sub: 'Salumi', keywords: ['prosciutto', 'salame', 'mortadella', 'affettati', 'bresaola', 'speck'], size: g(100), unitLabel: '100 g', price: 1.89, op: /^(prosciutt|salame|mortadell|bresaol|speck|gambetto)/, exclude: /crostin|brie/ },
  { id: 'pollo', label: 'Petto di pollo', list: 'alimentari', sub: 'Carne e pesce', keywords: ['pollo', 'tacchino'], size: g(500), unitLabel: '500 g', price: 5.9, op: /^(petto di pollo|pollo|fesa di tacchino|tacchino)/ },
  { id: 'carne', label: 'Carne macinata', list: 'alimentari', sub: 'Carne e pesce', keywords: ['macinat', 'carne', 'hamburger', 'bistecc', 'salsicc'], size: g(500), unitLabel: '500 g', price: 4.9, op: /^(macinat|carne|hamburger|bistecc|salsicc|buon pascolo)/, exclude: /sesamo|pane/ },
  { id: 'pesce', label: 'Pesce', list: 'alimentari', sub: 'Carne e pesce', keywords: ['salmone', 'pesce', 'merluzzo', 'gamberi', 'orata'], size: g(200), unitLabel: '200 g', price: 5.49, op: /^(salmon|merluzz|pesce|orata|branzin|gamber|bastoncin|filetti di (merluzzo|platessa))/ },
  { id: 'banane', label: 'Banane', list: 'alimentari', sub: 'Frutta e verdura', keywords: ['banan'], size: g(1000), unitLabel: '1 kg', price: 1.69, op: /\bbanane?\b/, exclude: /bevanda|succo|chips|yog/ },
  { id: 'mele', label: 'Mele', list: 'alimentari', sub: 'Frutta e verdura', keywords: ['mela', 'mele'], size: g(1000), unitLabel: '1 kg', price: 2.2, op: /^mel[ae]\b/ },
  { id: 'frutta', label: 'Frutta di stagione', list: 'alimentari', sub: 'Frutta e verdura', keywords: ['frutta', 'arance', 'pere', 'uva', 'kiwi', 'fragole', 'prugne', 'pesche'], size: g(1000), unitLabel: '1 kg', price: 2.49, op: /^(arance|pere\b|uva\b|kiwi|fragol|prugn|susin|pesca|pesche|mandarin|clementin|avocad|melon)/ },
  { id: 'insalata', label: 'Insalata', list: 'alimentari', sub: 'Frutta e verdura', keywords: ['insalat', 'lattuga', 'rucola', 'valeriana'], size: g(250), unitLabel: '250 g', price: 1.49, op: /^(insalat|lattuga|rucola|valeriana|songino|misticanza)/, exclude: /di mare|di riso|di pasta|di pollo/ },
  { id: 'pomodori', label: 'Pomodori', list: 'alimentari', sub: 'Frutta e verdura', keywords: ['pomodori', 'pomodorini', 'datterini', 'ciliegini'], size: g(500), unitLabel: '500 g', price: 1.99, op: /^(pomodor|datterin|ciliegin)/, exclude: /salsa|secch|sugo|passata|pelati|polpa/ },
  { id: 'verdura', label: 'Verdura', list: 'alimentari', sub: 'Frutta e verdura', keywords: ['verdura', 'zucchine', 'carote', 'melanzane', 'peperoni', 'cipolle', 'spinaci', 'broccoli'], size: g(1000), unitLabel: '1 kg', price: 2.29, op: /^(zucchin|carot|melanzan|peperon|cipoll|spinac|broccol|cavol|finocch)/, exclude: /sott.?olio|burger|grigliat|peperoncin/ },
  { id: 'patate', label: 'Patate', list: 'alimentari', sub: 'Frutta e verdura', keywords: ['patat'], size: g(1500), unitLabel: '1,5 kg', price: 1.99, op: /^patate\b/ },
  { id: 'patatine', label: 'Patatine', list: 'alimentari', sub: 'Snack', keywords: ['patatine', 'chips', 'snack'], size: g(150), unitLabel: '150 g', price: 1.69, op: /^(patatin|chips|tuc\b|salatin)/ },
  { id: 'cioccolato', label: 'Cioccolato', list: 'alimentari', sub: 'Snack', keywords: ['cioccolat', 'kinder', 'snickers', 'barretta'], size: g(100), unitLabel: '100 g', price: 1.79, op: /^(cioccolat|kinder|snickers|milka|lindt|fondente|barrett)/, exclude: /cereali|bevanda/ },
  { id: 'gelato', label: 'Gelato', list: 'alimentari', sub: 'Surgelati', keywords: ['gelato', 'gelati', 'ghiaccioli'], size: g(500), unitLabel: '500 g', price: 3.99, op: /^(gelat|ghiacciol)/ },
  { id: 'pizza', label: 'Pizza surgelata', list: 'alimentari', sub: 'Surgelati', keywords: ['pizza', 'surgelat'], size: pz(1), unitLabel: '350 g', price: 2.99, op: /^pizza/ },
  { id: 'acqua', label: 'Acqua minerale', list: 'alimentari', sub: 'Bevande', keywords: ['acqua'], size: pz(1), unitLabel: '6 × 1,5 l', price: 1.99, op: /^acqua\b/, exclude: /tonica|di cocco|micellare|ossigenat/ },
  { id: 'succo', label: 'Succo di frutta', list: 'alimentari', sub: 'Bevande', keywords: ['succo', 'spremuta', 'tè freddo', 'the freddo'], size: ml(1000), unitLabel: '1 l', price: 1.59, op: /^(succo|spremut|nettare|t[eè] fredd|le spremute)/ },
  { id: 'bibite', label: 'Bibite', list: 'alimentari', sub: 'Bevande', keywords: ['coca cola', 'cola', 'aranciata', 'bibita', 'bibite'], size: ml(1500), unitLabel: '1,5 l', price: 1.69, op: /^(coca.?cola|cola\b|aranciat|chinotto|gassosa|bibita)/ },
  { id: 'birra', label: 'Birra', list: 'alimentari', sub: 'Bevande', keywords: ['birr'], size: pz(1), unitLabel: '3 × 33 cl', price: 2.79, op: /^birr/ },
  { id: 'vino', label: 'Vino', list: 'alimentari', sub: 'Bevande', keywords: ['vino', 'prosecco', 'spumante'], size: ml(750), unitLabel: '75 cl', price: 4.5, op: /^(vino|chianti|prosecco|lambrusco|barbera|montepulciano|merlot|sangiovese|spumante)/ },
  // Casa e persona
  { id: 'detersivo', label: 'Detersivo lavatrice', list: 'casa', sub: 'Bucato', keywords: ['detersivo', 'lavatrice', 'bucato'], size: ml(1500), unitLabel: '1,5 l', price: 4.99, op: /^(detersiv|dash\b|dixan)/, exclude: /piatti|lavastovigl/ },
  { id: 'ammorbidente', label: 'Ammorbidente', list: 'casa', sub: 'Bucato', keywords: ['ammorbident'], size: ml(2000), unitLabel: '2 l', price: 3.49, op: /^(ammorbident|lenor|coccolino)/ },
  { id: 'piatti', label: 'Detersivo piatti', list: 'casa', sub: 'Pulizia', keywords: ['detersivo piatti', 'piatti', 'lavastoviglie', 'pastiglie'], size: ml(1000), unitLabel: '1 l', price: 1.69, op: /^(detersivo piatti|piatti|svelto|finish\b|pril\b|pastiglie lavastov)/ },
  { id: 'pulizia', label: 'Sgrassatore', list: 'casa', sub: 'Pulizia', keywords: ['sgrassatore', 'candeggina', 'anticalcare', 'detergente', 'spugne'], size: ml(750), unitLabel: '750 ml', price: 2.29, op: /^(sgrassat|candeggin|anticalcar|detergente|spugn)/ },
  { id: 'carta-igienica', label: 'Carta igienica', list: 'casa', sub: 'Carta', keywords: ['carta igienica'], size: pz(1), unitLabel: '8 rotoli', price: 3.49, op: /^carta igienica/ },
  { id: 'carta-cucina', label: 'Carta da cucina', list: 'casa', sub: 'Carta', keywords: ['carta da cucina', 'carta cucina', 'scottex', 'rotoloni', 'tovaglioli'], size: pz(1), unitLabel: '4 rotoli', price: 2.49, op: /^(carta (da )?cucina|asciugatutto|rotoloni|scottex|tovaglio)/ },
  { id: 'sacchi', label: 'Sacchi spazzatura', list: 'casa', sub: 'Pulizia', keywords: ['sacchi', 'spazzatura', 'sacchetti'], size: pz(1), unitLabel: '20 sacchi', price: 1.99, op: /^(sacc|sacchetti)/ },
  { id: 'shampoo', label: 'Shampoo', list: 'casa', sub: 'Cura persona', keywords: ['shampoo', 'balsamo'], size: ml(250), unitLabel: '250 ml', price: 2.99, op: /shampoo|^balsamo/ },
  { id: 'bagnoschiuma', label: 'Bagnoschiuma', list: 'casa', sub: 'Cura persona', keywords: ['bagnoschiuma', 'docciaschiuma', 'doccia', 'sapone'], size: ml(500), unitLabel: '500 ml', price: 2.49, op: /^(bagno ?schiuma|doccia|sapone)/ },
  { id: 'dentifricio', label: 'Dentifricio', list: 'casa', sub: 'Cura persona', keywords: ['dentifricio', 'spazzolino', 'collutorio'], size: ml(75), unitLabel: '75 ml', price: 1.99, op: /^(dentifric|spazzolin|collutorio)/ },
  { id: 'deodorante', label: 'Deodorante', list: 'casa', sub: 'Cura persona', keywords: ['deodorante'], size: ml(150), unitLabel: '150 ml', price: 2.79, op: /^deodorant/ },
  { id: 'pannolini', label: 'Pannolini', list: 'casa', sub: 'Infanzia', keywords: ['pannolini', 'salviette'], size: pz(1), unitLabel: 'confezione', price: 8.99, op: /^(pannolin|salviett)/ },
  // Elettronica (prezzi indicativi)
  { id: 'auricolari', label: 'Auricolari Bluetooth', list: 'elettronica', sub: 'Audio', keywords: ['auricolari', 'cuffie', 'airpods', 'cuffiette'], size: pz(), unitLabel: '1 pz', price: 29.99 },
  { id: 'caricabatterie', label: 'Caricabatterie USB-C', list: 'elettronica', sub: 'Accessori', keywords: ['caricabatterie', 'caricatore', 'alimentatore'], size: pz(), unitLabel: '20 W', price: 19.99 },
  { id: 'cavo', label: 'Cavo USB-C', list: 'elettronica', sub: 'Accessori', keywords: ['cavo usb', 'cavo', 'usb-c', 'lightning'], size: pz(), unitLabel: '1 m', price: 9.99 },
  { id: 'powerbank', label: 'Power bank', list: 'elettronica', sub: 'Accessori', keywords: ['power bank', 'powerbank', 'batteria esterna'], size: pz(), unitLabel: '10.000 mAh', price: 24.99 },
  { id: 'pile', label: 'Pile stilo AA', list: 'elettronica', sub: 'Accessori', keywords: ['pile', 'batterie', 'stilo'], size: pz(), unitLabel: '4 pz', price: 4.99 },
  { id: 'mouse', label: 'Mouse wireless', list: 'elettronica', sub: 'Informatica', keywords: ['mouse'], size: pz(), unitLabel: '1 pz', price: 14.99 },
  { id: 'tastiera', label: 'Tastiera', list: 'elettronica', sub: 'Informatica', keywords: ['tastiera'], size: pz(), unitLabel: '1 pz', price: 24.99 },
  { id: 'chiavetta', label: 'Chiavetta USB', list: 'elettronica', sub: 'Informatica', keywords: ['chiavetta', 'pendrive', 'pen drive', 'memoria usb'], size: pz(), unitLabel: '64 GB', price: 9.99 },
  { id: 'smartphone', label: 'Smartphone', list: 'elettronica', sub: 'Telefonia', keywords: ['smartphone', 'cellulare', 'telefono'], size: pz(), unitLabel: '128 GB', price: 199 },
  { id: 'televisore', label: 'Smart TV', list: 'elettronica', sub: 'TV', keywords: ['televisore', 'smart tv', 'televisione'], size: pz(), unitLabel: '43"', price: 349 },
  // Fai da te (prezzi indicativi)
  { id: 'lampadina', label: 'Lampadina LED', list: 'faidate', sub: 'Illuminazione', keywords: ['lampadin'], size: pz(), unitLabel: 'E27 · 9 W', price: 3.99 },
  { id: 'nastro', label: 'Nastro adesivo', list: 'faidate', sub: 'Utensili', keywords: ['nastro', 'scotch'], size: pz(), unitLabel: '50 m', price: 2.49 },
  { id: 'colla', label: 'Colla', list: 'faidate', sub: 'Utensili', keywords: ['colla', 'attak'], size: pz(), unitLabel: '3 g', price: 3.49 },
  { id: 'viti', label: 'Viti e tasselli', list: 'faidate', sub: 'Ferramenta', keywords: ['viti', 'tasselli', 'chiodi'], size: pz(), unitLabel: 'kit 100 pz', price: 5.99 },
  { id: 'cacciavite', label: 'Set cacciaviti', list: 'faidate', sub: 'Utensili', keywords: ['cacciavit', 'attrezzi', 'martello', 'pinza'], size: pz(), unitLabel: '6 pz', price: 9.99 },
  { id: 'trapano', label: 'Trapano avvitatore', list: 'faidate', sub: 'Elettroutensili', keywords: ['trapano', 'avvitatore'], size: pz(), unitLabel: '18 V', price: 59.99 },
  { id: 'vernice', label: 'Pittura per interni', list: 'faidate', sub: 'Colori', keywords: ['vernice', 'pittura', 'idropittura', 'pennello'], size: pz(), unitLabel: '5 l', price: 24.99 },
  { id: 'prolunga', label: 'Multipresa', list: 'faidate', sub: 'Elettricità', keywords: ['prolunga', 'ciabatta', 'multipresa'], size: pz(), unitLabel: '5 prese', price: 9.99 },
];

export const chainById = new Map(CHAINS.map(chain => [chain.id, chain]));
export const productById = new Map(PRODUCTS.map(product => [product.id, product]));
export const categoryById = new Map(LIST_CATEGORIES.map(category => [category.id, category]));

export function chainForName(name: string | undefined | null) {
  if (!name) return null;
  return CHAINS.find(chain => chain.match.test(name)) ?? null;
}

export function sellsProduct(chain: Chain, product: Product) {
  return categoryById.get(product.list)!.sellers.includes(chain.type);
}

// Parole chiave più lunghe prima, così "detersivo piatti" vince su "detersivo"
const KEYWORDS = PRODUCTS.flatMap(product => product.keywords.map(keyword => ({ keyword, product }))).sort((a, b) => b.keyword.length - a.keyword.length);
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const KEYWORD_RE = KEYWORDS.map(entry => ({ ...entry, re: new RegExp(`(^|[^a-zà-ù])${escape(entry.keyword)}`, 'i') }));

export function findProduct(name: string): Product | null {
  const text = name.toLocaleLowerCase('it');
  return KEYWORD_RE.find(entry => entry.re.test(text))?.product ?? null;
}
