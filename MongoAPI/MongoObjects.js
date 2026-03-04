const mongoClient = require('mongodb').MongoClient;
const objectID = require('mongodb').ObjectID;
const path = require('path');

const MongoDBServer = require(path.join(__dirname, 'config.json')).MongoDBServer;
const MongoDBUrl = process.env.MONGO_URL ||'mongodb://' + MongoDBServer.ip + ':' + MongoDBServer.port;

module.exports = {mongoClient: mongoClient, objectID: objectID, MongoDBUrl: MongoDBUrl};