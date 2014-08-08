/**
 * Created by zoonman on 8/3/14.
 */
var moment = require('moment');

module.exports = function(app, db) {
  var chatLog = db.collection('chatlog');

  app.get('/logs/', function(req, res) {
    chatLog.aggregate([
      {
        $group: {
          _id: { $year: "$ts"},
          quantity: {$sum: 1}
        }
      }
    ], function(err, result) {
      return res.render('logsYearly.jade',
          {year: req.params.year, month: req.params.month, chatLogs: result});
    });
  });

  app.get('/logs/convert', function(req, res) {
    chatLog.find().toArray(function(err, items) {
      items.forEach(function(itVal) {
        if (typeof itVal.ts == "number") {
          chatLog.update(
              {_id: itVal._id},
              {'$set': {ts: new Date(itVal.ts)}},
              function(err, done) {
              }
          );
        }
      });
      return res.render('rules.jade', {converted: true});
    });
  });

  app.get('/logs/:year', function(req, res) {
    chatLog.aggregate([
      {$match: {ts: {$gte: new Date(req.params.year +
          "-01-01T00:00:00.000Z"), $lte: new Date(req.params.year +
          "-12-31T23:59:59.999Z")}}},
      {$group: {_id: {$month: "$ts"}, quantity: {$sum: 1}}}
    ], function(err, result) {
      return res.render('logsMonthly.jade',
          {year: req.params.year, chatLogs: result});
    });

  });

  app.get('/logs/:year/:month', function(req, res) {
    var sinceDate = moment.utc(req.params.year + "-" + req.params.month +
            "-01 00:00:00.000", 'YYYY-M-D H:m:s.SSS'),
        untilDate = moment(sinceDate).add('months', 1),
        firstDay = sinceDate.weekday();
    if (sinceDate.isValid() && untilDate.isValid()) {
      chatLog.aggregate([
        {$match: {ts: {
          $gte: new Date(sinceDate),
          $lte: new Date(untilDate)}}
        },
        {$group: {_id: {$dayOfMonth: "$ts"}, quantity: {$sum: 1}}},
        {$sort: {_id: 1} }
      ], function(err, result) {

        var cal = [], totalBlocks = firstDay + 31;

        for (var i = 0; i < totalBlocks; i++) {
          cal[i] = {_id: i < firstDay ? ' ' : i - firstDay +1 };
        }

        result.forEach(function(value, index) {
          cal[value._id + firstDay - 1] = value;
        });

        var lastMonthDayNumber = untilDate.subtract('days', 1).date();

        for (var i = 0; i < totalBlocks; i++) {
          cal[i]['breakline'] = i % 7 == 0 ? '<br>' : '';
          cal[i]['css'] = (i < firstDay || i >  lastMonthDayNumber + firstDay - 1) ? ' invisible ' : '';
        }

        return res.render('logsDaily.jade',
            {year: req.params.year, month: req.params.month,

              calendar: cal,
              chatLogs: result});
      });
    } else {

    }
  });

  app.get('/logs/:year/:month/:dy', function(req, res) {
    console.log(req.params.dy);

    var sinceDate = moment.utc(req.params.year + "-" + req.params.month +
            "-" + req.params.dy + " 00:00:00.000", 'YYYY-M-D H:m:s.SSS'),
        untilDate = moment(sinceDate).add('days', 1);

    if (sinceDate.isValid() && untilDate.isValid()) {
      chatLog.find({
        ts: {
          $gte: new Date(sinceDate),
          $lte: new Date(untilDate)
        }
      }).toArray(function(err, items) {



        return res.render('logsMessages.jade',
            {
              year: req.params.year,
              month: req.params.month,
              day: req.params.dy,

              chatLogs: items
            });
      });
    }
  });
};
