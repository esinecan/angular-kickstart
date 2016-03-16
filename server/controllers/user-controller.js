/**
 * Created by eren on 30.12.2015.
 */
var dbWrapper = require('../utils/db-wrapper');
var gitWrapper = require('../utils/git-wrapper');

exports.createUser = function(user, pwd, email, errorCallback, successCallback){
    dbWrapper.createUser(user, pwd, email, errorCallback, function(){
        gitWrapper.createUserDir(user, errorCallback, successCallback);
    });
};

exports.logUserIn = function(req, res, successCallback){
    dbWrapper.logUserIn(req, res, successCallback);
};
