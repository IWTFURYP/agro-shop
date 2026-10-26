<script setup>
import AppIcon from '@/components/AppIcon.vue';
import { SHOP } from '@/config';
import RequestForm from '@/components/RequestForm.vue';
</script>

<template>
  <div class="container">
    <nav class="breadcrumbs">
      <RouterLink to="/">Головна</RouterLink>
      <span>Контакти</span>
    </nav>
    <h1>Контакти</h1>

    <div class="contacts">
      <div class="contacts__info">
        <div class="card card--pad item">
          <span><AppIcon name="phone" :size="22" /></span>
          <div><small>Телефон</small><a :href="SHOP.phoneHref">{{ SHOP.phone }}</a></div>
        </div>
        <div class="card card--pad item">
          <span><AppIcon name="mail" :size="22" /></span>
          <div><small>Email</small><a :href="`mailto:${SHOP.email}`">{{ SHOP.email }}</a></div>
        </div>
        <div class="card card--pad item">
          <span><AppIcon name="map-pin" :size="22" /></span>
          <div><small>Адреса складу</small><strong>{{ SHOP.address }}</strong></div>
        </div>
        <div class="card card--pad item">
          <span><AppIcon name="clock" :size="22" /></span>
          <div><small>Графік роботи</small><strong>{{ SHOP.workHours }}</strong></div>
        </div>

        <div class="card card--pad">
          <h3>Доставка та оплата</h3>
          <p><AppIcon name="truck" :size="18" /> <strong>Нова Пошта</strong> — по всій Україні, 1–3 дні.</p>
          <p><AppIcon name="package" :size="18" /> <strong>Наш транспорт</strong> — для великих партій безпосередньо у господарство.</p>
          <p><AppIcon name="map-pin" :size="18" /> <strong>Самовивіз</strong> — зі складу в робочий час.</p>
          <p class="muted">Оплата: безготівковий розрахунок з ПДВ, на картку або при отриманні.</p>
        </div>
      </div>

      <div class="card card--pad">
        <RequestForm type="callback" title="Напишіть нам" submit-text="Надіслати" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.contacts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  align-items: start;
}
.contacts__info { display: flex; flex-direction: column; gap: 14px; }
.item { display: flex; gap: 16px; align-items: center; padding: 18px 22px; }
.item > span {
  font-size: 24px;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: var(--c-primary-soft);
  color: var(--c-primary);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.item div { display: flex; flex-direction: column; }
.item small { color: var(--c-muted); font-size: 12px; }
.item a,
.item strong { font-weight: 600; font-size: 16px; }
.contacts p { margin: 0 0 8px; display: flex; gap: 8px; align-items: flex-start; flex-wrap: wrap; }
.contacts p .icon { color: var(--c-primary); margin-top: 3px; }
@media (max-width: 860px) {
  .contacts { grid-template-columns: 1fr; }
}
</style>
