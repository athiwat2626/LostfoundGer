const db = require("../db");

const getUserData = () => {
  return new Promise((resolve, reject) => {
    db.query("SELECT * FROM users", (err, res) => {
      if (!err) {
        resolve(res.rows);
      } else {
        reject(err.message);
      }
    });
  });
}; 

module.exports = { getUserData };
