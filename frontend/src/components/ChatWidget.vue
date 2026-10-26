<script setup>
import { nextTick, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { SHOP } from '@/config';
import { formatPrice } from '@/utils/format';
import { renderMarkdown } from '@/utils/markdown';
import { useAssistantStore } from '@/stores/assistant';
import { useCartStore } from '@/stores/cart';
import { useToastStore } from '@/stores/toast';
import AppIcon from './AppIcon.vue';
import ProductImage from './ProductImage.vue';

const assistant = useAssistantStore();
const cart = useCartStore();
const toast = useToastStore();
const router = useRouter();

const input = ref('');
const list = ref(null);
const field = ref(null);

const SUGGESTIONS = [
  'Чим обробити пшеницю від септоріозу?',
  "Гербіцид для соняшнику від бур'янів",
  'Скільки гліфосату потрібно на 50 га?',
  'Які у вас оптові знижки?',
];

onMounted(() => assistant.checkStatus());

function scrollToBottom() {
  nextTick(() => {
    if (list.value) list.value.scrollTop = list.value.scrollHeight;
  });
}

watch(() => assistant.open, (open) => {
  if (open) {
    scrollToBottom();
    nextTick(() => field.value?.focus());
  }
});
watch(() => [assistant.messages.length, assistant.messages.at(-1)?.text, assistant.activity], scrollToBottom);

function submit() {
  const text = input.value;
  input.value = '';
  assistant.send(text);
}

function onKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    submit();
  }
}

function addToCart(product) {
  cart.add(product);
  toast.success(`«${product.name}» додано в кошик`);
}

// Посилання всередині відповіді відкриваємо через роутер, без перезавантаження сторінки
function onContentClick(e) {
  const link = e.target.closest('a');
  const href = link?.getAttribute('href');
  if (href && href.startsWith('/') && !href.startsWith('//')) {
    e.preventDefault();
    router.push(href);
    if (window.innerWidth <= 760) assistant.open = false;
  }
}

function openProduct(slug) {
  router.push(`/product/${slug}`);
  if (window.innerWidth <= 760) assistant.open = false;
}
</script>

