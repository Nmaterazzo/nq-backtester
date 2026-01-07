let candleData = [];
let allCandleData = [];
let backtestResults = null;

document.getElementById('csvFile').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            parseCSV(event.target.result);
            document.getElementById('fileStatus').textContent = `✓ ${file.name} loaded (${allCandleData.length.toLocaleString()} candles)`;
            document.getElementById('fileStatus').classList.add('loaded');
            document.getElementById('uploadSection').classList.add('loaded');
            document.getElementById('dateRange').style.display = 'block';
            document.getElementById('runButton').disabled = false;
            
            // Set date range defaults
            if (allCandleData.length > 0) {
                const firstDate = allCandleData[0].timestamp.toISOString().split('T')[0];
                const lastDate = allCandleData[allCandleData.length - 1].timestamp.toISOString().split('T')[0];
                document.getElementById('startDate').value = firstDate;
                document.getElementById('endDate').value = lastDate;
            }
        };
        reader.readAsText(file);
    }
});

function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    allCandleData = [];
    
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
        
        allCandleData.push(candle);
    }
    
    console.log(`Loaded ${allCandleData.length} candles`);
}

function clearTimeRange() {
    document.getElementById('startTime').value = '';
    document.getElementById('endTime').value = '';
}

function filterDataByDateRange() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (!startDate && !endDate) {
        candleData = allCandleData;
        return;
    }
    
    const start = startDate ? new Date(startDate) : new Date('1900-01-01');
    const end = endDate ? new Date(endDate) : new Date('2100-12-31');
    end.setHours(23, 59, 59);
    
    candleData = allCandleData.filter(candle => {
        return candle.timestamp >= start && candle.timestamp <= end;
    });
    
    console.log(`Filtered to ${candleData.length} candles from ${startDate || 'start'} to ${endDate || 'end'}`);
}

function updateConditionInputs() {
    const type = document.getElementById('conditionType').value;
    document.querySelectorAll('.condition-inputs').forEach(el => el.style.display = 'none');
    
    if (type === 'consecutive') document.getElementById('consecutiveInputs').style.display = 'block';
    if (type === 'single') document.getElementById('singleInputs').style.display = 'block';
    if (type === 'price_cross') document.getElementById('crossInputs').style.display = 'block';
    if (type === 'ema_cross') document.getElementById('emaCrossInputs').style.display = 'block';
    if (type === 'range_break') document.getElementById('rangeBreakInputs').style.display = 'block';
}

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

function loadPreset(name) {
    document.getElementById('conditionType').value = 'consecutive';
    updateConditionInputs();
    
    switch(name) {
        case '9below3ema':
            document.getElementById('consecutiveCount').value = 9;
            document.getElementById('pricePoint').value = 'high';
            document.getElementById('relation').value = 'below';
            document.getElementById('ema').value = 'ema3';
            document.getElementById('requireStack').checked = false;
            document.getElementById('entryTiming').value = 'next_open';
            document.getElementById('tpType').value = 'mid_ema';
            document.getElementById('tpEma1').value = 'ema3';
            document.getElementById('tpEma2').value = 'ema5';
            document.getElementById('slType').value = 'nth_low';
            document.getElementById('slLookback').value = 10;
            break;
        case 'pullback8':
            document.getElementById('conditionType').value = 'single';
            updateConditionInputs();
            document.getElementById('singlePricePoint').value = 'low';
            document.getElementById('singleRelation').value = 'below';
            document.getElementById('singleEma').value = 'ema8';
            document.getElementById('requireStack').checked = true;
            document.getElementById('tpType').value = 'fixed';
            document.getElementById('tpPoints').value = 15;
            document.getElementById('slType').value = 'ema_level';
            document.getElementById('slEma').value = 'ema21';
            break;
        case 'emastack':
            document.getElementById('conditionType').value = 'single';
            updateConditionInputs();
            document.getElementById('singlePricePoint').value = 'close';
            document.getElementById('singleRelation').value = 'above';
            document.getElementById('singleEma').value = 'ema21';
            document.getElementById('requireStack').checked = true;
            document.getElementById('startTime').value = '09:30';
            document.getElementById('endTime').value = '10:30';
            break;
        case 'breakout':
            document.getElementById('conditionType').value = 'range_break';
            updateConditionInputs();
            document.getElementById('rangeBars').value = 5;
            document.getElementById('rangeType').value = 'high';
            document.getElementById('requireStack').checked = false;
            document.getElementById('tpType').value = 'fixed';
            document.getElementById('tpPoints').value = 20;
            break;
        case 'custom':
            document.getElementById('requireStack').checked = false;
            break;
    }
    
    updateTPInputs();
    updateSLInputs();
}

