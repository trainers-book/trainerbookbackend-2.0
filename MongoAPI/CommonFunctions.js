const mongoObject = require("./MongoObjects");
const entitiesToGet = 25;

function deleteEntity(_id, collectionName, callback) {
  mongoObject.mongoClient.connect(mongoObject.MongoDBUrl, function (err, db) {
    if (err) {
      if (db) db.close();
      callback({ err: err });
      return;
    }

    try {
      db.collection(collectionName).deleteOne(
        {
          _id: _id,
        },
        function (err, result) {
          if (err) {
            db.close();
            callback({ err: err });
            return;
          }
          db.close();
          callback({
            success: result.result.ok === 1 && result.deletedCount === 1,
          });
        },
      );
    } catch (err) {
      callback({ err: err });
      if (db) db.close();
    }
  });
}

function getAllEntity(collectionName, callback) {
  mongoObject.mongoClient.connect(mongoObject.MongoDBUrl, function (err, db) {
    if (err) {
      callback({ err: err });
      if (db) db.close();
      return;
    }
    db.collection(collectionName)
      .find({ deleted: { $exists: false } })
      .toArray(function (err, docs) {
        if (err) {
          callback({ err: err });
          db.close();
          return;
        }
        db.close();
        callback(docs);
      });
  });
}

function getEntitiesByPlatformsAndAmount(
  collectionName,
  platforms,
  index,
  callback,
) {
  mongoObject.mongoClient.connect(mongoObject.MongoDBUrl, function (err, db) {
    if (err) {
      callback({ err: err });
      if (db) db.close();
      return;
    }

    db.collection(collectionName)
      .find({ $or: platforms, deleted: { $exists: false } })
      .sort({ _id: -1 })
      .limit(entitiesToGet)
      .skip(index)
      .toArray(function (err, docs) {
        if (err) {
          callback({ err: err });
          db.close();
          return;
        }
        db.close();
        callback(docs);
      });
  });
}

function getEntitiesByFieldsAndPlatformsAndAmount(
  collectionName,
  platforms,
  index,
  fields,
  stringQuery,
  callback,
) {
  if (!platforms.length) {
    platforms.push({});
  }

  mongoObject.mongoClient.connect(mongoObject.MongoDBUrl, function (err, db) {
    if (err) {
      callback({ err: err });
      if (db) db.close();
      return;
    }

    if (fields.hasOwnProperty("search")) {
      delete fields.search;
    }

    db.collection(collectionName)
      .find({
        deleted: { $exists: false },
        $and: [{ $or: stringQuery }, fields, { $or: platforms }],
      })
      .sort({ _id: -1 })
      .limit(entitiesToGet)
      .skip(index)
      .toArray(function (err, docs) {
        if (err) {
          callback({ err: err });
          db.close();
          return;
        }
        db.close();
        callback(docs);
      });
  });
}

