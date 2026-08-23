const userModel = require("../models/userModels");

const getUserData = async (req, res) => {
    try {
        const data = await userModel.getUserData();
        res.status(200).json(data);

    } catch (error) {
        console.error("Error fetching user data:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

module.exports = { getUserData };