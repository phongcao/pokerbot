//=========================================================
// Import modules
//=========================================================

var builder = require('botbuilder');
var fs = require('fs');
var path = require('path');
var Canvas = require('canvas');
var Defs = require('./defs');
var Strings = require('./strings');
var Renderer = require('./renderer');
var Card = require('./card');
var Hand = require('./hand');
var Player = require('./player');
var AI = require('./ai');

//=========================================================
// UI Constants
//=========================================================

// Cards
var CARD_WIDTH                          = 108;
var CARD_HEIGHT                         = 157;

// Board canvas
var BOARD_CANVAS_WIDTH                  = 548;
var BOARD_CANVAS_HEIGHT                 = 310;
var BOARD_CANVAS_BACKGROUND_COLOR       = '#096114';
var BOARD_CANVAS_BACKGROUND_ALPHA       = 0.7;
var BOARD_CARD_X                        = (BOARD_CANVAS_WIDTH - (CARD_WIDTH * 5)) / 2;
var BOARD_CARD_Y                        = (BOARD_CANVAS_HEIGHT - CARD_HEIGHT) / 2;
var BOARD_CARD_SPACING                  = CARD_WIDTH;
var BOARD_TEXT_COLOR                    = 'white';
var BOARD_BLINDS_INFO_X                 = 10;
var BOARD_BLINDS_INFO_Y                 = 15;
var BOARD_POT_AMOUNT_X                  = BOARD_CANVAS_WIDTH - 110;
var BOARD_POT_AMOUNT_Y                  = BOARD_BLINDS_INFO_Y;
var BOARD_POT_X                         = BOARD_CANVAS_WIDTH - 170;
var BOARD_POT_Y                         = BOARD_POT_AMOUNT_Y;
var BOARD_HAND_INFO_X                   = BOARD_BLINDS_INFO_X;
var BOARD_HAND_INFO_Y                   = BOARD_CANVAS_HEIGHT - 50;

// Players canvas
var PLAYERS_CANVAS_WIDTH                = 548;
var PLAYERS_CANVAS_HEIGHT               = 310;
var PLAYERS_CANVAS_BACKGROUND_COLOR     = '#096114';
var PLAYERS_CANVAS_BACKGROUND_ALPHA     = 0.7;
var PLAYERS_CARD_SPACING                = CARD_WIDTH;
var HUMAN_CARD_X                        = 27;
var HUMAN_CARD_Y                        = 60;
var HUMAN_MONEY_X                       = HUMAN_CARD_X;
var HUMAN_MONEY_Y                       = PLAYERS_CANVAS_HEIGHT - 45;
var HUMAN_NAME_X                        = HUMAN_MONEY_X;
var HUMAN_NAME_Y                        = HUMAN_MONEY_Y - 30;
var HUMAN_DEALER_CHIP_X                 = HUMAN_MONEY_X + 150;
var HUMAN_DEALER_CHIP_Y                 = HUMAN_NAME_Y + 5;
var NPC_CARD_X                          = PLAYERS_CANVAS_WIDTH - (CARD_WIDTH * 2) - HUMAN_CARD_X;
var NPC_CARD_Y                          = HUMAN_CARD_Y;
var NPC_MONEY_X                         = NPC_CARD_X;
var NPC_MONEY_Y                         = HUMAN_MONEY_Y;
var NPC_NAME_X                          = NPC_MONEY_X;
var NPC_NAME_Y                          = HUMAN_NAME_Y;
var NPC_DEALER_CHIP_X                   = NPC_MONEY_X + 150;
var NPC_DEALER_CHIP_Y                   = HUMAN_DEALER_CHIP_Y;

// Board
var ROUND_NAMES                         = 
[
    Strings.Round.PRE_FLOP,
    Strings.Round.THE_FLOP,
    Strings.Round.THE_TURN,
    Strings.Round.THE_RIVER,
    Strings.Round.THE_SHOWDOWN
];

//=========================================================
// Global variables
//=========================================================

// Canvas
var USERS_BOARD_CANVAS = [];
var USERS_PLAYERS_CANVAS = [];

// Leaderboard cache data
var LEADERBOARD_CACHE = [];

//=========================================================
// Game update and render
//=========================================================

function switchState(session, newState, refresh)
{
    session.userData.lastState = session.userData.state;
    session.userData.state = newState;
    if (refresh)
    {
        update(session);
    }
}

function init(session)
{
    // Canvas
    USERS_BOARD_CANVAS[session.message.user.id] = new Canvas(BOARD_CANVAS_WIDTH, BOARD_CANVAS_HEIGHT);
    USERS_PLAYERS_CANVAS[session.message.user.id] = new Canvas(PLAYERS_CANVAS_WIDTH, PLAYERS_CANVAS_HEIGHT);

    // Board
    session.userData.roundIndex = 0;
    session.userData.boardCards = [];
    session.userData.communityCards = [];
    session.userData.currentPlayerIndex = 0;
    session.userData.previousPlayerIndex = -1;
    session.userData.dealerIndex = 0;
    session.userData.winnerIndices = [];
    session.userData.smallBlind = 0;
    session.userData.bigBlind = 0;
    session.userData.currentPot = 0;
    session.userData.currentBet = 0;

    // Players
    session.userData.totalPlayers = 0;
    session.userData.humanPlayerIndex = 0;      



    // Switch state
    session.userData.lastState = Defs.GameState.STATE_INIT;
    session.userData.state = Defs.GameState.STATE_INIT;
}