function getEntitiesByPlatformsAndAmountAndFilter(
  collectionName,
  platforms,
  index,
  filters,
  callback,
) {
  const getDateRange = (minDate, maxDate) => {
    const dayStart = new Date(minDate);
    const dayEnd = new Date(maxDate);
    dayStart.setHours(0, 0, 0, 0);
    dayEnd.setHours(23, 59, 59, 999);

    const start = dayStart.getTime();
    const end = dayEnd.getTime();

    return { start, end };
  };

  if (!platforms.length) {
    platforms.push({});
  }

  const query = {};
  if (filters) {
    if (filters.date != undefined) {
      let { start, end } = getDateRange(filters.date, filters.date);
      query.dateTime = { $gte: start, $lte: end };
    } else if (filters.minDate != undefined && filters.maxDate != undefined) {
      let { start, end } = getDateRange(filters.minDate, filters.maxDate);
      query.dateTime = { $gte: start, $lte: end };
    }
    if (
      filters.failureStatus != undefined &&
      collectionName == "FlightFailure"
    ) {
      query.status = { $in: filters.failureStatus };
    }

    if (
      filters.status != undefined &&
      collectionName == "Permissions"
    ) {
      query.status = { $in: filters.status };
    }

    if (
      filters.issueSeverity != undefined &&
      collectionName == "FlightFailure"
    ) {
      query.disruption = filters.issueSeverity;
    }

    if (filters.search && isNaN(filters.search)) {
      const search = filters.search;

      query.$or = [
        { flightName: { $regex: search, $options: "i" } },
        { instructorName: { $regex: search, $options: "i" } },
        { issueOpener: { $regex: search, $options: "i" } },
        { issueDescription: { $regex: search, $options: "i" } },

        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
        { permissionDescription: { $regex: search, $options: "i" } },
        { permissionName: { $regex: search, $options: "i" } },
      ];
    }
  }

  const platforms_query =
    collectionName === "Aircraft" ? {} : { platform: { $in: platforms } };

  mongoObject.mongoClient.connect(mongoObject.MongoDBUrl, function (err, db) {
    if (err) {
      callback({ err: err });
      if (db) db.close();
      return;
    }

    db.collection(collectionName)
      .find({ deleted: { $exists: false }, $and: [query, platforms_query] })
      .sort({ _id: -1 })
      .limit(entitiesToGet)
      .skip(index)
      .toArray(function (err, docs) {
        if (filters?.search) {
    const search = filters.search;

    docs = docs.filter(doc => {
      return (
        (doc.flightName || "").match(new RegExp(search, "i")) ||
        (doc.instructorName || "").match(new RegExp(search, "i")) ||
        (doc.issueOpener || "").match(new RegExp(search, "i")) ||
        (doc.issueDescription || "").match(new RegExp(search, "i")) ||
        (doc.firstName || "").match(new RegExp(search, "i")) ||
        (doc.lastName || "").match(new RegExp(search, "i")) ||
        (doc.name || "").match(new RegExp(search, "i")) ||
        (doc.permissionDescription || "").match(new RegExp(search, "i")) ||
        (doc.permissionName || "").match(new RegExp(search, "i")) ||
        String(doc._id || "").includes(search)
      );
    });
  }
        db.close();
        callback(docs);
      });
  });
}

function getManyEntitiesByPlatforms(
  collectionName,
  howMany,
  platforms,
  callback,
) {
  mongoObject.mongoClient.connect(mongoObject.MongoDBUrl, function (err, db) {
    if (err) {
      callback({ err: err });
      if (db) db.close();
      return;
    }

    db.collection(collectionName)
      .find({ deleted: { $exists: false }, $or: platforms })
      .sort({ _id: -1 })
      .limit(howMany)
      .toArray(function (err, docs) {
        if (err) {
          callback({ err: err });
          db.close();
          return;
        }
        db.close();
        callback(docs);
      });
  });
}

function getManyEntitiesByFieldsAndPlatforms(
  collectionName,
  howMany,
  platforms,
  fields,
  stringQuery,
  callback,
) {
  mongoObject.mongoClient.connect(mongoObject.MongoDBUrl, function (err, db) {
    if (err) {
      callback({ err: err });
      if (db) db.close();
      return;
    }

    if (fields.hasOwnProperty("search")) {
      delete fields.search;
    }

    db.collection(collectionName)
      .find({
        deleted: { $exists: false },
        $and: [{ $or: stringQuery }, fields, { $or: platforms }],
      })
      .sort({ _id: -1 })
      .limit(howMany)
      .toArray(function (err, docs) {
        if (err) {
          callback({ err: err });
          db.close();
          return;
        }
        db.close();
        callback(docs);
      });
  });
}

function checkIfObjectExist(id, collectionName, db, callback) {
  db.collection(collectionName)
    .find({ _id: id })
    .toArray(function (err, doc) {
      if (err) {
        callback({ success: false, err: err });
        db.close();
        return;
      }
      callback({ success: true, result: doc.length !== 0, data: doc });
    });
}

