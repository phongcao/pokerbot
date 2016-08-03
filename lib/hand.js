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
    var hand = {};
    var sortedCards = cards.slice();

    // Sort cards
    sortCards(sortedCards);

    // Royal Flush
    hand = getRoyalFlushHand(sortedCards);

    // Straight Flush
    if (isEmpty(hand))
    {
	    hand = getStraightFlushHand(sortedCards);
    }

    // Four of a kind
    if (isEmpty(hand))
    {
	    hand = getFourOfAKindHand(sortedCards);
    }

    // Full house
    if (isEmpty(hand))
    {
	    hand = getFullHouseHand(sortedCards);
    }

    // Flush
    if (isEmpty(hand))
    {
	    hand = getFlushHand(sortedCards);
    }

    // Straight
    if (isEmpty(hand))
    {
	    hand = getStraightHand(sortedCards);
    }

    // Three Of A Kind
    if (isEmpty(hand))
    {
	    hand = getThreeOfAKindHand(sortedCards);
    }

    // Two pairs
    if (isEmpty(hand))
    {
	    hand = getTwoPairsHand(sortedCards);
    }

    // One pair
    if (isEmpty(hand))
    {
	    hand = getOnePairHand(sortedCards);
    }

    // High card
    if (isEmpty(hand))
    {
        hand = getHighCardHand(sortedCards);
    }

    return hand;
}

function getRoyalFlushHand(cards)
{
    var hand = {};
    var suit = cards[0].suit;
    var value = cards[0].value;

    // Not enough cards
    if (cards.length != Defs.Hand.MAX_CARDS)
    {
        return hand;
    }
    
    // Ten card
    if (value != 8)
    {
        return hand;
    }

    for (var i = 1; i < cards.length; i++)
    {
        if ((cards[i].suit != suit) || (cards[i].value != cards[i - 1].value + 1))
        {
            return hand;
        }
    }

    hand.name = Strings.Hand.ROYAL_FLUSH;
    hand.rank = Defs.Hand.Ranking.ROYAL_FLUSH;
    hand.suit = suit;

    return hand;
}

function getStraightFlushHand(cards)
{
    var hand = {};
    var suit = cards[0].suit;
    var value = cards[0].value;

    // Not enough cards
    if (cards.length != Defs.Hand.MAX_CARDS)
    {
        return hand;
    }
    
    for (var i = 1; i < cards.length; i++)
    {
        if ((cards[i].suit != suit) || (cards[i].value != cards[i - 1].value + 1))
        {
            return hand;
        }
    }

    hand.name = Strings.Hand.STRAIGHT_FLUSH;
    hand.rank = Defs.Hand.Ranking.STRAIGHT_FLUSH;
    hand.suit = suit;
    hand.highcard = cards[4].value;

    return hand;
}

function getFlushHand(cards)
{
    var hand = {};
    var suit = cards[0].suit;

    // Not enough cards
    if (cards.length != Defs.Hand.MAX_CARDS)
    {
        return hand;
    }
    
    for (var i = 1; i < cards.length; i++)
    {
        if (cards[i].suit != suit)
        {
            return hand;
        }
    }

    hand.name = Strings.Hand.FLUSH;
    hand.rank = Defs.Hand.Ranking.FLUSH;
    hand.suit = suit;
    hand.highcard = cards[4].value;

    return hand;
}

function getStraightHand(cards)
{
    var hand = {};
    var value = cards[0].value;

    // Not enough cards
    if (cards.length != Defs.Hand.MAX_CARDS)
    {
        return hand;
    }
    
    for (var i = 1; i < cards.length; i++)
    {
        if (cards[i].value != cards[i - 1].value + 1)
        {
            return hand;
        }
    }

    hand.name = Strings.Hand.STRAIGHT;
    hand.rank = Defs.Hand.Ranking.STRAIGHT;
    hand.highcard = cards[4].value;

    return hand;
}

function getFourOfAKindHand(cards)
{
    var hand = {};
    var value = cards[0].value;
    var count = 1;

    // Not enough cards
    if (cards.length < 4)
    {
        return hand;
    }
    
    for (var i = 1; i < cards.length; i++)
    {
        if (cards[i].value == cards[i - 1].value)
        {
            count++;

            if (count == 4)
            {
                value = cards[i].value;
                break;
            }
        }
        else
        {
            count = 1;
        }
    }

    if (count == 4)
    {
        hand.name = Strings.Hand.FOUR_OF_A_KIND;
        hand.rank = Defs.Hand.Ranking.FOUR_OF_A_KIND;
        hand.highcard = value;
        hand.value = sumCardValue(cards);
    }

    return hand;
}

function getThreeOfAKindHand(cards)
{
    var hand = {};
    var value = cards[0].value;
    var count = 1;

    // Not enough cards
    if (cards.length < 3)
    {
        return hand;
    }
    
    for (var i = 1; i < cards.length; i++)
    {
        if (cards[i].value == cards[i - 1].value)
        {
            count++;

            if (count == 3)
            {
                value = cards[i].value;
                break;
            }
        }
        else
        {
            count = 1;
        }
    }

    if (count == 3)
    {
        hand.name = Strings.Hand.THREE_OF_A_KIND;
        hand.rank = Defs.Hand.Ranking.THREE_OF_A_KIND;
        hand.highcard = value;
        hand.value = sumCardValue(cards);
    }

    return hand;
}

