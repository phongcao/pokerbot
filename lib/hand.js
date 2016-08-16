//=========================================================
// Import modules
//=========================================================

var Defs = require('./defs');
var Strings = require('./strings'); 
var Card = require('./card');
var Combinations = require('./combinations');

//=========================================================
// Main
//=========================================================

function Hand(cards)
{
    return analyzeHands(cards);
}

function analyzeHands(cards)
{
    // Sort card
    var sortedCards = cards.slice();
    sortCards(sortedCards);

    // Group cards
    var cardGroups = {};
    var length = cards.length;
    var i = 0;
    while (i < length)
    {
        var count = 1;

        while ((i < (length - 1)) && (sortedCards[i].value == sortedCards[i + 1].value))
        {
            count++;
            i++;
        }

        if (!cardGroups[count])
        {
            cardGroups[count] = [];
        }

        cardGroups[count].push(sortedCards[i]);
        i++;
    }

    // Analyze hands
    var hands = [];
    var lastHand = null;
    for (var i = 4; i >= 1; i--)
    {
        if (cardGroups[i])
        {
            for (var j = 0; j < cardGroups[i].length; j++)
            {
                var hand = {};
                hand.highcard = cardGroups[i][j];

                switch (i)
                {
                    case 4:
                        hand.name = Strings.Hand.FOUR_OF_A_KIND;
                        hand.rank = Defs.Hand.Ranking.FOUR_OF_A_KIND;
                        break;

                    case 3:
                        hand.name = Strings.Hand.THREE_OF_A_KIND;
                        hand.rank = Defs.Hand.Ranking.THREE_OF_A_KIND;
                        break;

                    case 2:
                        hand.name = Strings.Hand.ONE_PAIR;
                        hand.rank = Defs.Hand.Ranking.ONE_PAIR;               
                        if (lastHand)
                        {
                            if (lastHand.rank == Defs.Hand.Ranking.THREE_OF_A_KIND)
                            {
                                hands.splice(hands.length - 1, 1);
                                hand.name = Strings.Hand.FULL_HOUSE;
                                hand.rank = Defs.Hand.Ranking.FULL_HOUSE;
                                hand.pair = hand.highcard;
                                hand.highcard = lastHand.highcard;
                            }
                            else if (lastHand.rank == Defs.Hand.Ranking.ONE_PAIR)
                            {
                                hands.splice(hands.length - 1, 1);
                                hand.name = Strings.Hand.TWO_PAIRS;
                                hand.rank = Defs.Hand.Ranking.TWO_PAIRS;
                                hand.highpair = lastHand.highcard;
                                hand.lowpair = hand.highcard;
                            }
                        }
                        
                        break;

                    case 1:
                        hand.name = Strings.Hand.HIGH_CARD;
                        hand.rank = Defs.Hand.Ranking.HIGH_CARD;
                        break;                           
                }

                lastHand = hand;
                hands.push(hand);
            }
        }
    }

    // Handle Flush and Straight hands
    if (sortedCards.length == Defs.Hand.MAX_CARDS)
    {
        var hand = {};
        var hasFlush = true;
        var hasStraight = true;
        var updateHands = false;
        hand.highcard = sortedCards[0];
        for (var i = 0; i < Defs.Hand.MAX_CARDS - 1; i++)
        {
            if (hasFlush && (sortedCards[i + 1].suit != sortedCards[i].suit))
            {
                hasFlush = false;
            }

            if (hasStraight && (sortedCards[i + 1].value != (sortedCards[i].value - 1)))
            {
                hasStraight = false;
            }        
        }

        if (hasFlush && hasStraight)
        {
            hand.name = (sortedCards[0].value == 8) ? Strings.Hand.ROYAL_FLUSH : Strings.Hand.STRAIGHT_FLUSH;
            hand.rank = (sortedCards[0].value == 8) ? Defs.Hand.Ranking.ROYAL_FLUSH : Defs.Hand.Ranking.STRAIGHT_FLUSH;
            updateHands = true;
        }
        else if (hasStraight)
        {
            hand.name = Strings.Hand.STRAIGHT;
            hand.rank = Defs.Hand.Ranking.STRAIGHT;
            updateHands = true;
        }
        else if (hasFlush && hands[0].rank < Defs.Hand.Ranking.FLUSH)
        {
            hand.name = Strings.Hand.FLUSH;
            hand.rank = Defs.Hand.Ranking.FLUSH;
            hand.highcards = sortedCards;
            updateHands = true;
        }

        if (updateHands)
        {
            hands = [];
            hands.push(hand);
        }
    }

    return hands;
}

