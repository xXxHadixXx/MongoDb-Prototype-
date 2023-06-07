const { MongoClient } = require('mongodb');

// Connection URL for MongoDB Atlas
const url = 'mongodb://localhost:27017';


// Database Name
const dbName = 'mydatabase';
let dbInstance = null;
// Collection Name
const collectionName = 'connections';
async function connectToDatabase() {
    try {
        const client = new MongoClient(url);
        await client.connect();
        const db = client.db(dbName);
        dbInstance = db;
        console.log('Connected to MongoDB Atlas');
    } catch (error) {
        console.error('Error connecting to MongoDB Atlas:', error);
    }
}

function getDatabase() {
    return dbInstance;
}

// Function to insert a document into the collection with TTL
async function insertDocumentWithTTL(document, ttlSeconds) {
    const client = new MongoClient(url);
    try {

        const collection = getDatabase().collection(collectionName);
        const expireAt = new Date();
        expireAt.setSeconds(expireAt.getSeconds() + ttlSeconds);
        document.expireAt = expireAt;
        await collection.insertOne(document);

        console.log('Document inserted successfully');
    } catch (error) {
        console.error('Error inserting document:', error);
    } finally {
        // Close the connection
        await client.close();
    }
}
async function updateDocumentTTL(documentId, newTTL) {
    try {
        const collection = getDatabase().collection(collectionName);

        // Update the document's TTL field
        const result = await collection.updateOne(
            { _id: documentId },
            { $set: { expireAt: newTTL } }
        );

        console.log('Document TTL updated successfully');
        console.log('Modified Count:', result.modifiedCount);
    } catch (error) {
        console.error('Error updating document TTL:', error);
    } finally {
        // Close the connection
        await client.close();
    }
}
async function setupTrigger() {
    try {

        const collection =  getDatabase().collection(collectionName);

        // Set up a change stream on the collection
        const changeStream = collection.watch();

        // Handle change events
        changeStream.on('change', async (change) => {
            // Handle the change event and execute your logic or actions
            console.log('Change event:', change);

            // Check if the change event is an update operation and the status field is modified
            if (change.operationType === 'update' && change.updateDescription.updatedFields.status) {
                const updatedStatus = change.updateDescription.updatedFields.status;

                // Get the document ID from the change event
                const documentId = change.documentKey._id;

                // Update the expireAt field based on the updated status
                let expireAt = null;

                if (updatedStatus === 'Temporary') {
                    // Set expireAt to 10 days from the current date
                    const currentDate = new Date();
                    currentDate.setDate(currentDate.getDate() + 10);
                    expireAt = currentDate;
                } else if (updatedStatus === 'Inactive') {
                    // Set expireAt to 7 days from the current date
                    const currentDate = new Date();
                    currentDate.setDate(currentDate.getDate() + 7);
                    expireAt = currentDate;
                } else if (updatedStatus === 'Active') {
                    // Set expireAt to null (disabled)
                    expireAt = null;
                }

                // Update the document with the new expireAt value
                await collection.updateOne(
                    { _id: documentId },
                    { $set: { expireAt } }
                );
            }
        });

        console.log('Trigger set up successfully');
    } catch (error) {
        console.error('Error setting up trigger:', error);
    } finally {
        // Close the connection
        await client.close();
    }
}

// Function to create the TTL index on the expireAt field
async function createTTLIndex() {
    try {
        const collection = getDatabase().collection(collectionName);
        await collection.createIndex({ expireAt: 1 }, { expireAfterSeconds: 0 });
        console.log('TTL index created successfully');
    } catch (error) {
        console.error('Error creating TTL index:', error);
    } finally {
        // Close the connection
        await client.close();
    }
}
async function disableTTLForDocument(documentId) {
    try {
        // Connect to the MongoDB server
        await client.connect();

        // Get the database and collection
        const db = client.db(dbName);
        const collection = db.collection(collectionName);

        // Update the document to remove the expireAt field
        await collection.updateOne({ _id: documentId }, { $unset: { expireAt: true } });

        console.log('Document TTL disabled successfully');
    } catch (error) {
        console.error('Error disabling TTL for document:', error);
    } finally {
        // Close the connection
        await client.close();
    }
}
// Insert a sample document with TTL of 7 days (604,800 seconds)
const document = {
    _id: 'a1e7b0ae-6f4d-4d75-bc7a-4cde0c2c19c9',
    status: 'Temporary',
    projectId: 'a1e7b0ae-6f4d-4d75-bc7a-4cde0c2c19d9',
    name: 'my-connection',
    type: 'Firebase',
    created: new Date(),
    modified: '2020-01-01T00:00:00.000Z',
    payload: {
        authCode: 'BinData(123)',
        refreshToken: 'BinData(456)',
        scope: 'https://www.googleapis.com/auth/firebase',
        tokenType: 'Bearer'
    }
};
const ttlSeconds = 7 * 24 * 60 * 60; // 7 days

// Run the example
async function runExample() {
    // Create the TTL index
    // await createTTLIndex();
    await connectToDatabase();
    // Insert the document with TTL
    await insertDocumentWithTTL(document, 120);
    // const documentId = 'a1e7b0ae-6f4d-4d75-bc7a-4cde0c2c19c8';

    // Disable TTL for the specified document
    // await disableTTLForDocument(documentId);
}

runExample();
