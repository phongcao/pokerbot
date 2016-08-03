module.exports = 
{
    // Global
    SERVER_LISTENING:   "%s listening to %s",
    HI_ALL:             "Hello everyone!",
    BYE_ALL:            "Goodbye",
    HI:                 "Hi %s, thanks for adding me.",
    BYE:                "Ok... See you later!",
    THERE:              "there",
    ALL_IN:             "All-In",
    RAISE:              "Raise",
    BET:                "Bet",
    CALL:               "Call",
    CHECK:              "Check",
    FOLD:               "Fold",
    POT:                "Pot",
    BOT:                "Bot",
    YES:                "Yes",
    NO:                 "No",
    PLAYER_WIN:         "You won! Your current funds is $",
    PLAYER_LOSE:        "Sorry, you have lost the match. Your current funds is $",  
    RESET_GAME:         "You don't have enough money to play. Reset your statistics and start over?",
    HELP:               "Global commands that are available anytime:\n\n" + 
                        "* menu - Exits an ongoing game and returns to the menu (you'll lose your bet).\n" +
                        "* reset - Reset your statistics and start over.\n" +
                        "* help - Displays these commands.\n\n" + 
                        "Game assets:\n\n" + 
                        "http://opengameart.org/content/playing-cards-vector-png\n\n" +
                        "http://opengameart.org/content/colorful-poker-card-back\n\n" + 
                        "http://www.kenney.nl\n\n" + 
                        "http://www.dafont.com/roboto.font?l[]=10&l[]=1",

    // Dialog
    Dialog:
    {
        ROOT:           "/",
        HELP:           "/help",
        MENU:           "/menu",
        RESET:          "/reset",
        GAME:           "/game",
    },

    // Dialog action
    DialogAction:
    {
        HELP:           "help",
        MENU:           "menu",
        RESET:          "reset",
        RELOAD_MENU:    "reloadMenu"
    },

    // Statistics
    Statistics: 
    {
        FUNDS:          "\n\nFunds: ",
        WIN:            "\n\nWin: ",
        FOLD:           "\n\nFold: ",
        CHECK:          "\n\nCheck: ",
        CALL:           "\n\nCall: ",
        BET:            "\n\nBet: ",
        RAISE:          "\n\nRaise: ",
        RERAISE:        "\n\nRe-raise: "
    },

    // Menu
    Menu: 
    {
        NEW_GAME:       "New game",
        STATISTICS:     "Statistics",
        LEADERBOARD:    "Leaderboard",
        NEXT_ROUND:     "Next round"
    },

    // Card
    Card: 
    {
        SPADES:         "spades",
        CLUBS:          "clubs",
        DIAMONDS:       "diamonds",
        HEARTS:         "hearts",
        JACK:           "jack",
        QUEEN:          "queen",
        KING:           "king",
        ACE:            "ace",
    },

    // Hand
    Hand: 
    {
        ROYAL_FLUSH:            "ROYAL FLUSH",
        STRAIGHT_FLUSH:         "STRAIGHT FLUSH",
        FLUSH:                  "FLUSH",
        STRAIGHT:               "STRAIGHT",
        FOUR_OF_A_KIND:         "FOUR OF A KIND",
        THREE_OF_A_KIND:        "THREE OF A KIND",
        FULL_HOUSE:             "FULL HOUSE",
        TWO_PAIRS:              "TWO PAIRS",
        ONE_PAIR:               "ONE PAIR",
        HIGH_CARD:              "HIGH CARD",
    },

    // Round
    Round:
    {
        PRE_FLOP:               "Pre-Flop",
        THE_FLOP:               "The Flop",
        THE_TURN:               "The Turn",
        THE_RIVER:              "The River",
        THE_SHOWDOWN:           "The Showdown"
    }
}