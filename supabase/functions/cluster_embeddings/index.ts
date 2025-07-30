import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

    // Инициализируем Supabase клиент с service role key для полного доступа
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables:', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseServiceKey
      });
      return new Response(JSON.stringify({ 
        error: 'Missing environment variables',
        details: 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Простая реализация HDBSCAN для кластеризации
class SimpleHDBSCAN {
  private minClusterSize: number;
  private minSamples: number;
  private epsilon: number;

  constructor({ minClusterSize = 5, minSamples = 3, epsilon = 0.5 } = {}) {
    this.minClusterSize = minClusterSize;
    this.minSamples = minSamples;
    this.epsilon = epsilon;
  }

  // Вычисляем евклидово расстояние между двумя точками
  private distance(a: number[], b: number[]): number {
    return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
  }

  // Находим соседей для точки в радиусе epsilon
  private findNeighbors(points: number[][], pointIndex: number): number[] {
    const neighbors: number[] = [];
    const point = points[pointIndex];
    
    for (let i = 0; i < points.length; i++) {
      if (i !== pointIndex && this.distance(point, points[i]) <= this.epsilon) {
        neighbors.push(i);
      }
    }
    
    return neighbors;
  }

  // Основной алгоритм кластеризации
  fit(points: number[][]): number[] {
    const n = points.length;
    const labels = new Array(n).fill(-1); // -1 означает шум
    let clusterId = 0;

    // Вычисляем количество соседей для каждой точки
    const neighborCounts = points.map((_, i) => this.findNeighbors(points, i).length);
    
    // Находим core points (точки с достаточным количеством соседей)
    const corePoints = neighborCounts.map((count, i) => count >= this.minSamples ? i : -1).filter(i => i !== -1);

    // Для каждой core point создаем кластер
    for (const corePoint of corePoints) {
      if (labels[corePoint] !== -1) continue; // Уже обработана

      // Создаем новый кластер
      const cluster = new Set<number>();
      const toProcess = [corePoint];
      
      while (toProcess.length > 0) {
        const current = toProcess.pop()!;
        
        if (labels[current] !== -1) continue;
        
        labels[current] = clusterId;
        cluster.add(current);
        
        // Добавляем соседей в обработку
        const neighbors = this.findNeighbors(points, current);
        for (const neighbor of neighbors) {
          if (labels[neighbor] === -1) {
            toProcess.push(neighbor);
          }
        }
      }
      
      // Проверяем минимальный размер кластера
      if (cluster.size >= this.minClusterSize) {
        clusterId++;
      } else {
        // Помечаем как шум
        for (const pointIndex of cluster) {
          labels[pointIndex] = -1;
        }
      }
    }

    return labels;
  }
}

serve(async (req) => {
  // Поддерживаем только POST запросы
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Получаем параметры из тела запроса
    const body = await req.json();
    const { minClusterSize = 5, minSamples = 3, epsilon = 0.5, test } = body;

    // Если это тестовый запрос, возвращаем информацию о доступности
    if (test) {
      return new Response(JSON.stringify({
        status: 'available',
        message: 'Edge Function is working',
        timestamp: new Date().toISOString()
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('Starting clustering with parameters:', { minClusterSize, minSamples, epsilon });

    // Загружаем транзакции с эмбеддингами
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('id, description_embedding')
      .not('description_embedding', 'is', null);

    if (error) {
      console.error('Error fetching transactions:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!transactions || transactions.length === 0) {
      return new Response(JSON.stringify({ message: 'No transactions with embeddings found' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`Processing ${transactions.length} transactions`);

    // Извлекаем эмбеддинги
    const embeddings = transactions.map(t => t.description_embedding as number[]);
    
    // Проверяем размерность эмбеддингов
    const dimension = embeddings[0]?.length;
    if (!dimension) {
      return new Response(JSON.stringify({ error: 'Invalid embedding format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`Embedding dimension: ${dimension}`);

    // Выполняем кластеризацию
    const clusterer = new SimpleHDBSCAN({ minClusterSize, minSamples, epsilon });
    const labels = clusterer.fit(embeddings);

    // Подсчитываем статистику кластеров
    const clusterStats = labels.reduce((acc, label) => {
      if (label >= 0) {
        acc[label] = (acc[label] || 0) + 1;
      }
      return acc;
    }, {} as Record<number, number>);

    const noiseCount = labels.filter(label => label === -1).length;
    const clusterCount = Object.keys(clusterStats).length;

    console.log(`Clustering completed: ${clusterCount} clusters, ${noiseCount} noise points`);

    // Обновляем транзакции с кластерами
    const updates = transactions.map((transaction, i) => ({
      id: transaction.id,
      cluster_id: labels[i] >= 0 ? labels[i] : null
    }));

    // Добавляем поле cluster_id в таблицу transactions, если его нет
    try {
      await supabase.rpc('add_cluster_column_if_not_exists');
    } catch (e) {
      // Игнорируем ошибку, если колонка уже существует
      console.log('Cluster column might already exist');
    }

    // Обновляем транзакции
    const { error: updateError } = await supabase
      .from('transactions')
      .upsert(updates, { onConflict: 'id' });

    if (updateError) {
      console.error('Error updating transactions:', updateError);
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Сохраняем информацию о кластерах в отдельную таблицу
    const clusterInfo = Object.entries(clusterStats).map(([clusterId, size]) => ({
      cluster_id: parseInt(clusterId),
      size,
      created_at: new Date().toISOString()
    }));

    if (clusterInfo.length > 0) {
      const { error: clusterError } = await supabase
        .from('transaction_clusters')
        .upsert(clusterInfo, { onConflict: 'cluster_id' });

      if (clusterError) {
        console.error('Error saving cluster info:', clusterError);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      clusters: clusterCount,
      noise: noiseCount,
      total: transactions.length,
      clusterStats,
      labels
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}); 