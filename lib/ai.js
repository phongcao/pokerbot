//=========================================================
// Import modules
//=========================================================

var Card = require('./card');
var Hand = require('./hand');

//=========================================================
// Constants
//=========================================================

var ALL_IN_MINIMAL_RANK                         = 3;
var ALL_IN_PROBABILITY                          = 70;

var RAISE_MINIMAL_RANK                          = 1;
var RAISE_PROBABILITY                           = 90;

function chooseBettingOption(communityCards, holeCards, bettingOptions, currentFunds, betAmount, currentBet)
{
    var boardHand = Hand.findBestHand(communityCards);
    var bestHand = Hand.findBestHand(communityCards.concat(holeCards));
    var rank = (bestHand.hand != null) ? bestHand.hand.rank : 0;
    var cardInHand = ((communityCards.length != 0) && (bestHand.hand.rank != boardHand.hand.rank));

    // All-In
    if (bettingOptions.indexOf('All-In') != -1)
    {
        if (rank >= ALL_IN_MINIMAL_RANK)
        {
            var result = random(ALL_IN_PROBABILITY);
            if (result)
            {
                return 'All-In';
            }
        }
    }

    // Raise/Bet
    if ((bettingOptions.indexOf('Raise') != -1) || (bettingOptions.indexOf('Bet') != -1))
    {
        if (rank >= RAISE_MINIMAL_RANK)
        {
            var result = random(RAISE_PROBABILITY);
            if (result)
            {
                if ((rank > RAISE_MINIMAL_RANK) || cardInHand)
                {
                    return (bettingOptions.indexOf('Raise') != -1) ? 'Raise' : 'Bet';
                }
            }
        }
    }

    // Call
    if (bettingOptions.indexOf('Call') != -1)
    {
        var probability = 100;
        probability -= 10 * communityCards.length;
        probability -= ((currentBet - betAmount) * 50) / currentFunds;
        probability += rank * 50;
        if (probability > 0)
        {
            var result = random(probability);
            if (result)
            {
                return 'Call';
            }
        }
    }

    // Check/Fold
    return (bettingOptions.indexOf('Check') != -1) ? 'Check' : 'Fold'; 
}

function random(probability)
{
    return (Math.floor(Math.random() * 100) <= probability) ? true : false;
}

//=========================================================
// Export
//=========================================================

module.exports.chooseBettingOption = chooseBettingOption;