import { createClient } from '@supabase/supabase-js';
import GLPK from 'glpk.js';

const glpk = GLPK();

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { income, expenseCategories, savingsGoal } = req.body;

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Configuration error: Supabase URL or Anon Key not configured.');
        return res.status(500).json({ error: 'Supabase URL or Anon Key not configured' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        const lp = {
            name: 'budget',
            objective: {
                direction: glpk.GLP_MAX,
                name: 'savings',
                vars: [{ name: 'savings', coef: 1.0 }]
            },
            subjectTo: [
                {
                    name: 'incomeConstraint',
                    vars: [
                        { name: 'savings', coef: 1.0 },
                        ...expenseCategories.map(c => ({ name: c.name, coef: 1.0 }))
                    ],
                    bnds: { type: glpk.GLP_UP, ub: income, lb: 0 }
                }
            ],
            bounds: [
                { name: 'savings', type: glpk.GLP_LO, ub: 0, lb: savingsGoal },
                ...expenseCategories.map(c => ({ name: c.name, type: glpk.GLP_DB, ub: c.max, lb: c.min }))
            ],
            generals: ['savings', ...expenseCategories.map(c => c.name)]
        };

        const result = glpk.solve(lp);

        if (result.result.status !== glpk.GLP_OPT) {
            return res.status(400).json({ error: 'Could not find an optimal solution.' });
        }

        const optimizedSpending = {};
        for (const category of expenseCategories) {
            optimizedSpending[category.name] = result.result.vars[category.name];
        }

        const { data, error } = await supabase
            .from('optimized_budgets')
            .insert([
                {
                    income,
                    savings_goal: savingsGoal,
                    optimized_spending: optimizedSpending
                },
            ]);

        if (error) {
            console.error('Supabase insert error:', error);
            return res.status(500).json({ error: error.message });
        }

        res.status(200).json({ optimizedSpending });
    } catch (error) {
        console.error('Unhandled server error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
