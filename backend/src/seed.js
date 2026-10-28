// Початкові (демонстраційні) дані магазину.
// Запускається автоматично, якщо база порожня. Скинути все й заповнити заново:
//   npm run seed:reset   (з папки backend)

const bcrypt = require('bcryptjs');
const config = require('./config');
const { slugify } = require('./utils');

// Фото для демо беруться за посиланням з Unsplash (у базі зберігається лише URL)
const photo = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=70`;

// icon — назва іконки з бібліотеки Lucide (https://lucide.dev/icons)
const CATEGORIES = [
  { key: 'zzr', name: 'Засоби захисту рослин', icon: 'shield-check', image: photo('photo-1625246333195-78d9c38ad449'), description: 'Гербіциди, фунгіциди, інсектициди, протруйники та ад’юванти для захисту посівів.' },
  { key: 'herbicides', parent: 'zzr', name: 'Гербіциди', icon: 'leaf', description: 'Контроль бур’янів у посівах зернових, кукурудзи, соняшнику та інших культур.' },
  { key: 'fungicides', parent: 'zzr', name: 'Фунгіциди', icon: 'microscope', description: 'Захист культур від хвороб грибного походження.' },
  { key: 'insecticides', parent: 'zzr', name: 'Інсектициди', icon: 'bug', description: 'Контроль шкідників у посівах.' },
  { key: 'seed-treatment', parent: 'zzr', name: 'Протруйники', icon: 'flask-conical', description: 'Захист насіння та сходів від хвороб і шкідників.' },
  { key: 'adjuvants', parent: 'zzr', name: 'Ад’юванти', icon: 'droplets', description: 'Прилипачі та поверхнево-активні речовини для бакових сумішей.' },
  { key: 'seeds', name: 'Насіння', icon: 'sprout', image: photo('photo-1523348837708-15d4a09cfac2'), description: 'Насіння польових культур від провідних селекціонерів.' },
  { key: 'seeds-corn', parent: 'seeds', name: 'Кукурудза', icon: 'sprout', description: '' },
  { key: 'seeds-sunflower', parent: 'seeds', name: 'Соняшник', icon: 'sun', description: '' },
  { key: 'seeds-wheat', parent: 'seeds', name: 'Пшениця озима', icon: 'wheat', description: '' },
  { key: 'seeds-rapeseed', parent: 'seeds', name: 'Ріпак', icon: 'flower-2', description: '' },
  { key: 'fertilizers', name: 'Мінеральні добрива', icon: 'layers', image: photo('photo-1464226184884-fa280b87c399'), description: 'Азотні, фосфорні, калійні та комплексні добрива.' },
  { key: 'micro', name: 'Мікродобрива', icon: 'sparkles', image: photo('photo-1530836369250-ef72a3f5cda8'), description: 'Хелатні мікродобрива та стимулятори росту для позакореневого підживлення.' },
  { key: 'machinery', name: 'Сільгосптехніка', icon: 'tractor', image: photo('photo-1592982537447-7440770cbfc9'), description: 'Трактори, обприскувачі, ґрунтообробна та посівна техніка.' },
];

const BRANDS = [
  { name: 'HARDI', country: 'Данія' },
  { name: 'Köckerling', country: 'Німеччина' },
  { name: 'Deutz-Fahr', country: 'Німеччина' },
  { name: 'Dieci', country: 'Італія' },
  { name: 'SOLA', country: 'Іспанія' },
  { name: 'FALC', country: 'Італія' },
  { name: 'Quivogne', country: 'Франція' },
  { name: 'SIPTEC', country: 'Франція' },
];

// image_url залишено порожнім — додайте посилання на фото через адмін-панель.
const PRODUCTS = [
  // Гербіциди
  { category: 'herbicides', name: 'Гліфосат 480, в.р.', sku: 'HRB-001', active_ingredient: 'Гліфосат, 480 г/л (ізопропіламінна сіль)', formulation: 'Водний розчин', packaging: 'Каністра 20 л', unit: 'каністра', price: 3950, old_price: 4300, stock: 120, crops: 'Пшениця, Кукурудза, Соняшник, Ріпак, Соя', featured: true,
    short: 'Гербіцид суцільної дії для знищення однорічних і багаторічних бур’янів.',
    description: 'Системний гербіцид суцільної дії. Застосовується по стерні, до сівби або до появи сходів культури, а також як десикант.\n\nНорма витрати: 1,5–4,0 л/га залежно від видового складу та фази розвитку бур’янів.\nОбмеження: не застосовувати по вегетуючих культурах.' },
  { category: 'herbicides', name: 'Нікосульфурон 40, о.д.', sku: 'HRB-002', active_ingredient: 'Нікосульфурон, 40 г/л', formulation: 'Олійна дисперсія', packaging: 'Каністра 5 л', unit: 'каністра', price: 2450, stock: 64, crops: 'Кукурудза', featured: true,
    short: 'Післясходовий гербіцид для кукурудзи проти злакових і дводольних бур’янів.',
    description: 'Системний післясходовий гербіцид для захисту посівів кукурудзи. Контролює однорічні та багаторічні злакові бур’яни (у т.ч. пирій, сорго алепське) та низку дводольних.\n\nНорма витрати: 1,0–1,25 л/га у фазі 3–7 листків культури.' },
  { category: 'herbicides', name: 'Імазамокс 40, р.к.', sku: 'HRB-003', active_ingredient: 'Імазамокс, 40 г/л', formulation: 'Розчинний концентрат', packaging: 'Каністра 10 л', unit: 'каністра', price: 8900, stock: 25, crops: 'Соняшник, Соя, Горох',
    short: 'Гербіцид для соняшнику, стійкого до імідазолінонів, сої та гороху.',
    description: 'Післясходовий гербіцид широкого спектра дії проти однорічних злакових і дводольних бур’янів, а також вовчка.\n\nНорма витрати: 1,0–1,2 л/га.' },
  { category: 'herbicides', name: '2,4-Д + Флорасулам, с.е.', sku: 'HRB-004', active_ingredient: '2,4-Д (2-етилгексиловий ефір), 300 г/л + флорасулам, 6,25 г/л', formulation: 'Суспо-емульсія', packaging: 'Каністра 5 л', unit: 'каністра', price: 3100, stock: 40, crops: 'Пшениця, Ячмінь, Кукурудза',
    short: 'Двокомпонентний гербіцид для зернових колосових проти дводольних бур’янів.',
    description: 'Ефективно контролює однорічні та деякі багаторічні дводольні бур’яни, зокрема підмаренник чіпкий, ромашку, осоти.\n\nНорма витрати: 0,4–0,6 л/га.' },

  // Фунгіциди
  { category: 'fungicides', name: 'Тебуконазол 250, к.е.', sku: 'FNG-001', active_ingredient: 'Тебуконазол, 250 г/л', formulation: 'Концентрат емульсії', packaging: 'Каністра 5 л', unit: 'каністра', price: 2600, stock: 80, crops: 'Пшениця, Ячмінь, Ріпак',
    short: 'Системний фунгіцид із рострегулюючою дією на ріпаку.',
    description: 'Захищає зернові від септоріозу, борошнистої роси, іржі, фузаріозу колоса. На ріпаку має виражену рострегулюючу дію.\n\nНорма витрати: 0,5–1,0 л/га.' },
  { category: 'fungicides', name: 'Азоксистробін + Ципроконазол, к.с.', sku: 'FNG-002', active_ingredient: 'Азоксистробін, 200 г/л + ципроконазол, 80 г/л', formulation: 'Концентрат суспензії', packaging: 'Каністра 5 л', unit: 'каністра', price: 7450, old_price: 7900, stock: 36, crops: 'Пшениця, Кукурудза, Соняшник, Соя', featured: true,
    short: 'Двокомпонентний фунгіцид захисної та лікувальної дії з «грінінг-ефектом».',
    description: 'Поєднання стробілурину й тріазолу забезпечує тривалий захист та підвищує стресостійкість рослин.\n\nНорма витрати: 0,5–0,75 л/га.' },
  { category: 'fungicides', name: 'Пропіконазол + Ципроконазол, к.е.', sku: 'FNG-003', active_ingredient: 'Пропіконазол, 250 г/л + ципроконазол, 80 г/л', formulation: 'Концентрат емульсії', packaging: 'Каністра 5 л', unit: 'каністра', price: 4300, stock: 0, crops: 'Пшениця, Ячмінь, Цукровий буряк',
    short: 'Швидкодіючий фунгіцид проти комплексу хвороб листя.',
    description: 'Системний фунгіцид профілактичної та лікувальної дії.\n\nНорма витрати: 0,4–0,5 л/га.' },

  // Інсектициди
  { category: 'insecticides', name: 'Лямбда-цигалотрин 50, к.е.', sku: 'INS-001', active_ingredient: 'Лямбда-цигалотрин, 50 г/л', formulation: 'Концентрат емульсії', packaging: 'Каністра 5 л', unit: 'каністра', price: 1950, stock: 95, crops: 'Пшениця, Ріпак, Соняшник, Кукурудза, Горох', featured: true,
    short: 'Контактно-кишковий інсектицид проти широкого спектра шкідників.',
    description: 'Швидка «нокдаун»-дія проти клопа шкідливої черепашки, п’явиць, попелиць, ріпакового квіткоїда тощо.\n\nНорма витрати: 0,1–0,2 л/га.' },
  { category: 'insecticides', name: 'Тіаметоксам 250, в.г.', sku: 'INS-002', active_ingredient: 'Тіаметоксам, 250 г/кг', formulation: 'Водорозчинні гранули', packaging: 'Пакет 1 кг', unit: 'кг', price: 3200, stock: 30, crops: 'Пшениця, Ріпак, Картопля, Цукровий буряк',
    short: 'Системний інсектицид проти сисних і листогризучих шкідників.',
    description: 'Тривалий захисний період, ефективний при високих температурах.\n\nНорма витрати: 0,08–0,1 кг/га.' },
  { category: 'insecticides', name: 'Хлорантраніліпрол 200, к.с.', sku: 'INS-003', active_ingredient: 'Хлорантраніліпрол, 200 г/л', formulation: 'Концентрат суспензії', packaging: 'Флакон 1 л', unit: 'л', price: 6800, stock: 18, crops: 'Кукурудза, Соняшник, Соя, Яблуня',
    short: 'Інсектицид проти лускокрилих: кукурудзяний метелик, бавовняна совка.',
    description: 'Діє на всіх стадіях розвитку гусениць, має тривалий період захисту та безпечний для бджіл.\n\nНорма витрати: 0,15–0,2 л/га.' },

  // Протруйники
  { category: 'seed-treatment', name: 'Протруйник Тебуконазол + Тіабендазол, т.к.с.', sku: 'SDT-001', active_ingredient: 'Тебуконазол, 60 г/л + тіабендазол, 80 г/л', formulation: 'Текучий концентрат суспензії', packaging: 'Каністра 5 л', unit: 'каністра', price: 4900, stock: 42, crops: 'Пшениця, Ячмінь',
    short: 'Фунгіцидний протруйник для насіння зернових колосових.',
    description: 'Захищає від сажкових хвороб, кореневих гнилей і пліснявіння насіння.\n\nНорма витрати: 0,4–0,5 л/т насіння.\nРекомендуємо замовити професійне протруювання на нашому мобільному комплексі.' },
  { category: 'seed-treatment', name: 'Протруйник Імідаклоприд 600, т.к.с.', sku: 'SDT-002', active_ingredient: 'Імідаклоприд, 600 г/л', formulation: 'Текучий концентрат суспензії', packaging: 'Каністра 5 л', unit: 'каністра', price: 5600, stock: 20, crops: 'Соняшник, Кукурудза, Ріпак',
    short: 'Інсектицидний протруйник проти ґрунтових шкідників та шкідників сходів.',
    description: 'Захищає насіння і сходи від дротяника, хрущів, бліх, попелиць.\n\nНорма витрати: 5–6 л/т насіння.' },

  // Ад'юванти
  { category: 'adjuvants', name: 'Ад’ювант органосиліконовий', sku: 'ADJ-001', active_ingredient: 'Органомодифікований силоксан', formulation: 'Рідина', packaging: 'Флакон 1 л', unit: 'л', price: 690, stock: 150, crops: 'Усі культури',
    short: 'Суперзмочувач і прилипач для підвищення ефективності пестицидів.',
    description: 'Покращує розтікання робочого розчину по листю та стійкість до змивання.\n\nНорма витрати: 0,05–0,1 л/га.' },

  // Насіння
  { category: 'seeds-corn', name: 'Кукурудза, гібрид «Злата» ФАО 280', sku: 'SDC-280', active_ingredient: '', formulation: 'Посівна одиниця (80 тис. насінин)', packaging: 'Мішок 80 000 насінин', unit: 'п.о.', price: 5800, stock: 300, crops: 'Кукурудза', featured: true,
    short: 'Ранньостиглий гібрид зернового напряму з швидкою вологовіддачею.',
    description: 'Тип зерна: зубоподібний. Рекомендована густота: 70–80 тис. рослин/га.\nПосухостійкий, стабільний у різних ґрунтово-кліматичних зонах.' },
  { category: 'seeds-sunflower', name: 'Соняшник, гібрид «Степовий» (під сульфонілсечовини)', sku: 'SDS-110', active_ingredient: '', formulation: 'Посівна одиниця (150 тис. насінин)', packaging: 'Мішок 150 000 насінин', unit: 'п.о.', price: 6900, stock: 210, crops: 'Соняшник', featured: true,
    short: 'Середньоранній гібрид, стійкий до вовчка (раси A–G).',
    description: 'Вегетаційний період 105–110 днів. Олійність до 50 %.\nРекомендована густота: 50–55 тис. рослин/га.' },
  { category: 'seeds-wheat', name: 'Пшениця озима «Колосиста», еліта', sku: 'SDW-001', active_ingredient: '', formulation: 'Насіння еліта', packaging: 'Біг-бег 1 т', unit: 'т', price: 19500, stock: 40, crops: 'Пшениця',
    short: 'Середньостиглий сорт інтенсивного типу з високою зимостійкістю.',
    description: 'Потенціал урожайності — до 10 т/га. Висока якість зерна (2 клас).' },
  { category: 'seeds-rapeseed', name: 'Ріпак озимий, гібрид «Золотий»', sku: 'SDR-001', active_ingredient: '', formulation: 'Посівна одиниця (1,5 млн насінин)', packaging: 'Мішок 1,5 млн насінин', unit: 'п.о.', price: 7200, stock: 55, crops: 'Ріпак',
    short: 'Високоврожайний гібрид із стійкістю до розтріскування стручків.',
    description: 'Рекомендована густота: 450–550 тис. насінин/га.' },

  // Мінеральні добрива
  { category: 'fertilizers', name: 'Аміачна селітра N 34,4 %', sku: 'FRT-001', active_ingredient: 'Азот (N) 34,4 %', formulation: 'Гранули', packaging: 'Біг-бег 500 кг', unit: 'т', price: 21500, stock: 120, crops: 'Пшениця, Ячмінь, Кукурудза, Ріпак', featured: true,
    short: 'Універсальне азотне добриво для основного внесення та підживлення.',
    description: 'Містить азот в амонійній і нітратній формах — швидка та тривала дія.' },
  { category: 'fertilizers', name: 'Карбамід (сечовина) N 46 %', sku: 'FRT-002', active_ingredient: 'Азот (N) 46 %', formulation: 'Гранули', packaging: 'Біг-бег 500 кг', unit: 'т', price: 24800, stock: 90, crops: 'Пшениця, Кукурудза, Соняшник',
    short: 'Найбільш концентроване тверде азотне добриво.',
    description: 'Придатне для основного внесення та позакореневих підживлень (у розчині).' },
  { category: 'fertilizers', name: 'Нітроамофоска NPK 16-16-16', sku: 'FRT-003', active_ingredient: 'N 16 %, P₂O₅ 16 %, K₂O 16 %', formulation: 'Гранули', packaging: 'Біг-бег 500 кг', unit: 'т', price: 29900, old_price: 31500, stock: 60, crops: 'Усі культури',
    short: 'Збалансоване комплексне добриво для основного внесення.',
    description: 'Забезпечує рослини трьома основними елементами живлення у доступній формі.' },
  { category: 'fertilizers', name: 'Сульфат амонію N 21 % + S 24 %', sku: 'FRT-004', active_ingredient: 'N 21 %, S 24 %', formulation: 'Кристали', packaging: 'Біг-бег 500 кг', unit: 'т', price: 15900, stock: 0, crops: 'Ріпак, Пшениця, Соняшник',
    short: 'Азотно-сірчане добриво, незамінне для ріпаку.',
    description: 'Сірка підвищує ефективність використання азоту та якість врожаю.' },

  // Мікродобрива
  { category: 'micro', name: 'Мікродобриво хелатне «Комплекс Зернові»', sku: 'MCR-001', active_ingredient: 'N, Mg, S, Zn, Cu, Mn, B, Fe, Mo — у хелатній формі', formulation: 'Рідина', packaging: 'Каністра 10 л', unit: 'каністра', price: 2350, stock: 70, crops: 'Пшениця, Ячмінь',
    short: 'Збалансований комплекс мікроелементів для зернових колосових.',
    description: 'Норма витрати: 1–2 л/га. Сумісний з більшістю пестицидів.' },
  { category: 'micro', name: 'Бор 150, рідке мікродобриво', sku: 'MCR-002', active_ingredient: 'Бор (B) 150 г/л', formulation: 'Рідина', packaging: 'Каністра 10 л', unit: 'каністра', price: 1850, stock: 85, crops: 'Соняшник, Ріпак, Цукровий буряк', featured: true,
    short: 'Усуває дефіцит бору на соняшнику, ріпаку та буряку.',
    description: 'Норма витрати: 1–2 л/га у критичні фази розвитку культури.' },
  { category: 'micro', name: 'Цинк хелат 100', sku: 'MCR-003', active_ingredient: 'Цинк (Zn) 100 г/л, EDTA', formulation: 'Рідина', packaging: 'Каністра 10 л', unit: 'каністра', price: 2150, stock: 48, crops: 'Кукурудза, Соя, Пшениця',
    short: 'Хелатне цинкове добриво для кукурудзи та зернових.',
    description: 'Норма витрати: 0,5–1 л/га.' },

  // Техніка (ціна за запитом)
  { category: 'machinery', brand: 'HARDI', name: 'Причіпний обприскувач HARDI', sku: 'MCH-001', formulation: '', packaging: '', unit: 'шт', price: null, stock: 2, crops: '', featured: true,
    short: 'Причіпний обприскувач з баком 3000–6000 л та штангою 18–36 м.',
    description: 'Точне внесення ЗЗР, сучасні системи керування та стабілізації штанги. Комплектація та ціна — за запитом.' },
  { category: 'machinery', brand: 'Köckerling', name: 'Культиватор Köckerling', sku: 'MCH-002', unit: 'шт', price: null, stock: 1,
    short: 'Культиватор для поверхневого та глибокого обробітку ґрунту.',
    description: 'Висока продуктивність та якісне подрібнення рослинних решток. Ціна — за запитом.' },
  { category: 'machinery', brand: 'Deutz-Fahr', name: 'Трактор Deutz-Fahr', sku: 'MCH-003', unit: 'шт', price: null, stock: 0,
    short: 'Сучасні трактори потужністю від 100 до 340 к.с.',
    description: 'Надійність, економічність та комфорт оператора. Підбір моделі та ціна — за запитом.' },
  { category: 'machinery', brand: 'Dieci', name: 'Телескопічний навантажувач Dieci', sku: 'MCH-004', unit: 'шт', price: null, stock: 1,
    short: 'Телескопічні навантажувачі для агро та будівництва.',
    description: 'Вантажопідйомність до 4,5 т, висота підйому до 10 м. Ціна — за запитом.' },
  { category: 'machinery', brand: 'SOLA', name: 'Сівалка SOLA', sku: 'MCH-005', unit: 'шт', price: null, stock: 0,
    short: 'Механічні та пневматичні сівалки для зернових культур.',
    description: 'Точне висівання та рівномірне загортання насіння. Ціна — за запитом.' },
  { category: 'machinery', brand: 'FALC', name: 'Мульчувач FALC', sku: 'MCH-006', unit: 'шт', price: null, stock: 0,
    short: 'Мульчувачі та подрібнювачі рослинних решток.',
    description: 'Якісне подрібнення пожнивних решток кукурудзи та соняшнику. Ціна — за запитом.' },
];

// Норми витрати (rate_unit: «одиниця/база», де база — га або т насіння),
// об'єм упаковки, проблеми, які вирішує товар, та оптові ціни [від к-сті, ціна]
const AGRONOMY = {
  'HRB-001': { rate: [1.5, 4], unit: 'л/га', pkg: 20, targets: "Бур'яни однорічні, Бур'яни багаторічні, Пирій, Осот, Десикація", tiers: [[10, 3790], [40, 3650]] },
  'HRB-002': { rate: [1, 1.25], unit: 'л/га', pkg: 5, targets: "Бур'яни злакові, Пирій, Сорго алепське, Бур'яни дводольні", tiers: [[10, 2350]] },
  'HRB-003': { rate: [1, 1.2], unit: 'л/га', pkg: 10, targets: "Бур'яни злакові, Бур'яни дводольні, Вовчок" },
  'HRB-004': { rate: [0.4, 0.6], unit: 'л/га', pkg: 5, targets: "Бур'яни дводольні, Підмаренник чіпкий, Осот, Ромашка", tiers: [[10, 2950]] },
  'FNG-001': { rate: [0.5, 1], unit: 'л/га', pkg: 5, targets: 'Септоріоз, Борошниста роса, Іржа, Фузаріоз колоса, Рострегуляція ріпаку', tiers: [[10, 2480]] },
  'FNG-002': { rate: [0.5, 0.75], unit: 'л/га', pkg: 5, targets: 'Септоріоз, Іржа, Гельмінтоспоріоз, Фомоз, Плямистості листя', tiers: [[10, 7150], [30, 6950]] },
  'FNG-003': { rate: [0.4, 0.5], unit: 'л/га', pkg: 5, targets: 'Септоріоз, Борошниста роса, Іржа, Церкоспороз' },
  'INS-001': { rate: [0.1, 0.2], unit: 'л/га', pkg: 5, targets: "Клоп шкідлива черепашка, П'явиці, Попелиця, Ріпаковий квіткоїд, Блішки", tiers: [[10, 1850]] },
  'INS-002': { rate: [0.08, 0.1], unit: 'кг/га', pkg: 1, targets: 'Попелиця, Колорадський жук, Трипси, Блішки' },
  'INS-003': { rate: [0.15, 0.2], unit: 'л/га', pkg: 1, targets: 'Кукурудзяний метелик, Бавовняна совка, Лускокрилі' },
  'SDT-001': { rate: [0.4, 0.5], unit: 'л/т', pkg: 5, targets: 'Сажкові хвороби, Кореневі гнилі, Пліснявіння насіння, Фузаріоз' },
  'SDT-002': { rate: [5, 6], unit: 'л/т', pkg: 5, targets: 'Дротяник, Хрущі, Блішки, Попелиця' },
  'ADJ-001': { rate: [0.05, 0.1], unit: 'л/га', pkg: 1 },
  'SDC-280': { rate: [70, 80], unit: 'тис. насінин/га', pkg: 80, tiers: [[20, 5600], [100, 5450]] },
  'SDS-110': { rate: [50, 55], unit: 'тис. насінин/га', pkg: 150, targets: 'Вовчок', tiers: [[20, 6700]] },
  'SDW-001': { rate: [0.2, 0.25], unit: 'т/га', pkg: 1 },
  'SDR-001': { rate: [450, 550], unit: 'тис. насінин/га', pkg: 1500 },
  'FRT-001': { rate: [100, 300], unit: 'кг/га', pkg: 1000, targets: 'Дефіцит азоту', tiers: [[5, 21000], [20, 20500]] },
  'FRT-002': { rate: [100, 250], unit: 'кг/га', pkg: 1000, targets: 'Дефіцит азоту', tiers: [[5, 24300]] },
  'FRT-003': { rate: [150, 300], unit: 'кг/га', pkg: 1000, targets: 'Дефіцит фосфору, Дефіцит калію', tiers: [[5, 29200]] },
  'FRT-004': { rate: [100, 200], unit: 'кг/га', pkg: 1000, targets: 'Дефіцит сірки, Дефіцит азоту' },
  'MCR-001': { rate: [1, 2], unit: 'л/га', pkg: 10, targets: 'Дефіцит мікроелементів' },
  'MCR-002': { rate: [1, 2], unit: 'л/га', pkg: 10, targets: 'Дефіцит бору', tiers: [[10, 1750]] },
  'MCR-003': { rate: [0.5, 1], unit: 'л/га', pkg: 10, targets: 'Дефіцит цинку' },
};

const COLLECTIONS = [
  { slug: 'pidhotovka-do-posivnoi', title: 'Підготовка до посівної', subtitle: 'Весна', icon: 'sprout', image: photo('photo-1500382017468-9049fed747ef'),
    description: 'Насіння, протруйники, гербіциди суцільної дії та стартові добрива — все, щоб вчасно вийти в поле.',
    skus: ['SDC-280', 'SDS-110', 'SDT-002', 'HRB-001', 'FRT-003', 'FRT-001'] },
  { slug: 'zakhyst-zernovykh-navesni', title: 'Захист зернових навесні', subtitle: 'Квітень — травень', icon: 'wheat', image: photo('photo-1574323347407-f5e1ad6d020b'),
    description: 'Гербіциди, фунгіциди, інсектициди та мікродобрива для озимої пшениці та ячменю.',
    skus: ['HRB-004', 'FNG-001', 'FNG-002', 'INS-001', 'MCR-001', 'ADJ-001'] },
  { slug: 'osinnia-sivba', title: 'Сівба озимих', subtitle: 'Осінь', icon: 'leaf', image: photo('photo-1499529112087-3cb3b73cec95'),
    description: 'Насіння озимої пшениці та ріпаку, протруйники й основне удобрення.',
    skus: ['SDW-001', 'SDR-001', 'SDT-001', 'FRT-003', 'FRT-004'] },
];

const ARTICLES = [
  {
    title: 'Як захистити пшеницю від септоріозу',
    tags: 'Пшениця, Хвороби, Фунгіциди',
    cover: photo('photo-1574323347407-f5e1ad6d020b'),
    excerpt: 'Септоріоз — одна з найшкодочинніших хвороб озимої пшениці. Розповідаємо, як вчасно його помітити та яку схему захисту обрати.',
    content: `Септоріоз листя може знизити врожайність пшениці на 15–30 %, особливо у вологі роки. Хвороба розвивається знизу вгору, тому важливо не пропустити перші симптоми.

