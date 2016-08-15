module.exports = 
{
    // Global
    DEFAULT_PORT:               3978,                
    MESSAGING_ENDPOINT:         "/api/messages",
    USE_BITMAP_FONT:            true,

    // Path
    Path:
    {
        USERS_HTTP:             process.env.MICROSOFT_APP_URL + "/users",
        ROOT_DIR:               __dirname + "/..",
        USERS_DIR:              __dirname + "/../users",
        ASSETS_DIR:             __dirname + "/../assets",
        FONTS_DIR:              __dirname + "/../assets/fonts",
        IMAGES_DIR:             __dirname + "/../assets/images",
        PLAYER_INFO_FILE:       "player_info.json",
        CARD_BACK_FILE:         "card_back.png",
        DEALER_CHIP_FILE:       "dealer_chip.png",
        PLAYERS_CANVAS_FILE:    "players_canvas.png"
    },

    // Regex
    Regex:
    {
        SERVE_STATIC_ROOT:      /.html/,
        SERVE_STATIC_ASSETS:    /\/assets\/?.*/,
        SERVE_STATIC_USERS:     /\/users\/?.*/,
        DIALOG_RESET_BOT:       /^resetBot/i,
        DIALOG_HELP:            /^help/i,
        DIALOG_MENU:            /^menu/i,
        DIALOG_RESET:           /^reset/i,
        DIALOG_RELOAD:          /^menu|show menu/i       
    },

    // Bitmap font
    BitmapFont:
    {
        PNG:                    "roboto-ipadhd.png",
        FNT:                    "roboto-ipadhd.fnt",
        SPACE_WIDTH:            10,
        CHAR_HSPACING:          -2,
        DEFAULT_REGULAR:        "Roboto-Regular",
        DEFAULT_SIZE:           28
    },

    // AI
    AI:
    {
        ALL_IN_MINIMAL_RANK:    3,
        ALL_IN_PROBABILITY:     5,
        RAISE_MINIMAL_RANK:     1,
        RAISE_PROBABILITY:      30,
        RANK_BONUS:             20,
        COMMUNITY_CARD_BONUS:   10
    },

    // Hand
    Hand:
    {
        MAX_CARDS:              5,
        Ranking:
        {
            ROYAL_FLUSH:        9,
            STRAIGHT_FLUSH:     8,
            FOUR_OF_A_KIND:     7,
            FULL_HOUSE:         6,
            FLUSH:              5,
            STRAIGHT:           4,
            THREE_OF_A_KIND:    3,
            TWO_PAIRS:          2,
            ONE_PAIR:           1,
            HIGH_CARD:          0
        }
    },

    // Game state
    GameState:
    {
        STATE_INIT:             0,
        STATE_BOARD:            1,
        STATE_PLAYERS_INPUT:    2,
        STATE_RESULT:           3,
        STATE_NEW_ROUND:        4
    },

    // Card
    Card:
    {
        NUMBER_OF_SUITS:        4,
        NUMBER_OF_VALUES:       13,
        NUMBER_OF_CARDS:        4 * 13
    },

    // Board
    Board:
    {
        DECK_SHUFFLE_TIMES:     100,
        SMALL_BLIND:            5,
        BIG_BLIND:              10,
        ROUND_BUYINS:           1000,
        RAISE_RATE:             1
    },

    // Player
    Player:
    {
        INITIAL_FUNDS:          10000
    }
}