function update(session)
{
    // Reload resources when needed
    if (USERS_BOARD_CANVAS[session.message.user.id] == null)
    {
        USERS_BOARD_CANVAS[session.message.user.id] = new Canvas(BOARD_CANVAS_WIDTH, BOARD_CANVAS_HEIGHT);
        USERS_PLAYERS_CANVAS[session.message.user.id] = new Canvas(PLAYERS_CANVAS_WIDTH, PLAYERS_CANVAS_HEIGHT);
    }

    if (session.userData.state == Defs.GameState.STATE_INIT)
    {
        stateInit(session);
    }
    else if (session.userData.state == Defs.GameState.STATE_NEW_ROUND)
    {
        stateNewRound(session);
    }
    else if (session.userData.state == Defs.GameState.STATE_BOARD)
    {
        stateBoard(session);
    }
    else if (session.userData.state == Defs.GameState.STATE_PLAYERS_INPUT)
    {
        statePlayersInput(session);
    }
    else if (session.userData.state == Defs.GameState.STATE_RESULT)
    {
        stateResult(session);
    }
}

function drawCommunityCards(session)
{
    var boardCanvas = USERS_BOARD_CANVAS[session.message.user.id];

    for (var i = 0; i < session.userData.communityCards.length; i++)
    {
        Renderer.drawImage(boardCanvas, session.userData.communityCards[i].filename, BOARD_CARD_X + BOARD_CARD_SPACING * i, BOARD_CARD_Y);
    }
}

function drawWinningHand(session, hand, combination)
{
    var boardCanvas = USERS_BOARD_CANVAS[session.message.user.id];
    var playersCanvas = USERS_PLAYERS_CANVAS[session.message.user.id];
    var players = session.userData.players;

    // Draw board background
    Renderer.fillRect(boardCanvas, 0, 0, BOARD_CANVAS_WIDTH, BOARD_CANVAS_HEIGHT, BOARD_CANVAS_BACKGROUND_COLOR);

    // Draw community cards
    drawCommunityCards(session);

    // Darken board background
    Renderer.fillRectAlpha(boardCanvas, 0, 0, BOARD_CANVAS_WIDTH, BOARD_CANVAS_HEIGHT, BOARD_CANVAS_BACKGROUND_COLOR, BOARD_CANVAS_BACKGROUND_ALPHA);

    // Draw blinds info
    var boardInfo = "$" + session.userData.smallBlind + "/" + "$" + session.userData.bigBlind + " " + ROUND_NAMES[session.userData.roundIndex];
    Renderer.drawText(boardCanvas, boardInfo, BOARD_BLINDS_INFO_X, BOARD_BLINDS_INFO_Y, Defs.BitmapFont.DEFAULT_REGULAR, Defs.BitmapFont.DEFAULT_SIZE, BOARD_TEXT_COLOR);

    // Draw pot
    Renderer.drawText(boardCanvas, Strings.POT, BOARD_POT_X, BOARD_POT_Y, Defs.BitmapFont.DEFAULT_REGULAR, Defs.BitmapFont.DEFAULT_SIZE, BOARD_TEXT_COLOR);
    Renderer.drawText(boardCanvas, "$" + calculatePot(session), BOARD_POT_AMOUNT_X, BOARD_POT_AMOUNT_Y, Defs.BitmapFont.DEFAULT_REGULAR, Defs.BitmapFont.DEFAULT_SIZE, BOARD_TEXT_COLOR);

    // Highlight board card
    for (var i = 0; i < session.userData.communityCards.length; i++)
    {
        if (Hand.cardInHand(session.userData.communityCards[i], combination))
        {
            Renderer.drawImage(boardCanvas, session.userData.communityCards[i].filename, BOARD_CARD_X + BOARD_CARD_SPACING * i, BOARD_CARD_Y);
        }
    }

    // Draw winning hand info
    Renderer.drawText(boardCanvas, hand.name, BOARD_HAND_INFO_X, BOARD_HAND_INFO_Y, Defs.BitmapFont.DEFAULT_REGULAR, Defs.BitmapFont.DEFAULT_SIZE, BOARD_TEXT_COLOR);

    // Draw player canvas background
    var halfCanvasWidth = PLAYERS_CANVAS_WIDTH >> 1;
    Renderer.fillRect(playersCanvas, 0, 0, halfCanvasWidth - 1, PLAYERS_CANVAS_HEIGHT, PLAYERS_CANVAS_BACKGROUND_COLOR);
    Renderer.fillRect(playersCanvas, halfCanvasWidth + 1, 0, halfCanvasWidth + 2, PLAYERS_CANVAS_HEIGHT, PLAYERS_CANVAS_BACKGROUND_COLOR);

    // Draw players' hole cards
    for (var i = 0; i < session.userData.totalPlayers; i++)
    {
        for (var j = 0; j < players[i].holeCards.length; j++)
        {
            Renderer.drawImage(playersCanvas, players[i].holeCards[j].filename, players[i].cardPosX + PLAYERS_CARD_SPACING * j, players[i].cardPosY);
        }
    }

    // Darken player background
    Renderer.fillRectAlpha(playersCanvas, 0, 0, PLAYERS_CANVAS_WIDTH, PLAYERS_CANVAS_HEIGHT, PLAYERS_CANVAS_BACKGROUND_COLOR, PLAYERS_CANVAS_BACKGROUND_ALPHA);

    // Draw players' name and money
    Renderer.drawText(playersCanvas, session.message.user.name, HUMAN_NAME_X, HUMAN_NAME_Y, Defs.BitmapFont.DEFAULT_REGULAR, Defs.BitmapFont.DEFAULT_SIZE, BOARD_TEXT_COLOR);
    Renderer.drawText(playersCanvas, "$" + players[session.userData.humanPlayerIndex].currentFunds, HUMAN_MONEY_X, HUMAN_MONEY_Y, Defs.BitmapFont.DEFAULT_REGULAR, Defs.BitmapFont.DEFAULT_SIZE, BOARD_TEXT_COLOR);
    Renderer.drawText(playersCanvas, Strings.BOT, NPC_NAME_X, NPC_NAME_Y, Defs.BitmapFont.DEFAULT_REGULAR, Defs.BitmapFont.DEFAULT_SIZE, BOARD_TEXT_COLOR);
    Renderer.drawText(playersCanvas, "$" + players[1].currentFunds, NPC_MONEY_X, NPC_MONEY_Y, Defs.BitmapFont.DEFAULT_REGULAR, Defs.BitmapFont.DEFAULT_SIZE, BOARD_TEXT_COLOR);

    // Draw dealer chip
    Renderer.drawImage(playersCanvas, Defs.Path.DEALER_CHIP_FILE, players[session.userData.dealerIndex].dealerChipX, players[session.userData.dealerIndex].dealerChipY);

    // Highlight players' hole cards
    for (var i = 0; i < session.userData.totalPlayers; i++)
    {
        for (var j = 0; j < players[i].holeCards.length; j++)
        {
            if (Hand.cardInHand(players[i].holeCards[j], combination))
            {
                Renderer.drawImage(playersCanvas, players[i].holeCards[j].filename, players[i].cardPosX + PLAYERS_CARD_SPACING * j, players[i].cardPosY);
            }
        }
    }
}

