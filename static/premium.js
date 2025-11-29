// Premium Dashboard JavaScript
class PremiumDashboard {
    constructor() {
        this.currentBond = null;
        this.priceChart = null;
        this.allocationChart = null;
        this.technicalChart = null;
        this.currentData = null;
        this.currentTab = 'monitoring';
        this.currentPeriod = '24h';
        this.portfolioData = this.generatePortfolioData();
        this.changingPeriod = false;
        this.init();
    }

    init() {
        this.initializeTime();
        this.setupEventListeners();
        this.selectFirstBond();
        this.startAutoRefresh();
    }

    initializeTime() {
        const updateTime = () => {
            const now = new Date();
            const timeString = now.toLocaleTimeString('es-MX', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            const dateString = now.toLocaleDateString('es-MX', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            document.getElementById('currentTime').textContent = 
                `${dateString} - ${timeString}`;
        };
        
        updateTime();
        setInterval(updateTime, 1000);
    }

    setupEventListeners() {
        // Bond selection
        document.querySelectorAll('.bond-card-selector').forEach(card => {
            card.addEventListener('click', () => {
                this.selectBond(card.dataset.bond);
            });
        });

        // Refresh button
        document.getElementById('refreshData').addEventListener('click', () => {
            this.refreshData();
        });

        // Chart period buttons
        document.querySelectorAll('.chart-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const period = btn.dataset.period;
                this.changeChartPeriod(period);
            });
        });

