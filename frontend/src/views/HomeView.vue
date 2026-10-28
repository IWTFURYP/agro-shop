<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '@/api';
import { SHOP, QUICK_PROBLEMS } from '@/config';
import { formatDate } from '@/utils/format';
import { useCatalogStore } from '@/stores/catalog';
import { useAssistantStore } from '@/stores/assistant';
import ProductCard from '@/components/ProductCard.vue';
import ProductImage from '@/components/ProductImage.vue';
import RequestForm from '@/components/RequestForm.vue';
import AppIcon from '@/components/AppIcon.vue';

const catalog = useCatalogStore();
const assistant = useAssistantStore();
const router = useRouter();

const featured = ref([]);
const brands = ref([]);
const collections = ref([]);
const articles = ref([]);
const loading = ref(true);
const error = ref('');
const heroFailed = ref(false);
const problem = ref('');

const advantages = [
  { icon: 'users', title: 'Агрономічний супровід', text: 'Підберемо насіння, систему захисту та живлення під ваше поле і ваш бюджет.' },
  { icon: 'badge-check', title: 'Оригінальна продукція', text: 'Працюємо напряму з виробниками та офіційними дистриб’юторами.' },
  { icon: 'truck', title: 'Доставка по Україні', text: 'Власний транспорт і Нова Пошта — привеземо вчасно, до посівної.' },
  { icon: 'percent', title: 'Оптові ціни', text: 'Що більша партія — то нижча ціна. Безготівковий розрахунок з ПДВ.' },
];

