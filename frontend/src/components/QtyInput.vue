<script setup>
const model = defineModel({ type: Number, default: 1 });
defineProps({ small: Boolean });

function set(value) {
  model.value = Math.max(1, Math.min(100000, Math.floor(Number(value)) || 1));
}
</script>

<template>
  <div class="qty" :class="{ 'qty--sm': small }">
    <button type="button" aria-label="Менше" :disabled="model <= 1" @click="set(model - 1)">−</button>
    <input
      :value="model"
      type="number"
      min="1"
      inputmode="numeric"
      aria-label="Кількість"
      @change="set($event.target.value)"
    />
    <button type="button" aria-label="Більше" @click="set(model + 1)">+</button>
  </div>
</template>

<style scoped>
.qty {
  display: inline-flex;
  align-items: center;
  border: 1.5px solid var(--c-border);
  border-radius: 999px;
  background: #fff;
  overflow: hidden;
}
.qty button {
  width: 42px;
  height: 44px;
  border: 0;
  background: transparent;
  font-size: 20px;
  color: var(--c-primary-dark);
  cursor: pointer;
}
.qty button:hover:not(:disabled) { background: var(--c-primary-light); }
.qty button:disabled { opacity: 0.35; cursor: default; }
.qty input {
  width: 56px;
  border: 0;
  text-align: center;
  font: 600 16px var(--font-body);
  -moz-appearance: textfield;
  appearance: textfield;
}
.qty input::-webkit-outer-spin-button,
.qty input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.qty input:focus { outline: none; }
.qty--sm button { width: 34px; height: 36px; font-size: 18px; }
.qty--sm input { width: 44px; font-size: 14px; }
</style>