function checkIfExistInCollection(collection, id, callback) {
  mongoObject.mongoClient.connect(mongoObject.MongoDBUrl, function (err, db) {
    if (err) {
      callback({ err: err });
      if (db) db.close();
      return;
    }

    db.collection(collection)
      .find({ _id: id })
      .toArray(function (err, docs) {
        if (err) {
          callback({ success: false, err: err });
          db.close();
          return;
        }
        db.close();
        callback(docs);
      });
  });
}

function getEntityByPlatform(collectionName, platform, callback) {
  mongoObject.mongoClient.connect(mongoObject.MongoDBUrl, function (err, db) {
    if (err) {
      callback({ err: err });
      if (db) db.close();
      return;
    }

    db.collection(collectionName)
      .find({ deleted: { $exists: false }, $or: platform })
      .toArray(function (err, docs) {
        if (err) {
          callback({ err: err });
          db.close();
          return;
        }
        db.close();
        callback(docs);
      });
  });
}

function getObjectByString(collectionName, string, platforms, callback) {
  mongoObject.mongoClient.connect(mongoObject.MongoDBUrl, function (err, db) {
    if (err) {
      callback({ err: err });
      if (db) db.close();
      return;
    }

    let findString = [];
    let newField;
    require("../entities/EntetyList").Entities.find((entity) => {
      if (entity.name === collectionName) {
        entity.fields.find((field) => {
          if (field.name === "firstName") {
            findString[findString.length] = { name: new RegExp(string) };
          }

          newField = {};
          newField[field.name] = new RegExp(string);
          findString[findString.length] = newField;
        });
      }
    });

    db.collection(collectionName)
      .find({
        deleted: { $exists: false },
        $and: [{ $or: findString }, { $or: platforms }],
      })
      .sort({ _id: -1 })
      .toArray(function (err, docs) {
        // ({$text: {$search: string}})
        if (err) {
          callback({ err: err });
          db.close();
          return;
        }

        db.close();
        callback(docs);
      });
  });
}

function getEntitiesByDatesRange(
  collectionName,
  datesRange,
  platform,
  callback,
) {
  mongoObject.mongoClient.connect(mongoObject.MongoDBUrl, function (err, db) {
    if (err) {
      callback({ err: err });
      if (db) db.close();
      return;
    }

    let findString = [];
    let newField;
    datesRange.find((date) => {
      newField = {};
      newField["date"] = new RegExp(date);
      findString[findString.length] = newField;
    });

    db.collection(collectionName)
      .find({
        deleted: { $exists: false },
        $and: [{ $or: findString }, { $or: platform }],
      })
      .sort({ _id: 1 })
      .toArray(function (err, docs) {
        if (err) {
          callback({ err: err });
          db.close();
          return;
        }
        db.close();
        callback(docs);
      });
  });
}

function getEntityByIdList(collectionName, idList, callback) {
  mongoObject.mongoClient.connect(mongoObject.MongoDBUrl, function (err, db) {
    if (err) {
      callback({ err: err });
      if (db) db.close();
      return;
    }

    let findString = [];

    if (idList.length !== 0) {
      findString = [];
      let newField;
      idList.find((id) => {
        newField = {};
        newField["_id"] = parseInt(id);
        findString[findString.length] = newField;
      });
    } else {
      let newField = {};
      newField["_id"] = "";
      findString[findString.length] = newField;
    }

    db.collection(collectionName)
      .find({ deleted: { $exists: false }, $or: findString })
      .toArray(function (err, docs) {
        if (err) {
          callback({ err: err });
          db.close();
          return;
        }
        db.close();
        callback(docs);
      });
  });
}

