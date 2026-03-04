const mongoObject = require('./MongoObjects');
const platformCollectionName = 'Ids';
const sequenceName = 'FlightId';

function getCurrentId(callback) {
    mongoObject.mongoClient.connect(mongoObject.MongoDBUrl, function (err, db) {
        if (err) {
            if (db) {
                db.close();
            }
            callback({err: err});
            return;
        }
        try {
            db.collection(platformCollectionName).find({'_id': sequenceName}).toArray(function (err, docs) {
                if (err) {
                    callback({err: err});
                    db.close();
                    return;
                }
                db.close();
                callback(docs);
            });
        } catch (err) {
            if (err) {
                if (db)
                    db.close();
                callback({err: err});
                return;
            }
        }
    });
}

module.exports.getCurrentId = getCurrentId;