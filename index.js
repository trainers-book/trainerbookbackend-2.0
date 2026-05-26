let express = require("express");
let bodyParse = require("body-parser");
let cors = require("cors");
let multer = require("multer");
let fs = require("fs");
let jsonfile = require("jsonfile");
let path = require("path");

const port = process.env.PORT || require("./config").port;

const collectionMap = require("./CollectionMap");

const DIR = "./uploads/";

const commonFunctions = require("./MongoAPI/CommonFunctions");
const getNextFlightIdMongoAPI = require("./MongoAPI/getNextFlightID");
const preservedFlightsMongoAPI = require("./MongoAPI/PreservedFlights");
const usersMongoAPI = require("./MongoAPI/Users");
const PermissionsMongoAPI = require("./MongoAPI/Permissions");
const DebriefsMongoAPI = require("./MongoAPI/Debriefs");
const StarsMongoAPI = require("./MongoAPI/Stars");
const ManageMongoAPI = require("./MongoAPI/Manage");
const datesRangeFunctions = require("./functionsLogic/datesRange");

this.FlightFailureFieldName = "";
this.FlightFailureFilters = {};
this.FlightFailureString = [{}];
this.PreservedFlightsFieldName = "";
this.PreservedFlightsFilters = {};
this.PermissionsFieldName = "";
this.PermissionsFilters = {};
this.PeriodicalTestsFieldName = "";
this.PeriodicalTestsFilters = {};
this.StarsFieldName = "";
this.StarsFilters = {};
this.DebriefsFieldName = "";
this.DebriefsFilters = {};

let app = express();
app.use(cors());
app.use(bodyParse.json());
app.use(bodyParse.urlencoded({ extended: true }));

const http = require("http").Server(app);
const io = require("socket.io")(http);

const documents = {};

let storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, DIR);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});
let upload = multer({ storage: storage });

io.on("connection", (socket) => {
  let previousId;

  const safeJoin = (currentId) => {
    socket.leave(previousId);
    socket.join(currentId, () =>
      console.log("socket " + socket.id + " joined room " + currentId),
    );
    previousId = currentId;
  };

  socket.on("getFromDB", ({ tableName }) => {
    safeJoin(tableName);

    commonFunctions.getAllEntity(tableName, (result) =>
      socket.emit("document", result),
    );
  });

  socket.on("removeFromDB", ({ tableName, id }) => {
    safeJoin(tableName);

    commonFunctions.deleteEntity(id, tableName, (result) => {
      commonFunctions.getAllEntity(tableName, (result) =>
        io.emit("document", result),
      );
    });
  });

  socket.on("editDBData", ({ tableName, data, fieldsToRemove }) => {
    safeJoin(tableName);

    commonFunctions.updateObject(data, tableName, fieldsToRemove, (result) => {
      if (result.success) {
        commonFunctions.getAllEntity(tableName, (result) =>
          io.emit("document", result),
        );
      }
    });
  });

  socket.on("addToDB", ({ tableName, data }) => {
    safeJoin(tableName);

    commonFunctions.createNewObject(data, tableName, (result) => {
      if (result.success) {
        commonFunctions.getAllEntity(tableName, (result) =>
          io.emit("document", result),
        );
      }
    });
  });

  io.emit("documents", Object.keys(documents));
});

function getCollectionNameFromURL(url) {
  let lastIndex = url.length;
  if (url.indexOf("?") !== -1) {
    lastIndex = url.indexOf("?");
  }
  let regEx = url.substring(1, lastIndex);
  if (regEx.indexOf("/") !== -1) {
    lastIndex = regEx.indexOf("/") + 1;
  }
  let collection = url.substring(0, lastIndex);
  return collectionMap[collection];
}

function getFilterName(url, name) {
  let lastIndex = url.length;
  let firstIndex = 1;
  let regEx = url.substring(1, lastIndex);
  if (url.indexOf(name) !== -1) {
    firstIndex = url.indexOf(name) + name.length + 1;
  }
  if (regEx.indexOf("/:") !== -1) {
    lastIndex = regEx.indexOf("/:") + 1;
  }

  let filter = url.substring(firstIndex, lastIndex);
  return filter;
}

const getCallback = (result, response) => {
  if (result.err) {
    response.status(500);
    response.end(result.err.message || String(result.err));
    return;
  }

  response.json(result);
};

const deleteCallback = (result, response) => {
  if (result.err || !result.success) {
    response.status(500);
    response.end(result.err ? result.err.message : "Action failed");
    return;
  }

  response.status(200);
  response.end();
};

