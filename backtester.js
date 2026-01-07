let candleData = [];
let backtestResults = null;

// File upload handling
document.getElementById('csvFile').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            parseCSV(event.target.result);
            document.getElementById('fileStatus').textContent = `✓ ${file.name} loaded (${candleData.length.toLocaleString()} candles)`;
            document.getElementById('fileStatus').classList.add('loaded');
            document.getElementById('uploadSection').classList.add('loaded');
            document.getElementById('runButton').disabled = false;
        };
        reader.readAsText(file);
    }
});

// Parse CSV data
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    
    candleData = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        
        const candle = {
            time: values[0],
            timestamp: new Date(values[0]),
            open: parseFloat(values[1]),
            high: parseFloat(values[2]),
            low: parseFloat(values[3]),
            close: parseFloat(values[4]),
            ema3: parseFloat(values[5]) || null,
            ema5: parseFloat(values[6]) || null,
            ema8: parseFloat(values[7]) || null,
            ema13: parseFloat(values[8]) || null,
            ema21: parseFloat(values[9]) || null
        };
        
        candleData.push(candle);
    }
    
    console.log(`Loaded ${candleData.length} candles`);
}

// UI update functions
function updateTPInputs() {
    const tpType = document.getElementById('tpType').value;
    document.getElementById('tpMidInputs').style.display = tpType === 'mid_ema' ? 'flex' : 'none';
    document.getElementById('tpFixedInput').style.display = tpType === 'fixed' ? 'block' : 'none';
    document.getElementById('tpCrossInput').style.display = tpType === 'ema_cross' ? 'block' : 'none';
}

function updateSLInputs() {
    const slType = document.getElementById('slType').value;
    document.getElementById('slNthInput').style.display = slType === 'nth_low' ? 'block' : 'none';
    document.getElementById('slFixedInput').style.display = slType === 'fixed' ? 'block' : 'none';
    document.getElementById('slEmaInput').style.display = slType === 'ema_level' ? 'block' : 'none';
}

// Preset configurations
function loadPreset(name) {
    switch(name) {
        case '9below3ema':
            document.getElementById('consecutiveCount').value = 9;
            document.getElementById('pricePoint').value = 'high';
            document.getElementById('relation').value = 'below';
            document.getElementById('ema').value = 'ema3';
            document.getElementById('requireStack').checked = false;
            document.getElementById('firstHour').checked = false;
            document.getElementById('entryTiming').value = 'next_open';
            document.getElementById('tpType').value = 'mid_ema';
            document.getElementById('tpEma1').value = 'ema3';
            document.getElementById('tpEma2').value = 'ema5';
            document.getElementById('slType').value = 'nth_low';
            document.getElementById('slLookback').value = 10;
            document.getElementById('eodExit').value = '16:00';
            break;
        case 'pullback8':
            document.getElementById('consecutiveCount').value = 1;
            document.getElementById('pricePoint').value = 'low';
            document.getElementById('relation').value = 'below';
            document.getElementById('ema').value = 'ema8';
            document.getElementById('requireStack').checked = true;
            document.getElementById('firstHour').checked = false;
            document.getElementById('tpType').value = 'fixed';
            document.getElementById('tpPoints').value = 15;
            document.getElementById('slType').value = 'ema_level';
            document.getElementById('slEma').value = 'ema21';
            break;
        case 'emastack':
            document.getElementById('consecutiveCount').value = 1;
            document.getElementById('pricePoint').value = 'close';
            document.getElementById('relation').value = 'above';
            document.getElementById('ema').value = 'ema21';
            document.getElementById('requireStack').checked = true;
            document.getElementById('firstHour').checked = true;
            document.getElementById('tpType').value = 'mid_ema';
            document.getElementById('tpEma1').value = 'ema3';
            document.getElementById('tpEma2').value = 'ema8';
            document.getElementById('slType').value = 'nth_low';
            document.getElementById('slLookback').value = 5;
            break;
        case 'custom':
            document.getElementById('consecutiveCount').value = 1;
            document.getElementById('requireStack').checked = false;
            document.getElementById('firstHour').checked = false;
            break;
    }
    
    updateTPInputs();
    updateSLInputs();
}

