const mongoObject = require('./MongoObjects');
const PermissionsCollectionName = 'Permissions';

function getPermissionsByStatusAndPlatform(platform, status, callback) {
    mongoObject.mongoClient.connect(mongoObject.MongoDBUrl, function (err, db) {
        if (err) {
            callback({err: err});
            if (db)
                db.close();
            return;
        }

        db.collection(PermissionsCollectionName).find({'platform': platform, 'status': status}).toArray(function (err, docs) {
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

module.exports.getPermissionsByStatusAndPlatform = getPermissionsByStatusAndPlatform;