const platformArray = (platforms, name) => {
  let findString = [];
  let newField;

  if (name !== "Aircraft") {
    platforms.find((platform) => {
      newField = {};
      newField["platform"] = platform.name;
      findString[findString.length] = newField;
    });
  } else {
    findString[findString.length] = {};
  }

  return findString;
};

app.get("/*/search/:search", (req, res) => {
  let collection = getCollectionNameFromURL(req.url);

  if (!collection) {
    res.status(404);
    res.end();
    return;
  }

  let stringToSearch = req.params.search.slice(1, req.params.search.length);

  commonFunctions.getEntityBySearch(collection, stringToSearch, (result) =>
    getCallback(result, res),
  );
});

app.get("/*/FindEntityByString/:string", (req, res) => {
  let collectionName = getCollectionNameFromURL(req.url);
  let string = req.params.string.slice(1, req.params.string.length);
  let platforms = JSON.parse(req.query.platform);

  platforms = platformArray(platforms, collectionName);

  commonFunctions.getObjectByString(
    collectionName,
    string,
    platforms,
    (result) => getCallback(result, res),
  );
});

app.get("/Entities", (req, res) => {
  res.json(require("./entities/EntetyList"));
});

app.get("/DocumentFields", (req, res) => {
  res.json(require("./entities/documentFields"));
});

app.get("/FailureDetails", (req, res) => {
  res.json(require("./entities/failureDetails"));
});

app.get("/PermissionsFields", (req, res) => {
  res.json(require("./entities/permissionsFields"));
});

app.get("/PeriodicalFields", (req, res) => {
  res.json(require("./entities/periodicalTestsFields"));
});

app.get("/CreateFlightFields", (req, res) => {
  res.json(require("./entities/createFlightFields"));
});

app.get("/StarsName", (req, res) => {
  res.json(require("./entities/starsFields"));
});

app.get("/DebriefFields", (req, res) => {
  res.json(require("./entities/debriefFields"));
});

app.get("/MPD", (req, res) => {
  res.json(require("./entities/MPD"));
});

app.get("/getFile/:fileName", (req, res) => {
  let fileName = req.params.fileName.slice(1, req.params.fileName.length);
  let filePath = DIR + fileName;
  let doesFileExist = false;

  fs.readdir(DIR, (err, files) => {
    files.some((file) => {
      if (file === fileName) {
        doesFileExist = true;
        return;
      }
    });

    if (doesFileExist) {
      res.download(filePath);
    } else {
      res.status(404);
      res.json(["no file"]);
      res.end(err);
      return;
    }
  });
});

app.get("*/countFilesByFileName/:fileVarName/:fileName", (req, res) => {
  let collection = getCollectionNameFromURL(req.url);
  let fileVarName = req.params.fileVarName.slice(
    1,
    req.params.fileVarName.length,
  );
  let fileName = req.params.fileName.slice(1, req.params.fileName.length);

  commonFunctions.countFilesByFileName(
    collection,
    fileVarName,
    fileName,
    (result) => getCallback(result, res),
  );
});

app.post("/SaveJSONFile/:fileName", (req, res) => {
  let fileName = req.params.fileName.slice(1, req.params.fileName.length);
  let dataToSave = req.body.dataToSave;

  jsonfile
    .writeFile(path.resolve(__dirname + "/uploads/" + fileName), dataToSave)
    .then(res.json({ success: true }))
    .catch((err) => {
      console.log(err);
    });
});

app.get("/Authentication/:userName/:password", (req, res) => {
  let userName = req.params.userName.slice(0, req.params.userName.length);
  let password = req.params.password.slice(0, req.params.password.length);

  usersMongoAPI.getUserByUserName(userName, (result) => {
    if (result === "404") {
      res.status(404);
      res.json(["no user"]);
      res.end(result.err);
      return;
    } else {
      const userPassword = result[0].password;

      if (userPassword !== undefined) {
        if (userPassword === password) {
          res.status(202);
          getCallback(result, res);
        } else {
          res.status(401);
          res.json(["incorrect"]);
          res.end(result.err);
          return;
        }
      } else {
        res.status(204);
        res.json(["no password"]);
        res.end(result.err);
        return;
      }
    }
  });
});

