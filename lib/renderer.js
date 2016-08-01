//=========================================================
// Import modules
//=========================================================

var fs = require('fs');
var Canvas = require('canvas');

//=========================================================
// Constants
//=========================================================

var HTTP_USERS                  = process.env.MICROSOFT_APP_URL + '/users/';

// BITMAP FONT
var USE_BITMAP_FONT             = true;
var BITMAP_FONT_FILE            = 'roboto-ipadhd.png';
var BITMAP_FONT_MAPPING_FILE    = 'roboto-ipadhd.fnt';
var SPACE_WIDTH                 = 10;
var CHAR_HSPACING               = -2;

//=========================================================
// Global variables
//=========================================================

var fonts = {};
var imgFont = null;
var imgFontMapping = {};

//=========================================================
// Render functions
//=========================================================

function loadFonts(fontNames)
{
    if (USE_BITMAP_FONT)
    {
        // Load bitmap font file
        var imgBuffer = fs.readFileSync(__dirname + '/../assets/fonts/' + BITMAP_FONT_FILE);
        imgFont = new Canvas.Image;
        imgFont.src = imgBuffer;

        // Load bitmap font mapping file
        var fontMappingBuffer = fs.readFileSync(__dirname + '/../assets/fonts/' + BITMAP_FONT_MAPPING_FILE).toString().split('\n');
        var charsCount = 0;
        for (var i = 0; i < fontMappingBuffer.length; i++)
        {
            if (fontMappingBuffer[i].startsWith('chars '))
            {
                charsCount = parseInt(fontMappingBuffer[i].substring(fontMappingBuffer[i].indexOf('=') + 1, fontMappingBuffer[i].length));
            }
            else if (fontMappingBuffer[i].startsWith('char '))
            {
                var charInfo = fontMappingBuffer[i].split(' ');
                var id = '';
                var charObject = {};
                for (var j = 0; j < charInfo.length; j++)
                {
                    if (charInfo[j].startsWith('id='))
                    {
                        id = charInfo[j].substring(charInfo[j].indexOf('=') + 1, charInfo[j].length);
                    }
                    else if (!charInfo[j].startsWith('char '))
                    {
                        charObject[charInfo[j].substring(0, charInfo[j].indexOf('='))] = parseInt(charInfo[j].substring(charInfo[j].indexOf('=') + 1, charInfo[j].length));
                    }
                }

                imgFontMapping[id] = charObject;
            }
        }
    }
    else
    {
        for (var i = 0; i < fontNames.length; i++)
        {
            fonts[fontNames[i]] = new Canvas.Font(fontNames[i], __dirname + '/../assets/fonts/' + fontNames[i] + '.ttf');
        }
    }
}

function fillRect(canvas, x, y, width, height, color)
{
    var context = canvas.getContext('2d');
    context.fillStyle = color;
    context.fillRect(x, y, width, height);
}

function fillRectAlpha(canvas, x, y, width, height, color, alpha)
{
    var context = canvas.getContext('2d');
    context.globalAlpha = alpha;
    context.fillStyle = color;
    context.fillRect(x, y, width, height);
    context.globalAlpha = 1.0;
}

function drawImage(canvas, imageFilename, x, y)
{
    var buffer = fs.readFileSync(__dirname + '/../assets/images/' + imageFilename);
    var context = canvas.getContext('2d');
    var image = new Canvas.Image;
    image.src = buffer;
    context.drawImage(image, 0, 0, image.width, image.height, x, y, image.width, image.height);
}

function getImageURL(session, canvas, canvasName, callback)
{
    var out = fs.createWriteStream(session.userData.localDir + '/' + canvasName + '.png');
	var stream = canvas.pngStream();
    stream.on('data', function(chunk)
    {
        out.write(chunk);
    });

    stream.on('end', function()
    {
        callback(HTTP_USERS + session.userData.dirName + '/' + canvasName + '.png');
    });
}

function drawText(canvas, text, x, y, font, size, color)
{
    if (USE_BITMAP_FONT)
    {
        var context = canvas.getContext('2d');
        var startX = x;

        for (var i = 0; i < text.length; i++)
        {
            var charId = text[i].charCodeAt(0);
            var charMap = imgFontMapping[charId];

            if (text[i] == ' ')
            {
                startX += SPACE_WIDTH;
            }
            else
            {
                context.drawImage(imgFont, charMap.x, charMap.y, charMap.width, charMap.height, startX + charMap.xoffset, y + charMap.yoffset, charMap.width, charMap.height);
                startX += charMap.xadvance + CHAR_HSPACING;
            }
        }
    }
    else
    {    
        var context = canvas.getContext('2d');
        context.font = size + 'px ' + font;
        context.fillStyle = color;
        context.fillText(text, x, y);
    }
}

//=========================================================
// Export functions
//=========================================================

exports.loadFonts = loadFonts;
exports.fillRect = fillRect;
exports.fillRectAlpha = fillRectAlpha;
exports.drawImage = drawImage;
exports.drawText = drawText;
exports.getImageURL = getImageURL;