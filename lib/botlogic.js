//=========================================================
// Import modules
//=========================================================

var restify = require('restify');
var builder = require('botbuilder');
var fs = require('fs');
var Game = require('./game');

//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
var server = restify.createServer();

// Serve static files
server.get(/\/assets\/?.*/, restify.serveStatic
({
    directory: __dirname + '/..'
}));

server.get(/\/users\/?.*/, restify.serveStatic
({
    directory: __dirname + '/..'
}));

server.listen(process.env.port || process.env.PORT || 3978, function () 
{
   console.log('%s listening to %s', server.name, server.url); 
});

// Create chat bot
var connector = new builder.ChatConnector
({
	appId: process.env.MICROSOFT_APP_ID,
	appPassword: process.env.MICROSOFT_APP_PASSWORD
});
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());

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
                    reply.text("Hello everyone!");
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
                    reply.text("Goodbye");
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
        reply.text("Hi " + name + ", thanks for adding me.");
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
bot.use(builder.Middleware.dialogVersion({ version: 1.0, resetCommand: /^resetBot/i }));

//=========================================================
// Bots Global Actions
//=========================================================

bot.beginDialogAction('help', '/help', { matches: /^help/i });
bot.beginDialogAction('menu', '/menu', { matches: /^menu/i });
bot.beginDialogAction('reset', '/reset', { matches: /^reset/i });

//=========================================================
// Bots Dialogs
//=========================================================

bot.dialog('/', 
[
    function (session) 
    {
        session.beginDialog('/help');
    },
    function (session, results) 
    {
        // Display menu
        session.beginDialog('/menu');
    },
    function (session, results) 
    {
        // Always say goodbye
        session.send("Ok... See you later!");
    }
]);

bot.dialog('/menu', 
[
    function (session) 
    {
        Game.updateUserData(session);

        builder.Prompts.choice(session, "", "New game|Statistics|Leaderboard", 
        { 
            listStyle: builder.ListStyle['button']
        });
    },
    function (session, results) 
    {
        if (results.response && results.response.entity == 'New game') 
        {
            Game.init(session);

            if (session.userData.playerInfo && session.userData.playerInfo.funds < Game.ROUND_BUYINS)
            {
                builder.Prompts.choice(session, "You don't have enough money to play. Reset your statistics and start over?", "Yes|No", 
                { 
                    listStyle: builder.ListStyle['button']
                });
            }
            else
            {
                // Launch game
                session.beginDialog('/game');
            }
        } 
        else if (results.response && results.response.entity == 'Statistics') 
        {
            Game.init(session);

            var totalActions = session.userData.playerInfo.fold + session.userData.playerInfo.check + session.userData.playerInfo.call + session.userData.playerInfo.bet + session.userData.playerInfo.raise + session.userData.playerInfo.reraise;
            if (totalActions === 0)
            {
                totalActions = 1;
            }

            var winLoseCount = session.userData.playerInfo.win + session.userData.playerInfo.lose;
            if (winLoseCount === 0)
            {
                winLoseCount = 1;
            }
            
            session.send(session.userData.playerInfo.name + 
                         "\n\nFunds: " + session.userData.playerInfo.funds + 
                         "\n\nWin: " + ((session.userData.playerInfo.win * 100) / winLoseCount).toPrecision(2) + "%" + 
                         "\n\nFold: " + ((session.userData.playerInfo.fold * 100) / totalActions).toPrecision(2) + "%" + 
                         "\n\nCheck: " + ((session.userData.playerInfo.check * 100) / totalActions).toPrecision(2) + "%" + 
                         "\n\nCall: " + ((session.userData.playerInfo.call * 100) / totalActions).toPrecision(2) + "%" + 
                         "\n\nBet: " + ((session.userData.playerInfo.bet * 100) / totalActions).toPrecision(2) + "%" + 
                         "\n\nRaise: " + ((session.userData.playerInfo.raise * 100) / totalActions).toPrecision(2) + "%" + 
                         "\n\nRe-raise: " + ((session.userData.playerInfo.reraise * 100) / totalActions).toPrecision(2) + "%");
                         
            session.replaceDialog('/menu');
        } 
        else if (results.response && results.response.entity == 'Leaderboard') 
        {
            var usersRootDir = __dirname + '/../users';
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
                    fs.readFile(usersRootDir + "/" + usersDirs[i] + '/playerInfo.json', 'utf8', function (err, data) 
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
                            session.replaceDialog('/menu');
                        }
                    });
                }
            });
        } 
        else if (results.response && results.response.entity == 'Yes') 
        {
            session.replaceDialog('/reset');
        } 
        else if (results.response && results.response.entity == 'No') 
        {
            session.replaceDialog('/menu');
        } 
    },
    function (session, results) 
    {
        // The menu runs a loop until the user chooses to (quit).
        session.replaceDialog('/menu');
    }
]).reloadAction('reloadMenu', null, { matches: /^menu|show menu/i });

bot.dialog('/help', 
[
    function (session) 
    {
        session.endDialog("Global commands that are available anytime:\n\n" + 
                          "* menu - Exits an ongoing game and returns to the menu (you'll lose your bet).\n" +
                          "* reset - Reset your statistics and start over.\n" +
                          "* help - Displays these commands.\n\n" + 
                          "Game assets:\n\n" + 
                          "http://opengameart.org/content/playing-cards-vector-png\n\n" +
                          "http://opengameart.org/content/colorful-poker-card-back\n\n" + 
                          "http://www.kenney.nl\n\n" + 
                          "http://www.dafont.com/roboto.font?l[]=10&l[]=1");
    }
]);

bot.dialog('/reset', 
[
    function (session) 
    {
        session.userData.playerInfo = Game.createPlayerInfo(session);
        Game.saveUserData(session, function ()
        {
            session.replaceDialog('/');
        });
    }
]);

bot.dialog('/game', 
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
        session.replaceDialog('/game');
    }
]);
