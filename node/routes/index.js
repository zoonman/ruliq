/**
 * Created by zoonman on 8/3/14.
 */

var logs = require('./logs'),
    rules = require('./rules');

module.exports  = function(app, db, io) {
  rules(app);
  logs(app, db);
};