function getEntitiesByFields(
  collectionName,
  fields,
  platform,
  callback,
  filters = [{}],
) {
  mongoObject.mongoClient.connect(mongoObject.MongoDBUrl, function (err, db) {
    if (err) {
      callback({ err: err });
      if (db) db.close();
      return;
    }

    let fieldData = {};
    fields.find((field) => {
      fieldData[field.name] = 1;
    });

    db.collection(collectionName)
      .find(
        {
          deleted: { $exists: false },
          $and: [{ $or: filters }, { $or: platform }],
        },
        fieldData,
      )
      .sort({ _id: 1 })
      .toArray(function (err, docs) {
        if (err) {
          callback({ err: err });
          db.close();
          return;
        }
        db.close();
        callback(docs);
      });
  });
}

function getEntitiesByDate(collectionName, date, platform, callback) {
  mongoObject.mongoClient.connect(mongoObject.MongoDBUrl, function (err, db) {
    if (err) {
      callback({ err: err });
      if (db) db.close();
      return;
    }

    db.collection(collectionName)
      .find({
        deleted: { $exists: false },
        $and: [{ date: date }, { $or: platform }],
      })
      .toArray(function (err, docs) {
        if (err) {
          callback({ err: err });
          db.close();
          return;
        }
        db.close();
        callback(docs);
      });
  });
}

function getEntitiesByAttribute(
  collectionName,
  attributeName,
  attributeValue,
  callback,
) {
  mongoObject.mongoClient.connect(mongoObject.MongoDBUrl, function (err, db) {
    if (err) {
      callback({ err: err });
      if (db) db.close();
      return;
    }

    let attribute = {};
    attribute[attributeName] = attributeValue;

    db.collection(collectionName)
      .find(attribute)
      .toArray(function (err, docs) {
        if (err) {
          callback({ err: err });
          db.close();
          return;
        }
        db.close();
        callback(docs);
      });
  });
}

async function getNextId(
  sequenceCollectionName,
  sequenceName,
  sequenceValueName,
  callback,
) {
  const db = await mongoObject.mongoClient.connect(mongoObject.MongoDBUrl);
  let id;
  const dataToUpdate = {};
  dataToUpdate[sequenceValueName] = 1;
  const update = { $inc: dataToUpdate };

  try {
    await db
      .collection(sequenceCollectionName)
      .findOneAndUpdate({ _id: sequenceName }, update, { new: true });
    id = await db
      .collection(sequenceCollectionName)
      .find({ _id: sequenceName })
      .toArray();
  } finally {
    db.close();
    callback(id);
  }
}

function createNewObject(objectData, collectionName, callback) {
  mongoObject.mongoClient.connect(mongoObject.MongoDBUrl, function (err, db) {
    if (err) {
      if (db) {
        db.close();
      }
      callback({ err: err });
      return;
    }
    try {
      checkIfObjectExist(
        objectData._id,
        collectionName,
        db,
        (isExistResult) => {
          if (!isExistResult.success) {
            callback({ err: isExistResult.err });
            db.close();
            return;
          }

          if (isExistResult.success && isExistResult.result) {
            callback({ err: "Object already exist", data: isExistResult.data });
            db.close();
            return;
          }

          db.collection(collectionName).insertOne(
            objectData,
            function (err, result) {
              if (err) {
                db.close();
                callback({ err: err });
                return;
              }
              db.close();
              if (result.result.ok === 1 && result.insertedCount === 1)
                callback({
                  success: true,
                  object: objectData,
                });
              else callback({ err: "Error While Creating Object in System" });
            },
          );
        },
      );
    } catch (err) {
      if (err) {
        if (db) db.close();
        callback({ err: err });
        return;
      }
    }
  });
}

function updateObjectsFields(objectIds, collectionName, updatedData, callback) {
  mongoObject.mongoClient.connect(mongoObject.MongoDBUrl, function (err, db) {
    if (err) {
      if (db) {
        db.close();
      }
      callback({ err: err });
      return;
    }
    try {
      let updateValues = { $addToSet: updatedData };
      const updateObjects = objectIds.map((objectId) =>
        db.collection(collectionName).updateOne({ _id: objectId }, updateValues, (err, doc) => {
            if (err) {
              callback({ success: false, err: err });
              db.close();
            }
            return doc.matchedCount === 1;
          })
      );
      callback({ success: updateObjects });
    } catch (err) {
      if (err) {
        if (db) db.close();
        callback({ err: err });
      }
    }
  });
}

