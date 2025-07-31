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
    console.error('Net Worth Unified API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ===== ОСНОВНЫЕ ФУНКЦИИ NET WORTH =====

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

// ===== ОПЕРАЦИИ С ДАННЫМИ =====

// Добавление новых записей
async function handlePost(req, res) {
  const { action, type, data } = req.body;

  try {
    // Обработка синхронизации
    if (action) {
      switch (action) {
        case 'sync_existing_loans':
          return await syncExistingLoans(res);
        case 'get_loans_summary':
          return await getLoansSummary(res);
        case 'sync_loans':
          return await syncLoans(res);
        case 'sync_credit_cards':
          return await syncCreditCards(res);
        case 'sync_all':
          return await syncAll(res);
        default:
          return res.status(400).json({ error: 'Invalid action specified' });
      }
    }

    // Обработка добавления активов/обязательств
    if (type) {
      switch (type) {
        case 'asset':
          return await addAsset(data, res);
        case 'liability':
          return await addLiability(data, res);
        default:
          return res.status(400).json({ error: 'Invalid type specified' });
      }
    }

    return res.status(400).json({ error: 'Missing action or type parameter' });
  } catch (error) {
    console.error('Post Net Worth Error:', error);
    return res.status(500).json({ error: 'Failed to process request' });
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

// ===== СИНХРОНИЗАЦИЯ С СУЩЕСТВУЮЩИМИ ДАННЫМИ =====

// Синхронизация существующих кредитов с Net Worth
async function syncExistingLoans(res) {
  try {
    // Получаем все кредиты из существующей таблицы loans
    const { data: loans, error: loansError } = await supabase
      .from('loans')
      .select('*');

    if (loansError) {
      throw new Error('Failed to fetch existing loans');
    }

    if (!loans || loans.length === 0) {
      return res.status(200).json({
        message: 'No existing loans found',
        results: {
          added: 0,
          updated: 0,
          totalLoans: 0,
          totalDebt: 0
        }
      });
    }

    // Получаем существующие обязательства типа 'loan'
    const { data: existingLiabilities, error: liabilitiesError } = await supabase
      .from('liabilities')
      .select('*')
      .eq('type', 'loan');

    if (liabilitiesError) {
      throw new Error('Failed to fetch existing liabilities');
    }

    const results = {
      added: 0,
      updated: 0,
      errors: [],
      totalLoans: loans.length,
      totalDebt: 0
    };

    // Обрабатываем каждый кредит
    for (const loan of loans) {
      try {
        // Ищем существующее обязательство для этого кредита
        const existingLiability = existingLiabilities.find(l => 
          l.name.includes(`Кредит #${loan.id}`) || 
          l.description?.includes(`loan_id:${loan.id}`)
        );

        const liabilityData = {
          name: `Кредит #${loan.id}`,
          type: 'loan',
          amount: parseFloat(loan.remaining_balance),
          description: `Автоматически синхронизированный кредит. Основная сумма: ${loan.principal} грн, процентная ставка: ${loan.interest_rate}%, срок: ${loan.term_months} мес. Ежемесячный платеж: ${loan.monthly_payment} грн. loan_id:${loan.id}`
        };

        results.totalDebt += parseFloat(loan.remaining_balance);

        if (existingLiability) {
          // Обновляем существующее обязательство
          const { error: updateError } = await supabase
            .from('liabilities')
            .update({
              amount: liabilityData.amount,
              description: liabilityData.description,
              last_updated: new Date().toISOString()
            })
            .eq('id', existingLiability.id);

          if (updateError) {
            results.errors.push(`Failed to update liability for loan ${loan.id}: ${updateError.message}`);
          } else {
            results.updated++;
          }
        } else {
          // Создаем новое обязательство
          const { error: insertError } = await supabase
            .from('liabilities')
            .insert([liabilityData]);

          if (insertError) {
            results.errors.push(`Failed to create liability for loan ${loan.id}: ${insertError.message}`);
          } else {
            results.added++;
          }
        }
      } catch (error) {
        results.errors.push(`Error processing loan ${loan.id}: ${error.message}`);
      }
    }

    // Обновляем историю Net Worth
    await updateNetWorthHistory();

    return res.status(200).json({
      message: 'Existing loans synchronized successfully',
      results
    });

  } catch (error) {
    console.error('Sync existing loans error:', error);
    return res.status(500).json({ error: 'Failed to sync existing loans' });
  }
}

// Получение сводки по существующим кредитам
async function getLoansSummary(res) {
  try {
    const { data: loans, error: loansError } = await supabase
      .from('loans')
      .select('*');

    if (loansError) {
      throw new Error('Failed to fetch existing loans');
    }

    if (!loans || loans.length === 0) {
      return res.status(200).json({
        totalLoans: 0,
        totalDebt: 0,
        totalMonthlyPayments: 0,
        averageInterestRate: 0,
        loans: []
      });
    }

    const totalDebt = loans.reduce((sum, loan) => sum + parseFloat(loan.remaining_balance), 0);
    const totalMonthlyPayments = loans.reduce((sum, loan) => sum + parseFloat(loan.monthly_payment), 0);
    const averageInterestRate = loans.reduce((sum, loan) => sum + parseFloat(loan.interest_rate), 0) / loans.length;

    return res.status(200).json({
      totalLoans: loans.length,
      totalDebt,
      totalMonthlyPayments,
      averageInterestRate,
      loans: loans.map(loan => ({
        id: loan.id,
        principal: loan.principal,
        remaining_balance: loan.remaining_balance,
        monthly_payment: loan.monthly_payment,
        interest_rate: loan.interest_rate,
        term_months: loan.term_months,
        start_date: loan.start_date,
        paid_amount: loan.paid_amount || 0
      }))
    });

  } catch (error) {
    console.error('Get loans summary error:', error);
    return res.status(500).json({ error: 'Failed to get loans summary' });
  }
}

// Синхронизация кредитов с Net Worth
async function syncLoans(res) {
  try {
    // Получаем все кредиты
    const { data: loans, error: loansError } = await supabase
      .from('loans')
      .select('*');

    if (loansError) {
      throw new Error('Failed to fetch loans');
    }

    // Получаем существующие обязательства типа 'loan'
    const { data: existingLiabilities, error: liabilitiesError } = await supabase
      .from('liabilities')
      .select('*')
      .eq('type', 'loan');

    if (liabilitiesError) {
      throw new Error('Failed to fetch existing liabilities');
    }

    const results = {
      added: 0,
      updated: 0,
      errors: []
    };

    // Обрабатываем каждый кредит
    for (const loan of loans) {
      try {
        // Ищем существующее обязательство для этого кредита
        const existingLiability = existingLiabilities.find(l => 
          l.name.includes(`Кредит #${loan.id}`) || 
          l.description?.includes(`loan_id:${loan.id}`)
        );

        const liabilityData = {
          name: `Кредит #${loan.id}`,
          type: 'loan',
          amount: parseFloat(loan.remaining_balance),
          description: `Автоматически синхронизированный кредит. Основная сумма: ${loan.principal} грн, процентная ставка: ${loan.interest_rate}%, срок: ${loan.term_months} мес. loan_id:${loan.id}`
        };

        if (existingLiability) {
          // Обновляем существующее обязательство
          const { error: updateError } = await supabase
            .from('liabilities')
            .update({
              amount: liabilityData.amount,
              description: liabilityData.description,
              last_updated: new Date().toISOString()
            })
            .eq('id', existingLiability.id);

          if (updateError) {
            results.errors.push(`Failed to update liability for loan ${loan.id}: ${updateError.message}`);
          } else {
            results.updated++;
          }
        } else {
          // Создаем новое обязательство
          const { error: insertError } = await supabase
            .from('liabilities')
            .insert([liabilityData]);

          if (insertError) {
            results.errors.push(`Failed to create liability for loan ${loan.id}: ${insertError.message}`);
          } else {
            results.added++;
          }
        }
      } catch (error) {
        results.errors.push(`Error processing loan ${loan.id}: ${error.message}`);
      }
    }

    // Обновляем историю Net Worth
    await updateNetWorthHistory();

    return res.status(200).json({
      message: 'Loans synchronized successfully',
      results
    });

  } catch (error) {
    console.error('Sync loans error:', error);
    return res.status(500).json({ error: 'Failed to sync loans' });
  }
}

// Синхронизация кредитных карт с Net Worth
async function syncCreditCards(res) {
  try {
    // Получаем все кредитные карты
    const { data: creditCards, error: creditCardsError } = await supabase
      .from('credit_cards')
      .select('*');

    if (creditCardsError) {
      throw new Error('Failed to fetch credit cards');
    }

    // Получаем существующие обязательства типа 'credit_card'
    const { data: existingLiabilities, error: liabilitiesError } = await supabase
      .from('liabilities')
      .select('*')
      .eq('type', 'credit_card');

    if (liabilitiesError) {
      throw new Error('Failed to fetch existing liabilities');
    }

    const results = {
      added: 0,
      updated: 0,
      errors: []
    };

    // Обрабатываем каждую кредитную карту
    for (const card of creditCards) {
      try {
        // Ищем существующее обязательство для этой карты
        const existingLiability = existingLiabilities.find(l => 
          l.name.includes(card.card_name) || 
          l.description?.includes(`card_id:${card.id}`)
        );

        const liabilityData = {
          name: `Кредитная карта: ${card.card_name}`,
          type: 'credit_card',
          amount: parseFloat(card.unpaid_balance || 0),
          description: `Автоматически синхронизированная кредитная карта. Льготный период: ${card.grace_period_days} дн. card_id:${card.id}`
        };

        if (existingLiability) {
          // Обновляем существующее обязательство
          const { error: updateError } = await supabase
            .from('liabilities')
            .update({
              amount: liabilityData.amount,
              description: liabilityData.description,
              last_updated: new Date().toISOString()
            })
            .eq('id', existingLiability.id);

          if (updateError) {
            results.errors.push(`Failed to update liability for credit card ${card.id}: ${updateError.message}`);
          } else {
            results.updated++;
          }
        } else {
          // Создаем новое обязательство
          const { error: insertError } = await supabase
            .from('liabilities')
            .insert([liabilityData]);

          if (insertError) {
            results.errors.push(`Failed to create liability for credit card ${card.id}: ${insertError.message}`);
          } else {
            results.added++;
          }
        }
      } catch (error) {
        results.errors.push(`Error processing credit card ${card.id}: ${error.message}`);
      }
    }

    // Обновляем историю Net Worth
    await updateNetWorthHistory();

    return res.status(200).json({
      message: 'Credit cards synchronized successfully',
      results
    });

  } catch (error) {
    console.error('Sync credit cards error:', error);
    return res.status(500).json({ error: 'Failed to sync credit cards' });
  }
}

// Синхронизация всех данных
async function syncAll(res) {
  try {
    const loansResult = await syncLoansInternal();
    const creditCardsResult = await syncCreditCardsInternal();

    return res.status(200).json({
      message: 'All data synchronized successfully',
      loans: loansResult,
      creditCards: creditCardsResult
    });

  } catch (error) {
    console.error('Sync all error:', error);
    return res.status(500).json({ error: 'Failed to sync all data' });
  }
}

// Внутренняя функция синхронизации кредитов
async function syncLoansInternal() {
  const { data: loans, error: loansError } = await supabase
    .from('loans')
    .select('*');

  if (loansError) {
    throw new Error('Failed to fetch loans');
  }

  const { data: existingLiabilities, error: liabilitiesError } = await supabase
    .from('liabilities')
    .select('*')
    .eq('type', 'loan');

  if (liabilitiesError) {
    throw new Error('Failed to fetch existing liabilities');
  }

  const results = {
    added: 0,
    updated: 0,
    errors: []
  };

  for (const loan of loans) {
    try {
      const existingLiability = existingLiabilities.find(l => 
        l.name.includes(`Кредит #${loan.id}`) || 
        l.description?.includes(`loan_id:${loan.id}`)
      );

      const liabilityData = {
        name: `Кредит #${loan.id}`,
        type: 'loan',
        amount: parseFloat(loan.remaining_balance),
        description: `Автоматически синхронизированный кредит. Основная сумма: ${loan.principal} грн, процентная ставка: ${loan.interest_rate}%, срок: ${loan.term_months} мес. loan_id:${loan.id}`
      };

      if (existingLiability) {
        const { error: updateError } = await supabase
          .from('liabilities')
          .update({
            amount: liabilityData.amount,
            description: liabilityData.description,
            last_updated: new Date().toISOString()
          })
          .eq('id', existingLiability.id);

        if (updateError) {
          results.errors.push(`Failed to update liability for loan ${loan.id}: ${updateError.message}`);
        } else {
          results.updated++;
        }
      } else {
        const { error: insertError } = await supabase
          .from('liabilities')
          .insert([liabilityData]);

        if (insertError) {
          results.errors.push(`Failed to create liability for loan ${loan.id}: ${insertError.message}`);
        } else {
          results.added++;
        }
      }
    } catch (error) {
      results.errors.push(`Error processing loan ${loan.id}: ${error.message}`);
    }
  }

  return results;
}

// Внутренняя функция синхронизации кредитных карт
async function syncCreditCardsInternal() {
  const { data: creditCards, error: creditCardsError } = await supabase
    .from('credit_cards')
    .select('*');

  if (creditCardsError) {
    throw new Error('Failed to fetch credit cards');
  }

  const { data: existingLiabilities, error: liabilitiesError } = await supabase
    .from('liabilities')
    .select('*')
    .eq('type', 'credit_card');

  if (liabilitiesError) {
    throw new Error('Failed to fetch existing liabilities');
  }

  const results = {
    added: 0,
    updated: 0,
    errors: []
  };

  for (const card of creditCards) {
    try {
      const existingLiability = existingLiabilities.find(l => 
        l.name.includes(card.card_name) || 
        l.description?.includes(`card_id:${card.id}`)
      );

      const liabilityData = {
        name: `Кредитная карта: ${card.card_name}`,
        type: 'credit_card',
        amount: parseFloat(card.unpaid_balance || 0),
        description: `Автоматически синхронизированная кредитная карта. Льготный период: ${card.grace_period_days} дн. card_id:${card.id}`
      };

      if (existingLiability) {
        const { error: updateError } = await supabase
          .from('liabilities')
          .update({
            amount: liabilityData.amount,
            description: liabilityData.description,
            last_updated: new Date().toISOString()
          })
          .eq('id', existingLiability.id);

        if (updateError) {
          results.errors.push(`Failed to update liability for credit card ${card.id}: ${updateError.message}`);
        } else {
          results.updated++;
        }
      } else {
        const { error: insertError } = await supabase
          .from('liabilities')
          .insert([liabilityData]);

        if (insertError) {
          results.errors.push(`Failed to create liability for credit card ${card.id}: ${insertError.message}`);
        } else {
          results.added++;
        }
      }
    } catch (error) {
      results.errors.push(`Error processing credit card ${card.id}: ${error.message}`);
    }
  }

  return results;
}

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====

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