function renderCanvas(session, canvas, name, title, text, buttons, callback)
{
    Renderer.getCanvasBuffer(session, canvas, name, function (imgURL)
    {
        var card = new builder.HeroCard(session);
        
        if (title != null)
        {
            card.title(title);
        }

        if (text != null)
        {
            card.text(text);
        }

        card.images
        ([
            builder.CardImage.create(session, imgURL)
        ]);

        if (buttons != null)
        {
            card.buttons(buttons);
        }

        var msg = new builder.Message(session);
        msg.attachments([card]);

        if (buttons == null)
        {
            session.send(msg);
        }
        else
        {
            var options = buttons[0].data.value;
            for (var i = 1; i < buttons.length; i++)
            {
                options += '|' + buttons[i].data.value;
            }

            builder.Prompts.choice(session, msg, options);
        }

        if (callback != null)
        {
            callback(true);
        }
    });
}

function renderBoardCanvas(session, renderPlayerCanvas, callback)
{
    var boardCanvas = USERS_BOARD_CANVAS[session.message.user.id];

    // Draw background
    Renderer.fillRect(boardCanvas, 0, 0, BOARD_CANVAS_WIDTH, BOARD_CANVAS_HEIGHT, BOARD_CANVAS_BACKGROUND_COLOR);

    // Draw blinds info
    var boardInfo = "$" + session.userData.smallBlind + "/" + "$" + session.userData.bigBlind + " " + ROUND_NAMES[session.userData.roundIndex];
    Renderer.drawText(boardCanvas, boardInfo, BOARD_BLINDS_INFO_X, BOARD_BLINDS_INFO_Y, Defs.BitmapFont.DEFAULT_REGULAR, Defs.BitmapFont.DEFAULT_SIZE, BOARD_TEXT_COLOR);

    // Draw pot
    Renderer.drawText(boardCanvas, Strings.POT, BOARD_POT_X, BOARD_POT_Y, Defs.BitmapFont.DEFAULT_REGULAR, Defs.BitmapFont.DEFAULT_SIZE, BOARD_TEXT_COLOR);
    Renderer.drawText(boardCanvas, "$" + calculatePot(session), BOARD_POT_AMOUNT_X, BOARD_POT_AMOUNT_Y, Defs.BitmapFont.DEFAULT_REGULAR, Defs.BitmapFont.DEFAULT_SIZE, BOARD_TEXT_COLOR);

    // Draw community cards
    drawCommunityCards(session);

    // Render canvas
    var boardCanvasFile = ROUND_NAMES[session.userData.roundIndex] + '.png';
    renderCanvas(session, boardCanvas, boardCanvasFile, null, null, null, function (result)
    {
        if (renderPlayerCanvas)
        {
            renderPlayersCanvas(session, callback);
        }
        else
        {
            callback(result);
        }
    });
}

