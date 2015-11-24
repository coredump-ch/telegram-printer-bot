var config = require('./config.js');

var TelegramBot = require('node-telegram-bot-api');
var bot = new TelegramBot(config.token, {polling: true});
bot.setWebHook(config.botURL + config.token);

bot.onText(/\/start (.+)/, function(message, match) {
  var fromId = message.from.id;
  var response = match[1];
  bot.sendMessage(fromId, response);
});
