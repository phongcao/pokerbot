//=========================================================
// Import modules
//=========================================================

var restify = require('restify');
var builder = require('botbuilder');
var fs = require('fs');
var path = require('path');
var Defs = require('./defs');
var Strings = require('./strings');
var Menu = require('./menu');
var Game = require('./game');

//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
var server = restify.createServer();

// Serve static files
server.get(Defs.Regex.SERVE_STATIC_ROOT, restify.serveStatic
({
	directory: Defs.Path.ROOT_DIR
}));

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
        var dirName = session.message.user.id.replace(':', '');
        session.userData.dirName = dirName;
        session.userData.localDir = path.join(Defs.Path.USERS_DIR, session.userData.dirName);;

        // Create a new directory for user
        if (!fs.existsSync(dirName))
        {
            fs.mkdirSync(dirName);
            session.userData.playerInfo = Game.createPlayerInfo(session);
            Game.saveUserData(session, null);
        } 

        // Display help
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
        // Display main menu
        Menu.main(session);
    },
    function (session, results) 
    {
        if (results.response && results.response.entity == Strings.Menu.NEW_GAME) 
        {
            Menu.newGame(session);
        } 
        else if (results.response && results.response.entity == Strings.Menu.STATISTICS) 
        {
            Menu.statistics(session);
        } 
        else if (results.response && results.response.entity == Strings.Menu.LEADERBOARD) 
        {
            Menu.leaderBoard(session);
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