function renderPlayersCanvas(session, callback)
{
    var playersCanvas = USERS_PLAYERS_CANVAS[session.message.user.id];
    var players = session.userData.players;

    // Draw background
    var halfCanvasWidth = PLAYERS_CANVAS_WIDTH >> 1;
    Renderer.fillRect(playersCanvas, 0, 0, halfCanvasWidth - 1, PLAYERS_CANVAS_HEIGHT, PLAYERS_CANVAS_BACKGROUND_COLOR);
    Renderer.fillRect(playersCanvas, halfCanvasWidth + 1, 0, halfCanvasWidth + 2, PLAYERS_CANVAS_HEIGHT, PLAYERS_CANVAS_BACKGROUND_COLOR);

    // Draw players' hole cards
    for (var i = 0; i < session.userData.totalPlayers; i++)
    {
        for (var j = 0; j < players[i].holeCards.length; j++)
        {
            var filename = Defs.Path.CARD_BACK_FILE;
            if (!players[i].isNPC || ROUND_NAMES[session.userData.roundIndex] == Strings.Round.THE_SHOWDOWN)
            {
                filename = players[i].holeCards[j].filename;
            }

            Renderer.drawImage(playersCanvas, filename, players[i].cardPosX + PLAYERS_CARD_SPACING * j, players[i].cardPosY);
        }
    }

    // Draw players' name and money
    Renderer.drawText(playersCanvas, session.message.user.name, HUMAN_NAME_X, HUMAN_NAME_Y, Defs.BitmapFont.DEFAULT_REGULAR, Defs.BitmapFont.DEFAULT_SIZE, BOARD_TEXT_COLOR);
    Renderer.drawText(playersCanvas, "$" + players[session.userData.humanPlayerIndex].currentFunds, HUMAN_MONEY_X, HUMAN_MONEY_Y, Defs.BitmapFont.DEFAULT_REGULAR, Defs.BitmapFont.DEFAULT_SIZE, BOARD_TEXT_COLOR);
    Renderer.drawText(playersCanvas, Strings.BOT, NPC_NAME_X, NPC_NAME_Y, Defs.BitmapFont.DEFAULT_REGULAR, Defs.BitmapFont.DEFAULT_SIZE, BOARD_TEXT_COLOR);
    Renderer.drawText(playersCanvas, "$" + players[1].currentFunds, NPC_MONEY_X, NPC_MONEY_Y, Defs.BitmapFont.DEFAULT_REGULAR, Defs.BitmapFont.DEFAULT_SIZE, BOARD_TEXT_COLOR);

    // Draw dealer chip
    Renderer.drawImage(playersCanvas, Defs.Path.DEALER_CHIP_FILE, players[session.userData.dealerIndex].dealerChipX, players[session.userData.dealerIndex].dealerChipY);

    // Render canvas
    renderCanvas(session, playersCanvas, Defs.Path.PLAYERS_CANVAS_FILE, null, null, null, callback);
}

function renderBettingOptions(session)
{
    var choices = Player.getBettingOptions(session.userData.players[session.userData.humanPlayerIndex], session.userData.bigBlind, Defs.Board.RAISE_RATE, session.userData.currentBet);
    var options = 
    { 
        listStyle: builder.ListStyle['button'] 
    };

    for (var i = 0; i < choices.length; i++)
    {
        if (choices[i] == Strings.BET)
        {
            choices[i] += " $" + session.userData.bigBlind;
        }
        else if (choices[i] == Strings.RAISE)
        {
            choices[i] += " $" + (session.userData.currentBet * Defs.Board.RAISE_RATE);
        }
    }

    builder.Prompts.choice(session, "", choices.join('|'), options);
}

function renderShowdown(session, bestHand, callback)
{
    var boardCanvas = USERS_BOARD_CANVAS[session.message.user.id];
    var playersCanvas = USERS_PLAYERS_CANVAS[session.message.user.id];

    // Draw winning hand
    drawWinningHand(session, bestHand.hand[0], bestHand.combination);

    // Render canvas
    var boardCanvasFile = ROUND_NAMES[session.userData.roundIndex] + '.png';
    renderCanvas(session, boardCanvas, boardCanvasFile, null, null, null, function ()
    {
        renderCanvas(session, playersCanvas, Defs.Path.PLAYERS_CANVAS_FILE, null, null, null, callback);
    });
}

//=========================================================
// Process user's input
//=========================================================

function updateInput(session, results)
{
    var entity = results.response.entity;

    if (session.userData.state == Defs.GameState.STATE_PLAYERS_INPUT)
    {
        processPlayerBettingOption(session, session.userData.players[session.userData.humanPlayerIndex], entity);
    }
    else if (session.userData.state == Defs.GameState.STATE_RESULT)
    {
        if (entity == Strings.Menu.NEW_GAME)
        {
            switchState(session, Defs.GameState.STATE_INIT, false);
        }
        else
        {
            switchState(session, Defs.GameState.STATE_NEW_ROUND, false);
        }
    }
}