app.get("/Authentication/:userName", (req, res) => {
  let userName = req.params.userName.slice(0, req.params.userName.length);

  usersMongoAPI.getUserByUserName(userName, (result) => {
    if (result === "404") {
      res.status(404);
      res.json(["no user"]);
      res.end(result.err);
      return;
    } else {
      res.status(result[0].password == undefined ? 204 : 202);
      res.json([
        result[0].password == undefined ? "no password" : "there is a password",
      ]);
    }
  });

  res.on("finish", () => {
    if (res.statusCode == 404) {
      ["Instructor", "Commander", "Technician"].forEach((collection) => {
        commonFunctions.checkIfExistInCollection(
          collection,
          userName.slice(1, req.params.userName.length),
          (collectionObject) => {
            if (collectionObject[0]) {
              commonFunctions.createNewObject(
                {
                  _id: collectionObject[0]._id,
                  userName: userName,
                  name: collectionObject[0].name,
                  authenticationLevel: collection,
                  platform: collectionObject[0].platform,
                },
                "Authentication",
                (result) => {
                  if (result.err) {
                    if (result.err === "Object already exist") {
                      res.status(409);
                      res.json(result.data);
                      res.end();
                      return;
                    } else {
                      res.status(500);
                      res.end(result.err);
                      returnף;
                    }
                  }

                  if (result.success) {
                    res.status(204);
                    res.end();
                  }
                },
              );
            }
          },
        );
      });
    }
  });
});

app.get("/getUser/:idNumber", (req, res) => {
  let idNumber = req.params.idNumber;

  usersMongoAPI.getUserById(idNumber, (result) => {
    if (result === "404") {
      res.status(404);
      res.json(["no user"]);
      res.end(result.err);
      return;
    } else {
      res.status(202);
      getCallback(result[0], res);
    }
  });
});

app.get("/Debriefs/flightName/:flightName/:platform", (req, res) => {
  let flightName = req.params.flightName.slice(1, req.params.flightName.length);
  let platform = req.params.platform.slice(1, req.params.platform.length);

  DebriefsMongoAPI.getDebriefsByFlightName(flightName, platform, (result) =>
    getCallback(result, res),
  );
});

app.get("/Debriefs/flightCrewId/:flightCrewId", (req, res) => {
  let flightCrewId = req.params.flightCrewId.slice(
    1,
    req.params.flightCrewId.length,
  );

  DebriefsMongoAPI.getDebriefsById(flightCrewId, (result) =>
    getCallback(result, res),
  );
});

app.get("/Debriefs/flight/:flightId", (req, res) => {
  let flightId = parseInt(
    req.params.flightId.slice(1, req.params.flightId.length),
  );

  DebriefsMongoAPI.getDebriefsByFlight(flightId, (result) =>
    getCallback(result, res),
  );
});

app.get("/Debrief/id/:debriefId", (req, res) => {
  let debriefId = parseInt(
    req.params.debriefId.slice(1, req.params.debriefId.length),
  );

  DebriefsMongoAPI.getDebriefFileById(debriefId, (result) =>
    getCallback(result, res),
  );
});

app.get("/Permissions/status/:status/:platform", (req, res) => {
  let status = req.params.status.slice(1, req.params.status.length);
  let platform = req.params.platform.slice(1, req.params.platform.length);

  PermissionsMongoAPI.getPermissionsByStatusAndPlatform(
    platform,
    status,
    (result) => getCallback(result, res),
  );
});

app.get("/getNextId/Stars/:sequenceName/:platform", (req, res) => {
  let collectionName = getCollectionNameFromURL(req.url);
  let sequenceName = req.params.sequenceName.slice(
    1,
    req.params.sequenceName.length,
  );
  let platform = req.params.platform.slice(1, req.params.platform.length);

  commonFunctions.getNextId(collectionName, sequenceName, platform, (result) =>
    getCallback(result, res),
  );
});

app.get("/getNextId/:custom", (req, res) => {
  let collectionName = getCollectionNameFromURL(req.url);
  let sequenceName = req.params.custom.slice(0, req.params.custom.length);

  commonFunctions.getNextId(
    collectionName,
    sequenceName,
    "sequenceValue",
    (result) => getCallback(result, res),
  );
});

app.get("/getFlightId", (req, res) => {
  getNextFlightIdMongoAPI.getCurrentId((result) => getCallback(result, res));
});

app.get("/*/getDebriefFileByFlightName/:flightName/:platform", (req, res) => {
  let collectionName = getCollectionNameFromURL(req.url);
  let flightName = req.params.flightName.slice(2, req.params.flightName.length);
  let platform = req.params.platform.slice(1, req.params.platform.length);

  DebriefsMongoAPI.getDebriefFileByFlightName(
    collectionName,
    flightName,
    platform,
    (result) => getCallback(result, res),
  );
});