function updateObjectFields(objectId, collectionName, updatedData, callback) {
  mongoObject.mongoClient.connect(mongoObject.MongoDBUrl, function (err, db) {
    if (err) {
      if (db) {
        db.close();
      }
      callback({ err: err });
      return;
    }
    try {
      let updateValues = { $addToSet: updatedData };
      db.collection(collectionName).updateOne(
        { _id: objectId },
        updateValues,
        (err, doc) => {
          if (err) {
            callback({ success: false, err: err });
            db.close();
            return;
          }
          callback({ success: doc.matchedCount === 1 });
        },
      );
    } catch (err) {
      if (err) {
        if (db) db.close();
        callback({ err: err });
      }
    }
  });
}

function updateObject(objectData, collectionName, fieldsToRemove, callback) {
  mongoObject.mongoClient.connect(mongoObject.MongoDBUrl, function (err, db) {
    if (err) {
      if (db) {
        db.close();
      }
      callback({ err: err });
      return;
    }
    try {
      let setValues = { $set: objectData };
      if (fieldsToRemove) {
        setValues["$unset"] = fieldsToRemove;
      }

      let id;

      if (objectData.lastId && objectData.lastId != objectData._id){
        id = objectData.lastId;
        setValues = { $set: { deleted: true } };

        const objectToInsert = {
          ...objectData
        }

        objectToInsert._id = Number(objectToInsert._id);
        delete objectToInsert.lastId;
        db.collection(collectionName).insertOne(
          objectToInsert,
          (err, doc) => {
            if (err) {
              db.close();
              return;
            }
          }
        );

      } else {
        id = objectData._id;
        delete objectData.lastId;
      }

      if (objectData["deleted"]) {
        delete objectData._id;        

        if (collectionName === "Aircraft") {          
          getEntitiesByAttribute(collectionName, "_id", id, (aircrafts) => {            
            if (aircrafts.length > 0 && aircrafts[0].name) {              
              removePlatformValueFromAllCollections(aircrafts[0].name, (result) => {
                if (result.err) {
                  callback({ err: result.err });
                  db.close();
                  return;
                }
              })
            }
          });
        }
      }

      db.collection(collectionName).updateOne(
        { _id: id },
        setValues,
        (err, doc) => {
          if (err) {
            callback({ success: false, err: err });
            db.close();
            return;
          }
          callback({ success: doc.matchedCount === 1 });
        },
      );
    } catch (err) {
      if (err) {
        if (db) db.close();
        callback({ err: err });
      }
    }
  });
}

function updateUserObject(objectData, collectionName, callback, lastId = null) {
  mongoObject.mongoClient.connect(mongoObject.MongoDBUrl, function (err, db) {
    if (err) {
      if (db) {
        db.close();
      }
      callback({ err: err });
      return;
    }
    try {
      if (lastId != null) {
        db.collection(collectionName).insertOne(objectData, (err, doc) => {
          if (err) {
            callback({ success: false, err: err });
            db.close();
            return;
          }
          callback({ success: doc.matchedCount === 1 });
        });

        db.collection(collectionName).deleteOne(
          { _id: lastId },
          function (err, result) {
            if (err) {
              db.close();
              callback({ err: err });
              return;
            }
            db.close();
            callback({
              success: result.result.ok === 1 && result.deletedCount === 1,
            });
          },
        );
      } else {
        db.collection(collectionName).updateOne(
          { _id: objectData._id },
          objectData,
          (err, doc) => {
            if (err) {
              callback({ success: false, err: err });
              db.close();
              return;
            }
            callback({ success: doc.matchedCount === 1 });
          },
        );
      }
    } catch (err) {
      if (err) {
        if (db) db.close();
        callback({ err: err });
      }
    }
  });
}

