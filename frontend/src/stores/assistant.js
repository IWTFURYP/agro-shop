import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

const STORAGE_KEY = 'agro_assistant';

function load() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null') || {};
  } catch {
    return {};
  }
}

// Стан AI-помічника: відкрите вікно, історія повідомлень, потокова відповідь
export const useAssistantStore = defineStore('assistant', () => {
  const saved = load();
  const enabled = ref(false);
  const open = ref(false);
  const conversationId = ref(saved.conversationId || '');
  // { role: 'user' | 'assistant', text, products: [], error?: boolean }
  const messages = ref(Array.isArray(saved.messages) ? saved.messages : []);
  const busy = ref(false);
  const activity = ref('');

  watch(
    [conversationId, messages],
    () => {
      try {
        sessionStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ conversationId: conversationId.value, messages: messages.value }),
        );
      } catch {
        /* sessionStorage недоступний — історія просто не збережеться */
      }
    },
    { deep: true },
  );

  async function checkStatus() {
    try {
      const res = await fetch('/api/assistant/status');
      enabled.value = res.ok && (await res.json()).enabled === true;
    } catch {
      enabled.value = false;
    }
  }

  const TOOL_LABELS = {
    search_products: 'Шукаю в каталозі…',
    get_product: 'Дивлюся характеристики товару…',
    calculate_need: 'Рахую потрібну кількість…',
    show_products: 'Підбираю товари…',
    create_callback_request: 'Створюю заявку на дзвінок…',
  };

  function handleEvent(event, data, reply) {
    if (event === 'meta') conversationId.value = data.conversation_id;
    else if (event === 'text') {
      reply.text += data.delta;
      activity.value = '';
    } else if (event === 'tool') activity.value = TOOL_LABELS[data.name] || 'Працюю…';
    else if (event === 'products') reply.products.push(...data.items);
    else if (event === 'error') {
      reply.text += (reply.text ? '\n\n' : '') + data.message;
      reply.error = true;
    }
  }

  async function send(text) {
    const message = text.trim();
    if (!message || busy.value) return;
    messages.value.push({ role: 'user', text: message, products: [] });
    messages.value.push({ role: 'assistant', text: '', products: [] });
    const reply = messages.value[messages.value.length - 1];
    busy.value = true;
    activity.value = 'Думаю…';

    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify({ conversation_id: conversationId.value, message }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        if (data.fields?.conversation === 'limit') conversationId.value = '';
        throw new Error(data.error || 'Помічник тимчасово недоступний');
      }

      // Розбираємо потік Server-Sent Events: блоки "event: ...\ndata: ...\n\n"
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let index;
        while ((index = buffer.indexOf('\n\n')) !== -1) {
          const chunk = buffer.slice(0, index);
          buffer = buffer.slice(index + 2);
          let event = 'message';
          let data = '';
          for (const line of chunk.split('\n')) {
            if (line.startsWith('event: ')) event = line.slice(7);
            else if (line.startsWith('data: ')) data += line.slice(6);
          }
          if (data) handleEvent(event, JSON.parse(data), reply);
        }
      }
      if (!reply.text && !reply.products.length) throw new Error('Порожня відповідь. Спробуйте ще раз');
    } catch (err) {
      reply.text += (reply.text ? '\n\n' : '') + (err.message || "Немає з'єднання з сервером");
      reply.error = true;
    } finally {
      busy.value = false;
      activity.value = '';
    }
  }

  function reset() {
    conversationId.value = '';
    messages.value = [];
  }

  // Відкрити помічника з будь-якого місця сайту, за бажанням одразу з питанням
  function ask(question) {
    open.value = true;
    if (question) send(question);
  }

  return { enabled, open, conversationId, messages, busy, activity, checkStatus, send, reset, ask };
});