app.get("/*/getByFieldsAndFilters/:fields/:filters", (req, res) => {
  let collectionName = getCollectionNameFromURL(req.url);
  let fields = req.params.fields.slice(1, req.params.fields.length);
  let filters = req.params.filters.slice(1, req.params.filters.length);
  let platforms = JSON.parse(req.query.platform);

  let fieldsArray = JSON.parse(fields);
  let filtersArray = JSON.parse(filters);

  filtersArray.fromDate.day = Number(filtersArray.fromDate.day);
  filtersArray.fromDate.month = Number(filtersArray.fromDate.month);
  filtersArray.fromDate.year = Number(filtersArray.fromDate.year);
  filtersArray.untilDate.day = Number(filtersArray.untilDate.day);
  filtersArray.untilDate.month = Number(filtersArray.untilDate.month);
  filtersArray.untilDate.year = Number(filtersArray.untilDate.year);

  if (filters.indexOf("fromDate") !== -1) {
    let datesRange;

    if (
      datesRangeFunctions.IsFirstSooner(
        filtersArray.fromDate,
        filtersArray.untilDate,
      )
    ) {
      datesRange = datesRangeFunctions.getDatesRange(
        filtersArray.fromDate,
        filtersArray.untilDate,
      );
    } else {
      datesRange = datesRangeFunctions.getDatesRange(
        filtersArray.untilDate,
        filtersArray.fromDate,
      );
    }

    filtersArray = datesRangeFunctions.turnToRegExpRange(datesRange);
  }

  commonFunctions.getEntitiesByFields(
    collectionName,
    fieldsArray,
    platforms,
    (result) => getCallback(result, res),
    filtersArray,
  );
});

app.get("/*/checkIfExist", (req, res) => {
  let collection = getCollectionNameFromURL(req.url);
  let userId = JSON.parse(req.query.id);
  commonFunctions.checkIfExistInCollection(collection, userId, (result) =>
    getCallback(result, res),
  );
});

app.get("/*/getAmountByFilters/:index", (req, res) => {
  let collectionName = getCollectionNameFromURL(req.url);
  let index = parseInt(req.params.index.slice(0, req.params.index.length));
  let platforms = req.query.platform.map((platformNames) =>
    JSON.parse(platformNames),
  );
  let filters = req.query.filters;

  commonFunctions.getEntitiesByPlatformsAndAmountAndFilter(
    collectionName,
    platforms,
    index,
    filters,
    (result) => getCallback(result, res),
  );
});

app.get("/*/getByFields", (req, res) => {
  let collectionName = getCollectionNameFromURL(req.url);
  let platform = JSON.parse(req.query.platform);
  let fields = JSON.parse(req.query.fields);

  commonFunctions.getEntitiesByFields(
    collectionName,
    fields,
    platform,
    (result) => getCallback(result, res),
  );
});

app.get("/*/findByIdList", (req, res) => {
  let collectionName = getCollectionNameFromURL(req.url);
  let idList = JSON.parse(req.query.idList);

  commonFunctions.getEntityByIdList(collectionName, idList, (result) =>
    getCallback(result, res),
  );
});

app.get("/*/GetByDate/:date", (req, res) => {
  let collectionName = getCollectionNameFromURL(req.url);
  let date = req.params.date.slice(1, req.params.date.length);
  let platform = JSON.parse(req.query.platform);

  let re = /\./gi;
  date = date.replace(re, "/");

  commonFunctions.getEntitiesByDate(collectionName, date, platform, (result) =>
    getCallback(result, res),
  );
});

app.get("/*/GetByAttribute/:attributeName/:attributeValue", (req, res) => {
  let collectionName = getCollectionNameFromURL(req.url);
  let attributeName = req.params.attributeName.slice(
    1,
    req.params.attributeName.length,
  );
  let attributeValue = req.params.attributeValue.slice(
    1,
    req.params.attributeValue.length,
  );

  commonFunctions.getEntitiesByAttribute(
    collectionName,
    attributeName,
    attributeValue,
    (result) => getCallback(result, res),
  );
});

app.get("/*/GetByDatesRange", (req, res) => {
  let collectionName = getCollectionNameFromURL(req.url);
  let datesRange = JSON.parse(req.query.datesRange);
  let platform = JSON.parse(req.query.platform);

  commonFunctions.getEntitiesByDatesRange(
    collectionName,
    datesRange,
    platform,
    (result) => getCallback(result, res),
  );
});

app.get("/*/findFlightNameForDebrief/:flightName/:platform", (req, res) => {
  let collectionName = getCollectionNameFromURL(req.url);
  let flightName = req.params.flightName.slice(2, req.params.flightName.length);
  let platform = req.params.platform.slice(1, req.params.platform.length);

  DebriefsMongoAPI.findIfFlightNameExistForDebrief(
    collectionName,
    flightName,
    platform,
    (result) => getCallback(result, res),
  );
});

app.get("/*/findAirCrew", (req, res) => {
  let collectionName = getCollectionNameFromURL(req.url);
  let airCrewId = req.query.airCrewId;

  DebriefsMongoAPI.findAirCrew(collectionName, airCrewId, (result) =>
    getCallback(result, res),
  );
});

