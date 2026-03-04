const mongoObject = require('./MongoObjects');
const PreservedFlightsCollectionName = 'PreservedFlights';
const DebriefsCollectionName = 'DebriefFiles';
const DebriefsCollectionsName = [{collectionName: 'Pilot', name: 'pilot'}, {collectionName: 'Navigator', name: 'navigator'}, {collectionName: 'Trainer', name: 'trainer'}, {collectionName: 'Trainer', name: 'trainer2'}];

async function getDebriefFileById(debriefId, callback) {
    const db = await mongoObject.mongoClient.connect(mongoObject.MongoDBUrl);
    let debriefFile;
    try {
        debriefFile = await db.collection(DebriefsCollectionName).find({'_id': debriefId}).toArray();
    } finally {
        db.close();
        callback(debriefFile);
    }
}

async function getDebriefsByFlightName(flightName, platform, callback) {
    const db = await mongoObject.mongoClient.connect(mongoObject.MongoDBUrl);
    let debriefFile;
    let files = [];
    try {
        for (let collectionName in DebriefsCollectionsName) {
            debriefFile = await db.collection(DebriefsCollectionsName[collectionName].collectionName).find({'debriefs.flightName': flightName, 'platform': platform}, {'debriefs': 1, 'name': 1}).toArray();
            if (debriefFile.length !== 0) files.push(debriefFile[0])
        }
    } finally {
        db.close();
        callback(files);
    }
}

async function getDebriefsById(id, callback) {
    const db = await mongoObject.mongoClient.connect(mongoObject.MongoDBUrl);
    let debriefFile;
    let files = [];
    try {
        for (let collectionName in DebriefsCollectionsName) {
            debriefFile = await db.collection(DebriefsCollectionsName[collectionName].collectionName).find({'_id': id}, {'debriefs': 1, 'name': 1}).toArray();
            if (debriefFile.length !== 0) files.push(debriefFile[0])
        }
    } finally {
        db.close();
        callback(files);
    }
}

async function getDebriefsByFlight(flightId, callback) {
    const db = await mongoObject.mongoClient.connect(mongoObject.MongoDBUrl);
    let flight, debriefFile;
    let files = [];
    try {
        flight = await db.collection(PreservedFlightsCollectionName).find({'_id': flightId}).toArray();
        for (let collectionIndex in DebriefsCollectionsName) {
            if (typeof flight[0][DebriefsCollectionsName[collectionIndex].name] === 'object') {
                let collectionName = DebriefsCollectionsName[collectionIndex].collectionName;

                if (flight[0].platform === 'פעימה זהב' || flight[0].platform === 'פעימה מגדל אש' || flight[0].platform === 'פעימה חנית נאה') {
                    const doesExist = await db.collection(DebriefsCollectionsName[collectionIndex].collectionName).find({'_id': flight[0][DebriefsCollectionsName[collectionIndex].name]._id}).toArray();
                    if (doesExist.length === 0) {
                        if (collectionName === 'Pilot') {
                            collectionName = 'Navigator';
                        } else if (collectionName === 'Navigator') {
                            collectionName = 'Pilot';
                        }
                    }
                }

                debriefFile = await db.collection(collectionName).find({'_id': flight[0][DebriefsCollectionsName[collectionIndex].name]._id, 'debriefs.flightId': flightId}, {'debriefs': 1, 'name': 1}).toArray();
                if (debriefFile.length !== 0) files.push(debriefFile[0]);
            }
        }
    } finally {
        db.close();
        callback(files);
    }
}

async function findAirCrew(collectionName, airCrewId, callback) {
    const db = await mongoObject.mongoClient.connect(mongoObject.MongoDBUrl);
    let airCrew;
    try {
        airCrew = await db.collection(collectionName).find({_id: airCrewId}).toArray();
    } finally {
        db.close();
        callback(airCrew.length !== 0);
    }
}

async function getDebriefFileByFlightName(collectionName, flightName, platform, callback) {
    const db = await mongoObject.mongoClient.connect(mongoObject.MongoDBUrl);
    let debriefFile;
    try {
        debriefFile = await db.collection(collectionName).find({flightName: flightName, platform: platform}).toArray();
    } finally {
        db.close();
        callback(debriefFile);
    }
}

function findIfFlightNameExistForDebrief(collectionName, flightName, platform, callback) {
    mongoObject.mongoClient.connect(mongoObject.MongoDBUrl, function (err, db) {
        if (err) {
            callback({err: err});
            if (db)
                db.close();
            return;
        }

        db.collection(collectionName).find({flightName: flightName, platform: platform}).toArray(function (err, docs) {
            if (err) {
                callback({err: err});
                db.close();
                return;
            }
            db.close();
            callback(docs.length !== 0);
        });
    });
}

module.exports.getDebriefFileById = getDebriefFileById;
module.exports.getDebriefsByFlightName = getDebriefsByFlightName;
module.exports.getDebriefsById = getDebriefsById;
module.exports.getDebriefsByFlight = getDebriefsByFlight;
module.exports.findAirCrew = findAirCrew;
module.exports.getDebriefFileByFlightName = getDebriefFileByFlightName;
module.exports.findIfFlightNameExistForDebrief = findIfFlightNameExistForDebrief;
