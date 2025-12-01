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
    /// Calculadora
    openCalculator() {
        this.showCalculatorModal();
    }

    showCalculatorModal() {
        const modal = document.createElement('div');
            modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: transparent;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            pointer-events: none;
        `;
        
        modal.innerHTML = `
            <div style="background: white; padding: 30px; border-radius: 15px; width: 500px; max-width: 90%; max-height: 90vh; overflow-y: auto; pointer-events: auto; box-shadow: 0 10px 40px rgba(0,0,0,0.3); border: 2px solid var(--cmax-primary);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                    <h3 style="color: var(--cmax-primary); margin: 0; display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-calculator"></i>
                        Calculadora de Rentabilidad
                    </h3>
                    <button onclick="this.closest('div[style]').parentElement.parentElement.remove()" 
                            style="background: none; border: none; font-size: 1.5em; cursor: pointer; color: var(--text-light);">
                        ×
                    </button>
                </div>

                <!-- FORMULARIO DE ENTRADA -->
                <div style="margin-bottom: 25px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: var(--text-primary);">Bono a Calcular</label>
                    <select id="calcBond" style="width: 100%; padding: 12px; border: 2px solid var(--border); border-radius: 8px; font-size: 1em;">
                        <option value="CMAX-2022-001">Bono CMAX Corporativo 2022 (4.5%)</option>
                        <option value="CMAX-2022-002">Bono CMAX Verde 2022 (3.8%)</option>
                    </select>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                    <div>
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: var(--text-primary);">Inversión ($)</label>
                        <input type="number" id="calcInvestment" value="10000" style="width: 100%; padding: 12px; border: 2px solid var(--border); border-radius: 8px; font-size: 1em;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: var(--text-primary);">Años</label>
                        <input type="number" id="calcYears" value="5" min="1" max="30" style="width: 100%; padding: 12px; border: 2px solid var(--border); border-radius: 8px; font-size: 1em;">
                    </div>
                </div>

                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: var(--text-primary);">Reinversión de Cupones</label>
                    <select id="calcReinvestment" style="width: 100%; padding: 12px; border: 2px solid var(--border); border-radius: 8px; font-size: 1em;">
                        <option value="no">No reinvertir</option>
                        <option value="yes" selected>Reinvertir a misma tasa</option>
                    </select>
                </div>

                <button onclick="dashboard.calculateReturns()" 
                        style="width: 100%; padding: 15px; background: var(--cmax-primary); color: white; border: none; border-radius: 8px; font-size: 1.1em; font-weight: 600; cursor: pointer; margin-bottom: 25px;">
                    <i class="fas fa-chart-line"></i>
                    Calcular Rentabilidad
                </button>

                <!-- RESULTADOS -->
                <div id="calcResults" style="display: none; background: var(--cmax-light); padding: 20px; border-radius: 10px; border-left: 4px solid var(--cmax-primary);">
                    <h4 style="color: var(--cmax-primary); margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-chart-bar"></i>
                        Resultados de la Inversión
                    </h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                        <div style="text-align: center;">
                            <div style="font-size: 0.9em; color: var(--text-secondary); margin-bottom: 5px;">Inversión Total</div>
                            <div style="font-size: 1.3em; font-weight: 700; color: var(--cmax-primary);" id="resultTotalInvestment">$0</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 0.9em; color: var(--text-secondary); margin-bottom: 5px;">Valor Final</div>
                            <div style="font-size: 1.3em; font-weight: 700; color: var(--success);" id="resultFinalValue">$0</div>
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div style="text-align: center;">
                            <div style="font-size: 0.9em; color: var(--text-secondary); margin-bottom: 5px;">Ganancia</div>
                            <div style="font-size: 1.2em; font-weight: 700; color: var(--success);" id="resultGain">$0</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 0.9em; color: var(--text-secondary); margin-bottom: 5px;">Rentabilidad Anual</div>
                            <div style="font-size: 1.2em; font-weight: 700; color: var(--cmax-primary);" id="resultAnnualReturn">0%</div>
                        </div>
                    </div>
                </div>

                <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid var(--warning);">
                    <p style="margin: 0; color: var(--text-secondary); font-size: 0.9em;">
                        <i class="fas fa-info-circle"></i>
                        Esta calculadora estima rendimientos basados en tasas cupón actuales. Los resultados son ilustrativos.
                    </p>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    // Método para calcular los rendimientos
    calculateReturns() {
        const bondSelect = document.getElementById('calcBond');
        const investment = parseFloat(document.getElementById('calcInvestment').value);
        const years = parseInt(document.getElementById('calcYears').value);
        const reinvestment = document.getElementById('calcReinvestment').value;
        
        if (!investment || investment <= 0) {
            this.showNotification('Ingresa una inversión válida');
            return;
        }
        
        // Tasas según el bono seleccionado
        const bondRates = {
            'CMAX-2022-001': 4.5,
            'CMAX-2022-002': 3.8
        };
        
        const rate = bondRates[bondSelect.value] || 4.0;
        const annualCoupon = investment * (rate / 100);
        
        let finalValue;
        if (reinvestment === 'yes') {
            // Con reinversión (interés compuesto)
            finalValue = investment * Math.pow(1 + (rate / 100), years);
        } else {
            // Sin reinversión (solo interés simple)
            finalValue = investment + (annualCoupon * years);
        }
        
        const totalGain = finalValue - investment;
        const annualReturn = (Math.pow(finalValue / investment, 1/years) - 1) * 100;
        
        // Mostrar resultados
        const resultsDiv = document.getElementById('calcResults');
        resultsDiv.style.display = 'block';
        
        document.getElementById('resultTotalInvestment').textContent = `$${investment.toLocaleString()}`;
        document.getElementById('resultFinalValue').textContent = `$${finalValue.toLocaleString(undefined, {maximumFractionDigits: 2})}`;
        document.getElementById('resultGain').textContent = `$${totalGain.toLocaleString(undefined, {maximumFractionDigits: 2})}`;
        document.getElementById('resultAnnualReturn').textContent = `${annualReturn.toFixed(2)}%`;
        
        this.showNotification('Cálculo completado');
    }

    // Analisis comparativo
    openComparison() {
        this.showComparisonModal();
    }

    showComparisonModal() {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: transparent;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            pointer-events: none;
        `;
        
        modal.innerHTML = `
            <div style="background: white; padding: 30px; border-radius: 15px; width: 700px; max-width: 95%; max-height: 90vh; overflow-y: auto; pointer-events: auto; box-shadow: 0 10px 40px rgba(0,0,0,0.3); border: 2px solid var(--cmax-primary);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                    <h3 style="color: var(--cmax-primary); margin: 0; display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-chart-bar"></i>
                        Análisis Comparativo de Bonos
                    </h3>
                    <button onclick="this.closest('div[style]').parentElement.parentElement.remove()" 
                            style="background: none; border: none; font-size: 1.5em; cursor: pointer; color: var(--text-light);">
                        ×
                    </button>
                </div>

                <!-- SELECTOR DE BONOS A COMPARAR -->
                <div style="margin-bottom: 25px;">
                    <label style="display: block; margin-bottom: 12px; font-weight: 600; color: var(--text-primary);">Seleccionar Bonos para Comparar</label>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div>
                            <label style="display: block; margin-bottom: 6px; font-weight: 500; color: var(--text-secondary);">Bono 1</label>
                            <select id="compareBond1" style="width: 100%; padding: 10px; border: 2px solid var(--border); border-radius: 8px; font-size: 1em;">
                                <option value="CMAX-2022-001">CMAX Corporativo 2022</option>
                                <option value="CMAX-2022-002">CMAX Verde 2022</option>
                            </select>
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 6px; font-weight: 500; color: var(--text-secondary);">Bono 2</label>
                            <select id="compareBond2" style="width: 100%; padding: 10px; border: 2px solid var(--border); border-radius: 8px; font-size: 1em;">
                                <option value="CMAX-2022-002">CMAX Verde 2022</option>
                                <option value="CMAX-2022-001">CMAX Corporativo 2022</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- PARÁMETROS DE COMPARACIÓN -->
                <div style="margin-bottom: 25px;">
                    <label style="display: block; margin-bottom: 12px; font-weight: 600; color: var(--text-primary);">Parámetros de Inversión</label>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div>
                            <label style="display: block; margin-bottom: 6px; font-weight: 500; color: var(--text-secondary);">Inversión ($)</label>
                            <input type="number" id="compareInvestment" value="10000" style="width: 100%; padding: 10px; border: 2px solid var(--border); border-radius: 8px; font-size: 1em;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 6px; font-weight: 500; color: var(--text-secondary);">Período (años)</label>
                            <input type="number" id="compareYears" value="5" min="1" max="30" style="width: 100%; padding: 10px; border: 2px solid var(--border); border-radius: 8px; font-size: 1em;">
                        </div>
                    </div>
                </div>

                <button onclick="dashboard.runComparison()" 
                        style="width: 100%; padding: 15px; background: var(--cmax-primary); color: white; border: none; border-radius: 8px; font-size: 1.1em; font-weight: 600; cursor: pointer; margin-bottom: 25px;">
                    <i class="fas fa-balance-scale"></i>
                    Comparar Bonos
                </button>

                <!-- RESULTADOS DE COMPARACIÓN -->
                <div id="compareResults" style="display: none;">
                    <h4 style="color: var(--cmax-primary); margin-bottom: 20px; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-chart-line"></i>
                        Resultados de la Comparación
                    </h4>

                    <!-- TABLA COMPARATIVA -->
                    <div style="overflow-x: auto; margin-bottom: 20px;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 0.95em;">
                            <thead>
                                <tr style="background: var(--cmax-light);">
                                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid var(--cmax-primary); color: var(--cmax-primary);">Métrica</th>
                                    <th style="padding: 12px; text-align: center; border-bottom: 2px solid var(--cmax-primary); color: var(--cmax-primary);" id="compareBond1Header">Bono 1</th>
                                    <th style="padding: 12px; text-align: center; border-bottom: 2px solid var(--cmax-primary); color: var(--cmax-primary);" id="compareBond2Header">Bono 2</th>
                                    <th style="padding: 12px; text-align: center; border-bottom: 2px solid var(--cmax-primary); color: var(--cmax-primary);">Diferencia</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr style="border-bottom: 1px solid var(--border);">
                                    <td style="padding: 12px; font-weight: 600;">Tasa Cupón</td>
                                    <td style="padding: 12px; text-align: center;" id="compareCoupon1">0%</td>
                                    <td style="padding: 12px; text-align: center;" id="compareCoupon2">0%</td>
                                    <td style="padding: 12px; text-align: center; font-weight: 600;" id="compareCouponDiff">0%</td>
                                </tr>
                                <tr style="border-bottom: 1px solid var(--border);">
                                    <td style="padding: 12px; font-weight: 600;">Valor Final</td>
                                    <td style="padding: 12px; text-align: center;" id="compareFinal1">$0</td>
                                    <td style="padding: 12px; text-align: center;" id="compareFinal2">$0</td>
                                    <td style="padding: 12px; text-align: center; font-weight: 600;" id="compareFinalDiff">$0</td>
                                </tr>
                                <tr style="border-bottom: 1px solid var(--border);">
                                    <td style="padding: 12px; font-weight: 600;">Ganancia Total</td>
                                    <td style="padding: 12px; text-align: center;" id="compareGain1">$0</td>
                                    <td style="padding: 12px; text-align: center;" id="compareGain2">$0</td>
                                    <td style="padding: 12px; text-align: center; font-weight: 600;" id="compareGainDiff">$0</td>
                                </tr>
                                <tr style="border-bottom: 1px solid var(--border);">
                                    <td style="padding: 12px; font-weight: 600;">Rentabilidad Anual</td>
                                    <td style="padding: 12px; text-align: center;" id="compareReturn1">0%</td>
                                    <td style="padding: 12px; text-align: center;" id="compareReturn2">0%</td>
                                    <td style="padding: 12px; text-align: center; font-weight: 600;" id="compareReturnDiff">0%</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- RECOMENDACIÓN -->
                    <div id="compareRecommendation" style="background: var(--cmax-light); padding: 20px; border-radius: 10px; border-left: 4px solid var(--cmax-primary);">
                        <h5 style="color: var(--cmax-primary); margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
                            <i class="fas fa-lightbulb"></i>
                            Recomendación
                        </h5>
                        <p style="margin: 0; color: var(--text-primary); font-size: 1em;" id="compareRecText">
                            Calculando recomendación...
                        </p>
                    </div>
                </div>

                <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid var(--warning);">
                    <p style="margin: 0; color: var(--text-secondary); font-size: 0.9em;">
                        <i class="fas fa-info-circle"></i>
                        Comparación basada en tasas cupón actuales y cálculo de interés compuesto.
                    </p>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    // Método para ejecutar la comparación
    runComparison() {
        const bond1 = document.getElementById('compareBond1').value;
        const bond2 = document.getElementById('compareBond2').value;
        const investment = parseFloat(document.getElementById('compareInvestment').value);
        const years = parseInt(document.getElementById('compareYears').value);
        
        if (bond1 === bond2) {
            this.showNotification('Selecciona dos bonos diferentes para comparar');
            return;
        }
        
        if (!investment || investment <= 0) {
            this.showNotification('Ingresa una inversión válida');
            return;
        }
        
        // Datos de los bonos
        const bondData = {
            'CMAX-2022-001': { name: 'CMAX Corporativo 2022', rate: 4.5 },
            'CMAX-2022-002': { name: 'CMAX Verde 2022', rate: 3.8 }
        };
        
        // Calcular rendimientos
        const rate1 = bondData[bond1].rate;
        const rate2 = bondData[bond2].rate;
        
        const final1 = investment * Math.pow(1 + (rate1 / 100), years);
        const final2 = investment * Math.pow(1 + (rate2 / 100), years);
        
        const gain1 = final1 - investment;
        const gain2 = final2 - investment;
        
        const return1 = (Math.pow(final1 / investment, 1/years) - 1) * 100;
        const return2 = (Math.pow(final2 / investment, 1/years) - 1) * 100;
        
        // Mostrar resultados
        const resultsDiv = document.getElementById('compareResults');
        resultsDiv.style.display = 'block';
        
        // Actualizar headers
        document.getElementById('compareBond1Header').textContent = bondData[bond1].name;
        document.getElementById('compareBond2Header').textContent = bondData[bond2].name;
        
        // Actualizar tabla
        document.getElementById('compareCoupon1').textContent = `${rate1}%`;
        document.getElementById('compareCoupon2').textContent = `${rate2}%`;
        document.getElementById('compareCouponDiff').textContent = `${(rate1 - rate2).toFixed(1)}%`;
        document.getElementById('compareCouponDiff').style.color = rate1 > rate2 ? 'var(--success)' : 'var(--danger)';
        
        document.getElementById('compareFinal1').textContent = `$${final1.toLocaleString(undefined, {maximumFractionDigits: 2})}`;
        document.getElementById('compareFinal2').textContent = `$${final2.toLocaleString(undefined, {maximumFractionDigits: 2})}`;
        document.getElementById('compareFinalDiff').textContent = `$${(final1 - final2).toLocaleString(undefined, {maximumFractionDigits: 2})}`;
        document.getElementById('compareFinalDiff').style.color = final1 > final2 ? 'var(--success)' : 'var(--danger)';
        
        document.getElementById('compareGain1').textContent = `$${gain1.toLocaleString(undefined, {maximumFractionDigits: 2})}`;
        document.getElementById('compareGain2').textContent = `$${gain2.toLocaleString(undefined, {maximumFractionDigits: 2})}`;
        document.getElementById('compareGainDiff').textContent = `$${(gain1 - gain2).toLocaleString(undefined, {maximumFractionDigits: 2})}`;
        document.getElementById('compareGainDiff').style.color = gain1 > gain2 ? 'var(--success)' : 'var(--danger)';
        
        document.getElementById('compareReturn1').textContent = `${return1.toFixed(2)}%`;
        document.getElementById('compareReturn2').textContent = `${return2.toFixed(2)}%`;
        document.getElementById('compareReturnDiff').textContent = `${(return1 - return2).toFixed(2)}%`;
        document.getElementById('compareReturnDiff').style.color = return1 > return2 ? 'var(--success)' : 'var(--danger)';
        
        // Generar recomendación
        let recommendation = '';
        if (return1 > return2) {
            recommendation = `<strong>Recomendación:</strong> El ${bondData[bond1].name} ofrece mejor rentabilidad (${return1.toFixed(2)}% vs ${return2.toFixed(2)}% anual). Considera invertir en este bono para maximizar tus rendimientos.`;
        } else if (return2 > return1) {
            recommendation = `<strong>Recomendación:</strong> El ${bondData[bond2].name} ofrece mejor rentabilidad (${return2.toFixed(2)}% vs ${return1.toFixed(2)}% anual). Considera invertir en este bono para maximizar tus rendimientos.`;
        } else {
            recommendation = `<strong>Recomendación:</strong> Ambos bonos ofrecen rentabilidad similar. Considera otros factores como el vencimiento o tu perfil de riesgo.`;
        }
        
        document.getElementById('compareRecText').innerHTML = recommendation;
        
        this.showNotification('Comparación completada');
    }

    // Simulador de Escenarios 
    openSimulator() {
        this.showSimulatorModal();
    }

    showSimulatorModal() {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: transparent;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            pointer-events: none;
        `;
        
        modal.innerHTML = `
            <div style="background: white; padding: 30px; border-radius: 15px; width: 800px; max-width: 95%; max-height: 90vh; overflow-y: auto; pointer-events: auto; box-shadow: 0 10px 40px rgba(0,0,0,0.3); border: 2px solid var(--cmax-primary);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                    <h3 style="color: var(--cmax-primary); margin: 0; display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-project-diagram"></i>
                        Simulador de Escenarios de Mercado
                    </h3>
                    <button onclick="this.closest('div[style]').parentElement.parentElement.remove()" 
                            style="background: none; border: none; font-size: 1.5em; cursor: pointer; color: var(--text-light);">
                        ×
                    </button>
                </div>

                <!-- CONFIGURACIÓN BASE -->
                <div style="margin-bottom: 25px;">
                    <h4 style="color: var(--cmax-primary); margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-cog"></i>
                        Configuración Base
                    </h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                        <div>
                            <label style="display: block; margin-bottom: 6px; font-weight: 500; color: var(--text-secondary);">Bono</label>
                            <select id="simBond" style="width: 100%; padding: 10px; border: 2px solid var(--border); border-radius: 8px; font-size: 1em;">
                                <option value="CMAX-2022-001">CMAX Corporativo 2022</option>
                                <option value="CMAX-2022-002">CMAX Verde 2022</option>
                            </select>
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 6px; font-weight: 500; color: var(--text-secondary);">Inversión ($)</label>
                            <input type="number" id="simInvestment" value="50000" style="width: 100%; padding: 10px; border: 2px solid var(--border); border-radius: 8px; font-size: 1em;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 6px; font-weight: 500; color: var(--text-secondary);">Período (años)</label>
                            <input type="number" id="simYears" value="10" min="1" max="30" style="width: 100%; padding: 10px; border: 2px solid var(--border); border-radius: 8px; font-size: 1em;">
                        </div>
                    </div>
                </div>

                <!-- ESCENARIOS -->
                <div style="margin-bottom: 25px;">
                    <h4 style="color: var(--cmax-primary); margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-chart-line"></i>
                        Escenarios de Mercado
                    </h4>

                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                        <!-- ESCENARIO OPTIMISTA -->
                        <div style="border: 2px solid var(--success); border-radius: 10px; padding: 15px; background: rgba(76, 175, 80, 0.05);">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
                                <i class="fas fa-arrow-up" style="color: var(--success);"></i>
                                <h5 style="margin: 0; color: var(--success); font-size: 1em;">Optimista</h5>
                            </div>
                            <div style="margin-bottom: 10px;">
                                <label style="display: block; margin-bottom: 4px; font-size: 0.85em; color: var(--text-secondary);">Tasa Promedio</label>
                                <input type="number" id="simRateOptimistic" value="5.5" step="0.1" style="width: 100%; padding: 8px; border: 1px solid var(--success); border-radius: 6px; font-size: 0.9em;">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 4px; font-size: 0.85em; color: var(--text-secondary);">Probabilidad</label>
                                <input type="number" id="simProbOptimistic" value="30" min="0" max="100" style="width: 100%; padding: 8px; border: 1px solid var(--success); border-radius: 6px; font-size: 0.9em;">
                            </div>
                        </div>

                        <!-- ESCENARIO BASE -->
                        <div style="border: 2px solid var(--warning); border-radius: 10px; padding: 15px; background: rgba(255, 152, 0, 0.05);">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
                                <i class="fas fa-minus" style="color: var(--warning);"></i>
                                <h5 style="margin: 0; color: var(--warning); font-size: 1em;">Base</h5>
                            </div>
                            <div style="margin-bottom: 10px;">
                                <label style="display: block; margin-bottom: 4px; font-size: 0.85em; color: var(--text-secondary);">Tasa Promedio</label>
                                <input type="number" id="simRateBase" value="4.5" step="0.1" style="width: 100%; padding: 8px; border: 1px solid var(--warning); border-radius: 6px; font-size: 0.9em;">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 4px; font-size: 0.85em; color: var(--text-secondary);">Probabilidad</label>
                                <input type="number" id="simProbBase" value="50" min="0" max="100" style="width: 100%; padding: 8px; border: 1px solid var(--warning); border-radius: 6px; font-size: 0.9em;">
                            </div>
                        </div>

                        <!-- ESCENARIO PESIMISTA -->
                        <div style="border: 2px solid var(--danger); border-radius: 10px; padding: 15px; background: rgba(244, 67, 54, 0.05);">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
                                <i class="fas fa-arrow-down" style="color: var(--danger);"></i>
                                <h5 style="margin: 0; color: var(--danger); font-size: 1em;">Pesimista</h5>
                            </div>
                            <div style="margin-bottom: 10px;">
                                <label style="display: block; margin-bottom: 4px; font-size: 0.85em; color: var(--text-secondary);">Tasa Promedio</label>
                                <input type="number" id="simRatePessimistic" value="3.5" step="0.1" style="width: 100%; padding: 8px; border: 1px solid var(--danger); border-radius: 6px; font-size: 0.9em;">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 4px; font-size: 0.85em; color: var(--text-secondary);">Probabilidad</label>
                                <input type="number" id="simProbPessimistic" value="20" min="0" max="100" style="width: 100%; padding: 8px; border: 1px solid var(--danger); border-radius: 6px; font-size: 0.9em;">
                            </div>
                        </div>
                    </div>

                    <div style="background: var(--cmax-light); padding: 12px; border-radius: 8px; text-align: center;">
                        <span style="font-size: 0.9em; color: var(--text-secondary);">
                            Probabilidad Total: <span id="simTotalProbability">100%</span>
                        </span>
                    </div>
                </div>

                <button onclick="dashboard.runSimulation()" 
                        style="width: 100%; padding: 15px; background: var(--cmax-primary); color: white; border: none; border-radius: 8px; font-size: 1.1em; font-weight: 600; cursor: pointer; margin-bottom: 25px;">
                    <i class="fas fa-play"></i>
                    Ejecutar Simulación
                </button>

                <!-- RESULTADOS DE SIMULACIÓN -->
                <div id="simResults" style="display: none;">
                    <h4 style="color: var(--cmax-primary); margin-bottom: 20px; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-chart-pie"></i>
                        Resultados de la Simulación
                    </h4>

                    <!-- RESUMEN ESTADÍSTICO -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                        <div style="background: var(--cmax-light); padding: 20px; border-radius: 10px; text-align: center; border-left: 4px solid var(--success);">
                            <div style="font-size: 0.9em; color: var(--text-secondary); margin-bottom: 8px;">Valor Esperado</div>
                            <div style="font-size: 1.4em; font-weight: 700; color: var(--cmax-primary);" id="simExpectedValue">$0</div>
                        </div>
                        <div style="background: var(--cmax-light); padding: 20px; border-radius: 10px; text-align: center; border-left: 4px solid var(--warning);">
                            <div style="font-size: 0.9em; color: var(--text-secondary); margin-bottom: 8px;">Mejor Escenario</div>
                            <div style="font-size: 1.4em; font-weight: 700; color: var(--success);" id="simBestCase">$0</div>
                        </div>
                        <div style="background: var(--cmax-light); padding: 20px; border-radius: 10px; text-align: center; border-left: 4px solid var(--danger);">
                            <div style="font-size: 0.9em; color: var(--text-secondary); margin-bottom: 8px;">Peor Escenario</div>
                            <div style="font-size: 1.4em; font-weight: 700; color: var(--danger);" id="simWorstCase">$0</div>
                        </div>
                    </div>

                    <!-- DETALLE POR ESCENARIO -->
                    <div style="overflow-x: auto; margin-bottom: 20px;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 0.95em;">
                            <thead>
                                <tr style="background: var(--cmax-light);">
                                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid var(--cmax-primary); color: var(--cmax-primary);">Escenario</th>
                                    <th style="padding: 12px; text-align: center; border-bottom: 2px solid var(--cmax-primary); color: var(--cmax-primary);">Probabilidad</th>
                                    <th style="padding: 12px; text-align: center; border-bottom: 2px solid var(--cmax-primary); color: var(--cmax-primary);">Tasa</th>
                                    <th style="padding: 12px; text-align: center; border-bottom: 2px solid var(--cmax-primary); color: var(--cmax-primary);">Valor Final</th>
                                    <th style="padding: 12px; text-align: center; border-bottom: 2px solid var(--cmax-primary); color: var(--cmax-primary);">Rentabilidad</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr style="border-bottom: 1px solid var(--border);">
                                    <td style="padding: 12px; font-weight: 600; color: var(--success);">Optimista</td>
                                    <td style="padding: 12px; text-align: center;" id="simDetailProbOpt">0%</td>
                                    <td style="padding: 12px; text-align: center;" id="simDetailRateOpt">0%</td>
                                    <td style="padding: 12px; text-align: center;" id="simDetailFinalOpt">$0</td>
                                    <td style="padding: 12px; text-align: center;" id="simDetailReturnOpt">0%</td>
                                </tr>
                                <tr style="border-bottom: 1px solid var(--border);">
                                    <td style="padding: 12px; font-weight: 600; color: var(--warning);">Base</td>
                                    <td style="padding: 12px; text-align: center;" id="simDetailProbBase">0%</td>
                                    <td style="padding: 12px; text-align: center;" id="simDetailRateBase">0%</td>
                                    <td style="padding: 12px; text-align: center;" id="simDetailFinalBase">$0</td>
                                    <td style="padding: 12px; text-align: center;" id="simDetailReturnBase">0%</td>
                                </tr>
                                <tr style="border-bottom: 1px solid var(--border);">
                                    <td style="padding: 12px; font-weight: 600; color: var(--danger);">Pesimista</td>
                                    <td style="padding: 12px; text-align: center;" id="simDetailProbPes">0%</td>
                                    <td style="padding: 12px; text-align: center;" id="simDetailRatePes">0%</td>
                                    <td style="padding: 12px; text-align: center;" id="simDetailFinalPes">$0</td>
                                    <td style="padding: 12px; text-align: center;" id="simDetailReturnPes">0%</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- ANÁLISIS DE RIESGO -->
                    <div style="background: var(--cmax-light); padding: 20px; border-radius: 10px; border-left: 4px solid var(--cmax-primary);">
                        <h5 style="color: var(--cmax-primary); margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
                            <i class="fas fa-shield-alt"></i>
                            Análisis de Riesgo
                        </h5>
                        <p style="margin: 0; color: var(--text-primary); font-size: 1em;" id="simRiskAnalysis">
                            Calculando análisis de riesgo...
                        </p>
                    </div>
                </div>

                <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid var(--warning);">
                    <p style="margin: 0; color: var(--text-secondary); font-size: 0.9em;">
                        <i class="fas fa-info-circle"></i>
                        Simulación Monte Carlo simplificada. Los resultados son estimaciones basadas en probabilidades asignadas.
                    </p>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.updateProbabilityTotal();
    }

    // Método para actualizar probabilidad total
    updateProbabilityTotal() {
        const probOpt = parseInt(document.getElementById('simProbOptimistic').value) || 0;
        const probBase = parseInt(document.getElementById('simProbBase').value) || 0;
        const probPes = parseInt(document.getElementById('simProbPessimistic').value) || 0;
        
        const total = probOpt + probBase + probPes;
        document.getElementById('simTotalProbability').textContent = `${total}%`;
        
        // Color según el total
        const totalElement = document.getElementById('simTotalProbability');
        if (total === 100) {
            totalElement.style.color = 'var(--success)';
            totalElement.style.fontWeight = '600';
        } else {
            totalElement.style.color = 'var(--danger)';
            totalElement.style.fontWeight = '600';
        }
    }

    // Método para ejecutar la simulación
    runSimulation() {
        const bond = document.getElementById('simBond').value;
        const investment = parseFloat(document.getElementById('simInvestment').value);
        const years = parseInt(document.getElementById('simYears').value);
        
        // Obtener tasas y probabilidades
        const rateOpt = parseFloat(document.getElementById('simRateOptimistic').value);
        const rateBase = parseFloat(document.getElementById('simRateBase').value);
        const ratePes = parseFloat(document.getElementById('simRatePessimistic').value);
        
        const probOpt = parseInt(document.getElementById('simProbOptimistic').value) / 100;
        const probBase = parseInt(document.getElementById('simProbBase').value) / 100;
        const probPes = parseInt(document.getElementById('simProbPessimistic').value) / 100;
        
        // Validar probabilidades
        const totalProb = (probOpt + probBase + probPes) * 100;
        if (Math.abs(totalProb - 100) > 1) {
            this.showNotification('La suma de probabilidades debe ser 100%');
            return;
        }
        
        if (!investment || investment <= 0) {
            this.showNotification('Ingresa una inversión válida');
            return;
        }
        
        // Calcular valores finales para cada escenario
        const finalOpt = investment * Math.pow(1 + (rateOpt / 100), years);
        const finalBase = investment * Math.pow(1 + (rateBase / 100), years);
        const finalPes = investment * Math.pow(1 + (ratePes / 100), years);
        
        // Calcular rentabilidades
        const returnOpt = (Math.pow(finalOpt / investment, 1/years) - 1) * 100;
        const returnBase = (Math.pow(finalBase / investment, 1/years) - 1) * 100;
        const returnPes = (Math.pow(finalPes / investment, 1/years) - 1) * 100;
        
        // Calcular valor esperado
        const expectedValue = (finalOpt * probOpt) + (finalBase * probBase) + (finalPes * probPes);
        
        // Mostrar resultados
        const resultsDiv = document.getElementById('simResults');
        resultsDiv.style.display = 'block';
        
        // Actualizar resumen
        document.getElementById('simExpectedValue').textContent = `$${expectedValue.toLocaleString(undefined, {maximumFractionDigits: 2})}`;
        document.getElementById('simBestCase').textContent = `$${finalOpt.toLocaleString(undefined, {maximumFractionDigits: 2})}`;
        document.getElementById('simWorstCase').textContent = `$${finalPes.toLocaleString(undefined, {maximumFractionDigits: 2})}`;
        
        // Actualizar tabla detallada
        document.getElementById('simDetailProbOpt').textContent = `${(probOpt * 100).toFixed(0)}%`;
        document.getElementById('simDetailRateOpt').textContent = `${rateOpt.toFixed(1)}%`;
        document.getElementById('simDetailFinalOpt').textContent = `$${finalOpt.toLocaleString(undefined, {maximumFractionDigits: 2})}`;
        document.getElementById('simDetailReturnOpt').textContent = `${returnOpt.toFixed(2)}%`;
        
        document.getElementById('simDetailProbBase').textContent = `${(probBase * 100).toFixed(0)}%`;
        document.getElementById('simDetailRateBase').textContent = `${rateBase.toFixed(1)}%`;
        document.getElementById('simDetailFinalBase').textContent = `$${finalBase.toLocaleString(undefined, {maximumFractionDigits: 2})}`;
        document.getElementById('simDetailReturnBase').textContent = `${returnBase.toFixed(2)}%`;
        
        document.getElementById('simDetailProbPes').textContent = `${(probPes * 100).toFixed(0)}%`;
        document.getElementById('simDetailRatePes').textContent = `${ratePes.toFixed(1)}%`;
        document.getElementById('simDetailFinalPes').textContent = `$${finalPes.toLocaleString(undefined, {maximumFractionDigits: 2})}`;
        document.getElementById('simDetailReturnPes').textContent = `${returnPes.toFixed(2)}%`;
        
        // Generar análisis de riesgo
        const riskPremium = finalOpt - finalPes;
        const riskAnalysis = this.generateRiskAnalysis(riskPremium, probPes, returnBase);
        document.getElementById('simRiskAnalysis').innerHTML = riskAnalysis;
        
        this.showNotification('Simulación completada');
    }

    // Método para generar análisis de riesgo
    generateRiskAnalysis(riskPremium, probPesimistic, baseReturn) {
        let analysis = '';
        
        if (riskPremium > 50000) {
            analysis += `🔴 <strong>Alto Riesgo:</strong> Gran dispersión entre escenarios ($${riskPremium.toLocaleString(undefined, {maximumFractionDigits: 0})}). `;
        } else if (riskPremium > 20000) {
            analysis += `🟡 <strong>Riesgo Moderado:</strong> Dispersión aceptable ($${riskPremium.toLocaleString(undefined, {maximumFractionDigits: 0})}). `;
        } else {
            analysis += `🟢 <strong>Bajo Riesgo:</strong> Escenarios bien agrupados ($${riskPremium.toLocaleString(undefined, {maximumFractionDigits: 0})}). `;
        }
        
        if (probPesimistic > 0.3) {
            analysis += `Alta probabilidad de escenario pesimista (${(probPesimistic * 100).toFixed(0)}%). `;
        }
        
        if (baseReturn > 6) {
            analysis += `Rentabilidad base atractiva (${baseReturn.toFixed(2)}% anual). `;
        }
        
        analysis += `Recomendación: ${riskPremium > 30000 ? 'Diversificar' : 'Inversión estable'}.`;
        
        return analysis;
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
        // Lógica de compra/venta
        this.showNotification(`Iniciando operación con ${bondId}`);
    
        // Abrir un modal de operación
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
                    <button id="cancelTradeBtn" 
                            style="padding: 10px 20px; border: 1px solid var(--border); background: white; border-radius: 8px; cursor: pointer;">
                        Cancelar
                    </button>
                    <button id="confirmTradeBtn" 
                            style="padding: 10px 20px; background: var(--cmax-primary); color: white; border: none; border-radius: 8px; cursor: pointer;">
                        Confirmar Operación
                    </button>
                </div>
            </div>
        `;
                    
        document.body.appendChild(modal);
                    
        // EVENT LISTENERS
        const cancelBtn = document.getElementById('cancelTradeBtn');
        const confirmBtn = document.getElementById('confirmTradeBtn');
                    
        // Cerrar
        cancelBtn.addEventListener('click', () => {
            modal.remove();
        });
        
        // Ejecutar operación con Confirmar
        confirmBtn.addEventListener('click', () => {
            this.executeTrade(bondId);
            modal.remove();
        });
        
        // Cerrar al hacer clic fuera del modal
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        // Prevenir que el clic dentro del modal lo cierre
        modal.querySelector('div').addEventListener('click', (e) => {
            e.stopPropagation();
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
                    yield: 0
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

        // Recalcular totales del portafolio
        this.safeRecalculatePortfolioTotals();

        // Actualizar la vista del portafolio
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

document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new PremiumDashboard();
    window.analysis = window.dashboard;
});


