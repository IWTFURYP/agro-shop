<script setup>
import AppIcon from '@/components/AppIcon.vue';
import RequestForm from '@/components/RequestForm.vue';

const steps = [
  { icon: 'phone-call', title: 'Заявка', text: 'Залишаєте заявку — уточнюємо культуру, обсяг насіння та бажані терміни.' },
  { icon: 'flask-conical', title: 'Підбір рецептури', text: 'Агроном підбирає протруйник і стимулятори під ваші умови та ризики.' },
  { icon: 'truck', title: 'Виїзд комплексу', text: 'Мобільний комплекс приїжджає безпосередньо у ваше господарство.' },
  { icon: 'sprout', title: 'Готове насіння', text: 'Очищене та рівномірно протруєне насіння — одразу до сівалки.' },
];

const benefits = [
  'Сучасне французьке обладнання для високоточної обробки посівного матеріалу',
  'Робота безпосередньо у господарстві — без додаткової логістики',
  'Економія часу у найгарячіший період перед посівною',
  'Рівномірне нанесення препарату на кожну насінину',
  'Очищення насіння від домішок і травмованих зерен',
  'Агрономічний супровід та підбір оптимальної рецептури',
];
</script>

<template>
  <div>
    <section class="page-hero">
      <div class="container">
        <nav class="breadcrumbs">
          <RouterLink to="/">Головна</RouterLink>
          <span>Послуги</span>
        </nav>
        <span class="badge badge--yellow">Новий сервіс</span>
        <h1>Професійне очищення та протруювання насіння</h1>
        <p class="lead">
          Розвиваючи напрям агросервісів, ми запустили послугу професійної доробки насіння. Наші
          мобільні комплекси працюють безпосередньо у вашому господарстві та забезпечують якісну
          підготовку посівного матеріалу прямо перед посівною.
        </p>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <h2 class="text-center">Як це працює</h2>
        <div class="steps">
          <div v-for="(s, i) in steps" :key="s.title" class="step card card--pad">
            <span class="step__num">{{ i + 1 }}</span>
            <div class="step__icon"><AppIcon :name="s.icon" :size="24" /></div>
            <h3>{{ s.title }}</h3>
            <p class="muted">{{ s.text }}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="section section--alt">
      <div class="container service">
        <div>
          <h2>Переваги послуги</h2>
          <ul class="benefits">
            <li v-for="b in benefits" :key="b">{{ b }}</li>
          </ul>
        </div>
        <div class="card card--pad">
          <RequestForm type="seed_treatment" title="Замовити протруювання" show-crop submit-text="Замовити послугу" />
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="other card card--pad">
          <div>
            <h2>Агрономічна консультація</h2>
            <p class="muted">
              Допоможемо підібрати насіння й засоби захисту, сформувати систему живлення та
              технологію вирощування під ваші поля.
            </p>
          </div>
          <RequestForm type="consultation" compact submit-text="Замовити дзвінок агронома" />
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.page-hero {
  background: var(--c-sand);
  padding: 8px 0 48px;
}
.lead { font-size: 17px; max-width: 760px; color: var(--c-muted); }
.page-hero h1 { margin-top: 12px; max-width: 820px; }
.section--alt { background: var(--c-sand); }

.steps {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-top: 24px;
}
.step { position: relative; }
.step__num {
  position: absolute;
  top: 16px;
  right: 20px;
  font: 800 40px var(--font-head);
  color: var(--c-primary-light);
}
.step__icon {
  width: 52px;
  height: 52px;
  margin-bottom: 16px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: var(--c-primary-soft);
  color: var(--c-primary);
}
.step p { margin: 0; font-size: 14px; }

.service {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
  align-items: start;
}
.benefits { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px; }
.benefits li {
  position: relative;
  padding-left: 34px;
  font-size: 16px;
}
.benefits li::before {
  content: '✓';
  position: absolute;
  left: 0;
  top: 0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--c-primary);
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 700;
}

.other {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  align-items: center;
}

@media (max-width: 900px) {
  .steps { grid-template-columns: repeat(2, 1fr); }
  .service,
  .other { grid-template-columns: 1fr; }
}
@media (max-width: 520px) {
  .steps { grid-template-columns: 1fr; }
}
</style>
