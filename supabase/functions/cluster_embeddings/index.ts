import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import HDBSCAN from "https://esm.sh/hdbscanjs?target=deno";

const supabase = createClient(Deno.env.SUPABASE_URL, Deno.env.SUPABASE_SERVICE_ROLE_KEY);

serve(async () => {
  const { data, error } = await supabase.from("transactions")
    .select("id, description_embedding");
  if (error || !data) {
    return new Response(JSON.stringify({ error: error?.message }), { status: 500 });
  }

  const points = data.map(d => d.description_embedding as number[]);
  const clusterer = new HDBSCAN({ minClusterSize: 5, minSamples: 3 });
  const labels = clusterer.fit(points);

  const updates = data.map((d, i) => ({
    id: d.id,
    cluster: labels[i]
  }));
  await supabase.from("transactions")
    .upsert(updates, { onConflict: ["id"] });

  return new Response(JSON.stringify({ clusters: labels }), {
    headers: { "Content-Type": "application/json" }
  });
});
