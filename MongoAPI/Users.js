const mongoObject = require('./MongoObjects');
const authenticationCollectionName = 'Authentication';

function getUserByUserName(userName, callback) {
    mongoObject.mongoClient.connect(mongoObject.MongoDBUrl, function (err, db) {
        if (err) {
            callback({err: err});
            if (db)
                db.close();
            return;
        }
        checkIfUserExistByUserName(userName, db, (isExistResult) => {
            if (!isExistResult.success) {
                callback({err: isExistResult.err});
                db.close();
                return;
            }

            if (!isExistResult.result) {
                callback('404');
                db.close();
                return;
            }

            if (isExistResult.success && isExistResult.result) {
                db.collection(authenticationCollectionName).find({"userName": userName}).toArray(function (err, docs) {
                    if (err) {
                        callback({err: err});
                        db.close();
                        return;
                    }
                    db.close();
                    callback(docs);
                });
            }
        });
    });
}

function getUserById(id, callback) {
    mongoObject.mongoClient.connect(mongoObject.MongoDBUrl, function (err, db) {
        if (err) {
            callback({err: err});
            if (db)
                db.close();
            return;
        }
        checkIfUserExistById(id, db, (isExistResult) => {
            if (!isExistResult.success) {
                callback({err: isExistResult.err});
                db.close();
                return;
            }

            if (!isExistResult.result) {
                callback('404');
                db.close();
                return;
            }

            if (isExistResult.success && isExistResult.result) {
                db.collection(authenticationCollectionName).find({"_id": id}).toArray(function (err, docs) {
                    if (err) {
                        callback({err: err});
                        db.close();
                        return;
                    }
                    db.close();
                    callback(docs);
                });
            }
        });
    });
}

function updatePlatform(user, platform, callback) {
    mongoObject.mongoClient.connect(mongoObject.MongoDBUrl, function (err, db) {
        if (err) {
            if (db) {
                db.close();
            }
            callback({err: err});
            return;
        }
        try {
            db.collection(authenticationCollectionName).updateOne({"_id": user._id},
                {
                    $set: {
                        platform: platform,
                    }
                }
                , (err, result) => {
                    if (err) {
                        db.close();
                        callback({err: err});
                        return;
                    }
                    db.close();

                    if (result.result.ok === 1 && result.result.nModified === 1) callback({
                        success: true,
                        user: user
                    });
                    else callback({err: 'Error While Creating User in System'});
                });
        } catch (err) {
            if (err) {
                if (db)
                    db.close();
                callback({err: err});
            }
        }
    });
}

function setUserPassword(userName, password, callback) {
    mongoObject.mongoClient.connect(mongoObject.MongoDBUrl, function (err, db) {
        if (err) {
            if (db) {
                db.close();
            }
            callback({err: err});
            return;
        }
        try {
            checkIfUserExistByUserName(userName, db, (isExistResult) => {
                if (!isExistResult.success) {
                    callback({err: isExistResult.err});
                    db.close();
                    return;
                }

                if (!isExistResult.result) {
                    callback('404');
                    db.close();
                    return;
                }

                if (isExistResult.success && isExistResult.result) {
                    db.collection(authenticationCollectionName).updateOne({"userName": userName},
                        {
                            $set: {
                                password: password,
                            }
                        }
                        , (err, result) => {
                            if (err) {
                                db.close();
                                callback({err: err});
                                return;
                            }
                            db.close();

                            if (result.result.ok === 1 && result.result.nModified === 1) callback({
                                success: true,
                                userName: userName
                            });
                            else callback({err: 'Error While Updating User Password in System'});
                        });
                }
            });
        } catch (err) {
            if (err) {
                if (db)
                    db.close();
                callback({err: err});
            }
        }
    });
}

function checkIfUserExistByUserName(userName, db, callback) {
    db.collection(authenticationCollectionName).find({"userName": userName}).toArray(function (err, doc) {
        if (err) {
            callback({success: false, err: err});
            db.close();
            return;
        }
        callback({success: true, result: doc.length !== 0});
    });
}

function checkIfUserExistById(id, db, callback) {
    db.collection(authenticationCollectionName).find({"_id": id}).toArray(function (err, doc) {
        if (err) {
            callback({success: false, err: err});
            db.close();
            return;
        }
        callback({success: true, result: doc.length !== 0});
    });
}

module.exports.getUserByUserName = getUserByUserName;
module.exports.getUserById = getUserById;
module.exports.updatePlatform = updatePlatform;
module.exports.setUserPassword = setUserPassword;