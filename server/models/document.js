var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Document = new Schema({
    created: {type : Date, default : Date.now},
    title: {type: String, default: '', trim : true},
    URI: {type: String, default: '', trim : true},
    owner: {type : Schema.ObjectId, ref : 'Account'},
    deleted: {type : Boolean, default : false}
});

module.exports = mongoose.model('documents', Document);