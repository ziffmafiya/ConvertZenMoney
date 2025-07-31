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
      case 'sync_existing_loans':
        return await syncExistingLoans(res);
      case 'get_loans_summary':
        return await getLoansSummary(res);
      default:
        return res.status(400).json({ error: 'Invalid action specified' });
    }
  } catch (error) {
    console.error('Sync Existing Loans API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

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