//=========================================================
// Import modules
//=========================================================

var builder = require('botbuilder');
var fs = require('fs');
var Canvas = require('canvas');
var Renderer = require('./renderer');
var Card = require('./card');
var Hand = require('./hand');
var Player = require('./player');
var AI = require('./ai');

//=========================================================
// Constants
//=========================================================

// Game states
var STATE_INIT                          = 0;
var STATE_BOARD                         = 1;
var STATE_PLAYERS_INPUT                 = 2;
var STATE_RESULT                        = 3;
var STATE_NEW_ROUND                     = 4;
var STATE_NAMES                         = 
[
    'STATE_INIT',
    'STATE_BOARD',
    'STATE_PLAYERS_INPUT',
    'STATE_RESULT',
    'STATE_NEW_ROUND'
];

// Cards
var NUMBER_OF_SUITS                     = 4;
var NUMBER_OF_VALUES                    = 13;
var NUMBER_OF_CARDS                     = NUMBER_OF_SUITS * NUMBER_OF_VALUES;
var CARD_WIDTH                          = 108;
var CARD_HEIGHT                         = 157;
var CARD_BACK_FILENAME                  = 'card_back.png';

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
var PLAYERS_DEALER_CHIP_FILENAME        = 'dealer_chip.png';
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
var DECK_SHUFFLE_TIMES                  = 100;
var ROUND_NAMES                         = 
[
    'Pre-Flop',
    'The Flop',
    'The Turn',
    'The River',
    'The Showdown'
];
var SMALL_BLIND                         = 5;
var BIG_BLIND                           = 10;
var ROUND_BUYINS                        = BIG_BLIND * 100;
var INITIAL_FUNDS                       = 10000;
var RAISE_RATE                          = 1;

// Fonts
var DEFAULT_FONT_REGULAR                = 'Roboto-Regular';
var DEFAULT_FONT_SIZE                   = 28;

//=========================================================
// Global variables
//=========================================================

// Game states
var state = STATE_INIT;
var lastState = STATE_INIT;

// Canvas
var boardCanvas = new Canvas(BOARD_CANVAS_WIDTH, BOARD_CANVAS_HEIGHT);
var playersCanvas = new Canvas(PLAYERS_CANVAS_WIDTH, PLAYERS_CANVAS_HEIGHT);

// Board
var roundIndex = 0;
var boardCards = [];
var communityCards = [];
var currentPlayerIndex = 0;
var previousPlayerIndex = -1;
var dealerIndex = 0;
var winnerIndices = [];
var smallBlind = 0;
var bigBlind = 0;
var currentPot = 0;
var currentBet = 0;

// Players
var players = [];
var totalPlayers = 0;
var humanPlayerIndex = 0;

//=========================================================
// Game update and render
//=========================================================

function switchState(session, newState, refresh)
{
    lastState = state;
    state = newState;
    if (refresh)
    {
        update(session);
    }
}

function init(session)
{
    // Create local dir for user
    var userDirName = session.message.user.id.replace(':', '');
    var userLocalDir = __dirname + '/../users/' + userDirName;
    session.userData.dirName = userDirName;
    session.userData.localDir = userLocalDir;
    if (!fs.existsSync(userLocalDir))
    {
        fs.mkdirSync(userLocalDir);
        session.userData.playerInfo = createPlayerInfo(session);
        saveUserData(session, null);
    }
    else
    {
        loadUserData(session);
    }

    // Load fonts
    Renderer.loadFonts([DEFAULT_FONT_REGULAR]);

    // Switch state
    lastState = STATE_INIT;
    state = STATE_INIT;
}

function update(session)
{
    if (state == STATE_INIT)
    {
        stateInit(session);
    }
    else if (state == STATE_NEW_ROUND)
    {
        stateNewRound(session);
    }
    else if (state == STATE_BOARD)
    {
        stateBoard(session);
    }
    else if (state == STATE_PLAYERS_INPUT)
    {
        statePlayersInput(session);
    }
    else if (state == STATE_RESULT)
    {
        stateResult(session);
    }
}

function drawCommunityCards()
{
    for (var i = 0; i < communityCards.length; i++)
    {
        Renderer.drawImage(boardCanvas, communityCards[i].filename, BOARD_CARD_X + BOARD_CARD_SPACING * i, BOARD_CARD_Y);
    }
}