onMounted(async () => {
  catalog.loadCategories().catch(() => {});
  try {
    const [products, brandList, collectionList, articleList] = await Promise.all([
      api.get('/products', { featured: 1, limit: 8 }),
      api.get('/brands'),
      api.get('/collections'),
      api.get('/articles', { limit: 3 }),
    ]);
    featured.value = products.items;
    brands.value = brandList;
    collections.value = collectionList;
    articles.value = articleList.items;
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
});

function searchProblem(text = problem.value) {
  const q = text.trim();
  if (q) router.push({ name: 'catalog', query: { search: q } });
}
</script>

<template>
  <!-- ГОЛОВНИЙ ЕКРАН -->
  <section class="hero">
    <img
      v-if="SHOP.heroImage && !heroFailed"
      :src="SHOP.heroImage"
      alt=""
      class="hero__bg"
      fetchpriority="high"
      @error="heroFailed = true"
    />
    <div class="hero__overlay" />
    <div class="container hero__inner">
      <div class="hero__content">
        <span class="hero__tag"><AppIcon name="wheat" :size="16" /> Сезон {{ new Date().getFullYear() }}: готуємося разом</span>
        <h1>Все для високого врожаю — в&nbsp;одному місці</h1>
        <p class="hero__lead">
          Засоби захисту рослин, насіння, мінеральні та мікродобрива, сучасна техніка й професійна
          агрономічна підтримка для господарств будь-якого масштабу.
        </p>
        <div class="hero__actions">
          <RouterLink to="/catalog" class="btn btn--lg btn--accent">
            Перейти до каталогу <AppIcon name="arrow-right" :size="18" />
          </RouterLink>
          <RouterLink to="/problems" class="btn btn--lg btn--glass">Підібрати препарат</RouterLink>
        </div>
      </div>

      <div class="hero__stats">
        <div v-for="s in SHOP.stats" :key="s.label" class="hero__stat">
          <strong>{{ s.value }}</strong>
          <span>{{ s.label }}</span>
        </div>
      </div>
    </div>
  </section>

  <!-- ПОШУК ЗА ПРОБЛЕМОЮ -->
  <section class="container problem-wrap">
    <div v-reveal class="problem card">
      <div class="problem__text">
        <span class="problem__icon"><AppIcon name="microscope" :size="26" /></span>
        <div>
          <h2>Що турбує ваше поле чи сад?</h2>
          <p class="muted">Опишіть проблему — підберемо препарати. Наприклад, «парша яблуні» чи «септоріоз пшениці».</p>
        </div>
      </div>
      <form class="problem__form" @submit.prevent="searchProblem()">
        <AppIcon name="search" :size="20" class="problem__search-icon" />
        <input v-model="problem" class="problem__input" type="search" placeholder="Хвороба, шкідник або бур’ян…" aria-label="Пошук за проблемою" />
        <button class="btn">Знайти</button>
      </form>
      <div class="problem__chips">
        <button v-for="q in QUICK_PROBLEMS" :key="q" type="button" class="chip" @click="searchProblem(q)">{{ q }}</button>
        <RouterLink to="/problems" class="chip chip--more">Усі проблеми <AppIcon name="arrow-right" :size="14" /></RouterLink>
        <button v-if="assistant.enabled" type="button" class="chip chip--ai" @click="assistant.ask(problem.trim() || '')">
          <AppIcon name="sparkles" :size="14" /> Описати проблему AI-помічнику
        </button>
      </div>
    </div>
  </section>

  <!-- КАТЕГОРІЇ (БЕНТО) -->
  <section class="section">
    <div class="container">
      <div v-reveal class="section-head">
        <div>
          <span class="eyebrow">Каталог</span>
          <h2>Категорії товарів</h2>
        </div>
        <RouterLink to="/catalog" class="link-arrow">Весь каталог <AppIcon name="arrow-right" :size="18" /></RouterLink>
      </div>
      <div class="bento">
        <RouterLink
          v-for="(cat, i) in catalog.categories"
          :key="cat.id"
          v-reveal="i * 60"
          :to="`/catalog/${cat.slug}`"
          class="bento__item"
          :class="`bento__item--${i}`"
        >
          <ProductImage v-if="cat.image_url" :src="cat.image_url" :alt="cat.name" :icon="cat.icon" cover class="bento__img" />
          <div class="bento__shade" />
          <div class="bento__content">
            <span class="bento__icon"><AppIcon :name="cat.icon" :size="22" /></span>
            <h3>{{ cat.name }}</h3>
            <p v-if="i === 0">{{ cat.description }}</p>
            <span class="bento__count">{{ cat.product_count }} товарів <AppIcon name="arrow-right" :size="16" /></span>
          </div>
        </RouterLink>
      </div>
    </div>
  </section>

  <!-- СЕЗОННІ ДОБІРКИ -->
  <section v-if="collections.length" class="section section--sand">
    <div class="container">
      <div v-reveal class="section-head">
        <div>
          <span class="eyebrow">Сезонні добірки</span>
          <h2>Готові рішення на сезон</h2>
          <p>Ми зібрали все необхідне для ключових етапів сезону — додавайте в кошик одним списком.</p>
        </div>
      </div>
      <div class="collections">
        <RouterLink
          v-for="(c, i) in collections"
          :key="c.id"
          v-reveal="i * 80"
          :to="{ name: 'catalog', query: { collection: c.slug } }"
          class="collection"
        >
          <div class="collection__img">
            <ProductImage :src="c.image_url" :alt="c.title" :icon="c.icon || 'sprout'" cover />
            <span v-if="c.subtitle" class="badge badge--yellow collection__season">
              <AppIcon name="calendar-days" :size="13" /> {{ c.subtitle }}
            </span>
          </div>
          <div class="collection__body">
            <h3>{{ c.title }}</h3>
            <p>{{ c.description }}</p>
            <span class="link-arrow">{{ c.product_count }} товарів у добірці <AppIcon name="arrow-right" :size="16" /></span>
          </div>
        </RouterLink>
      </div>
    </div>
  </section>

  <!-- ЯБЛУНЕВИЙ САД -->
  <section class="container">
    <div v-reveal class="service service--orchard">
      <div class="service__content">
        <span class="badge badge--yellow">Для садівників</span>
        <h2>Програма захисту яблуневого саду на весь сезон</h2>
        <p>
          Вісім етапів — від сплячих бруньок до листопаду. Вкажіть площу саду в сотках чи гектарах, і ми порахуємо,
          скільки препаратів проти парші, плодожерки та кліщів потрібно, і скільки це коштуватиме.
        </p>
        <div class="service__points">
          <span><AppIcon name="check" :size="18" /> Розрахунок на ваші сотки</span>
          <span><AppIcon name="check" :size="18" /> Що робити саме зараз</span>
          <span><AppIcon name="check" :size="18" /> Весь сезон — у кошик одним кліком</span>
        </div>
        <RouterLink to="/sad" class="btn btn--accent">Відкрити програму <AppIcon name="arrow-right" :size="18" /></RouterLink>
      </div>
      <div class="service__art" aria-hidden="true">
        <AppIcon name="apple" :size="150" :stroke-width="1" />
      </div>
    </div>
  </section>

  <!-- ПОПУЛЯРНІ ТОВАРИ -->
  <section class="section">
    <div class="container">
      <div v-reveal class="section-head">
        <div>
          <span class="eyebrow">Хіти продажів</span>
          <h2>Популярні товари</h2>
        </div>
        <RouterLink to="/catalog" class="link-arrow">Дивитись усі <AppIcon name="arrow-right" :size="18" /></RouterLink>
      </div>
      <div v-if="loading" class="products-grid">
        <div v-for="i in 4" :key="i" class="skeleton" style="aspect-ratio: 3 / 4" />
      </div>
      <div v-else-if="error" class="alert alert--error">{{ error }}</div>
      <div v-else class="products-grid">
        <ProductCard v-for="(p, i) in featured" :key="p.id" v-reveal="(i % 4) * 70" :product="p" />
      </div>
    </div>
  </section>

  <!-- ПОСЛУГА ПРОТРУЮВАННЯ -->
  <section class="container">
    <div v-reveal class="service">
      <div class="service__content">
        <span class="badge badge--yellow">Новий сервіс</span>
        <h2>Професійне протруювання насіння у вашому господарстві</h2>
        <p>
          Мобільні комплекси на сучасному французькому обладнанні очищують та протруюють насіння прямо
          на вашому току. Без зайвої логістики — якісна підготовка посівного матеріалу перед посівною.
        </p>
        <div class="service__points">
          <span><AppIcon name="check" :size="18" /> Точне дозування</span>
          <span><AppIcon name="check" :size="18" /> Виїзд до клієнта</span>
          <span><AppIcon name="check" :size="18" /> Підбір рецептури</span>
        </div>
        <RouterLink to="/services" class="btn btn--accent">Замовити послугу <AppIcon name="arrow-right" :size="18" /></RouterLink>
      </div>
      <div class="service__art" aria-hidden="true">
        <AppIcon name="sprout" :size="160" :stroke-width="1" />
      </div>
    </div>
  </section>

  <!-- ПЕРЕВАГИ -->
  <section class="section">
    <div class="container">
      <div v-reveal class="section-head section-head--center">
        <div>
          <span class="eyebrow">Чому ми</span>
          <h2>Партнер, а не просто постачальник</h2>
        </div>
      </div>
      <div class="advantages">
        <div v-for="(a, i) in advantages" :key="a.title" v-reveal="i * 80" class="advantage">
          <span class="advantage__icon"><AppIcon :name="a.icon" :size="24" /></span>
          <h3>{{ a.title }}</h3>
          <p>{{ a.text }}</p>
        </div>
      </div>
    </div>
  </section>

  <!-- СТАТТІ -->
  <section v-if="articles.length" class="section section--soft">
    <div class="container">
      <div v-reveal class="section-head">
        <div>
          <span class="eyebrow">Поради агронома</span>
          <h2>Корисне для вашого поля</h2>
        </div>
        <RouterLink to="/articles" class="link-arrow">Усі статті <AppIcon name="arrow-right" :size="18" /></RouterLink>
      </div>
      <div class="articles">
        <RouterLink v-for="(a, i) in articles" :key="a.id" v-reveal="i * 80" :to="`/articles/${a.slug}`" class="article-card">
          <div class="article-card__img">
            <ProductImage :src="a.cover_url" :alt="a.title" icon="book-open" cover />
          </div>
          <div class="article-card__body">
            <span class="muted article-card__date">{{ formatDate(a.published_at).split(',')[0] }}</span>
            <h3>{{ a.title }}</h3>
            <p>{{ a.excerpt }}</p>
          </div>
        </RouterLink>
      </div>
    </div>
  </section>

  <!-- ПАРТНЕРИ -->
  <section v-if="brands.length" class="section section--tight">
    <div class="container">
      <p class="partners-title">Офіційні партнери та виробники</p>
      <div class="brands">
        <RouterLink v-for="b in brands" :key="b.id" :to="{ name: 'catalog', query: { brand: b.slug } }" class="brands__item">
          <img v-if="b.logo_url" :src="b.logo_url" :alt="b.name" />
          <span v-else>{{ b.name }}</span>
        </RouterLink>
      </div>
    </div>
  </section>

  <!-- КОНСУЛЬТАЦІЯ -->
  <section class="section section--tight">
    <div class="container">
      <div v-reveal class="consult">
        <div class="consult__text">
          <span class="eyebrow">Консультація</span>
          <h2>Потрібна порада агронома?</h2>
          <p>
            Залиште заявку — фахівець допоможе підібрати систему захисту та живлення для ваших культур і
            розрахує потребу на ваші площі. Безкоштовно.
          </p>
          <a :href="SHOP.phoneHref" class="consult__phone"><AppIcon name="phone-call" :size="22" /> {{ SHOP.phone }}</a>
        </div>
        <div class="consult__form card card--pad">
          <RequestForm type="consultation" submit-text="Отримати консультацію" />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* ---------- Hero ---------- */
.hero {
  position: relative;
  min-height: min(92vh, 820px);
  display: flex;
  align-items: flex-end;
  color: #fff;
  background: radial-gradient(circle at 75% 20%, #4c8a4f 0%, transparent 50%), linear-gradient(150deg, #2f6b3c, #1b3f25);
  overflow: hidden;
}
.hero__bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  animation: heroZoom 18s var(--ease) both;
}
@keyframes heroZoom { from { transform: scale(1.08); } to { transform: scale(1); } }
.hero__overlay {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(10, 22, 13, 0.55) 0%, rgba(10, 22, 13, 0.15) 35%, rgba(10, 22, 13, 0.75) 100%),
    linear-gradient(90deg, rgba(10, 22, 13, 0.55) 0%, transparent 65%);
}
.hero__inner {
  position: relative;
  padding-top: calc(var(--header-h) + 64px);
  padding-bottom: 40px;
  width: 100%;
}
.hero__content { max-width: 720px; animation: fadeUp 0.9s var(--ease) both; }
@keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }
.hero__tag {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 14px;
  margin-bottom: 20px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.22);
  backdrop-filter: blur(8px);
  font-size: 14px;
}
.hero__tag .icon { color: var(--c-accent); }
.hero h1 {
  color: #fff;
  font-size: clamp(36px, 6vw, 68px);
  line-height: 1.04;
  letter-spacing: -0.035em;
  margin-bottom: 20px;
}
.hero__lead { font-size: clamp(16px, 1.6vw, 19px); color: rgba(255, 255, 255, 0.86); max-width: 600px; }
.hero__actions { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 32px; }