function calculateStrength(hand)
{
    var totalStrength = 0;
    var totalHighcard = 5;
    
    for (var i = 0; i < hand.length; i++)
    {
        var strength = Defs.Hand.BaseStrength[hand[i].rank];

        switch (hand[i].rank)
        {
            case Defs.Hand.Ranking.STRAIGHT_FLUSH:
                strength += hand[i].highcard.value;
                break;

            case Defs.Hand.Ranking.FOUR_OF_A_KIND:
                strength += Math.pow(hand[i].highcard.value, 2);
                totalHighcard = 1;
                break;    

            case Defs.Hand.Ranking.FULL_HOUSE:
                strength += Math.pow(hand[i].highcard.value, 2) + hand[i].pair.value;
                break;         

            case Defs.Hand.Ranking.FLUSH:
                var length = hand[i].highcards.length;
                for (var j = 0; j < length; j++)
                {
                    strength += Math.pow(hand[i].highcards[j].value, length - j);
                }

                break;

            case Defs.Hand.Ranking.STRAIGHT:
                strength += hand[i].highcard.value - 4;
                break;             

            case Defs.Hand.Ranking.THREE_OF_A_KIND:
                strength += Math.pow(hand[i].highcard.value, 3);
                totalHighcard = 2;
                break;               

            case Defs.Hand.Ranking.TWO_PAIRS:
                strength += Math.pow(hand[i].highpair.value, 3) + Math.pow(hand[i].lowpair.value, 2);
                totalHighcard = 1;
                break;        

            case Defs.Hand.Ranking.ONE_PAIR:
                strength += Math.pow(hand[i].highcard.value, 4);
                totalHighcard = 3;
                break;          

            case Defs.Hand.Ranking.HIGH_CARD:
                strength += Math.pow(hand[i].highcard.value, totalHighcard);
                totalHighcard--;
                break;                                                                              
        }

        totalStrength += strength;
    }

    return totalStrength;
}

function compare(hand1, hand2)
{
    var hand1Strength = calculateStrength(hand1);
    var hand2Strength = calculateStrength(hand2);

    if (hand1Strength == hand2Strength)
    {
        return 0;
    }

    return (hand1Strength < hand2Strength) ? -1 : 1;
}

function findBestHand(cards)
{
    var combinations = Combinations.k_combinations(cards, Math.min(Defs.Hand.MAX_CARDS, cards.length));
    var result = {};
    var maxHandIndex = -1;
    var hands = [];

    for (var i = 0; i < combinations.length; i++)
    {
        hands.push(new Hand(combinations[i]));

        if ((maxHandIndex == -1) || (compare(hands[i], hands[maxHandIndex]) == 1))
        {
            maxHandIndex = i;
        }
    }

    result.combination = combinations[maxHandIndex];
    result.hand = hands[maxHandIndex];

    return result;
}

function cardInHand(card, hand)
{
    for (var i = 0; i < hand.length; i++)
    {
        if ((card.suit == hand[i].suit) && (card.value == hand[i].value))
        {
            return true;
        }
    }

    return false;
}

function sortCards(cards)
{
    cards.sort(function(card1, card2)
    {
        return (card2.value - card1.value);
    });
}

//=========================================================
// Export
//=========================================================

module.exports = Hand;
module.exports.compare = compare;
module.exports.findBestHand = findBestHand;
module.exports.cardInHand = cardInHand;