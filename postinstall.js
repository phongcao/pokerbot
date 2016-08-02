var fs = require('fs');
var path = require('path');
var ncp = require('ncp').ncp;

// Use prebuilt node-canvas module for Windows
if (process.platform === 'win32')
{
    if (!fs.existsSync('./node_modules/canvas'))
    {
        fs.mkdirSync('./node_modules/canvas');

        ncp('./windows/node_modules/canvas', './node_modules/canvas', function (err)
        {
            if (err) 
            {
                return console.error(err);
            }
        });
    }
}

// Create users directory
if (!fs.existsSync('./users'))
{
    fs.mkdirSync('./users');
}