function countFilesByFileName(collectionName, fileVarName, fileName, callback) {
  mongoObject.mongoClient.connect(mongoObject.MongoDBUrl, function (err, db) {
    if (err) {
      callback({ err: err });
      if (db) db.close();
      return;
    }

    let query = {};
    query[fileVarName] = fileName;
    db.collection(collectionName)
      .find(query)
      .toArray(function (err, docs) {
        if (err) {
          callback({ err: err });
          db.close();
          return;
        }
        db.close();
        callback(docs.length);
      });
  });
}

function removePlatformValueFromAllCollections(valueToRemove, callback) {
  mongoObject.mongoClient.connect(mongoObject.MongoDBUrl, function (err, db) {
    if (err) {
      callback({ err: err });
      if (db) db.close();
      return;
    }

    db.collections(function (err, collections) {
      if (err) {
        callback({ err: err });
        db.close();
        return;
      }

      const targetCollections = collections.filter(function (col) {
        const name = col.collectionName || (col.s && col.s.name) || col.name;
        return name && !name.startsWith("system.");
      });

      if (targetCollections.length === 0) {
        db.close();
        callback({ success: true, message: "No collections to process." });
        return;
      }

      let completed = 0;
      let hasError = false;
      let errors = [];

      targetCollections.forEach(function (collection) {
        const collectionName = collection.collectionName || (collection.s && collection.s.name) || collection.name;
        const query = {
          $and: [
            { "platform.0": { $exists: true } },
            { platform: valueToRemove }
          ]
        };
        const update = {
          $pull: { platform: valueToRemove }
        };

        collection.updateMany(query, update, function (updateErr, result) {
          if (updateErr) {
            hasError = true;
            errors.push({ collection: collectionName, err: updateErr.message || updateErr });
          }
          completed++;
          if (completed === targetCollections.length) {
            db.close();
            if (hasError) {
              callback({ success: false, errors: errors });
            } else {
              callback({ success: true });
            }
          }
        });
      });
    });
  });
}

module.exports.removePlatformValueFromAllCollections = removePlatformValueFromAllCollections;
module.exports.entitiesToGet = entitiesToGet;
module.exports.deleteEntity = deleteEntity;
module.exports.getAllEntity = getAllEntity;
module.exports.getEntitiesByPlatformsAndAmount =
  getEntitiesByPlatformsAndAmount;
module.exports.getEntitiesByFieldsAndPlatformsAndAmount =
  getEntitiesByFieldsAndPlatformsAndAmount;
module.exports.getEntitiesByPlatformsAndAmountAndFilter =
  getEntitiesByPlatformsAndAmountAndFilter;
module.exports.getManyEntitiesByPlatforms = getManyEntitiesByPlatforms;
module.exports.getManyEntitiesByFieldsAndPlatforms =
  getManyEntitiesByFieldsAndPlatforms;
module.exports.getEntityByPlatform = getEntityByPlatform;
module.exports.getObjectByString = getObjectByString;
module.exports.getEntitiesByDatesRange = getEntitiesByDatesRange;
module.exports.getEntityByIdList = getEntityByIdList;
module.exports.getEntitiesByFields = getEntitiesByFields;
module.exports.getEntitiesByDate = getEntitiesByDate;
module.exports.getEntitiesByAttribute = getEntitiesByAttribute;
module.exports.getNextId = getNextId;
module.exports.createNewObject = createNewObject;
module.exports.checkIfExistInCollection = checkIfExistInCollection;
module.exports.updateObject = updateObject;
module.exports.updateObjectFields = updateObjectFields;
module.exports.updateUserObject = updateUserObject;
module.exports.countFilesByFileName = countFilesByFileName;
module.exports.updateObjectsFields = updateObjectsFields;