.hero__stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  margin-top: 64px;
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  animation: fadeUp 0.9s 0.2s var(--ease) both;
}
.hero__stat {
  padding: 22px 24px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid rgba(255, 255, 255, 0.14);
}
.hero__stat:last-child { border-right: 0; }
.hero__stat strong { font: 800 32px/1.1 var(--font-head); letter-spacing: -0.03em; }
.hero__stat span { color: rgba(255, 255, 255, 0.75); font-size: 14px; }

/* ---------- Проблема ---------- */
.problem-wrap { position: relative; margin-top: -1px; }
.problem {
  margin-top: 56px;
  padding: 32px;
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 16px 32px;
  align-items: center;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
}
.problem__text { display: flex; gap: 16px; align-items: center; }
.problem__text h2 { font-size: 24px; margin: 0 0 4px; }
.problem__text p { margin: 0; font-size: 14px; }
.problem__icon {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  background: var(--c-accent-light);
  color: #8a5f0d;
}
.problem__form { position: relative; display: flex; gap: 8px; }
.problem__search-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: var(--c-muted); }
.problem__input {
  flex: 1;
  min-width: 0;
  height: 52px;
  padding: 0 16px 0 48px;
  border: 1px solid var(--c-border);
  border-radius: 999px;
  background: var(--c-bg);
  font: 400 15px var(--font-body);
}
.problem__input:focus { outline: none; border-color: var(--c-primary); box-shadow: 0 0 0 4px rgba(47, 107, 60, 0.12); background: #fff; }
.problem__chips { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 8px; }
.chip--more { color: var(--c-primary); border-color: transparent; background: var(--c-primary-soft); }
.chip--ai { color: #fff; border-color: transparent; background: var(--c-primary-dark); }
.chip--ai:hover { color: #fff; background: var(--c-primary); }

/* ---------- Бенто ---------- */
.bento {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: 210px;
  gap: 16px;
}
.bento__item {
  position: relative;
  border-radius: var(--radius-lg);
  overflow: hidden;
  color: #fff;
  background: linear-gradient(150deg, #3d7a48, #1b3f25);
  isolation: isolate;
}
.bento__item--0 { grid-column: span 2; grid-row: span 2; }
.bento__item--1 { grid-column: span 2; }
.bento__item--4 { grid-column: span 2; background: linear-gradient(150deg, #b98a35, #6e4f15); }
.bento__item--5 { grid-column: span 2; background: linear-gradient(150deg, #b3553f, #5e2a1c); }
.bento__item--2 { background: linear-gradient(150deg, #6d8f5b, #34512b); }
.bento__item--3 { background: linear-gradient(150deg, #8a9f63, #49603a); }
.bento__img { position: absolute; inset: 0; z-index: -2; transition: transform 0.7s var(--ease); }
.bento__item:hover .bento__img { transform: scale(1.06); }
.bento__shade {
  position: absolute;
  inset: 0;
  z-index: -1;
  background: linear-gradient(180deg, rgba(10, 22, 13, 0.05) 20%, rgba(10, 22, 13, 0.78) 100%);
}
.bento__content {
  position: absolute;
  inset: auto 0 0 0;
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}
.bento__icon {
  width: 44px;
  height: 44px;
  margin-bottom: 6px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(8px);
}
.bento__content h3 { color: #fff; margin: 0; font-size: 20px; }
.bento__item--0 .bento__content h3 { font-size: 30px; }
.bento__content p { margin: 0; max-width: 420px; color: rgba(255, 255, 255, 0.82); font-size: 15px; }
.bento__count {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.85);
}
.bento__count .icon { transition: transform 0.2s var(--ease); }
.bento__item:hover .bento__count .icon { transform: translateX(4px); }
.bento :deep(.pimg__placeholder) { background: transparent; }
.bento :deep(.pimg__placeholder > *) { display: none; }

/* ---------- Добірки ---------- */
.collections {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 20px;
}
.collection {
  display: flex;
  flex-direction: column;
  border-radius: var(--radius-lg);
  background: #fff;
  overflow: hidden;
  color: var(--c-text);
  box-shadow: var(--shadow-xs);
  transition: box-shadow 0.3s var(--ease), transform 0.3s var(--ease);
}
.collection:hover { box-shadow: var(--shadow-lg); transform: translateY(-4px); color: var(--c-text); }
.collection__img { position: relative; aspect-ratio: 16 / 9; background: var(--c-primary-light); }
.collection__img :deep(img) { transition: transform 0.6s var(--ease); }
.collection:hover .collection__img :deep(img) { transform: scale(1.05); }
.collection__season { position: absolute; top: 14px; left: 14px; }
.collection__body { padding: 22px 24px 24px; display: flex; flex-direction: column; flex: 1; }
.collection__body h3 { font-size: 20px; margin-bottom: 8px; }
.collection__body p { color: var(--c-muted); font-size: 14px; flex: 1; }
.collection__body .link-arrow { color: var(--c-primary); font-size: 14px; }

/* ---------- Послуга ---------- */
.service {
  position: relative;
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  align-items: center;
  gap: 32px;
  padding: 56px;
  border-radius: 32px;
  background:
    radial-gradient(circle at 85% 30%, rgba(217, 164, 65, 0.25), transparent 45%),
    linear-gradient(140deg, #2f6b3c, #1b3f25);
  color: #d8e4d5;
  overflow: hidden;
}
.service h2 { color: #fff; margin: 14px 0 12px; max-width: 560px; }
.service p { max-width: 560px; }
.service__points { display: flex; flex-wrap: wrap; gap: 10px 24px; margin: 8px 0 28px; color: #fff; font-weight: 500; }
.service__points span { display: inline-flex; gap: 8px; align-items: center; }
.service__points .icon { color: var(--c-accent); }
.service__art {
  justify-self: center;
  width: 260px;
  height: 260px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: var(--c-accent);
}

.service--orchard {
  margin-top: 72px;
  background:
    radial-gradient(circle at 85% 30%, rgba(214, 84, 64, 0.28), transparent 45%),
    linear-gradient(140deg, #3d6b2f, #1f3f1b);
}
.service--orchard .service__art { color: #f0a08c; }

/* ---------- Переваги ---------- */
.section-head--center { justify-content: center; text-align: center; }
.section-head--center .eyebrow::before { display: none; }
.advantages {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}
.advantage {
  padding: 28px;
  border-radius: var(--radius-lg);
  background: var(--c-sand);
}
.advantage__icon {
  width: 52px;
  height: 52px;
  margin-bottom: 20px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: #fff;
  color: var(--c-primary);
  box-shadow: var(--shadow-xs);
}
.advantage p { margin: 0; font-size: 14px; color: var(--c-muted); }

/* ---------- Статті ---------- */
.articles {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}
.article-card {
  display: flex;
  flex-direction: column;
  border-radius: var(--radius-lg);
  background: #fff;
  overflow: hidden;
  color: var(--c-text);
  transition: box-shadow 0.3s var(--ease), transform 0.3s var(--ease);
}
.article-card:hover { box-shadow: var(--shadow-lg); transform: translateY(-4px); color: var(--c-text); }
.article-card__img { aspect-ratio: 16 / 10; background: var(--c-primary-light); }
.article-card__body { padding: 22px 24px 26px; }
.article-card__date { font-size: 13px; }
.article-card__body h3 { margin: 6px 0 8px; font-size: 19px; }
.article-card__body p {
  margin: 0;
  font-size: 14px;
  color: var(--c-muted);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ---------- Партнери ---------- */
.partners-title {
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--c-muted);
  margin-bottom: 20px;
}
.brands {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px 40px;
}
.brands__item {
  padding: 8px 4px;
  font: 800 20px var(--font-head);
  letter-spacing: -0.01em;
  color: #a3aa9c;
  transition: color 0.2s;
}
.brands__item:hover { color: var(--c-primary); }
.brands__item img { max-height: 40px; object-fit: contain; filter: grayscale(1); opacity: 0.7; transition: all 0.2s; }
.brands__item:hover img { filter: none; opacity: 1; }

/* ---------- Консультація ---------- */
.consult {
  display: grid;
  grid-template-columns: 1fr 1.1fr;
  gap: 48px;
  align-items: center;
}
.consult__text p { color: var(--c-muted); font-size: 16px; max-width: 480px; }
.consult__phone {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
  font: 800 24px var(--font-head);
  color: var(--c-text);
}
.consult__phone .icon { color: var(--c-primary); }
.consult__form { border-radius: var(--radius-lg); box-shadow: var(--shadow); }

/* ---------- Адаптивність ---------- */
@media (max-width: 1000px) {
  .bento { grid-template-columns: repeat(2, 1fr); }
  .bento__item--1 { grid-column: span 1; }
  .bento__item--3, .bento__item--4, .bento__item--5 { grid-column: span 2; }
  .articles { grid-template-columns: repeat(2, 1fr); }
  .advantages { grid-template-columns: repeat(2, 1fr); }
  .problem { grid-template-columns: minmax(0, 1fr); }
  .service { grid-template-columns: 1fr; padding: 40px; }
  .service__art { display: none; }
  .consult { grid-template-columns: minmax(0, 1fr); gap: 24px; }
}
@media (max-width: 760px) {
  .section { padding: 56px 0; }
  .hero { min-height: auto; }
  .hero__inner { padding-top: calc(var(--header-h) + 40px); padding-bottom: 24px; }
  .hero__stats { grid-template-columns: repeat(2, 1fr); margin-top: 40px; }
  .hero__stat { padding: 16px 18px; }
  .hero__stat:nth-child(2) { border-right: 0; }
  .hero__stat:nth-child(-n + 2) { border-bottom: 1px solid rgba(255, 255, 255, 0.14); }
  .hero__stat strong { font-size: 24px; }
  .hero__stat span { font-size: 12px; }
  .problem { margin-top: 32px; padding: 20px; }
  .problem__text h2 { font-size: 20px; }
  .problem__icon { display: none; }
  .bento { grid-auto-rows: 160px; gap: 10px; }
  .bento__item--0 { grid-column: span 2; grid-row: span 2; }
  .bento__content { padding: 16px; }
  .bento__content h3 { font-size: 16px; }
  .bento__item--0 .bento__content h3 { font-size: 24px; }
  .bento__icon { width: 36px; height: 36px; }
  .collections, .articles { grid-template-columns: 1fr; }
  .service { padding: 28px; border-radius: 24px; }
  .advantages { grid-template-columns: 1fr; }
  .brands { gap: 4px 24px; }
  .brands__item { font-size: 16px; }
}
</style>