<template>
  <template v-if="assistant.enabled">
    <button
      v-show="!assistant.open"
      class="fab"
      type="button"
      aria-label="Відкрити AI-помічника"
      @click="assistant.open = true"
    >
      <AppIcon name="sparkles" :size="22" />
      <span class="fab__label">AI-помічник</span>
    </button>

    <Transition name="panel">
      <section v-if="assistant.open" class="panel" role="dialog" aria-label="AI-помічник">
        <header class="panel__head">
          <span class="panel__avatar"><AppIcon name="sparkles" :size="20" /></span>
          <div class="panel__title">
            <strong>AI-помічник</strong>
            <small>Підбір препаратів, норми, ціни</small>
          </div>
          <button
            v-if="assistant.messages.length"
            class="icon-btn"
            type="button"
            title="Нова розмова"
            :disabled="assistant.busy"
            @click="assistant.reset()"
          >
            <AppIcon name="pencil" :size="18" />
          </button>
          <button class="icon-btn" type="button" aria-label="Закрити" @click="assistant.open = false">
            <AppIcon name="x" :size="20" />
          </button>
        </header>

        <div ref="list" class="panel__body" @click="onContentClick">
          <div class="msg msg--assistant">
            <div class="bubble">
              Вітаю! Я AI-помічник магазину {{ SHOP.name }}. Допоможу підібрати засоби захисту, насіння
              чи добрива, порахую потрібну кількість на ваші гектари й підкажу ціни. Що вас цікавить?
            </div>
          </div>
          <div v-if="!assistant.messages.length" class="suggestions">
            <button v-for="s in SUGGESTIONS" :key="s" type="button" class="chip" @click="assistant.send(s)">{{ s }}</button>
          </div>

          <div v-for="(m, i) in assistant.messages" :key="i" class="msg" :class="`msg--${m.role}`">
            <div v-if="m.role === 'user'" class="bubble">{{ m.text }}</div>
            <template v-else>
              <!-- eslint-disable-next-line vue/no-v-html — HTML формується безпечним renderMarkdown -->
              <div v-if="m.text" class="bubble prose-chat" :class="{ 'bubble--error': m.error }" v-html="renderMarkdown(m.text)" />
              <div v-if="m.products.length" class="cards">
                <article v-for="p in m.products" :key="p.id" class="pcard">
                  <button class="pcard__img" type="button" :aria-label="p.name" @click="openProduct(p.slug)">
                    <ProductImage :src="p.image_url" :alt="p.name" :icon="p.category?.icon || 'sprout'" />
                  </button>
                  <div class="pcard__info">
                    <button class="pcard__name" type="button" @click="openProduct(p.slug)">{{ p.name }}</button>
                    <small v-if="p.packaging">{{ p.packaging }}</small>
                    <strong>{{ formatPrice(p.price) }}</strong>
                  </div>
                  <button class="pcard__add" type="button" :class="{ added: cart.has(p.id) }" :aria-label="`Додати ${p.name} в кошик`" @click="addToCart(p)">
                    <AppIcon :name="cart.has(p.id) ? 'check' : 'shopping-cart'" :size="18" />
                  </button>
                </article>
              </div>
            </template>
          </div>

          <div v-if="assistant.busy && assistant.activity" class="msg msg--assistant">
            <div class="bubble bubble--typing">
              <span class="dots"><i /><i /><i /></span>
              {{ assistant.activity }}
            </div>
          </div>
        </div>

        <form class="panel__form" @submit.prevent="submit">
          <textarea
            ref="field"
            v-model="input"
            rows="1"
            maxlength="1500"
            placeholder="Напишіть питання…"
            aria-label="Повідомлення"
            @keydown="onKeydown"
          />
          <button class="send" type="submit" :disabled="assistant.busy || !input.trim()" aria-label="Надіслати">
            <AppIcon name="arrow-right" :size="20" :stroke-width="2.2" />
          </button>
        </form>
        <p class="panel__note">
          Відповіді генерує штучний інтелект і можуть містити неточності. Перед застосуванням препаратів
          звіряйтеся з етикеткою. Телефон: <a :href="SHOP.phoneHref">{{ SHOP.phone }}</a>
        </p>
      </section>
    </Transition>
  </template>
</template>

<style scoped>
.fab {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 70;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  height: 56px;
  padding: 0 22px 0 18px;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(135deg, #2f6b3c, #1b3f25);
  color: #fff;
  font: 600 15px var(--font-body);
  box-shadow: 0 12px 30px -8px rgba(27, 63, 37, 0.55);
  cursor: pointer;
  transition: transform 0.2s var(--ease), box-shadow 0.2s;
}
.fab:hover { transform: translateY(-2px); box-shadow: 0 16px 34px -8px rgba(27, 63, 37, 0.6); }
.fab .icon { color: var(--c-accent); }

.panel {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 80;
  width: 400px;
  height: min(640px, calc(100vh - 48px));
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 22px;
  box-shadow: 0 24px 60px -12px rgba(24, 34, 26, 0.35), 0 0 0 1px var(--c-border);
  overflow: hidden;
}
.panel-enter-active,
.panel-leave-active { transition: opacity 0.2s, transform 0.25s var(--ease); }
.panel-enter-from,
.panel-leave-to { opacity: 0; transform: translateY(16px) scale(0.98); }

.panel__head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 14px 14px 18px;
  background: linear-gradient(135deg, #2f6b3c, #1b3f25);
  color: #fff;
}
.panel__avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.14);
  color: var(--c-accent);
}
.panel__title { flex: 1; display: flex; flex-direction: column; line-height: 1.25; }
.panel__title strong { font-family: var(--font-head); font-size: 16px; }
.panel__title small { color: rgba(255, 255, 255, 0.72); font-size: 12px; }
.icon-btn {
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: #fff;
  display: grid;
  place-items: center;
  cursor: pointer;
}
.icon-btn:hover { background: rgba(255, 255, 255, 0.14); }
.icon-btn:disabled { opacity: 0.4; cursor: default; }

