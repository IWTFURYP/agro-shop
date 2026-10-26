<script setup>
import AppIcon from '@/components/AppIcon.vue';
import { SHOP } from '@/config';

const directions = [
  { icon: 'shield-check', title: 'Засоби захисту рослин', text: 'Гербіциди, фунгіциди, інсектициди, протруйники та ад’юванти.' },
  { icon: 'sprout', title: 'Насіння польових культур', text: 'Кукурудза, соняшник, пшениця, ріпак та інші культури.' },
  { icon: 'layers', title: 'Мінеральні та мікродобрива', text: 'Ефективні системи живлення для максимальної врожайності.' },
  { icon: 'tractor', title: 'Сільгосптехніка', text: 'Сучасна техніка від провідних світових виробників.' },
];
</script>

<template>
  <div>
    <section class="page-hero">
      <div class="container">
        <nav class="breadcrumbs">
          <RouterLink to="/">Головна</RouterLink>
          <span>Про нас</span>
        </nav>
        <h1>Про компанію {{ SHOP.name }}</h1>
        <p class="lead">
          Ми допомагаємо українським аграріям отримувати стабільно високі врожаї та ефективно
          розвивати свої господарства. Створюємо комплексні рішення для сучасного агробізнесу,
          поєднуючи передові технології, професійну агрономічну експертизу та широкий портфель
          якісних продуктів.
        </p>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="stats">
          <div v-for="s in SHOP.stats" :key="s.label" class="stats__item card">
            <strong>{{ s.value }}</strong>
            <span>{{ s.label }}</span>
          </div>
        </div>

        <h2>Наші напрямки</h2>
        <div class="directions">
          <div v-for="d in directions" :key="d.title" class="card card--pad">
            <div class="dir-icon"><AppIcon :name="d.icon" :size="24" /></div>
            <h3>{{ d.title }}</h3>
            <p class="muted">{{ d.text }}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="section section--alt">
      <div class="container two-col">
        <div>
          <h2>Що ми пропонуємо</h2>
          <p>
            Наші клієнти отримують не лише продукцію, а комплексну технологічну підтримку: від підбору
            насіння і засобів захисту рослин до рекомендацій щодо ефективних систем живлення та
            сучасних технологій вирощування культур.
          </p>
          <ul class="list">
            <li>мережа представництв і доставка по всій Україні</li>
            <li>команда професійних менеджерів та агрономів</li>
            <li>багаторічний досвід роботи з господарствами різних масштабів</li>
            <li>постійне розширення асортименту рішень для аграріїв</li>
          </ul>
        </div>
        <div class="mission card card--pad">
          <span class="badge">Місія</span>
          <h2>Допомагати аграріям реалізовувати потенціал землі</h2>
          <p>
            Україна — одна з найважливіших аграрних країн світу з унікальним природним потенціалом,
            родючими ґрунтами та сильними аграрними традиціями.
          </p>
          <p>
            Ми прагнемо бути надійним партнером для агровиробників, забезпечуючи їх сучасними
            технологічними рішеннями, якісними ресурсами та професійною експертизою для підвищення
            врожайності, ефективності виробництва та сталого розвитку аграрної галузі.
          </p>
          <p class="mission__quote">Це більше, ніж продаж. Це партнерство, технології та рішення для стабільного розвитку.</p>
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
.lead { font-size: 17px; max-width: 820px; color: var(--c-muted); }
.section--alt { background: var(--c-sand); }

.stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 48px;
}
.stats__item {
  padding: 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
}
.stats__item strong { font: 800 34px var(--font-head); color: var(--c-primary); }
.stats__item span { color: var(--c-muted); }

.directions {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}
.dir-icon {
  width: 52px;
  height: 52px;
  margin-bottom: 16px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: var(--c-primary-soft);
  color: var(--c-primary);
}
.directions p { margin: 0; font-size: 14px; }

.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
  align-items: start;
}
.list { padding-left: 20px; line-height: 2; }
.list li::marker { color: var(--c-primary); }
.mission h2 { margin-top: 12px; }
.mission__quote {
  margin: 0;
  padding: 16px;
  border-left: 4px solid var(--c-accent);
  background: var(--c-accent-light);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  font-weight: 600;
}

@media (max-width: 900px) {
  .stats,
  .directions { grid-template-columns: repeat(2, 1fr); }
  .two-col { grid-template-columns: 1fr; }
}
</style>
