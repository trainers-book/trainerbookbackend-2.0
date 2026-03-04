const mongoObject = require('./MongoObjects');
const preservedFlightsCollectionName = 'PreservedFlights';

function addMalfToFlight(flight, malfunctionId, callback) {
    mongoObject.mongoClient.connect(mongoObject.MongoDBUrl, function (err, db) {
        if (err) {
            callback({err: err});
            if (db)
                db.close();
            return;
        }

        if ((flight.malfNumbers === undefined) || (flight.malfNumbers === null)) {
            flight.malfNumbers = [];
        }

        flight.malfNumbers.push(malfunctionId);

        try {
            const condition = {'_id' : flight._id};
            const update = flight;
            const options = {new: true};

            db.collection(preservedFlightsCollectionName).findOneAndUpdate(condition, update, options);
            callback({success: true});
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

module.exports.addMalfToFlight = addMalfToFlight;