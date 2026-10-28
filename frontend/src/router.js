import { createRouter, createWebHistory } from 'vue-router';
import { setSeo } from './composables/useSeo';
import { useAuthStore } from './stores/auth';
import HomeView from './views/HomeView.vue';

const routes = [
  { path: '/', name: 'home', component: HomeView, meta: { seo: true } },
  { path: '/catalog/:category?', name: 'catalog', component: () => import('./views/CatalogView.vue'), meta: { title: 'Каталог товарів', description: 'Каталог засобів захисту рослин, насіння, добрив і сільгосптехніки з оптовими цінами та доставкою по Україні.' } },
  { path: '/problems', name: 'problems', component: () => import('./views/ProblemsView.vue'), meta: { title: 'Підбір препаратів за проблемою', description: "Оберіть культуру та проблему — бур'яни, хвороби чи шкідників — і отримайте перелік препаратів для захисту." } },
  { path: '/sad', name: 'orchard', component: () => import('./views/OrchardView.vue'), meta: { title: 'Програма захисту яблуневого саду', description: 'Схема обприскування яблуні за фенофазами: препарати проти парші, плодожерки, кліщів і гнилей з розрахунком на площу саду.' } },
  { path: '/articles', name: 'articles', component: () => import('./views/ArticlesView.vue'), meta: { title: 'Поради агронома', description: 'Корисні статті про захист рослин, живлення та технології вирощування польових культур.' } },
  { path: '/articles/:slug', name: 'article', component: () => import('./views/ArticleView.vue') },
  { path: '/product/:slug', name: 'product', component: () => import('./views/ProductView.vue') },
  { path: '/cart', name: 'cart', component: () => import('./views/CartView.vue'), meta: { title: 'Кошик' } },
  { path: '/checkout', name: 'checkout', component: () => import('./views/CheckoutView.vue'), meta: { title: 'Оформлення замовлення' } },
  { path: '/order-success', name: 'order-success', component: () => import('./views/OrderSuccessView.vue'), meta: { title: 'Дякуємо за замовлення' } },
  { path: '/services', name: 'services', component: () => import('./views/ServicesView.vue'), meta: { title: 'Протруювання насіння', description: 'Професійне очищення та протруювання насіння мобільними комплексами безпосередньо у вашому господарстві.' } },
  { path: '/about', name: 'about', component: () => import('./views/AboutView.vue'), meta: { title: 'Про компанію', description: 'Комплексні рішення для агробізнесу: засоби захисту рослин, насіння, добрива, техніка та агрономічна підтримка.' } },
  { path: '/contacts', name: 'contacts', component: () => import('./views/ContactsView.vue'), meta: { title: 'Контакти', description: 'Телефон, адреса складу, графік роботи. Доставка по Україні та самовивіз.' } },

  { path: '/admin/login', name: 'admin-login', component: () => import('./views/admin/AdminLogin.vue'), meta: { title: 'Вхід в адмін-панель', admin: true } },
  {
    path: '/admin',
    component: () => import('./views/admin/AdminLayout.vue'),
    meta: { requiresAuth: true, admin: true },
    children: [
      { path: '', name: 'admin', component: () => import('./views/admin/AdminDashboard.vue'), meta: { title: 'Огляд' } },
      { path: 'products', name: 'admin-products', component: () => import('./views/admin/AdminProducts.vue'), meta: { title: 'Товари' } },
      { path: 'products/new', name: 'admin-product-new', component: () => import('./views/admin/AdminProductForm.vue'), meta: { title: 'Новий товар' } },
      { path: 'products/:id', name: 'admin-product-edit', component: () => import('./views/admin/AdminProductForm.vue'), meta: { title: 'Редагування товару' } },
      { path: 'categories', name: 'admin-categories', component: () => import('./views/admin/AdminCategories.vue'), meta: { title: 'Категорії' } },
      { path: 'collections', name: 'admin-collections', component: () => import('./views/admin/AdminCollections.vue'), meta: { title: 'Сезонні добірки' } },
      { path: 'articles', name: 'admin-articles', component: () => import('./views/admin/AdminArticles.vue'), meta: { title: 'Статті' } },
      { path: 'articles/new', name: 'admin-article-new', component: () => import('./views/admin/AdminArticleForm.vue'), meta: { title: 'Нова стаття' } },
      { path: 'articles/:id', name: 'admin-article-edit', component: () => import('./views/admin/AdminArticleForm.vue'), meta: { title: 'Редагування статті' } },
      { path: 'brands', name: 'admin-brands', component: () => import('./views/admin/AdminBrands.vue'), meta: { title: 'Виробники' } },
      { path: 'orders', name: 'admin-orders', component: () => import('./views/admin/AdminOrders.vue'), meta: { title: 'Замовлення' } },
      { path: 'requests', name: 'admin-requests', component: () => import('./views/admin/AdminRequests.vue'), meta: { title: 'Заявки' } },
    ],
  },

  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('./views/NotFoundView.vue'), meta: { title: 'Сторінку не знайдено' } },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, saved) {
    if (saved) return saved;
    // Зміна фільтрів у каталозі не повинна прокручувати сторінку вгору
    if (to.name === 'catalog' && from.name === 'catalog' && to.params.category === from.params.category) return false;
    return { top: 0 };
  },
});

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !useAuthStore().isLoggedIn) {
    return { name: 'admin-login', query: { redirect: to.fullPath } };
  }
});

// Заголовок і опис сторінки для Google. Сторінки товару, статті й категорії
// після завантаження даних встановлюють власні.
router.afterEach((to) => {
  if (to.meta.title || to.meta.seo) setSeo({ title: to.meta.title, description: to.meta.description });
});

export default router;
