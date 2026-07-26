import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { config } from '../config.js';
import { content } from '../content.js';

export const LEARNING_CONTENT_KEY = 'learning';

const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);

function deepMerge(base, override) {
  if (Array.isArray(base) && Array.isArray(override)) {
    return override;
  }

  if (base && typeof base === 'object' && override && typeof override === 'object') {
    const result = { ...base };
    for (const [key, value] of Object.entries(override)) {
      const baseValue = base[key];
      result[key] = deepMerge(baseValue, value);
    }
    return result;
  }

  return override ?? base;
}

export async function getLearningContent() {
  try {
    const { data, error } = await supabase
      .from('site_content')
      .select('payload, updated_at')
      .eq('content_key', LEARNING_CONTENT_KEY)
      .maybeSingle();

    if (error) throw error;
    if (!data?.payload || typeof data.payload !== 'object') return { ...content.learning, loadError: false };

    return { ...deepMerge(content.learning, data.payload), loadError: false };
  } catch (err) {
    console.error('Ошибка загрузки контента обучения:', err);
    return { ...content.learning, loadError: true };
  }
}

export async function saveLearningContent(payload) {
  const { error } = await supabase.from('site_content').upsert({
    content_key: LEARNING_CONTENT_KEY,
    payload,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
  return payload;
}
