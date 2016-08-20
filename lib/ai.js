var Defs = require('./defs');
var Strings = require('./strings'); 
var Card = require('./card');
var Hand = require('./hand');
var Player = require('./player');

function chooseBettingOption(communityCards, holeCards, bettingOptions, currentFunds, betAmount, currentBet, rival)
{
    var boardHand = Hand.findBestHand(communityCards);
    var bestHand = Hand.findBestHand(communityCards.concat(holeCards));
    var rank = (boardHand.hand != null) ? (bestHand.hand[0].rank - boardHand.hand[0].rank) : 0;
    var rivalPlayingStyle = getPlayingStyle(rival);
    var winPercentage = calculateWinPercentage(communityCards, holeCards);

    // All-In
    if (bettingOptions.indexOf(Strings.ALL_IN) != -1)
    {
        var percentage = (rivalPlayingStyle == Defs.AI.PlayingStyle.LOOSE_AGGRESSIVE || rivalPlayingStyle == Defs.AI.PlayingStyle.LOOSE_PASSIVE) ? 
                         Defs.AI.ALL_IN_WIN_PERCENTAGE_LOOSE : Defs.AI.ALL_IN_WIN_PERCENTAGE_TIGHT;

        if (winPercentage >= percentage)
        {
            return Strings.ALL_IN;
        }
    }

    // Raise/Bet
    if ((bettingOptions.indexOf(Strings.RAISE) != -1) || (bettingOptions.indexOf(Strings.BET) != -1))
    {
        var percentage = (rivalPlayingStyle == Defs.AI.PlayingStyle.LOOSE_AGGRESSIVE || rivalPlayingStyle == Defs.AI.PlayingStyle.LOOSE_PASSIVE) ? 
                         Defs.AI.RAISE_WIN_PERCENTAGE_LOOSE : Defs.AI.RAISE_WIN_PERCENTAGE_TIGHT;
        percentage += ((betAmount - currentBet) * 10) / Defs.Board.ROUND_BUYINS;

        if (winPercentage >= percentage)
        {
            return (bettingOptions.indexOf(Strings.RAISE) != -1) ? Strings.RAISE : Strings.BET;
        }
    }

    // Call
    if (bettingOptions.indexOf(Strings.CALL) != -1)
    {
        var percentage = (rivalPlayingStyle == Defs.AI.PlayingStyle.LOOSE_AGGRESSIVE || rivalPlayingStyle == Defs.AI.PlayingStyle.TIGHT_AGGRESSIVE) ? 
                         Defs.AI.CALL_WIN_PERCENTAGE_AGGRESSIVE : Defs.AI.CALL_WIN_PERCENTAGE_PASSIVE;          
        percentage += ((currentBet - betAmount) * Defs.AI.BET_AMOUNT_BONUS) / Defs.Board.ROUND_BUYINS;

        if (winPercentage >= percentage)
        {
            return Strings.CALL;
        }
    }

    // Check/Fold
    return (bettingOptions.indexOf(Strings.CHECK) != -1) ? Strings.CHECK : Strings.FOLD; 
}

function random(probability)
{
    return (Math.floor(Math.random() * 100) <= probability) ? true : false;
}

function getPlayingStyle(player)
{
    var foldCount = player.foldCount;
    var checkCallCount = player.checkCount + player.callCount;
    var betRaiseCount = player.betCount + player.raiseCount + player.reraiseCount + player.allInCount;
    var aggressive = (checkCallCount < betRaiseCount) ? true : false;
    var playingStyle = 0;

    // Tight
    if (foldCount >= (checkCallCount + betRaiseCount))
    {
        playingStyle = (aggressive) ? Defs.AI.PlayingStyle.TIGHT_AGGRESSIVE : Defs.AI.PlayingStyle.TIGHT_PASSIVE;
    }
    // Loose
    else
    {
        playingStyle = (aggressive) ? Defs.AI.PlayingStyle.LOOSE_AGGRESSIVE : Defs.AI.PlayingStyle.LOOSE_PASSIVE;
    }

    return playingStyle;
}

function calculateWinPercentage(communityCards, holeCards)
{
    var winningRate = 0;

    for (var i = 0; i < 100; i++)
    {
        var randomBoardCards = getRandomBoardCards(communityCards, holeCards);
        var randomCommunityCards = communityCards.concat(randomBoardCards.splice(0, Defs.Board.MAX_CARDS - communityCards.length));
        var randomRivalCards = randomBoardCards.splice(0, 2);
        var bestAIHand = Hand.findBestHand(randomCommunityCards.concat(holeCards));
        var bestRandomRivalHand = Hand.findBestHand(randomCommunityCards.concat(randomRivalCards));

        if (Hand.compare(bestAIHand.hand, bestRandomRivalHand.hand) == 1)
        {
            winningRate++;
        }
    }

    return winningRate;
}

function getRandomBoardCards(communityCards, holeCards)
{
    // Initialize the board cards
    var boardCards = [];
    var existingCards = communityCards.concat(holeCards);

    for (var i = 0; i < Defs.Card.NUMBER_OF_SUITS; i++)
    {
        for (var j = 0; j < Defs.Card.NUMBER_OF_VALUES; j++)
        {
            var existingCard = false;

            for (var k = 0; k < existingCards.length; k++)
            {
                if (existingCards[k].suit == i && existingCards[k].value == j)
                {
                    existingCard = true;
                    break;
                }
            }

            if (!existingCard)
            {
                var card = new Card(i, j);
                boardCards.push(card);
            }
        }
    }

    // Shuffle the board cards
    for (var i = 0; i < Defs.Board.DECK_SHUFFLE_TIMES; i++)
    {
        var cardIndex1 = Math.floor(Math.random() * boardCards.length);
        var cardIndex2 = Math.floor(Math.random() * boardCards.length);
        var card = boardCards[cardIndex1];
        boardCards[cardIndex1] = boardCards[cardIndex2];
        boardCards[cardIndex2] = card;
    }

    return boardCards;
}

module.exports.chooseBettingOption = chooseBettingOption;