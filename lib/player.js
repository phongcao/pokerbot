var fs = require('fs');
var path = require('path');
var Defs = require('./defs');
var Strings = require('./strings');
var Hand = require('./hand');

function Player(isNPC, funds, cardPosX, cardPosY, dealerChipX, dealerChipY)
{
    this.isNPC = isNPC;
    this.cardPosX = cardPosX;
    this.cardPosY = cardPosY;
    this.dealerChipX = dealerChipX;
    this.dealerChipY = dealerChipY;
    this.holeCards = [];
    this.isWinner = false;
    this.currentFunds = funds;
    this.betOption = '';
    this.betAmount = 0;
    this.foldCount = 0;
    this.checkCount = 0;
    this.callCount = 0;
    this.betCount = 0;
    this.raiseCount = 0;
    this.reraiseCount = 0;
    this.allInCount = 0;
}

// Add one new card
function addCard(player, card)
{
    player.holeCards.push(card);
};

// Reset
function reset(player)
{
    player.holeCards = [];
    player.isWinner = false;
    player.betOption = '';
    player.betAmount = 0;
}

// Fold
function fold(player)
{
    player.betOption = Strings.FOLD;
    player.foldCount++;
}

// Check
function check(player)
{
    player.betOption = Strings.CHECK;
    player.checkCount++;
}

// Call
function call(player, amount)
{
    player.betAmount += amount;
    player.currentFunds -= amount;
    player.betOption = Strings.CALL;
    player.callCount++;
}

// Bet
function bet(player, amount)
{
    player.betAmount = amount;
    player.currentFunds -= amount;
    player.betOption = Strings.BET;
    player.betCount++;
}

// Raise
function raise(player, currentBet, raiseAmount, reraise)
{
    if (player.betAmount < currentBet)
    {
        var callAmount = currentBet - player.betAmount;
        player.betAmount += callAmount;
        player.currentFunds -= callAmount;
    }

    player.betAmount += raiseAmount;
    player.currentFunds -= raiseAmount;
    player.betOption = Strings.RAISE;
    if (reraise)
    {
        player.reraiseCount++;
    }
    else
    {
        player.raiseCount++;
    }
}

// All-In
function allIn(player)
{
    player.betAmount += player.currentFunds;
    player.currentFunds = 0;
    player.betOption = Strings.ALL_IN;
    player.allInCount++;
}

// Pass (Out of chips)
function pass(player)
{
    player.betOption = Strings.PASS;
}

// Receive
function receive(player, amount)
{
    player.currentFunds += amount;
}

// Get available betting options
function getBettingOptions(player, bigBlind, raiseRate, currentBet)
{
    var bettingOptions = [];

    bettingOptions.push(Strings.FOLD);

    if (player.betAmount < currentBet)
    {
        bettingOptions.push(Strings.CALL);
    }
    else if (player.betAmount == currentBet)
    {
        bettingOptions.push(Strings.CHECK);
    }

    if ((currentBet == 0) && (player.currentFunds >= bigBlind))
    {
        bettingOptions.push(Strings.BET);
    }
    else if ((currentBet != 0) && (player.currentFunds >= ((currentBet - player.betAmount) + (currentBet * raiseRate))))
    {
        bettingOptions.push(Strings.RAISE);
    }

    bettingOptions.push(Strings.ALL_IN);

    return bettingOptions;
}

//=========================================================
// Export
//=========================================================

module.exports = Player;
module.exports.addCard = addCard;
module.exports.reset = reset;
module.exports.fold = fold;
module.exports.check = check;
module.exports.call = call;
module.exports.bet = bet;
module.exports.raise = raise;
module.exports.allIn = allIn;
module.exports.pass = pass;
module.exports.receive = receive;
module.exports.getBettingOptions = getBettingOptions;
