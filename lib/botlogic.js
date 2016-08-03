//=========================================================
// Import modules
//=========================================================

var restify = require('restify');
var builder = require('botbuilder');
var fs = require('fs');
var path = require('path');
var Defs = require('./defs');
var Strings = require('./strings');
var Game = require('./game');

//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
var server = restify.createServer();

// Serve static files
server.get(Defs.Regex.SERVE_STATIC_ASSETS, restify.serveStatic
({
    directory: Defs.Path.ROOT_DIR
}));

server.get(Defs.Regex.SERVE_STATIC_USERS, restify.serveStatic
({
    directory: Defs.Path.ROOT_DIR
}));

server.listen(process.env.port || process.env.PORT || Defs.DEFAULT_PORT, function () 
{
   console.log(Strings.SERVER_LISTENING, server.name, server.url); 
});

// Create chat bot
var connector = new builder.ChatConnector
({
	appId: process.env.MICROSOFT_APP_ID,
	appPassword: process.env.MICROSOFT_APP_PASSWORD
});

var bot = new builder.UniversalBot(connector);
server.post(Defs.MESSAGING_ENDPOINT, connector.listen());

//=========================================================
// Activity Events
//=========================================================

bot.on('conversationUpdate', function (message) 
{
   // Check for group conversations
    if (message.address.conversation.isGroup) 
    {
        // Send a hello message when bot is added
        if (message.membersAdded) 
        {
            message.membersAdded.forEach(function (identity) 
            {
                if (identity.id === message.address.bot.id) 
                {
                    var reply = new builder.Message();
                    reply.address(message.address);
                    reply.text(Strings.HI_ALL);
                    bot.send(reply);
                }
            });
        }

        // Send a goodbye message when bot is removed
        if (message.membersRemoved) 
        {
            message.membersRemoved.forEach(function (identity) 
            {
                if (identity.id === message.address.bot.id) 
                {
                    var reply = new builder.Message();
                    reply.address(message.address);
                    reply.text(Strings.BYE_ALL);
                    bot.send(reply);
                }
            });
        }
    }
});

bot.on('contactRelationUpdate', function (message) 
{
    if (message.action === 'add') 
    {
        var name = message.user ? message.user.name : null;
        var reply = new builder.Message();
        reply.address(message.address);
        reply.text(Strings.HI, name || Strings.there);
        bot.send(reply);
    }
    else 
    {
        // delete their data
    }
});

bot.on('typing', function (message) 
{
    // User is typing
});

bot.on('deleteUserData', function (message) 
{
    // User asked to delete their data
});

//=========================================================
// Bots Middleware
//=========================================================

// Anytime the major version is incremented any existing conversations will be restarted.
bot.use(builder.Middleware.dialogVersion({ version: 1.0, resetCommand: Defs.Regex.DIALOG_RESET_BOT }));

//=========================================================
// Bots Global Actions
//=========================================================

bot.beginDialogAction(Strings.DialogAction.HELP, Strings.Dialog.HELP, { matches: Defs.Regex.DIALOG_HELP });
bot.beginDialogAction(Strings.DialogAction.MENU, Strings.Dialog.MENU, { matches: Defs.Regex.DIALOG_MENU });
bot.beginDialogAction(Strings.DialogAction.RESET, Strings.Dialog.RESET, { matches: Defs.Regex.DIALOG_RESET });

//=========================================================
// Bots Dialogs
//=========================================================

bot.dialog(Strings.Dialog.ROOT, 
[
    function (session) 
    {
        session.beginDialog(Strings.Dialog.HELP);
    },
    function (session, results) 
    {
        // Display menu
        session.beginDialog(Strings.Dialog.MENU);
    },
    function (session, results) 
    {
        // Always say goodbye
        session.send(Strings.BYE);
    }
]);

