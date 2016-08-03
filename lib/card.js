var Strings = require('./strings'); 

function Card(suit, value)
{
    this.suit = suit;
    this.value = value;

    // Get filename
    var suitName = '';
    var valueName = '';

    switch (suit)
    {
        case 0:
            suitName = Strings.Card.SPADES;
            break;

        case 1:
            suitName = Strings.Card.CLUBS;
            break;

        case 2:
            suitName = Strings.Card.DIAMONDS;
            break;

        case 3:
            suitName = Strings.Card.HEARTS;
            break;
    }

    switch (value)
    {
        case 9:
            valueName = Strings.Card.JACK;
            break;

        case 10:
            valueName = Strings.Card.QUEEN;
            break;

        case 11:
            valueName = Strings.Card.KING;
            break;

        case 12:
            valueName = Strings.Card.ACE;
            break;

        default:
            valueName = (value + 2).toString();
            break;
    }

    this.filename = valueName + '_of_' + suitName + '.png';
}

module.exports = Card;