var Segment = require('../models/segment');
var segServices = {};

segServices.getSegmentWithChildren = function(segId, callback){
  Segment.findOne({ _id: segId }).exec(function(segmentFindErr, segment1) {
    if (segmentFindErr) {
      callback(segmentFindErr);
    } else {
      Segment.findOne({
        level: {$lte: segment1.level}, order: {$gt: segment1.order}, document: segment1.document
      }).sort({'order': 1}).exec(function (err, nextSibling) {
        if(err){
          callback(err);
        }else{
          var condition;
          if (nextSibling) {
            condition = {order: {$gte: segment1.order, $lt: nextSibling.order}, document: segment1.document};
          } else {
            condition = {order: {$gte: segment1.order}, document: segment1.document};
          }
          Segment.find(condition).sort({'order': 1}).populate({
            path:'document',
            model:'documents'
          }).exec(function (err, segmentFamily) {
            if (err) {
              callback(err);
            }else{
              callback(segmentFamily);
            }
          });
        }
      });
    }
  });
};

segServices.getPreviousSiblingWithChildren = function(segId, callback){
  Segment.findOne({ _id: segId }).exec(function(segmentFindErr, segment1) {
    if (segmentFindErr) {
      callback(segmentFindErr);
    } else if(!segment1 || segment1 == null){
      callback([]);
    }
    else {
      Segment.findOne({
        level: {$lte: segment1.level}, order: {$lt: segment1.order}, document: segment1.document
      }).sort({'order': -1}).exec(function (err, previousSibling) {
        if(previousSibling.level < segment1.level){
          callback([]);
        }else{
          segServices.getSegmentWithChildren(previousSibling.id, callback);
        }
      });
    }
  });
}

segServices.getNextSiblingWithChildren = function(segId, callback){
  Segment.findOne({ _id: segId }).exec(function(segmentFindErr, segment1) {
    if (segmentFindErr) {
      callback(segmentFindErr);
    } else if(!segment1 || segment1 == null){
      callback([]);
    }
    else {
      Segment.findOne({
        level: {$lte: segment1.level}, order: {$gt: segment1.order}, document: segment1.document
      }).sort({'order': -1}).exec(function (err, previousSibling) {
        if(previousSibling.level < segment1.level){
          callback([]);
        }else{
          segServices.getSegmentWithChildren(previousSibling.id, callback);
        }
      });
    }
  });
}

module.exports = segServices;