## Як розпізнати
- світло-бурі плями з темною облямівкою на нижніх листках;
- чорні крапки (пікніди) всередині плям;
- поступове відмирання листя знизу вгору.

## Коли обробляти
Ключові фази — **кінець кущіння — вихід у трубку** (Т1) та **прапорцевий листок** (Т2). Саме прапорцевий листок формує до половини врожаю, тому його захист — пріоритет.

## Що застосовувати
- двокомпонентні фунгіциди (стробілурин + тріазол) — тривалий захист і «грінінг-ефект»;
- тріазоли (тебуконазол, ципроконазол) — для лікувальної дії при перших симптомах.

Підібрати препарат можна у розділі [Фунгіциди](/catalog/fungicides) або через [підбір за проблемою](/problems).

## Порада агронома
Не економте на нормі витрати: занижена доза пришвидшує появу резистентності. Чергуйте діючі речовини з різних хімічних класів.`,
  },
  {
    title: 'Гербіцидний захист соняшнику: що обрати',
    tags: "Соняшник, Бур'яни, Гербіциди",
    cover: photo('photo-1470509037663-253afd7f0f51'),
    excerpt: 'Технологія вирощування гібрида визначає вибір гербіциду. Порівнюємо системи захисту під імідазолінони та сульфонілсечовини.',
    content: `Соняшник дуже чутливий до забур’яненості на початкових етапах — до фази 6–8 листків. Втрати врожаю від бур’янів можуть сягати 50 %.