function checkEntryCondition(i, conditionType) {
    const candle = candleData[i];
    const prevCandle = i > 0 ? candleData[i - 1] : null;
    
    switch(conditionType) {
        case 'consecutive':
            return checkConsecutivePattern(i);
        case 'single':
            return checkSingleCondition(candle);
        case 'price_cross':
            return checkPriceCross(candle, prevCandle);
        case 'ema_cross':
            return checkEmaCross(candle, prevCandle);
        case 'range_break':
            return checkRangeBreak(i);
        default:
            return false;
    }
}

function checkConsecutivePattern(i) {
    const count = parseInt(document.getElementById('consecutiveCount').value);
    const pricePoint = document.getElementById('pricePoint').value;
    const relation = document.getElementById('relation').value;
    const emaTarget = document.getElementById('ema').value;
    
    for (let j = 0; j < count; j++) {
        const checkCandle = candleData[i - j];
        if (!checkCandle) return false;
        
        const emaValue = checkCandle[emaTarget];
        if (!emaValue) return false;
        
        if (relation === 'below') {
            if (pricePoint === 'high' && checkCandle.high >= emaValue) return false;
            if (pricePoint === 'low' && checkCandle.low >= emaValue) return false;
            if (pricePoint === 'close' && checkCandle.close >= emaValue) return false;
        } else {
            if (pricePoint === 'high' && checkCandle.high <= emaValue) return false;
            if (pricePoint === 'low' && checkCandle.low <= emaValue) return false;
            if (pricePoint === 'close' && checkCandle.close <= emaValue) return false;
        }
    }
    return true;
}

function checkSingleCondition(candle) {
    const pricePoint = document.getElementById('singlePricePoint').value;
    const relation = document.getElementById('singleRelation').value;
    const emaTarget = document.getElementById('singleEma').value;
    
    const price = candle[pricePoint];
    const emaValue = candle[emaTarget];
    
    if (!emaValue) return false;
    
    if (relation === 'above') return price > emaValue;
    return price < emaValue;
}

function checkPriceCross(candle, prevCandle) {
    if (!prevCandle) return false;
    
    const direction = document.getElementById('crossDirection').value;
    const emaTarget = document.getElementById('crossEma').value;
    
    const currentEma = candle[emaTarget];
    const prevEma = prevCandle[emaTarget];
    
    if (!currentEma || !prevEma) return false;
    
    if (direction === 'above') {
        return prevCandle.close < prevEma && candle.close > currentEma;
    }
    return prevCandle.close > prevEma && candle.close < currentEma;
}

function checkEmaCross(candle, prevCandle) {
    if (!prevCandle) return false;
    
    const fastEma = document.getElementById('fastEma').value;
    const slowEma = document.getElementById('slowEma').value;
    const direction = document.getElementById('crossoverDirection').value;
    
    const currentFast = candle[fastEma];
    const currentSlow = candle[slowEma];
    const prevFast = prevCandle[fastEma];
    const prevSlow = prevCandle[slowEma];
    
    if (!currentFast || !currentSlow || !prevFast || !prevSlow) return false;
    
    if (direction === 'above') {
        return prevFast < prevSlow && currentFast > currentSlow;
    }
    return prevFast > prevSlow && currentFast < currentSlow;
}

