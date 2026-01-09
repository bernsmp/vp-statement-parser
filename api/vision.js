export default async function handler(req, res) {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'API key not configured' });
    }

    try {
        const { images } = req.body;

        if (!images || !images.length) {
            return res.status(400).json({ error: 'No images provided' });
        }

        // Build content array with images
        const content = [];
        images.forEach((img) => {
            content.push({
                type: 'image',
                source: {
                    type: 'base64',
                    media_type: 'image/png',
                    data: img
                }
            });
        });

        content.push({
            type: 'text',
            text: `Extract all investment holdings from this brokerage statement. For each position, provide:
- Symbol (ticker)
- Description (fund/stock name)
- Security Type (Equity, ETF, Mutual Fund, or Bond)
- Quantity (number of shares)
- Price (per share)
- Market Value (total value)

Return the data in this exact format, one position per line:
SYMBOL | Description | Type | Quantity | Price | Market Value

Example:
AAPL | Apple Inc | Equity | 100.0000 | 175.50 | 17550.00
VTI | Vanguard Total Stock Market ETF | ETF | 50.0000 | 220.30 | 11015.00
VFIAX | Vanguard 500 Index Fund | Mutual Fund | 25.0000 | 400.00 | 10000.00

Security Type Guidelines:
- Equity: Individual stocks (AAPL, GOOGL, AMZN, BTI, UPST, etc.)
- ETF: Exchange-traded funds (SPY, QQQ, SPMO, QYLD, QQQM, etc.)
- Mutual Fund: Mutual funds, often 5-letter symbols ending in X (VFIAX, TRMVX, SELCX, etc.)
- Bond: Fixed income securities
- Closed-End Fund: Funds like PDI, PIMCO funds

Important:
- Include ALL positions you can see
- Use the exact numbers from the statement
- Don't include totals or summary rows
- For mutual funds, include the full fund name`
        });

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 4096,
                messages: [{
                    role: 'user',
                    content: content
                }]
            })
        });

        if (!response.ok) {
            const error = await response.json();
            return res.status(response.status).json({ error: error.error?.message || 'API request failed' });
        }

        const data = await response.json();
        return res.status(200).json(data);

    } catch (error) {
        console.error('Vision API error:', error);
        return res.status(500).json({ error: error.message });
    }
}
