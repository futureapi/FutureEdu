require("dotenv").config();
// var request = require("request");
// var options = {
//   method: "GET",
//   url: "http://13.233.118.241:7172/app/v1/schools/students/12346789",
//   headers: {
//     Authorization: "bearer $2a$31$SrUb2FUZZo5AbqcrjxhiBO",
//   },
//   form: {},
// };
// request(options, function (error, response) {
//   if (error) throw new Error(error);
//   console.log(response.body);
// });

console.log(process.env.FUTURE_API_KEY);
