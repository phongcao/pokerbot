var Defs = require('./defs');
var Strings = require('./strings'); 
var Card = require('./card');
var Hand = require('./hand');

function chooseBettingOption(communityCards, holeCards, bettingOptions, currentFunds, betAmount, currentBet)
{
    var boardHand = Hand.findBestHand(communityCards);
    var bestHand = Hand.findBestHand(communityCards.concat(holeCards));
    var rank = (boardHand.hand != null) ? (bestHand.hand.rank - boardHand.hand.rank) : 0;

    // All-In
    if (bettingOptions.indexOf(Strings.ALL_IN) != -1)
    {
        var probability = Defs.AI.ALL_IN_PROBABILITY;
        probability += rank * Defs.AI.RANK_BONUS;
        var result = random(probability);
        if (result && rank >= Defs.AI.ALL_IN_MINIMAL_RANK)
        {
            return Strings.ALL_IN;
        }
    }

    // Raise/Bet
    if ((bettingOptions.indexOf(Strings.RAISE) != -1) || (bettingOptions.indexOf(Strings.BET) != -1))
    {
        var probability = Defs.AI.RAISE_PROBABILITY;
        probability += rank * Defs.AI.RANK_BONUS;
        var result = random(probability);
        if (result && rank >= Defs.AI.RAISE_MINIMAL_RANK)
        {
            return (bettingOptions.indexOf(Strings.RAISE) != -1) ? Strings.RAISE : Strings.BET;
        }
    }

    // Call
    if (bettingOptions.indexOf(Strings.CALL) != -1)
    {
        var probability = 100;
        probability += rank * Defs.AI.RANK_BONUS;
        probability -= Defs.AI.COMMUNITY_CARD_BONUS * communityCards.length;
        probability -= ((currentBet - betAmount) * 50) / currentFunds;
        if (probability > 0)
        {
            var result = random(probability);
            if (result)
            {
                return Strings.CALL;
            }
        }
    }

    // Check/Fold
    return (bettingOptions.indexOf(Strings.CHECK) != -1) ? Strings.CHECK : Strings.FOLD; 
}

function random(probability)
{
    return (Math.floor(Math.random() * 100) <= probability) ? true : false;
}

module.exports.chooseBettingOption = chooseBettingOption;