//=========================================================
// Board
//=========================================================

function initBoardCards(session)
{
    // Initialize the board cards
    session.userData.boardCards = [];

    for (var i = 0; i < Defs.Card.NUMBER_OF_SUITS; i++)
    {
        for (var j = 0; j < Defs.Card.NUMBER_OF_VALUES; j++)
        {
            var card = new Card(i, j);
            session.userData.boardCards.push(card);
        }
    }

    // Shuffle the board cards
    shuffleBoardCards(session);
}

function shuffleBoardCards(session)
{
    for (var i = 0; i < Defs.Board.DECK_SHUFFLE_TIMES; i++)
    {
        var cardIndex1 = Math.floor(Math.random() * Defs.Card.NUMBER_OF_CARDS);
        var cardIndex2 = Math.floor(Math.random() * Defs.Card.NUMBER_OF_CARDS);
        var card = session.userData.boardCards[cardIndex1];
        session.userData.boardCards[cardIndex1] = session.userData.boardCards[cardIndex2];
        session.userData.boardCards[cardIndex2] = card;
    }
}

function initBoard(session)
{
    // Init the board cards
    initBoardCards(session);

    // Init the players
    initPlayers(session);

    // Init the dealer
    session.userData.winnerIndices = [];
    session.userData.dealerIndex = Math.floor(Math.random() * session.userData.totalPlayers);
    session.userData.currentPlayerIndex = session.userData.dealerIndex;
    session.userData.previousPlayerIndex = -1;

    // Init board round
    session.userData.roundIndex = 0;
    session.userData.smallBlind = Defs.Board.SMALL_BLIND;
    session.userData.bigBlind = Defs.Board.BIG_BLIND;
    session.userData.currentPot = 0;
	session.userData.currentBet = 0;

    // Init community cards
    initCommunityCards(session);
}

function resetBoard(session)
{
    // Init the board cards
    initBoardCards(session);

    // Reset the players
    resetPlayers(session);

    // Init the dealer
    session.userData.winnerIndices = [];
    session.userData.dealerIndex = getNextPlayer(session, session.userData.dealerIndex);
    session.userData.currentPlayerIndex = session.userData.dealerIndex;
    session.userData.previousPlayerIndex = -1;

    // Init board round
    session.userData.roundIndex = 0;
	session.userData.currentBet = 0;
    session.userData.currentPot = 0;

    // Init community cards
    initCommunityCards(session);
}

function nextBoardCard(session)
{
    if (session.userData.boardCards.length == 0)
    {
        return null;
    }

    var cardIndex = Math.floor(Math.random() * session.userData.boardCards.length);
    var card = session.userData.boardCards[cardIndex];
    session.userData.boardCards.splice(cardIndex, 1);

    return card;
}

function initCommunityCards(session)
{
    if (ROUND_NAMES[session.userData.roundIndex] == Strings.Round.PRE_FLOP)
    {
        session.userData.communityCards = [];
    }    
    else if (ROUND_NAMES[session.userData.roundIndex] == Strings.Round.THE_FLOP)
    {
        session.userData.communityCards.push(nextBoardCard(session));
        session.userData.communityCards.push(nextBoardCard(session));
        session.userData.communityCards.push(nextBoardCard(session));
    }
    else if (ROUND_NAMES[session.userData.roundIndex] == Strings.Round.THE_TURN || ROUND_NAMES[session.userData.roundIndex] == Strings.Round.THE_RIVER)
    {
        session.userData.communityCards.push(nextBoardCard(session));
    }
}

function nextPlayer(session)
{
    session.userData.previousPlayerIndex = session.userData.currentPlayerIndex;
    session.userData.currentPlayerIndex = (++session.userData.currentPlayerIndex) % session.userData.totalPlayers;
}

function getNextPlayer(session, playerIndex)
{
    return ((playerIndex + 1) % session.userData.totalPlayers);
}

function calculateTotalBetAmount(session)
{
    var totalBetAmount = 0;

    for (var i = 0; i < session.userData.totalPlayers; i++)
    {
        totalBetAmount += session.userData.players[i].betAmount;
    }

    return totalBetAmount;
}

function calculatePot(session)
{
    return (session.userData.currentPot + calculateTotalBetAmount(session));
}

//=========================================================
// Players
//=========================================================

function initPlayers(session)
{
    // Heads-up mode
    session.userData.totalPlayers = 2;
    session.userData.players = [];

    // Human player is always the first element in the array
    session.userData.humanPlayerIndex = 0;
    session.userData.players.push(new Player(false, Defs.Board.ROUND_BUYINS, HUMAN_CARD_X, HUMAN_CARD_Y, HUMAN_DEALER_CHIP_X, HUMAN_DEALER_CHIP_Y));

    // Init NPC
    for (var i = 1; i < session.userData.totalPlayers; i++)
    {
        session.userData.players.push(new Player(true, Defs.Board.ROUND_BUYINS, NPC_CARD_X, NPC_CARD_Y, NPC_DEALER_CHIP_X, NPC_DEALER_CHIP_Y));
    }

    // Init players' hole cards
    for (var i = 0; i < session.userData.totalPlayers; i++)
    {
        Player.addCard(session.userData.players[i], nextBoardCard(session));
        Player.addCard(session.userData.players[i], nextBoardCard(session));
    }
}

