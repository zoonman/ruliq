/**
 * Created by zoonman on 8/3/14.
 */


module.exports = function(app, db) {
  var offensive_words = [];
  db.collection('offensive').find().toArray(function(err, items) {
    items.forEach(function(val) {
      if (val.hasOwnProperty('re')) {
        offensive_words.push({
          re: ((val.re instanceof RegExp) ? val.re : (new RegExp(val.re, "i"))),
          level: val.level || 0
        });
      }
    });
  });

  return {
    isOffensive: function(text) {
      var retVal = false;
      offensive_words.forEach(function(ow){
        if (ow.hasOwnProperty('re')) {
          if (ow.re.test(text)) {
            retVal =  true;
          }
        }
      });
      return retVal;
    }
  }
};
