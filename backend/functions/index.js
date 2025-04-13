const UserSchema = require("../models/User");
const { METER_RADIUS } = require("../config");
const fs = require("fs");
const geolib = require("geolib");

const NearbyUsers = async (socket) => {
    try {
        // Read and parse cache file
        const users = await JSON.parse(fs.readFileSync("./cache.json"));

        // Validate socket.user_id exists
        if (!socket.user_id) {
            console.error('No user_id found in socket');
            return [[], []];
        }

        // Validate user exists in cache
        if (!users[socket.user_id]) {
            console.error(`User ${socket.user_id} not found in cache`);
            return [[], []];
        }

        // Validate user coordinates exist
        if (!users[socket.user_id].coordinates) {
            console.error(`No coordinates found for user ${socket.user_id}`);
            return [[], []];
        }

        const closest_users = Object.values(users)
            .map((user) => {
                if (!user.coordinates) return null;

                const distance = geolib.getDistance(
                    users[socket.user_id].coordinates,
                    user.coordinates
                );

                if (distance <= METER_RADIUS) {
                    return {
                        socket_id: user.socket_id,
                        user_id: user.user_id,
                        coordinates: user.coordinates,
                        distance: distance,
                    };
                }
                return null;
            })
            .filter(user => user !== null) // Remove null values
            .sort((a, b) => a.distance - b.distance);

        const user_ids = closest_users.map(user => user.user_id);
        const socket_ids = closest_users.map(user => user.socket_id);

        return [user_ids, socket_ids];
    } catch (error) {
        console.error('Error in NearbyUsers:', error);
        return [[], []];
    }
};

const FamilyMembers = async (socket, callback) => {
  const user_response = await UserSchema.findById(socket.user_id).lean();
  const user_ids = await UserSchema.find({
    phone_number: user_response.emergency_contact,
  }).distinct("_id");
  const user_ids_string = user_ids.map((user_id) => user_id.toString());
  const users = await JSON.parse(fs.readFileSync("./cache.json"));
  const socket_ids = Object.values(users).map((user) => {
    if (user_ids_string.includes(user.user_id)) return user.socket_id;
  });
  return [user_ids_string, socket_ids];
};

module.exports = { NearbyUsers, FamilyMembers };
