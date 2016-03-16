var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Segment = new Schema({
    created: {type : Date, default : Date.now},
    title: {type: String, default: '', trim : true},
    URI: {type: String, default: '', trim : true},
    document: {type : Schema.ObjectId, ref : 'Document'},
    segmentType : {type : Number, default: 1},
    pictureSegmentLayout : {type : Number, default: 1},
    order : {type : Number, default: 1000000},
    level : {type : Number, default: 0}
});

module.exports = mongoose.model('segments', Segment);