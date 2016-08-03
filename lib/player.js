var Strings = require('./strings'); 

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
        this.foldCount = 0;
        this.checkCount = 0;
        this.callCount = 0;
        this.betCount = 0;
        this.raiseCount = 0;
        this.reraiseCount = 0;
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
        this.raiseCount++;
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
}

module.exports = Player;