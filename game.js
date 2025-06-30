// Game State
const gameState = {
    balance: 500,
    jackpot: 0,
    currentBet: 0,
    currentHand: [],
    selectedCards: [],
    doubleWinnings: 0,
    doubleRound: 0,
    hasDiscarded: false,
    isAnimating: false,
    trashGameInterval: null,
    powerups: {
        wildcardsInDeck: 0,
        passiveIncome: 0,
        lucky: 0,
        insurance: 0,
        doubleOrNothingMaster: false,
        mulligan: 0,
        jokersWild: 0,
        compoundInterest: 0,
        compoundInterestPurchases: 0
    }
};

// Card deck
const suits = ['♠', '♥', '♦', '♣'];
const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// DOM Elements
const balanceEl = document.getElementById('balance');
const jackpotEl = document.getElementById('jackpot');
const betAmountEl = document.getElementById('bet-amount');
const dealBtn = document.getElementById('deal-btn');
const cardsArea = document.getElementById('cards-area');
const actionArea = document.getElementById('action-area');
const discardBtn = document.getElementById('discard-btn');
const holdBtn = document.getElementById('hold-btn');
const resultArea = document.getElementById('result-area');
const handResultEl = document.getElementById('hand-result');
const winningsEl = document.getElementById('winnings');
const doubleBtn = document.getElementById('double-btn');
const collectBtn = document.getElementById('collect-btn');
const mainGameEl = document.getElementById('main-game');
const doubleGameEl = document.getElementById('double-game');
const trashGameEl = document.getElementById('trash-game');
const shopEl = document.getElementById('shop');
const powerupListEl = document.getElementById('powerup-list');
const insuranceIndicatorEl = document.getElementById('insurance-indicator');
const insuranceRoundsEl = document.getElementById('insurance-rounds');
const luckyCharmIndicatorEl = document.getElementById('lucky-charm-indicator');
const luckyRoundsEl = document.getElementById('lucky-rounds');

// Initialize game
function init() {
    loadGameState();
    updateDisplay();
    setupEventListeners();
}

// Event Listeners
function setupEventListeners() {
    dealBtn.addEventListener('click', dealCards);
    discardBtn.addEventListener('click', discardSelected);
    holdBtn.addEventListener('click', () => evaluateHand(false));
    doubleBtn.addEventListener('click', startDoubleGame);
    collectBtn.addEventListener('click', collectWinnings);
    document.getElementById('high-btn').addEventListener('click', () => playHighLow('high'));
    document.getElementById('low-btn').addEventListener('click', () => playHighLow('low'));
    document.getElementById('cash-out-btn').addEventListener('click', cashOutDouble);
    document.getElementById('exit-trash-btn').addEventListener('click', exitTrashGame);
    document.getElementById('close-shop-btn').addEventListener('click', () => showSection('main-game'));
    
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const section = e.target.dataset.section;
            showSection(section);
        });
    });
    
    // Shop buttons
    document.querySelectorAll('.buy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            buyPowerup(e.target.dataset.item);
        });
    });
}

// Create deck
function createDeck() {
    const deck = [];
    for (const suit of suits) {
        for (const rank of ranks) {
            deck.push({ rank, suit });
        }
    }
    
    // Add wildcards to the deck
    for (let i = 0; i < gameState.powerups.wildcardsInDeck; i++) {
        deck.push({ rank: 'W', suit: '★', isWild: true });
    }
    
    return deck;
}

