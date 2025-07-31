import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // Устанавливаем CORS заголовки
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action } = req.body;

    switch (action) {
      case 'sync_loans':
        return await syncLoans(res);
      case 'sync_credit_cards':
        return await syncCreditCards(res);
      case 'sync_all':
        return await syncAll(res);
      default:
        return res.status(400).json({ error: 'Invalid action specified' });
    }
  } catch (error) {
    console.error('Sync Net Worth API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
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