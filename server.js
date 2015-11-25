var config = require('./config.js');

var TelegramBot = require('node-telegram-bot-api');
var moment = require('moment');

var bot = new TelegramBot(config.token, {polling: true});

var printers = new Map();

bot.onText(/^\/start(@CoredumpPrinterBot)?$/, function(message, match) {
  var messageId = message.message_id;
  var chatId = message.chat.id;
  bot.sendMessage(chatId, 'Hey!', {'reply_to_message_id': messageId});
  checkGroupChat(message.chat);
});

bot.onText(/^\/help(@CoredumpPrinterBot)?$/, function(message, match) {
  var chatId = message.chat.id;
  bot.sendMessage(chatId, 'Ich verwalte Reservierungen für unseren 3D-Drucker.\n\nUm eine Reservierung zu tätigen: /reservetime\nUm kommende Reservierungen anzuzeigen: /reservations\nUm eine Reservierung zu löschen: Mit /reservetime die Dauer auf 0 setzen.\nFremde Zeiten überschreiben ist möglich – ich bin nicht da, um Konflikte zu lösen.');
  checkGroupChat(message.chat);
});

bot.onText(/^\/reservations(@CoredumpPrinterBot)?$/, function(message) {
  var chatId = message.chat.id;
  
  cleanReservations();
  if (!checkGroupChat(message.chat)) {
    return;
  }
  
  if (!printers.has(chatId)) {
    bot.sendMessage(chatId, 'Nächste Reservationen: keine.');
    return;
  }
  
  var printer = printers.get(chatId);
  var fromTimes = [...printer.keys()].sort();
  var message = 'Nächste Reservationen:';
  fromTimes.forEach(function(fromTime) {
    var reservation = printer.get(fromTime);
    message += '\n' + moment.unix(fromTime).format('YYYY-MM-DD H:mm') + ' für ' + reservation.durationHours + ' Stunden von ' + reservation.name;
  });
  
  bot.sendMessage(chatId, message);
});

bot.onText(/^\/reservetime(@CoredumpPrinterBot)? ([^ ]* [^ ]*) (\d{1,2})/, function(message, match) {
  var messageId = message.message_id;
  var chatId = message.chat.id;
  if (!checkGroupChat(message.chat)) {
    return;
  }
  
  var fromTime = match[2];
  if (!moment(Date.parse(fromTime)).isValid()) {
    bot.sendMessage(chatId, 'Ungültiges Datum/Uhrzeit. Bitte Kommando in der Form /reservetime YYYY-MM-DD HH:mm HH angeben, z. B. /reservetime 2017-02-12 18:15 6 um den Drucker am 12. Februar 2017 ab 18:15 Uhr für 6 Stunden zu reservieren.', {'reply_to_message_id': messageId});
    return;
  }
  
  var durationHours = match[3];
  var name = getName(message.from);
  addReservation(chatId, fromTime, durationHours, name);
  
  var fromTimeString = moment(Date.parse(fromTime)).format('YYYY-MM-DD H:mm');
  bot.sendMessage(chatId, name + ' hat den Drucker ab ' + fromTime + ' für ' + durationHours + ' Stunden reserviert.');
});

bot.onText(/^\/reservetime(@CoredumpPrinterBot)?( .*)?$/, function(message, match) {
  var chatId = message.chat.id;
  var messageId = message.message_id;
  
  if (!match[2] || !/[^ ]* [^ ]* \d{1,2}/.test(match[2])) {
    bot.sendMessage(chatId, 'Bitte Kommando in der Form /reservetime YYYY-MM-DD HH:mm HH angeben, z. B. /reservetime 2017-02-12 18:15 6 um den Drucker am 12. Februar 2017 ab 18:15 Uhr für 6 Stunden zu reservieren.', {'reply_to_message_id': messageId});
    checkGroupChat(message.chat);
  }
});

function getName(user) {
  var firstName = user.first_name;
  var lastName = user.last_name;
  var username = user.username;
  
  return firstName + (lastName ? ' ' + lastName : '') + (username ? ' (@' + username + ')' : '');
}

function addReservation(printerId, fromTime, durationHours, name) {
  if (!printers.has(printerId)) {
  	printers.set(printerId, new Map());
  }
  
  printers.get(printerId).set(moment(Date.parse(fromTime)).unix(), {
    durationHours: durationHours,
    name: name
  });
  
  cleanReservations();
}

function cleanReservations() {
  var now = moment().unix();
  printers.forEach(function(reservations, printerId) {
    reservations.forEach(function(reservation, fromTime) {
      if (fromTime + reservation.durationHours * 3600 < now || reservation.durationHours === 0) {
        reservations.delete(fromTime);
      }
    });
    
    if (reservations.size === 0) {
      printers.delete(printerId);
    }
  });
}

function checkGroupChat(chat) {
  if (chat.type != 'private') {
    return true;
  }
  
  setTimeout(function () {
    bot.sendMessage(chat.id, 'Ich funktioniere nur in Gruppenchats, weil ich eine eigene Reservierungsliste für jeden Gruppenchat verwalte.');
  }, 1000);
  return false;
}
