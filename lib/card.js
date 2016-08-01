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
            suitName = 'spades';
            break;

        case 1:
            suitName = 'clubs';
            break;

        case 2:
            suitName = 'diamonds';
            break;

        case 3:
            suitName = 'hearts';
            break;
    }

    switch (value)
    {
        case 9:
            valueName = 'jack';
            break;

        case 10:
            valueName = 'queen';
            break;

        case 11:
            valueName = 'king';
            break;

        case 12:
            valueName = 'ace';
            break;

        default:
            valueName = (value + 2).toString();
            break;
    }

    this.filename = valueName + '_of_' + suitName + '.png';
}

module.exports = Card;