        // Menu items
        document.querySelectorAll('.menu-item').forEach(item => {
            if (item.href && item.href.includes('/admin/users')) {
                return;
            }
            
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const tabName = item.dataset.tab;
                
                document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                this.showTab(tabName);
            });
        });

        // Technical indicator selector
        const techIndicator = document.getElementById('technicalIndicator');
        if (techIndicator) {
            techIndicator.addEventListener('change', (e) => {
                this.updateTechnicalChart(e.target.value);
            });
        }
    }

    async changeChartPeriod(period) {
        // Evitar múltiples llamadas rápidas
        if (this.changingPeriod) return;
        this.changingPeriod = true;

        // Update UI
        document.querySelectorAll('.chart-btn').forEach(b => {
            b.classList.remove('active');
            if (b.dataset.period === period) {
                b.classList.add('active');
            }
        });

        this.currentPeriod = period;
    
        if (this.currentBond) {
            await this.loadBondData(period);
        }
    
        this.showNotification(`Período cambiado a ${this.getPeriodDisplayName(period)}`);
    
        // Reset flag después de un delay
        setTimeout(() => {
            this.changingPeriod = false;
        }, 500);
    }

    getPeriodDisplayName(period) {
        const names = {
            '24h': '24 Horas',
            '7d': '7 Días', 
            '1m': '1 Mes'
        };
        return names[period] || period;
    }

    showTab(tabName) {
        this.currentTab = tabName;
        
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });
        
        const selectedPane = document.getElementById(`${tabName}-tab`);
        if (selectedPane) {
            selectedPane.classList.add('active');
        }
        
        const titles = {
            'monitoring': 'Monitoreo de Bonos en Tiempo Real',
            'portfolio': 'Mi Portafolio de Inversiones',
            'analysis': 'Análisis Avanzado y Herramientas'
        };
        
        document.getElementById('pageTitle').textContent = titles[tabName] || 'CMAX Dashboard';
        
        switch(tabName) {
            case 'portfolio':
                this.loadPortfolioData();
                break;
            case 'analysis':
                this.loadAnalysisData();
                break;
            case 'monitoring':
                if (this.currentBond) {
                    this.loadBondData();
                }
                break;
        }
        
        this.showNotification(`Cambiado a: ${titles[tabName]}`);
    }

    selectFirstBond() {
        const firstBond = document.querySelector('.bond-card-selector');
        if (firstBond) {
            this.selectBond(firstBond.dataset.bond);
        }
    }

    selectBond(bondId) {
        document.querySelectorAll('.bond-card-selector').forEach(card => {
            card.classList.remove('active');
        });
        document.querySelector(`[data-bond="${bondId}"]`).classList.add('active');
        
        this.currentBond = bondId;
        this.loadBondData();
    }

    async loadBondData(period = this.currentPeriod) {
        if (this.currentTab !== 'monitoring') return;
        
        this.showLoadingState();
        
        try {
            const response = await fetch(`/api/realtime/${this.currentBond}?period=${period}`);
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            this.currentData = data;
            this.updateDashboard(data);
            
        } catch (error) {
            console.error('Error loading bond data:', error);
            this.showErrorState(error.message);
        }
    }

    showLoadingState() {
        if (this.currentTab !== 'monitoring') return;
        
        const dashboardContent = document.getElementById('dashboardContent');
        dashboardContent.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-chart-line fa-spin"></i>
                <p>Cargando datos del bono...</p>
            </div>
        `;
    }

    showErrorState(message) {
        if (this.currentTab !== 'monitoring') return;
        
        const dashboardContent = document.getElementById('dashboardContent');
        dashboardContent.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error: ${message}</p>
                <button class="refresh-btn" onclick="dashboard.refreshData()">
                    <i class="fas fa-sync-alt"></i>
                    Reintentar
                </button>
            </div>
        `;
    }

    updateDashboard(data) {
        const template = document.getElementById('dashboardTemplate');
        const dashboardContent = document.getElementById('dashboardContent');
        dashboardContent.innerHTML = template.innerHTML;
        
        document.querySelectorAll('.chart-btn').forEach(b => {
            b.classList.remove('active');
            if (b.dataset.period === this.currentPeriod) {
                b.classList.add('active');
            }
        });
        
        this.updatePriceOverview(data);
        this.updateChart(data);
        this.updateRecommendation(data);
        this.updateMetrics(data);
        this.updateDetails(data);
        
        this.setupChartPeriodListeners();
    }

    setupChartPeriodListeners() {
        // Solo seleccionar botones de la sección de período del gráfico
        const periodSection = document.querySelector('.chart-period-selector');
        if (!periodSection) return;
    
        // Remover listeners anteriores
        periodSection.querySelectorAll('.chart-btn').forEach(btn => {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
        });
    
        // Añadir nuevos listeners
        periodSection.querySelectorAll('.chart-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const period = btn.dataset.period;
                this.changeChartPeriod(period);
            });
        });
    }

    updatePriceOverview(data) {
        const realtime = data.realtime_data;
        const bond = data.bond_info;
        
        document.getElementById('currentPrice').textContent = `$${realtime.current_price}`;
        
        const changeElement = document.getElementById('priceChange');
        const changeAmount = realtime.change;
        const changePercent = realtime.change_percent;
        
        const isPositive = changeAmount >= 0;
        changeElement.innerHTML = `
            <span class="change-amount ${isPositive ? 'positive' : 'negative'}">
                ${isPositive ? '+' : ''}${changeAmount}
            </span>
            <span class="change-percent ${isPositive ? 'positive' : 'negative'}">
                (${isPositive ? '+' : ''}${changePercent}%)
            </span>
        `;
        
        document.getElementById('faceValue').textContent = `$${bond.face_value}`;
        
        const currentYield = data.recommendation.metrics.current_yield;
        document.getElementById('currentYield').textContent = `${currentYield}%`;
        
        document.getElementById('maturityDate').textContent = 
            new Date(bond.maturity_date).toLocaleDateString('es-MX');
        document.getElementById('yearsToMaturity').textContent = 
            `${data.recommendation.metrics.years_to_maturity} años`;
        
        document.getElementById('priceTimestamp').textContent = 
            `Actualizado: ${new Date(realtime.timestamp).toLocaleTimeString('es-MX')}`;
    }

    
    updateChart(data) {
        const ctx = document.getElementById('priceChart');
        if (!ctx) return;
    
        // Destruir chart anterior si existe
        if (this.priceChart) {
            this.priceChart.destroy();
        }
    
        const realtime = data.realtime_data;
        const isPositive = realtime.change >= 0;
        const chartColor = isPositive ? '#4caf50' : '#f44336';
    
        // Actualizar título del gráfico (sin referencias a período)
        const chartHeader = document.querySelector('.chart-header h3');
        if (chartHeader) {
            chartHeader.innerHTML = `<i class="fas fa-chart-line"></i> Comportamiento del Bono`;
        }
    
        this.priceChart = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: realtime.history_24h.hours,
                datasets: [{
                    label: 'Precio del Bono',
                    data: realtime.history_24h.prices,
                    borderColor: chartColor,
                    backgroundColor: isPositive ? 
                        'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: chartColor,
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                return `Precio: $${context.parsed.y}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(0, 0, 0, 0.1)' },
                        ticks: { maxTicksLimit: 8 }
                    },
                    y: {
                        grid: { color: 'rgba(0, 0, 0, 0.1)' },
                        ticks: {
                            callback: function(value) {
                                return '$' + value;
                            }
                        }
                    }
                }
            }
        });
    }

    updateRecommendation(data) {
        const recommendation = data.recommendation;
        const recCard = document.getElementById('recommendationCard');
        const recTitle = document.getElementById('recTitle');
        const recDescription = document.getElementById('recDescription');
        const recBadge = document.getElementById('recBadge');
        
        let iconClass, badgeClass, badgeText;
        
        switch(recommendation.recommendation) {
            case 'VENDER':
                iconClass = 'fas fa-arrow-down';
                badgeClass = 'sell';
                badgeText = 'VENDER';
                break;
            case 'COMPRAR MÁS':
                iconClass = 'fas fa-arrow-up';
                badgeClass = 'buy';
                badgeText = 'COMPRAR';
                break;
            default:
                iconClass = 'fas fa-pause';
                badgeClass = 'hold';
                badgeText = 'MANTENER';
        }
        
        recCard.querySelector('.rec-icon i').className = iconClass;
        recTitle.textContent = recommendation.recommendation;
        recDescription.textContent = recommendation.reason;
        recBadge.className = `rec-badge ${badgeClass}`;
        recBadge.innerHTML = `<span>${badgeText}</span>`;
    }

    updateMetrics(data) {
        const metrics = data.recommendation.metrics;
        
        document.getElementById('metricYTM').textContent = `${metrics.ytm}%`;
        document.getElementById('metricPremium').textContent = `${metrics.premium_discount}%`;
        document.getElementById('metricTimeLeft').textContent = `${metrics.years_to_maturity} años`;
        
        const riskLevel = metrics.ytm > 7 ? 'ALTO' : metrics.ytm > 4 ? 'MEDIO' : 'BAJO';
        document.getElementById('metricRisk').textContent = riskLevel;
    }

    updateDetails(data) {
        const bond = data.bond_info;
        
        document.getElementById('detailISIN').textContent = bond.isin;
        document.getElementById('detailCoupon').textContent = `${bond.coupon_rate}%`;
        document.getElementById('detailEmission').textContent = 
            new Date(bond.emission_date).toLocaleDateString('es-MX');
        document.getElementById('detailCurrency').textContent = bond.currency;
        document.getElementById('detailUpdate').textContent = 
            new Date(data.realtime_data.timestamp).toLocaleString('es-MX');
    }

    // PORTFOLIO METHODS
    generatePortfolioData() {
        return {
            totalValue: 48750.00,
            totalInvestment: 45000.00,
            holdings: [
                {
                    bond: 'CMAX-2022-001',
                    name: 'Bono CMAX Corporativo 2022',
                    quantity: 50,
                    avgPrice: 950.00,
                    currentPrice: 975.50,
                    currentValue: 48775.00,
                    investment: 47500.00,
                    gainLoss: 1275.00,
                    yield: 4.72
                },
                {
                    bond: 'CMAX-2022-002',
                    name: 'Bono CMAX Verde 2022',
                    quantity: 25,
                    avgPrice: 960.00,
                    currentPrice: 962.75,
                    currentValue: 24068.75,
                    investment: 24000.00,
                    gainLoss: 68.75,
                    yield: 3.85
                }
            ]
        };
    }

    loadPortfolioData() {
        console.log('=== START loadPortfolioData ===');
        const data = this.portfolioData;
    
        // Solo actualizar UI, no modificar datos
        document.getElementById('totalPortfolioValue').textContent = `$${data.totalValue.toLocaleString()}`;
        document.getElementById('totalInvestment').textContent = `$${data.totalInvestment.toLocaleString()}`;
    
        const totalReturn = data.totalValue - data.totalInvestment;
        document.getElementById('totalReturn').textContent = `$${totalReturn.toLocaleString()}`;
        document.getElementById('totalReturn').className = totalReturn >= 0 ? 'position-positive' : 'position-negative';
    
        // CALCULAR YIELD PROMEDIO SIMPLE
        let avgYield = 0;
        if (data.holdings && data.holdings.length > 0) {
            const totalYield = data.holdings.reduce((sum, holding) => {
                return sum + (parseFloat(holding.yield) || 0);
            }, 0);
            avgYield = totalYield / data.holdings.length;
        }
        document.getElementById('avgYield').textContent = `${avgYield.toFixed(2)}%`;
        
        this.updateHoldingsTable(data.holdings);
        this.updateAllocationChart(data.holdings);
        console.log('=== END loadPortfolioData ===');
    }

    updateHoldingsTable(holdings) {
        const tbody = document.getElementById('holdingsTableBody');
        tbody.innerHTML = '';
        
        holdings.forEach(holding => {
            const row = document.createElement('tr');
            const gainLossClass = holding.gainLoss >= 0 ? 'position-positive' : 'position-negative';
            const gainLossSign = holding.gainLoss >= 0 ? '+' : '';
            
            row.innerHTML = `
                <td>
                    <strong>${holding.name}</strong><br>
                    <small class="text-muted">${holding.bond}</small>
                </td>
                <td>${holding.quantity.toLocaleString()}</td>
                <td>$${holding.avgPrice.toFixed(2)}</td>
                <td>$${holding.currentValue.toLocaleString()}</td>
                <td class="${gainLossClass}">
                    ${gainLossSign}$${holding.gainLoss.toLocaleString()}
                </td>
                <td>${holding.yield}%</td>
                <td>
                    <button class="btn-small" onclick="dashboard.viewBondDetails('${holding.bond}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-small" onclick="dashboard.tradeBond('${holding.bond}')">
                        <i class="fas fa-exchange-alt"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    updateAllocationChart(holdings) {
        const ctx = document.getElementById('allocationChart');
        if (!ctx) return;
        
        if (this.allocationChart) {
            this.allocationChart.destroy();
        }
        
        const colors = ['#1d6322', '#2e7d32', '#4caf50', '#81c784', '#a5d6a7'];
        
        this.allocationChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: holdings.map(h => h.name),
                datasets: [{
                    data: holdings.map(h => h.currentValue),
                    backgroundColor: colors,
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `$${value.toLocaleString()} (${percentage}%)`;
                            }
                        }
                    }
                },
                cutout: '60%'
            }
        });
        
        this.updateAllocationList(holdings);
    }

    updateAllocationList(holdings) {
        const list = document.getElementById('allocationList');
        if (!list) return;
        
        const total = holdings.reduce((sum, h) => sum + h.currentValue, 0);
        const colors = ['#1d6322', '#2e7d32', '#4caf50', '#81c784', '#a5d6a7'];
        
        list.innerHTML = holdings.map((holding, index) => {
            const percentage = ((holding.currentValue / total) * 100).toFixed(1);
            return `
                <div class="allocation-item">
                    <div class="allocation-color" style="background-color: ${colors[index]}"></div>
                    <span class="allocation-name">${holding.name}</span>
                    <span class="allocation-percentage">${percentage}%</span>
                </div>
            `;
        }).join('');
    }

    // ANALYSIS METHODS
    loadAnalysisData() {
        this.updateTechnicalChart('rsi');
        this.updateTechnicalIndicators();
    }

    updateTechnicalChart(indicator) {
        const ctx = document.getElementById('technicalChart');
        if (!ctx) return;
        
        if (this.technicalChart) {
            this.technicalChart.destroy();
        }
        
        const data = this.generateTechnicalData(indicator);
        
        this.technicalChart = new Chart(ctx, {
            type: 'line',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: indicator === 'rsi'
                    }
                }
            }
        });
    }

    generateTechnicalData(indicator) {
        const baseData = Array.from({length: 20}, (_, i) => 50 + Math.sin(i * 0.5) * 30);
        
        switch(indicator) {
            case 'rsi':
                return {
                    labels: Array.from({length: 20}, (_, i) => `D-${20-i}`),
                    datasets: [{
                        label: 'RSI (14)',
                        data: baseData.map(x => Math.min(Math.max(x, 0), 100)),
                        borderColor: '#ff6b6b',
                        backgroundColor: 'rgba(255, 107, 107, 0.1)',
                        borderWidth: 2,
                        fill: true
                    }]
                };
            case 'macd':
                return {
                    labels: Array.from({length: 20}, (_, i) => `D-${20-i}`),
                    datasets: [
                        {
                            label: 'MACD',
                            data: baseData.map(x => x - 50),
                            borderColor: '#1d6322',
                            borderWidth: 2
                        },
                        {
                            label: 'Señal',
                            data: baseData.map(x => (x - 50) * 0.8),
                            borderColor: '#ff9800',
                            borderWidth: 2
                        }
                    ]
                };
            default:
                return {
                    labels: Array.from({length: 20}, (_, i) => `D-${20-i}`),
                    datasets: [{
                        label: 'Precio',
                        data: baseData.map(x => x + 900),
                        borderColor: '#1d6322',
                        borderWidth: 2
                    }]
                };
        }
    }

    updateTechnicalIndicators() {
        const container = document.getElementById('techIndicators');
        if (!container) return;
        
        const indicators = [
            { name: 'RSI (14)', value: 58.3, status: 'neutral' },
            { name: 'MACD', value: 'Bullish', status: 'bullish' },
            { name: 'Media Móvil 50', value: 'Alcista', status: 'bullish' },
            { name: 'Volumen', value: 'Alto', status: 'neutral' },
            { name: 'Soporte', value: '$950', status: 'bullish' },
            { name: 'Resistencia', value: '$985', status: 'bearish' }
        ];
        
        container.innerHTML = indicators.map(ind => `
            <div class="tech-indicator">
                <span>${ind.name}</span>
                <span class="indicator-value ${ind.status}">${ind.value}</span>
            </div>
        `).join('');
    }

    // ANALYSIS TOOLS
    openCalculator() {
        this.showNotification('Calculadora de rentabilidad abierta');
    }

    openComparison() {
        this.showNotification('Análisis comparativo abierto');
    }

    openSimulator() {
        this.showNotification('Simulador de escenarios abierto');
    }

    viewBondDetails(bondId) {
    // Primero actualizar el sidebar
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.tab === 'monitoring') {
            item.classList.add('active');
        }
    });
    
    // Luego cambiar de tab
    this.showTab('monitoring');
    
    // Finalmente seleccionar el bono
    setTimeout(() => {
        this.selectBond(bondId);
    }, 100);
    }

    tradeBond(bondId) {
        // Aquí puedes implementar la lógica de compra/venta
        this.showNotification(`Iniciando operación con ${bondId}`);
    
        // Ejemplo: Abrir un modal de operación
        this.openTradeModal(bondId);
        }

    openTradeModal(bondId) {
        const currentPrice = this.getCurrentBondPrice(bondId);
        const bondName = this.getBondName(bondId);
        const currentHolding = this.portfolioData.holdings.find(h => h.bond === bondId);
    
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        `;
        
        modal.innerHTML = `
            <div style="background: white; padding: 30px; border-radius: 15px; width: 400px; max-width: 90%;">
                <h3 style="color: var(--cmax-primary); margin-bottom: 10px;">Operar con ${bondId}</h3>
                <p style="color: var(--text-secondary); margin-bottom: 20px; font-size: 0.9em;">${bondName}</p>

                ${currentHolding ? `
                <div style="background: var(--cmax-light); padding: 10px; border-radius: 8px; margin-bottom: 15px;">
                    <small>Tienes: ${currentHolding.quantity} unidades • Precio promedio: $${currentHolding.avgPrice.toFixed(2)}</small>
                </div>
                ` : ''}
                    
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 500;">Tipo de Operación:</label>
                    <select id="tradeType" style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 8px;">
                        <option value="buy">Comprar</option>
                        <option value="sell" ${!currentHolding ? 'disabled' : ''}>Vender</option>
                    </select>
                </div>
                    
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 500;">Cantidad:</label>
                    <input type="number" id="tradeQuantity" value="1" min="1" 
                           ${currentHolding ? `max="${currentHolding.quantity}"` : ''}
                           style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 8px;">
                </div>
                    
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 500;">Precio Actual:</label>
                    <div style="padding: 10px; background: var(--cmax-light); border-radius: 8px; font-weight: 600;">
                        $${currentPrice.toFixed(2)}
                    </div>
                </div>
                    
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button onclick="this.closest('div[style]').remove()" 
                            style="padding: 10px 20px; border: 1px solid var(--border); background: white; border-radius: 8px; cursor: pointer;">
                        Cancelar
                    </button>
                    <button onclick="dashboard.executeTrade('${bondId}')" 
                            style="padding: 10px 20px; background: var(--cmax-primary); color: white; border: none; border-radius: 8px; cursor: pointer;">
                        Confirmar Operación
                    </button>
                </div>
            </div>
        `;
                    
        document.body.appendChild(modal);
                    
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    executeTrade(bondId) {
        console.log('=== START executeTrade ===', bondId);
        
        const tradeType = document.getElementById('tradeType').value;
        const quantity = parseInt(document.getElementById('tradeQuantity').value);
        
        if (isNaN(quantity) || quantity <= 0) {
           this.showNotification('Error: Cantidad inválida');
            return;
        }
    
        // Encontrar el bono en el portafolio
        const bondIndex = this.portfolioData.holdings.findIndex(h => h.bond === bondId);
        
        if (tradeType === 'buy') {
            // Lógica para COMPRAR
            if (bondIndex !== -1) {
                // Ya existe en el portafolio - aumentar cantidad
                const holding = this.portfolioData.holdings[bondIndex];
                const currentPrice = this.getCurrentBondPrice(bondId);
                
                // Calcular nuevo precio promedio
                const totalInvestment = (holding.quantity * holding.avgPrice) + (quantity * currentPrice);
                const totalQuantity = holding.quantity + quantity;
                const newAvgPrice = totalInvestment / totalQuantity;
                
                // Actualizar holding
                holding.quantity = totalQuantity;
                holding.avgPrice = parseFloat(newAvgPrice.toFixed(2));
                holding.investment = parseFloat(totalInvestment.toFixed(2));
                
            } else {
                // Nuevo bono en el portafolio
                const currentPrice = this.getCurrentBondPrice(bondId);
                const newHolding = {
                    bond: bondId,
                    name: this.getBondName(bondId),
                    quantity: quantity,
                    avgPrice: currentPrice,
                    currentPrice: currentPrice,
                    currentValue: quantity * currentPrice,
                    investment: quantity * currentPrice,
                    gainLoss: 0,
                    yield: 0 // Inicialmente cero
                };
                this.portfolioData.holdings.push(newHolding);
            }
            
            this.showNotification(`Compra ejecutada: ${quantity} unidades de ${bondId}`);
            
        } else if (tradeType === 'sell') {
            // Lógica para VENDER
            if (bondIndex === -1) {
                this.showNotification('Error: No tienes este bono en tu portafolio');
                return;
        }
        
            const holding = this.portfolioData.holdings[bondIndex];
        
            if (quantity > holding.quantity) {
                this.showNotification(`Error: Solo tienes ${holding.quantity} unidades disponibles`);
                return;
            }

            if (quantity === holding.quantity) {
                // Vender todo - eliminar del portafolio
                this.portfolioData.holdings.splice(bondIndex, 1);
            } else {
                // Vender parcialmente - reducir cantidad
                holding.quantity -= quantity;
                holding.investment = holding.quantity * holding.avgPrice;
            }
            
            this.showNotification(`Venta ejecutada: ${quantity} unidades de ${bondId}`);
        }
    
        // Recalcular totales del portafolio (VERSIÓN SEGURA)
        this.safeRecalculatePortfolioTotals();
    
        // Cerrar modal
        const modal = document.querySelector('div[style*="position: fixed"]');
        if (modal) modal.remove();
        
        // Actualizar la vista del portafolio solo si estamos en esa pestaña
        if (this.currentTab === 'portfolio') {
            setTimeout(() => {
            this.loadPortfolioData();
            }, 100);
        }
        
        console.log('=== END executeTrade ===');
    }

    safeRecalculatePortfolioTotals() {
        console.log('=== START safeRecalculatePortfolioTotals ===');
    
        let totalValue = 0;
        let totalInvestment = 0;

        // Verificar que hay holdings
        if (!this.portfolioData.holdings || this.portfolioData.holdings.length === 0) {
            this.portfolioData.totalValue = 0;
            this.portfolioData.totalInvestment = 0;
            return;
        }
    
        this.portfolioData.holdings.forEach((holding, index) => {
            console.log(`Processing holding ${index}: ${holding.bond}`);
            
            // Solo procesar si los datos básicos existen
            if (holding.quantity && holding.avgPrice) {
                // Obtener precio actual
                const currentPrice = this.getCurrentBondPrice(holding.bond);
                holding.currentPrice = currentPrice;
                holding.currentValue = parseFloat((holding.quantity * currentPrice).toFixed(2));
                holding.investment = parseFloat((holding.quantity * holding.avgPrice).toFixed(2));
                holding.gainLoss = parseFloat((holding.currentValue - holding.investment).toFixed(2));
                
                // Calcular yield de manera segura
                if (holding.investment > 0) {
                    const yieldValue = (holding.gainLoss / holding.investment) * 100;
                    holding.yield = parseFloat(yieldValue.toFixed(2));
                } else {
                    holding.yield = 0;
                }
                
                totalValue += holding.currentValue;
                totalInvestment += holding.investment;
            }
        });
    
        this.portfolioData.totalValue = parseFloat(totalValue.toFixed(2));
        this.portfolioData.totalInvestment = parseFloat(totalInvestment.toFixed(2));
    
        console.log('Final totals - Value:', this.portfolioData.totalValue, 'Investment:', this.portfolioData.totalInvestment);
        console.log('=== END safeRecalculatePortfolioTotals ===');
    }


    // Método simulado para obtener precios actuales
    getCurrentBondPrice(bondId) {
        // En un caso real, esto vendría de tu API
        const mockPrices = {
            'CMAX-2022-001': 975.50,
            'CMAX-2022-002': 962.75,
            'CMAX-2023-001': 980.00,
            'CMAX-2023-002': 955.25
        };
        return mockPrices[bondId] || 950.00;
    }

   // Método para obtener nombre del bono
    getBondName(bondId) {
        const bondNames = {
            'CMAX-2022-001': 'Bono CMAX Corporativo 2022',
            'CMAX-2022-002': 'Bono CMAX Verde 2022', 
            'CMAX-2023-001': 'Bono CMAX Gobierno 2023',
            'CMAX-2023-002': 'Bono CMAX Infraestructura 2023'
        };
        return bondNames[bondId] || `Bono ${bondId}`;
    }

    calculateYield(bondId, currentPrice) {
        // Simulación más realista basada en el bono
        const baseYields = {
            'CMAX-2022-001': 4.5,
            'CMAX-2022-002': 3.8,
            'CMAX-2023-001': 4.2,
            'CMAX-2023-002': 4.0
        };
    
        const baseYield = baseYields[bondId] || 4.0;
        // Pequeña variación aleatoria
        const variation = (Math.random() - 0.5) * 0.5; // ±0.25%
        return parseFloat((baseYield + variation).toFixed(2));
    }

        refreshData() {
            if (this.currentTab === 'monitoring' && this.currentBond) {
                this.loadBondData(this.currentPeriod);
                this.showNotification(`Datos actualizados - ${this.getPeriodDisplayName(this.currentPeriod)}`);
            } else if (this.currentTab === 'portfolio') {
                this.loadPortfolioData();
                this.showNotification('Portafolio actualizado');
            } else if (this.currentTab === 'analysis') {
                this.loadAnalysisData();
                this.showNotification('Análisis actualizado');
            }
        }

        startAutoRefresh() {
            setInterval(() => {
                if (document.visibilityState === 'visible') {
                    this.refreshData();
                }
            }, 30000);
        }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--cmax-primary);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: var(--shadow);
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new PremiumDashboard();
    window.analysis = window.dashboard;
});

// Add animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    .fa-spin {
        animation: fa-spin 2s infinite linear;
    }
    
    @keyframes fa-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    .bond-card-selector, .price-card {
        transition: all 0.3s ease;
    }
    
    .price-card:hover {
        transform: translateY(-5px);
    }
    
    .btn-small {
        background: var(--cmax-primary);
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        margin: 0 2px;
    }
    
    .btn-small:hover {
        background: var(--cmax-secondary);
    }
    
    .text-muted {
        color: var(--text-light);
        font-size: 0.8em;
    }
`;
document.head.appendChild(style);