app.get("/*/getMany/:howMany", (req, res) => {
  let name = getCollectionNameFromURL(req.url);
  let howMany = parseInt(
    req.params.howMany.slice(1, req.params.howMany.length),
  );
  let platforms = JSON.parse(req.query.platform);
  let additionalFilters = JSON.parse(req.query.additionalFilters);

  let findString = platformArray(platforms, name);
  if (additionalFilters) {
    findString[0] = { ...findString[0], ...additionalFilters };
  }

  if (
    name === "PreservedFlights" ||
    name === "Permissions" ||
    name === "PeriodicalTests" ||
    name === "FlightFailure"
  ) {
    if (name !== "FlightFailure") {
      this.FlightFailureString = [{}];
    }
    commonFunctions.getManyEntitiesByFieldsAndPlatforms(
      name,
      howMany,
      findString,
      this[name + "Filters"],
      this.FlightFailureString,
      (result) => getCallback(result, res),
    );
  } else if (name === "Debriefs") {
    this.FlightFailureString = [{}];
    commonFunctions.getManyEntitiesByFieldsAndPlatforms(
      "PreservedFlights",
      howMany,
      findString,
      this[name + "Filters"],
      this.FlightFailureString,
      (result) => getCallback(result, res),
    );
  } else if (name === "Stars") {
    StarsMongoAPI.getManyStarsByField(
      howMany,
      this[name + "Filters"],
      (result) => getCallback(result, res),
    );
  } else {
    commonFunctions.getManyEntitiesByPlatforms(
      name,
      howMany,
      findString,
      (result) => getCallback(result, res),
    );
  }
});

app.get("/*/Amount/:index", (req, res) => {
  let name = getCollectionNameFromURL(req.url);
  let index = parseInt(req.params.index.slice(1, req.params.index.length));
  let platforms = req.query.platform;
  platforms = platforms === "undefined" ? [] : JSON.parse(platforms);

  let findString = platformArray(platforms, name);

  if (
    name === "PreservedFlights" ||
    name === "Permissions" ||
    name === "PeriodicalTests" ||
    name === "FlightFailure"
  ) {
    if (name !== "FlightFailure") {
      this.FlightFailureString = [{}];
    }
    commonFunctions.getEntitiesByFieldsAndPlatformsAndAmount(
      name,
      findString,
      index,
      this[name + "Filters"],
      this.FlightFailureString,
      (result) => getCallback(result, res),
    );
  } else if (name === "Debriefs") {
    this.FlightFailureString = [{}];
    commonFunctions.getEntitiesByFieldsAndPlatformsAndAmount(
      "PreservedFlights",
      findString,
      index,
      this[name + "Filters"],
      this.FlightFailureString,
      (result) => getCallback(result, res),
    );
  } else if (name === "Stars") {
    StarsMongoAPI.getStarsByFieldAndAmount(
      this[name + "Filters"],
      index,
      (result) => getCallback(result, res),
    );
  } else {
    commonFunctions.getEntitiesByPlatformsAndAmount(
      name,
      findString,
      index,
      (result) => getCallback(result, res),
    );
  }
});

app.get("/*/platform", (req, res) => {
  let name = getCollectionNameFromURL(req.url);
  let platform = JSON.parse(req.query.platform);

  commonFunctions.getEntityByPlatform(name, platform, (result) =>
    getCallback(result, res),
  );
});