function drawWinningHand(hand, combination)
{
    // Draw board background
    Renderer.fillRect(boardCanvas, 0, 0, BOARD_CANVAS_WIDTH, BOARD_CANVAS_HEIGHT, BOARD_CANVAS_BACKGROUND_COLOR);

    // Draw community cards
    drawCommunityCards();

    // Darken board background
    Renderer.fillRectAlpha(boardCanvas, 0, 0, BOARD_CANVAS_WIDTH, BOARD_CANVAS_HEIGHT, BOARD_CANVAS_BACKGROUND_COLOR, BOARD_CANVAS_BACKGROUND_ALPHA);

    // Highlight board card
    for (var i = 0; i < communityCards.length; i++)
    {
        if (Hand.cardInHand(communityCards[i], combination))
        {
            Renderer.drawImage(boardCanvas, communityCards[i].filename, BOARD_CARD_X + BOARD_CARD_SPACING * i, BOARD_CARD_Y);
        }
    }

    // Draw winning hand info
    Renderer.drawText(boardCanvas, hand.name, BOARD_HAND_INFO_X, BOARD_HAND_INFO_Y, DEFAULT_FONT_REGULAR, DEFAULT_FONT_SIZE, BOARD_TEXT_COLOR);

    // Reveal NPC hole cards
    for (var i = 0; i < totalPlayers; i++)
    {
        if (players[i].isNPC)
        {
            for (var j = 0; j < players[i].holeCards.length; j++)
            {
                Renderer.drawImage(playersCanvas, players[i].holeCards[j].filename, players[i].cardPosX + PLAYERS_CARD_SPACING * j, players[i].cardPosY);
            }
        }
    }

    // Darken player background
    Renderer.fillRectAlpha(playersCanvas, 0, 0, PLAYERS_CANVAS_WIDTH, PLAYERS_CANVAS_HEIGHT, PLAYERS_CANVAS_BACKGROUND_COLOR, PLAYERS_CANVAS_BACKGROUND_ALPHA);

    // Highlight players' hole cards
    for (var i = 0; i < totalPlayers; i++)
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
    Renderer.getImageURL(session, canvas, name, function (imgURL)
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

function renderBoardCanvas(session, callback)
{
    // Draw background
    Renderer.fillRect(boardCanvas, 0, 0, BOARD_CANVAS_WIDTH, BOARD_CANVAS_HEIGHT, BOARD_CANVAS_BACKGROUND_COLOR);

    // Draw blinds info
    var boardInfo = "$" + smallBlind + "/" + "$" + bigBlind + " " + ROUND_NAMES[roundIndex];
    Renderer.drawText(boardCanvas, boardInfo, BOARD_BLINDS_INFO_X, BOARD_BLINDS_INFO_Y, DEFAULT_FONT_REGULAR, DEFAULT_FONT_SIZE, BOARD_TEXT_COLOR);

    // Draw pot
    Renderer.drawText(boardCanvas, "Pot", BOARD_POT_X, BOARD_POT_Y, DEFAULT_FONT_REGULAR, DEFAULT_FONT_SIZE, BOARD_TEXT_COLOR);
    Renderer.drawText(boardCanvas, "$" + calculatePot(), BOARD_POT_AMOUNT_X, BOARD_POT_AMOUNT_Y, DEFAULT_FONT_REGULAR, DEFAULT_FONT_SIZE, BOARD_TEXT_COLOR);

    // Draw community cards
    drawCommunityCards();

    // Render canvas
    renderCanvas(session, boardCanvas, ROUND_NAMES[roundIndex], null, null, null, function (result)
    {
        renderPlayersCanvas(session, callback);
    });
}

function renderPlayersCanvas(session, callback)
{
    // Draw background
    var halfCanvasWidth = PLAYERS_CANVAS_WIDTH >> 1;
    Renderer.fillRect(playersCanvas, 0, 0, halfCanvasWidth - 1, PLAYERS_CANVAS_HEIGHT, PLAYERS_CANVAS_BACKGROUND_COLOR);
    Renderer.fillRect(playersCanvas, halfCanvasWidth + 1, 0, halfCanvasWidth + 2, PLAYERS_CANVAS_HEIGHT, PLAYERS_CANVAS_BACKGROUND_COLOR);

    // Draw players' hole cards
    for (var i = 0; i < totalPlayers; i++)
    {
        for (var j = 0; j < players[i].holeCards.length; j++)
        {
            var filename = CARD_BACK_FILENAME;
            if (!players[i].isNPC || ROUND_NAMES[roundIndex] == 'The Showdown')
            {
                filename = players[i].holeCards[j].filename;
            }

            Renderer.drawImage(playersCanvas, filename, players[i].cardPosX + PLAYERS_CARD_SPACING * j, players[i].cardPosY);
        }
    }

    // Draw players' name and money
    Renderer.drawText(playersCanvas, session.message.user.name, HUMAN_NAME_X, HUMAN_NAME_Y, DEFAULT_FONT_REGULAR, DEFAULT_FONT_SIZE, BOARD_TEXT_COLOR);
    Renderer.drawText(playersCanvas, "$" + players[humanPlayerIndex].currentFunds, HUMAN_MONEY_X, HUMAN_MONEY_Y, DEFAULT_FONT_REGULAR, DEFAULT_FONT_SIZE, BOARD_TEXT_COLOR);
    Renderer.drawText(playersCanvas, "Bot", NPC_NAME_X, NPC_NAME_Y, DEFAULT_FONT_REGULAR, DEFAULT_FONT_SIZE, BOARD_TEXT_COLOR);
    Renderer.drawText(playersCanvas, "$" + players[1].currentFunds, NPC_MONEY_X, NPC_MONEY_Y, DEFAULT_FONT_REGULAR, DEFAULT_FONT_SIZE, BOARD_TEXT_COLOR);

    // Draw dealer chip
    Renderer.drawImage(playersCanvas, PLAYERS_DEALER_CHIP_FILENAME, players[dealerIndex].dealerChipX, players[dealerIndex].dealerChipY);

    // Render canvas
    renderCanvas(session, playersCanvas, 'playersCanvas', null, null, null, callback);
}

function renderBettingOptions(session)
{
    var choices = players[humanPlayerIndex].getBettingOptions(bigBlind, RAISE_RATE, currentBet);
    var options = 
    { 
        listStyle: builder.ListStyle['button'] 
    };

    for (var i = 0; i < choices.length; i++)
    {
        if (choices[i] == 'Bet')
        {
            choices[i] += ' $' + bigBlind;
        }
        else if (choices[i] == 'Raise')
        {
            choices[i] += ' $' + (currentBet * RAISE_RATE);
        }
    }

    builder.Prompts.choice(session, "", choices.join('|'), options);
}

function renderShowdown(session, bestHand, callback)
{
    // Draw winning hand
    drawWinningHand(bestHand.hand, bestHand.combination);

    // Render canvas
    renderCanvas(session, boardCanvas, ROUND_NAMES[roundIndex], null, null, null, function ()
    {
        renderCanvas(session, playersCanvas, 'playersCanvas', null, null, null, callback);
    });
}

//=========================================================
// Input
//=========================================================

function updateInput(session, results)
{
    var entity = results.response.entity;

    if (state == STATE_PLAYERS_INPUT)
    {
        processPlayerBettingOption(session, players[humanPlayerIndex], entity);
    }
    else if (state == STATE_RESULT)
    {
        if (entity == 'New game')
        {
            switchState(session, STATE_INIT, false);
        }
        else
        {
            switchState(session, STATE_NEW_ROUND, false);
        }
    }
}

//=========================================================
// Board
//=========================================================

function initBoardCards()
{
    // Initialize the board cards
    boardCards = [];

    for (var i = 0; i < NUMBER_OF_SUITS; i++)
    {
        for (var j = 0; j < NUMBER_OF_VALUES; j++)
        {
            var card = new Card(i, j);
            boardCards.push(card);
        }
    }

    // Shuffle the board cards
    shuffleBoardCards();
}

function shuffleBoardCards()
{
    for (var i = 0; i < DECK_SHUFFLE_TIMES; i++)
    {
        var cardIndex1 = Math.floor(Math.random() * NUMBER_OF_CARDS);
        var cardIndex2 = Math.floor(Math.random() * NUMBER_OF_CARDS);
        var card = boardCards[cardIndex1];
        boardCards[cardIndex1] = boardCards[cardIndex2];
        boardCards[cardIndex2] = card;
    }
}

function initBoard()
{
    // Init the board cards
    initBoardCards();

    // Init the players
    initPlayers();

    // Init the dealer
    winnerIndices = [];
    dealerIndex = Math.floor(Math.random() * totalPlayers);
    currentPlayerIndex = dealerIndex;
    previousPlayerIndex = -1;

    // Init board round
    roundIndex = 0;
    smallBlind = SMALL_BLIND;
    bigBlind = BIG_BLIND;
    currentPot = 0;
	currentBet = 0;

    // Init community cards
    initCommunityCards();
}

function resetBoard()
{
    // Init the board cards
    initBoardCards();

    // Reset the players
    resetPlayers();

    // Init the dealer
    winnerIndices = [];
    dealerIndex = getNextPlayer(dealerIndex);
    currentPlayerIndex = dealerIndex;
    previousPlayerIndex = -1;

    // Init board round
    roundIndex = 0;
	currentBet = 0;
    currentPot = 0;

    // Init community cards
    initCommunityCards();
}

function nextBoardCard()
{
    if (boardCards.length == 0)
    {
        return null;
    }

    var cardIndex = Math.floor(Math.random() * boardCards.length);
    var card = boardCards[cardIndex];
    boardCards.splice(cardIndex, 1);

    return card;
}

function initCommunityCards()
{
    if (ROUND_NAMES[roundIndex] == 'Pre-Flop')
    {
        communityCards = [];
    }    
    else if (ROUND_NAMES[roundIndex] == 'The Flop')
    {
        communityCards.push(nextBoardCard());
        communityCards.push(nextBoardCard());
        communityCards.push(nextBoardCard());
    }
    else if (ROUND_NAMES[roundIndex] == 'The Turn' || ROUND_NAMES[roundIndex] == 'The River')
    {
        communityCards.push(nextBoardCard());
    }
}

function nextPlayer()
{
    previousPlayerIndex = currentPlayerIndex;
    currentPlayerIndex = (++currentPlayerIndex) % totalPlayers;
}

function getNextPlayer(playerIndex)
{
    return ((playerIndex + 1) % totalPlayers);
}

function calculateTotalBetAmount()
{
    var totalBetAmount = 0;

    for (var i = 0; i < totalPlayers; i++)
    {
        totalBetAmount += players[i].betAmount;
    }

    return totalBetAmount;
}

function calculatePot()
{
    return (currentPot + calculateTotalBetAmount());
}

//=========================================================
// Players
//=========================================================

function initPlayers()
{
    // Heads-up mode
    totalPlayers = 2;
    players = [];

    // Human player is always the first element in the array
    humanPlayerIndex = 0;
    players.push(new Player(false, ROUND_BUYINS, HUMAN_CARD_X, HUMAN_CARD_Y, HUMAN_DEALER_CHIP_X, HUMAN_DEALER_CHIP_Y));

    // Init NPC
    for (var i = 1; i < totalPlayers; i++)
    {
        players.push(new Player(true, ROUND_BUYINS, NPC_CARD_X, NPC_CARD_Y, NPC_DEALER_CHIP_X, NPC_DEALER_CHIP_Y));
    }

    // Init players' hole cards
    for (var i = 0; i < totalPlayers; i++)
    {
        players[i].addCard(nextBoardCard());
	    players[i].addCard(nextBoardCard());
    }
}

function resetPlayers()
{
    for (var i = 0; i < totalPlayers; i++)
    {
        players[i].reset();
        players[i].addCard(nextBoardCard());
	    players[i].addCard(nextBoardCard());
    }
}

function processPlayerBettingOption(session, player, bettingOption)
{
    var bettingText = bettingOption;

    if (bettingOption.startsWith('Bet'))
    {
        bettingText += " $" + bigBlind;        
        player.bet(bigBlind);
        currentBet = bigBlind;
    }
    else if (bettingOption.startsWith('Raise'))
    {
        var raiseAmount = currentBet * RAISE_RATE;
        var reraise = false;
        bettingText += " $" + raiseAmount;
        for (var i = 0; i < totalPlayers; i++)
        {
            if (players[i].betOption == 'Raise')
            {
                reraise = true;
                break;
            }
        }

        player.raise(currentBet, raiseAmount, reraise);
        currentBet += raiseAmount;
    }
    else if (bettingOption.startsWith('Call'))
    {
        var callAmount = Math.min(player.currentFunds, currentBet - player.betAmount);
        bettingText += " $" + callAmount;        
        player.call(callAmount);
    }
    else if (bettingOption.startsWith('Check'))
    {
        player.check();
    }
    else if (bettingOption.startsWith('All-In'))
    {
        bettingText += " $" + player.currentFunds;
        currentBet = player.currentFunds;
        player.allIn();
    }
    else if (bettingOption.startsWith('Fold'))
    {
        player.fold();
    }

    if (player.isNPC)
    {
        var msg = new builder.Message(session);
        msg.text("Bot: " + bettingText);
        session.send(msg);        
    }

    nextPlayer();
}

//=========================================================
// User data
//=========================================================

function createPlayerInfo(session)
{
    playerInfo = 
    {
        "name":session.message.user.name,
        "funds":INITIAL_FUNDS,
        "win":0,
        "lose":0,
        "fold":0,
        "check":0,
        "call":0,
        "bet":0,
        "raise":0,
        "reraise":0
    };

    return playerInfo;
}

function saveUserData(session, callback)
{
    var playerInfo = session.userData.playerInfo;
    fs.writeFile(session.userData.localDir + '/playerInfo.json', JSON.stringify(playerInfo), 'utf8', callback);
}

function loadUserData(session)
{
    fs.readFile(session.userData.localDir + '/playerInfo.json', 'utf8', function (err, data) 
    {
        if (err)
        {
            console.log('Unable to load player info!');
            return;
        }

        session.userData.playerInfo = JSON.parse(data);
    });
}

function updateUserData(session)
{
    var playerInfo = session.userData.playerInfo;
    if (playerInfo && (players.length != 0) && state != STATE_INIT)
    {
        session.userData.playerInfo.funds += players[humanPlayerIndex].currentFunds - ROUND_BUYINS;
        saveUserData(session, null);
        switchState(session, STATE_INIT, false);
    }
}

//=========================================================
// State machine
//=========================================================

function stateInit(session)
{
    initBoard();
    switchState(session, STATE_BOARD, true);
}

function stateNewRound(session)
{
    resetBoard();
    switchState(session, STATE_BOARD, true);
}

function stateBoard(session)
{
    if (ROUND_NAMES[roundIndex] == 'Pre-Flop')
    {
        // Small blinds
        players[dealerIndex].bet(smallBlind);
        players[dealerIndex].betOption = '';
        nextPlayer();

        // Big blinds
        for (var i = 0; i < totalPlayers - 1; i++)
        {
            players[currentPlayerIndex].bet(bigBlind);
            players[currentPlayerIndex].betOption = '';
            nextPlayer();
        }

        if (players[0].currentFunds < 0 || players[1].currentFunds < 0)
        {
            switchState(session, STATE_RESULT, true);
        }
        else
        {
            currentBet = bigBlind;

            renderBoardCanvas(session, function (result)
            {
                switchState(session, STATE_PLAYERS_INPUT, true);
            });
        }
    }
    else if (ROUND_NAMES[roundIndex] == 'The Showdown')
    {
        var bestHand = Hand.findBestHand(communityCards.concat(players[humanPlayerIndex].holeCards));

        for (var i = 1; i < totalPlayers; i++)
        {
            var result = Hand.findBestHand(communityCards.concat(players[i].holeCards));
            if (Hand.isGreater(result.hand, bestHand.hand))
            {
                bestHand = result;
            }
        }

        for (var i = 0; i < totalPlayers; i++)
        {
            var result = Hand.findBestHand(communityCards.concat(players[i].holeCards));
            if (Hand.isEqual(result.hand, bestHand.hand))
            {
                winnerIndices.push(i);
            }
        }

        renderShowdown(session, bestHand, function (result)
        {
            switchState(session, STATE_RESULT, true);
        });
    }
    else
    {
        initCommunityCards();
        renderBoardCanvas(session, function (result)
        {
            switchState(session, STATE_PLAYERS_INPUT, true);
        });
    }
}

function statePlayersInput(session)
{
    var foldedPlayersCount = 0;
    var possibleWinnerIndex = 0;
    var finishBetting = true;

    for (var i = 0; i < totalPlayers; i++)
    {
        if ((players[i].currentFunds != 0) && (players[i].betOption == '' || (players[i].betAmount != currentBet)))
        {
            finishBetting = false;
        }

        if (players[i].betOption == 'Fold')
        {
            foldedPlayersCount++;
        }
        else
        {
            possibleWinnerIndex = i;
        }
    }

    if (foldedPlayersCount == (totalPlayers - 1))
    {
        winnerIndices.push(possibleWinnerIndex);
        switchState(session, STATE_RESULT, true);
    }
    else if (finishBetting)
    {
        roundIndex++;
        currentBet = 0;
        currentPot += calculateTotalBetAmount();
        for (var i = 0; i < totalPlayers; i++)
        {
            players[i].betOption = '';
            players[i].betAmount = 0;
        }
        switchState(session, STATE_BOARD, true);
    }
    else
    {
        // Player is out of chips
        if (players[currentPlayerIndex].currentFunds == 0)
        {
            players[currentPlayerIndex].pass();
            nextPlayer();
            update(session);
        }
        else
        {
            // Render player
            if (currentPlayerIndex == humanPlayerIndex)
            {
                renderBettingOptions(session);
            }
            // Render npc's choice
            else
            {
                var npcAvailableBettingOptions = players[currentPlayerIndex].getBettingOptions(bigBlind, RAISE_RATE, currentBet);
                var npcChosenBettingOption = AI.chooseBettingOption(communityCards, players[currentPlayerIndex].holeCards, npcAvailableBettingOptions, 
                                                                    players[currentPlayerIndex].currentFunds, players[currentPlayerIndex].betAmount, 
                                                                    currentBet);

                processPlayerBettingOption(session, players[currentPlayerIndex], npcChosenBettingOption);
                update(session);
            }
        }
    }
}

function stateResult(session)
{
    if (winnerIndices.length != 0)
    {
        var pot = calculatePot();
        var averageAmount = pot / winnerIndices.length;
        for (var i = 0; i < winnerIndices.length; i++)
        {
            players[winnerIndices[i]].currentFunds += averageAmount;
        }
    }

    // Update user's stats
    session.userData.playerInfo.fold += players[humanPlayerIndex].foldCount;
    session.userData.playerInfo.check += players[humanPlayerIndex].checkCount;
    session.userData.playerInfo.call += players[humanPlayerIndex].callCount;
    session.userData.playerInfo.bet += players[humanPlayerIndex].betCount;
    session.userData.playerInfo.raise += players[humanPlayerIndex].raiseCount;
    session.userData.playerInfo.reraise += players[humanPlayerIndex].reraiseCount;
    if (winnerIndices.indexOf(humanPlayerIndex) != -1)
    {
        session.userData.playerInfo.win++;
    }
    else
    {
        session.userData.playerInfo.lose++;
    }

    if (players[humanPlayerIndex].currentFunds <= 0)
    {
        session.userData.playerInfo.funds -= ROUND_BUYINS;
        builder.Prompts.choice(session, "Sorry, you have lost the match. Your current funds is $" + session.userData.playerInfo.funds + ".", "New game", 
        { 
            listStyle: builder.ListStyle['button']
        });
    }
    else if (players[1].currentFunds <= 0)
    {
        session.userData.playerInfo.funds += ROUND_BUYINS;
        builder.Prompts.choice(session, "You won! Your current funds is $" + session.userData.playerInfo.funds + ".", "New game", 
        { 
            listStyle: builder.ListStyle['button']
        });
    }
    else
    {
        builder.Prompts.choice(session, "", "Next round", 
        { 
            listStyle: builder.ListStyle['button']
        });
    }

    saveUserData(session, null);
}

//=========================================================
// Export functions
//=========================================================

exports.switchState = switchState;
exports.init = init;
exports.update = update;
exports.updateInput = updateInput;
exports.createPlayerInfo = createPlayerInfo;
exports.saveUserData = saveUserData;
exports.loadUserData = loadUserData;
exports.updateUserData = updateUserData;
exports.INITIAL_FUNDS = INITIAL_FUNDS;
exports.ROUND_BUYINS = ROUND_BUYINS;