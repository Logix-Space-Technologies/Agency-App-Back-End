const pool = require('../config/db');

exports.calculateMarketingSalary = async (req, res) => {
    try {
        const { staffId, calculationType, startDate, endDate } = req.body;

        if (!staffId) {
            return res.status(400).json({ error: 'Marketing staff ID is required.' });
        }

        let dateCondition = '';
        const queryParams = [staffId];

        switch (calculationType) {
            case 'daily':
                if (!startDate) return res.status(400).json({ error: 'Start date is required for daily calculation.' });
                dateCondition = ' AND DATE(s.sale_date) = ?';
                queryParams.push(startDate);
                break;
            case 'weekly':
            case 'monthly':
            case 'custom':
                if (!startDate || !endDate) return res.status(400).json({ error: 'Start and end dates are required for this calculation type.' });
                dateCondition = ' AND DATE(s.sale_date) BETWEEN ? AND ?';
                queryParams.push(startDate, endDate);
                break;
            case 'all':
                break; // No date condition
            default:
                return res.status(400).json({ error: 'Invalid calculation type.' });
        }

        let query = `
            SELECT
                s.sale_id,
                s.sale_date,
                s.quantity_sold,
                pp.commision_rate,
                p.product_name -- Assuming you have a product table and want to include the name
            FROM sales s
            JOIN product_prices pp ON s.price_id = pp.price_id
            -- Assuming a join to a products table
            LEFT JOIN products p ON pp.product_id = p.product_id 
            WHERE s.marketing_staff_id = ? AND s.isActive = 1 ${dateCondition}
            ORDER BY s.sale_date ASC
        `;

        const [sales] = await pool.query(query, queryParams);

        let totalCommission = 0;
        for (const sale of sales) {
            totalCommission += (sale.quantity_sold * sale.commision_rate);
        }

        res.json({
            staffId,
            totalCommission,
            sales,
            calculationType,
            startDate,
            endDate
        });

    } catch (error) {
        console.error('Error calculating marketing salary:', error);
        res.status(500).json({ error: 'Database error while calculating salary.' });
    }
};



exports.getAllMarketingStaff = async (req, res) => {
    try {
        const [staff] = await pool.query(
            'SELECT `user_id`, `profile_avathar`, `name`, `role`, `phone`, `email`, `password_hash`, `created_at`, `Place_Of_Allocation`, `isActive` FROM `users` WHERE role = ? AND isActive = 1',
            ['marketing_staff']
        );
        res.json(staff);
    } catch (error) {
        console.error('Error fetching marketing staff:', error);
        res.status(500).json({ error: 'Database error while fetching marketing staff.' });
    }
};