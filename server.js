var config = require('./config.js');

var TelegramBot = require('node-telegram-bot-api');
var moment = require('moment');

var bot = new TelegramBot(config.token, {polling: true});
bot.setWebHook(config.botURL + config.token);

var printers = {};

bot.onText(/\/start/, function(message, match) {
  var chatId = message.chat.id;
  bot.sendMessage(chatId, 'Hey!');
});

bot.onText(/\/help/, function(message, match) {
  var chatId = message.chat.id;
  bot.sendMessage(chatId, 'Sorry, momentan bin ich nicht hilfreich.');
});

bot.onText(/\/reservetime ([^ ]* [^ ]*) (\d{1,2})/, function(message, match) {
  var messageId = message.message_id;
  var chatId = message.chat.id;
  
  var fromTime = match[1];
  if (!moment(fromTime).isValid()) {
    bot.sendMessage(chatId, 'Ungültiges Datum/Uhrzeit. Bitte Kommando in der Form /reservetime YYYY-MM-DD HH:mm HH angeben, z. B. /reservetime 2017-02-12 18:15 6 um den Drucker am 12. Februar 2017 ab 18:15 Uhr für 6 Stunden zu reservieren.', {'reply_to_message_id': messageId});
    return;
  }
  
  var durationHours = match[2];
  var name = getName(message.from);
  addReservation(chatId, fromTime, durationHours, name);
  
  bot.sendMessage(chatId, name + ' hat den Drucker ab ' + fromTime + ' für ' + durationHours + ' Stunden reserviert.');
});

bot.onText(/\/reservetime( .*)?$/, function(message, match) {
  var chatId = message.chat.id;
  var messageId = message.message_id;
  
  if (!match[1] || !/[^ ]* [^ ]* \d{1,2}/.test(match[1])) {
    bot.sendMessage(chatId, 'Bitte Kommando in der Form /reservetime YYYY-MM-DD HH:mm HH angeben, z. B. /reservetime 2017-02-12 18:15 6 um den Drucker am 12. Februar 2017 ab 18:15 Uhr für 6 Stunden zu reservieren.', {'reply_to_message_id': messageId});
  }
});

function getName(user) {
  var firstName = user.first_name;
  var lastName = user.last_name;
  var username = user.username;
  
  return firstName + (lastName ? ' ' + lastName : '') + (username ? ' (@' + username + ')' : '');
}

function addReservation(chatId, fromTime, durationHours, name) {
  if (!printers[chatId]) {
  	printers[chatId] = {};
  }
  
  printers[chatId][moment(fromTime).unix()] = {
    durationHours: durationHours,
    name: name
  };
}