## Крок 1. Визначте технологію гібрида
- **Clearfield / Clearfield Plus** — гібриди, стійкі до імідазолінонів (імазамокс);
- **Express Sun** — гібриди, стійкі до трибенурон-метилу.

Застосування гербіциду не за технологією знищить посіви.

## Крок 2. Оцініть забур’яненість
Імазамокс контролює злакові та дводольні бур’яни, а також **вовчок** — паразитичну рослину, що особливо поширена на півдні та сході України.

## Крок 3. Дотримуйтеся фази
Оптимально обробляти у фазі 2–4 справжніх листків культури, коли бур’яни ще молоді.

Перегляньте [гербіциди для соняшнику](/catalog?crop=Соняшник&target=Бур'яни) у нашому каталозі.`,
  },
  {
    title: 'Протруювання насіння: навіщо і як правильно',
    tags: 'Протруювання, Насіння',
    cover: photo('photo-1523348837708-15d4a09cfac2'),
    excerpt: 'Протруювання — найдешевший спосіб захистити майбутній урожай. Пояснюємо, чому якість нанесення важлива не менше за сам препарат.',
    content: `Протруєне насіння захищене від хвороб і ґрунтових шкідників на найвразливішому етапі — від проростання до появи 2–3 листків.

## Що дає протруювання
- захист від сажкових хвороб, кореневих гнилей, пліснявіння;
- захист сходів від дротяника, хрущів, блішок;
- рівномірні та дружні сходи.

## Чому важлива якість нанесення
Навіть найкращий препарат не спрацює, якщо його нанесено нерівномірно. Сучасне обладнання забезпечує **точне дозування** та однакове покриття кожної насінини.

## Наш сервіс
Ми пропонуємо [професійне очищення та протруювання насіння](/services) мобільними комплексами безпосередньо у вашому господарстві — без зайвої логістики.`,
  },
  {
    title: 'Скільки азоту потрібно культурі: простий розрахунок',
    tags: 'Добрива, Живлення',
    cover: photo('photo-1464226184884-fa280b87c399'),
    excerpt: 'Розраховуємо норму азотних добрив під запланований урожай і пояснюємо, як не переплатити.',
    content: `Азот — головний елемент, що визначає врожайність зернових. Але надлишок так само шкідливий, як і нестача.

## Базова формула
Потреба в азоті = запланований урожай (т/га) × винос азоту на 1 т продукції.

Для озимої пшениці винос становить приблизно **25–30 кг N на 1 т зерна**. Отже, для врожаю 6 т/га потрібно 150–180 кг діючої речовини на гектар (з урахуванням запасу в ґрунті).

## Перерахунок у фізичну вагу
- аміачна селітра (34,4 % N): 100 кг д.р. ≈ 290 кг добрива;
- карбамід (46 % N): 100 кг д.р. ≈ 217 кг добрива.

## Дробове внесення
Розділіть норму на 2–3 підживлення: рано навесні, у фазі виходу в трубку та (за потреби) по колосу для підвищення білка.

Скористайтеся **калькулятором норми витрати** на сторінці кожного [добрива](/catalog/fertilizers) — він порахує, скільки мішків потрібно на ваші гектари.`,
  },
];

