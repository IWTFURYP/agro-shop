<script setup>
import { useToastStore } from '@/stores/toast';
import AppIcon from './AppIcon.vue';

const toast = useToastStore();
</script>

<template>
  <div class="toasts" aria-live="polite">
    <TransitionGroup name="toast">
      <div
        v-for="t in toast.toasts"
        :key="t.id"
        class="toast"
        :class="`toast--${t.type}`"
        @click="toast.dismiss(t.id)"
      >
        <AppIcon :name="t.type === 'error' ? 'info' : 'check'" :size="18" class="toast__icon" />
        {{ t.message }}
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toasts {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: calc(100vw - 32px);
}
.toast {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 14px 18px;
  border-radius: var(--radius-sm);
  background: #fff;
  border-left: 4px solid var(--c-primary);
  box-shadow: var(--shadow-lg);
  font-size: 14px;
  cursor: pointer;
  min-width: 260px;
}
.toast--error { border-left-color: var(--c-danger); }
.toast__icon { color: var(--c-primary); }
.toast--error .toast__icon { color: var(--c-danger); }
@media (min-width: 761px) {
  .toasts { bottom: 96px; }
}
@media (max-width: 760px) {
  .toasts { bottom: calc(76px + env(safe-area-inset-bottom)); left: 16px; }
}
.toast-enter-active,
.toast-leave-active { transition: all 0.25s ease; }
.toast-enter-from,
.toast-leave-to { opacity: 0; transform: translateX(40px); }
</style>
