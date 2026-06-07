const mongoObject = require("./MongoObjects");
const ManageCollectionName = "Manage";

function getManageTabsByRole(role, callback) {
  const query = { show: { $in: [role] } };

  mongoObject.mongoClient.connect(mongoObject.MongoDBUrl, function (err, db) {
    if (err) {
      callback({ err: err });
      if (db) db.close();
      return;
    }

    db.collection(ManageCollectionName)
      .find(query)
      .sort({_id: 1})
      .toArray(function (err, docs) {
        if (err) {
          callback({ err: err.message });
          db.close();
          return;
        }
        db.close();
        callback(docs);
      });
  });
}

module.exports.getManageTabsByRole = getManageTabsByRole;