function ensureAdmin(db) {
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM admins').get();
  if (n > 0) return;
  db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run(
    config.adminUsername,
    bcrypt.hashSync(config.adminPassword, 10),
  );
  console.log(`👤 Створено адміністратора "${config.adminUsername}" (пароль з .env або за замовчуванням)`);
}

function seedCatalog(db) {
  const categoryIds = {};
  const insertCategory = db.prepare(
    'INSERT INTO categories (parent_id, name, slug, description, icon, image_url, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
  );
  CATEGORIES.forEach((c, i) => {
    const { lastInsertRowid } = insertCategory.run(
      c.parent ? categoryIds[c.parent] : null, c.name, c.key, c.description, c.icon, c.image || '', i,
    );
    categoryIds[c.key] = lastInsertRowid;
  });

  const brandIds = {};
  const insertBrand = db.prepare('INSERT INTO brands (name, slug, country) VALUES (?, ?, ?)');
  for (const b of BRANDS) brandIds[b.name] = insertBrand.run(b.name, slugify(b.name), b.country).lastInsertRowid;

  const insertProduct = db.prepare(`
    INSERT INTO products (category_id, brand_id, name, slug, sku, short_description, description,
      active_ingredient, formulation, packaging, unit, price, old_price, stock, crops, is_featured)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const usedSlugs = new Set();
  for (const p of PRODUCTS) {
    let slug = slugify(p.name);
    for (let i = 2; usedSlugs.has(slug); i++) slug = `${slugify(p.name)}-${i}`;
    usedSlugs.add(slug);
    insertProduct.run(
      categoryIds[p.category], p.brand ? brandIds[p.brand] : null, p.name, slug, p.sku || '',
      p.short || '', p.description || '', p.active_ingredient || '', p.formulation || '',
      p.packaging || '', p.unit || 'шт', p.price ?? null, p.old_price ?? null, p.stock ?? 0,
      p.crops || '', p.featured ? 1 : 0,
    );
  }
  applyAgronomy(db);
  console.log(`🌱 Додано демо-дані: ${CATEGORIES.length} категорій, ${BRANDS.length} виробників, ${PRODUCTS.length} товарів`);
}

// Норми витрати, проблеми та оптові ціни для демо-товарів (за артикулом)
function applyAgronomy(db) {
  const update = db.prepare(
    'UPDATE products SET rate_min = ?, rate_max = ?, rate_unit = ?, package_size = ?, targets = ? WHERE sku = ?',
  );
  const insertTier = db.prepare(
    'INSERT INTO product_price_tiers (product_id, min_qty, price) SELECT id, ?, ? FROM products WHERE sku = ?',
  );
  for (const [sku, a] of Object.entries(AGRONOMY)) {
    update.run(a.rate[0], a.rate[1], a.unit, a.pkg, a.targets || '', sku);
    for (const [minQty, price] of a.tiers || []) insertTier.run(minQty, price, sku);
  }
}

function seedContent(db) {
  if (db.prepare('SELECT COUNT(*) AS n FROM collections').get().n === 0) {
    const insert = db.prepare(
      `INSERT INTO collections (title, slug, subtitle, description, image_url, icon, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
    const link = db.prepare(
      'INSERT INTO collection_products (collection_id, product_id, sort_order) SELECT ?, id, ? FROM products WHERE sku = ?',
    );
    COLLECTIONS.forEach((c, i) => {
      const { lastInsertRowid } = insert.run(c.title, c.slug, c.subtitle, c.description, c.image, c.icon, i);
      c.skus.forEach((sku, j) => link.run(lastInsertRowid, j, sku));
    });
  }
  if (db.prepare('SELECT COUNT(*) AS n FROM articles').get().n === 0) {
    const insert = db.prepare(
      `INSERT INTO articles (title, slug, excerpt, content, cover_url, tags, published_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now', ?))`,
    );
    ARTICLES.forEach((a, i) => {
      insert.run(a.title, slugify(a.title), a.excerpt, a.content, a.cover, a.tags, `-${i * 9} days`);
    });
  }
}

// Оновлення бази, створеної попередньою версією сайту: емодзі → іконки, норми витрати
function upgradeOldData(db) {
  const setIcon = db.prepare(
    "UPDATE categories SET icon = ?, image_url = CASE WHEN image_url = '' THEN ? ELSE image_url END WHERE slug = ? AND icon NOT GLOB '[a-z]*'",
  );
  for (const c of CATEGORIES) setIcon.run(c.icon, c.image || '', c.key);
  const hasAgronomy = db.prepare('SELECT COUNT(*) AS n FROM products WHERE rate_min IS NOT NULL').get().n > 0;
  if (!hasAgronomy) applyAgronomy(db);
}

function seedIfEmpty(db) {
  ensureAdmin(db);
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM categories').get();
  if (n === 0) seedCatalog(db);
  else upgradeOldData(db);
  seedContent(db);
}

function resetAndSeed(db) {
  db.exec(`
    DELETE FROM order_items; DELETE FROM orders; DELETE FROM service_requests;
    DELETE FROM collection_products; DELETE FROM collections; DELETE FROM articles;
    DELETE FROM product_price_tiers; DELETE FROM product_documents;
    DELETE FROM product_images; DELETE FROM products; DELETE FROM brands; DELETE FROM categories;
    DELETE FROM sqlite_sequence WHERE name IN ('order_items','orders','service_requests','product_images','products','brands','categories');
  `);
  seedCatalog(db);
  seedContent(db);
}

module.exports = { seedIfEmpty };

if (require.main === module) {
  const { db } = require('./db');
  if (process.argv.includes('--reset')) {
    resetAndSeed(db);
    ensureAdmin(db);
  } else {
    seedIfEmpty(db);
  }
  console.log('Готово.');
}