.panel__body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: var(--c-bg);
}
.msg { display: flex; flex-direction: column; gap: 8px; }
.msg--user { align-items: flex-end; }
.bubble {
  max-width: 88%;
  padding: 10px 14px;
  border-radius: 16px;
  font-size: 14px;
  line-height: 1.55;
  word-wrap: break-word;
}
.msg--user .bubble {
  background: var(--c-primary);
  color: #fff;
  border-bottom-right-radius: 4px;
  white-space: pre-wrap;
}
.msg--assistant .bubble {
  background: #fff;
  color: var(--c-text);
  border: 1px solid var(--c-border);
  border-bottom-left-radius: 4px;
}
.bubble--error { border-color: #f1c4bf !important; background: var(--c-danger-light) !important; }
.bubble--typing { display: flex; align-items: center; gap: 10px; color: var(--c-muted); }
.dots { display: inline-flex; gap: 4px; }
.dots i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--c-primary);
  animation: blink 1.2s infinite both;
}
.dots i:nth-child(2) { animation-delay: 0.2s; }
.dots i:nth-child(3) { animation-delay: 0.4s; }
@keyframes blink { 0%, 80%, 100% { opacity: 0.25; } 40% { opacity: 1; } }

.prose-chat :deep(p) { margin: 0 0 0.6em; }
.prose-chat :deep(p:last-child) { margin-bottom: 0; }
.prose-chat :deep(ul),
.prose-chat :deep(ol) { margin: 0.3em 0 0.6em; padding-left: 1.2em; }
.prose-chat :deep(li) { margin-bottom: 0.2em; }
.prose-chat :deep(h2),
.prose-chat :deep(h3) { font-size: 15px; margin: 0.6em 0 0.3em; }
.prose-chat :deep(a) { text-decoration: underline; text-underline-offset: 2px; }

.suggestions { display: flex; flex-wrap: wrap; gap: 6px; }
.suggestions .chip { text-align: left; font-size: 13px; padding: 7px 12px; }

.cards { display: flex; flex-direction: column; gap: 8px; max-width: 92%; }
.pcard {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  background: #fff;
  border: 1px solid var(--c-border);
  border-radius: 14px;
}
.pcard__img {
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  padding: 0;
  border: 0;
  border-radius: 10px;
  overflow: hidden;
  background: #f6f7f3;
  cursor: pointer;
}
.pcard__info { flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.3; }
.pcard__name {
  padding: 0;
  border: 0;
  background: none;
  text-align: left;
  font: 600 13px var(--font-body);
  color: var(--c-text);
  cursor: pointer;
}
.pcard__name:hover { color: var(--c-primary); }
.pcard__info small { color: var(--c-muted); font-size: 12px; }
.pcard__info strong { font-family: var(--font-head); font-size: 14px; }
.pcard__add {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  border: 0;
  border-radius: 50%;
  background: var(--c-primary);
  color: #fff;
  display: grid;
  place-items: center;
  cursor: pointer;
}
.pcard__add.added { background: var(--c-primary-light); color: var(--c-primary-dark); }

.panel__form {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 12px 12px 6px;
  border-top: 1px solid var(--c-border);
}
.panel__form textarea {
  flex: 1;
  max-height: 120px;
  padding: 11px 14px;
  border: 1px solid var(--c-border);
  border-radius: 14px;
  resize: none;
  font: 400 14px/1.4 var(--font-body);
  field-sizing: content;
}
.panel__form textarea:focus { outline: none; border-color: var(--c-primary); box-shadow: 0 0 0 3px rgba(47, 107, 60, 0.12); }
.send {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border: 0;
  border-radius: 50%;
  background: var(--c-primary);
  color: #fff;
  display: grid;
  place-items: center;
  cursor: pointer;
}
.send:disabled { opacity: 0.4; cursor: default; }
.panel__note { margin: 0; padding: 0 14px 10px; font-size: 11px; color: var(--c-muted); line-height: 1.4; }

@media (max-width: 760px) {
  .fab {
    right: 14px;
    bottom: calc(76px + env(safe-area-inset-bottom));
    width: 52px;
    height: 52px;
    padding: 0;
    justify-content: center;
  }
  .fab__label { display: none; }
  .panel {
    inset: 0;
    width: auto;
    height: auto;
    border-radius: 0;
    z-index: 120;
  }
  .panel__form { padding-bottom: calc(6px + env(safe-area-inset-bottom)); }
}
</style>
