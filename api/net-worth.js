import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // Устанавливаем CORS заголовки
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    switch (req.method) {
      case 'GET':
        return await handleGet(req, res);
      case 'POST':
        return await handlePost(req, res);
      case 'PUT':
        return await handlePut(req, res);
      case 'DELETE':
        return await handleDelete(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Net Worth API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Получение данных Net Worth
async function handleGet(req, res) {
  const { action } = req.query;

  try {
    switch (action) {
      case 'summary':
        return await getNetWorthSummary(res);
      case 'history':
        return await getNetWorthHistory(req, res);
      case 'assets':
        return await getAssets(res);
      case 'liabilities':
        return await getLiabilities(res);
      case 'detailed':
        return await getDetailedNetWorth(res);
      default:
        return await getDetailedNetWorth(res);
    }
  } catch (error) {
    console.error('Get Net Worth Error:', error);
    return res.status(500).json({ error: 'Failed to get net worth data' });
  }
}

// Получение сводки Net Worth
async function getNetWorthSummary(res) {
  const { data: assets, error: assetsError } = await supabase
    .from('assets')
    .select('value');

  const { data: liabilities, error: liabilitiesError } = await supabase
    .from('liabilities')
    .select('amount');

  if (assetsError || liabilitiesError) {
    throw new Error('Failed to fetch assets or liabilities');
  }

  const totalAssets = assets?.reduce((sum, asset) => sum + parseFloat(asset.value), 0) || 0;
  const totalLiabilities = liabilities?.reduce((sum, liability) => sum + parseFloat(liability.amount), 0) || 0;
  const netWorth = totalAssets - totalLiabilities;

  return res.status(200).json({
    totalAssets,
    totalLiabilities,
    netWorth,
    currency: 'UAH'
  });
}

// Получение истории Net Worth
async function getNetWorthHistory(req, res) {
  const { period = '6months' } = req.query;
  
  let dateFilter = new Date();
  switch (period) {
    case '1month':
      dateFilter.setMonth(dateFilter.getMonth() - 1);
      break;
    case '3months':
      dateFilter.setMonth(dateFilter.getMonth() - 3);
      break;
    case '6months':
      dateFilter.setMonth(dateFilter.getMonth() - 6);
      break;
    case '1year':
      dateFilter.setFullYear(dateFilter.getFullYear() - 1);
      break;
    default:
      dateFilter.setMonth(dateFilter.getMonth() - 6);
  }

  const { data, error } = await supabase
    .from('net_worth_history')
    .select('*')
    .gte('recorded_at', dateFilter.toISOString())
    .order('recorded_at', { ascending: true });

  if (error) {
    throw new Error('Failed to fetch net worth history');
  }

  return res.status(200).json(data || []);
}

// Получение активов
async function getAssets(res) {
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error('Failed to fetch assets');
  }

  return res.status(200).json(data || []);
}

// Получение обязательств
async function getLiabilities(res) {
  const { data, error } = await supabase
    .from('liabilities')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error('Failed to fetch liabilities');
  }

  return res.status(200).json(data || []);
}

// Получение детального Net Worth
async function getDetailedNetWorth(res) {
  const { data: assets, error: assetsError } = await supabase
    .from('assets')
    .select('*')
    .order('created_at', { ascending: false });

  const { data: liabilities, error: liabilitiesError } = await supabase
    .from('liabilities')
    .select('*')
    .order('created_at', { ascending: false });

  if (assetsError || liabilitiesError) {
    throw new Error('Failed to fetch assets or liabilities');
  }

  const totalAssets = assets?.reduce((sum, asset) => sum + parseFloat(asset.value), 0) || 0;
  const totalLiabilities = liabilities?.reduce((sum, liability) => sum + parseFloat(liability.amount), 0) || 0;
  const netWorth = totalAssets - totalLiabilities;

  // Группировка активов по типам
  const assetsByType = assets?.reduce((acc, asset) => {
    if (!acc[asset.type]) acc[asset.type] = [];
    acc[asset.type].push(asset);
    return acc;
  }, {}) || {};

  // Группировка обязательств по типам
  const liabilitiesByType = liabilities?.reduce((acc, liability) => {
    if (!acc[liability.type]) acc[liability.type] = [];
    acc[liability.type].push(liability);
    return acc;
  }, {}) || {};

  return res.status(200).json({
    summary: {
      totalAssets,
      totalLiabilities,
      netWorth,
      currency: 'UAH'
    },
    assets: {
      list: assets || [],
      byType: assetsByType
    },
    liabilities: {
      list: liabilities || [],
      byType: liabilitiesByType
    }
  });
}