// Main backtest function
function runBacktest() {
    if (candleData.length === 0) {
        alert('Please upload a CSV file first');
        return;
    }
    
    const consecutiveCount = parseInt(document.getElementById('consecutiveCount').value);
    const pricePoint = document.getElementById('pricePoint').value;
    const relation = document.getElementById('relation').value;
    const emaTarget = document.getElementById('ema').value;
    const requireStack = document.getElementById('requireStack').checked;
    const firstHour = document.getElementById('firstHour').checked;
    const entryTiming = document.getElementById('entryTiming').value;
    
    const tpType = document.getElementById('tpType').value;
    const tpEma1 = document.getElementById('tpEma1').value;
    const tpEma2 = document.getElementById('tpEma2').value;
    const tpPoints = parseFloat(document.getElementById('tpPoints').value) || 15;
    const tpCrossEma = document.getElementById('tpCrossEma').value;
    
    const slType = document.getElementById('slType').value;
    const slLookback = parseInt(document.getElementById('slLookback').value) || 10;
    const slPoints = parseFloat(document.getElementById('slPoints').value) || 8;
    const slEma = document.getElementById('slEma').value;
    
    const eodExit = document.getElementById('eodExit').value;
    
    const trades = [];
    
    for (let i = consecutiveCount; i < candleData.length - 1; i++) {
        const currentCandle = candleData[i];
        
        if (!currentCandle.ema3 || !currentCandle.ema21) continue;
        
        let setupValid = true;
        for (let j = 0; j < consecutiveCount; j++) {
            const checkCandle = candleData[i - j];
            const emaValue = checkCandle[emaTarget];
            
            if (relation === 'below') {
                if (pricePoint === 'high' && checkCandle.high >= emaValue) setupValid = false;
                if (pricePoint === 'low' && checkCandle.low >= emaValue) setupValid = false;
                if (pricePoint === 'close' && checkCandle.close >= emaValue) setupValid = false;
            } else {
                if (pricePoint === 'high' && checkCandle.high <= emaValue) setupValid = false;
                if (pricePoint === 'low' && checkCandle.low <= emaValue) setupValid = false;
                if (pricePoint === 'close' && checkCandle.close <= emaValue) setupValid = false;
            }
            
            if (!setupValid) break;
        }
        
        if (!setupValid) continue;
        
        if (requireStack) {
            if (!(currentCandle.ema3 > currentCandle.ema5 && 
                  currentCandle.ema5 > currentCandle.ema8 && 
                  currentCandle.ema8 > currentCandle.ema13 && 
                  currentCandle.ema13 > currentCandle.ema21)) {
                continue;
            }
        }
        
        if (firstHour) {
            const hour = currentCandle.timestamp.getHours();
            const minute = currentCandle.timestamp.getMinutes();
            const timeInMinutes = hour * 60 + minute;
            const startTime = 9 * 60 + 30;
            const endTime = 10 * 60 + 30;
            
            if (timeInMinutes < startTime || timeInMinutes >= endTime) continue;
        }
        
        const entryCandle = candleData[i + 1];
        const entryPrice = entryTiming === 'next_open' ? entryCandle.open : entryCandle.close;
        
        let stopLoss;
        if (slType === 'nth_low') {
            const lookbackStart = Math.max(0, i - slLookback + 1);
            stopLoss = Math.min(...candleData.slice(lookbackStart, i + 1).map(c => c.low));
        } else if (slType === 'fixed') {
            stopLoss = entryPrice - slPoints;
        } else if (slType === 'ema_level') {
            stopLoss = entryCandle[slEma];
        }
        
        let exitPrice = null;
        let exitTime = null;
        let exitReason = null;
        let duration = 0;
        
        for (let k = i + 1; k < candleData.length; k++) {
            const tradeCandle = candleData[k];
            duration++;
            
            let targetPrice;
            if (tpType === 'mid_ema') {
                targetPrice = (tradeCandle[tpEma1] + tradeCandle[tpEma2]) / 2;
            } else if (tpType === 'fixed') {
                targetPrice = entryPrice + tpPoints;
            } else if (tpType === 'ema_cross') {
                targetPrice = tradeCandle[tpCrossEma];
            }
            
            if (tradeCandle.close <= stopLoss) {
                exitPrice = tradeCandle.close;
                exitTime = tradeCandle.time;
                exitReason = 'Stop Loss';
                break;
            }
            
            if (tradeCandle.close >= targetPrice) {
                exitPrice = tradeCandle.close;
                exitTime = tradeCandle.time;
                exitReason = 'Target Hit';
                break;
            }
            
            if (eodExit !== 'none') {
                const hour = tradeCandle.timestamp.getHours();
                const eodHour = parseInt(eodExit.split(':')[0]);
                
                if (hour >= eodHour) {
                    exitPrice = tradeCandle.close;
                    exitTime = tradeCandle.time;
                    exitReason = 'EOD Exit';
                    break;
                }
            }
        }
        
        if (exitPrice === null) {
            const lastCandle = candleData[candleData.length - 1];
            exitPrice = lastCandle.close;
            exitTime = lastCandle.time;
            exitReason = 'End of Data';
        }
        
        trades.push({
            entryTime: entryCandle.time,
            entryPrice: entryPrice,
            exitTime: exitTime,
            exitPrice: exitPrice,
            pnl: exitPrice - entryPrice,
            result: exitReason,
            duration: duration
        });
        
        i = i + duration;
    }
    
    backtestResults = { trades: trades };
    displayResults();
}