// Shuffle deck
function shuffleDeck(deck) {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Deal cards with animation
async function dealCards() {
    if (gameState.isAnimating) return;
    
    const bet = parseInt(betAmountEl.value);
    
    if (bet > gameState.balance) {
        alert('Insufficient balance!');
        return;
    }
    
    if (bet <= 0) {
        alert('Please enter a valid bet amount!');
        return;
    }
    
    gameState.isAnimating = true;
    
    // Apply compound interest
    if (gameState.powerups.compoundInterest > 0) {
        const interest = Math.floor(gameState.balance * (gameState.powerups.compoundInterest / 100));
        if (interest > 0) {
            gameState.balance += interest;
            await animateCompoundInterest(interest);
        }
    }
    
    // Apply passive income with animation
    if (gameState.powerups.passiveIncome > 0) {
        await animatePassiveIncome(gameState.powerups.passiveIncome);
        gameState.balance += gameState.powerups.passiveIncome;
    }
    
    gameState.currentBet = bet;
    gameState.balance -= bet;
    gameState.hasDiscarded = false;
    gameState.selectedCards = [];
    
    const deck = shuffleDeck(createDeck());
    gameState.currentHand = deck.slice(0, 5);
    
    // Clear cards area (except indicators)
    const indicators = cardsArea.querySelectorAll('.lucky-charm-indicator, .jokers-wild-indicator, .mulligan-indicator');
    cardsArea.innerHTML = '';
    indicators.forEach(ind => cardsArea.appendChild(ind));
    
    // Update indicators
    updateCardAreaIndicators();
    
    // Deal cards with animation
    for (let i = 0; i < 5; i++) {
        await dealSingleCard(i);
        await sleep(150);
    }
    
    actionArea.style.display = 'block';
    resultArea.style.display = 'none';
    dealBtn.disabled = true;
    
    // Show mulligan button if available
    if (gameState.powerups.mulligan > 0) {
        const mulliganBtn = document.getElementById('mulligan-btn');
        if (mulliganBtn) {
            mulliganBtn.style.display = 'inline-block';
        }
    }
    
    gameState.isAnimating = false;
    updateDisplay();
}

// Animate compound interest
async function animateCompoundInterest(amount) {
    const container = document.createElement('div');
    container.className = 'compound-interest-container';
    container.innerHTML = `<div class="compound-interest-text">+${amount}gc (${gameState.powerups.compoundInterest}% interest)</div>`;
    document.body.appendChild(container);
    
    setTimeout(() => container.remove(), 2500);
    await sleep(1000);
}

// Use mulligan
async function useMulligan() {
    if (gameState.powerups.mulligan <= 0 || gameState.isAnimating) return;
    
    gameState.isAnimating = true;
    gameState.powerups.mulligan--;
    
    // Get all card elements (not indicators)
    const allCards = Array.from(cardsArea.children).filter(el => el.classList.contains('card'));
    
    // Animate cards swirling away
    allCards.forEach((card, index) => {
        setTimeout(() => {
            card.style.animation = 'mulliganSwirl 0.6s ease-out forwards';
        }, index * 50);
    });
    
    await sleep(800);
    
    // Deal new hand
    const deck = shuffleDeck(createDeck());
    gameState.currentHand = deck.slice(0, 5);
    gameState.selectedCards = [];
    
    // Remove old cards
    allCards.forEach(card => card.remove());
    
    // Deal new cards
    for (let i = 0; i < 5; i++) {
        await dealSingleCard(i);
        await sleep(100);
    }
    
    // Hide mulligan button if no more uses
    if (gameState.powerups.mulligan <= 0) {
        const mulliganBtn = document.getElementById('mulligan-btn');
        if (mulliganBtn) {
            mulliganBtn.style.display = 'none';
        }
    }
    
    gameState.isAnimating = false;
    updateDisplay();
}

// Update card area indicators
function updateCardAreaIndicators() {
    // Lucky charm indicator
    if (gameState.powerups.lucky > 0) {
        if (!luckyCharmIndicatorEl.parentNode) {
            cardsArea.appendChild(luckyCharmIndicatorEl);
        }
        luckyCharmIndicatorEl.classList.add('active');
        luckyRoundsEl.textContent = gameState.powerups.lucky;
    } else {
        luckyCharmIndicatorEl.classList.remove('active');
    }
    
    // Joker's Wild indicator
    let jokersIndicator = document.getElementById('jokers-wild-indicator');
    if (gameState.powerups.jokersWild > 0) {
        if (!jokersIndicator) {
            jokersIndicator = document.createElement('div');
            jokersIndicator.id = 'jokers-wild-indicator';
            jokersIndicator.className = 'jokers-wild-indicator';
            jokersIndicator.innerHTML = `Joker's Wild Active (<span id="jokers-rounds">0</span> rounds)`;
            cardsArea.appendChild(jokersIndicator);
        }
        jokersIndicator.classList.add('active');
        document.getElementById('jokers-rounds').textContent = gameState.powerups.jokersWild;
    } else if (jokersIndicator) {
        jokersIndicator.classList.remove('active');
    }
    
    // Mulligan indicator
    let mulliganIndicator = document.getElementById('mulligan-indicator');
    if (gameState.powerups.mulligan > 0) {
        if (!mulliganIndicator) {
            mulliganIndicator = document.createElement('div');
            mulliganIndicator.id = 'mulligan-indicator';
            mulliganIndicator.className = 'mulligan-indicator';
            mulliganIndicator.innerHTML = `Mulligans: <span id="mulligan-count">0</span>`;
            cardsArea.appendChild(mulliganIndicator);
        }
        mulliganIndicator.classList.add('active');
        document.getElementById('mulligan-count').textContent = gameState.powerups.mulligan;
    } else if (mulliganIndicator) {
        mulliganIndicator.classList.remove('active');
    }
}

// Animate passive income
async function animatePassiveIncome(amount) {
    const container = document.createElement('div');
    container.className = 'passive-income-container';
    document.body.appendChild(container);
    
    // Create falling coins
    for (let i = 0; i < amount; i++) {
        setTimeout(() => {
            const coin = document.createElement('div');
            coin.className = 'falling-coin';
            coin.innerHTML = '🪙';
            coin.style.left = Math.random() * window.innerWidth + 'px';
            coin.style.animationDelay = Math.random() * 0.5 + 's';
            container.appendChild(coin);
            
            // Remove coin after animation
            setTimeout(() => coin.remove(), 2000);
        }, i * 100);
    }
    
    // Show income message
    const message = document.createElement('div');
    message.className = 'passive-income-message';
    message.textContent = `+${amount}gc Passive Income!`;
    container.appendChild(message);
    
    // Clean up
    setTimeout(() => container.remove(), 3000);
    await sleep(1500);
}

// Deal single card with animation
function dealSingleCard(index) {
    return new Promise(resolve => {
        const card = gameState.currentHand[index];
        const cardEl = document.createElement('div');
        const isWild = card.isWild || (gameState.powerups.jokersWild > 0 && card.rank === 'J');
        const isLucky = gameState.powerups.lucky > 0;
        
        let cardClass = `card dealing`;
        if (isWild) {
            cardClass += ' wild';
            if (card.rank === 'J' && gameState.powerups.jokersWild > 0) {
                cardClass += ' joker-wild';
            }
        } else {
            cardClass += isLucky ? ' lucky' : '';
            cardClass += ['♥', '♦'].includes(card.suit) ? ' red' : ' black';
        }
        
        cardEl.className = cardClass;
        cardEl.innerHTML = `
            <div class="rank">${card.rank}</div>
            <div class="suit">${card.suit}</div>
        `;
        
        cardEl.addEventListener('click', () => toggleCardSelection(index));
        cardsArea.appendChild(cardEl);
        
        // Remove animation class after animation completes
        setTimeout(() => {
            cardEl.classList.remove('dealing');
            resolve();
        }, 600);
    });
}

// Toggle card selection
function toggleCardSelection(index) {
    if (gameState.hasDiscarded || gameState.isAnimating) return;
    
    // Get all card elements (not indicators)
    const allCards = Array.from(cardsArea.children).filter(el => el.classList.contains('card'));
    const cardEl = allCards[index];
    
    if (!cardEl) return;
    
    if (gameState.selectedCards.includes(index)) {
        gameState.selectedCards = gameState.selectedCards.filter(i => i !== index);
        cardEl.classList.remove('selected');
    } else {
        gameState.selectedCards.push(index);
        cardEl.classList.add('selected');
    }
}

// Discard selected cards with animation
async function discardSelected() {
    if (gameState.selectedCards.length === 0) {
        alert('Select cards to discard first!');
        return;
    }
    
    if (gameState.isAnimating) return;
    gameState.isAnimating = true;
    
    const deck = shuffleDeck(createDeck());
    let deckIndex = 0;
    
    // Get all card elements (not indicators)
    const allCards = Array.from(cardsArea.children).filter(el => el.classList.contains('card'));
    
    // Animate discarding cards
    for (const cardIndex of gameState.selectedCards) {
        const cardEl = allCards[cardIndex];
        if (cardEl) {
            cardEl.classList.add('discarding');
        }
    }
    
    await sleep(500);
    
    // Replace cards with new ones
    for (const cardIndex of gameState.selectedCards) {
        gameState.currentHand[cardIndex] = deck[deckIndex++];
        const card = gameState.currentHand[cardIndex];
        const cardEl = allCards[cardIndex];
        
        if (!cardEl) continue;
        
        const isWild = card.isWild || (gameState.powerups.jokersWild > 0 && card.rank === 'J');
        const isLucky = gameState.powerups.lucky > 0;
        
        let cardClass = `card new-card`;
        if (isWild) {
            cardClass += ' wild';
            if (card.rank === 'J' && gameState.powerups.jokersWild > 0) {
                cardClass += ' joker-wild';
            }
        } else {
            cardClass += isLucky ? ' lucky' : '';
            cardClass += ['♥', '♦'].includes(card.suit) ? ' red' : ' black';
        }
        
        cardEl.className = cardClass;
        cardEl.innerHTML = `
            <div class="rank">${card.rank}</div>
            <div class="suit">${card.suit}</div>
        `;
        
        // Re-add click listener
        const newCardEl = cardEl.cloneNode(true);
        cardEl.parentNode.replaceChild(newCardEl, cardEl);
        
        // Create a closure to capture the correct index
        (function(idx) {
            newCardEl.addEventListener('click', () => toggleCardSelection(idx));
        })(cardIndex);
    }
    
    gameState.hasDiscarded = true;
    gameState.selectedCards = [];
    gameState.isAnimating = false;
    
    discardBtn.style.display = 'none';
    const mulliganBtn = document.getElementById('mulligan-btn');
    if (mulliganBtn) {
        mulliganBtn.style.display = 'none';
    }
    
    // Wait a moment before evaluating
    await sleep(1000);
    evaluateHand(true);
}

// Evaluate hand
async function evaluateHand(fromDiscard) {
    if (gameState.isAnimating && !fromDiscard) return;
    
    const hand = gameState.currentHand;
    const result = getHandRank(hand);
    
    // Count and remove used wildcards from deck
    const wildcardsUsed = hand.filter(card => card.isWild && card.rank === 'W').length;
    if (wildcardsUsed > 0) {
        gameState.powerups.wildcardsInDeck -= wildcardsUsed;
        console.log(`Used ${wildcardsUsed} wildcard(s). ${gameState.powerups.wildcardsInDeck} remaining in deck.`);
    }
    
    const winnings = Math.floor(gameState.currentBet * result.multiplier);
    gameState.doubleWinnings = winnings;
    
    // Show result with animation
    handResultEl.textContent = result.name;
    handResultEl.style.animation = 'none';
    setTimeout(() => {
        handResultEl.style.animation = 'fadeInScale 0.5s ease-out forwards';
    }, 10);
    
    if (winnings > 0) {
        winningsEl.textContent = `You won ${winnings}gc!`;
        if (wildcardsUsed > 0) {
            winningsEl.textContent += ` (Used ${wildcardsUsed} wildcard${wildcardsUsed > 1 ? 's' : ''})`;
        }
        doubleBtn.style.display = 'inline-block';
        collectBtn.style.display = 'inline-block';
    } else {
        winningsEl.textContent = 'No win this time.';
        doubleBtn.style.display = 'none';
        collectBtn.style.display = 'none';
        
        // Apply insurance if active
        if (gameState.powerups.insurance > 0) {
            const refund = Math.floor(gameState.currentBet * 0.5);
            gameState.balance += refund;
            winningsEl.textContent += ` (Insurance: +${refund}gc)`;
            gameState.powerups.insurance--;
        }
        
        setTimeout(resetGame, 3000);
    }
    
    actionArea.style.display = 'none';
    resultArea.style.display = 'block';
    
    // Update powerup counters
    if (gameState.powerups.lucky > 0) gameState.powerups.lucky--;
    if (gameState.powerups.jokersWild > 0) gameState.powerups.jokersWild--;
    
    updateDisplay();
}

// Get hand ranking
function getHandRank(hand) {
    // Convert cards for easier evaluation
    const cards = hand.map(card => {
        let value = card.rank;
        if (value === 'J') value = 11;
        else if (value === 'Q') value = 12;
        else if (value === 'K') value = 13;
        else if (value === 'A') value = 14;
        else if (value === 'W') value = 0; // Wildcard
        else value = parseInt(value);
        
        // Joker's Wild - treat all Jacks as wildcards
        if (gameState.powerups.jokersWild > 0 && card.rank === 'J') {
            value = 0;
        }
        
        return { ...card, value };
    });
    
    // Apply lucky charm
    if (gameState.powerups.lucky > 0 && Math.random() < 0.1) {
        // Upgrade hand slightly
        const upgrades = [
            { name: 'Lucky Pair', multiplier: 1.5 },
            { name: 'Lucky Two Pair', multiplier: 2.5 },
            { name: 'Lucky Three of a Kind', multiplier: 4 }
        ];
        return upgrades[Math.floor(Math.random() * upgrades.length)];
    }
    
    // Count wildcards
    const wildcards = cards.filter(c => c.value === 0).length;
    const regularCards = cards.filter(c => c.value !== 0);
    
    // Check for various hands
    const isFlush = checkFlush(regularCards);
    const straightResult = checkStraight(regularCards);
    const groups = getGroups(regularCards);
    
    // Evaluate with wildcards
    if (wildcards > 0) {
        // Enhance evaluation with wildcards
        groups[0] = (groups[0] || 0) + wildcards;
    }
    
    // Return hand ranking
    if (straightResult && isFlush && straightResult.high === 14) {
        return { name: 'Royal Flush!', multiplier: 500 };
    } else if (straightResult && isFlush) {
        return { name: 'Straight Flush!', multiplier: 100 };
    } else if (groups[0] >= 4) {
        return { name: 'Four of a Kind!', multiplier: 50 };
    } else if (groups[0] === 3 && groups[1] === 2) {
        return { name: 'Full House!', multiplier: 10 };
    } else if (isFlush) {
        return { name: 'Flush!', multiplier: 5 };
    } else if (straightResult) {
        return { name: 'Straight!', multiplier: 5 };
    } else if (groups[0] === 3) {
        return { name: 'Three of a Kind!', multiplier: 3 };
    } else if (groups[0] === 2 && groups[1] === 2) {
        return { name: 'Two Pair!', multiplier: 2 };
    } else if (groups[0] === 2) {
        return { name: 'One Pair', multiplier: 1 };
    } else {
        return { name: 'High Card', multiplier: 0 };
    }
}

// Helper functions for hand evaluation
function checkFlush(cards) {
    if (cards.length < 5) return false;
    const suit = cards[0].suit;
    return cards.every(card => card.suit === suit);
}

function checkStraight(cards) {
    if (cards.length < 5) return false;
    const values = cards.map(c => c.value).sort((a, b) => a - b);
    
    // Check for regular straight
    for (let i = 0; i < values.length - 1; i++) {
        if (values[i + 1] - values[i] !== 1) {
            // Check for A-2-3-4-5
            if (values.includes(14) && values.includes(2) && values.includes(3) && 
                values.includes(4) && values.includes(5)) {
                return { high: 5 };
            }
            return false;
        }
    }
    return { high: values[values.length - 1] };
}

function getGroups(cards) {
    const counts = {};
    cards.forEach(card => {
        counts[card.value] = (counts[card.value] || 0) + 1;
    });
    
    return Object.values(counts).sort((a, b) => b - a);
}

// Start double or nothing game
function startDoubleGame() {
    gameState.doubleRound = 1;
    showSection('double-game');
    
    document.getElementById('current-winnings').textContent = gameState.doubleWinnings;
    document.getElementById('double-round').textContent = gameState.doubleRound;
    
    showNextCard();
}

// Show next card in double game
function showNextCard() {
    const deck = shuffleDeck(createDeck());
    const card = deck[0];
    
    const shownCardEl = document.getElementById('shown-card');
    shownCardEl.className = `card ${['♥', '♦'].includes(card.suit) ? 'red' : 'black'}`;
    shownCardEl.innerHTML = `
        <div class="rank">${card.rank}</div>
        <div class="suit">${card.suit}</div>
    `;
    
    shownCardEl.dataset.value = getCardValue(card.rank);
    
    // Show probability if Double or Nothing Master is active
    if (gameState.powerups.doubleOrNothingMaster) {
        const currentValue = parseInt(shownCardEl.dataset.value);
        updateProbabilityDisplay(currentValue);
    }
    
    document.getElementById('mystery-card').className = 'card back';
}

// Update probability display for Double or Nothing Master
function updateProbabilityDisplay(currentValue) {
    let probContainer = document.getElementById('probability-display');
    if (!probContainer) {
        probContainer = document.createElement('div');
        probContainer.id = 'probability-display';
        probContainer.className = 'probability-display';
        document.querySelector('.double-cards').appendChild(probContainer);
    }
    
    // Calculate probabilities
    const totalCards = 13;
    const higherCards = totalCards - currentValue + 1;
    const lowerCards = currentValue - 2; // -2 because we don't count the current card
    
    const higherProb = Math.round((higherCards / totalCards) * 100);
    const lowerProb = Math.round((lowerCards / totalCards) * 100);
    const tieProb = Math.round((1 / totalCards) * 100);
    
    probContainer.innerHTML = `
        <div class="prob-item high">Higher: ${higherProb}%</div>
        <div class="prob-item tie">Tie: ${tieProb}%</div>
        <div class="prob-item low">Lower: ${lowerProb}%</div>
    `;
}

// Get card value for comparison
function getCardValue(rank) {
    if (rank === 'A') return 14;
    if (rank === 'K') return 13;
    if (rank === 'Q') return 12;
    if (rank === 'J') return 11;
    return parseInt(rank);
}

// Play high or low
function playHighLow(choice) {
    const currentValue = parseInt(document.getElementById('shown-card').dataset.value);
    const deck = shuffleDeck(createDeck());
    const nextCard = deck[0];
    const nextValue = getCardValue(nextCard.rank);
    
    const mysteryCardEl = document.getElementById('mystery-card');
    mysteryCardEl.className = `card ${['♥', '♦'].includes(nextCard.suit) ? 'red' : 'black'}`;
    mysteryCardEl.innerHTML = `
        <div class="rank">${nextCard.rank}</div>
        <div class="suit">${nextCard.suit}</div>
    `;
    
    let won = false;
    if (choice === 'high' && nextValue > currentValue) won = true;
    if (choice === 'low' && nextValue < currentValue) won = true;
    if (nextValue === currentValue) won = true; // Tie goes to player
    
    setTimeout(() => {
        if (won) {
            gameState.doubleWinnings *= 2;
            gameState.doubleRound++;
            
            if (gameState.doubleRound > 10) {
                // Won the jackpot!
                gameState.doubleWinnings += gameState.jackpot;
                gameState.jackpot = 0;
                alert(`JACKPOT! You won ${gameState.doubleWinnings}gc!`);
                cashOutDouble();
            } else {
                document.getElementById('current-winnings').textContent = gameState.doubleWinnings;
                document.getElementById('double-round').textContent = gameState.doubleRound;
                showNextCard();
            }
        } else {
            // Lost - add to jackpot
            gameState.jackpot += gameState.doubleWinnings;
            gameState.doubleWinnings = 0;
            alert('You lost! All winnings added to jackpot.');
            showSection('main-game');
            resetGame();
        }
        updateDisplay();
    }, 1000);
}

// Cash out from double game
function cashOutDouble() {
    gameState.balance += gameState.doubleWinnings;
    alert(`You collected ${gameState.doubleWinnings}gc!`);
    gameState.doubleWinnings = 0;
    showSection('main-game');
    resetGame();
    updateDisplay();
}

// Collect winnings
function collectWinnings() {
    gameState.balance += gameState.doubleWinnings;
    gameState.doubleWinnings = 0;
    resetGame();
    updateDisplay();
}

// Reset game
function resetGame() {
    gameState.currentHand = [];
    gameState.selectedCards = [];
    gameState.hasDiscarded = false;
    gameState.isAnimating = false;
    
    // Clear cards area (except indicators)
    const indicators = cardsArea.querySelectorAll('.lucky-charm-indicator, .jokers-wild-indicator, .mulligan-indicator');
    cardsArea.innerHTML = '';
    indicators.forEach(ind => cardsArea.appendChild(ind));
    
    actionArea.style.display = 'none';
    resultArea.style.display = 'none';
    dealBtn.disabled = false;
    discardBtn.style.display = 'inline-block';
    
    // Check if player is broke
    if (gameState.balance <= 0) {
        alert('You\'re out of cash! Time to collect some trash!');
        showSection('trash-game');
    }
}

// Start trash collection game
function startTrashGame() {
    // Clear any existing interval first
    if (gameState.trashGameInterval) {
        clearInterval(gameState.trashGameInterval);
        gameState.trashGameInterval = null;
    }
    
    const trashArea = document.getElementById('trash-area');
    trashArea.innerHTML = '';
    
    let collected = 0;
    let coinsFound = 0;
    document.getElementById('trash-collected').textContent = '0';
    document.getElementById('trash-earned').textContent = '0';
    
    const trashEmojis = ['🗑️', '📦', '🥫', '📰', '🍌'];
    
    // Spawn trash items
    const spawnTrash = () => {
        if (document.getElementById('trash-game').style.display === 'none') {
            return;
        }
        
        const trash = document.createElement('div');
        
        // 1 in 50 chance for a rare coin
        const isRareCoin = Math.random() < 0.02; // 2% chance = 1 in 50
        
        if (isRareCoin) {
            trash.className = 'trash-item rare-coin';
            trash.innerHTML = '💰';
        } else {
            trash.className = 'trash-item';
            trash.innerHTML = trashEmojis[Math.floor(Math.random() * trashEmojis.length)];
        }
        
        trash.style.left = Math.random() * (trashArea.offsetWidth - 50) + 'px';
        trash.style.top = Math.random() * (trashArea.offsetHeight - 50) + 'px';
        
        trash.addEventListener('click', () => {
            trash.classList.add('collecting');
            
            if (isRareCoin) {
                // Show special effect for rare coin
                const bonus = document.createElement('div');
                bonus.className = 'coin-bonus-text';
                bonus.textContent = '+100gc!!!';
                bonus.style.left = trash.style.left;
                bonus.style.top = trash.style.top;
                trashArea.appendChild(bonus);
                
                setTimeout(() => bonus.remove(), 1500);
                
                coinsFound++;
                gameState.balance += 100;
                document.getElementById('trash-earned').textContent = collected + (coinsFound * 100);
            } else {
                collected++;
                gameState.balance++;
                document.getElementById('trash-collected').textContent = collected;
                document.getElementById('trash-earned').textContent = collected + (coinsFound * 100);
            }
            
            updateDisplay();
            
            setTimeout(() => {
                trash.remove();
            }, 300);
        });
        
        trashArea.appendChild(trash);
        
        // Remove after 3 seconds if not clicked (rare coins last longer)
        setTimeout(() => {
            if (trash.parentNode) {
                trash.style.opacity = '0.3';
                setTimeout(() => trash.remove(), 500);
            }
        }, isRareCoin ? 5000 : 3000);
    };
    
    // Initial spawn
    for (let i = 0; i < 3; i++) {
        setTimeout(() => spawnTrash(), i * 200);
    }
    
    // Spawn trash every 800ms and store the interval
    gameState.trashGameInterval = setInterval(() => {
        if (document.getElementById('trash-game').style.display === 'none') {
            clearInterval(gameState.trashGameInterval);
            gameState.trashGameInterval = null;
        } else {
            spawnTrash();
        }
    }, 800);
}

// Exit trash game
function exitTrashGame() {
    // Clear the interval when exiting
    if (gameState.trashGameInterval) {
        clearInterval(gameState.trashGameInterval);
        gameState.trashGameInterval = null;
    }
    showSection('main-game');
}

// Buy powerup - Updated to allow stacking
function buyPowerup(item) {
    const baseCosts = {
        wildcard: 100,
        passive: 200,
        lucky: 150,
        insurance: 75,
        doubleOrNothingMaster: 2000,
        mulligan: 250,
        jokersWild: 500,
        compoundInterest: 500
    };
    
    // Calculate compound interest cost
    let cost = baseCosts[item];
    if (item === 'compoundInterest') {
        cost = 500 + (gameState.powerups.compoundInterestPurchases * 250);
    }
    
    if (gameState.balance < cost) {
        alert('Insufficient funds!');
        return;
    }
    
    gameState.balance -= cost;
    
    switch(item) {
        case 'wildcard':
            gameState.powerups.wildcardsInDeck += 1;
            alert(`Wild Card added to deck! Total wildcards in deck: ${gameState.powerups.wildcardsInDeck}`);
            break;
        case 'passive':
            gameState.powerups.passiveIncome += 5;
            alert(`Passive Income increased! Now earning ${gameState.powerups.passiveIncome}gc per round.`);
            break;
        case 'lucky':
            gameState.powerups.lucky += 5;
            alert(`Lucky Charm extended! Now active for ${gameState.powerups.lucky} rounds.`);
            break;
        case 'insurance':
            gameState.powerups.insurance += 3;
            alert(`Insurance extended! Now active for ${gameState.powerups.insurance} rounds.`);
            break;
        case 'doubleOrNothingMaster':
            if (gameState.powerups.doubleOrNothingMaster) {
                alert('You already own Double or Nothing Master!');
                gameState.balance += cost; // Refund
                return;
            }
            gameState.powerups.doubleOrNothingMaster = true;
            alert('Double or Nothing Master purchased! You can now see probabilities in the double game.');
            break;
        case 'mulligan':
            gameState.powerups.mulligan += 1;
            alert(`Mulligan purchased! Total mulligans: ${gameState.powerups.mulligan}`);
            break;
        case 'jokersWild':
            gameState.powerups.jokersWild += 5;
            alert(`Joker's Wild activated! All Jacks are wild for ${gameState.powerups.jokersWild} rounds.`);
            break;
        case 'compoundInterest':
            gameState.powerups.compoundInterest += 1;
            gameState.powerups.compoundInterestPurchases += 1;
            alert(`Compound Interest increased! Now earning ${gameState.powerups.compoundInterest}% interest per round.`);
            // Update the button text with new cost
            const btn = document.querySelector('[data-item="compoundInterest"]');
            if (btn) {
                const newCost = 500 + (gameState.powerups.compoundInterestPurchases * 250);
                btn.parentElement.querySelector('.price').textContent = `Cost: ${newCost}gc`;
            }
            break;
    }
    
    updateDisplay();
}

// Show section
function showSection(sectionId) {
    // Clear trash game interval if leaving trash game
    if (sectionId !== 'trash-game' && gameState.trashGameInterval) {
        clearInterval(gameState.trashGameInterval);
        gameState.trashGameInterval = null;
    }
    
    document.querySelectorAll('.game-section').forEach(section => {
        section.style.display = 'none';
    });
    document.getElementById(sectionId).style.display = 'block';
    
    // Only start trash game if not already running
    if (sectionId === 'trash-game' && !gameState.trashGameInterval) {
        startTrashGame();
    }
    
    // Update shop prices if entering shop
    if (sectionId === 'shop') {
        updateShopPrices();
    }
}

// Update shop prices
function updateShopPrices() {
    // Update compound interest price
    const compoundBtn = document.querySelector('[data-item="compoundInterest"]');
    if (compoundBtn) {
        const newCost = 500 + (gameState.powerups.compoundInterestPurchases * 250);
        compoundBtn.parentElement.querySelector('.price').textContent = `Cost: ${newCost}gc`;
    }
}

// Update display
function updateDisplay() {
    balanceEl.textContent = gameState.balance;
    jackpotEl.textContent = gameState.jackpot;
    betAmountEl.max = gameState.balance;
    
    // Update visual indicators
    if (gameState.powerups.insurance > 0) {
        insuranceIndicatorEl.classList.add('active');
        insuranceRoundsEl.textContent = gameState.powerups.insurance;
    } else {
        insuranceIndicatorEl.classList.remove('active');
    }
    
    updateCardAreaIndicators();
    
    // Update powerups display
    powerupListEl.innerHTML = '';
    
    if (gameState.powerups.wildcardsInDeck > 0) {
        addPowerupDisplay(`Wild Cards in deck: ${gameState.powerups.wildcardsInDeck}`);
    }
    if (gameState.powerups.passiveIncome > 0) {
        addPowerupDisplay(`Passive Income: +${gameState.powerups.passiveIncome}gc/round`);
    }
    if (gameState.powerups.lucky > 0) {
        addPowerupDisplay(`Lucky Charm (${gameState.powerups.lucky} rounds)`);
    }
    if (gameState.powerups.insurance > 0) {
        addPowerupDisplay(`Insurance (${gameState.powerups.insurance} rounds)`);
    }
    if (gameState.powerups.doubleOrNothingMaster) {
        addPowerupDisplay('Double or Nothing Master');
    }
    if (gameState.powerups.mulligan > 0) {
        addPowerupDisplay(`Mulligans: ${gameState.powerups.mulligan}`);
    }
    if (gameState.powerups.jokersWild > 0) {
        addPowerupDisplay(`Joker's Wild (${gameState.powerups.jokersWild} rounds)`);
    }
    if (gameState.powerups.compoundInterest > 0) {
        addPowerupDisplay(`Compound Interest: ${gameState.powerups.compoundInterest}%`);
    }
    
    saveGameState();
}

// Add powerup to display
function addPowerupDisplay(text) {
    const div = document.createElement('div');
    div.className = 'powerup-item';
    div.textContent = text;
    powerupListEl.appendChild(div);
}

// Sleep helper function
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Save game state - only persistent data
function saveGameState() {
    const persistentData = {
        balance: gameState.balance,
        jackpot: gameState.jackpot,
        powerups: gameState.powerups,
        lastSaved: new Date().toISOString()
    };
    localStorage.setItem('pokerGameState', JSON.stringify(persistentData));
}

// Load game state - only persistent data
function loadGameState() {
    const saved = localStorage.getItem('pokerGameState');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            // Only load persistent data, not current game state
            gameState.balance = data.balance || 500;
            gameState.jackpot = data.jackpot || 0;
            gameState.powerups = data.powerups || {
                wildcardsInDeck: 0,
                passiveIncome: 0,
                lucky: 0,
                insurance: 0,
                doubleOrNothingMaster: false,
                mulligan: 0,
                jokersWild: 0,
                compoundInterest: 0,
                compoundInterestPurchases: 0
            };
            
            // Handle old save format
            if (data.powerups) {
                // Convert old wildcard format
                if (typeof data.powerups.wildcard === 'number') {
                    gameState.powerups.wildcardsInDeck = Math.ceil(data.powerups.wildcard / 5);
                    delete gameState.powerups.wildcard;
                }
                // Convert old passive boolean to number
                if (typeof data.powerups.passive === 'boolean' && data.powerups.passive) {
                    gameState.powerups.passiveIncome = 5;
                } else if (typeof data.powerups.passiveIncome === 'undefined') {
                    gameState.powerups.passiveIncome = 0;
                }
                // Initialize new powerups if not present
                if (typeof data.powerups.doubleOrNothingMaster === 'undefined') {
                    gameState.powerups.doubleOrNothingMaster = false;
                }
                if (typeof data.powerups.mulligan === 'undefined') {
                    gameState.powerups.mulligan = 0;
                }
                if (typeof data.powerups.jokersWild === 'undefined') {
                    gameState.powerups.jokersWild = 0;
                }
                if (typeof data.powerups.compoundInterest === 'undefined') {
                    gameState.powerups.compoundInterest = 0;
                    gameState.powerups.compoundInterestPurchases = 0;
                }
            }
            
            // Welcome back message if returning player
            if (data.lastSaved) {
                const lastPlayed = new Date(data.lastSaved);
                const now = new Date();
                const hoursSince = Math.floor((now - lastPlayed) / (1000 * 60 * 60));
                
                if (hoursSince > 0) {
                    console.log(`Welcome back! You last played ${hoursSince} hours ago.`);
                }
            }
        } catch (e) {
            console.error('Error loading saved game:', e);
            // Reset to defaults if there's an error
            gameState.balance = 500;
            gameState.jackpot = 0;
        }
    }
}

// Make useMulligan available globally
window.useMulligan = useMulligan;

// Initialize the game
init();
