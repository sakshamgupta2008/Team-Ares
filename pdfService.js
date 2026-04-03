import puppeteer from 'puppeteer';

/**
 * Generates a neon-branded PDF report for a city's health analysis.
 */
export async function generateHealthReportPDF(cityName, aiReasoning, cityData) {
    let browser;
    try {
        console.log(`[PDF] Starting generation for: ${cityName}`);
        browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();

        // Prepare clean data for display
        const drivers = cityData.ml_outputs?.top_3_drivers?.map(d => d.replace(/_/g, ' ')).join(', ') || 'General health factors';
        const intervention = cityData.simulation_state?.applied_intervention?.replace(/_/g, ' ') || 'Community health outreach';
        const riskScore = cityData.ml_outputs?.risk_score || 0;
        const riskLevel = cityData.ml_outputs?.risk_level?.replace(/_/g, ' ') || 'Unknown';
        const stateName = cityData.metadata?.state || 'N/A';

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=JetBrains+Mono:wght@400;500&display=swap');
            
            :root {
                --bg-void: #000000;
                --neon-cyan: #00f5ff;
                --neon-red: #ff1a3c;
                --neon-green: #00ff9d;
                --text-bright: #e8f4ff;
            }

            body {
                background-color: var(--bg-void);
                color: var(--text-bright);
                font-family: 'JetBrains Mono', monospace;
                padding: 40px;
                margin: 0;
            }

            .header {
                border-bottom: 2px solid var(--neon-cyan);
                padding-bottom: 20px;
                margin-bottom: 30px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            h1 {
                font-family: 'Syne', sans-serif;
                color: var(--neon-cyan);
                text-transform: uppercase;
                letter-spacing: 4px;
                margin: 0;
            }

            .risk-badge {
                padding: 10px 20px;
                border: 1px solid ${riskScore > 60 ? 'var(--neon-red)' : 'var(--neon-green)'};
                color: ${riskScore > 60 ? 'var(--neon-red)' : 'var(--neon-green)'};
                font-weight: bold;
                text-transform: uppercase;
                box-shadow: 0 0 10px ${riskScore > 60 ? 'rgba(255, 26, 60, 0.3)' : 'rgba(0, 255, 157, 0.3)'};
            }

            .section {
                margin-bottom: 30px;
                padding: 20px;
                background: rgba(0, 245, 255, 0.03);
                border: 1px solid rgba(0, 245, 255, 0.1);
            }

            .section-title {
                color: var(--neon-cyan);
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 2px;
                margin-bottom: 15px;
                display: flex;
                align-items: center;
            }

            .section-title::before {
                content: '';
                display: inline-block;
                width: 8px;
                height: 8px;
                background: var(--neon-cyan);
                margin-right: 10px;
            }

            .ai-text {
                line-height: 1.6;
                font-size: 14px;
                color: #a5f3fc;
            }

            .metric-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
            }

            .metric-item {
                border-left: 2px solid rgba(0, 245, 255, 0.2);
                padding-left: 15px;
            }

            .metric-label {
                font-size: 10px;
                color: #4a7090;
                text-transform: uppercase;
            }

            .metric-value {
                font-size: 16px;
                color: var(--neon-cyan);
                margin-top: 5px;
            }

            .footer {
                margin-top: 50px;
                font-size: 10px;
                color: #1a3a5c;
                text-align: center;
                border-top: 1px solid #0d2035;
                padding-top: 20px;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div>
                <h1>PreventiQ</h1>
                <div style="font-size: 12px; margin-top: 5px; color: #4a7090;">Predictive Health Analysis Report</div>
            </div>
            <div class="risk-badge">
                ${riskLevel} RISK: ${riskScore}%
            </div>
        </div>

        <div class="section">
            <div class="section-title">Location Context</div>
            <div class="metric-grid">
                <div class="metric-item">
                    <div class="metric-label">Region Type</div>
                    <div class="metric-value">${stateName === cityName ? 'State Level' : 'District Level'}</div>
                </div>
                <div class="metric-item">
                    <div class="metric-label">Parent State</div>
                    <div class="metric-value">${stateName}</div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">AI Contextual Reasoning</div>
            <div class="ai-text">
                ${aiReasoning.replace(/\*\*/g, '').replace(/\n/g, '<br>')}
            </div>
        </div>

        <div class="section">
            <div class="section-title">Critical Health Drivers</div>
            <div class="ai-text">
                Primary identified risk factors: <strong>${drivers}</strong>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Strategic Intervention</div>
            <div class="ai-text">
                Recommended simulation action: <strong>${intervention}</strong>
            </div>
        </div>

        <div class="footer">
            Generated by PreventiQ AI Engine &bull; Confidential Public Health Data &bull; ${new Date().toLocaleDateString()}
        </div>
    </body>
    </html>
    `;

    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
    });

    await browser.close();
    console.log(`[PDF] Success: ${cityName} report generated.`);
    return pdfBuffer;

    } catch (error) {
        console.error(`[PDF] Error generating PDF for ${cityName}:`, error);
        if (browser) await browser.close();
        throw error;
    }
}