function displayResults() {
    if (!backtestResults || backtestResults.trades.length === 0) {
        alert('No trades found. Try adjusting your setup.');
        return;
    }
    
    const trades = backtestResults.trades;
    const winners = trades.filter(t => t.pnl > 0);
    const losers = trades.filter(t => t.pnl < 0);
    const winRate = (winners.length / trades.length * 100).toFixed(1);
    const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
    const avgWin = winners.length > 0 ? winners.reduce((sum, t) => sum + t.pnl, 0) / winners.length : 0;
    const avgLoss = losers.length > 0 ? losers.reduce((sum, t) => sum + t.pnl, 0) / losers.length : 0;
    const grossProfit = winners.reduce((sum, t) => sum + t.pnl, 0);
    const grossLoss = Math.abs(losers.reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : 'N/A';
    
    let runningPnl = 0;
    let maxDrawdown = 0;
    let peak = 0;
    
    trades.forEach(trade => {
        runningPnl += trade.pnl;
        if (runningPnl > peak) peak = runningPnl;
        const drawdown = peak - runningPnl;
        if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    });
    
    const avgDuration = (trades.reduce((sum, t) => sum + t.duration, 0) / trades.length).toFixed(1);
    
    document.getElementById('summaryText').innerHTML = `
        Found ${trades.length} trades from ${candleData[0].time.split('T')[0]} to ${candleData[candleData.length-1].time.split('T')[0]}
    `;
    
    const statsHTML = `
        <div class="stat-card">
            <div class="stat-label">Total Trades</div>
            <div class="stat-value">${trades.length}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Win Rate</div>
            <div class="stat-value ${winRate >= 50 ? 'positive' : 'negative'}">${winRate}%</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Total P&L</div>
            <div class="stat-value ${totalPnl >= 0 ? 'positive' : 'negative'}">${totalPnl.toFixed(2)} pts</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Profit Factor</div>
            <div class="stat-value">${profitFactor}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Avg Win</div>
            <div class="stat-value positive">+${avgWin.toFixed(2)} pts</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Avg Loss</div>
            <div class="stat-value negative">${avgLoss.toFixed(2)} pts</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Max Drawdown</div>
            <div class="stat-value negative">-${maxDrawdown.toFixed(2)} pts</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Avg Duration</div>
            <div class="stat-value">${avgDuration} candles</div>
        </div>
    `;
    
    document.getElementById('statsGrid').innerHTML = statsHTML;
    
    let tradesHTML = '';
    trades.forEach((trade, index) => {
        const pnlClass = trade.pnl > 0 ? 'win' : 'loss';
        const durationMinutes = trade.duration * 2;
        
        tradesHTML += `
            <tr>
                <td>${index + 1}</td>
                <td>${formatTime(trade.entryTime)}</td>
                <td>${trade.entryPrice.toFixed(2)}</td>
                <td>${formatTime(trade.exitTime)}</td>
                <td>${trade.exitPrice.toFixed(2)}</td>
                <td class="${pnlClass}">${trade.pnl > 0 ? '+' : ''}${trade.pnl.toFixed(2)}</td>
                <td>${trade.result}</td>
                <td>${durationMinutes} min</td>
            </tr>
        `;
    });
    
    document.getElementById('tradesBody').innerHTML = tradesHTML;
    document.getElementById('resultsPanel').classList.add('show');
    document.getElementById('resultsPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function formatTime(timeString) {
    const date = new Date(timeString);
    return date.toLocaleString('en-US', {
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}
