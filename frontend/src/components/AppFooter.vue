<script setup>
import { SHOP } from '@/config';
import { useCatalogStore } from '@/stores/catalog';
import AppLogo from './AppLogo.vue';
import AppIcon from './AppIcon.vue';

const catalog = useCatalogStore();
const year = new Date().getFullYear();
</script>

<template>
  <footer class="footer">
    <div class="container footer__grid">
      <div class="footer__brand">
        <AppLogo light />
        <p>
          {{ SHOP.tagline }}. Допомагаємо аграріям отримувати стабільно високі врожаї — від підбору
          насіння до системи живлення й захисту.
        </p>
        <div class="footer__msg">
          <a v-if="SHOP.viber" :href="SHOP.viber" class="btn btn--glass btn--sm" target="_blank" rel="noopener">Viber</a>
          <a v-if="SHOP.telegram" :href="SHOP.telegram" class="btn btn--glass btn--sm" target="_blank" rel="noopener">Telegram</a>
        </div>
      </div>
      <div>
        <h4>Каталог</h4>
        <RouterLink v-for="cat in catalog.categories" :key="cat.id" :to="`/catalog/${cat.slug}`">
          {{ cat.name }}
        </RouterLink>
      </div>
      <div>
        <h4>Аграріям</h4>
        <RouterLink to="/sad">Захист яблуневого саду</RouterLink>
        <RouterLink to="/problems">Підбір за проблемою</RouterLink>
        <RouterLink to="/articles">Поради агронома</RouterLink>
        <RouterLink to="/services">Протруювання насіння</RouterLink>
        <RouterLink to="/about">Про компанію</RouterLink>
        <RouterLink to="/contacts">Доставка та оплата</RouterLink>
      </div>
      <div>
        <h4>Контакти</h4>
        <a :href="SHOP.phoneHref" class="footer__contact"><AppIcon name="phone" :size="16" /> {{ SHOP.phone }}</a>
        <a :href="`mailto:${SHOP.email}`" class="footer__contact"><AppIcon name="mail" :size="16" /> {{ SHOP.email }}</a>
        <span class="footer__contact"><AppIcon name="map-pin" :size="16" /> {{ SHOP.address }}</span>
        <span class="footer__contact"><AppIcon name="clock" :size="16" /> {{ SHOP.workHours }}</span>
      </div>
    </div>
    <div class="container footer__bottom">
      <span>© {{ year }} {{ SHOP.name }}. Усі права захищено.</span>
      <a href="/sitemap.xml">Карта сайту</a>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  margin-top: 80px;
  background: var(--c-primary-dark);
  color: #b9c8b5;
  font-size: 14px;
}
.footer__grid {
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr 1.3fr;
  gap: 40px;
  padding-top: 64px;
  padding-bottom: 48px;
}
.footer__grid > div {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.footer__brand p { margin: 16px 0 0; line-height: 1.7; max-width: 340px; }
.footer__msg { display: flex; gap: 8px; }
.footer h4 {
  color: #fff;
  margin: 0 0 6px;
  font-size: 15px;
}
.footer a { color: #b9c8b5; }
.footer a:hover { color: #fff; }
.footer__contact { display: flex; gap: 10px; align-items: flex-start; }
.footer__contact .icon { margin-top: 3px; color: var(--c-accent); }
.footer__bottom {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding-top: 20px;
  padding-bottom: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 13px;
  color: #8ea089;
}
@media (max-width: 900px) {
  .footer__grid { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 560px) {
  .footer { margin-top: 56px; }
  .footer__grid { grid-template-columns: 1fr; gap: 28px; padding-top: 48px; }
}
</style>
