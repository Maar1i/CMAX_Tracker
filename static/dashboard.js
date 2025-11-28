// Manejo del dashboard y análisis de bonos

document.addEventListener('DOMContentLoaded', function() {
    const analyzeButtons = document.querySelectorAll('.analyze-btn');
    const analysisModal = document.getElementById('bondAnalysisModal');
    const closeModal = document.querySelector('.close');
    const analysisContent = document.getElementById('analysisContent');

    analyzeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const bondId = this.getAttribute('data-bond');
            loadBondAnalysis(bondId);
        });
    });

    closeModal.addEventListener('click', function() {
        analysisModal.style.display = 'none';
    });

    window.addEventListener('click', function(e) {
        if (e.target === analysisModal) {
            analysisModal.style.display = 'none';
        }
    });

    function loadBondAnalysis(bondId) {
        fetch(`/api/bond/${bondId}`)
            .then(response => response.json())
            .then(data => {
                displayBondAnalysis(data, bondId);
                analysisModal.style.display = 'block';
            })
            .catch(error => {
                console.error('Error:', error);
            });
    }

    function displayBondAnalysis(data, bondId) {
        const bondInfo = data.bond_info;
        const history = data.history;
        const recommendation = data.recommendation;

        let html = `
            <div class="analysis-section">
                <h4>Información del Bono</h4>
                <div class="bond-info">
                    <p><strong>Nombre:</strong> ${bondInfo.name}</p>
                    <p><strong>ISIN:</strong> ${bondInfo.isin}</p>
                    <p><strong>Tasa Cupón:</strong> ${bondInfo.coupon_rate}%</p>
                    <p><strong>Valor Nominal:</strong> $${bondInfo.face_value} ${bondInfo.currency}</p>
                    <p><strong>Fecha Emisión:</strong> ${bondInfo.emission_date}</p>
                    <p><strong>Fecha Vencimiento:</strong> ${bondInfo.maturity_date}</p>
                </div>
            </div>

            <div class="analysis-section">
                <h4>Rendimiento Histórico (Hasta Nov 2022)</h4>
                <div class="chart-container">
                    <canvas id="priceChart"></canvas>
                </div>
            </div>

            <div class="analysis-section">
                <h4>Métricas Clave</h4>
                <div class="metrics-grid">
                    <div class="metric-card">
                        <div>Precio Actual</div>
                        <div class="metric-value">$${history.current_price}</div>
                    </div>
                    <div class="metric-card">
                        <div>Yield Actual</div>
                        <div class="metric-value">${recommendation.metrics.current_yield}%</div>
                    </div>
                    <div class="metric-card">
                        <div>YTM</div>
                        <div class="metric-value">${recommendation.metrics.ytm}%</div>
                    </div>
                    <div class="metric-card">
                        <div>Años al Vencimiento</div>
                        <div class="metric-value">${recommendation.metrics.years_to_maturity}</div>
                    </div>
                </div>
            </div>

            <div class="analysis-section">
                <h4>Recomendación</h4>
                <div class="recommendation ${recommendation.recommendation.toLowerCase()}">
                    <h3>${recommendation.recommendation}</h3>
                    <p>${recommendation.reason}</p>
                </div>
            </div>

            <div class="analysis-section">
                <h4>Análisis Técnico</h4>
                <p>Precio/Valor Nominal: ${recommendation.metrics.premium_discount}%</p>
                <p>Spread YTM vs Cupón: ${(recommendation.metrics.ytm - bondInfo.coupon_rate).toFixed(2)}%</p>
                <p>Fecha de análisis: 16 de Noviembre, 2022</p>
            </div>
        `;

        analysisContent.innerHTML = html;

        // Renderizar gráfico
        renderPriceChart(history.dates, history.prices);
    }

    function renderPriceChart(dates, prices) {
        const ctx = document.getElementById('priceChart').getContext('2d');
        
        // Simplificar datos para el gráfico (mostrar solo algunos puntos)
        const step = Math.floor(dates.length / 50);
        const simplifiedDates = dates.filter((_, index) => index % step === 0);
        const simplifiedPrices = prices.filter((_, index) => index % step === 0);

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: simplifiedDates,
                datasets: [{
                    label: 'Precio del Bono',
                    data: simplifiedPrices,
                    borderColor: '#1d6322',
                    backgroundColor: 'rgba(29, 99, 34, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Fecha'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Precio ($)'
                        }
                    }
                }
            }
        });
    }
});