var fs = require('fs');
var path = require('path');
var Defs = require('./defs');
var Strings = require('./strings');
var Hand = require('./hand');

function Player(session, isNPC, funds, cardPosX, cardPosY, dealerChipX, dealerChipY)
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
    this.foldCount = (isNPC) ? 0 : session.userData.playerInfo.fold;
    this.checkCount = (isNPC) ? 0 : session.userData.playerInfo.check;
    this.callCount = (isNPC) ? 0 : session.userData.playerInfo.call;
    this.betCount = (isNPC) ? 0 : session.userData.playerInfo.bet;
    this.raiseCount = (isNPC) ? 0 : session.userData.playerInfo.raise;
    this.reraiseCount = (isNPC) ? 0 : session.userData.playerInfo.reraise;
    this.allInCount = (isNPC) ? 0 : session.userData.playerInfo.allin;

    // Add one new card
    this.addCard = function (card)
    {
        this.holeCards.push(card);
    };

    // Reset
    this.reset = function ()
    {
        this.holeCards = [];
        this.isWinner = false;
        this.betOption = '';
        this.betAmount = 0;
    }

    // Fold
    this.fold = function ()
    {
        this.betOption = Strings.FOLD;
        this.foldCount++;
    }

    // Check
    this.check = function ()
    {
        this.betOption = Strings.CHECK;
        this.checkCount++;
    }

    // Call
    this.call = function (amount)
    {
        this.betAmount += amount;
        this.currentFunds -= amount;
        this.betOption = Strings.CALL;
        this.callCount++;
    }

    // Bet
    this.bet = function (amount)
    {
        this.betAmount = amount;
        this.currentFunds -= amount;
        this.betOption = Strings.BET;
        this.betCount++;
    }

    // Raise
    this.raise = function (currentBet, raiseAmount, reraise)
    {
        if (this.betAmount < currentBet)
        {
            var callAmount = currentBet - this.betAmount;
            this.betAmount += callAmount;
            this.currentFunds -= callAmount;
        }

        this.betAmount += raiseAmount;
        this.currentFunds -= raiseAmount;
        this.betOption = Strings.RAISE;
        if (reraise)
        {
            this.reraiseCount++;
        }
        else
        {
            this.raiseCount++;
        }
    }

    // All-In
    this.allIn = function ()
    {
        this.betAmount += this.currentFunds;
        this.currentFunds = 0;
        this.betOption = Strings.ALL_IN;
        this.allInCount++;
    }

    // Pass (Out of chips)
    this.pass = function ()
    {
        this.betOption = Strings.PASS;
    }

    // Receive
    this.receive = function (amount)
    {
        this.currentFunds += amount;
    }

    // Get available betting options
    this.getBettingOptions = function (bigBlind, raiseRate, currentBet)
    {
        var bettingOptions = [];

        bettingOptions.push(Strings.FOLD);

        if (this.betAmount < currentBet)
        {
            if (this.currentFunds < (currentBet - this.betAmount))
            {
                bettingOptions.push(Strings.ALL_IN);
            }
            else
            {
                bettingOptions.push(Strings.CALL);
            }
        }
        else if (this.betAmount == currentBet)
        {
            bettingOptions.push(Strings.CHECK);
        }

        if ((currentBet == 0) && (this.currentFunds >= bigBlind))
        {
            bettingOptions.push(Strings.BET);
        }
        else if ((currentBet != 0) && (this.currentFunds >= ((currentBet - this.betAmount) + (currentBet * raiseRate))))
        {
            bettingOptions.push(Strings.RAISE);
        }

        if (bettingOptions.indexOf(Strings.ALL_IN) == -1)
        {
            bettingOptions.push(Strings.ALL_IN);
        }

        return bettingOptions;
    }

    // Log player's actions to file
    this.log = function (session, communityCards, pot, rival)
    {
        var file = path.join(session.userData.localDir, Defs.Path.PLAYER_LOG_FILE);

        // Write header row
        if (!fs.existsSync(file))
        {
            var header = ['Remaining Cards', 'Pot', 'Bet', 'Funds', 'Rival Check/Fold(%)', 'Rival Call(%)', 'Rival Bet/Raise(%)', 'Rival All-In(%)', 'Rival Bet', 'Rival Funds', 'Check/Fold', 'Call', 'Bet/Raise', 'All-In', 'Hand Strength'];
            fs.appendFileSync(file, header.join(','));  
        }

        // Write player's data
        var remainingCards = Defs.Board.MAX_CARDS - communityCards.length;
        var rivalActionCount = rival.foldCount + rival.checkCount + rival.callCount + rival.betCount + rival.raiseCount + rival.reraiseCount + rival.allInCount;
        var rivalCheckFoldPercent = ((rival.checkCount + rival.foldCount) * 100) / rivalActionCount;
        var rivalCallPercent = (rival.callCount * 100) / rivalActionCount;
        var rivalBetRaisePercent = ((rival.betCount + rival.raiseCount + rival.reraiseCount) * 100) / rivalActionCount;
        var rivalAllInPercent = (rival.allInCount * 100) / rivalActionCount;
        var checkFold = ((this.betOption === Strings.CHECK) || (this.betOption === Strings.FOLD)) ? 1 : 0;
        var call = (this.betOption === Strings.CALL) ? 1 : 0;
        var betRaise = ((this.betOption === Strings.BET) || (this.betOption === Strings.RAISE)) ? 1 : 0;
        var allIn = (this.betOption === Strings.ALL_IN) ? 1 : 0;
        var boardHandStrength = 0;
        if (communityCards.length != 0)
        {
            var communityCardsHands = new Hand(communityCards);
            boardHandStrength = communityCardsHands[0].rank;
        }

        var bestHands = Hand.findBestHand(communityCards.concat(this.holeCards)).hand;
        var bestHandStrength = bestHands[0].rank;
        var handStrength = (bestHandStrength == boardHandStrength) ? 0 : bestHandStrength;
        var logData = [remainingCards, pot, this.betAmount, this.currentFunds, 
                       rivalCheckFoldPercent | 0, rivalCallPercent | 0, rivalBetRaisePercent | 0, rivalAllInPercent | 0, 
                       rival.betAmount, rival.currentFunds, checkFold, call, betRaise, allIn, handStrength];
        fs.appendFileSync(file, '\n' + logData.join(','));        
    }
}

module.exports = Player;