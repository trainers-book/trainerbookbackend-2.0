const mongoObject = require('./MongoObjects');
const StarsCollectionName = 'Stars';
const entitiesToGet = require('./CommonFunctions').entitiesToGet;

function getStarsByFieldAndAmount(filters, index, callback) {
    mongoObject.mongoClient.connect(mongoObject.MongoDBUrl, function (err, db) {
        if (err) {
            callback({err: err});
            if (db)
                db.close();
            return;
        }

        db.collection(StarsCollectionName).find(filters).sort({priority: 1, _id: -1}).limit(entitiesToGet).skip(index).toArray(function (err, docs) {
            if (err) {
                callback({err: err});
                db.close();
                return;
            }
            db.close();
            callback(docs);
        });
    });
}

function getManyStarsByField(howMany, fields, callback) {
    mongoObject.mongoClient.connect(mongoObject.MongoDBUrl, function (err, db) {
        if (err) {
            callback({err: err});
            if (db)
                db.close();
            return;
        }
        db.collection(StarsCollectionName).find(fields).sort({priority: 1, _id: -1}).limit(howMany).toArray(function (err, docs) {
            if (err) {
                callback({err: err});
                db.close();
                return;
            }
            db.close();
            callback(docs);
        });
    });
}

function alterPriorities(priorityToAlterFrom, newPriorityId, platform, increase, callback) {
    mongoObject.mongoClient.connect(mongoObject.MongoDBUrl, function (err, db) {
        if (err) {
            callback({err: err});
            if (db)
                db.close();
            return;
        }

        db.collection(StarsCollectionName).updateMany({$and: [{'priority': {$gte: priorityToAlterFrom}}, {'_id': {$ne: newPriorityId}}, {'platform': platform}]}, {$inc: {'priority': increase}}, (err, result) => {
            if (err) {
                callback({success: false, err: err});
                db.close();
                return;
            }

            callback({success: result.modifiedCount >= 1 || result.matchedCount === 0});
        });
    });
}

function switchPriorities(newHigherPriority, lastPriorityToChange, dir, platform, priorityId, callback) {
    mongoObject.mongoClient.connect(mongoObject.MongoDBUrl, function (err, db) {
        if (err) {
            callback({err: err});
            if (db)
                db.close();
            return;
        }

        db.collection(StarsCollectionName).updateMany({$and: [{'platform': platform}, {'priority': {$gte: newHigherPriority}}, {'priority': lastPriorityToChange}, {'_id': {$ne: priorityId}}]}, {$inc: {'priority': dir}}, (err, result) => {
            if (err) {
                callback({success: false, err: err});
                db.close();
                return;
            }

            callback({success: result.modifiedCount >= 1 || result.matchedCount === 0});
        });
    });
}

module.exports.getStarsByFieldAndAmount = getStarsByFieldAndAmount;
module.exports.getManyStarsByField = getManyStarsByField;
module.exports.alterPriorities = alterPriorities;
module.exports.switchPriorities = switchPriorities;