app.get("/*/:custom", (req, res) => {
  let name = getCollectionNameFromURL(req.url);
  let value = req.params.custom;
  let fieldValue = value.slice(1, value.length + 1);
  let fieldName = getFilterName(req.url, name);
  let filterField = JSON.parse(req.query.filterField);

  if (fieldName !== "/") {
    let doesFieldExist = false;
    if (this[name + "Filters"]["$and"] === undefined) {
      this[name + "Filters"]["$and"] = [];
    }

    if (fieldName === "date" || fieldName.indexOf("Date") !== -1) {
      let re = /\./gi;
      filterField[fieldName] = filterField[fieldName].replace(re, "/");
    }

    if (fieldName === "search") {
      doesFieldExist = true;
      this[name + "FieldName"] = fieldName;
      this.FlightFailureString = [
        { description: new RegExp(fieldValue) },
        { failureDetails: new RegExp(fieldValue) },
      ];
    }

    this[name + "FieldName"] = fieldName;

    if (
      Object.keys(filterField).find(
        (newKey) =>
          newKey === "pilot" || newKey === "navigator" || newKey === "trainer",
      )
    ) {
      doesFieldExist = true;
      let field = {};
      field["$or"] = [];
      field["$or"].push(filterField);
      filterField = field;
    }

    if (!Object.keys(filterField).some((key) => key === "")) {
      if (
        this[name + "Filters"]["$and"].find((value) =>
          Object.keys(value).find((key) =>
            Object.keys(filterField).find((newKey) => newKey === key),
          ),
        )
      ) {
        // value change
        if (Object.keys(filterField).find((key) => key === "$or")) {
          this[name + "Filters"]["$and"].some((value) => {
            if (Object.keys(value).find((key) => key === "$or")) {
              if (
                JSON.stringify(Object.keys(value["$or"][0])) ===
                JSON.stringify(Object.keys(filterField["$or"][0]))
              ) {
                // the right $or
                doesFieldExist = true;
                const index = this[name + "Filters"]["$and"].findIndex(
                  (field) => JSON.stringify(value) === JSON.stringify(field),
                ); // remove
                this[name + "Filters"]["$and"].splice(index, 1);
                if (
                  filterField["$or"][0][
                    Object.keys(filterField["$or"][0])[0]
                  ] !== "0"
                ) {
                  // change
                  this[name + "Filters"]["$and"].push(filterField);
                }
              } else {
                // not the right $or
                return;
              }
            }
          });
        } else {
          this[name + "Filters"]["$and"].some((value) => {
            if (
              Object.keys(value).find((key) =>
                Object.keys(filterField).find((newKey) => newKey === key),
              )
            ) {
              doesFieldExist = true;
              const index = this[name + "Filters"]["$and"].findIndex(
                (field) => JSON.stringify(value) === JSON.stringify(field),
              ); // remove
              this[name + "Filters"]["$and"].splice(index, 1);

              if (filterField[Object.keys(filterField)[0]] !== "0") {
                // change
                this[name + "Filters"]["$and"].push(filterField);
              }
            }
          });
        }
      } else if (Object.keys(filterField).find((key) => key === "platform")) {
        let wasAdded = false;
        this[name + "Filters"]["$and"].some((value) => {
          if (Object.keys(value).find((key) => key === "$or")) {
            if (
              JSON.stringify(Object.keys(value["$or"][0])) ===
              JSON.stringify(Object.keys(filterField))
            ) {
              // the right $or
              doesFieldExist = true;
              const index = this[name + "Filters"]["$and"].findIndex(
                (field) => JSON.stringify(value) === JSON.stringify(field),
              ); // remove

              if (name !== "Stars") {
                if (
                  !value["$or"].find(
                    (field) =>
                      JSON.stringify(filterField) === JSON.stringify(field),
                  )
                ) {
                  // change
                  let field = this[name + "Filters"]["$and"].splice(index, 1);

                  field[0]["$or"].push(filterField);
                  this[name + "Filters"]["$and"].push(field[0]);
                  wasAdded = true;
                } else {
                  if (!wasAdded) {
                    const innerIndex = value["$or"].findIndex(
                      (field) =>
                        JSON.stringify(filterField) === JSON.stringify(field),
                    ); // remove
                    value["$or"].splice(innerIndex, 1);

                    if (value["$or"].length === 0) {
                      this[name + "Filters"]["$and"].splice(index, 1);
                    }
                  }
                }
              } else {
                this[name + "Filters"]["$and"].splice(index, 1);

                if (filterField[Object.keys(filterField)[0]] !== "0") {
                  // change
                  this[name + "Filters"]["$and"].push(filterField);
                }
              }
            } else {
              return;
            }
          }
        });
      }

      if (!doesFieldExist && filterField[fieldName] !== "0") {
        if (Object.keys(filterField).find((key) => key === "platform")) {
          const platform = filterField;
          filterField = {};
          filterField["$or"] = [];
          filterField["$or"].push(platform);
        }

        this[name + "Filters"]["$and"].push(filterField);
      }
    } else {
      if (name === "Stars") {
        let platform;
        this[name + "Filters"]["$and"].some((value) => {
          if (Object.keys(value).find((key) => key === "$or")) {
            if (Object.keys(value["$or"][0])[0] === "platform") {
              platform = value;
              this[name + "Filters"]["$and"] = [];
              this[name + "Filters"]["$and"].push(value);
            }
          }
        });
      } else {
        this[name + "Filters"]["$and"] = [];

        if (name === "Debriefs") {
          this[name + "Filters"]["$and"].push({ hasDebrief: true });
        } else {
          this.FlightFailureString = [{}];
        }
      }
    }

    if (this[name + "Filters"]["$and"].length === 0) {
      this[name + "Filters"]["$and"].push({});
    }

    return res.json({ success: true });
  }
});

app.post("/Manage", (req, res) => {
  ManageMongoAPI.getManageTabsByRole(req.body.role, (result) =>
    getCallback(result, res),
  );
});