function resetPlayers(session)
{
    for (var i = 0; i < session.userData.totalPlayers; i++)
    {
        Player.reset(session.userData.players[i]);
        Player.addCard(session.userData.players[i], nextBoardCard(session));
        Player.addCard(session.userData.players[i], nextBoardCard(session));
    }
}

function processPlayerBettingOption(session, player, bettingOption)
{
    var bettingText = bettingOption;

    if (bettingOption.startsWith(Strings.BET))
    {
        bettingText += " $" + session.userData.bigBlind;        
        Player.bet(player, session.userData.bigBlind);
        session.userData.currentBet = session.userData.bigBlind;
    }
    else if (bettingOption.startsWith(Strings.RAISE))
    {
        var raiseAmount = session.userData.currentBet * Defs.Board.RAISE_RATE;
        var reraise = false;
        bettingText += " $" + raiseAmount;
        for (var i = 0; i < session.userData.totalPlayers; i++)
        {
            if (session.userData.players[i].betOption == Strings.RAISE)
            {
                reraise = true;
                break;
            }
        }

        Player.raise(player, session.userData.currentBet, raiseAmount, reraise);
        session.userData.currentBet += raiseAmount;
    }
    else if (bettingOption.startsWith(Strings.CALL))
    {
        var callAmount = Math.min(player.currentFunds, session.userData.currentBet - player.betAmount);
        bettingText += " $" + callAmount;
        Player.call(player, callAmount);      
    }
    else if (bettingOption.startsWith(Strings.CHECK))
    {
        Player.check(player);
    }
    else if (bettingOption.startsWith(Strings.ALL_IN))
    {
        bettingText += " $" + player.currentFunds;
        session.userData.currentBet = player.currentFunds;
        Player.allIn(player);
    }
    else if (bettingOption.startsWith(Strings.FOLD))
    {
        Player.fold(player);
    }

    if (player.isNPC)
    {
        var msg = new builder.Message(session);
        msg.text(Strings.BOT + ": " + bettingText);
        session.send(msg);        
    }
    // Temporarily disable log
    // else
    // {
    //     logHumanPlayerBehavior(session, session.userData.communityCards, calculatePot(session), session.userData.players[session.userData.humanPlayerIndex], session.userData.players[1]);
    // }

    nextPlayer(session);
}

//=========================================================
// User data
//=========================================================

function createPlayerInfo(session)
{
    var playerInfo = 
    {
        "name":     session.message.user.name,
        "funds":    Defs.Player.INITIAL_FUNDS,
        "win":      0,
        "lose":     0,
        "fold":     0,
        "check":    0,
        "call":     0,
        "bet":      0,
        "raise":    0,
        "reraise":  0,
        "allin":    0
    };

    return playerInfo;
}

function saveUserData(session, callback)
{
    var playerInfo = JSON.stringify(session.userData.playerInfo);
    fs.writeFile(path.join(session.userData.localDir, Defs.Path.PLAYER_INFO_FILE), playerInfo, 'utf8', callback);

    // Update leaderboard cache
    if (Defs.USE_LEADERBOARD_CACHE)
    {
        LEADERBOARD_CACHE[session.message.user.id] = 
        {
            "name":     session.message.user.name,
            "funds":    session.userData.playerInfo.funds
        };
    }
}

function updateUserData(session)
{
    var players = session.userData.players;

    if (players && (players.length != 0) && session.userData.state != Defs.GameState.STATE_INIT)
    {
        session.userData.playerInfo.funds += players[session.userData.humanPlayerIndex].currentFunds - Defs.Board.ROUND_BUYINS;
        saveUserData(session, null);
        switchState(session, Defs.GameState.STATE_INIT, false);
    }
}