function getFullHouseHand(cards)
{
    var hand = {};
    var hasFullHouse = false;
    var threeOfAKindValue = cards[0].value;
    var pairValue = cards[0].value;

    // Not enough cards
    if (cards.length != Defs.Hand.MAX_CARDS)
    {
        return hand;
    }

    if (cards[0].value == cards[1].value && cards[1].value == cards[2].value && cards[3].value == cards[4].value)
    {
        hasFullHouse = true;
        threeOfAKindValue = cards[0].value;
        pairValue = cards[3].value;
    }

    if (cards[0].value == cards[1].value && cards[2].value == cards[3].value && cards[3].value == cards[4].value)
    {
        hasFullHouse = true;
        threeOfAKindValue = cards[2].value;
        pairValue = cards[0].value;
    }
  
    if (hasFullHouse)
    {
        hand.name = Strings.Hand.FULL_HOUSE;
        hand.rank = Defs.Hand.Ranking.FULL_HOUSE;
        hand.highcard = threeOfAKindValue;
        hand.lowcard = pairValue;
    }

    return hand;
}

function getTwoPairsHand(cards)
{
    var hand = {};
    var pairs = [];

    // Not enough cards
    if (cards.length < 4)
    {
        return hand;
    }

    for (var i = 1; i < cards.length; i++)
    {
        if (cards[i].value == cards[i - 1].value)
        {
            pairs.push(cards[i].value);
        }
    }
  
    if (pairs.length == 2)
    {
        hand.name = Strings.Hand.TWO_PAIRS;
        hand.rank = Defs.Hand.Ranking.TWO_PAIRS;
        hand.highcard = (pairs[0] > pairs[1]) ? pairs[0] : pairs[1];
        hand.lowcard = (pairs[0] < pairs[1]) ? pairs[0] : pairs[1];
        hand.value = sumCardValue(cards);
    }

    return hand;
}

function getOnePairHand(cards)
{
    var hand = {};
    var value = cards[0].value;
    var hasPair = false;
    
    for (var i = 1; i < cards.length; i++)
    {
        if (cards[i].value == cards[i - 1].value)
        {
            if (hasPair)
            {
                if (cards[i].value > value)
                {
                    value = cards[i].value;
                }
            }
            else
            {
                value = cards[i].value;
                hasPair = true;
            }
        }
    }

    if (hasPair)
    {
        hand.name = Strings.Hand.ONE_PAIR;
        hand.rank = Defs.Hand.Ranking.ONE_PAIR;
        hand.highcard = value;
        hand.value = sumCardValue(cards);
    }

    return hand;
}

function getHighCardHand(cards)
{
    var hand = {};
    hand.name = Strings.Hand.HIGH_CARD;
    hand.rank = Defs.Hand.Ranking.HIGH_CARD;
    hand.highcard = cards[cards.length - 1].value;
    hand.value = sumCardValue(cards);

    return hand;
}

function sortCards(cards)
{
    cards.sort(function(card1, card2)
    {
        return (card1.value - card2.value);
    });
}

function maxCardValue(cards)
{
    var maxValue = cards[0].value;

    for (var i = 1; i < cards.length; i++)
    {
        if (cards[i].value > maxValue)
        {
            maxValue = cards[i].value;
        }
    }

    return maxValue;
}

function sumCardValue(cards)
{
    var sum = 0;

    for (var i = 0; i < cards.length; i++)
    {
        sum += cards[i].value;
    }

    return sum;
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

function isEmpty(obj)
{
    return (JSON.stringify(obj) === '{}');
}

function isGreater(hand1, hand2)
{
    if (hand1.rank > hand2.rank)
    {
        return true;
    }
    else if (hand1.rank == hand2.rank)
    {
        if (hand1.highcard > hand2.highcard)
        {
            return true;
        }
        else if (hand1.highcard == hand2.highcard)
        {
            if ((hand1.name == Strings.Hand.FULL_HOUSE || hand1.name == Strings.Hand.TWO_PAIRS) && (hand1.lowcard > hand2.lowcard))
            {
                return true;
            }

            if (hand1.value > hand2.value)
            {
                return true;
            }
        }
    }

    return false;
}

function isEqual(hand1, hand2)
{
    if (hand1.rank == hand2.rank)
    {
        if (hand1.highcard == hand2.highcard)
        {
            if ((hand1.name == Strings.Hand.FULL_HOUSE || hand1.name == Strings.Hand.TWO_PAIRS) && (hand1.lowcard == hand2.lowcard))
            {
                return true;
            }

            if (hand1.value == hand2.value)
            {
                return true;
            }
        }
    }

    return false;
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

        if ((maxHandIndex == -1) || (Hand.isGreater(hands[i], hands[maxHandIndex])))
        {
            maxHandIndex = i;
        }
    }

    result.combination = combinations[maxHandIndex];
    result.hand = hands[maxHandIndex];

    return result;
}

//=========================================================
// Export
//=========================================================

module.exports = Hand;
module.exports.isGreater = isGreater;
module.exports.isEqual = isEqual;
module.exports.cardInHand = cardInHand;
module.exports.findBestHand = findBestHand;