app.get("*", (req, res) => {
  let collection = getCollectionNameFromURL(req.url);

  if (!collection) {
    res.status(404);
    res.end();
    return;
  }

  commonFunctions.getAllEntity(collection, (result) =>
    getCallback(result, res),
  );
});

app.delete("/deleteFile/:fileName", (req, res) => {
  let fileName = req.params.fileName.slice(1, req.params.fileName.length);
  let filePath = DIR + fileName;
  let doesFileExist = false;

  fs.readdir(DIR, (err, files) => {
    files.some((file) => {
      if (file === fileName) {
        doesFileExist = true;
        return;
      }
    });

    if (doesFileExist) {
      fs.unlink(filePath, (err) => {
        if (err) {
          res.status(500);
          res.end(err);
        } else {
          res.status(200);
          res.json({ success: true, message: "File deleted successfully" });
          res.end();
        }
      });
    } else {
      res.status(404);
      res.json(["no file"]);
      res.end(err);
      return;
    }
  });
});

app.delete("*", (req, res) => {
  let collection = getCollectionNameFromURL(req.url);

  if (!collection) {
    res.status(404);
    res.end();
    return;
  }

  let id = JSON.parse(req.query._id);

  if (id) {
    commonFunctions.updateObject(
      { _id: id, deleted: true },
      collection,
      null,
      (result) => deleteCallback(result, res),
    );
  } else {
    res.status(500);
    res.end("ID not received");
  }
});

app.put("/setPassword", (req, res) => {
  let userName = req.body.userInfo[0].userName;
  let newPassword = req.body.userInfo[0].password;

  usersMongoAPI.setUserPassword(userName, newPassword, (result) => {
    if (result.err) {
      res.status(500);
      res.json([
        {
          success: false,
          message: "User Password Was Not Created",
        },
      ]);
      return;
    }

    if (result.success) {
      res.status(200);
      res.json([
        {
          success: true,
          message: "User Password Changed successfully",
        },
      ]);
      res.end();
    }
  });
});

app.put("/alterPriorities", (req, res) => {
  let platform = req.body.starData[0].platform;
  let currentPriority = parseInt(req.body.starData[0].currentPriority);
  let priorityId = req.body.starData[0].priorityId;
  let increase = req.body.starData[0].increase;

  StarsMongoAPI.alterPriorities(
    currentPriority,
    priorityId,
    platform,
    increase,
    (result) => {
      if (result.err) {
        res.status(500);
        res.end(result.err);
        return;
      }

      if (result.success) {
        res.status(200);
        res.json({ success: true, message: "stars updated successfully" });
        res.end();
      }
    },
  );
});

app.put("/switchPriorities", (req, res) => {
  let platform = req.body.starData[0].platform;
  let newHigherPriority = parseInt(req.body.starData[0].newHigherPriority);
  let lastPriorityToChange = req.body.starData[0].lastPriorityToChange;
  let previousPriority = req.body.starData[0].previousPriority;

  let dir = -1;

  if (lastPriorityToChange !== "") {
    lastPriorityToChange = parseInt(lastPriorityToChange);

    if (lastPriorityToChange === newHigherPriority) {
      if (previousPriority.priority > newHigherPriority) {
        dir = 1;
      } else {
        dir = -1;
      }
    } else if (lastPriorityToChange < newHigherPriority) {
      const tempPriority = newHigherPriority;
      newHigherPriority = lastPriorityToChange;
      lastPriorityToChange = tempPriority;
      dir = 1;
    }
  }

  let changeLastPriority = { $lte: lastPriorityToChange };

  if (lastPriorityToChange === "") {
    changeLastPriority = { $ne: lastPriorityToChange };
  }

  StarsMongoAPI.switchPriorities(
    newHigherPriority,
    changeLastPriority,
    dir,
    platform,
    previousPriority._id,
    (result) => {
      if (result.err) {
        res.status(500);
        res.end(result.err);
        return;
      }

      if (result.success) {
        res.status(200);
        res.json({ success: true, message: "stars updated successfully" });
        res.end();
      }
    },
  );
});

app.put("/editFlight/addMalf", (req, res) => {
  let flight = req.body.flightData[0].flight;
  let malfunctionId = req.body.flightData[0].malfunction;

  preservedFlightsMongoAPI.addMalfToFlight(flight, malfunctionId, (result) => {
    if (result.err) {
      res.status(500);
      res.end(result.err);
      return;
    }

    if (result.success) {
      res.status(200);
      res.json({ success: true, message: "Malfuncition added successfully" });
      res.end();
    }
  });
});