// Log human player's behavior to file
function logHumanPlayerBehavior(session, communityCards, pot, human, rival)
{
    var file = path.join(session.userData.localDir, Defs.Path.PLAYER_LOG_FILE);

    // Write header row
    if (!fs.existsSync(file))
    {
        var header = ['Remaining Cards', 'Pot', 'Bet', 'Funds', 'Rival Check/Fold(%)', 'Rival Call(%)', 'Rival Bet/Raise(%)', 'Rival All-In(%)', 'Rival Bet', 'Rival Funds', 'Check/Fold', 'Call', 'Bet/Raise', 'All-In', 'Hand Strength'];
        fs.appendFileSync(file, header.join(','));  
    }

    // Write player's data
    var remainingCards = Defs.Board.MAX_CARDS - communityCards.length;
    var rivalActionCount = rival.foldCount + rival.checkCount + rival.callCount + rival.betCount + rival.raiseCount + rival.reraiseCount + rival.allInCount;
    var rivalCheckFoldPercent = ((rival.checkCount + rival.foldCount) * 100) / rivalActionCount;
    var rivalCallPercent = (rival.callCount * 100) / rivalActionCount;
    var rivalBetRaisePercent = ((rival.betCount + rival.raiseCount + rival.reraiseCount) * 100) / rivalActionCount;
    var rivalAllInPercent = (rival.allInCount * 100) / rivalActionCount;
    var checkFold = ((human.betOption === Strings.CHECK) || (human.betOption === Strings.FOLD)) ? 1 : 0;
    var call = (human.betOption === Strings.CALL) ? 1 : 0;
    var betRaise = ((human.betOption === Strings.BET) || (human.betOption === Strings.RAISE)) ? 1 : 0;
    var allIn = (human.betOption === Strings.ALL_IN) ? 1 : 0;
    var boardHandStrength = 0;
    if (communityCards.length != 0)
    {
        var communityCardsHands = new Hand(communityCards);
        boardHandStrength = communityCardsHands[0].rank;
    }

    var bestHands = Hand.findBestHand(communityCards.concat(human.holeCards)).hand;
    var bestHandStrength = bestHands[0].rank;
    var handStrength = (bestHandStrength == boardHandStrength) ? 0 : bestHandStrength;
    var logData = [remainingCards, pot, human.betAmount, human.currentFunds, 
                    rivalCheckFoldPercent | 0, rivalCallPercent | 0, rivalBetRaisePercent | 0, rivalAllInPercent | 0, 
                    rival.betAmount, rival.currentFunds, checkFold, call, betRaise, allIn, handStrength];
    fs.appendFileSync(file, '\n' + logData.join(','));        
}

//=========================================================
// State machine
//=========================================================

function stateInit(session)
{
    initBoard(session);
    switchState(session, Defs.GameState.STATE_BOARD, true);
}

function stateNewRound(session)
{
    resetBoard(session);
    switchState(session, Defs.GameState.STATE_BOARD, true);
}

function stateBoard(session)
{
    var players = session.userData.players;

    if (ROUND_NAMES[session.userData.roundIndex] == Strings.Round.PRE_FLOP)
    {
        // Small blinds
        Player.bet(players[session.userData.dealerIndex], session.userData.smallBlind);
        players[session.userData.dealerIndex].betOption = '';
        nextPlayer(session);

        // Big blinds
        for (var i = 0; i < session.userData.totalPlayers - 1; i++)
        {
            Player.bet(players[session.userData.currentPlayerIndex], session.userData.bigBlind);
            players[session.userData.currentPlayerIndex].betOption = '';
            nextPlayer(session);
        }

        if (players[0].currentFunds < 0 || players[1].currentFunds < 0)
        {
            switchState(session, Defs.GameState.STATE_RESULT, true);
        }
        else
        {
            session.userData.currentBet = session.userData.bigBlind;

            renderBoardCanvas(session, true, function (result)
            {
                switchState(session, Defs.GameState.STATE_PLAYERS_INPUT, true);
            });
        }
    }
    else if (ROUND_NAMES[session.userData.roundIndex] == Strings.Round.THE_SHOWDOWN)
    {
        var bestHand = Hand.findBestHand(session.userData.communityCards.concat(players[session.userData.humanPlayerIndex].holeCards));

        for (var i = 1; i < session.userData.totalPlayers; i++)
        {
            var result = Hand.findBestHand(session.userData.communityCards.concat(players[i].holeCards));
            if (Hand.compare(result.hand, bestHand.hand) == 1)
            {
                bestHand = result;
            }
        }

        for (var i = 0; i < session.userData.totalPlayers; i++)
        {
            var result = Hand.findBestHand(session.userData.communityCards.concat(players[i].holeCards));
            if (Hand.compare(result.hand, bestHand.hand) == 0)
            {
                session.userData.winnerIndices.push(i);
            }
        }

        renderShowdown(session, bestHand, function (result)
        {
            switchState(session, Defs.GameState.STATE_RESULT, true);
        });
    }
    else
    {
        initCommunityCards(session);

        // Check if there is any input next
        var zeroFundPlayersCount = 0;
        for (var i = 0; i < session.userData.totalPlayers; i++)
        {
            if ((players[i].currentFunds == 0) && (players[i].betOption == ''))
            {
                zeroFundPlayersCount++;
            }
        }

        renderBoardCanvas(session, zeroFundPlayersCount < (session.userData.totalPlayers - 1), function (result)
        {
            switchState(session, Defs.GameState.STATE_PLAYERS_INPUT, true);
        });
    }
}

