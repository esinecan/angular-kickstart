var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Assignment = new Schema({
    created: {type : Date, default : Date.now},
    segment: {type : Schema.ObjectId, ref : 'Segment'},
    rootSegment: {type : Schema.ObjectId, ref : 'Segment'},
    rootAssignment: {type : Schema.ObjectId, ref : 'Assignment'},
    document: {type : Schema.ObjectId, ref : 'Document'},
    owner: {type : Schema.ObjectId, ref : 'User'},
    contributor: {type : Schema.ObjectId, ref : 'User'},
    contributorURI:{type: String, default: '', trim : true},
    copyDocSrc:{type: String, default: '', trim : true},
    copyDocTarget:{type: String, default: '', trim : true},
    returned: {type : Boolean, default : false},
    accepted: {type : Boolean, default : false},
    updated: {type : Boolean, default : false},
    returnNotes:{type: String, default: '', trim : true},
    title:{type: String, default: '', trim : true},
    rejectNotes:{type: String, default: '', trim : true},
    segmentType : {type : Number, default: 1},
    pictureSegmentLayout : {type : Number, default: 1},
    order : {type : Number, default: 1000000},
    level : {type : Number, default: 0}
});

module.exports = mongoose.model('assignments', Assignment);