bot.dialog(Strings.Dialog.MENU, 
[
    function (session) 
    {
        Game.updateUserData(session);

        builder.Prompts.choice(session, "", [Strings.Menu.NEW_GAME, Strings.Menu.STATISTICS, Strings.Menu.LEADERBOARD].join("|"), 
        { 
            listStyle: builder.ListStyle['button']
        });
    },
    function (session, results) 
    {
        if (results.response && results.response.entity == Strings.Menu.NEW_GAME) 
        {
            Game.init(session);

            if (session.userData.playerInfo && session.userData.playerInfo.funds < Defs.Board.ROUND_BUYINS)
            {
                builder.Prompts.choice(session, Strings.RESET_GAME, [Strings.YES, Strings.NO].join("|"), 
                { 
                    listStyle: builder.ListStyle['button']
                });
            }
            else
            {
                // Launch game
                session.beginDialog(Strings.Dialog.GAME);
            }
        } 
        else if (results.response && results.response.entity == Strings.Menu.STATISTICS) 
        {
            Game.init(session);

            var winLoseCount = session.userData.playerInfo.win + session.userData.playerInfo.lose;
            var totalActions = session.userData.playerInfo.fold + session.userData.playerInfo.check + session.userData.playerInfo.call + session.userData.playerInfo.bet + session.userData.playerInfo.raise + session.userData.playerInfo.reraise;
            var winRate = (winLoseCount === 0) ? 0 : ((session.userData.playerInfo.win * 100) / winLoseCount).toPrecision(2);
            var foldRate = (totalActions === 0) ? 0 : ((session.userData.playerInfo.fold * 100) / totalActions).toPrecision(2);
            var checkRate = (totalActions === 0) ? 0 : ((session.userData.playerInfo.check * 100) / totalActions).toPrecision(2);
            var callRate = (totalActions === 0) ? 0 : ((session.userData.playerInfo.call * 100) / totalActions).toPrecision(2);
            var betRate = (totalActions === 0) ? 0 : ((session.userData.playerInfo.bet * 100) / totalActions).toPrecision(2);
            var raiseRate = (totalActions === 0) ? 0 : ((session.userData.playerInfo.raise * 100) / totalActions).toPrecision(2);
            var reraiseRate = (totalActions === 0) ? 0 : ((session.userData.playerInfo.reraise * 100) / totalActions).toPrecision(2);

            session.send(session.userData.playerInfo.name + 
                         Strings.Statistics.FUNDS + session.userData.playerInfo.funds + 
                         Strings.Statistics.WIN + winRate + "%" + 
                         Strings.Statistics.FOLD + foldRate + "%" + 
                         Strings.Statistics.CHECK + checkRate + "%" + 
                         Strings.Statistics.CALL + callRate + "%" + 
                         Strings.Statistics.BET + betRate + "%" + 
                         Strings.Statistics.RAISE + raiseRate + "%" + 
                         Strings.Statistics.RERAISE + reraiseRate + "%");
                         
            session.replaceDialog(Strings.Dialog.MENU);
        } 
        else if (results.response && results.response.entity == Strings.Menu.LEADERBOARD) 
        {
            var usersRootDir = Defs.Path.USERS_DIR;
            var usersInfo = []; 
            fs.readdir(usersRootDir, function(err, files) 
            { 
                var usersDirs = [];
                for (var i = 0; i < files.length; i++) 
                { 
                    if (files[i][0] !== '.')
                    {
                        usersDirs.push(files[i]);
                    }
                }

                var completedCount = 0;
                for (var i = 0; i < usersDirs.length; i++) 
                {
                    fs.readFile(path.join(usersRootDir, usersDirs[i], Defs.Path.PLAYER_INFO_FILE), 'utf8', function (err, data) 
                    {
                        completedCount++;
                        if (!err)
                        {
                            usersInfo.push(JSON.parse(data));
                        }

                        // All users info have been loaded
                        if (completedCount == usersDirs.length)
                        {
                            usersInfo.sort
                            (
                                function(usersInfo1, usersInfo2)
                                {
                                    return usersInfo2.funds - usersInfo1.funds;
                                }
                            );

                            // Display Top 5 players
                            var leaderBoardMessage = "";
                            var max = Math.min(usersInfo.length, 5);
                            for (var i = 0; i < max; i++)
                            {
                                leaderBoardMessage += (i + 1) + ". " + usersInfo[i].name + " ($" + usersInfo[i].funds + ")" + "\n";
                            }

                            session.send(leaderBoardMessage);
                            session.replaceDialog(Strings.Dialog.MENU);
                        }
                    });
                }
            });
        } 
        else if (results.response && results.response.entity == Strings.YES) 
        {
            session.replaceDialog(Strings.Dialog.RESET);
        } 
        else if (results.response && results.response.entity == Strings.NO) 
        {
            session.replaceDialog(Strings.Dialog.MENU);
        } 
    },
    function (session, results) 
    {
        // The menu runs a loop until the user chooses to (quit).
        session.replaceDialog(Strings.Dialog.MENU);
    }
]).reloadAction(Strings.DialogAction.RELOAD_MENU, null, { matches: Defs.Regex.DIALOG_RELOAD });

bot.dialog(Strings.Dialog.HELP, 
[
    function (session) 
    {
        session.endDialog(Strings.HELP);
    }
]);

bot.dialog(Strings.Dialog.RESET, 
[
    function (session) 
    {
        session.userData.playerInfo = Game.createPlayerInfo(session);
        Game.saveUserData(session, function ()
        {
            session.replaceDialog(Strings.Dialog.ROOT);
        });
    }
]);

bot.dialog(Strings.Dialog.GAME, 
[
    function (session) 
    {
        Game.update(session);
    },
    function (session, results) 
    {
        // Update user's input
        Game.updateInput(session, results);
        
        // Game loop
        session.replaceDialog(Strings.Dialog.GAME);
    }
]);