function statePlayersInput(session)
{
    var foldedPlayersCount = 0;
    var possibleWinnerIndex = 0;
    var zeroFundPlayersCount = 0;
    var finishBetting = true;
    var players = session.userData.players;

    for (var i = 0; i < session.userData.totalPlayers; i++)
    {
        if ((players[i].currentFunds != 0) && (players[i].betOption == '' || (players[i].betAmount != session.userData.currentBet)))
        {
            finishBetting = false;
        }

        if ((players[i].currentFunds == 0) && (players[i].betOption == ''))
        {
            zeroFundPlayersCount++;
        }

        if (players[i].betOption == Strings.FOLD)
        {
            foldedPlayersCount++;
        }
        else
        {
            possibleWinnerIndex = i;
        }
    }

    if (foldedPlayersCount == (session.userData.totalPlayers - 1))
    {
        session.userData.winnerIndices.push(possibleWinnerIndex);
        switchState(session, Defs.GameState.STATE_RESULT, true);
    }
    else if (finishBetting || (zeroFundPlayersCount >= (session.userData.totalPlayers - 1)))
    {
        session.userData.roundIndex++;
        session.userData.currentBet = 0;
        session.userData.currentPot += calculateTotalBetAmount(session);
        for (var i = 0; i < session.userData.totalPlayers; i++)
        {
            players[i].betOption = '';
            players[i].betAmount = 0;
        }
        switchState(session, Defs.GameState.STATE_BOARD, true);
    }
    else
    {
        // Player is out of chips
        if (players[session.userData.currentPlayerIndex].currentFunds == 0)
        {
            Player.pass(players[session.userData.currentPlayerIndex]);
            nextPlayer(session);
            update(session);
        }
        else
        {
            // Render player
            if (session.userData.currentPlayerIndex == session.userData.humanPlayerIndex)
            {
                renderBettingOptions(session);
            }
            // Render npc's choice
            else
            {
                var npcAvailableBettingOptions = Player.getBettingOptions(players[session.userData.currentPlayerIndex], session.userData.bigBlind, Defs.Board.RAISE_RATE, session.userData.currentBet);
                var npcChosenBettingOption = AI.chooseBettingOption(session.userData.communityCards, players[session.userData.currentPlayerIndex].holeCards, npcAvailableBettingOptions, 
                                                                    players[session.userData.currentPlayerIndex].currentFunds, players[session.userData.currentPlayerIndex].betAmount, 
                                                                    session.userData.currentBet, players[session.userData.humanPlayerIndex]);

                processPlayerBettingOption(session, players[session.userData.currentPlayerIndex], npcChosenBettingOption);
                update(session);
            }
        }
    }
}

function stateResult(session)
{
    var players = session.userData.players;

    if (session.userData.winnerIndices.length != 0)
    {
        var pot = calculatePot(session);
        var averageAmount = pot / session.userData.winnerIndices.length;
        for (var i = 0; i < session.userData.winnerIndices.length; i++)
        {
            players[session.userData.winnerIndices[i]].currentFunds += averageAmount;
        }
    }

    // Update user's stats
    session.userData.playerInfo.fold = players[session.userData.humanPlayerIndex].foldCount;
    session.userData.playerInfo.check = players[session.userData.humanPlayerIndex].checkCount;
    session.userData.playerInfo.call = players[session.userData.humanPlayerIndex].callCount;
    session.userData.playerInfo.bet = players[session.userData.humanPlayerIndex].betCount;
    session.userData.playerInfo.raise = players[session.userData.humanPlayerIndex].raiseCount;
    session.userData.playerInfo.reraise = players[session.userData.humanPlayerIndex].reraiseCount;
    session.userData.playerInfo.allin = players[session.userData.humanPlayerIndex].allInCount;

    if (session.userData.winnerIndices.length == 1)
    {
        if (session.userData.winnerIndices.indexOf(session.userData.humanPlayerIndex) != -1)
        {
            session.userData.playerInfo.win++;
        }
        else
        {
            session.userData.playerInfo.lose++;
        }
    }

    if (players[session.userData.humanPlayerIndex].currentFunds <= 0)
    {
        session.userData.playerInfo.funds -= Defs.Board.ROUND_BUYINS;
        builder.Prompts.choice(session, Strings.PLAYER_LOSE + session.userData.playerInfo.funds + ".", Strings.Menu.NEW_GAME, 
        { 
            listStyle: builder.ListStyle['button']
        });
    }
    else if (players[1].currentFunds <= 0)
    {
        session.userData.playerInfo.funds += Defs.Board.ROUND_BUYINS;
        builder.Prompts.choice(session, Strings.PLAYER_WIN + session.userData.playerInfo.funds + ".", Strings.Menu.NEW_GAME, 
        { 
            listStyle: builder.ListStyle['button']
        });
    }
    else
    {
        if (session.userData.winnerIndices.length == 1)
        {
            if (session.userData.winnerIndices.indexOf(session.userData.humanPlayerIndex) != -1)
            {
                var pot = calculatePot(session);
                var winningAmount = pot - players[session.userData.winnerIndices[session.userData.humanPlayerIndex]].betAmount;
                var winEmoticons = "";
                for (var i = 0; i < winningAmount.toString().length; i++)
                {
                    winEmoticons += Strings.WIN_EMOTICON;
                }
                
                session.send(Strings.PLAYER_WIN_ROUND, winEmoticons);
            }
            else
            {
                session.send(Strings.PLAYER_LOSE_ROUND);
            }
        }

        builder.Prompts.choice(session, "", Strings.Menu.NEXT_ROUND, 
        { 
            listStyle: builder.ListStyle['button']
        });
    }

    saveUserData(session, null);
}

//=========================================================
// Export
//=========================================================

exports.switchState = switchState;
exports.init = init;
exports.update = update;
exports.updateInput = updateInput;
exports.createPlayerInfo = createPlayerInfo;
exports.saveUserData = saveUserData;
exports.updateUserData = updateUserData;
exports.LEADERBOARD_CACHE = LEADERBOARD_CACHE;