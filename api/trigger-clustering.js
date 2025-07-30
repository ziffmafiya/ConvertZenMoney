import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export async function triggerCluster() {
  const start = performance.now();
  const res = await supabase.functions.invoke('cluster_embeddings');
  console.log('Clustering:', res.error ? 'failed' : 'success', 'took', performance.now() - start, 'ms');
  return res;
}
