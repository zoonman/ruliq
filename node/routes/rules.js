function rules(app) {
  app.get('/rules.html', function(req, res){
    res.render('rules.jade');
  });
}

module.exports = rules;
