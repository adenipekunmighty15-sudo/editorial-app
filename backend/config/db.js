const mongoose = require('mongoose');
const dns = require('dns');
require('dotenv').config();

// Some local networks pin Node's resolver to a stub DNS that refuses SRV
// lookups (querySrv ECONNREFUSED). Set DNS_SERVERS to override on those
// machines; hosted environments like Render use the platform resolver.
const dnsServers = (process.env.DNS_SERVERS || '')
  .split(',')
  .map((server) => server.trim())
  .filter(Boolean);

if (dnsServers.length) {
  dns.setServers(dnsServers);
}

mongoose.set('bufferTimeoutMS', 5000);

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 8000,
    });
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    console.error(
      'The server will keep serving the site; API routes return errors until the database is reachable.'
    );
  }
};

module.exports = connectDB;
