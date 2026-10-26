<script setup>
import { computed, watchEffect } from 'vue';
import { useRoute } from 'vue-router';
import AppHeader from './components/AppHeader.vue';
import AppFooter from './components/AppFooter.vue';
import MobileTabBar from './components/MobileTabBar.vue';
import ToastHost from './components/ToastHost.vue';
import ChatWidget from './components/ChatWidget.vue';

const route = useRoute();
const isAdmin = computed(() => route.meta.admin === true);

// В адмінці нижньої мобільної панелі немає — прибираємо відступ під неї
watchEffect(() => document.body.classList.toggle('no-tabbar', isAdmin.value));
</script>

<template>
  <template v-if="isAdmin">
    <RouterView />
  </template>
  <div v-else class="layout">
    <AppHeader />
    <main class="layout__main">
      <RouterView />
    </main>
    <AppFooter />
    <MobileTabBar />
    <ChatWidget />
  </div>
  <ToastHost />
</template>

<style scoped>
.layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.layout__main {
  flex: 1;
}
</style>