// Добавление новых записей
async function handlePost(req, res) {
  const { type, data } = req.body;

  try {
    switch (type) {
      case 'asset':
        return await addAsset(data, res);
      case 'liability':
        return await addLiability(data, res);
      default:
        return res.status(400).json({ error: 'Invalid type specified' });
    }
  } catch (error) {
    console.error('Post Net Worth Error:', error);
    return res.status(500).json({ error: 'Failed to add record' });
  }
}

// Добавление актива
async function addAsset(data, res) {
  const { name, type, value, description } = data;

  if (!name || !type || !value) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const { data: asset, error } = await supabase
    .from('assets')
    .insert([{
      name,
      type,
      value: parseFloat(value),
      description
    }])
    .select()
    .single();

  if (error) {
    throw new Error('Failed to add asset');
  }

  // Обновляем историю Net Worth
  await updateNetWorthHistory();

  return res.status(201).json(asset);
}

// Добавление обязательства
async function addLiability(data, res) {
  const { name, type, amount, description } = data;

  if (!name || !type || !amount) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const { data: liability, error } = await supabase
    .from('liabilities')
    .insert([{
      name,
      type,
      amount: parseFloat(amount),
      description
    }])
    .select()
    .single();

  if (error) {
    throw new Error('Failed to add liability');
  }

  // Обновляем историю Net Worth
  await updateNetWorthHistory();

  return res.status(201).json(liability);
}

// Обновление записей
async function handlePut(req, res) {
  const { type, id, data } = req.body;

  try {
    switch (type) {
      case 'asset':
        return await updateAsset(id, data, res);
      case 'liability':
        return await updateLiability(id, data, res);
      default:
        return res.status(400).json({ error: 'Invalid type specified' });
    }
  } catch (error) {
    console.error('Put Net Worth Error:', error);
    return res.status(500).json({ error: 'Failed to update record' });
  }
}

// Обновление актива
async function updateAsset(id, data, res) {
  const { name, type, value, description } = data;

  const updateData = {};
  if (name) updateData.name = name;
  if (type) updateData.type = type;
  if (value) updateData.value = parseFloat(value);
  if (description !== undefined) updateData.description = description;
  updateData.last_updated = new Date().toISOString();

  const { data: asset, error } = await supabase
    .from('assets')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error('Failed to update asset');
  }

  // Обновляем историю Net Worth
  await updateNetWorthHistory();

  return res.status(200).json(asset);
}

// Обновление обязательства
async function updateLiability(id, data, res) {
  const { name, type, amount, description } = data;

  const updateData = {};
  if (name) updateData.name = name;
  if (type) updateData.type = type;
  if (amount) updateData.amount = parseFloat(amount);
  if (description !== undefined) updateData.description = description;
  updateData.last_updated = new Date().toISOString();

  const { data: liability, error } = await supabase
    .from('liabilities')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error('Failed to update liability');
  }

  // Обновляем историю Net Worth
  await updateNetWorthHistory();

  return res.status(200).json(liability);
}

// Удаление записей
async function handleDelete(req, res) {
  const { type, id } = req.query;

  try {
    switch (type) {
      case 'asset':
        return await deleteAsset(id, res);
      case 'liability':
        return await deleteLiability(id, res);
      default:
        return res.status(400).json({ error: 'Invalid type specified' });
    }
  } catch (error) {
    console.error('Delete Net Worth Error:', error);
    return res.status(500).json({ error: 'Failed to delete record' });
  }
}

// Удаление актива
async function deleteAsset(id, res) {
  const { error } = await supabase
    .from('assets')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error('Failed to delete asset');
  }

  // Обновляем историю Net Worth
  await updateNetWorthHistory();

  return res.status(200).json({ message: 'Asset deleted successfully' });
}

// Удаление обязательства
async function deleteLiability(id, res) {
  const { error } = await supabase
    .from('liabilities')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error('Failed to delete liability');
  }

  // Обновляем историю Net Worth
  await updateNetWorthHistory();

  return res.status(200).json({ message: 'Liability deleted successfully' });
}

// Обновление истории Net Worth
async function updateNetWorthHistory() {
  const { data: assets } = await supabase
    .from('assets')
    .select('value');

  const { data: liabilities } = await supabase
    .from('liabilities')
    .select('amount');

  const totalAssets = assets?.reduce((sum, asset) => sum + parseFloat(asset.value), 0) || 0;
  const totalLiabilities = liabilities?.reduce((sum, liability) => sum + parseFloat(liability.amount), 0) || 0;
  const netWorth = totalAssets - totalLiabilities;

  await supabase
    .from('net_worth_history')
    .insert([{
      total_assets: totalAssets,
      total_liabilities: totalLiabilities,
      net_worth: netWorth
    }]);
} 