function checkRangeBreak(i) {
    const bars = parseInt(document.getElementById('rangeBars').value);
    const rangeType = document.getElementById('rangeType').value;
    
    if (i < bars) return false;
    
    const candle = candleData[i];
    const lookbackCandles = candleData.slice(i - bars, i);
    
    if (rangeType === 'high') {
        const rangeHigh = Math.max(...lookbackCandles.map(c => c.high));
        return candle.close > rangeHigh;
    } else {
        const rangeLow = Math.min(...lookbackCandles.map(c => c.low));
        return candle.close < rangeLow;
    }
}

function runBacktest() {
    if (allCandleData.length === 0) {
        alert('Please upload a CSV file first');
        return;
    }
    
    filterDataByDateRange();
    
    if (candleData.length === 0) {
        alert('No data in selected date range');
        return;
    }
    
    const conditionType = document.getElementById('conditionType').value;
    const requireStack = document.getElementById('requireStack').checked;
    const entryTiming = document.getElementById('entryTiming').value;
    
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;
    const useTimeFilter = startTime && endTime;
    
    let startMinutes, endMinutes;
    if (useTimeFilter) {
        const [startHour, startMin] = startTime.split(':').map(Number);
        const [endHour, endMin] = endTime.split(':').map(Number);
        startMinutes = startHour * 60 + startMin;
        endMinutes = endHour * 60 + endMin;
    }
    
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
    
    for (let i = 1; i < candleData.length - 1; i++) {
        const currentCandle = candleData[i];
        
        if (!currentCandle.ema3 || !currentCandle.ema21) continue;
        
        if (!checkEntryCondition(i, conditionType)) continue;
        
        if (requireStack) {
            if (!(currentCandle.ema3 > currentCandle.ema5 && 
                  currentCandle.ema5 > currentCandle.ema8 && 
                  currentCandle.ema8 > currentCandle.ema13 && 
                  currentCandle.ema13 > currentCandle.ema21)) {
                continue;
            }
        }
        
        const hour = currentCandle.timestamp.getHours();
        const minute = currentCandle.timestamp.getMinutes();
        const timeInMinutes = hour * 60 + minute;
        
        if (useTimeFilter) {
            if (timeInMinutes < startMinutes || timeInMinutes >= endMinutes) continue;
        }
        
        let entryCandle, entryPrice;
        if (entryTiming === 'next_open') {
            entryCandle = candleData[i + 1];
            entryPrice = entryCandle.open;
        } else if (entryTiming === 'next_close') {
            entryCandle = candleData[i + 1];
            entryPrice = entryCandle.close;
        } else {
            entryCandle = currentCandle;
            entryPrice = currentCandle.close;
        }
        
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
        let maxAdverse = 0;
        
        const startIdx = entryTiming === 'current_close' ? i : i + 1;
        
        for (let k = startIdx; k < candleData.length; k++) {
            const tradeCandle = candleData[k];
            duration++;
            
            // Track intra-trade drawdown
            const adverse = entryPrice - tradeCandle.low;
            if (adverse > maxAdverse) maxAdverse = adverse;
            
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
            duration: duration,
            maxAdverse: maxAdverse
        });
        
        i = startIdx + duration - 1;
    }
    
    backtestResults = { trades: trades };
    displayResults();
}

function displayResults() {
    if (!backtestResults || backtestResults.trades.length === 0) {
        alert('No trades found. Try adjusting your setup or date range.');
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
    
    const maxIntraTradeDD = Math.max(...trades.map(t => t.maxAdverse));
    const avgDuration = (trades.reduce((sum, t) => sum + t.duration, 0) / trades.length).toFixed(1);
    
    const startDate = candleData[0].time.split('T')[0];
    const endDate = candleData[candleData.length - 1].time.split('T')[0];
    
    document.getElementById('summaryText').innerHTML = `
        Found ${trades.length} trades from ${startDate} to ${endDate}
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
            <div class="stat-label">Max Intra-Trade DD</div>
            <div class="stat-value negative">-${maxIntraTradeDD.toFixed(2)} pts</div>
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