app.put("/Authentication/:collection", (req, res) => {
  let collection = req.params.collection;
  const authenticationObject = {
    _id: req.body._id,
    userName: req.body.userName,
    name: req.body.firstName + " " + req.body.lastName,
    authenticationLevel: req.body.authenticationLevel,
    platform: req.body.platform,
    password: req.body.password,
  };
  const collectionObject = {
    _id: req.body._id,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    platform: req.body.platform,
    name: req.body.firstName + " " + req.body.lastName,
  };

  let statusAuth;
  let objAuth;
  let statusCollection;
  let objCollection;
  let lastId = req.body.lastId == req.body._id ? null : req.body.lastId;

  commonFunctions.updateUserObject(
    authenticationObject,
    "Authentication",
    (result) => {
      if (result.err) {
        statusAuth = 500;
        objAuth = result.err;
        return;
      }

      if (result.success) {
        return;
      }
    },
    lastId,
  );

  commonFunctions.updateUserObject(
    collectionObject,
    collection,
    (result) => {
      if (result.err) {
        statusCollection = 500;
        objCollection = result.err;
        return;
      }

      if (result.success) {
        return;
      }
    },
    lastId,
  );

  if (statusAuth == 500) {
    res.status(500);
    res.end(objAuth);
  } else if (statusCollection == 500) {
    res.status(500);
    res.end(objCollection);
  } else {
    res.status(200);
    res.json({ success: true, message: "Object updated successfully" });
  }
});

app.put("/Authentication/:fromCollection/:toCollection", (req, res) => {
  let fromCollection = req.params.fromCollection;
  let toCollection = req.params.toCollection;
  const authenticationObject = {
    _id: req.body._id,
    userName: req.body.userName,
    name: req.body.firstName + " " + req.body.lastName,
    authenticationLevel: req.body.authenticationLevel,
    platform: req.body.platform,
    password: req.body.password,
  };
  const collectionObject = {
    _id: req.body._id,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    platform: req.body.platform,
    name: req.body.firstName + " " + req.body.lastName,
  };

  let status;
  let lastId = req.body.lastId == req.body._id ? null : req.body.lastId;

  commonFunctions.updateUserObject(
    authenticationObject,
    "Authentication",
    (result) => {
      if (result.err) {
        statusAuth = Math.max(500, statusAuth);
        objAuth = result.err;
        return;
      }

      if (result.success) {
        return;
      }
    },
    lastId,
  );

  commonFunctions.deleteEntity(
    lastId == null ? collectionObject._id : lastId,
    fromCollection,
    (result) => {
      if (result.err) {
        status = Math.max(500, status);
        return;
      }

      if (result.success) {
        return;
      }
    },
  );

  if (toCollection == "Admin") {
    commonFunctions.createNewObject(
      collectionObject,
      toCollection,
      (result) => {
        if (result.err) {
          status = Math.max(500, status);
          return;
        }

        if (result.success) {
          return;
        }
      },
    );
  }

  if (status == 500) {
    res.status(500);
  } else {
    res.status(200);
    res.json({ success: true, message: "Object updated successfully" });
  }
});

app.put("*", (req, res) => {
  let collection = getCollectionNameFromURL(req.url);
  let fields = JSON.parse(req.headers.fieldstoremove);

  commonFunctions.updateObject(req.body, collection, fields, (result) => {
    if (result.err) {
      res.status(500);
      res.end(result.err);
      return;
    }

    if (result.success) {
      res.status(200);
      res.json({ success: true, message: "Object updated successfully" });
      return;
    }
  });
});

app.post("/api/uploads", upload.single("file"), function (req, res) {
  if (!req.file) {
    res.json({ success: false });
  } else {
    res.json({ success: true });
  }
});

app.post("*", (req, res) => {
  let collection = getCollectionNameFromURL(req.url);

  commonFunctions.createNewObject(req.body, collection, (result) => {
    if (result.err) {
      if (result.err === "Object already exist") {
        res.status(409);
        res.json(result.data);
        return;
      } else {
        res.status(500);
      }

      res.end(result.err);
      return;
    }

    if (result.success) {
      res.status(200);
      res.json({ success: true, message: "Object added successfully" });
      return;
    }
  });
});

app.patch("/NewFlightFields", (req, res) => {
  let collection = getCollectionNameFromURL(req.url);
  const ids = req.body.ids;
  const updatedData = req.body.updates;

  commonFunctions.updateObjectsFields(
    ids,
    collection,
    updatedData,
    (result) => {
      if (result.err) {
        res.status(500);
        res.json({ error: result.err.message });
        return;
      }

      if (result.success) {
        res.status(200);
        res.json({ success: true, message: "Object updated successfully" });
        return;
      } else {
        res.status(500);
        res.json({ error: "Failed to update object" });
        return;
      }
    },
  );
});

http.listen(port, () => {
  console.log("Listening on port " + port);
});
